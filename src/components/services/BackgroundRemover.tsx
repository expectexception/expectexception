import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, Alert, LinearProgress, useTheme
} from '@mui/material';
import { AutoFixHigh, CloudUpload, Download } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';
import ServicePageShell from './ServicePageShell';

const BackgroundRemover: React.FC = () => {
    const theme = useTheme();
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
            const data = response.data;
            if (data.file_url && !data.file_url.startsWith('http')) {
                data.file_url = `${API_BASE_URL}${data.file_url}`;
            }
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to remove background');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ServicePageShell
            icon={AutoFixHigh}
            title="Background Remover"
            subtitle="Remove backgrounds from images with AI"
            maxWidth="md"
            about="Background Remover strips the background out of a photo and returns a PNG with a transparent backdrop, using rembg (a U2-Net image-segmentation model) that runs on our server — nothing is processed in your browser. To keep processing fast, uploads are automatically downscaled to a maximum of 2048px on the longest side before the model runs, so very large source photos come back at a lower resolution than the original. It works best on photos with a clear subject against a reasonably distinct background (product shots, portraits, logos) rather than busy scenes with fine detail like loose hair or fur."
            howToSteps={[
                { name: 'Upload a photo', text: 'Click the Upload image box on the left and choose a JPEG, PNG, GIF, or BMP file from your device.' },
                { name: 'Remove the background', text: 'Click Remove Background to send the image to our server, where the AI model cuts out the subject and returns a transparent PNG.' },
                { name: 'Check the result', text: "Compare the transparent result against the checkerboard preview on the right to confirm the cutout looks right." },
                { name: 'Download', text: "Click Download to save the transparent PNG once you're happy with the result." },
            ]}
            faq={[
                { question: 'What image formats can I upload?', answer: "JPEG, PNG, GIF, and BMP are all accepted. The result is always returned as a transparent PNG, since this page doesn't expose the backend's JPG-with-white-background output option." },
                { question: 'Will the removal be perfect on complex images?', answer: 'Accuracy depends on how distinct the subject is from the background — clean product shots and portraits work best. Fine detail like flyaway hair or semi-transparent objects (glass, smoke) can show visible edge artifacts.' },
                { question: 'Is there a size or resolution limit?', answer: "There's no hard upload cap in the UI, but images are automatically downscaled to at most 2048px on the longest side before processing, so extremely high-resolution photos come back smaller than the original." },
                { question: 'Are my uploaded photos stored or shared?', answer: "Your photo is uploaded to our server to run the background-removal model, and the processed result is kept there temporarily so you can download it. We don't use it for anything else, and no account is required." },
            ]}
        >
            <Seo title="AI Background Remover - Transparent Images in Seconds" toolId={6} />

            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', flex: 1, minHeight: 0 }}>
                        {/* Original */}
                        <Box sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle2" gutterBottom>Original</Typography>
                            <Box sx={{
                                border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 2,
                                textAlign: 'center', flex: 1, minHeight: 160, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <input accept="image/*" style={{ display: 'none' }} id="bg-remove-upload" type="file" onChange={handleFileSelect} />
                                <label htmlFor="bg-remove-upload" style={{ cursor: 'pointer' }}>
                                    {preview ? (
                                        <Box component="img" src={preview} sx={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 2 }} />
                                    ) : (
                                        <>
                                            <CloudUpload sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                                            <Typography>Upload image</Typography>
                                        </>
                                    )}
                                </label>
                            </Box>
                        </Box>

                        {/* Result */}
                        <Box sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle2" gutterBottom>Result</Typography>
                            <Box sx={{
                                border: '2px dashed',
                                borderColor: result ? 'success.main' : 'divider',
                                borderRadius: 3,
                                p: 2,
                                textAlign: 'center',
                                flex: 1,
                                minHeight: 160,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: result ? 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 50% / 20px 20px' : undefined
                            }}>
                                {result ? (
                                    <Box component="img" src={result.file_url} sx={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 2 }} />
                                ) : (
                                    <Typography color="text.secondary">Result will appear here</Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    {loading && <LinearProgress sx={{ mt: 2 }} />}

                    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexShrink: 0 }}>
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleRemove}
                            disabled={!file || loading}
                            startIcon={<AutoFixHigh />}
                            sx={{ py: 1.25 }}
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
                                sx={{ py: 1.25 }}
                            >
                                Download
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default BackgroundRemover;
