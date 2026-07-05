import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, Alert, TextField,
    ToggleButton, ToggleButtonGroup, Stack,
} from '@mui/material';
import { Code, ContentCopy, SwapHoriz } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const Base64Tool: React.FC = () => {
    const [mode, setMode] = useState<'encode' | 'decode'>('encode');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleProcess = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.post(endpoints.services.base64, {
                action: mode,
                text: input,
            });
            setOutput(response.data.result);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Processing failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(output);
    };

    const handleSwap = () => {
        setInput(output);
        setOutput('');
        setMode(mode === 'encode' ? 'decode' : 'encode');
    };

    return (
        <ServicePageShell
            icon={Code}
            title="Base64 Encoder/Decoder"
            subtitle="Encode text to Base64 or decode Base64 to text"
            maxWidth="md"
            about="Converts text to and from Base64, the encoding scheme used to represent arbitrary data as plain ASCII — for example inside data URIs, email attachments, or HTTP Basic Auth headers. Unlike most other text tools on this site, the actual encode/decode step runs as a request to our backend rather than purely in your browser: pick a mode, enter your text, and press the button to get a result back. The Swap button drops the output back into the input and flips the mode, which is a quick way to round-trip a value and confirm it decodes back to the original."
            howToSteps={[
                { name: 'Choose Encode or Decode', text: 'Use the toggle buttons above the text boxes to pick which direction you want to convert.' },
                { name: 'Enter your text', text: 'Type or paste the text (or Base64 string) into the left-hand input box.' },
                { name: 'Run the conversion', text: 'Click "Encode →" or "Decode →" to send the request and show the result on the right.' },
                { name: 'Copy or swap', text: 'Use "Copy" to copy the result, or "Swap" to move the output back into the input and flip modes for a round-trip check.' },
            ]}
            faq={[
                { question: 'Is my text sent to a server?', answer: "Yes — unlike most tools on this site, Base64 conversion here is handled by a backend request rather than entirely in your browser. Only the text you enter is sent, and it's used solely to compute the encoded or decoded result." },
                { question: 'What happens if I try to decode invalid Base64?', answer: 'The request fails and an error message (e.g. "Processing failed") appears in the red alert banner instead of a result.' },
                { question: 'Can I encode a file, not just typed text?', answer: 'This tool works on text you type or paste into the box, not file uploads — paste the text content you want to encode instead.' },
                { question: 'What is Base64 actually used for?', answer: 'It lets binary or arbitrary data be safely represented using only printable ASCII characters, which is why it shows up in data URIs, JWT tokens, email attachments, and API payloads that need to embed non-text data inside text formats like JSON or XML.' },
            ]}
        >
            <Seo
                title="Base64 Encoder & Decoder - Online Text & File Converter"
                toolId={18}
            />

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {error && <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }}>{error}</Alert>}

                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5, flexShrink: 0 }}>
                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={(_, v) => v && setMode(v)}
                        color="primary"
                        size="small"
                    >
                        <ToggleButton value="encode">Encode</ToggleButton>
                        <ToggleButton value="decode">Decode</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        flexDirection: { xs: 'column', md: 'row' },
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <Card sx={{ flex: 1, minWidth: { xs: '100%', md: 0 }, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ flexShrink: 0 }}>
                                {mode === 'encode' ? 'Text Input' : 'Base64 Input'}
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Paste Base64 to decode...'}
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                                    '& .MuiInputBase-input': { fontFamily: 'monospace', height: '100% !important', overflowY: 'auto !important' },
                                }}
                            />
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleProcess}
                                disabled={!input.trim() || loading}
                                sx={{ mt: 1.5, flexShrink: 0 }}
                            >
                                {loading ? 'Processing...' : mode === 'encode' ? 'Encode →' : 'Decode →'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card sx={{ flex: 1, minWidth: { xs: '100%', md: 0 }, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexShrink: 0 }}>
                                <Typography variant="subtitle2">Output</Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button size="small" startIcon={<SwapHoriz />} onClick={handleSwap} disabled={!output}>
                                        Swap
                                    </Button>
                                    <Button size="small" startIcon={<ContentCopy />} onClick={handleCopy} disabled={!output}>
                                        Copy
                                    </Button>
                                </Stack>
                            </Box>
                            <TextField
                                fullWidth
                                multiline
                                value={output}
                                InputProps={{ readOnly: true }}
                                placeholder="Result will appear here..."
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                                    '& .MuiInputBase-input': { fontFamily: 'monospace', height: '100% !important', overflowY: 'auto !important' },
                                }}
                            />
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </ServicePageShell>
    );
};

export default Base64Tool;
