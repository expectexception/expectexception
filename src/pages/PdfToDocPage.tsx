import React, { useState, useRef } from 'react';
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
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Description sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              PDF to DOC Converter
            </Typography>
            <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
              Convert PDF documents to editable Word formats instantly
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Transform your PDF files into editable documents. Supports DOCX, DOC, ODT, RTF, and TXT formats.
              Optional OCR for scanned documents.
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
                    Upload & Configure
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
                      Drop PDF file here or click to select
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
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
                    <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Selected: {file.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Size: {(file.size / 1024 / 1024).toFixed(2)}MB
                      </Typography>
                    </Box>
                  )}

                  {/* Output Format Selection */}
                  <FormControl fullWidth sx={{ mb: 2 }}>
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
                  <Box sx={{ mb: 3, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={ocrEnabled}
                          onChange={(e) => setOcrEnabled(e.target.checked)}
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
                        <Typography variant="body2">Converting...</Typography>
                        <Typography variant="body2">{uploadProgress}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleConvert}
                      disabled={!file || loading}
                      startIcon={
                        loading ? (
                          <CircularProgress size={20} />
                        ) : (
                          <AutoFixHigh />
                        )
                      }
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
                    Download Result
                  </Typography>

                  {!conversionStatus ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Info sx={{ fontSize: 48, color: 'textSecondary', mb: 2 }} />
                      <Typography color="textSecondary">
                        Upload a PDF file to get started
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {conversionStatus.file_url && (
                        <Box sx={{ mb: 3 }}>
                          <List>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircle sx={{ color: 'success.main' }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={conversionStatus.filename || 'Converted Document'}
                                secondary={`Format: ${conversionStatus.format || outputFormat.toUpperCase()}`}
                              />
                              <Tooltip title="Download converted file">
                                <IconButton
                                  href={conversionStatus.file_url}
                                  component="a"
                                  download
                                  size="small"
                                >
                                  <FileDownload />
                                </IconButton>
                              </Tooltip>
                            </ListItem>
                          </List>
                        </Box>
                      )}

                      {conversionStatus.error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                          {conversionStatus.error}
                        </Alert>
                      )}

                      {!conversionStatus.file_url && !conversionStatus.error && (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <CircularProgress sx={{ mb: 2 }} />
                          <Typography>Converting PDF...</Typography>
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
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
            Features
          </Typography>
          <Grid container spacing={3}>
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

import { motion } from 'framer-motion';
export default PdfToDocPage;
