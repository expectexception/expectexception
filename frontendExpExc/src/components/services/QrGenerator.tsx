import React, { useState } from 'react';
import {
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
  useTheme,
} from '@mui/material';
import {
  Download,
  Share,
  Refresh,
  CopyAll,
  QrCode as QrCodeIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 12 }}>
    {value === index && children}
  </div>
);

const QrGenerator: React.FC = () => {
  const theme = useTheme();
  const [url, setUrl] = useState('https://expectexception.com');
  const [size, setSize] = useState(220);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [includeMargin, setIncludeMargin] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Client-side generation, no backend call needed — the QR code is rendered
  // entirely in the browser from local state (url, fgColor, bgColor, size).

  const qrRef = React.useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
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
    { label: 'Primary', value: theme.palette.primary.main },
    { label: 'Secondary', value: theme.palette.secondary.main },
  ];

  const presetSizes = [
    { label: 'Small', value: 128 },
    { label: 'Medium', value: 220 },
    { label: 'Large', value: 320 },
  ];

  return (
    <ServicePageShell
      icon={QrCodeIcon}
      title="QR Code Generator"
      subtitle="Convert any URL or text into a customizable QR code"
      maxWidth="md"
    >
      <Seo
        title="Free QR Code Generator - Custom & High Quality"
        toolId={10}
      />

      {error && (
        <Alert severity="info" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Column - QR Preview */}
        <Grid item xs={12} sm={5} sx={{ display: 'flex' }}>
          <Card sx={{ width: '100%' }}>
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <Box
                ref={qrRef}
                sx={{
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 2,
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
                    level="H"
                  />
                ) : (
                  <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption">Enter Text/URL</Typography>
                  </Box>
                )}
              </Box>

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Scan this QR code with any smartphone camera
              </Typography>

              <Stack direction="row" spacing={1.5} justifyContent="center">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Download />}
                  onClick={handleDownload}
                >
                  Download PNG
                </Button>
                <Button
                  variant="outlined"
                  size="small"
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
        <Grid item xs={12} sm={7} sx={{ display: 'flex', minHeight: 0 }}>
          <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', p: 2.5 }}>
              <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} sx={{ mb: 2, minHeight: 36 }}>
                <Tab label="Basic" sx={{ minHeight: 36, py: 0.5 }} />
                <Tab label="Advanced" sx={{ minHeight: 36, py: 0.5 }} />
                <Tab label="Appearance" sx={{ minHeight: 36, py: 0.5 }} />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <TextField
                  fullWidth
                  size="small"
                  label="URL or Text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  InputProps={{
                    startAdornment: (
                      <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                    ),
                    endAdornment: (
                      <Tooltip title="Copy URL">
                        <IconButton size="small" onClick={handleCopyUrl}>
                          <CopyAll fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                  Size
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                  {presetSizes.map((preset) => (
                    <Chip
                      key={preset.value}
                      label={preset.label}
                      size="small"
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
                  max={400}
                  step={16}
                  valueLabelDisplay="auto"
                  size="small"
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
                  sx={{ mb: 2 }}
                />

                <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
                  Error correction is fixed at level H (high) for maximum scan
                  reliability, allowing the code to remain readable even if
                  partially damaged or obscured.
                </Typography>

                <Button
                  size="small"
                  startIcon={<Refresh />}
                  variant="outlined"
                  onClick={() => {
                    setUrl('https://expectexception.com');
                    setSize(220);
                    setFgColor('#000000');
                    setBgColor('#ffffff');
                  }}
                >
                  Reset to Defaults
                </Button>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      Foreground Color
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      {presetColors.map((color) => (
                        <Tooltip key={color.value} title={color.label}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
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
                      size="small"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-input': { height: 36, borderRadius: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      Background Color
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      {presetColors.map((color) => (
                        <Tooltip key={color.value} title={color.label}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
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
                      size="small"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-input': { height: 36, borderRadius: 1 } }}
                    />
                  </Grid>
                </Grid>
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </ServicePageShell>
  );
};

export default QrGenerator;
