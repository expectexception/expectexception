import React, { useEffect, useState } from 'react';
import {
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
    useTheme,
    alpha,
    Paper,
    IconButton,
} from '@mui/material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import {
    Download,
    Link as LinkIcon,
    Error as ErrorIcon,
    Info,
    Favorite as FavoriteIcon,
} from '@mui/icons-material';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const UrlDownloader: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [fileInfo, setFileInfo] = useState<any>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [serviceId, setServiceId] = useState<number | null>(null);
    const { token } = useAuth();

    // Resolve this tool's Service id (needed for the favorite toggle endpoint) and
    // whether it's already favorited by the current user.
    useEffect(() => {
        if (!token) return;
        let cancelled = false;

        Promise.all([
            apiClient.get(endpoints.services.tools),
            apiClient.get(endpoints.services.dashboard.favorites),
        ]).then(([toolsRes, favRes]) => {
            if (cancelled) return;
            const tools = Array.isArray(toolsRes.data) ? toolsRes.data : toolsRes.data?.results || [];
            const match = tools.find((s: any) => s.path === '/services/url-downloader');
            if (match) {
                setServiceId(match.id);
                const favs = Array.isArray(favRes.data) ? favRes.data : favRes.data?.results || [];
                setIsFavorite(favs.some((f: any) => f.service?.id === match.id));
            }
        }).catch(() => { /* favorites are a non-critical enhancement */ });

        return () => { cancelled = true; };
    }, [token]);

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
        if (!token || !serviceId) return;
        try {
            const resp = await apiClient.post(endpoints.services.dashboard.toggleFavorite, { service_id: serviceId });
            setIsFavorite(resp.data?.status === 'added');
        } catch (err) {
            console.error(err);
        }
    };



    return (
        <ServicePageShell
            icon={Download}
            title="URL Downloader"
            subtitle="Inspect and download files directly from any public URL."
            maxWidth="sm"
        >
            <Seo
                title="Universal URL Downloader - Fast & Secure File Saving"
                toolId={1}
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                overflowY: 'auto',
            }}>
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Inspector
                        </Typography>
                        {!!token && (
                            <IconButton onClick={handleToggleFavorite} color={isFavorite ? 'error' : 'default'} disabled={!serviceId} size="small">
                                <FavoriteIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)} icon={<ErrorIcon />}>
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                            {success}
                        </Alert>
                    )}

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
                        sx={{ mb: 2 }}
                    />

                    {loading && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Downloading... {progress}%
                            </Typography>
                            <LinearProgress variant="determinate" value={progress} />
                        </Box>
                    )}

                    {fileInfo && (
                        <Paper variant="outlined" sx={{ mb: 2, p: 2, bgcolor: alpha(primary, 0.05) }}>
                            <Typography variant="subtitle2" gutterBottom>File Details:</Typography>
                            <Grid container spacing={1}>
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
                                fullWidth
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
                                fullWidth
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
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default UrlDownloader;
