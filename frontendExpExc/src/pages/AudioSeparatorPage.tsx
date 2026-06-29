import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

import {
  Container,
  Card,
  CardContent,
  Button,
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error as ErrorIcon,
  GetApp,
  Mic,
  MusicNote,
  Settings,
  Info,
  Close,
} from '@mui/icons-material';
import Seo from '../components/seo/Seo';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import ServicePageHero from '../components/services/ServicePageHero';

interface TaskStatus {
  task_id: string;
  status: 'pending' | 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE' | 'unknown';
  message?: string;
  error?: string;
  zip_url?: string;
  vocals_url?: string;
  accompaniment_url?: string;
  duration?: number;
}

const AudioSeparatorPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const SUPPORTED_FORMATS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'];
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Poll task status
  useEffect(() => {
    if (!taskId) return;

    const pollStatus = async () => {
      try {
        const response = await apiClient.get(`${endpoints.services.audioSeparator}/status/${taskId}/`);
        setTaskStatus(response.data);

        if (
          response.data.status === 'SUCCESS' ||
          response.data.zip_url
        ) {
          // Task complete
          setSuccess('Audio separation complete!');
          setLoading(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        } else if (
          response.data.status === 'FAILURE' ||
          response.data.error
        ) {
          // Task failed
          setError(`Processing failed: ${response.data.error || 'Unknown error'}`);
          setLoading(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        }
      } catch (err: any) {
        console.error('Status poll error:', err);
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling
    pollingIntervalRef.current = setInterval(pollStatus, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [taskId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate format
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(fileExt)) {
      setError(`Unsupported format: ${fileExt}. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
      return;
    }

    // Validate size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `File too large (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum: 500MB`
      );
      return;
    }

    setFile(selectedFile);
    setError('');
    setSuccess('');
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an audio file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await apiClient.post(
        endpoints.services.audioSeparator,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: any) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      if (response.data.task_id) {
        setTaskId(response.data.task_id);
        setSuccess('Processing started. This may take a few minutes...');
      } else {
        // Sync mode response
        setTaskStatus(response.data);
        setSuccess('Processing complete!');
        setLoading(false);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to start processing'
      );
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTaskId(null);
    setTaskStatus(null);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'default';
    if (status === 'SUCCESS') return 'success';
    if (status === 'FAILURE') return 'error';
    return 'info';
  };

  return (
    <>
      <Seo
        title="Audio Separator - Separate Vocals from Music"
        description="Separate vocals from music tracks using AI. Extract vocals, drums, bass, and other instruments."
        image="/images/audio-separator.jpg"
      />
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <ServicePageHero
          icon={Mic}
          title="Audio Separator"
          subtitle="Extract vocals, drums, bass, and other instruments from your audio tracks in seconds using advanced AI models. Supports MP3, WAV, FLAC, OGG, M4A, and AAC formats."
        />

        <Grid container spacing={4} sx={{ mb: 8 }}>
          {/* Upload Panel */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              style={{ height: '100%' }}
            >
              <Card sx={{
                height: '100%',
                p: 3,
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
              }}>
                <CardContent sx={{ p: 1 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: '800', mb: 3 }}>
                    Upload Audio File
                  </Typography>

                  {/* File Drop Zone */}
                  <Box
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#3dfc55';
                      e.currentTarget.style.backgroundColor = 'rgba(61, 252, 85, 0.05)';
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) {
                        handleFileSelect({ target: { files: e.dataTransfer.files } } as any);
                      }
                    }}
                    sx={{
                      border: '2px dashed rgba(255, 255, 255, 0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      borderRadius: '16px',
                      p: 5,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: '#3dfc55',
                        backgroundColor: 'rgba(61, 252, 85, 0.02)',
                        boxShadow: '0 0 20px rgba(61, 252, 85, 0.05)'
                      },
                      mb: 4,
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CloudUpload sx={{ fontSize: 54, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                      Drop audio file here or click to select
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supported: MP3, WAV, FLAC, OGG, M4A, AAC (max 500MB)
                    </Typography>
                  </Box>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={SUPPORTED_FORMATS.join(',')}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />

                  {/* Selected File Display */}
                  {file && (
                    <Box sx={{
                      mb: 4,
                      p: 2.5,
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px'
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: '700', mb: 0.5 }}>
                        Selected: {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Size: {(file.size / 1024 / 1024).toFixed(2)}MB
                      </Typography>
                    </Box>
                  )}

                  {/* Error Alert */}
                  {error && (
                    <Alert severity="error" variant="filled" sx={{ mb: 4, borderRadius: '12px' }} onClose={() => setError('')}>
                      {error}
                    </Alert>
                  )}

                  {/* Success Alert */}
                  {success && (
                    <Alert severity="success" variant="filled" sx={{ mb: 4, borderRadius: '12px', bgcolor: 'rgba(61, 252, 85, 0.15)', color: '#3dfc55', border: '1px solid rgba(61, 252, 85, 0.25)' }}>
                      {success}
                    </Alert>
                  )}

                  {/* Upload Progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Box sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2" fontWeight="600">Uploading...</Typography>
                        <Typography variant="body2" fontWeight="700" color="primary.main">{uploadProgress}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={uploadProgress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: '#3dfc55'
                          }
                        }}
                      />
                    </Box>
                  )}

                  {/* Status Display */}
                  {taskStatus && (
                    <Box sx={{
                      mb: 4,
                      p: 2.5,
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                        {taskStatus.status === 'SUCCESS' && (
                          <CheckCircle sx={{ color: 'success.main' }} />
                        )}
                        {taskStatus.status === 'FAILURE' && (
                          <ErrorIcon sx={{ color: 'error.main' }} />
                        )}
                        {!['SUCCESS', 'FAILURE'].includes(taskStatus.status) && (
                          <CircularProgress size={20} sx={{ color: '#3dfc55' }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: '700' }}>
                          Status: {taskStatus.status}
                        </Typography>
                      </Box>
                      {taskStatus.duration && (
                        <Typography variant="caption" color="text.secondary">
                          Processing time: {taskStatus.duration.toFixed(2)}s
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={2.5}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleUpload}
                      disabled={!file || loading}
                      startIcon={
                        loading ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <CloudUpload />
                        )
                      }
                      sx={{
                        py: 1.5,
                        borderRadius: '10px',
                        fontWeight: 700
                      }}
                    >
                      {loading ? 'Processing...' : 'Start Separation'}
                    </Button>
                    {(file || taskId) && (
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleReset}
                        disabled={loading}
                        startIcon={<Close />}
                        sx={{
                          py: 1.5,
                          borderRadius: '10px'
                        }}
                      >
                        Reset
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Results Panel */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              style={{ height: '100%' }}
            >
              <Card sx={{
                height: '100%',
                p: 3,
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
              }}>
                <CardContent sx={{ p: 1 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: '800', mb: 3 }}>
                    Results
                  </Typography>

                  {!taskStatus ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Info sx={{ fontSize: 50, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary" variant="body1">
                        Upload an audio file to start extraction
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {taskStatus.zip_url && (
                        <>
                          <ListItem sx={{ py: 2, px: 1 }}>
                            <ListItemIcon>
                              <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={<Typography variant="subtitle1" fontWeight="700">All Stems (ZIP)</Typography>}
                              secondary="Download vocals, drums, bass, and other components"
                            />
                            <Tooltip title="Download all separated stems as ZIP">
                              <IconButton
                                href={taskStatus.zip_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', p: 1.25 }}
                              >
                                <GetApp />
                              </IconButton>
                            </Tooltip>
                          </ListItem>
                          <Divider />
                        </>
                      )}

                      {taskStatus.vocals_url && (
                        <>
                          <ListItem sx={{ py: 2, px: 1 }}>
                            <ListItemIcon>
                              <Mic sx={{ color: 'primary.main', fontSize: 28 }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={<Typography variant="subtitle1" fontWeight="700">Vocals</Typography>}
                              secondary="Extracted vocal track"
                            />
                            <Tooltip title="Download vocal track">
                              <IconButton
                                href={taskStatus.vocals_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', p: 1.25 }}
                              >
                                <GetApp />
                              </IconButton>
                            </Tooltip>
                          </ListItem>
                          <Divider />
                        </>
                      )}

                      {taskStatus.accompaniment_url && (
                        <ListItem sx={{ py: 2, px: 1 }}>
                          <ListItemIcon>
                            <MusicNote sx={{ color: 'primary.main', fontSize: 28 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={<Typography variant="subtitle1" fontWeight="700">Accompaniment (Instrumental)</Typography>}
                            secondary="Music without vocals"
                          />
                          <Tooltip title="Download instrumental track">
                            <IconButton
                              href={taskStatus.accompaniment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', p: 1.25 }}
                            >
                              <GetApp />
                            </IconButton>
                          </Tooltip>
                        </ListItem>
                      )}

                      {!taskStatus.zip_url && !taskStatus.vocals_url && (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                          <CircularProgress sx={{ mb: 2.5, color: '#3dfc55' }} />
                          <Typography variant="body1">Processing your audio...</Typography>
                        </Box>
                      )}
                    </List>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Features */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: '800', mb: 4.5, textAlign: 'center' }}>
            How It Works
          </Typography>
          <Grid container spacing={3.5}>
            {[
              {
                title: 'Advanced AI Models',
                description: 'Uses state-of-the-art deep learning models trained on millions of songs',
              },
              {
                title: 'Multiple Stems',
                description: 'Separates vocals, drums, bass, and other instruments',
              },
              {
                title: 'High Quality',
                description: 'Maintains audio quality while achieving high separation accuracy',
              },
              {
                title: 'Fast Processing',
                description: 'Most songs process in just a few minutes',
              },
            ].map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper sx={{
                  p: 3.5,
                  textAlign: 'center',
                  background: 'rgba(13, 14, 18, 0.4)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  height: '100%',
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: 'rgba(61, 252, 85, 0.25)',
                    transform: 'translateY(-3px)'
                  }
                }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: '750', fontSize: '1.1rem' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default AudioSeparatorPage;
