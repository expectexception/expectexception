import React, { useState, useRef } from 'react';
import {
    Box,
    Button,
    Card,
    Container,
    Grid,
    Typography,
    Stack,
    LinearProgress,
    Alert,
    useTheme,
    Paper,
    IconButton
} from '@mui/material';
import {
    CloudUpload,
    MusicNote,
    Mic,
    Download,
    PlayArrow,
    Pause
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Seo from '../seo/Seo';

const AudioSeparator: React.FC = () => {
    const theme = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ zip_url: string, vocals_url: string, accompaniment_url: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

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

            const response = await axios.post('/api/services/audio-separator/process', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000 // 5 minutes timeout
            });

            // If backend enqueued a task, poll status endpoint
            if (response.data && response.data.task_id && response.data.status_url) {
                const statusUrl = response.data.status_url;
                let attempts = 0;

                const poll = async () => {
                    attempts += 1;
                    try {
                        const s = await axios.get(statusUrl, { timeout: 10000 });
                        if (s.data && (s.data.status === 'success' || s.data.status === 'failed' || s.data.zip_url)) {
                            clearInterval(pollInterval);
                            clearInterval(progressInterval);
                            setProgress(100);
                            if (s.data.status === 'success' || s.data.zip_url) {
                                // prefer direct urls
                                setResult(s.data);
                            } else {
                                setError(s.data.error || 'Processing failed');
                            }
                            setLoading(false);
                        } else {
                            // still processing, bump progress slowly
                            setProgress(prev => Math.min(98, prev + 2));
                        }
                    } catch (pollErr:any) {
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
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Seo
                title="AI Audio Source Separator"
                description="Extract vocals and music from any song using AI."
                toolId={31}
            />

            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography variant="h3" gutterBottom sx={{ fontWeight: 800, background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Vocal Remover
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Isolate vocals and instrumentals from any audio track using advanced AI.
                </Typography>
            </Box>

            <Grid container spacing={4} justifyContent="center">
                <Grid item xs={12} md={8}>

                    {/* Upload Card */}
                    <Card sx={{ p: 4, mb: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Box
                            {...getRootProps()}
                            sx={{
                                border: '2px dashed',
                                borderColor: isDragActive ? 'primary.main' : 'divider',
                                borderRadius: 4,
                                p: 6,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                bgcolor: isDragActive ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: 'rgba(33, 150, 243, 0.05)'
                                }
                            }}
                        >
                            <input {...getInputProps()} />
                            <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                            {file ? (
                                <Box>
                                    <Typography variant="h6" color="primary">{file.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Typography>
                                </Box>
                            ) : (
                                <Box>
                                    <Typography variant="h6">Drag & Drop or Click to Upload</Typography>
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
                                mt: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)'
                            }}
                        >
                            {loading ? 'Separating Stems...' : 'Separate Vocals & Music'}
                        </Button>

                        {loading && (
                            <Box sx={{ mt: 3 }}>
                                <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                                    This uses heavy AI processing. Please wait...
                                </Typography>
                            </Box>
                        )}

                        {error && (
                            <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>
                        )}
                    </Card>

                    {/* Results Area */}
                    {result && (
                        <Grid container spacing={3}>
                            {/* Vocals Card */}
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.3)', borderTop: '4px solid #FE6B8B' }}>
                                    <Mic sx={{ fontSize: 40, color: '#FE6B8B', mb: 1 }} />
                                    <Typography variant="h6" gutterBottom>Vocals</Typography>
                                    <audio controls src={result.vocals_url} style={{ width: '100%', marginTop: 10, marginBottom: 10 }} ref={vocalsRef} />
                                    <Button
                                        variant="outlined"
                                        href={result.vocals_url}
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
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.3)', borderTop: '4px solid #FF8E53' }}>
                                    <MusicNote sx={{ fontSize: 40, color: '#FF8E53', mb: 1 }} />
                                    <Typography variant="h6" gutterBottom>Music</Typography>
                                    <audio controls src={result.accompaniment_url} style={{ width: '100%', marginTop: 10, marginBottom: 10 }} ref={musicRef} />
                                    <Button
                                        variant="outlined"
                                        href={result.accompaniment_url}
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
                                    href={result.zip_url}
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

                </Grid>
            </Grid>
        </Container>
    );
};

export default AudioSeparator;
