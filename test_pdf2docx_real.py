from pdf2docx import Converter
import os

pdf_path = '/tmp/real_test.pdf'
docx_path = '/tmp/real_test.docx'

if os.path.exists(docx_path):
    os.remove(docx_path)

print(f"Converting {pdf_path}...")
try:
    cv = Converter(pdf_path)
    cv.convert(docx_path)
    cv.close()
    
    if os.path.exists(docx_path):
        size = os.path.getsize(docx_path)
        print(f"SUCCESS: DOCX created. Size: {size} bytes")
    else:
        print("FAILURE: File not created")
except Exception as e:
    print(f"ERROR: {e}")
