import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, Alert, LinearProgress, alpha
} from '@mui/material';
import { Image, CloudUpload, Download, AutoFixHigh } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const BackgroundRemover: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ file_url: string } | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
            setError(null);
            setResult(null);
        }
    };

    const handleRemove = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await apiClient.post(endpoints.services.backgroundRemove, formData);
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to remove background');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Seo
                title="AI Background Remover - Transparent Images in Seconds"
                description="Remove backgrounds from images automatically using AI. Get high-quality transparent PNGs instantly for free."
                keywords={['remove background ai', 'transparent background maker', 'bg remover', 'automatic background removal', 'free online background remover', 'online background remover', 'free background removal tool', 'image editing', 'ai image processing']}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Background Remover
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Remove backgrounds from images with AI
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Card>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* Original */}
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Typography variant="subtitle2" gutterBottom>Original</Typography>
                            <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 3, textAlign: 'center', minHeight: 200 }}>
                                <input accept="image/*" style={{ display: 'none' }} id="image-upload" type="file" onChange={handleFileSelect} />
                                <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                                    {preview ? (
                                        <Box component="img" src={preview} sx={{ maxWidth: '100%', maxHeight: 250, borderRadius: 2 }} />
                                    ) : (
                                        <>
                                            <CloudUpload sx={{ fontSize: 48, color: 'primary.main' }} />
                                            <Typography>Upload image</Typography>
                                        </>
                                    )}
                                </label>
                            </Box>
                        </Box>

                        {/* Result */}
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Typography variant="subtitle2" gutterBottom>Result</Typography>
                            <Box sx={{
                                border: '2px dashed',
                                borderColor: result ? 'success.main' : 'divider',
                                borderRadius: 3,
                                p: 3,
                                textAlign: 'center',
                                minHeight: 200,
                                background: result ? 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 50% / 20px 20px' : undefined
                            }}>
                                {result ? (
                                    <Box component="img" src={result.file_url} sx={{ maxWidth: '100%', maxHeight: 250, borderRadius: 2 }} />
                                ) : (
                                    <Typography color="text.secondary" sx={{ pt: 8 }}>Result will appear here</Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    {loading && <LinearProgress sx={{ mt: 3 }} />}

                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleRemove}
                            disabled={!file || loading}
                            startIcon={<AutoFixHigh />}
                            sx={{ py: 1.5 }}
                        >
                            {loading ? 'Processing...' : 'Remove Background'}
                        </Button>
                        {result && (
                            <Button
                                variant="outlined"
                                size="large"
                                href={result.file_url}
                                target="_blank"
                                startIcon={<Download />}
                                sx={{ py: 1.5 }}
                            >
                                Download
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default BackgroundRemover;
