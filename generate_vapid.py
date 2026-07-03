"""
Generate VAPID keys for Web Push Notifications
Run: python generate_vapid.py
"""
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import base64

# Generate private key
private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())

# Get public key
public_key = private_key.public_key()

# Serialize to bytes
private_bytes = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

public_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)

# Convert to base64 URL-safe format
public_key_b64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')

print("\n" + "="*60)
print("VAPID Keys Generated Successfully!")
print("="*60)
print("\nAdd these to your .env file:\n")
print(f"VAPID_PUBLIC_KEY={public_key_b64}")
print(f"VAPID_PRIVATE_KEY_PEM='{private_bytes.decode()}'")
print("VAPID_EMAIL=admin@expectexception.com")
print("\n" + "="*60)
print("\nFor frontend (copy this public key):")
print(f"{public_key_b64}")
print("="*60 + "\n")
