import re
import sys
import os
from collections import Counter
from datetime import datetime

# Regex to parse the request log line
LOG_REGEX = re.compile(
    r'\[(?P<level>\w+)\]\s+'
    r'(?P<timestamp>[\d\-, :]+)\s+'
    r'(?P<logger>[\w\.]+)\s+'
    r'(?P<pid>\d+)\s+'
    r'(?P<thread>\d+)\s+'
    r'\[(?P<status>\d+)\]\s+'
    r'(?P<method>\w+)\s+'
    r'(?P<path>[^|]+?)\s*\|\s+'
    r'User:\s+(?P<user>[^|]+?)\s*\|\s+'
    r'IP:\s+(?P<ip>[^|]+?)\s*\|\s+'
    r'Duration:\s+(?P<duration>[\d\.]+)s'
)

def get_log_analysis(file_path):
    ips = Counter()
    paths = Counter()
    status_codes = Counter()
    users = Counter()
    durations = {} # path -> list of durations
    
    total_requests = 0
    parsed_lines = 0
    
    if not os.path.exists(file_path):
        return {"error": f"File {file_path} not found."}

    try:
        with open(file_path, 'r') as f:
            for line in f:
                total_requests += 1
                match = LOG_REGEX.search(line)
                if match:
                    parsed_lines += 1
                    data = match.groupdict()
                    
                    ips[data['ip']] += 1
                    paths[data['path']] += 1
                    status_codes[data['status']] += 1
                    users[data['user']] += 1
                    
                    duration = float(data['duration'])
                    path = data['path']
                    if path not in durations:
                        durations[path] = []
                    durations[path].append(duration)
        
        if parsed_lines == 0:
            return {"error": "No request lines found in the log file."}

        avg_durations = []
        for path, times in durations.items():
            avg = sum(times) / len(times)
            avg_durations.append({"path": path, "avg": avg, "count": len(times)})
        
        avg_durations.sort(key=lambda x: x['avg'], reverse=True)

        status_dist = []
        for status, count in sorted(status_codes.items()):
            status_dist.append({
                "status": status,
                "count": count,
                "percentage": round((count / parsed_lines) * 100, 1)
            })

        return {
            "total_lines": total_requests,
            "parsed_lines": parsed_lines,
            "top_ips": [{"ip": ip, "count": count} for ip, count in ips.most_common(10)],
            "top_paths": [{"path": path, "count": count} for path, count in paths.most_common(10)],
            "status_distribution": status_dist,
            "slowest_endpoints": avg_durations[:10],
            "top_users": [{"user": user, "count": count} for user, count in users.most_common(10)]
        }

    except Exception as e:
        return {"error": str(e)}

def run_cli(file_path):
    analysis = get_log_analysis(file_path)
    if "error" in analysis:
        print(f"Error: {analysis['error']}")
        return

    print(f"Analyzing logs from: {file_path}\n")
    print(f"Total lines processed: {analysis['total_lines']}")
    print(f"Request lines parsed: {analysis['parsed_lines']}")
    print("-" * 50)

    print("\n[Top 10 IP Addresses]")
    for item in analysis['top_ips']:
        print(f"{item['ip']:15} | {item['count']} requests")

    print("\n[Top 10 URLs]")
    for item in analysis['top_paths']:
        print(f"{item['path']:40} | {item['count']} requests")

    print("\n[Status Code Distribution]")
    for item in analysis['status_distribution']:
        print(f"{item['status']} | {item['count']:5} requests ({item['percentage']}%)")

    print("\n[Performance - Top 10 Slowest Endpoints (Average)]")
    for item in analysis['slowest_endpoints']:
        print(f"{item['path']:40} | Avg: {item['avg']:.3f}s (from {item['count']} calls)")

    print("\n[Top 10 Active Users]")
    for item in analysis['top_users']:
        print(f"{item['user']:30} | {item['count']} requests")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyzer.py <path_to_log_file>")
    else:
        run_cli(sys.argv[1])
