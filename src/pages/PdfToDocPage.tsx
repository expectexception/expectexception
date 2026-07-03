import React, { useState, useRef } from 'react';
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
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Stack,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  FileDownload,
  CheckCircle,
  Error as ErrorIcon,
  GetApp,
  Description,
  Settings,
  Info,
  Close,
  AutoFixHigh,
} from '@mui/icons-material';
import Seo from '../components/seo/Seo';
import ServicePageHero from '../components/services/ServicePageHero';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

interface ConversionStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  filename?: string;
  error?: string;
  format?: string;
  ocr_used?: boolean;
}

const PdfToDocPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [outputFormat, setOutputFormat] = useState('docx');
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [language, setLanguage] = useState('eng');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const SUPPORTED_FORMATS = ['docx', 'doc', 'odt', 'rtf', 'txt'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate PDF format
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file');
      return;
    }

    // Validate size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `File too large (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum: 50MB`
      );
      return;
    }

    setFile(selectedFile);
    setError('');
    setSuccess('');
  };

  const handleConvert = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('format', outputFormat);
      formData.append('ocr_enabled', String(ocrEnabled));
      formData.append('language', language);

      const response = await apiClient.post(
        endpoints.services.pdfToDoc,
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
        setSuccess('Conversion started. This may take a moment...');
        pollStatus(response.data.task_id);
      } else {
        // Sync mode response
        setConversionStatus({
          ...response.data,
          status: 'completed',
        });
        setSuccess('Conversion complete!');
        setLoading(false);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to start conversion'
      );
      setLoading(false);
    }
  };

  const pollStatus = async (id: string) => {
    try {
      const response = await apiClient.get(`${endpoints.services.pdfToDoc}/status/${id}/`);
      setConversionStatus(response.data);

      if (response.data.status === 'success' || response.data.file_url) {
        setSuccess('Conversion complete!');
        setLoading(false);
      } else if (response.data.status === 'failed' || response.data.error) {
        setError(`Conversion failed: ${response.data.error || 'Unknown error'}`);
        setLoading(false);
      } else {
        // Keep polling
        setTimeout(() => pollStatus(id), 2000);
      }
    } catch (err: any) {
      console.error('Status poll error:', err);
      setTimeout(() => pollStatus(id), 5000);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTaskId(null);
    setConversionStatus(null);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Seo
        title="PDF to DOC Converter - Convert PDF to Word Documents"
        description="Convert PDF files to DOCX, DOC, ODT, RTF, or TXT format with optional OCR for scanned documents."
        image="/images/pdf-converter.jpg"
      />
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <ServicePageHero
          icon={Description}
          title="PDF to DOC Converter"
          subtitle="Transform your PDF files into editable Word documents. Supports DOCX, DOC, ODT, RTF, and TXT formats, with optional OCR for scanned documents."
        />

        <Grid container spacing={4} sx={{ mb: 8 }}>
          {/* Upload & Config Panel */}
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
                    Upload & Configure
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
                      Drop PDF file here or click to select
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Maximum file size: 50MB
                    </Typography>
                  </Box>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
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

                  {/* Output Format Selection */}
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Output Format</InputLabel>
                    <Select
                      value={outputFormat}
                      label="Output Format"
                      onChange={(e) => setOutputFormat(e.target.value)}
                    >
                      {SUPPORTED_FORMATS.map((fmt) => (
                        <MenuItem key={fmt} value={fmt}>
                          {fmt.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* OCR Options */}
                  <Box sx={{
                    mb: 4,
                    p: 2.5,
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px'
                  }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={ocrEnabled}
                          onChange={(e) => setOcrEnabled(e.target.checked)}
                          sx={{
                            color: 'rgba(255, 255, 255, 0.3)',
                            '&.Mui-checked': {
                              color: '#3dfc55',
                            },
                          }}
                        />
                      }
                      label="Enable OCR for scanned documents"
                    />
                    {ocrEnabled && (
                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>OCR Language</InputLabel>
                        <Select
                          value={language}
                          label="OCR Language"
                          onChange={(e) => setLanguage(e.target.value)}
                        >
                          {[
                            { code: 'eng', name: 'English' },
                            { code: 'spa', name: 'Spanish' },
                            { code: 'fra', name: 'French' },
                            { code: 'deu', name: 'German' },
                            { code: 'ita', name: 'Italian' },
                            { code: 'por', name: 'Portuguese' },
                          ].map((lang) => (
                            <MenuItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>

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
                        <Typography variant="body2" fontWeight="600">Converting...</Typography>
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

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={2.5}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleConvert}
                      disabled={!file || loading}
                      startIcon={
                        loading ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <AutoFixHigh />
                        )
                      }
                      sx={{
                        py: 1.5,
                        borderRadius: '10px',
                        fontWeight: 700
                      }}
                    >
                      {loading ? 'Converting...' : 'Start Conversion'}
                    </Button>
                    {file && (
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
                    Download Result
                  </Typography>

                  {!conversionStatus ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Info sx={{ fontSize: 50, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary" variant="body1">
                        Upload a PDF file to start conversion
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {conversionStatus.file_url && (
                        <Box sx={{ mb: 4 }}>
                          <List sx={{ p: 0 }}>
                            <ListItem sx={{ py: 2, px: 1 }}>
                              <ListItemIcon>
                                <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={<Typography variant="subtitle1" fontWeight="700">{conversionStatus.filename || 'Converted Document'}</Typography>}
                                secondary={`Format: ${conversionStatus.format || outputFormat.toUpperCase()}`}
                              />
                              <Tooltip title="Download converted file">
                                <IconButton
                                  href={conversionStatus.file_url}
                                  component="a"
                                  download
                                  sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', p: 1.25 }}
                                >
                                  <FileDownload />
                                </IconButton>
                              </Tooltip>
                            </ListItem>
                          </List>
                        </Box>
                      )}

                      {conversionStatus.error && (
                        <Alert severity="error" variant="filled" sx={{ mb: 4, borderRadius: '12px' }}>
                          {conversionStatus.error}
                        </Alert>
                      )}

                      {!conversionStatus.file_url && !conversionStatus.error && (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                          <CircularProgress sx={{ mb: 2.5, color: '#3dfc55' }} />
                          <Typography variant="body1">Converting PDF...</Typography>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Features */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: '800', mb: 4.5, textAlign: 'center' }}>
            Features
          </Typography>
          <Grid container spacing={3.5}>
            {[
              {
                title: 'Multiple Formats',
                description: 'Convert to DOCX, DOC, ODT, RTF, or TXT',
              },
              {
                title: 'OCR Support',
                description: 'Extract text from scanned PDF images',
              },
              {
                title: 'High Quality',
                description: 'Preserve layout and formatting',
              },
              {
                title: 'Fast Processing',
                description: 'Most PDFs convert in seconds',
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

export default PdfToDocPage;
