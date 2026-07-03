import React, { useMemo, useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Alert,
    LinearProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Stack,
} from '@mui/material';
import { ContentCopy, VpnKey, Delete } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

type KeyType = 'rsa' | 'ec';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    // Avoid spread/iteration over Uint8Array for ES5 targets.
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToPem(base64: string, label: string): string {
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

const KeypairGenerator: React.FC = () => {
    const [keyType, setKeyType] = useState<KeyType>('rsa');
    const [rsaBits, setRsaBits] = useState<number>(2048);
    const [ecCurve, setEcCurve] = useState<'P-256' | 'P-384' | 'P-521'>('P-256');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [publicPem, setPublicPem] = useState('');
    const [privatePem, setPrivatePem] = useState('');
    const [publicJwk, setPublicJwk] = useState('');
    const [privateJwk, setPrivateJwk] = useState('');

    // Pure client-side tool: keys are generated with the browser's Web Crypto
    // API and never sent to any server. Private keys should never leave the
    // browser, so there is intentionally no backend endpoint for this tool.
    const cryptoSupported = useMemo(() => {
        return typeof window !== 'undefined' && !!window.crypto?.subtle;
    }, []);

    const clearAll = () => {
        setPublicPem('');
        setPrivatePem('');
        setPublicJwk('');
        setPrivateJwk('');
        setError(null);
    };

    const handleGenerate = async () => {
        if (!cryptoSupported) {
            setError('WebCrypto is not available. Use a modern browser and HTTPS/localhost.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const subtle = window.crypto.subtle;

            const algorithm: RsaHashedKeyGenParams | EcKeyGenParams =
                keyType === 'rsa'
                    ? {
                        name: 'RSASSA-PKCS1-v1_5',
                        modulusLength: rsaBits,
                        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                        hash: 'SHA-256',
                    }
                    : {
                        name: 'ECDSA',
                        namedCurve: ecCurve,
                    };

            const usages: KeyUsage[] = ['sign', 'verify'];

            const keyPair = (await subtle.generateKey(algorithm, true, usages)) as CryptoKeyPair;

            const [spki, pkcs8] = await Promise.all([
                subtle.exportKey('spki', keyPair.publicKey),
                subtle.exportKey('pkcs8', keyPair.privateKey),
            ]);

            const [jwkPub, jwkPriv] = await Promise.all([
                subtle.exportKey('jwk', keyPair.publicKey),
                subtle.exportKey('jwk', keyPair.privateKey),
            ]);

            setPublicPem(base64ToPem(arrayBufferToBase64(spki), 'PUBLIC KEY'));
            setPrivatePem(base64ToPem(arrayBufferToBase64(pkcs8), 'PRIVATE KEY'));
            setPublicJwk(JSON.stringify(jwkPub, null, 2));
            setPrivateJwk(JSON.stringify(jwkPriv, null, 2));
        } catch (e: any) {
            setError(e?.message || 'Key generation failed');
        } finally {
            setLoading(false);
        }
    };

    const hasKeys = !!publicPem && !!privatePem;

    const keyFieldSx = {
        flex: 1,
        minHeight: 0,
        '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
        '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.78rem', height: '100% !important', overflowY: 'auto !important' },
    };

    return (
        <ServicePageShell
            icon={VpnKey}
            title="RSA/EC Keypair Generator"
            subtitle="Generate RSA or Elliptic Curve keypairs in your browser - private keys never leave your device."
            maxWidth="md"
        >
            <Seo title="RSA/EC Keypair Generator" toolId={25} />

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {!cryptoSupported && (
                    <Alert severity="warning" sx={{ mb: 1.5, flexShrink: 0 }}>
                        WebCrypto is not available. This tool requires a modern browser and HTTPS/localhost.
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }}>
                        {error}
                    </Alert>
                )}

                <Card sx={{ mb: 1.5, flexShrink: 0 }}>
                    <CardContent sx={{ p: 2 }}>
                        <Stack spacing={1.5} direction={{ xs: 'column', md: 'row' }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Key Type</InputLabel>
                                <Select
                                    value={keyType}
                                    label="Key Type"
                                    onChange={(e) => {
                                        setKeyType(e.target.value as KeyType);
                                        setError(null);
                                    }}
                                >
                                    <MenuItem value="rsa">RSA</MenuItem>
                                    <MenuItem value="ec">EC (Elliptic Curve)</MenuItem>
                                </Select>
                            </FormControl>

                            {keyType === 'rsa' ? (
                                <FormControl fullWidth size="small">
                                    <InputLabel>RSA Bits</InputLabel>
                                    <Select
                                        value={rsaBits}
                                        label="RSA Bits"
                                        onChange={(e) => setRsaBits(Number(e.target.value))}
                                    >
                                        <MenuItem value={2048}>2048</MenuItem>
                                        <MenuItem value={3072}>3072</MenuItem>
                                        <MenuItem value={4096}>4096</MenuItem>
                                    </Select>
                                </FormControl>
                            ) : (
                                <FormControl fullWidth size="small">
                                    <InputLabel>Curve</InputLabel>
                                    <Select
                                        value={ecCurve}
                                        label="Curve"
                                        onChange={(e) => setEcCurve(e.target.value as any)}
                                    >
                                        <MenuItem value="P-256">P-256</MenuItem>
                                        <MenuItem value="P-384">P-384</MenuItem>
                                        <MenuItem value="P-521">P-521</MenuItem>
                                    </Select>
                                </FormControl>
                            )}

                            <Button
                                variant="contained"
                                onClick={handleGenerate}
                                disabled={loading || !cryptoSupported}
                                startIcon={<VpnKey />}
                                sx={{ minWidth: { xs: '100%', md: 200 } }}
                            >
                                {loading ? 'Generating...' : 'Generate Keypair'}
                            </Button>

                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={clearAll}
                                disabled={loading || !hasKeys}
                                startIcon={<Delete />}
                                sx={{ minWidth: { xs: '100%', md: 140 } }}
                            >
                                Clear
                            </Button>
                        </Stack>

                        {loading && <LinearProgress sx={{ mt: 1.5 }} />}
                    </CardContent>
                </Card>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gridTemplateRows: { xs: 'repeat(4, minmax(140px, 1fr))', md: 'repeat(2, minmax(0, 1fr))' },
                        gap: 1.5,
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <Card sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                                <Typography variant="subtitle2">Public Key (PEM)</Typography>
                                <Button
                                    size="small"
                                    startIcon={<ContentCopy />}
                                    disabled={!publicPem}
                                    onClick={() => copyToClipboard(publicPem)}
                                >
                                    Copy
                                </Button>
                            </Box>
                            <TextField
                                fullWidth
                                multiline
                                value={publicPem}
                                placeholder="Generate a keypair to see the public key..."
                                InputProps={{ readOnly: true }}
                                sx={keyFieldSx}
                            />
                        </CardContent>
                    </Card>

                    <Card sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                                <Typography variant="subtitle2">Private Key (PEM)</Typography>
                                <Button
                                    size="small"
                                    startIcon={<ContentCopy />}
                                    disabled={!privatePem}
                                    onClick={() => copyToClipboard(privatePem)}
                                >
                                    Copy
                                </Button>
                            </Box>
                            <TextField
                                fullWidth
                                multiline
                                value={privatePem}
                                placeholder="Generate a keypair to see the private key..."
                                InputProps={{ readOnly: true }}
                                sx={keyFieldSx}
                            />
                        </CardContent>
                    </Card>

                    <Card sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                                <Typography variant="subtitle2">Public Key (JWK)</Typography>
                                <Button
                                    size="small"
                                    startIcon={<ContentCopy />}
                                    disabled={!publicJwk}
                                    onClick={() => copyToClipboard(publicJwk)}
                                >
                                    Copy
                                </Button>
                            </Box>
                            <TextField
                                fullWidth
                                multiline
                                value={publicJwk}
                                placeholder="Generate a keypair to see the public JWK..."
                                InputProps={{ readOnly: true }}
                                sx={keyFieldSx}
                            />
                        </CardContent>
                    </Card>

                    <Card sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                                <Typography variant="subtitle2">Private Key (JWK)</Typography>
                                <Button
                                    size="small"
                                    startIcon={<ContentCopy />}
                                    disabled={!privateJwk}
                                    onClick={() => copyToClipboard(privateJwk)}
                                >
                                    Copy
                                </Button>
                            </Box>
                            <TextField
                                fullWidth
                                multiline
                                value={privateJwk}
                                placeholder="Generate a keypair to see the private JWK..."
                                InputProps={{ readOnly: true }}
                                sx={keyFieldSx}
                            />
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </ServicePageShell>
    );
};

export default KeypairGenerator;
