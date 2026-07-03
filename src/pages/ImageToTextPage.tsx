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
  Alert,
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
  Tooltip,
  TextareaAutosize,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  ContentCopy,
  Download,
  CheckCircle,
  Error as ErrorIcon,
  GetApp,
  TextFields,
  Info,
  Close,
  Image as ImageIcon,
} from '@mui/icons-material';
import Seo from '../components/seo/Seo';
import ServicePageHero from '../components/services/ServicePageHero';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

interface OcrResult {
  text: string;
  confidence?: number;
  language?: string;
  format?: string;
  dimensions?: string;
  error?: string;
}

const ImageToTextPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];

  // Load available languages on component mount
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await apiClient.get(`${endpoints.services.imageToText}`);
        setLanguages(response.data.languages || ['eng']);
        setSelectedLanguage(response.data.default || 'eng');
      } catch (err) {
        console.error('Failed to load languages:', err);
        setLanguages(['eng']);
      }
    };

    loadLanguages();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate format
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(fileExt)) {
      setError(`Unsupported format: ${fileExt}. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
      return;
    }

    setFile(selectedFile);
    setError('');
    setSuccess('');
    setOcrResult(null);
  };

  const handleExtract = async () => {
    if (!file) {
      setError('Please select an image file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('language', selectedLanguage);

      const response = await apiClient.post(
        `${endpoints.services.imageToText}/`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      setOcrResult(response.data);
      setSuccess('Text extraction complete!');
      setLoading(false);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to extract text'
      );
      setLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!ocrResult?.text) return;

    try {
      await navigator.clipboard.writeText(ocrResult.text);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleDownloadAsText = () => {
    if (!ocrResult?.text) return;

    const element = document.createElement('a');
    const file = new Blob([ocrResult.text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'extracted-text.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleReset = () => {
    setFile(null);
    setOcrResult(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Seo
        title="Image to Text OCR - Extract Text from Images"
        description="Extract text from images using advanced OCR technology. Supports multiple languages and image formats."
        image="/images/ocr.jpg"
      />
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <ServicePageHero
          icon={TextFields}
          title="Image to Text (OCR)"
          subtitle="Extract text from images using advanced OCR technology. Convert images, scanned documents, and screenshots to editable text. Supports multiple languages and preserves formatting."
        />

        <Grid container spacing={4} sx={{ mb: 8 }}>
          {/* Upload & Settings */}
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
                    Upload Image
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
                      Drop image here or click to select
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supported: JPG, PNG, GIF, BMP, TIFF
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
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <ImageIcon sx={{ color: 'primary.main' }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: '700' }}>
                            {file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Size: {(file.size / 1024).toFixed(2)}KB
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Language Selection */}
                  <FormControl fullWidth sx={{ mb: 4 }}>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={selectedLanguage}
                      label="Language"
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                    >
                      {languages.map((lang) => (
                        <MenuItem key={lang} value={lang}>
                          {lang.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

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

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={2.5}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleExtract}
                      disabled={!file || loading}
                      startIcon={
                        loading ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <TextFields />
                        )
                      }
                      sx={{
                        py: 1.5,
                        borderRadius: '10px',
                        fontWeight: 700
                      }}
                    >
                      {loading ? 'Extracting...' : 'Extract Text'}
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: '800' }}>
                      Extracted Text
                    </Typography>
                    {ocrResult?.text && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={copiedToClipboard ? 'Copied!' : 'Copy to clipboard'}>
                          <IconButton
                            size="small"
                            onClick={handleCopyToClipboard}
                            sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', p: 1 }}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download as text file">
                          <IconButton
                            size="small"
                            onClick={handleDownloadAsText}
                            sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', p: 1 }}
                          >
                            <Download fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                  <Divider sx={{ mb: 3 }} />

                  {!ocrResult ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Info sx={{ fontSize: 50, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary" variant="body1">
                        Upload an image to extract text
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      {ocrResult.error && (
                        <Alert severity="error" variant="filled" sx={{ mb: 3, borderRadius: '12px' }}>
                          {ocrResult.error}
                        </Alert>
                      )}

                      {ocrResult.text && (
                        <>
                          <TextareaAutosize
                            value={ocrResult.text}
                            readOnly
                            style={{
                              width: '100%',
                              minHeight: 300,
                              padding: '16px',
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              borderRadius: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              backgroundColor: 'rgba(0, 0, 0, 0.2)',
                              color: '#ffffff',
                              boxSizing: 'border-box',
                            }}
                          />
                          {ocrResult.confidence && (
                            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
                              Confidence: {(ocrResult.confidence * 100).toFixed(1)}%
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
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
                title: 'Multi-Language Support',
                description: 'Recognize text in English, Spanish, French, German, and more',
              },
              {
                title: 'Multiple Formats',
                description: 'Extract text from JPEG, PNG, GIF, BMP, and TIFF images',
              },
              {
                title: 'High Accuracy',
                description: 'Advanced OCR engine for accurate text recognition',
              },
              {
                title: 'Copy & Download',
                description: 'Easily copy or download extracted text',
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

export default ImageToTextPage;
