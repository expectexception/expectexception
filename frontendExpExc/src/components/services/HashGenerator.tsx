import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, TextField,
    FormControl, InputLabel, Select, MenuItem, Chip,
} from '@mui/material';
import { Tag, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const HashGenerator: React.FC = () => {
    const [input, setInput] = useState('');
    const [algorithm, setAlgorithm] = useState('sha256');
    const [result, setResult] = useState<{ hash: string; algorithm: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const algorithms = ['md5', 'sha1', 'sha256', 'sha512'];

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.post(endpoints.services.hashGenerator, {
                text: input,
                algorithm,
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Hash generation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (result?.hash) navigator.clipboard.writeText(result.hash);
    };

    return (
        <ServicePageShell
            icon={Tag}
            title="Hash Generator"
            subtitle="Generate MD5, SHA-1, SHA-256, SHA-512 hashes"
            about="Computes a cryptographic hash (checksum/digest) of any text you enter, in MD5, SHA-1, SHA-256, or SHA-512. Your text and chosen algorithm are sent to a backend endpoint that runs the actual hashing and returns the hex digest, shown with a one-click copy button. Handy for verifying file/text integrity, generating checksums, or confirming two pieces of text are byte-for-byte identical without eyeballing them."
            howToSteps={[
                { name: 'Enter your text', text: 'Type or paste the text you want to hash into the Text to hash field.' },
                { name: 'Pick an algorithm', text: 'Choose MD5, SHA-1, SHA-256, or SHA-512 from the Algorithm dropdown.' },
                { name: 'Generate the hash', text: 'Click Generate Hash to send the request and compute the digest.' },
                { name: 'Copy the result', text: 'Use the Copy button next to the algorithm chip to copy the resulting hex digest to your clipboard.' },
            ]}
            faq={[
                { question: 'Is MD5 or SHA-1 secure?', answer: "No — both are cryptographically broken for security purposes (practical collision attacks exist for each). They're included for compatibility with legacy systems or non-security checksums, not for anything where collision resistance matters." },
                { question: 'Should I use this to hash passwords?', answer: "No. None of these algorithms are designed for password storage — they're fast, general-purpose digest functions, which makes them easy to brute-force. Password storage needs a slow, salted algorithm like bcrypt, scrypt, or Argon2, which this tool doesn't provide." },
                { question: 'Is the text I hash sent anywhere?', answer: "Yes — hashing happens on the server: your text and chosen algorithm are sent to a backend API to compute the digest, so avoid pasting secrets you don't want leaving your browser." },
                { question: 'Which algorithm should I use for integrity checks?', answer: 'SHA-256 is the modern default for checksums (what git and most package managers use today). SHA-512 gives a larger digest if you want one; MD5/SHA-1 are mainly useful for matching against old, existing hashes.' },
            ]}
        >
            <Seo
                title="Secure Hash Generator - MD5, SHA-1, SHA-256, SHA-512"
                toolId={20}
            />

            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <CardContent sx={{ p: 3 }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={5}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        label="Text to hash"
                        placeholder="Enter text to generate hash..."
                        sx={{ mb: 2 }}
                    />

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Algorithm</InputLabel>
                        <Select value={algorithm} label="Algorithm" onChange={(e) => setAlgorithm(e.target.value)}>
                            {algorithms.map(a => (
                                <MenuItem key={a} value={a}>{a.toUpperCase()}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleGenerate}
                        disabled={!input.trim() || loading}
                        startIcon={<Tag />}
                        sx={{ py: 1.25, mb: 2 }}
                    >
                        {loading ? 'Generating...' : 'Generate Hash'}
                    </Button>

                    {error && (
                        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}

                    {result && (
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.04)', p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Chip label={result.algorithm} size="small" color="primary" />
                                <Button size="small" startIcon={<ContentCopy />} onClick={handleCopy}>Copy</Button>
                            </Box>
                            <Typography
                                sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    wordBreak: 'break-all',
                                    bgcolor: 'rgba(0,0,0,0.3)',
                                    p: 1.5,
                                    borderRadius: 1,
                                }}
                            >
                                {result.hash}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default HashGenerator;
