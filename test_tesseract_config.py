import pytesseract
import sys

# Print default
print(f"Default cmd: {pytesseract.tesseract_cmd}")

# Try setting it the standard way
pytesseract.tesseract_cmd = '/usr/bin/tesseract'
print(f"Set cmd (standard): {pytesseract.tesseract_cmd}")

# Check if 'pytesseract.pytesseract' exists
try:
    pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
    print(f"Set cmd (nested): {pytesseract.pytesseract.tesseract_cmd}")
except AttributeError:
    print("pytesseract.pytesseract does not exist")
