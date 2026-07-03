import React, { useState, useEffect } from 'react';
import {
    Typography,
    Box,
    Card,
    CardContent,
    Button,
    Alert,
    CircularProgress,
    Stack,
    Slider,
    MenuItem,
    TextField,
    Grid,
    Chip,
    useTheme,
    alpha,
} from '@mui/material';
import { CloudUpload, Compress, Download } from '@mui/icons-material';
import Seo from '../components/seo/Seo';
import apiClient, { API_BASE_URL } from '../api/config';
import { endpoints } from '../api/endpoints';
import ServicePageShell from '../components/services/ServicePageShell';

interface CompressionResult {
    full_url: string;
    original_size: number;
    compressed_size: number;
    filename: string;
}

const ImageCompressorPage: React.FC = () => {
    const theme = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [quality, setQuality] = useState(80);
    const [format, setFormat] = useState('WEBP');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CompressionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [estimatedSize, setEstimatedSize] = useState<number | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

    useEffect(() => {
        if (!file) {
            setEstimatedSize(null);
            return;
        }

        const orig = file.size || 0;
        const baseFactor: Record<string, number> = { WEBP: 0.6, JPEG: 0.9, PNG: 1.2 };
        const bf = baseFactor[format] ?? 0.9;
        const factor = Math.max(0.05, bf * (quality / 100));
        const estimate = Math.round(orig * factor);
        setEstimatedSize(estimate);
    }, [file, quality, format]);

    const handleCompress = async () => {
        if (!file) {
            setError('Please select an image');
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('quality', quality.toString());
        formData.append('format', format);

        try {
            const response = await apiClient.post(endpoints.services.imageCompressor, formData);

            const url = response.data.image_url.startsWith('http')
                ? response.data.image_url
                : `${API_BASE_URL}${response.data.image_url}`;

            setResult({ ...response.data, full_url: url });
        } catch (err: any) {
            console.error('Compression Error:', err);
            setError(err.response?.data?.error || 'Failed to compress image');
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <ServicePageShell
            icon={Compress}
            title="Image Compressor"
            subtitle="Reduce the file size of your JPEG, PNG, and WEBP images while maintaining high visual quality."
        >
            <Seo
                title="Online Image Compressor - Reduce Image Size Free"
                toolId={11}
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: { xs: 2, sm: 3 },
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
            }}>
                <CardContent sx={{ p: 1 }}>
                    {error && (
                        <Alert severity="error" variant="filled" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <Box
                        sx={{
                            border: '2px dashed rgba(255, 255, 255, 0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.01)',
                            borderRadius: '16px',
                            p: { xs: 3, sm: 4 },
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            mb: 3,
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                                boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.05)}`
                            }
                        }}
                        component="label"
                    >
                        <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                            {file ? file.name : 'Click to upload or drag and drop'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Supported: JPEG, PNG, WEBP
                        </Typography>
                    </Box>

                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Typography gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>Quality: {quality}%</Typography>
                            <Slider
                                value={quality}
                                onChange={(_, v) => setQuality(v as number)}
                                min={10}
                                max={100}
                                valueLabelDisplay="auto"
                                color="primary"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                select
                                fullWidth
                                label="Output Format"
                                value={format}
                                onChange={(e) => setFormat(e.target.value)}
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '10px',
                                    }
                                }}
                            >
                                <MenuItem value="WEBP">WEBP (Recommended)</MenuItem>
                                <MenuItem value="JPEG">JPEG</MenuItem>
                                <MenuItem value="PNG">PNG</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>

                    <Box sx={{ textAlign: 'center', mb: 1 }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleCompress}
                            disabled={loading || !file}
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Compress />}
                            sx={{
                                px: 6,
                                py: 1.25,
                                borderRadius: '10px',
                                fontWeight: 700
                            }}
                        >
                            {loading ? 'Compressing...' : 'Compress Image'}
                        </Button>
                    </Box>

                    {file && estimatedSize !== null && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                Estimated Output: <strong style={{ color: theme.palette.primary.main }}>{formatBytes(estimatedSize)}</strong> — original {formatBytes(file.size)}
                            </Typography>
                        </Box>
                    )}

                    {result && (
                        <Box sx={{
                            mt: 3,
                            p: 2.5,
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px'
                        }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, mb: 2 }}>Compression Result</Typography>

                            <Grid container spacing={3} alignItems="center">
                                <Grid item xs={12} md={4}>
                                    <Box
                                        component="img"
                                        src={result.full_url}
                                        sx={{
                                            width: '100%',
                                            maxHeight: 180,
                                            objectFit: 'contain',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                                        }}
                                        alt="Compressed"
                                    />
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    <Stack spacing={1.5}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">Original Size</Typography>
                                            <Typography variant="body1" fontWeight="600">{formatBytes(result.original_size)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">Compressed Size</Typography>
                                            <Typography variant="body1" fontWeight="800" color="success.main">
                                                {formatBytes(result.compressed_size)}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">Reduction</Typography>
                                            <Chip
                                                label={`-${((1 - result.compressed_size / result.original_size) * 100).toFixed(1)}%`}
                                                color="success"
                                                size="small"
                                                sx={{ fontWeight: 700, px: 1 }}
                                            />
                                        </Box>

                                        <Button
                                            variant="outlined"
                                            startIcon={<Download />}
                                            href={result.full_url}
                                            download={`compressed_${result.filename}`}
                                            sx={{
                                                mt: 1,
                                                py: 1,
                                                borderRadius: '10px'
                                            }}
                                        >
                                            Download Image
                                        </Button>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ImageCompressorPage;
