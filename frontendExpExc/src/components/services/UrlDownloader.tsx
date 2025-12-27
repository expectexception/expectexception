import React, { useState } from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Box,
    Stack,
    LinearProgress,
    Alert,
    Chip,
    alpha,
    Paper,
    IconButton,
} from '@mui/material';
import Seo from '../seo/Seo';
import {
    Download,
    Link as LinkIcon,
    Clear,
    CheckCircle,
    Error as ErrorIcon,
    Info,
    Favorite as FavoriteIcon,
} from '@mui/icons-material';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const UrlDownloader: React.FC = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [fileInfo, setFileInfo] = useState<any>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const { token } = useAuth();

    const handleInspect = async () => {
        if (!url) {
            setError('Please enter a URL');
            return;
        }

        try {
            setLoading(true);
            setProgress(0);
            setError(null);
            setSuccess(null);
            setFileInfo(null);

            const response = await apiClient.post(endpoints.services.urlDownloader, {
                url,
                action: 'check'
            });

            setFileInfo(response.data);
            setSuccess('URL inspected successfully! File is available.');

        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to inspect URL');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadFile = async () => {
        if (!url) return;

        try {
            setLoading(true);
            setError(null);

            // Trigger download
            const response = await apiClient.post(endpoints.services.urlDownloader, {
                url,
                action: 'download'
            }, {
                responseType: 'blob', // Important for file download
                onDownloadProgress: (progressEvent) => {
                    const total = progressEvent.total || fileInfo?.content_length || 0;
                    if (total) {
                        setProgress(Math.round((progressEvent.loaded * 100) / total));
                    }
                }
            });

            // Create blob link to download
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', fileInfo?.filename || 'download'); // Use filename from inspect
            document.body.appendChild(link);
            link.click();
            link.remove();

            setSuccess('Download started successfully!');

        } catch (err: any) {
            console.error('Download error:', err);
            // Try to read blob error
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    setError(json.error || 'Download failed');
                } catch {
                    setError('Download failed');
                }
            } else {
                setError('Download failed');
            }
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    const handleReset = () => {
        setUrl('');
        setProgress(0);
        setError(null);
        setSuccess(null);
        setFileInfo(null);
    };

    const handleToggleFavorite = async () => {
        if (!token) return;
        try {
            // Assuming service_id logic is handled or we pass a known ID. 
            // For demo, we are just toggling local state mostly, but trying to call API
            // We need to know the Service ID for UrlDownloader. Let's assume it's fetched or known.
            // For now, let's skip the API call if we don't have the ID, or hardcode if known.
            // But to avoid errors, we'll just toggle UI.
            setIsFavorite(!isFavorite);

            // Real implementation would look like:
            // await apiClient.post(endpoints.dashboard.toggleFavorite, { service_id: <ID> });
        } catch (err) {
            console.error(err);
        }
    };



    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Seo
                title="Universal URL Downloader - Fast & Secure File Saving"
                description="Download files from any URL securely. Universal file downloader utility for developers and users. Paste a link and save content instantly."
                keywords={[
                    'url downloader',
                    'file downloader',
                    'direct link downloader',
                    'online downloader',
                    'save from url',
                    'direct file download',
                    'url fetcher',
                    'download from link',
                    'online file downloader',
                    'remote upload to cloud',
                    'save file from url',
                    'web link downloader',
                    'fast link downloader online',
                    'download large files from url',
                    'secure url downloader'
                ]}
            />

            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                URL Downloader
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
                Download files directly from any public URL
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)} icon={<ErrorIcon />}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)} icon={<CheckCircle />}>
                    {success}
                </Alert>
            )}

            <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" gutterBottom>
                                Inspector
                            </Typography>
                            <IconButton onClick={handleToggleFavorite} color={isFavorite ? 'error' : 'default'}>
                                <FavoriteIcon />
                            </IconButton>
                        </Box>

                        <TextField
                            fullWidth
                            label="File URL"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/file.pdf"
                            disabled={loading}
                            InputProps={{
                                startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                            sx={{ mb: 3 }}
                        />

                        {loading && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Downloading... {progress}%
                                </Typography>
                                <LinearProgress variant="determinate" value={progress} />
                            </Box>
                        )}

                        {fileInfo && (
                            <Paper variant="outlined" sx={{ mb: 3, p: 2, bgcolor: 'action.hover' }}>
                                <Typography variant="subtitle2" gutterBottom>File Details:</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Typography variant="body2"><strong>Name:</strong> {fileInfo.filename}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2"><strong>Type:</strong> {fileInfo.content_type || 'Unknown'}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2"><strong>Size:</strong> {fileInfo.content_length ? (fileInfo.content_length / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}</Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                        )}

                        <Stack direction="row" spacing={2}>
                            {!fileInfo ? (
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={handleInspect}
                                    disabled={loading || !url}
                                    startIcon={<Info />}
                                >
                                    {loading ? 'Inspecting...' : 'Inspect URL'}
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={handleDownloadFile}
                                    disabled={loading}
                                    startIcon={<Download />}
                                    color="success"
                                >
                                    {loading ? 'Downloading...' : 'Download File'}
                                </Button>
                            )}

                            <Button variant="outlined" onClick={handleReset} disabled={loading}>
                                Reset
                            </Button>
                        </Stack>


                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: alpha('#2563eb', 0.05) }}>
                        <CardContent>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: 'primary.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    mb: 2,
                                }}
                            >
                                <Info />
                            </Box>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                How it works
                            </Typography>
                            <Stack spacing={2} sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    1. Paste the direct URL of the file
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    2. Click the Check button
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    3. View file metadata
                                </Typography>
                            </Stack>

                            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary">
                                    <strong>Note:</strong> This tool checks public URLs.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Supported File Types */}
            <Box sx={{ mt: 6 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                    Supported File Types
                </Typography>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                    {[
                        { type: 'Images', examples: 'JPG, PNG, GIF, SVG' },
                        { type: 'Documents', examples: 'PDF, DOC, TXT, CSV' },
                        { type: 'Archives', examples: 'ZIP, RAR, TAR, GZ' },
                        { type: 'Media', examples: 'MP3, MP4, AVI, MOV' },
                    ].map((category, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                        {category.type}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {category.examples}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Container>
    );
};

export default UrlDownloader;
