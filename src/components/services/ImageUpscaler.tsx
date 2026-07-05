import React, { useState, useCallback } from 'react';
import {
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
    useTheme,
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
import ServicePageShell from './ServicePageShell';
import { useScrollToResult } from '../../hooks/useScrollToResult';

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
    const theme = useTheme();
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
    const resultRef = useScrollToResult(!!result);

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

    return (
        <ServicePageShell
            icon={AutoFixHigh}
            title="AI Image Upscaler & Enhancer"
            subtitle="Enlarge images up to 4x with clarity boosts, noise reduction, and smart color preservation."
            maxWidth="md"
            about="This tool enlarges an image by a chosen scale (1x–4x) and applies a set of enhancement filters on the server: Lanczos resampling for the resize itself, then optional noise smoothing, a sharpness boost, and a subtle color/contrast lift. It's classic image-processing rather than a neural super-resolution model — it makes existing detail look crisper at a larger size, but it can't invent detail that wasn't captured in the original photo, so results are best on modest scale factors and reasonably clean source images."
            howToSteps={[
                { name: 'Upload an image', text: 'Drop an image onto the upload area or click it to choose a PNG, JPG, or WEBP file (up to 25MB).' },
                { name: 'Set the scale', text: 'Drag the Scale slider to choose how much to enlarge the image, from 1x up to 4x.' },
                { name: 'Adjust enhancements', text: 'Tune the Sharpness Boost slider and toggle Smooth noise & artifacts / Gently boost color vibrance as needed.' },
                { name: 'Upscale', text: 'Click Upscale Image to process it on the server.' },
                { name: 'Download', text: 'Click Download in the success message to save the enlarged image.' },
            ]}
            faq={[
                { question: 'Is this an AI upscaler?', answer: "It uses high-quality Lanczos resampling plus sharpening, denoising, and color filters — not a deep-learning super-resolution model. It enhances existing detail rather than generating new detail that wasn't in the original." },
                { question: 'What is the maximum file size and scale?', answer: 'Uploads are capped at 25MB, and the scale slider goes up to 4x.' },
                { question: 'What image formats are supported?', answer: 'PNG, JPG, and WEBP are supported for upload; the output is PNG if the source has transparency, otherwise JPEG at quality 95.' },
                { question: 'Will this fix a blurry or low-resolution photo?', answer: "It can make a photo look sharper and larger, but it can't recover detail that was never captured — very blurry or heavily compressed source images will still look soft after upscaling." },
            ]}
        >
            <Seo
                title="AI Image Upscaler - Enhance & Enlarge Photos Online"
                description="Upscale low-resolution photos up to 4x while smoothing noise and sharpening fine details."
                toolId={24}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} icon={<ErrorIcon />} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {result && (
                <Alert
                    ref={resultRef}
                    severity="success"
                    sx={{ mb: 2, flexShrink: 0 }}
                    icon={<CheckCircle />}
                    action={
                        <Button size="small" color="inherit" startIcon={<Download />} href={result.file_url} target="_blank">
                            Download
                        </Button>
                    }
                >
                    Upscaled from {result.original_size} to {result.upscaled_size} at {result.scale.toFixed(1)}x
                </Alert>
            )}

            <Grid container spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
                <Grid item xs={12} md={7} sx={{ display: 'flex' }}>
                    <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Box
                                onDrop={handleDrop}
                                onDragOver={handleDrag}
                                onDragEnter={handleDrag}
                                sx={{
                                    border: '2px dashed',
                                    borderColor: preview ? 'success.light' : 'divider',
                                    borderRadius: 3,
                                    p: 2.5,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    bgcolor: preview ? alpha(theme.palette.success.main, 0.06) : alpha(theme.palette.primary.main, 0.03),
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
                                        <Box component="img" src={preview} alt="preview" sx={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain', borderRadius: 2 }} />
                                    ) : (
                                        <>
                                            <CloudUpload sx={{ fontSize: 56, color: theme.palette.primary.main, mb: 1.5 }} />
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
                                <Box sx={{ mt: 2.5 }}>
                                    <LinearProgress variant="determinate" value={progress} />
                                    <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 1 }}>
                                        Enhancing... {progress}%
                                    </Typography>
                                </Box>
                            )}

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2.5 }}>
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

                <Grid item xs={12} md={5} sx={{ display: 'flex' }}>
                    <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
                                Enhancement Settings
                            </Typography>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Scale ({scale}x)
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

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Sharpness Boost ({sharpness.toFixed(2)}x)
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

                            <Stack direction="row" spacing={1} sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1 }}>
                                <Chip icon={<ZoomOutMap />} label="Up to 4x" />
                                <Chip icon={<AutoFixHigh />} label="Smart sharpening" />
                                <Chip icon={<Download />} label="High-quality PNG/JPG" />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default ImageUpscaler;
