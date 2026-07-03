import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Stack, Typography, Chip, useTheme, alpha } from '@mui/material';
import { Link as LinkIcon, ContentCopy } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const UrlEncoderDecoder: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [input, setInput] = useState('');
    const [encoded, setEncoded] = useState('');
    const [decoded, setDecoded] = useState('');
    const [copied, setCopied] = useState<'encoded' | 'decoded' | null>(null);

    const handleEncode = () => {
        try { setEncoded(encodeURIComponent(input)); } catch { setEncoded('Encoding failed'); }
    };
    const handleDecode = () => {
        try { setDecoded(decodeURIComponent(input)); } catch { setDecoded('Decoding failed — input may already be decoded'); }
    };

    const copy = (val: string, type: 'encoded' | 'decoded') => {
        navigator.clipboard.writeText(val).then(() => { setCopied(type); setTimeout(() => setCopied(null), 2000); });
    };

    const examples = [
        'Hello World! How are you?',
        'https://example.com/path?name=John Doe&age=30',
        'Special chars: & = + # % ? / : @',
    ];

    return (
        <ServicePageShell icon={LinkIcon} title="URL Encoder / Decoder" subtitle="Safely encode and decode URL components — runs entirely in your browser" maxWidth="md">
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <TextField
                        fullWidth multiline rows={4}
                        label="Input text or URL"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Paste your text or URL here..."
                        sx={{ mb: 2 }}
                    />

                    <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                        <Button variant="contained" onClick={handleEncode} sx={{ borderRadius: 2, flex: 1 }}>
                            Encode →
                        </Button>
                        <Button variant="outlined" onClick={handleDecode} sx={{ borderRadius: 2, flex: 1 }}>
                            ← Decode
                        </Button>
                    </Stack>

                    {encoded && (
                        <Box sx={{ mb: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" fontWeight="700" color={primary} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Encoded</Typography>
                                <Button size="small" startIcon={<ContentCopy sx={{ fontSize: 14 }} />} onClick={() => copy(encoded, 'encoded')} sx={{ fontSize: '0.72rem' }}>
                                    {copied === 'encoded' ? 'Copied!' : 'Copy'}
                                </Button>
                            </Box>
                            <Box sx={{ p: 2, bgcolor: alpha(primary, 0.05), border: `1px solid ${alpha(primary, 0.2)}`, borderRadius: 2, fontFamily: 'monospace', fontSize: '0.88rem', wordBreak: 'break-all', color: 'text.primary' }}>
                                {encoded}
                            </Box>
                        </Box>
                    )}

                    {decoded && (
                        <Box sx={{ mb: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" fontWeight="700" color={theme.palette.secondary.main} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Decoded</Typography>
                                <Button size="small" startIcon={<ContentCopy sx={{ fontSize: 14 }} />} onClick={() => copy(decoded, 'decoded')} sx={{ fontSize: '0.72rem' }}>
                                    {copied === 'decoded' ? 'Copied!' : 'Copy'}
                                </Button>
                            </Box>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.05), border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`, borderRadius: 2, fontFamily: 'monospace', fontSize: '0.88rem', wordBreak: 'break-all', color: 'text.primary' }}>
                                {decoded}
                            </Box>
                        </Box>
                    )}

                    <Box>
                        <Typography variant="caption" fontWeight="700" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                            Quick Examples
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                            {examples.map((ex, i) => (
                                <Chip key={i} label={`Example ${i + 1}`} size="small" onClick={() => setInput(ex)} sx={{ cursor: 'pointer', bgcolor: alpha('#fff', 0.04), '&:hover': { bgcolor: alpha(primary, 0.1) } }} />
                            ))}
                        </Stack>
                    </Box>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default UrlEncoderDecoder;
