import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Stack,
  IconButton,
  useTheme,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  RocketLaunch,
  Download,
  QrCode,
  Code,
  ArrowForward,
  TrendingUp,
  Security,
  Speed,
  Newspaper,
  VolumeUp,
  Compress,
  Movie,
  Psychology,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { Post } from '../types';
import Seo from '../components/seo/Seo';
import { staticServices, staticStats } from '../data/StaticData';

const HomePage: React.FC = () => {
  const theme = useTheme();
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [services, setServices] = useState<any[]>(staticServices);
  const [stats, setStats] = useState(staticStats);

  // SoftwareApplication Schema for Google Rich Snippets
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ExpectException Developer Tools",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "A comprehensive suite of free developer tools: YouTube Downloader, PDF Converter, OCR, AI Detector, and more.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1250"
    }
  };

  useEffect(() => {
    fetchLatestPosts();
    fetchServices();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get(endpoints.services.downloadStats);
      if (response.data) {
        setStats(response.data);
      }
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await apiClient.get(endpoints.services.tools + '?ordering=-popularity');
      const results = (response.data.results || response.data).slice(0, 4);
      if (results && results.length > 0) {
        setServices(results);
      }
    } catch (e) {
      console.error('Failed to fetch services', e);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Download': return <Download fontSize="large" />;
      case 'Movie': return <Movie fontSize="large" />;
      case 'QrCode': return <QrCode fontSize="large" />;
      case 'Code': return <Code fontSize="large" />;
      case 'VolumeUp': return <VolumeUp fontSize="large" />;
      case 'Compress': return <Compress fontSize="large" />;
      case 'Psychology': return <Psychology fontSize="large" />;
      case 'RocketLaunch': return <RocketLaunch fontSize="large" />;
      default: return <Code fontSize="large" />;
    }
  };

  const fetchLatestPosts = async () => {
    try {
      const response = await apiClient.get(endpoints.blog.posts);
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setLatestPosts(data.slice(0, 3));
    } catch (e) {
      console.error('Failed to fetch stats/posts', e);
    } finally {
      setLoadingPosts(false);
    }
  };



  const features = [
    {
      icon: <Speed />,
      title: 'Fast Processing',
      description: 'Lightning-fast tool processing with minimal wait times.',
    },
    {
      icon: <Security />,
      title: 'Secure & Safe',
      description: 'All tools run client-side. No data storage on our servers.',
    },
    {
      icon: <TrendingUp />,
      title: 'Always Updated',
      description: 'Regular updates with new features and improvements.',
    },
  ];

  // Helper date formatter
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Box sx={{ minHeight: '100vh', pb: 8 }}>
      <Seo
        title="Free Developer Tools & Services"
        description="Access free, high-performance developer tools: YouTube 4K Downloader, PDF to Word Converter, AI Image Detector, OCR, and Image Compressor. No signup required."
        keywords={[
          'youtube downloader 4k',
          'pdf to word converter free',
          'ai image detector',
          'image compressor online',
          'ocr online free',
          'developer tools',
          'json formatter',
          'qr code generator',
          'free developer utilities',
          'online productivity tools',
          'background remover ai',
          'base64 encoder decoder',
          'secure hash generator',
          'pdf merger and splitter',
          'uuid gui generator',
          'color converter online'
        ]}
        structuredData={appSchema}
      />
      {/* Hero Section */}

      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          backdropFilter: 'blur(10px)',
          color: 'text.primary',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Chip
                  label="🚀 Version 2.0 Launched"
                  sx={{
                    bgcolor: 'white',
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    mb: 3,
                  }}
                />
                <Typography variant="h1" gutterBottom sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' }, lineHeight: 1.1 }}>
                  Supercharge Your{' '}
                  <Box component="span" sx={{ color: theme.palette.primary.main }}>
                    Workflow
                  </Box>
                </Typography>
                <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, fontWeight: 400, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  A comprehensive suite of tools for developers, content creators, and power users.
                  Everything you need in one place.
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                  <Button
                    component={Link}
                    to="/services"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      color: 'white',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                      },
                    }}
                  >
                    Explore Tools
                  </Button>
                  <Button
                    component={Link}
                    to="/downloads"
                    variant="outlined"
                    size="large"
                    sx={{
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      '&:hover': {
                        borderColor: theme.palette.primary.dark,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                      },
                    }}
                  >
                    Download Hub
                  </Button>
                </Stack>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      bottom: -20,
                      left: -20,
                      background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
                      borderRadius: 4,
                    },
                  }}
                >
                  <Card
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Tool Stats Today
                      </Typography>
                      <Grid container spacing={2}>
                        {[
                          { label: 'Total Tools', value: stats.total_tools, change: '+2' },
                          { label: 'Downloads', value: stats.total_downloads, change: '+12%' },
                          { label: 'Active Users', value: stats.active_users, change: '+5%' },
                          { label: 'Success Rate', value: stats.success_rate, change: '+0.1%' },
                        ].map((stat, index) => (
                          <Grid item xs={6} key={index}>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                              {stat.value}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              {stat.label}
                              <Box component="span" sx={{ color: '#4ade80', ml: 1 }}>
                                {stat.change}
                              </Box>
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Typography variant="h2" textAlign="center" gutterBottom sx={{ fontWeight: 700 }}>
          Why Choose ExpectException?
        </Typography>
        <Typography
          variant="h6"
          textAlign="center"
          color="text.secondary"
          sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}
        >
          Built with performance, security, and user experience in mind
        </Typography>

        <Grid container spacing={2} sx={{ mb: 8 }}>
          {features.map((feature, index) => (
            <Grid item xs={6} md={4} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(30, 41, 59, 0.2) 100%)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                      boxShadow: '0 16px 48px -12px rgba(59, 130, 246, 0.3)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2.5, sm: 4 }, textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: { xs: 60, sm: 80 },
                        height: { xs: 60, sm: 80 },
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: { xs: 2, sm: 3 },
                      }}
                    >
                      <IconButton
                        sx={{
                          bgcolor: theme.palette.primary.main,
                          color: 'white',
                          '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                          },
                        }}
                      >
                        {feature.icon}
                      </IconButton>
                    </Box>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Services Section */}
        <Typography variant="h2" textAlign="center" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
          Our Services
        </Typography>
        <Typography
          variant="h6"
          textAlign="center"
          color="text.secondary"
          sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}
        >
          Powerful tools designed to simplify your workflow
        </Typography>

        <Grid container spacing={4}>
          {services.map((service, index) => (
            <Grid item xs={6} md={3} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -12 }}
              >
                <Card
                  component={Link}
                  to={service.path}
                  sx={{
                    height: '100%',
                    textDecoration: 'none',
                    color: 'inherit',
                    position: 'relative',
                    overflow: 'hidden',
                    background: `linear-gradient(135deg, ${alpha(theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main, 0.05)} 0%, rgba(30, 41, 59, 0.3) 100%)`,
                    backdropFilter: 'blur(20px)',
                    // border: `2px solid ${alpha(theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main, 0.2)}`,
                    borderRadius: 3,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: `linear-gradient(90deg, ${theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main}, ${theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.light || theme.palette.primary.light})`,
                      transform: 'scaleX(0)',
                      transformOrigin: 'left',
                      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                    '&:hover': {
                      transform: 'translateY(-16px) scale(1.03)',
                      boxShadow: `0 24px 64px -16px ${alpha(theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main, 0.5)}`,
                      borderColor: theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main,
                      bgcolor: `${alpha(theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main, 0.08)}`,
                      '&::before': {
                        transform: 'scaleX(1)',
                      },
                      '& .service-icon': {
                        transform: 'scale(1.15) rotate(5deg)',
                        boxShadow: `0 8px 24px ${alpha(theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main, 0.4)}`,
                      },
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <Box
                      className="service-icon"
                      sx={{
                        width: { xs: 50, sm: 80 },
                        height: { xs: 50, sm: 80 },
                        borderRadius: { xs: '12px', sm: '20px' },
                        background: `linear-gradient(135deg, ${theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main}, ${theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.dark || theme.palette.primary.dark})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: { xs: 1.5, sm: 3 },
                        color: 'white',
                        boxShadow: `0 8px 16px ${alpha(theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main, 0.3)}`,
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {getIcon(service.icon)}
                    </Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>
                      {service.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: { xs: 1, sm: 3 },
                        minHeight: { xs: '36px', sm: '48px' },
                        lineHeight: { xs: 1.4, sm: 1.6 },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        display: { xs: '-webkit-box', sm: 'block' },
                        overflow: { xs: 'hidden', sm: 'visible' },
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                      }}
                    >
                      {service.description}
                    </Typography>
                    <Button
                      endIcon={<ArrowForward />}
                      size="small"
                      sx={{
                        mt: 'auto',
                        color: theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main,
                        fontWeight: 600,
                        fontSize: { xs: '0.7rem', sm: '0.875rem' },
                        '&:hover': {
                          bgcolor: alpha(theme.palette[service.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main, 0.15),
                          transform: 'translateX(4px)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Try Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Latest Blogs Section */}
      <Box sx={{ bgcolor: 'background.default', py: 8 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h2" sx={{ fontWeight: 700 }}>
              Latest Blogs
            </Typography>
            <Button
              component={Link}
              to="/blogs"
              variant="outlined"
              endIcon={<ArrowForward />}
            >
              View All Blogs
            </Button>
          </Box>

          <Grid container spacing={3}>
            {loadingPosts ? (
              // Skeletons
              [1, 2, 3].map(n => (
                <Grid item xs={12} md={4} key={n}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="rectangular" height={100} sx={{ my: 1 }} />
                      <Skeleton variant="text" width="40%" />
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : latestPosts.length > 0 ? (
              latestPosts.map((blog, index) => (
                <Grid item xs={12} md={4} key={blog.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(30, 41, 59, 0.3) 100%)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          borderColor: 'rgba(139, 92, 246, 0.4)',
                          boxShadow: '0 16px 48px -12px rgba(139, 92, 246, 0.3)',
                        },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Chip label="Blog" size="small" color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(blog.created_at)}
                          </Typography>
                        </Box>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          {blog.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>
                          {blog.content}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Button
                            component={Link}
                            to={`/blogs/${blog.id}`}
                            size="small"
                            endIcon={<ArrowForward />}
                          >
                            Read More
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Newspaper sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No recent updates. Check back later!
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Card
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <CardContent sx={{ p: 6, textAlign: 'center' }}>
            <RocketLaunch sx={{ fontSize: 60, color: 'primary.main', mb: 3 }} />
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
              Ready to Get Started?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Join thousands of users who trust ExpectException for their daily workflow needs.
              No registration required.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                component={Link}
                to="/services"
                variant="contained"
                size="large"
                startIcon={<RocketLaunch />}
              >
                Explore All Tools
              </Button>
              <Button
                component={Link}
                to="/downloads"
                variant="outlined"
                size="large"
              >
                Visit Download Hub
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default HomePage;