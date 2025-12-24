import pytesseract
print(dir(pytesseract))
try:
    from pytesseract import pytesseract
    print("Found pytesseract submodule")
    print(dir(pytesseract))
    print(f"tesseract_cmd inside submodule: {getattr(pytesseract, 'tesseract_cmd', 'MISSING')}")
except ImportError:
    print("No pytesseract submodule")
