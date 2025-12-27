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
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    alpha,
    LinearProgress,
} from '@mui/material';
import {
    Download,
    VideoLibrary,
    Error as ErrorIcon,
    Info,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

const YtDownloader: React.FC = () => {
    const [url, setUrl] = useState('');
    const [quality, setQuality] = useState('720p');
    const [format, setFormat] = useState('mp4');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [videoInfo, setVideoInfo] = useState<any>(null);

    const handleFetchInfo = async () => {
        if (!url) {
            setError('Please enter a YouTube URL');
            return;
        }

        // Validate YouTube URL
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        if (!youtubeRegex.test(url)) {
            setError('Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.post(endpoints.services.ytDownloader, { url, action: 'info' });
            setVideoInfo(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || (err as Error).message || 'Failed to fetch video info');
            setVideoInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
    const [downloadId, setDownloadId] = useState<number | null>(null);

    const handleDownload = async () => {
        if (!videoInfo) {
            setError('Please fetch video info first');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setDownloadId(null);
            setDownloadStatus('Starting download...');

            const response = await apiClient.post(endpoints.services.ytDownloader, {
                url,
                action: 'download',
                quality: quality,
                format: format // Send selected format
            });

            if (response.data.success && response.data.download_id) {
                pollDownloadStatus(response.data.download_id);
            } else {
                setError('Download could not be started');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Download request failed');
            setLoading(false);
        }
    };

    const pollDownloadStatus = async (id: number) => {
        const interval = setInterval(async () => {
            try {
                const response = await apiClient.get(`/api/videos/downloads/${id}/`);
                const status = response.data.status;
                setDownloadStatus(`Status: ${status}...`);

                if (status === 'done') {
                    clearInterval(interval);
                    setDownloadStatus('Download complete! Click the button below to save your file.');
                    setDownloadId(id);
                    setLoading(false);
                } else if (status === 'failed') {
                    clearInterval(interval);
                    setError(`Download failed: ${response.data.error || 'Unknown error'}`);
                    setLoading(false);
                    setDownloadStatus(null);
                }
            } catch (err) {
                console.error('Polling error:', err);
                clearInterval(interval);
                setError('Lost connection to server while checking status');
                setLoading(false);
                setDownloadStatus(null);
            }
        }, 2000);
    };

    const triggerFileDownload = () => {
        if (!downloadId) return;
        const downloadUrl = `${API_BASE_URL}/api/videos/downloads/${downloadId}/file/`;
        window.location.href = downloadUrl;
    };

    const handleReset = () => {
        setUrl('');
        setVideoInfo(null);
        setError(null);
        setDownloadStatus(null);
        setDownloadId(null);
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Seo
                title="YouTube Video Downloader - Free 4K Video & MP3 Converter"
                toolId={5}
            />
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                YouTube Downloader
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
                Download YouTube videos in various formats and qualities
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
                <strong>Note:</strong> Downloads are prepared and optimized for high quality. Large videos may take time to process.
            </Alert>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)} icon={<ErrorIcon />}>
                    {error}
                </Alert>
            )}

            {downloadStatus && (
                <Alert severity="info" sx={{ mb: 3 }} icon={<Download />}>
                    {downloadStatus}
                </Alert>
            )}

            {loading && !downloadStatus && (
                <Box sx={{ width: '100%', mb: 3 }}>
                    <LinearProgress />
                </Box>
            )}

            <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                                Enter YouTube URL
                            </Typography>

                            <TextField
                                fullWidth
                                label="YouTube URL"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                disabled={loading}
                                InputProps={{
                                    startAdornment: <VideoLibrary sx={{ mr: 1, color: 'text.secondary' }} />,
                                }}
                                sx={{ mb: 3 }}
                            />

                            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                                <Button
                                    variant="contained"
                                    onClick={handleFetchInfo}
                                    disabled={loading || !url}
                                >
                                    {loading ? 'Fetching...' : 'Fetch Info'}
                                </Button>
                                <Button variant="outlined" onClick={handleReset}>
                                    Clear
                                </Button>
                            </Stack>

                            {videoInfo && (
                                <Box
                                    sx={{
                                        p: 3,
                                        bgcolor: alpha('#2563eb', 0.05),
                                        borderRadius: 2,
                                        mb: 3,
                                    }}
                                >
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={4}>
                                            <Box
                                                component="img"
                                                src={videoInfo.thumbnail}
                                                alt="Video thumbnail"
                                                sx={{
                                                    width: '100%',
                                                    borderRadius: 1,
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={8}>
                                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                                {videoInfo.title}
                                            </Typography>
                                            <Chip label={`Duration: ${videoInfo.duration}`} size="small" sx={{ mt: 1 }} />
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Quality</InputLabel>
                                        <Select
                                            value={quality}
                                            onChange={(e) => setQuality(e.target.value)}
                                            label="Quality"
                                            disabled={!videoInfo}
                                        >
                                            <MenuItem value="360p">360p</MenuItem>
                                            <MenuItem value="480p">480p</MenuItem>
                                            <MenuItem value="720p">720p (HD)</MenuItem>
                                            <MenuItem value="1080p">1080p (Full HD)</MenuItem>
                                            <MenuItem value="1440p">1440p (2K)</MenuItem>
                                            <MenuItem value="2160p">2160p (4K)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Format</InputLabel>
                                        <Select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value)}
                                            label="Format"
                                            disabled={!videoInfo}
                                        >
                                            <MenuItem value="mp4">MP4 (Video)</MenuItem>
                                            <MenuItem value="webm">WebM (Video)</MenuItem>
                                            <MenuItem value="mp3">MP3 (Audio Only)</MenuItem>
                                            <MenuItem value="m4a">M4A (Audio Only)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            {downloadId ? (
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="large"
                                    onClick={triggerFileDownload}
                                    startIcon={<Download />}
                                    fullWidth
                                    sx={{ py: 2 }}
                                >
                                    Download Now
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={handleDownload}
                                    disabled={!videoInfo || loading || !!downloadStatus}
                                    startIcon={<Download />}
                                    fullWidth
                                >
                                    {downloadStatus ? 'Processing...' : 'Start Download'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
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
                                How to use
                            </Typography>
                            <Stack spacing={2} sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    1. Copy the YouTube video URL from your browser
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    2. Paste the URL in the input field above
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    3. Click "Fetch Info" to load video details
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    4. Select your preferred quality and format
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    5. Click "Download" to start downloading
                                </Typography>
                            </Stack>

                            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary">
                                    <strong>Legal Notice:</strong> Only download videos you have the right to download.
                                    Respect copyright laws and YouTube's Terms of Service.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Features */}
            <Box sx={{ mt: 6 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                    Features
                </Typography>
                <Grid container spacing={3} sx={{ mt: 2 }}>
                    {[
                        {
                            title: 'Multiple Qualities',
                            description: 'Download videos in various qualities from 360p to 4K.',
                        },
                        {
                            title: 'Format Options',
                            description: 'Choose between video formats (MP4, WebM) or audio only (MP3, M4A).',
                        },
                        {
                            title: 'Fast Downloads',
                            description: 'Optimized download speeds for quick file transfers.',
                        },
                        {
                            title: 'Video Preview',
                            description: 'See video thumbnail and details before downloading.',
                        },
                    ].map((feature, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                        {feature.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {feature.description}
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

export default YtDownloader;
