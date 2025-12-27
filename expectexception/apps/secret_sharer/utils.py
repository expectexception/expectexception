import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings

def get_fernet():
    """
    Derive a 32-byte URL-safe base64-encoded key from Django's SECRET_KEY.
    """
    password = settings.SECRET_KEY.encode()
    salt = b'expectexception_salt'  # Static salt for deterministic key derivation
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password))
    return Fernet(key)

def encrypt_content(content):
    f = get_fernet()
    return f.encrypt(content.encode()).decode()

def decrypt_content(encrypted_content):
    f = get_fernet()
    return f.decrypt(encrypted_content.encode()).decode()
