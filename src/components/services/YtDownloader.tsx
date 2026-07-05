import React, { useEffect, useRef, useState } from 'react';
import {
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
    useTheme,
    alpha,
    LinearProgress,
} from '@mui/material';
import {
    Download,
    VideoLibrary,
    Error as ErrorIcon,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

const YtDownloader: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
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
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Stop polling if the component unmounts mid-download
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

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
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
        pollIntervalRef.current = setInterval(async () => {
            try {
                const response = await apiClient.get(`/api/videos/downloads/${id}/`);
                const status = response.data.status;
                setDownloadStatus(`Status: ${status}...`);

                if (status === 'done') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setDownloadStatus('Download complete! Click the button below to save your file.');
                    setDownloadId(id);
                    setLoading(false);
                } else if (status === 'failed') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setError(`Download failed: ${response.data.error || 'Unknown error'}`);
                    setLoading(false);
                    setDownloadStatus(null);
                }
            } catch (err) {
                console.error('Polling error:', err);
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
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
        <ServicePageShell
            icon={VideoLibrary}
            title="YouTube Downloader"
            subtitle="Download YouTube videos in various formats and qualities."
            maxWidth="md"
            about="Fetches a video's title, thumbnail, and duration via Fetch Info, then processes the actual download as a background job on our server using yt-dlp - pick a resolution up to 4K, or an audio-only format (MP3/M4A) that gets extracted and transcoded server-side. The page polls the job's status every couple of seconds until it's ready, then gives you a direct file to save. Private, age-restricted, and sign-in-required videos aren't supported and will fail with an error, since the tool doesn't authenticate as a YouTube user - only download videos you have the rights to save."
            howToSteps={[
                { name: 'Paste the YouTube URL', text: 'Enter a youtube.com or youtu.be video link into the YouTube URL field.' },
                { name: 'Click Fetch Info', text: "The tool validates the link and pulls the video's title, thumbnail, and duration before you commit to a download." },
                { name: 'Pick Quality and Format', text: 'Choose a resolution from 360p up to 2160p (4K), and a format - MP4/WebM keep video, MP3/M4A extract audio only.' },
                { name: 'Click Start Download', text: 'The server processes the request in the background; the status banner updates automatically until it finishes.' },
                { name: 'Click Download File', text: 'Once processing completes, click the button that appears to save the file to your device.' },
            ]}
            faq={[
                { question: 'Why does Start Download take a while instead of downloading instantly?', answer: 'The video is fetched and, for MP3/M4A, transcoded on our server first. That runs as a background job so the page can poll for status instead of holding a request open the whole time.' },
                { question: "Why did my download fail with 'requires age verification' or 'private video'?", answer: "Age-restricted videos that require a signed-in YouTube account, and private or unlisted videos, aren't accessible to the downloader since it doesn't log in as a YouTube user - only publicly viewable videos will work." },
                { question: "What's the difference between the MP4/WebM and MP3/M4A options?", answer: 'MP4 and WebM keep the video track at your chosen resolution. MP3 and M4A discard the video and extract just the audio, re-encoded server-side.' },
                { question: 'Am I allowed to download any YouTube video?', answer: "Only download videos you own or otherwise have the right to save. Most content on YouTube is copyrighted, and downloading it may violate YouTube's Terms of Service or the creator's rights depending on how you use the file afterward - this tool doesn't grant any rights beyond what you already have." },
            ]}
        >
            <Seo
                title="YouTube Video Downloader - Free 4K Video & MP3 Converter"
                toolId={5}
            />

            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {error && (
                        <Alert severity="error" onClose={() => setError(null)} icon={<ErrorIcon />}>
                            {error}
                        </Alert>
                    )}

                    {downloadStatus && (
                        <Alert severity="info" icon={<Download />}>
                            {downloadStatus}
                        </Alert>
                    )}

                    {loading && !downloadStatus && <LinearProgress />}

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
                    />

                    <Stack direction="row" spacing={2}>
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
                                p: 2,
                                bgcolor: alpha(primary, 0.05),
                                borderRadius: 2,
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
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                                        {videoInfo.title}
                                    </Typography>
                                    <Chip label={`Duration: ${videoInfo.duration}`} size="small" sx={{ mt: 1 }} />
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    <Grid container spacing={2}>
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
                        >
                            Download File
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

                    <Typography variant="caption" color="text.secondary">
                        <strong>Legal Notice:</strong> Only download videos you have the right to download. Respect copyright laws and YouTube's Terms of Service.
                    </Typography>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default YtDownloader;
