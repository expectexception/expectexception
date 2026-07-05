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
        <ServicePageShell
            icon={LinkIcon}
            title="URL Encoder / Decoder"
            subtitle="Safely encode and decode URL components — runs entirely in your browser"
            maxWidth="md"
            seoTitle="URL Encoder / Decoder Online — Percent Encoding Tool"
            toolId={39}
            keywords={['url encode online', 'url decode', 'percent encoding', 'encodeuricomponent online', 'query string encoder', 'url escape characters', 'decode url online', 'uri encoder decoder']}
            about="Percent-encodes text so it's safe to use inside a URL — spaces, &, =, ?, and other reserved characters get converted to %XX sequences — or decodes an already-encoded string back to plain text. It calls the browser's built-in encodeURIComponent and decodeURIComponent directly, the same functions your own code would use, so the result matches exactly what you'd get at runtime. Encode and Decode write to separate result panels, so you can run the same input through both and compare them side by side. Everything happens client-side; nothing is sent anywhere."
            howToSteps={[
                { name: 'Enter your text', text: 'Paste text or a URL into the input box, or click one of the example chips to try a sample.' },
                { name: 'Click "Encode →"', text: 'Percent-encodes the input using encodeURIComponent and shows the result in the Encoded panel.' },
                { name: 'Click "← Decode"', text: 'Runs the same input through decodeURIComponent instead, shown in the Decoded panel.' },
                { name: 'Copy the result', text: 'Use the Copy button next to whichever output — Encoded or Decoded — you need.' },
            ]}
            faq={[
                { question: "What happens if I decode text that isn't validly encoded?", answer: 'decodeURIComponent throws on malformed sequences (e.g. a stray % not followed by two hex digits), and the tool shows "Decoding failed — input may already be decoded" instead of crashing.' },
                { question: 'Does this encode a full URL or just one value?', answer: "It uses encodeURIComponent, which is meant for individual query values or path segments — it will also escape characters like /, :, and ? that are normally left alone in a full URL. Don't run an entire https://... URL through Encode unless you actually want those characters escaped too." },
                { question: 'Is my input sent anywhere?', answer: 'No, both Encode and Decode run entirely in your browser using native JavaScript functions.' },
                { question: 'Can I see both the encoded and decoded version at once?', answer: 'Yes — clicking both Encode and Decode on the same input fills in both result panels, so you can compare them side by side.' },
            ]}
        >
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
