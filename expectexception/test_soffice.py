import subprocess
import shutil
import os

print("Checking soffice...")
soffice_path = shutil.which('soffice')
print(f"soffice path: {soffice_path}")

if not soffice_path:
    print("ERROR: soffice not found in PATH")
    exit(1)

print("Attempting to run soffice --version")
try:
    result = subprocess.run([soffice_path, '--version'], capture_output=True, text=True, timeout=10)
    print(f"Return code: {result.returncode}")
    print(f"Stdout: {result.stdout}")
    print(f"Stderr: {result.stderr}")
except Exception as e:
    print(f"Execution failed: {e}")
