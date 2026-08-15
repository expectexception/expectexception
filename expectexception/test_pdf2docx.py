import os
import shutil
import tempfile
from pdf2docx import Converter

# Create dummy PDF
temp_dir = tempfile.mkdtemp()
pdf_path = os.path.join(temp_dir, 'test.pdf')
docx_path = os.path.join(temp_dir, 'test.docx')

try:
    with open(pdf_path, 'wb') as f:
        f.write(b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000256 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n351\n%%EOF')

    print("Created dummy PDF")
    
    cv = Converter(pdf_path)
    cv.convert(docx_path)
    cv.close()
    
    if os.path.exists(docx_path):
        print(f"Success! DOCX created at {docx_path}")
        print(f"Size: {os.path.getsize(docx_path)} bytes")
    else:
        print("Failure: DOCX not created")

except Exception as e:
    print(f"Error: {e}")
finally:
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
