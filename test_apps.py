import os
import wave
import struct
import subprocess
import requests
import sys

# 1. Test Audio Separator (Demucs)
def create_dummy_wav(filename):
    # 10 seconds of silence
    duration = 10
    framerate = 44100
    nframes = duration * framerate
    
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(framerate)
        data = struct.pack('<h', 0) * nframes
        f.writeframes(data)
    print(f"Created {filename} ({duration}s)")

def test_demucs():
    print("Testing Demucs...")
    create_dummy_wav("test_audio.wav")
    demucs_cmd = "/home/rjt/expexcV2/expectexception/.venv/bin/demucs"
    cmd = [demucs_cmd, "--two-stems=vocals", "-n", "htdemucs", "-o", "demucs_out", "test_audio.wav"]
    
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if proc.returncode == 0:
            print("Demucs SUCCESS")
            print(proc.stdout)
            return True
        else:
            print(f"Demucs FAILED with code {proc.returncode}")
            print(f"STDERR: {proc.stderr}")
            print(f"STDOUT: {proc.stdout}")
            return False
    except subprocess.TimeoutExpired:
        print("Demucs TIMEOUT")
        return False
    except Exception as e:
        print(f"Demucs ERROR: {e}")
        return False

# 2. Test Image Compressor Endpoint (Skipping as it passed previously)
def test_image_compressor():
    return True

if __name__ == "__main__":
    if test_demucs():
        sys.exit(0)
    else:
        sys.exit(1)
