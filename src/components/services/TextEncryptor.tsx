import React, { useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, Button, ToggleButtonGroup, ToggleButton, Alert } from '@mui/material';
import { EnhancedEncryption, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

const SALT_LEN = 16;
const IV_LEN = 12;

// Derives an AES-GCM key from a passphrase via PBKDF2 (100k iterations) so a
// short human passphrase still produces a full-strength 256-bit key.
const deriveKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

const bufToBase64 = (buf: ArrayBuffer | Uint8Array): string => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return btoa(String.fromCharCode(...Array.from(bytes)));
};
const base64ToBuf = (b64: string): Uint8Array => {
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** AES-256-GCM text encryption using the browser's native Web Crypto API —
 * no library, no server round-trip. The passphrase never leaves the browser;
 * salt + IV are bundled with the ciphertext so decryption only needs the
 * passphrase back. */
const TextEncryptor: React.FC = () => {
    const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
    const [passphrase, setPassphrase] = useState('');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');

    const handleRun = async () => {
        setError('');
        setOutput('');
        if (!passphrase || !input) return;

        try {
            if (mode === 'encrypt') {
                const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
                const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
                const key = await deriveKey(passphrase, salt);
                const enc = new TextEncoder();
                const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as unknown as BufferSource }, key, enc.encode(input));
                // Bundle salt + iv + ciphertext together so decrypt only needs the passphrase.
                const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
                combined.set(salt, 0);
                combined.set(iv, salt.length);
                combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
                setOutput(bufToBase64(combined));
            } else {
                const combined = base64ToBuf(input.trim());
                const salt = combined.slice(0, SALT_LEN);
                const iv = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
                const ciphertext = combined.slice(SALT_LEN + IV_LEN);
                const key = await deriveKey(passphrase, salt);
                const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as unknown as BufferSource }, key, ciphertext as unknown as BufferSource);
                setOutput(new TextDecoder().decode(plaintext));
            }
        } catch (e) {
            setError(mode === 'decrypt' ? 'Decryption failed — wrong passphrase or corrupted ciphertext.' : 'Encryption failed.');
        }
    };

    const handleCopy = () => navigator.clipboard.writeText(output);

    return (
        <ServicePageShell
            icon={EnhancedEncryption}
            title="Text Encryptor"
            subtitle="AES-256-GCM encryption using your browser's native Web Crypto API — the passphrase and plaintext never leave your device."
        >
            <Seo title="AES Text Encryptor & Decryptor - Free Online Tool" />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
            }}>
                <CardContent sx={{ p: 1 }}>
                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={(_, v) => { if (v) { setMode(v); setInput(''); setOutput(''); setError(''); } }}
                        fullWidth
                        sx={{ mb: 2 }}
                    >
                        <ToggleButton value="encrypt" sx={{ textTransform: 'none' }}>Encrypt</ToggleButton>
                        <ToggleButton value="decrypt" sx={{ textTransform: 'none' }}>Decrypt</ToggleButton>
                    </ToggleButtonGroup>

                    <TextField
                        label="Passphrase"
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        label={mode === 'encrypt' ? 'Text to encrypt' : 'Ciphertext (base64) to decrypt'}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        fullWidth
                        multiline
                        minRows={3}
                        sx={{ mb: 2 }}
                    />

                    <Button variant="contained" onClick={handleRun} disabled={!passphrase || !input} sx={{ mb: 2 }}>
                        {mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
                    </Button>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {output && (
                        <Box sx={{ position: 'relative' }}>
                            <Box sx={{
                                p: 2, borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace',
                                fontSize: '0.85rem', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto',
                            }}>
                                {output}
                            </Box>
                            <Button size="small" startIcon={<ContentCopy />} onClick={handleCopy} sx={{ mt: 1 }}>
                                Copy Result
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default TextEncryptor;
