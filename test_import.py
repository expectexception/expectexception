import sys
import traceback

print(f"Python executable: {sys.executable}")
print(f"Python path: {sys.path}")

try:
    print("Attempting to import rembg...")
    import rembg
    print("Successfully imported rembg")
    from rembg import remove
    print("Successfully imported remove function")
except ImportError:
    print("Caught ImportError during import:")
    traceback.print_exc()
except Exception:
    print("Caught unexpected exception during import:")
    traceback.print_exc()
