import React, { useState, useEffect } from 'react';
import {
    Container,
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
} from '@mui/material';
import { CloudUpload, Compress, Download } from '@mui/icons-material';
import Seo from '../components/seo/Seo';
import apiClient, { API_BASE_URL } from '../api/config';
import { endpoints } from '../api/endpoints';
import ServicePageHero from '../components/services/ServicePageHero';

const ImageCompressorPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [quality, setQuality] = useState(80);
    const [format, setFormat] = useState('WEBP');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
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
            const response = await apiClient.post(endpoints.services.imageCompressor, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

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
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo
                title="Online Image Compressor - Reduce Image Size Free"
                toolId={11}
            />
            <ServicePageHero
                icon={Compress}
                title="Image Compressor"
                subtitle="Reduce the file size of your JPEG, PNG, and WEBP images while maintaining high visual quality."
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3
            }}>
                <CardContent sx={{ p: 1 }}>
                    {error && (
                        <Alert severity="error" variant="filled" sx={{ mb: 4, borderRadius: '12px' }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <Box
                        sx={{
                            border: '2px dashed rgba(255, 255, 255, 0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.01)',
                            borderRadius: '16px',
                            p: 5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            mb: 4,
                            '&:hover': {
                                borderColor: '#3dfc55',
                                backgroundColor: 'rgba(61, 252, 85, 0.02)',
                                boxShadow: '0 0 20px rgba(61, 252, 85, 0.05)'
                            }
                        }}
                        component="label"
                    >
                        <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                        <CloudUpload sx={{ fontSize: 54, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                            {file ? file.name : 'Click to upload or drag and drop'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Supported: JPEG, PNG, WEBP
                        </Typography>
                    </Box>

                    <Grid container spacing={4} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={6}>
                            <Typography gutterBottom sx={{ fontWeight: 600, mb: 2 }}>Quality: {quality}%</Typography>
                            <Slider
                                value={quality}
                                onChange={(_, v) => setQuality(v as number)}
                                min={10}
                                max={100}
                                valueLabelDisplay="auto"
                                sx={{
                                    color: '#3dfc55',
                                    '& .MuiSlider-thumb': {
                                        '&:hover, &.Mui-focusVisible': {
                                            boxShadow: '0px 0px 0px 8px rgba(61, 252, 85, 0.16)',
                                        },
                                        '&.Mui-active': {
                                            boxShadow: '0px 0px 0px 14px rgba(61, 252, 85, 0.16)',
                                        },
                                    },
                                }}
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
                                py: 1.5,
                                borderRadius: '10px',
                                fontWeight: 700
                            }}
                        >
                            {loading ? 'Compressing...' : 'Compress Image'}
                        </Button>
                    </Box>

                    {file && estimatedSize !== null && (
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                Estimated Output: <strong style={{ color: '#3dfc55' }}>{formatBytes(estimatedSize)}</strong> — original {formatBytes(file.size)}
                            </Typography>
                        </Box>
                    )}

                    {result && (
                        <Box sx={{
                            mt: 5,
                            p: 3,
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px'
                        }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, mb: 3 }}>Compression Result</Typography>

                            <Grid container spacing={4} alignItems="center">
                                <Grid item xs={12} md={4}>
                                    <Box
                                        component="img"
                                        src={result.full_url}
                                        sx={{
                                            width: '100%',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                                        }}
                                        alt="Compressed"
                                    />
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    <Stack spacing={2.5}>
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
                                                mt: 1.5,
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
        </Container>
    );
};

export default ImageCompressorPage;
