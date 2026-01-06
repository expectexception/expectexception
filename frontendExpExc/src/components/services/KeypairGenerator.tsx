import React, { useMemo, useState } from 'react';
import {
    Container,
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

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Seo title="RSA/EC Keypair Generator" toolId={25} />

            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                RSA/EC Keypair Generator
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Generate RSA or Elliptic Curve keypairs in your browser.
            </Typography>

            {!cryptoSupported && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    WebCrypto is not available. This tool requires a modern browser and HTTPS/localhost.
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                    <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                        <FormControl fullWidth>
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
                            <FormControl fullWidth>
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
                            <FormControl fullWidth>
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
                            sx={{ minWidth: { xs: '100%', md: 220 } }}
                        >
                            {loading ? 'Generating...' : 'Generate Keypair'}
                        </Button>

                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={clearAll}
                            disabled={loading || !hasKeys}
                            startIcon={<Delete />}
                            sx={{ minWidth: { xs: '100%', md: 160 } }}
                        >
                            Clear
                        </Button>
                    </Stack>

                    {loading && <LinearProgress sx={{ mt: 2 }} />}
                </CardContent>
            </Card>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 3,
                }}
            >
                <Card>
                    <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Public Key (PEM)</Typography>
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
                            minRows={10}
                            value={publicPem}
                            placeholder="Generate a keypair to see the public key..."
                            InputProps={{ readOnly: true }}
                            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Private Key (PEM)</Typography>
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
                            minRows={10}
                            value={privatePem}
                            placeholder="Generate a keypair to see the private key..."
                            InputProps={{ readOnly: true }}
                            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Public Key (JWK)</Typography>
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
                            minRows={10}
                            value={publicJwk}
                            placeholder="Generate a keypair to see the public JWK..."
                            InputProps={{ readOnly: true }}
                            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Private Key (JWK)</Typography>
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
                            minRows={10}
                            value={privateJwk}
                            placeholder="Generate a keypair to see the private JWK..."
                            InputProps={{ readOnly: true }}
                            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                        />
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default KeypairGenerator;
