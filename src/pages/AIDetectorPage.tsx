import React, { useState, useEffect, useCallback, useRef } from 'react';
import Seo from '../components/seo/Seo';
import {
    Container,
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Alert,
    CircularProgress,
    Grid,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Tooltip,
    Divider,
    Fade,
    Avatar,
    LinearProgress,
    Collapse,
    Stack,
} from '@mui/material';
import {
    CloudUpload,
    CheckCircle,
    Cancel,
    ImageSearch,
    History,
    Delete,
    Visibility,
    Refresh,
    ArrowBack,
    ExpandMore,
    ExpandLess,
    Speed,
    Memory,
    HourglassEmpty,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

// Interfaces for the enhanced API response
interface EnsembleResult {
    model: string;
    weight: number;
    ai_score: number;
    real_score: number;
    raw_predictions: Array<{ label: string; score: number }>;
}

interface AnalysisResult {
    id?: number;
    task_id?: string;
    filename: string;
    is_ai_generated: boolean;
    confidence: number;
    label: string;
    ai_probability?: number;
    real_probability?: number;
    models_used?: number;
    ensemble_results?: EnsembleResult[];
    all_scores?: Array<{ label: string; score: number }>;
    image_url: string | null;
    format: string | null;
    dimensions: string | null;
    size_bytes: number | null;
    exif_data: Record<string, string>;
    image_stats: Record<string, any>;
    ela_base64: string | null;
    created_at?: string;
    from_cache?: boolean;
}

interface TaskStatus {
    task_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    step?: string;
    message?: string;
    result?: AnalysisResult;
    error?: string;
}

const AIDetectorPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [historyItems, setHistoryItems] = useState<AnalysisResult[]>([]);
    const [tabValue, setTabValue] = useState(0);
    const [viewMode, setViewMode] = useState<'upload' | 'history'>('upload');

    // Async processing state
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
    const [pollingProgress, setPollingProgress] = useState(0);
    const [showEnsembleDetails, setShowEnsembleDetails] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isAuthenticated && viewMode === 'history') {
            fetchHistory();
        }
    }, [isAuthenticated, viewMode]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const response = await apiClient.get(endpoints.aiDetector.history);
            setHistoryItems(response.data.results || response.data);
        } catch (err: any) {
            console.error('Failed to fetch history:', err);
            setError('Could not load analysis history.');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleDeleteHistory = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this analysis?')) return;

        try {
            await apiClient.delete(endpoints.aiDetector.detail(id));
            setHistoryItems(prev => prev.filter(item => item.id !== id));
            if (result?.id === id) setResult(null);
        } catch (err) {
            console.error('Delete failed:', err);
            setError('Failed to delete history item.');
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
            setError('');
            setTaskId(null);
            setTaskStatus(null);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
            setError('');
            setTaskId(null);
            setTaskStatus(null);
        } else {
            setError('Please drop a valid image file');
        }
    };

    // Poll for task status
    const pollTaskStatus = useCallback(async (id: string) => {
        try {
            const response = await apiClient.get(endpoints.aiDetector.taskStatus(id));
            const status: TaskStatus = response.data;
            setTaskStatus(status);

            // Update progress animation
            if (status.status === 'pending') {
                setPollingProgress(10);
            } else if (status.status === 'processing') {
                if (status.step === 'detection') setPollingProgress(30);
                else if (status.step === 'metadata') setPollingProgress(60);
                else if (status.step === 'ela') setPollingProgress(80);
                else if (status.step === 'saving') setPollingProgress(90);
                else setPollingProgress(50);
            }

            if (status.status === 'completed' && status.result) {
                setResult(status.result);
                setLoading(false);
                setPollingProgress(100);
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
                if (isAuthenticated) fetchHistory();
            } else if (status.status === 'failed') {
                setError(status.error || 'Analysis failed. Please try again.');
                setLoading(false);
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            }
        } catch (err) {
            console.error('Polling error:', err);
        }
    }, [isAuthenticated]);

    const handleAnalyze = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError('');
        setResult(null);
        setTaskStatus(null);
        setPollingProgress(0);

        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            // Use async endpoint (default)
            const response = await apiClient.post(endpoints.aiDetector.analyze, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Check if async response (has task_id)
            if (response.data.task_id) {
                const id = response.data.task_id;
                setTaskId(id);
                setTaskStatus({
                    task_id: id,
                    status: 'pending',
                    message: 'Analysis started...',
                });
                setPollingProgress(5);

                // Start polling
                pollingRef.current = setInterval(() => {
                    pollTaskStatus(id);
                }, 2000); // Poll every 2 seconds
            } else {
                // Sync response (from cache or sync mode)
                setResult(response.data);
                setLoading(false);
                if (isAuthenticated) fetchHistory();
            }
        } catch (err: any) {
            console.error('Analysis error:', err);
            setError(err.response?.data?.error || 'Failed to analyze image. Please try again.');
            setLoading(false);
        }
    };

    const cancelAnalysis = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setLoading(false);
        setTaskId(null);
        setTaskStatus(null);
        setPollingProgress(0);
    };

    const viewDetail = async (id: number) => {
        setLoading(true);
        try {
            const response = await apiClient.get(endpoints.aiDetector.detail(id));
            setResult(response.data);
            setViewMode('upload');
            setPreview(response.data.image_url);
            setSelectedFile(null);
        } catch (err) {
            setError('Failed to load details.');
        } finally {
            setLoading(false);
        }
    };

    const renderProcessingStatus = () => {
        if (!loading || !taskStatus) return null;

        const getStatusMessage = () => {
            switch (taskStatus.status) {
                case 'pending':
                    return 'Waiting in queue...';
                case 'processing':
                    if (taskStatus.step === 'detection') return 'Running AI detection models...';
                    if (taskStatus.step === 'metadata') return 'Extracting metadata...';
                    if (taskStatus.step === 'ela') return 'Performing forensic analysis...';
                    if (taskStatus.step === 'saving') return 'Saving results...';
                    return 'Processing...';
                default:
                    return taskStatus.message || 'Processing...';
            }
        };

        return (
            <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <HourglassEmpty sx={{ mr: 1, color: 'primary.main', animation: 'spin 2s linear infinite' }} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {getStatusMessage()}
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={pollingProgress}
                    sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'rgba(59, 130, 246, 0.1)',
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                        }
                    }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {taskStatus.step || 'Initializing'}
                    </Typography>
                    <Button
                        size="small"
                        color="error"
                        onClick={cancelAnalysis}
                        sx={{ minWidth: 'auto', py: 0 }}
                    >
                        Cancel
                    </Button>
                </Box>
            </Box>
        );
    };

    const renderEnsembleResults = () => {
        if (!result?.ensemble_results || result.ensemble_results.length === 0) return null;

        return (
            <Box sx={{ mt: 3 }}>
                <Button
                    onClick={() => setShowEnsembleDetails(!showEnsembleDetails)}
                    endIcon={showEnsembleDetails ? <ExpandLess /> : <ExpandMore />}
                    sx={{ mb: 2 }}
                    size="small"
                    variant="outlined"
                >
                    {showEnsembleDetails ? 'Hide' : 'Show'} Model Details ({result.models_used} models)
                </Button>
                <Collapse in={showEnsembleDetails}>
                    <Stack spacing={2}>
                        {result.ensemble_results.map((model, idx) => (
                            <Paper
                                key={idx}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    bgcolor: 'action.hover'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                                        <Memory sx={{ mr: 1, fontSize: 18, color: 'primary.main' }} />
                                        {model.model.split('/').pop()}
                                    </Typography>
                                    <Chip
                                        label={`Weight: ${model.weight}`}
                                        size="small"
                                        sx={{ fontSize: '0.7rem' }}
                                    />
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Box sx={{
                                            p: 1.5,
                                            bgcolor: 'rgba(239, 83, 80, 0.1)',
                                            borderRadius: 1,
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="caption" color="error.main">AI Score</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                                                {model.ai_score.toFixed(1)}%
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Box sx={{
                                            p: 1.5,
                                            bgcolor: 'rgba(102, 187, 106, 0.1)',
                                            borderRadius: 1,
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="caption" color="success.main">Real Score</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                {model.real_score.toFixed(1)}%
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>
                        ))}
                    </Stack>
                </Collapse>
            </Box>
        );
    };

    const renderResultCard = () => {
        if (!result) return null;

        const isAI = result.is_ai_generated;
        const bgColor = isAI ? 'rgba(239, 83, 80, 0.05)' : 'rgba(102, 187, 106, 0.05)';
        const borderColor = isAI ? '#ef5350' : '#66bb6a';
        const textColor = isAI ? '#d32f2f' : '#2e7d32';

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card
                    sx={{
                        background: (theme) => `linear-gradient(135deg, ${bgColor} 0%, ${theme.palette.background.paper} 100%)`,
                        border: `2px solid ${borderColor}`,
                        borderRadius: 4,
                        overflow: 'hidden',
                        mb: 3,
                        boxShadow: `0 8px 32px 0 ${isAI ? 'rgba(239, 83, 80, 0.1)' : 'rgba(102, 187, 106, 0.1)'}`,
                    }}
                >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        {/* Cache indicator */}
                        {result.from_cache && (
                            <Chip
                                icon={<Speed sx={{ fontSize: 16 }} />}
                                label="Cached Result"
                                size="small"
                                color="info"
                                sx={{ mb: 2 }}
                            />
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    bgcolor: isAI ? 'rgba(239, 83, 80, 0.1)' : 'rgba(102, 187, 106, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 3,
                                }}
                            >
                                {isAI ? (
                                    <Cancel sx={{ fontSize: 48, color: textColor }} />
                                ) : (
                                    <CheckCircle sx={{ fontSize: 48, color: textColor }} />
                                )}
                            </Box>
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="h3" sx={{ fontWeight: 900, color: textColor, lineHeight: 1 }}>
                                    {isAI ? 'AI GENERATED' : 'LIKELY REAL'}
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.secondary', mt: 1 }}>
                                    Confidence: <span style={{ color: textColor, fontWeight: 700 }}>{result.confidence.toFixed(2)}%</span>
                                </Typography>
                                {result.models_used && result.models_used > 1 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        Analyzed by {result.models_used} AI models
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        {/* Probability bars for ensemble results */}
                        {result.ai_probability !== undefined && result.real_probability !== undefined && (
                            <Box sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                                            AI Probability
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                                            {result.ai_probability.toFixed(1)}%
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                                            Real Probability
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                                            {result.real_probability.toFixed(1)}%
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        {/* Legacy all_scores display */}
                        {result.all_scores && result.all_scores.length > 0 && !result.ensemble_results && (
                            <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom align="left">
                                    Detailed Scores
                                </Typography>
                                {result.all_scores.map((score, idx) => (
                                    <Box key={idx} sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{score.label}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: textColor }}>
                                                {(score.score * 100).toFixed(2)}%
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                width: '100%',
                                                height: 10,
                                                bgcolor: 'rgba(0,0,0,0.05)',
                                                borderRadius: 5,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${score.score * 100}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                                style={{
                                                    height: '100%',
                                                    background: isAI ? 'linear-gradient(90deg, #ef5350, #d32f2f)' : 'linear-gradient(90deg, #66bb6a, #2e7d32)',
                                                    borderRadius: 5,
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {/* Ensemble model details */}
                        {renderEnsembleResults()}
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    const renderMetadata = () => {
        if (!result) return null;

        return (
            <Box>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        mb: 3,
                        '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' }
                    }}
                >
                    <Tab icon={<ImageSearch />} label="Properties" iconPosition="start" />
                    <Tab icon={<Visibility />} label="EXIF Data" iconPosition="start" />
                    <Tab icon={<History />} label="Color Analysis" iconPosition="start" />
                    <Tab icon={<Refresh />} label="Forensics (ELA)" iconPosition="start" />
                </Tabs>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={tabValue}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Properties Tab */}
                        {tabValue === 0 && (
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Filename</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>{result.filename}</Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Format</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{result.format || 'N/A'}</Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Dimensions</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{result.dimensions || 'N/A'}</Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">File Size</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                            {result.size_bytes ? `${(result.size_bytes / 1024).toFixed(2)} KB` : 'N/A'}
                                        </Typography>
                                    </Box>
                                </Grid>
                                {result.image_stats && (
                                    <>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                                <Typography variant="caption" color="text.secondary">Average Brightness</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {result.image_stats['Average Brightness'] || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                                <Typography variant="caption" color="text.secondary">Entropy</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {result.image_stats['Entropy'] || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </>
                                )}
                            </Grid>
                        )}

                        {/* EXIF Tab */}
                        {tabValue === 1 && (
                            <Box>
                                {result.exif_data && Object.keys(result.exif_data).length > 0 ? (
                                    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 400, border: '1px solid', borderColor: 'divider' }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default' }}>Meta Tag</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default' }}>Value</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Object.entries(result.exif_data).map(([key, value]) => (
                                                    <TableRow key={key} hover>
                                                        <TableCell sx={{ fontWeight: 500 }}>{key}</TableCell>
                                                        <TableCell color="text.secondary">{String(value)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Alert severity="warning" variant="outlined" icon={<Visibility />}>
                                        No EXIF metadata found. This is common in AI-generated images or images stripped of metadata for privacy.
                                    </Alert>
                                )}
                            </Box>
                        )}

                        {/* Color Analysis Tab */}
                        {tabValue === 2 && result.image_stats && (
                            <Box>
                                <Grid container spacing={2} sx={{ mb: 4 }}>
                                    {['Mean R', 'Mean G', 'Mean B'].map((stat) => (
                                        <Grid item xs={4} key={stat}>
                                            <Box sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                                <Typography variant="caption" color="text.secondary">{stat}</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{result.image_stats[stat]}</Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>Dominant Colors Palette</Typography>
                                {result.image_stats['Top Colors'] && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {result.image_stats['Top Colors'].map((item: any, idx: number) => {
                                            const [count, color] = item;
                                            const hexColor = Array.isArray(color)
                                                ? `#${color.slice(0, 3).map((c: number) => c.toString(16).padStart(2, '0')).join('')}`
                                                : `#${color.toString(16).padStart(6, '0')}`;
                                            return (
                                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                                    <Box sx={{ width: 48, height: 24, bgcolor: hexColor, borderRadius: 1, border: '1px solid rgba(0,0,0,0.1)', mr: 2 }} />
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{hexColor.toUpperCase()}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{count.toLocaleString()} pixels</Typography>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                        {((count / (parseInt(result.dimensions?.split('x')[0] || '1') * parseInt(result.dimensions?.split('x')[1] || '1'))) * 100).toFixed(1)}%
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Box>
                        )}

                        {/* ELA Tab */}
                        {tabValue === 3 && (
                            <Box sx={{ textAlign: 'center' }}>
                                {result.ela_base64 ? (
                                    <>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                            <b>Error Level Analysis (ELA)</b> highlights differences in compression levels.
                                            Uniform textures should have uniform ELA results. High contrast areas might indicate post-processing.
                                        </Typography>
                                        <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                            <img
                                                src={`data:image/png;base64,${result.ela_base64}`}
                                                alt="ELA Analysis"
                                                style={{ width: '100%', display: 'block' }}
                                            />
                                        </Box>
                                    </>
                                ) : (
                                    <Alert severity="info" variant="outlined">ELA analysis is not available for this image format/size.</Alert>
                                )}
                            </Box>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Box>
        );
    };

    const renderHistory = () => {
        if (historyLoading) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={40} />
                </Box>
            );
        }

        if (historyItems.length === 0) {
            return (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <History sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No analysis history found</Typography>
                    <Typography variant="body2" color="text.secondary">Your past analyses will appear here once you're logged in.</Typography>
                </Box>
            );
        }

        return (
            <Grid container spacing={2}>
                {historyItems.map((item) => (
                    <Grid item xs={12} key={item.id}>
                        <Card sx={{ display: 'flex', alignItems: 'center', hover: { bgcolor: 'action.hover' }, p: 1 }}>
                            <Avatar
                                variant="rounded"
                                src={item.image_url || ''}
                                sx={{ width: 60, height: 60, mr: 2, bgcolor: 'action.hover' }}
                            >
                                <ImageSearch />
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{item.filename}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Chip
                                        label={item.is_ai_generated ? 'AI' : 'REAL'}
                                        size="small"
                                        color={item.is_ai_generated ? 'error' : 'success'}
                                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {item.confidence.toFixed(1)}% • {new Date(item.created_at || '').toLocaleDateString()}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex' }}>
                                <Tooltip title="View Details">
                                    <IconButton onClick={() => viewDetail(item.id!)} size="small" color="primary">
                                        <Visibility />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <IconButton onClick={() => handleDeleteHistory(item.id!)} size="small" color="error">
                                        <Delete />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        );
    };

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 6 }, px: { xs: 1, sm: 2 } }}>
            <Seo
                title="AI Image Detector - Forensic AI Generation Check"
                toolId={3}
            />
            <Box sx={{ mb: { xs: 3, sm: 6 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography
                        variant="h2"
                        sx={{
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1,
                            fontSize: { xs: '2.5rem', sm: '3.75rem' }
                        }}
                    >
                        AI Image Detector
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        Forensic analysis with multi-model ensemble detection
                    </Typography>
                </Box>
                {isAuthenticated && (
                    <Box sx={{ display: 'flex', gap: 1, bgcolor: 'action.hover', p: 0.5, borderRadius: 3 }}>
                        <Button
                            variant={viewMode === 'upload' ? 'contained' : 'text'}
                            onClick={() => setViewMode('upload')}
                            startIcon={<CloudUpload />}
                            size="small"
                        >
                            Analyze
                        </Button>
                        <Button
                            variant={viewMode === 'history' ? 'contained' : 'text'}
                            onClick={() => setViewMode('history')}
                            startIcon={<History />}
                            size="small"
                        >
                            History
                        </Button>
                    </Box>
                )}
            </Box>

            {error && (
                <Fade in={!!error}>
                    <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                </Fade>
            )}

            <AnimatePresence mode="wait">
                {viewMode === 'upload' ? (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={result ? 5 : 12}>
                                <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', transition: 'all 0.3s' }}>
                                    <CardContent sx={{ p: 4 }}>
                                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                                            {result && selectedFile === null ? (
                                                <IconButton onClick={() => { setResult(null); setPreview(''); setSelectedFile(null); }} sx={{ mr: 1 }}>
                                                    <ArrowBack />
                                                </IconButton>
                                            ) : (
                                                <CloudUpload sx={{ mr: 1, color: 'primary.main' }} />
                                            )}
                                            {result && selectedFile === null ? 'Analysis View' : 'Upload for Analysis'}
                                        </Typography>

                                        {!result || selectedFile !== null ? (
                                            <Box
                                                onDrop={handleDrop}
                                                onDragOver={(e) => e.preventDefault()}
                                                sx={{
                                                    border: '2px dashed',
                                                    borderColor: 'primary.light',
                                                    borderRadius: 4,
                                                    p: { xs: 3, sm: 6 },
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    bgcolor: 'rgba(59, 130, 246, 0.02)',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: 'rgba(59, 130, 246, 0.05)',
                                                        borderColor: 'primary.main',
                                                        transform: 'scale(1.01)',
                                                    },
                                                }}
                                            >
                                                <input
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    id="file-upload"
                                                    type="file"
                                                    onChange={handleFileSelect}
                                                />
                                                <label htmlFor="file-upload" style={{ width: '100%', cursor: 'pointer' }}>
                                                    <Box sx={{ cursor: 'pointer' }}>
                                                        <CloudUpload sx={{ fontSize: { xs: 48, sm: 72 }, color: 'primary.main', mb: 2, opacity: 0.8 }} />
                                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                                                            Drop your image here
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            JPEG, PNG, WEBP, GIF, BMP, TIFF (Max 50MB)
                                                        </Typography>
                                                        <Button
                                                            variant="outlined"
                                                            component="span"
                                                            sx={{ mt: 3, borderRadius: 2 }}
                                                        >
                                                            Browse Files
                                                        </Button>
                                                    </Box>
                                                </label>
                                            </Box>
                                        ) : null}

                                        {preview && (
                                            <Box sx={{ mt: 4 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>Image Source</Typography>
                                                <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                                                    <img
                                                        src={preview}
                                                        alt="Preview"
                                                        style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'contain', background: '#f8fafc' }}
                                                    />
                                                </Box>
                                                {selectedFile && !loading && (
                                                    <Button
                                                        variant="contained"
                                                        fullWidth
                                                        size="large"
                                                        onClick={handleAnalyze}
                                                        disabled={loading}
                                                        startIcon={<ImageSearch />}
                                                        sx={{ mt: 3, py: 2, borderRadius: 3, fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)' }}
                                                    >
                                                        Run Forensic Analysis
                                                    </Button>
                                                )}
                                                {renderProcessingStatus()}
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>

                            {result && (
                                <Grid item xs={12} md={7}>
                                    {renderResultCard()}
                                    <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                                            {renderMetadata()}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            )}
                        </Grid>
                    </motion.div>
                ) : (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Analysis History</Typography>
                                    <Button startIcon={<Refresh />} onClick={fetchHistory} size="small">Refresh</Button>
                                </Box>
                                {renderHistory()}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </Container>
    );
};

export default AIDetectorPage;
