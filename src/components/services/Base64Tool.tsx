import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, Alert, TextField,
    ToggleButton, ToggleButtonGroup, Stack
} from '@mui/material';
import { Code, ContentCopy, SwapHoriz, CloudUpload } from '@mui/icons-material';
import Seo from '../seo/Seo';
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
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Seo
                title="Base64 Encoder & Decoder - Online Text & File Converter"
                description="Encode strings or files to Base64 format and decode them back to original form instantly. Fast, secure, and easy to use."
                keywords={['base64 encoder', 'base64 decoder', 'online converter', 'binary to base64', 'text to base64', 'developer tools', 'online base64 tool', 'base64 to binary', 'developer encoding tool', 'base64 tool']}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Base64 Encoder/Decoder
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Encode text to Base64 or decode Base64 to text
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(_, v) => v && setMode(v)}
                    color="primary"
                >
                    <ToggleButton value="encode">Encode</ToggleButton>
                    <ToggleButton value="decode">Decode</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Card sx={{ flex: 1, minWidth: 300 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            {mode === 'encode' ? 'Text Input' : 'Base64 Input'}
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={12}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Paste Base64 to decode...'}
                            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleProcess}
                            disabled={!input.trim() || loading}
                            sx={{ mt: 2, py: 1.5 }}
                        >
                            {loading ? 'Processing...' : mode === 'encode' ? 'Encode →' : 'Decode →'}
                        </Button>
                    </CardContent>
                </Card>

                <Card sx={{ flex: 1, minWidth: 300 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6">Output</Typography>
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
                            rows={12}
                            value={output}
                            InputProps={{ readOnly: true }}
                            placeholder="Result will appear here..."
                            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                        />
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default Base64Tool;
