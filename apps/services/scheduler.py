import os
import json
import time
import datetime
import threading
import requests
from django.conf import settings
from django.core.cache import cache

TRIGGERS_FILE = os.path.join(settings.MEDIA_ROOT, 'uptime_triggers.json')
file_lock = threading.Lock()

def get_triggers():
    if not os.path.exists(settings.MEDIA_ROOT):
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
    with file_lock:
        if not os.path.exists(TRIGGERS_FILE):
            return []
        try:
            with open(TRIGGERS_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return []

def save_triggers(triggers):
    if not os.path.exists(settings.MEDIA_ROOT):
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
    with file_lock:
        try:
            with open(TRIGGERS_FILE, 'w') as f:
                json.dump(triggers, f, indent=4)
        except Exception:
            pass

class UptimeSchedulerThread(threading.Thread):
    def __init__(self):
        super().__init__()
        self.daemon = True
        self.name = "UptimeSchedulerThread"

    def run(self):
        # Wait a few seconds for database and startup to settle
        time.sleep(5)
        
        while True:
            # Refresh our exclusive execution lock
            cache.set("uptime_scheduler_daemon_lock", "running", timeout=120)
            
            try:
                triggers = get_triggers()
                modified = False
                now = datetime.datetime.now()

                for trigger in triggers:
                    if trigger.get('status') != 'active':
                        continue

                    last_run_str = trigger.get('last_run')
                    interval = int(trigger.get('interval_minutes', 5))
                    
                    should_run = False
                    if not last_run_str:
                        should_run = True
                    else:
                        try:
                            last_run_dt = datetime.datetime.strptime(last_run_str, "%Y-%m-%d %H:%M:%S")
                            if now >= last_run_dt + datetime.timedelta(minutes=interval):
                                should_run = True
                        except Exception:
                            should_run = True

                    if should_run:
                        target = trigger.get('target', '')
                        if not target:
                            continue
                        
                        # Format target endpoint safely
                        url = target if '://' in target else f"https://{target}"
                        
                        start_time = time.time()
                        try:
                            headers = {
                                'User-Agent': 'UptimeRobot/2.0 (compatible; ExpectException Auto-Trigger Keep-Alive)'
                            }
                            # Send HTTP request to wake up the service
                            res = requests.get(url, headers=headers, timeout=12, verify=False)
                            latency = int((time.time() - start_time) * 1000)
                            status = "up" if 200 <= res.status_code < 400 else "down"
                            log_msg = f"Auto-trigger: HTTP {res.status_code} received in {latency}ms."
                        except Exception as e:
                            latency = 0
                            status = "down"
                            log_msg = f"Auto-trigger ping connection failed: {str(e)}"

                        trigger['last_run'] = now.strftime("%Y-%m-%d %H:%M:%S")
                        trigger['last_status'] = status
                        trigger['last_latency'] = latency
                        
                        # Add tracking log
                        logs = trigger.get('logs', [])
                        logs.insert(0, f"[{now.strftime('%H:%M:%S')}] {log_msg}")
                        trigger['logs'] = logs[:30] # Limit to 30 history log records

                        modified = True

                if modified:
                    save_triggers(triggers)

            except Exception:
                pass

            # Sleep for 15 seconds before checking scheduler intervals again
            time.sleep(15)

def start_scheduler():
    # Only start if this process successfully registers the cache lock
    # Lock has short expiry (120s) so if the container worker restarts, another can pick it up
    lock_acquired = cache.add("uptime_scheduler_daemon_lock", "running", timeout=120)
    if lock_acquired:
        thread = UptimeSchedulerThread()
        thread.start()
