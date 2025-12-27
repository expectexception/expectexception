import React, { useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Search,
  Download,
  QrCode,
  Code,
  Link as LinkIcon,
  Movie,
  Sort,
  Star,
  TrendingUp,
  VolumeUp,
  Compress,
  Psychology,
  Description,
  RecordVoiceOver,
  Terminal,
  MergeType,
  PhotoSizeSelectActual,
  EnhancedEncryption,
  PictureAsPdf,
  AutoFixHigh,
  Fingerprint,
  Create,
  Lock,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/seo/Seo';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { staticServices, staticStats } from '../data/StaticData';

const ServicesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [services, setServices] = useState<any[]>(staticServices);

  const [stats, setStats] = useState(staticStats);

  React.useEffect(() => {
    const fetchServicesAndStats = async () => {
      // Skip API call during static generation to prevent hydration mismatch
      // The initial state (staticServices) will be used for SEO, which matches the static data.
      if (navigator.userAgent === 'ReactSnap') {
        return;
      }
      try {
        const [servicesRes, statsRes] = await Promise.all([
          apiClient.get(endpoints.services.tools), // Use stable ordering
          apiClient.get(endpoints.services.downloadStats)
        ]);
        setServices(servicesRes.data.results || servicesRes.data);
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchServicesAndStats();
  }, []);

  // ... (rest of the component)

  const statsDisplay = [
    { label: 'Total Tools', value: stats.total_tools, icon: <Code /> },
    { label: 'Active Users', value: stats.active_users, icon: <TrendingUp /> },
    { label: 'Success Rate', value: stats.success_rate, icon: <Star /> },
    { label: 'Uptime', value: stats.uptime, icon: <LinkIcon /> },
  ];

  // Replace the render part near the end


  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Download': return <Download fontSize="large" />;
      case 'Movie': return <Movie fontSize="large" />;
      case 'QrCode': return <QrCode fontSize="large" />;
      case 'Code': return <Code fontSize="large" />;
      case 'VolumeUp': return <VolumeUp fontSize="large" />;
      case 'Compress': return <Compress fontSize="large" />;
      case 'Psychology': return <Psychology fontSize="large" />;
      case 'Description': return <Description fontSize="large" />;
      case 'Link': return <LinkIcon fontSize="large" />;
      case 'RecordVoiceOver': return <RecordVoiceOver fontSize="large" />;
      case 'Terminal': return <Terminal fontSize="large" />;
      case 'MergeType': return <MergeType fontSize="large" />;
      case 'PhotoSizeSelectActual': return <PhotoSizeSelectActual fontSize="large" />;
      case 'EnhancedEncryption': return <EnhancedEncryption fontSize="large" />;
      case 'PictureAsPdf': return <PictureAsPdf fontSize="large" />;
      case 'AutoFixHigh': return <AutoFixHigh fontSize="large" />;
      case 'Fingerprint': return <Fingerprint fontSize="large" />;
      case 'Create': return <Create fontSize="large" />;
      case 'Lock': return <Lock fontSize="large" />;
      default: return <Code fontSize="large" />;
    }
  };





  const categories = [
    { label: 'All Tools', value: 'all', count: services.length },
    { label: 'Download', value: 'download', count: services.filter(s => s.category === 'download').length },
    { label: 'Converter', value: 'converter', count: services.filter(s => s.category === 'converter').length },
    { label: 'Developer', value: 'developer', count: services.filter(s => s.category === 'developer').length },
    { label: 'Media', value: 'media', count: services.filter(s => s.category === 'media').length },
  ];

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(search.toLowerCase()) ||
      service.description.toLowerCase().includes(search.toLowerCase()) ||
      service.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' || service.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Seo
        title="All Tools & Services - Free Developer Utilities"
        description="Explore our curated collection of high-performance developer tools: YouTube Downloader, AI Image Detector, PDF Merger, URL Converter, and more. All free and ready to use."
        keywords={[
          'developer tools',
          'free online tools',
          'youtube downloader 4k',
          'yt to mp3 converter',
          'pdf to word online free',
          'ai detector chatgpt',
          'json formatter and validator',
          'qr code generator custom',
          'online conversion tools',
          'image processing utilities',
          'productivity software free',
          'web developer toolkit 2025',
          'all-in-one dev tools',
          'free document converters',
          'online encryption tools sha256',
          'technical utilities for programmers',
          'creative tools online',
          'base64 converter',
          'image to text ocr free',
          'background removal ai',
          'pdf merger splitter online'
        ]}
      />

      {/* Header */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>
          All Services
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Choose from our collection of powerful tools designed to boost your productivity
        </Typography>
      </Box>

      {/* Filters and Search */}
      <Card sx={{ mb: 4, p: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search tools by name, description, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end">
              <ToggleButtonGroup
                value={filter}
                exclusive
                onChange={(_, value) => value && setFilter(value)}
                size="small"
              >
                {categories.map((category) => (
                  <ToggleButton key={category.value} value={category.value}>
                    {category.label}
                    <Chip
                      label={category.count}
                      size="small"
                      sx={{ ml: 1, height: 20 }}
                    />
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Tooltip title="Sort by">
                <IconButton>
                  <Sort />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Services Grid */}
      <AnimatePresence>
        <Grid container spacing={3}>
          {filteredServices.map((service, index) => (
            <Grid item xs={12} sm={6} md={4} key={service.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                <Card sx={{ height: '100%', minHeight: '340px' }}>
                  <CardContent>
                    {/* Service Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          bgcolor: (theme) => alpha(theme.palette[service.color as keyof typeof service.color]?.main || theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: (theme) => theme.palette[service.color as keyof typeof service.color]?.main,
                        }}
                      >
                        {getIcon(service.icon)}
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Star sx={{ color: 'warning.main', fontSize: 16 }} />
                        <Typography variant="body2" fontWeight={600}>
                          {service.popularity}%
                        </Typography>
                      </Stack>
                    </Box>

                    {/* Service Content */}
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      {service.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 3,
                        height: '48px', // Fixed height
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                      }}
                    >
                      {service.description}
                    </Typography>

                    {/* Tags */}
                    <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                      {service.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        component={Link}
                        to={service.path}
                        variant="contained"
                        size="small"
                      >
                        Open Tool
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        Free to use
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </AnimatePresence>

      {/* No Results */}
      {filteredServices.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Search sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No tools found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Try adjusting your search or filter criteria
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </Box>
      )}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mt: 8 }}>
        {statsDisplay.map((stat, index) => (
          <Grid item xs={6} md={3} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    color: 'primary.main',
                    mb: 2,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {stat.icon}
                </Box>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default ServicesPage;