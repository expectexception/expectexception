import subprocess
import os
import shutil
import tempfile

# clean env
custom_env = {
    'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    'HOME': '/tmp/test_lo_home'
}
if os.path.exists(custom_env['HOME']):
    shutil.rmtree(custom_env['HOME'])
os.makedirs(custom_env['HOME'])

# Create dummy PDF
pdf_path = os.path.join(custom_env['HOME'], 'test.pdf')
with open(pdf_path, 'wb') as f:
    f.write(b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000256 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n351\n%%EOF')

cmd = [
    '/usr/bin/soffice',
    '--headless',
    '--invisible', 
    '--nologo',
    '--nofirststartwizard',
    '--convert-to',
    'docx:MS Word 2007 XML',
    '--outdir',
    custom_env['HOME'],
    pdf_path
]

print(f"Running: {' '.join(cmd)}")
print(f"Env HOME: {custom_env['HOME']}")

try:
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=30,
        env=custom_env
    )
    print(f"Return Code: {result.returncode}")
    print(f"Stdout: {result.stdout}")
    print(f"Stderr: {result.stderr}")
    
    files = os.listdir(custom_env['HOME'])
    print(f"Files in dir: {files}")
    
except Exception as e:
    print(f"Exception: {e}")
