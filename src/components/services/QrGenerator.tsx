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
  Slider,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Download,
  Share,
  Refresh,
  CopyAll,
  QrCode as QrCodeIcon,
  Link as LinkIcon,
  Palette,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 20 }}>
    {value === index && children}
  </div>
);

const QrGenerator: React.FC = () => {
  const [url, setUrl] = useState('https://expectexception.com');
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [includeMargin, setIncludeMargin] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [logo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);



  // Client-side generation, no backend call needed.
  // We can just rely on the state (url, fgColor, bgColor) to render the QR code directly.


  const qrRef = React.useRef<HTMLDivElement>(null);

  const handleDownload = async (format: 'png' | 'svg') => {
    if (!qrRef.current) return;
    try {
      const canvas = await html2canvas(qrRef.current);
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `qr-code-${Date.now()}.png`);
        }
      });
    } catch (err) {
      console.error('Download failed', err);
      setError('Failed to download QR code');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QR Code',
          text: `Check out this QR code for ${url}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setError('Link copied to clipboard!');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    setError('URL copied to clipboard!');
    setTimeout(() => setError(null), 3000);
  };

  const presetColors = [
    { label: 'Black', value: '#000000' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Green', value: '#10b981' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Red', value: '#ef4444' },
  ];

  const presetSizes = [
    { label: 'Small', value: 128 },
    { label: 'Medium', value: 256 },
    { label: 'Large', value: 384 },
    { label: 'XLarge', value: 512 },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Seo
        title="Free QR Code Generator - Custom & High Quality"
        description="Create custom QR codes instantly. Free online QR code generator for URLs, text, WiFi, and more. Customize colors, size, and download in high resolution."
        keywords={[
          'qr code generator',
          'free qr code',
          'custom qr code',
          'create qr code online',
          'wifi qr code',
          'qr code maker',
          'qr generator online',
          'qr code download',
          'generate qr code for free',
          'vector qr code generator',
          'branded qr code',
          'qr code with logo',
          'high res qr code',
          'qr code for business cards'
        ]}
      />

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
        QR Code Generator
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Convert any URL or text into a customizable QR code
      </Typography>

      {error && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Column - QR Preview */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box
                ref={qrRef}
                sx={{
                  p: 4,
                  bgcolor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 3,
                  display: 'inline-block',
                }}
              >
                {url ? (
                  <QRCodeSVG
                    value={url}
                    size={size}
                    fgColor={fgColor}
                    bgColor={bgColor}
                    includeMargin={includeMargin}
                    level="H" // Make it high error correction by default or configurable? The UI has config.
                  />
                ) : (
                  <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption">Enter Text/URL</Typography>
                  </Box>
                )}
                {logo && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: size * 0.2,
                      height: size * 0.2,
                      bgcolor: 'white',
                      borderRadius: '50%',
                      p: 1,
                    }}
                  >
                    {/* Logo placeholder */}
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        bgcolor: 'primary.main',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <QrCodeIcon />
                    </Box>
                  </Box>
                )}
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Scan this QR code with any smartphone camera
              </Typography>

              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={() => handleDownload('png')}
                >
                  Download PNG
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={handleShare}
                >
                  Share
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Controls */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} sx={{ mb: 3 }}>
                <Tab label="Basic" />
                <Tab label="Advanced" />
                <Tab label="Appearance" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <TextField
                  fullWidth
                  label="URL or Text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  InputProps={{
                    startAdornment: (
                      <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    ),
                    endAdornment: (
                      <Tooltip title="Copy URL">
                        <IconButton onClick={handleCopyUrl}>
                          <CopyAll />
                        </IconButton>
                      </Tooltip>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <Typography gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                  Size
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                  {presetSizes.map((preset) => (
                    <Chip
                      key={preset.value}
                      label={preset.label}
                      onClick={() => setSize(preset.value)}
                      color={size === preset.value ? 'primary' : 'default'}
                      variant={size === preset.value ? 'filled' : 'outlined'}
                    />
                  ))}
                </Stack>
                <Slider
                  value={size}
                  onChange={(_, value) => setSize(value as number)}
                  min={64}
                  max={512}
                  step={32}
                  marks
                  valueLabelDisplay="auto"
                  sx={{ mb: 4 }}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeMargin}
                      onChange={(e) => setIncludeMargin(e.target.checked)}
                    />
                  }
                  label="Include margin around QR code"
                  sx={{ mb: 3 }}
                />

                <Typography gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                  Error Correction Level
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                  {['L', 'M', 'Q', 'H'].map((level) => (
                    <Chip
                      key={level}
                      label={`Level ${level}`}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Stack>

                <Button
                  startIcon={<Refresh />}
                  variant="outlined"
                  onClick={() => {
                    setUrl('https://expectexception.com');
                    setSize(256);
                    setFgColor('#000000');
                    setBgColor('#ffffff');
                  }}
                >
                  Reset to Defaults
                </Button>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Typography gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                  Colors
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Foreground Color
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      {presetColors.map((color) => (
                        <Tooltip key={color.value} title={color.label}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: color.value,
                              cursor: 'pointer',
                              border: fgColor === color.value ? '3px solid' : '2px solid',
                              borderColor: fgColor === color.value ? 'primary.main' : 'transparent',
                            }}
                            onClick={() => setFgColor(color.value)}
                          />
                        </Tooltip>
                      ))}
                    </Stack>
                    <TextField
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-input': {
                          height: 50,
                          borderRadius: 1,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Background Color
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      {presetColors.map((color) => (
                        <Tooltip key={color.value} title={color.label}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: color.value,
                              cursor: 'pointer',
                              border: bgColor === color.value ? '3px solid' : '2px solid',
                              borderColor: bgColor === color.value ? 'primary.main' : 'transparent',
                            }}
                            onClick={() => setBgColor(color.value)}
                          />
                        </Tooltip>
                      ))}
                    </Stack>
                    <TextField
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-input': {
                          height: 50,
                          borderRadius: 1,
                        },
                      }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4 }}>
                  <Typography gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                    Add Logo (Optional)
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Palette />}
                    onClick={() => {
                      // Implement logo upload logic
                    }}
                  >
                    Upload Logo
                  </Button>
                </Box>
              </TabPanel>

              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Tip:</strong> Higher error correction levels allow the QR code to still work if it gets damaged,
                  but they also make the QR code more complex.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Usage Examples */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
          Common Use Cases
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {[
            {
              title: 'Business Cards',
              description: 'Add QR codes to digital business cards for instant contact sharing.',
              color: 'primary',
            },
            {
              title: 'WiFi Sharing',
              description: 'Generate QR codes for WiFi credentials for easy network access.',
              color: 'secondary',
            },
            {
              title: 'Payment Links',
              description: 'Create QR codes for payment links and donation pages.',
              color: 'success',
            },
            {
              title: 'Event Tickets',
              description: 'Generate unique QR codes for event tickets and registrations.',
              color: 'warning',
            },
          ].map((useCase, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: `${useCase.color}.light`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: `${useCase.color}.main`,
                      mb: 2,
                    }}
                  >
                    <QrCodeIcon />
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {useCase.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {useCase.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container >
  );
};

export default QrGenerator;