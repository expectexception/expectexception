import React, { useState, useRef } from 'react';
import {
    Box,
    Button,
    Card,
    Grid,
    Typography,
    LinearProgress,
    Alert,
    useTheme,
    alpha,
    Paper,
} from '@mui/material';
import {
    CloudUpload,
    MusicNote,
    Mic,
    Download,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient, { API_BASE_URL } from '../../api/config';
import { useScrollToResult } from '../../hooks/useScrollToResult';

const AudioSeparator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ zip_url: string, vocals_url: string, accompaniment_url: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const resultRef = useScrollToResult(!!result);

    // Backend returns MEDIA_URL-relative paths (e.g. "/media/audio_separator/...");
    // resolve them against the API host so playback/downloads work whenever the
    // frontend and backend aren't served from the same origin (e.g. local dev).
    const resolveMediaUrl = (url?: string) => {
        if (!url) return url;
        return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    };

    // Audio Refs
    const vocalsRef = useRef<HTMLAudioElement>(null);
    const musicRef = useRef<HTMLAudioElement>(null);

    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setError(null);
            setResult(null);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.m4a'] },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024 // 50MB limit
    });

    const handleProcess = async () => {
        if (!file) return;

        setLoading(true);
        setProgress(0);
        setError(null);
        setResult(null);

        // Fake progress since we can't easily track backend processing percentage without websockets
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return 90;
                return prev + (100 - prev) * 0.05;
            });
        }, 1000);

        try {
            const formData = new FormData();
            formData.append('audio', file);

            // Note: endpoints.services.audioSeparator is missing the '/services/'
            // prefix (points at a route that doesn't exist on the backend - see
            // apps/services/urls.py which mounts this view under '/api/services/').
            // Use the correct, fully-qualified path directly here instead.
            const response = await apiClient.post('/api/services/audio-separator/process', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000 // 5 minutes timeout
            });

            // If backend enqueued a Celery task, poll the status endpoint until it
            // resolves to a cached result (status: 'success'/'failed') or a terminal
            // Celery state (SUCCESS/FAILURE), since AudioSeparatorStatusView returns
            // either shape depending on whether the result has been cached yet.
            if (response.data && response.data.task_id && response.data.status_url) {
                const statusUrl: string = response.data.status_url;
                let attempts = 0;

                const poll = async () => {
                    attempts += 1;
                    try {
                        const s = await apiClient.get(statusUrl, { timeout: 10000 });
                        const data = s.data || {};
                        const statusValue = String(data.status || '').toLowerCase();
                        const isDone = statusValue === 'success' || statusValue === 'failure' || statusValue === 'failed' || !!data.zip_url;

                        if (isDone) {
                            clearInterval(pollInterval);
                            clearInterval(progressInterval);
                            setProgress(100);
                            if (data.zip_url || statusValue === 'success') {
                                setResult(data);
                            } else {
                                setError(data.error || 'Processing failed');
                            }
                            setLoading(false);
                        } else {
                            // still processing, bump progress slowly
                            setProgress(prev => Math.min(98, prev + 2));
                        }
                    } catch (pollErr: any) {
                        // keep polling until attempts exceed threshold
                        if (attempts > 120) { // ~4 minutes
                            clearInterval(pollInterval);
                            clearInterval(progressInterval);
                            setLoading(false);
                            setError('Processing timeout. Please try a smaller file or try again later.');
                        }
                    }
                };

                const pollInterval = setInterval(poll, 2000);
                // run first poll immediately
                await poll();
                return;
            }

            clearInterval(progressInterval);
            setProgress(100);
            setResult(response.data);

        } catch (err: any) {
            clearInterval(progressInterval);
            console.error("Separation failed:", err);
            setError(err.response?.data?.error || "Failed to process audio. Please try a shorter or different file.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ServicePageShell
            icon={Mic}
            title="Vocal Remover"
            subtitle="Isolate vocals and instrumentals from any audio track using AI."
            maxWidth="sm"
            about="Splits an uploaded audio file into two isolated stems - vocals and instrumental - using Demucs, an AI source-separation model, run on our GPU server rather than in your browser. Upload an MP3, WAV, FLAC, or M4A file up to 50MB and the server processes it as a background job, since separation is computationally heavy; when it finishes you get two WAV stems to preview and download, plus a combined ZIP. Handy for making karaoke tracks, isolating vocals for sampling, or pulling an instrumental from a mix that was never released separately."
            howToSteps={[
                { name: 'Drop or select an audio file', text: 'Drag an MP3, WAV, FLAC, or M4A file (up to 50MB) into the upload area, or click it to open a file picker.' },
                { name: 'Click Separate Vocals & Music', text: 'This uploads the file and starts the AI separation job on our server.' },
                { name: 'Wait for processing', text: 'The progress bar advances while the job runs in the background - larger files take longer since this is heavy AI processing.' },
                { name: 'Preview each stem', text: 'Once done, play the Vocals and Music stems directly in the browser using the built-in audio players.' },
                { name: 'Download what you need', text: 'Download either stem individually, or grab both at once with Download All Stems (ZIP).' },
            ]}
            faq={[
                { question: 'What technology does the separation?', answer: 'Demucs, an AI audio source-separation model, run server-side with GPU acceleration rather than in your browser - that\'s why processing takes real time instead of being instant.' },
                { question: "Why does it only produce two stems instead of splitting out drums, bass, etc separately?", answer: 'This tool runs Demucs in two-stem mode - vocals versus everything else - rather than full instrument-by-instrument separation, which keeps processing faster and the output simpler: one vocal track, one backing track.' },
                { question: 'What file types and sizes are supported?', answer: 'MP3, WAV, FLAC, and M4A, up to 50MB per file. Longer tracks or large lossless files take noticeably longer to process.' },
                { question: 'Why is the output WAV instead of MP3?', answer: 'The separated stems are written out uncompressed as WAV to avoid extra quality loss, since the separation process itself already introduces some artifacts - convert to MP3 afterward yourself if you need a smaller file.' },
            ]}
        >
            <Seo
                title="AI Audio Source Separator"
                description="Extract vocals and music from any song using AI."
                toolId={31}
            />

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Upload Card */}
                <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                    <Box
                        {...getRootProps()}
                        sx={{
                            border: '2px dashed',
                            borderColor: isDragActive ? 'primary.main' : 'divider',
                            borderRadius: 4,
                            p: { xs: 3, sm: 4 },
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            bgcolor: isDragActive ? alpha(primary, 0.1) : 'transparent',
                            '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: alpha(primary, 0.05)
                            }
                        }}
                    >
                        <input {...getInputProps()} />
                        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                        {file ? (
                            <Box>
                                <Typography variant="subtitle1" color="primary">{file.name}</Typography>
                                <Typography variant="body2" color="text.secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Typography>
                            </Box>
                        ) : (
                            <Box>
                                <Typography variant="subtitle1">Drag & Drop or Click to Upload</Typography>
                                <Typography variant="body2" color="text.secondary">MP3, WAV, FLAC up to 50MB</Typography>
                            </Box>
                        )}
                    </Box>

                    <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={!file || loading}
                        onClick={handleProcess}
                        sx={{
                            mt: 3,
                            py: 1.5,
                            fontSize: '1.1rem',
                            background: `linear-gradient(45deg, ${primary} 30%, ${secondary} 90%)`
                        }}
                    >
                        {loading ? 'Separating Stems...' : 'Separate Vocals & Music'}
                    </Button>

                    {loading && (
                        <Box sx={{ mt: 2 }}>
                            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                                This uses heavy AI processing. Please wait...
                            </Typography>
                        </Box>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                    )}
                </Card>

                {/* Results Area */}
                {result && (
                    <Grid container spacing={2} ref={resultRef}>
                        {/* Vocals Card */}
                        <Grid item xs={12} sm={6}>
                            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.3)', borderTop: `4px solid ${primary}` }}>
                                <Mic sx={{ fontSize: 32, color: primary, mb: 0.5 }} />
                                <Typography variant="subtitle1" gutterBottom>Vocals</Typography>
                                <audio controls src={resolveMediaUrl(result.vocals_url)} style={{ width: '100%', marginTop: 8, marginBottom: 8 }} ref={vocalsRef} />
                                <Button
                                    variant="outlined"
                                    href={resolveMediaUrl(result.vocals_url)}
                                    download="vocals.wav"
                                    startIcon={<Download />}
                                    size="small"
                                    color="secondary"
                                >
                                    Download Vocals
                                </Button>
                            </Paper>
                        </Grid>

                        {/* Music Card */}
                        <Grid item xs={12} sm={6}>
                            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.3)', borderTop: `4px solid ${secondary}` }}>
                                <MusicNote sx={{ fontSize: 32, color: secondary, mb: 0.5 }} />
                                <Typography variant="subtitle1" gutterBottom>Music</Typography>
                                <audio controls src={resolveMediaUrl(result.accompaniment_url)} style={{ width: '100%', marginTop: 8, marginBottom: 8 }} ref={musicRef} />
                                <Button
                                    variant="outlined"
                                    href={resolveMediaUrl(result.accompaniment_url)}
                                    download="accompaniment.wav"
                                    startIcon={<Download />}
                                    size="small"
                                    color="warning"
                                >
                                    Download Music
                                </Button>
                            </Paper>
                        </Grid>

                        {/* Full Zip Download */}
                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                href={resolveMediaUrl(result.zip_url)}
                                download="stems.zip"
                                startIcon={<Download />}
                                fullWidth
                                sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
                            >
                                Download All Stems (ZIP)
                            </Button>
                        </Grid>
                    </Grid>
                )}
            </Box>
        </ServicePageShell>
    );
};

export default AudioSeparator;
