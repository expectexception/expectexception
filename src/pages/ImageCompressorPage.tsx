import React, { useState } from 'react';
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

const ImageCompressorPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [quality, setQuality] = useState(80);
    const [format, setFormat] = useState('WEBP');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

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
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Seo
                title="Online Image Compressor - Reduce Image Size Free"
                description="Compress JPEG/PNG/WEBP images online with controlled quality. Reduce file size for faster websites without losing visual quality."
                keywords={[
                    'image compressor',
                    'reduce image size online',
                    'compress jpeg free',
                    'png compressor online',
                    'webp converter and compressor',
                    'optimize images for web',
                    'shrink image file size',
                    'high quality image compression',
                    'free online photo resizer',
                    'batch image optimizer'
                ]}
            />
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 800, textAlign: 'center', mb: 4 }}>
                Image Compressor
            </Typography>

            <Card sx={{ bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 4 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 6,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: 'action.hover',
                            mb: 4,
                            '&:hover': { borderColor: 'primary.main' }
                        }}
                        component="label"
                    >
                        <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                        <CloudUpload sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            {file ? file.name : 'Click to upload or drag and drop'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Supported: JPEG, PNG, WEBP
                        </Typography>
                    </Box>

                    <Grid container spacing={4} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={6}>
                            <Typography gutterBottom>Quality: {quality}%</Typography>
                            <Slider
                                value={quality}
                                onChange={(_, v) => setQuality(v as number)}
                                min={10}
                                max={100}
                                valueLabelDisplay="auto"
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
                            >
                                <MenuItem value="WEBP">WEBP (Recommended)</MenuItem>
                                <MenuItem value="JPEG">JPEG</MenuItem>
                                <MenuItem value="PNG">PNG</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>

                    <Box sx={{ textAlign: 'center' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleCompress}
                            disabled={loading || !file}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Compress />}
                            sx={{ px: 6 }}
                        >
                            {loading ? 'Compressing...' : 'Compress Image'}
                        </Button>
                    </Box>

                    {result && (
                        <Box sx={{ mt: 6, p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Typography variant="h6" gutterBottom>Compression Result</Typography>

                            <Grid container spacing={4} alignItems="center">
                                <Grid item xs={12} md={4}>
                                    <Box
                                        component="img"
                                        src={result.full_url}
                                        sx={{ width: '100%', borderRadius: 1 }}
                                        alt="Compressed"
                                    />
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">Original Size</Typography>
                                            <Typography variant="body1">{formatBytes(result.original_size)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">Compressed Size</Typography>
                                            <Typography variant="body1" fontWeight="bold" color="success.main">
                                                {formatBytes(result.compressed_size)}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">Reduction</Typography>
                                            <Chip
                                                label={`-${((1 - result.compressed_size / result.original_size) * 100).toFixed(1)}%`}
                                                color="success"
                                                size="small"
                                            />
                                        </Box>

                                        <Button
                                            variant="outlined"
                                            startIcon={<Download />}
                                            href={result.full_url}
                                            download={`compressed_${result.filename}`}
                                            sx={{ mt: 2 }}
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
