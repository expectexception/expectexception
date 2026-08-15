import torch
import easyocr
import sys

def verify_gpu():
    print("Checking GPU status for AI Tasks...")
    
    if torch.cuda.is_available():
        device_count = torch.cuda.device_count()
        current_device = torch.cuda.current_device()
        device_name = torch.cuda.get_device_name(current_device)
        print(f"✅ CUDA is available!")
        print(f"✅ Found {device_count} GPU(s).")
        print(f"✅ Using GPU 0: {device_name}")
        
        # Test EasyOCR load
        print("\nTrying to initialize EasyOCR on GPU (this might take a few seconds)...")
        try:
            reader = easyocr.Reader(['en'], gpu=True, verbose=False)
            print("✅ EasyOCR initialized successfully on GPU.")
            print("✅ Detector: " + str(reader.detector))
            print("✅ RecognizerModel: " + str(reader.recognizer))
        except Exception as e:
            print(f"❌ EasyOCR failed to load on GPU: {e}")
            sys.exit(1)
            
    else:
        print("❌ no CUDA device detected. Running on CPU.")
        sys.exit(1)

if __name__ == "__main__":
    verify_gpu()
