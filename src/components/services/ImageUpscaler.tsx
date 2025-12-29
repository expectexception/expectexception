import React, { useState, useCallback, useEffect } from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    Stack,
    Alert,
    LinearProgress,
    Slider,
    FormControlLabel,
    Switch,
    Chip,
    alpha,
} from '@mui/material';
import {
    AutoFixHigh,
    ZoomOutMap,
    Download,
    CloudUpload,
    CheckCircle,
    Error as ErrorIcon,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

interface UpscaleResult {
    success: boolean;
    file_url: string;
    filename: string;
    scale: number;
    original_size: string;
    upscaled_size: string;
    output_format: string;
    adjustments: {
        sharpness: number;
        denoise: boolean;
        boost_color: boolean;
    };
}

const ImageUpscaler: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [scale, setScale] = useState(2);
    const [sharpness, setSharpness] = useState(1.2);
    const [denoise, setDenoise] = useState(true);
    const [boostColor, setBoostColor] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<UpscaleResult | null>(null);
    const [open, setOpen] = useState(false);
    const deferredPrompt: any = null; // Replace with actual deferredPrompt logic













































































































































































































































































































    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setResult(null);
        setError(null);
    };

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            const dropped = event.dataTransfer.files[0];
            setFile(dropped);
            setPreview(URL.createObjectURL(dropped));
            setResult(null);
            setError(null);
        }
    }, []);

    const handleDrag = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    const handleProcess = async () => {
        if (!file) {
            setError('Please choose an image to upscale.');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('scale', scale.toString());
        formData.append('sharpness', sharpness.toString());
        formData.append('denoise', denoise.toString());
        formData.append('boost_color', boostColor.toString());

        setLoading(true);
        setError(null);
        setResult(null);
        setProgress(15);

        try {
            const progressInterval = setInterval(() => {
                setProgress((prev) => (prev >= 90 ? 90 : prev + 5));
            }, 300);

            const response = await apiClient.post(endpoints.services.imageUpscale, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            clearInterval(progressInterval);
            setProgress(100);

            const data = response.data as UpscaleResult;
            if (data.file_url && !data.file_url.startsWith('http')) {
                data.file_url = `${API_BASE_URL}${data.file_url}`;
            }
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Upscale failed. Please try again.');
        } finally {
            setLoading(false);
            setTimeout(() => setProgress(0), 600);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setProgress(0);
        setError(null);
    };

    useEffect(() => {
        if (!deferredPrompt) {
            setOpen(false);
            return;
        }

        const cooldownMs = 86400000;
        const last = Number(localStorage.getItem('pwaPromptLastDismissed') || 0);
        if (Date.now() - last < cooldownMs) return;

        const timer = setTimeout(() => setOpen(true), 2000);
        return () => clearTimeout(timer);
    }, [deferredPrompt]);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Seo
                title="AI Image Upscaler - Enhance & Enlarge Photos Online"
                description="Upscale low-resolution photos up to 4× while smoothing noise and sharpening fine details."
                toolId={24}
            />

            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                AI Image Upscaler & Enhancer
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Enlarge images up to 4× with clarity boosts, noise reduction, and smart color preservation.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorIcon />} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {result && (
                <Alert
                    severity="success"
                    sx={{ mb: 3 }}
                    icon={<CheckCircle />}
                    action={
                        <Button size="small" color="inherit" startIcon={<Download />} href={result.file_url} target="_blank">
                            Download
                        </Button>
                    }
                >
                    Upscaled from {result.original_size} to {result.upscaled_size} at {result.scale.toFixed(1)}×
                </Alert>
            )}

            <Grid container spacing={4}>
                <Grid item xs={12} md={7}>
                    <Card>
                        <CardContent sx={{ p: 4 }}>
                            <Box
                                onDrop={handleDrop}
                                onDragOver={handleDrag}
                                onDragEnter={handleDrag}
                                sx={{
                                    border: '2px dashed',
                                    borderColor: preview ? 'success.light' : 'divider',
                                    borderRadius: 3,
                                    p: 4,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    bgcolor: preview ? alpha('#22c55e', 0.06) : alpha('#3b82f6', 0.03),
                                }}
                            >
                                <input
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    id="upscale-upload"
                                    type="file"
                                    onChange={handleFileSelect}
                                />
                                <label htmlFor="upscale-upload" style={{ display: 'block', cursor: 'pointer' }}>
                                    {preview ? (
                                        <Box component="img" src={preview} alt="preview" sx={{ maxHeight: 320, maxWidth: '100%', borderRadius: 2 }} />
                                    ) : (
                                        <>
                                            <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                Drop an image or click to upload
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Supports PNG, JPG, and WEBP up to 25MB
                                            </Typography>
                                        </>
                                    )}
                                </label>
                            </Box>

                            {loading && (
                                <Box sx={{ mt: 3 }}>
                                    <LinearProgress variant="determinate" value={progress} />
                                    <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 1 }}>
                                        Enhancing... {progress}%
                                    </Typography>
                                </Box>
                            )}

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    startIcon={<AutoFixHigh />}
                                    onClick={handleProcess}
                                    disabled={!file || loading}
                                >
                                    {loading ? 'Enhancing...' : 'Upscale Image'}
                                </Button>
                                <Button fullWidth variant="outlined" color="inherit" disabled={loading && !!file} onClick={handleReset}>
                                    Reset
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                                Enhancement Settings
                            </Typography>

                            <Box sx={{ mb: 4 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Scale ({scale}×)
                                </Typography>
                                <Slider
                                    value={scale}
                                    min={1}
                                    max={4}
                                    step={0.5}
                                    onChange={(_, value) => setScale(value as number)}
                                    valueLabelDisplay="auto"
                                />
                            </Box>

                            <Box sx={{ mb: 4 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Sharpness Boost ({sharpness.toFixed(2)}×)
                                </Typography>
                                <Slider
                                    value={sharpness}
                                    min={0.5}
                                    max={2.5}
                                    step={0.1}
                                    onChange={(_, value) => setSharpness(value as number)}
                                    valueLabelDisplay="auto"
                                />
                            </Box>

                            <FormControlLabel
                                control={<Switch checked={denoise} onChange={(_, checked) => setDenoise(checked)} />}
                                label="Smooth noise & artifacts"
                            />
                            <FormControlLabel
                                control={<Switch checked={boostColor} onChange={(_, checked) => setBoostColor(checked)} />}
                                label="Gently boost color vibrance"
                            />

                            <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
                                <Chip icon={<ZoomOutMap />} label="Up to 4×" />
                                <Chip icon={<AutoFixHigh />} label="Smart sharpening" />
                                <Chip icon={<Download />} label="High-quality PNG/JPG" />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default ImageUpscaler;






















































































































































































































