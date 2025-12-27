import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, TextField,
    FormControl, InputLabel, Select, MenuItem, Stack, Chip
} from '@mui/material';
import { Tag, ContentCopy, CloudUpload } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const HashGenerator: React.FC = () => {
    const [input, setInput] = useState('');
    const [algorithm, setAlgorithm] = useState('sha256');
    const [result, setResult] = useState<{ hash: string; algorithm: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const algorithms = ['md5', 'sha1', 'sha256', 'sha512'];

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setLoading(true);

        try {
            const response = await apiClient.post(endpoints.services.hashGenerator, {
                text: input,
                algorithm,
            });
            setResult(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (result?.hash) navigator.clipboard.writeText(result.hash);
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Seo
                title="Secure Hash Generator - MD5, SHA-1, SHA-256, SHA-512"
                toolId={20}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Hash Generator
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Generate MD5, SHA-1, SHA-256, SHA-512 hashes
            </Typography>

            <Card>
                <CardContent sx={{ p: 4 }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        label="Text to hash"
                        placeholder="Enter text to generate hash..."
                        sx={{ mb: 3 }}
                    />

                    <FormControl fullWidth sx={{ mb: 3 }}>
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
                        sx={{ py: 1.5, mb: 3 }}
                    >
                        {loading ? 'Generating...' : 'Generate Hash'}
                    </Button>

                    {result && (
                        <Box sx={{ bgcolor: 'grey.100', p: 3, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Chip label={result.algorithm} size="small" color="primary" />
                                <Button size="small" startIcon={<ContentCopy />} onClick={handleCopy}>Copy</Button>
                            </Box>
                            <Typography
                                sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    wordBreak: 'break-all',
                                    bgcolor: 'white',
                                    p: 2,
                                    borderRadius: 1,
                                }}
                            >
                                {result.hash}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default HashGenerator;
