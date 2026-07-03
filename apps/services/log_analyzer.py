import re
import sys
import os
import json
import requests
from collections import Counter, defaultdict
from datetime import datetime, timedelta

# Regex to parse the request log line (updated to handle optional UA)
LOG_REGEX = re.compile(
    r'\[(?P<level>\w+)\]\s+'
    r'(?P<timestamp>(?P<date>\d{4}-\d{2}-\d{2})\s+(?P<time>\d{2}:\d{2}:\d{2}),\d+)\s+'
    r'(?P<logger>[\w\.]+)\s+'
    r'(?P<pid>\d+)\s+'
    r'(?P<thread>\d+)\s+'
    r'\[(?P<status>\d+)\]\s+'
    r'(?P<method>\w+)\s+'
    r'(?P<path>[^|]+?)\s*\|\s+'
    r'User:\s+(?P<user>[^|]+?)\s*\|\s+'
    r'IP:\s+(?P<ip>[^|]+?)\s*\|'
    r'(\s*UA:\s*(?P<ua>[^|]+?)\s*\|)?' # Optional User-Agent
    r'\s*Duration:\s+(?P<duration>[\d\.]+)s'
)

def parse_ua(ua_string):
    """Simple regex based User-Agent parser"""
    if not ua_string or ua_string == 'Unknown':
        return {"device": "Unknown", "browser": "Unknown", "os": "Unknown"}
    
    ua_string = ua_string.lower()
    
    # Device Detection
    if any(m in ua_string for m in ['iphone', 'android', 'mobile']):
        device = 'Mobile'
    elif 'tablet' in ua_string or 'ipad' in ua_string:
        device = 'Tablet'
    else:
        device = 'Desktop'
        
    # Browser Detection
    if 'edg/' in ua_string: browser = 'Edge'
    elif 'chrome/' in ua_string: browser = 'Chrome'
    elif 'firefox/' in ua_string: browser = 'Firefox'
    elif 'safari/' in ua_string and 'chrome' not in ua_string: browser = 'Safari'
    elif 'opr/' in ua_string or 'opera' in ua_string: browser = 'Opera'
    else: browser = 'Other'
    
    # OS Detection
    if 'windows' in ua_string: os_name = 'Windows'
    elif 'android' in ua_string: os_name = 'Android'
    elif 'iphone' in ua_string or 'ipad' in ua_string: os_name = 'iOS'
    elif 'macintosh' in ua_string or 'mac os' in ua_string: os_name = 'macOS'
    elif 'linux' in ua_string: os_name = 'Linux'
    else: os_name = 'Other'
    
    return {"device": device, "browser": browser, "os": os_name}

def get_geo_info(ips, cache):
    """Batch lookup GeoIP info for a list of IPs using ip-api.com"""
    new_ips = [ip for ip in ips if ip not in cache and ip not in ['127.0.0.1', '::1', 'localhost']]
    if not new_ips:
        return cache

    # Batch limit for ip-api is 100
    for i in range(0, len(new_ips), 100):
        batch = new_ips[i:i+100]
        try:
            response = requests.post("http://ip-api.com/batch", json=batch, timeout=5)
            if response.status_code == 200:
                results = response.json()
                for ip, res in zip(batch, results):
                    if res.get('status') == 'success':
                        cache[ip] = {
                            "country": res.get('country', 'Unknown'),
                            "countryCode": res.get('countryCode', 'UN'),
                            "city": res.get('city', 'Unknown'),
                            "isp": res.get('isp', 'Unknown')
                        }
                    else:
                        cache[ip] = {"country": "Internal/Unknown", "countryCode": "UN"}
        except Exception:
            pass
            
    return cache

