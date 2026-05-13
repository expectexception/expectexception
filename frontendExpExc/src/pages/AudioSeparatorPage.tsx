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
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Mic sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Audio Separator
            </Typography>
            <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
              Separate vocals from music using advanced AI models
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Extract vocals, drums, bass, and other instruments from your audio tracks in seconds.
              Supports MP3, WAV, FLAC, OGG, M4A, and AAC formats.
            </Typography>
          </Box>
        </motion.div>

        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                    Upload Audio File
                  </Typography>

                  {/* File Drop Zone */}
                  <Box
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#1976d2';
                      e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.05)';
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.backgroundColor = 'transparent';
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) {
                        handleFileSelect({ target: { files: e.dataTransfer.files } } as any);
                      }
                    }}
                    sx={{
                      border: '2px dashed #ddd',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.02)',
                      },
                      mb: 3,
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Drop audio file here or click to select
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
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
                    <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Selected: {file.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Size: {(file.size / 1024 / 1024).toFixed(2)}MB
                      </Typography>
                    </Box>
                  )}

                  {/* Error Alert */}
                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                      {error}
                    </Alert>
                  )}

                  {/* Success Alert */}
                  {success && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                      {success}
                    </Alert>
                  )}

                  {/* Upload Progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Uploading...</Typography>
                        <Typography variant="body2">{uploadProgress}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                    </Box>
                  )}

                  {/* Status Display */}
                  {taskStatus && (
                    <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {taskStatus.status === 'SUCCESS' && (
                          <CheckCircle sx={{ color: 'success.main' }} />
                        )}
                        {taskStatus.status === 'FAILURE' && (
                          <ErrorIcon sx={{ color: 'error.main' }} />
                        )}
                        {!['SUCCESS', 'FAILURE'].includes(taskStatus.status) && (
                          <CircularProgress size={24} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Status: {taskStatus.status}
                        </Typography>
                      </Box>
                      {taskStatus.duration && (
                        <Typography variant="caption" color="textSecondary">
                          Processing time: {taskStatus.duration.toFixed(2)}s
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleUpload}
                      disabled={!file || loading}
                      startIcon={
                        loading ? (
                          <CircularProgress size={20} />
                        ) : (
                          <CloudUpload />
                        )
                      }
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
            >
              <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                    Results
                  </Typography>

                  {!taskStatus ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Info sx={{ fontSize: 48, color: 'textSecondary', mb: 2 }} />
                      <Typography color="textSecondary">
                        Upload an audio file to get started
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {taskStatus.zip_url && (
                        <>
                          <ListItem>
                            <ListItemIcon>
                              <CheckCircle sx={{ color: 'success.main' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary="All Stems (ZIP)"
                              secondary={`Download vocals, drums, bass, and other components`}
                            />
                            <Tooltip title="Download all separated stems as ZIP">
                              <IconButton
                                href={taskStatus.zip_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
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
                          <ListItem>
                            <ListItemIcon>
                              <Mic sx={{ color: 'primary.main' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary="Vocals"
                              secondary="Extracted vocal track"
                            />
                            <Tooltip title="Download vocal track">
                              <IconButton
                                href={taskStatus.vocals_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                              >
                                <GetApp />
                              </IconButton>
                            </Tooltip>
                          </ListItem>
                          <Divider />
                        </>
                      )}

                      {taskStatus.accompaniment_url && (
                        <ListItem>
                          <ListItemIcon>
                            <MusicNote sx={{ color: 'primary.main' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary="Accompaniment (Instrumental)"
                            secondary="Music without vocals"
                          />
                          <Tooltip title="Download instrumental track">
                            <IconButton
                              href={taskStatus.accompaniment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                            >
                              <GetApp />
                            </IconButton>
                          </Tooltip>
                        </ListItem>
                      )}

                      {!taskStatus.zip_url && !taskStatus.vocals_url && (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <CircularProgress sx={{ mb: 2 }} />
                          <Typography>Processing your audio...</Typography>
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
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
            How It Works
          </Typography>
          <Grid container spacing={3}>
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
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
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
