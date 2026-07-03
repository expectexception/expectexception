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
