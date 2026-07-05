import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    TextField, FormControlLabel, Switch, Grid, useTheme
} from '@mui/material';
import { AspectRatio as AspectRatioIcon, CloudUpload, Download } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';
import ServicePageShell from './ServicePageShell';

const ImageResizer: React.FC = () => {
    const theme = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [maintainAspect, setMaintainAspect] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ file_url: string; original_size: string; new_size: string } | null>(null);
    const [originalWidth, setOriginalWidth] = useState<number | null>(null);
    const [originalHeight, setOriginalHeight] = useState<number | null>(null);
    const [originalSize, setOriginalSize] = useState<number | null>(null);
    const [estimatedSize, setEstimatedSize] = useState<number | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
            setError(null);
            setResult(null);
            setOriginalSize(f.size);

            const img = new window.Image();
            img.onload = () => {
                setOriginalWidth(img.naturalWidth);
                setOriginalHeight(img.naturalHeight);
            };
            img.src = URL.createObjectURL(f);
        }
    };

    useEffect(() => {
        if (!file || !originalWidth || !originalHeight || !originalSize) {
            setEstimatedSize(null);
            return;
        }

        const ow = originalWidth;
        const oh = originalHeight;

        let nw = width ? Number(width) : ow;
        let nh = height ? Number(height) : oh;

        if (maintainAspect) {
            if (width && !height) {
                nh = Math.round((Number(width) / ow) * oh);
            } else if (!width && height) {
                nw = Math.round((Number(height) / oh) * ow);
            }
        }

        if (!nw || !nh) {
            setEstimatedSize(null);
            return;
        }

        const scale = (nw * nh) / (ow * oh);
        const estimate = Math.max(50, Math.round(originalSize * scale));
        setEstimatedSize(estimate);
    }, [file, width, height, maintainAspect, originalWidth, originalHeight, originalSize]);

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleResize = async () => {
        if (!file || (!width && !height)) {
            setError('Please provide width or height');
            return;
        }
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);
        if (width) formData.append('width', width);
        if (height) formData.append('height', height);
        formData.append('maintain_aspect', maintainAspect.toString());

        try {
            const response = await apiClient.post(endpoints.services.imageResize, formData);
            const data = response.data;
            if (data.file_url && !data.file_url.startsWith('http')) {
                data.file_url = `${API_BASE_URL}${data.file_url}`;
            }
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Resize failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ServicePageShell
            icon={AspectRatioIcon}
            title="Image Resizer"
            subtitle="Resize images to custom dimensions"
            maxWidth="md"
            about="Image Resizer sends your image to the server, where Pillow resizes it with high-quality Lanczos resampling. Enter just a width or just a height with Maintain aspect ratio on and the other dimension is calculated automatically; enter both to fit the image within that box while keeping its proportions, or turn the toggle off to stretch to exact dimensions. The estimated file size shown before you click Resize Image is a rough client-side approximation based on the change in pixel area — the real output size (shown after resizing) can differ, especially for photos with a lot of fine detail."
            howToSteps={[
                { name: 'Upload an image', text: 'Click the upload box and select the image you want to resize.' },
                { name: 'Enter dimensions', text: 'Type a new Width (px) and/or Height (px) — leave one blank to have it calculated automatically.' },
                { name: 'Choose aspect ratio behavior', text: 'Leave Maintain aspect ratio on to preserve proportions, or turn it off to stretch to the exact width and height you entered.' },
                { name: 'Resize', text: 'Click Resize Image to process it on the server.' },
                { name: 'Download', text: 'Click Download in the success message to save the resized image.' },
            ]}
            faq={[
                { question: 'What happens if I only enter a width or only a height?', answer: "With Maintain aspect ratio on, the missing dimension is calculated automatically from the original image's proportions, so the picture never looks stretched." },
                { question: 'How accurate is the estimated file size?', answer: "It's a rough approximation calculated in your browser from how much the pixel area is shrinking or growing — the actual output size depends on image content and compression, and can differ from the estimate." },
                { question: 'Does resizing change the image format?', answer: "No — the output keeps the original file's format (or falls back to PNG if the format can't be determined)." },
                { question: 'Is there a maximum image size?', answer: 'There\'s no fixed limit enforced in this tool, though very large source images will naturally take longer to upload and process.' },
            ]}
        >
            <Seo title="Resize Images Online - Pixel & Percentage Scaler" toolId={12} />

            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {result && (
                        <Alert severity="success" sx={{ mb: 2 }} action={
                            <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                                Download
                            </Button>
                        }>Resized from {result.original_size} to {result.new_size}</Alert>
                    )}

                    <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 2.5, textAlign: 'center', mb: 2.5 }}>
                        <input accept="image/*" style={{ display: 'none' }} id="image-resize-upload" type="file" onChange={handleFileSelect} />
                        <label htmlFor="image-resize-upload" style={{ cursor: 'pointer' }}>
                            {preview ? (
                                <Box component="img" src={preview} sx={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 2 }} />
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                                    <Typography variant="h6">Upload image</Typography>
                                </>
                            )}
                        </label>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField fullWidth label="Width (px)" type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth label="Height (px)" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                        </Grid>
                    </Grid>

                    <FormControlLabel
                        control={<Switch checked={maintainAspect} onChange={(e) => setMaintainAspect(e.target.checked)} />}
                        label="Maintain aspect ratio"
                        sx={{ mt: 1.5 }}
                    />

                    {file && originalWidth && originalHeight && originalSize && estimatedSize !== null && (
                        <Box sx={{ mt: 1, mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                                Original: {originalWidth}×{originalHeight}, {formatBytes(originalSize)} — Estimated: <strong>{formatBytes(estimatedSize)}</strong>
                            </Typography>
                        </Box>
                    )}

                    {loading && <LinearProgress sx={{ mt: 2 }} />}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleResize}
                        disabled={!file || loading}
                        startIcon={<AspectRatioIcon />}
                        sx={{ mt: 2.5, py: 1.25 }}
                    >
                        {loading ? 'Resizing...' : 'Resize Image'}
                    </Button>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ImageResizer;