def get_log_analysis(file_path, state_file=None):
    """
    Advanced incremental log analysis with GeoIP and User-Agent intelligence.
    """
    if state_file is None:
        state_file = file_path + ".state.json"

    # Default initial state
    state = {
        "offset": 0,
        "total_lines": 0,
        "parsed_lines": 0,
        "ips": {},
        "paths": {},
        "status_codes": {},
        "users": {},
        "durations_agg": {},
        "hourly_hits": {},
        "path_errors": {},
        "geo_cache": {},      # ip -> {country, city, etc}
        "devices": {},        # desktop, mobile, etc
        "browsers": {},
        "os": {},
        "last_updated": None
    }

    analysis_obj = None
    try:
        from .models import LogIntelligence
        analysis_obj = LogIntelligence.objects.order_by('-date').first()
        if analysis_obj:
            state.update(analysis_obj.state_data)
    except Exception as e:
        print(f"Note: Could not load state from DB: {e}. Falling back to file.")
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r') as f:
                    loaded_state = json.load(f)
                    for key in ["geo_cache", "devices", "browsers", "os"]:
                        if key not in loaded_state: loaded_state[key] = {}
                    state.update(loaded_state)
            except Exception as fe:
                print(f"Warning: Could not load state file {state_file}: {fe}")

    if not os.path.exists(file_path):
        return {"error": f"File {file_path} not found."}

    ips = Counter(state["ips"])
    paths = Counter(state["paths"])
    status_codes = Counter(state["status_codes"])
    users = Counter(state["users"])
    devices = Counter(state["devices"])
    browsers = Counter(state["browsers"])
    os_stats = Counter(state["os"])
    durations_agg = state["durations_agg"]
    hourly_hits = state["hourly_hits"]
    geo_cache = state["geo_cache"]
    path_errors = defaultdict(Counter, {k: Counter(v) for k, v in state["path_errors"].items()})
    
    total_lines = state["total_lines"]
    parsed_lines = state["parsed_lines"]
    current_offset = state["offset"]

    file_size = os.path.getsize(file_path)
    if file_size < current_offset:
        current_offset = 0

    new_ips_to_lookup = set()

    try:
        with open(file_path, 'r') as f:
            f.seek(current_offset)
            for line in f:
                total_lines += 1
                match = LOG_REGEX.search(line)
                if match:
                    parsed_lines += 1
                    data = match.groupdict()
                    
                    status = data['status']
                    path = data['path'].strip()
                    user = data['user'].strip()
                    ip = data['ip'].strip()
                    ua = data.get('ua') or 'Unknown'
                    
                    ips[ip] += 1
                    paths[path] += 1
                    status_codes[status] += 1
                    users[user] += 1
                    
                    # UA Parsing
                    ua_info = parse_ua(ua)
                    devices[ua_info['device']] += 1
                    browsers[ua_info['browser']] += 1
                    os_stats[ua_info['os']] += 1
                    
                    # GeoIP Queue
                    if ip not in geo_cache:
                        new_ips_to_lookup.add(ip)
                    
                    # Hourly
                    hour_key = f"{data['date']} {data['time'][:2]}"
                    hourly_hits[hour_key] = hourly_hits.get(hour_key, 0) + 1
                    
                    if status.startswith(('4', '5')):
                        path_errors[path][status] += 1
                    
                    duration = float(data['duration'])
                    if path not in durations_agg:
                        durations_agg[path] = {"sum": 0.0, "count": 0}
                    durations_agg[path]["sum"] += duration
                    durations_agg[path]["count"] += 1
            
            new_offset = f.tell()

        # Batch GeoIP Lookup
        if new_ips_to_lookup:
            geo_cache = get_geo_info(list(new_ips_to_lookup), geo_cache)

        if hourly_hits:
            limit_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            hourly_hits = {k: v for k, v in hourly_hits.items() if k >= limit_date}

        state.update({
            "offset": new_offset,
            "total_lines": total_lines,
            "parsed_lines": parsed_lines,
            "ips": dict(ips),
            "paths": dict(paths),
            "status_codes": dict(status_codes),
            "users": dict(users),
            "devices": dict(devices),
            "browsers": dict(browsers),
            "os": dict(os_stats),
            "geo_cache": geo_cache,
            "durations_agg": durations_agg,
            "hourly_hits": hourly_hits,
            "path_errors": {k: dict(v) for k, v in path_errors.items()},
            "last_updated": datetime.now().isoformat()
        })

        with open(state_file, 'w') as f:
            json.dump(state, f, indent=4)

        # Save to DB
        try:
            from .models import LogIntelligence
            from django.utils import timezone
            LogIntelligence.objects.update_or_create(
                date=timezone.now().date(),
                defaults={'state_data': state}
            )
        except Exception as db_e:
            print(f"Error saving to DB: {db_e}")

        # Aggregate Result
        countries = Counter()
        for ip, count in ips.items():
            info = geo_cache.get(ip, {"country": "Unknown"})
            countries[info['country']] += count

        avg_durations = [{"path": p, "avg": a["sum"]/a["count"], "count": a["count"]} for p, a in durations_agg.items()]
        avg_durations.sort(key=lambda x: x['avg'], reverse=True)

        return {
            "total_lines": total_lines,
            "parsed_lines": parsed_lines,
            "top_ips": [{"ip": ip, "count": count, "geo": geo_cache.get(ip, {})} for ip, count in ips.most_common(10)],
            "top_paths": [{"path": path, "count": count} for path, count in paths.most_common(15)],
            "status_distribution": [{"status": s, "count": c, "percentage": round((c/parsed_lines)*100, 1) if parsed_lines > 0 else 0} for s, c in sorted(status_codes.items())],
            "countries": [{"country": k, "count": v, "percentage": round((v/parsed_lines)*100, 1) if parsed_lines > 0 else 0} for k, v in countries.most_common(10)],
            "device_stats": {"labels": list(devices.keys()), "data": list(devices.values())},
            "browser_stats": {"labels": list(browsers.keys()), "data": list(browsers.values())},
            "os_stats": {"labels": list(os_stats.keys()), "data": list(os_stats.values())},
            "hourly_series": {"labels": [x[0] for x in sorted(hourly_hits.items())], "data": [x[1] for x in sorted(hourly_hits.items())]},
            "path_errors": [{"path": k, "total": sum(v.values()), "breakdown": dict(v)} for k, v in sorted(path_errors.items(), key=lambda x: sum(x[1].values()), reverse=True)[:10]],
            "top_users": [{"user": user, "count": count} for user, count in users.most_common(12)],
            "last_updated": state["last_updated"]
        }

    except Exception as e:
        return {"error": str(e)}

def run_cli(file_path):
    print("Enterprise Log Analyzer CLI - Intel Syncing...")
    analysis = get_log_analysis(file_path)
    if "error" in analysis: print(f"Error: {analysis['error']}"); return
    print(f"Sync Complete. {analysis['parsed_lines']} requests analyzed.")
    print(f"Top Country: {analysis['countries'][0] if analysis['countries'] else 'N/A'}")

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: python log_analyzer.py <path_to_log_file>")
    else: run_cli(sys.argv[1])
