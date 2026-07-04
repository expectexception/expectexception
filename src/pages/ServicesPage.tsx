import React, { useState, useEffect } from 'react';
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
  useTheme,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Search,
  Code,
  Link as LinkIcon,
  Sort,
  Star,
  TrendingUp,
  Lock,
  BookmarkBorder,
  Bookmark,
  History,
} from '@mui/icons-material';
import { getServiceSvgIcon } from '../components/layout/AnimatedSvgs';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/seo/Seo';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { staticServices, staticStats } from '../data/StaticData';
import { useToolBookmarks } from '../hooks/useToolBookmarks';
import { useToolHistory } from '../hooks/useToolHistory';

// --- Reusable Border Beam Effect ---
interface BorderBeamProps {
  duration?: number;
  size?: number;
  activeColor?: string;
}

const BorderBeam: React.FC<BorderBeamProps> = ({ duration = 8, size = 150, activeColor }) => {
  const theme = useTheme();
  const baseColor = activeColor || theme.palette.primary.main;
  return (
    <Box
      className="border-beam"
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        pointerEvents: 'none',
        border: '1px solid transparent',
        background: `linear-gradient(90deg, transparent, ${baseColor}, transparent) border-box`,
        mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
        backgroundSize: `${size}px 100%`,
        backgroundRepeat: 'no-repeat',
        animation: `border-beam-move ${duration}s linear infinite`,
        opacity: 0.3,
        '@keyframes border-beam-move': {
          '0%': { backgroundPosition: '0% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }}
    />
  );
};

const ServicesPage: React.FC = () => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const navigate = useNavigate();
  const { toggle: toggleBookmark, isBookmarked } = useToolBookmarks();
  const { history: toolHistory, addToHistory } = useToolHistory();
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [services, setServices] = useState<any[]>(() => {
    return [...staticServices].sort((a, b) => b.popularity - a.popularity);
  });
  const [toolAccess, setToolAccess] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState(staticStats);

  // --- Cost Estimator State ---
  const [pages, setPages] = useState(3);
  const [complexity, setComplexity] = useState('standard');
  const [includeAi, setIncludeAi] = useState(false);
  const [timeline, setTimeline] = useState('standard');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedDays, setEstimatedDays] = useState(0);

  useEffect(() => {
    let basePrice = 500;
    let baseDays = 5;

    // Pages multiplier
    basePrice += pages * 150;
    baseDays += pages * 1.5;

    // Complexity
    if (complexity === 'simple') {
      basePrice += 0;
      baseDays += 0;
    } else if (complexity === 'standard') {
      basePrice += 400;
      baseDays += 4;
    } else if (complexity === 'advanced') {
      basePrice += 1200;
      baseDays += 10;
    }

    // AI Feature
    if (includeAi) {
      basePrice += 800;
      baseDays += 5;
    }

    // Timeline factor
    if (timeline === 'relaxed') {
      basePrice *= 0.9;
      baseDays *= 1.3;
    } else if (timeline === 'rush') {
      basePrice *= 1.35;
      baseDays *= 0.6;
    }

    setEstimatedCost(Math.round(basePrice));
    setEstimatedDays(Math.round(baseDays));
  }, [pages, complexity, includeAi, timeline]);

  useEffect(() => {
    const fetchServicesAndStats = async () => {
      if (navigator.userAgent === 'ReactSnap') {
        return;
      }
      try {
        const [servicesRes, statsRes] = await Promise.all([
          apiClient.get(endpoints.services.tools),
          apiClient.get(endpoints.services.downloadStats)
        ]);

        const normalizePath = (p: string) => {
          if (!p) return p;
          const withoutApi = p.startsWith('/api') ? p.replace(/^\/api/, '') : p;
          return withoutApi.endsWith('/') ? withoutApi.slice(0, -1) : withoutApi;
        };

        const backendList: any[] = (servicesRes.data?.results ?? servicesRes.data) || [];
        const activePaths = new Set(backendList.map((s: any) => normalizePath(s.path)));

        let finalServices = [...staticServices]
          .filter(s => activePaths.size === 0 || activePaths.has(normalizePath(s.path)))
          .sort((a, b) => b.popularity - a.popularity);

        setServices(finalServices);

        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setServices([...staticServices].sort((a, b) => b.popularity - a.popularity));
      }
    };
    fetchServicesAndStats();

    const fetchToolAccess = async () => {
      try {
        const response = await apiClient.get(endpoints.services.toolAccess);
        if (response.data?.tools) {
          setToolAccess(response.data.tools);
        }
      } catch (err) {
        console.error('Failed to fetch tool access:', err);
      }
    };
    fetchToolAccess();
  }, []);

  const statsDisplay = [
    { label: 'Total Tools', value: stats.total_tools, icon: <Code /> },
    { label: 'Active Users', value: stats.active_users, icon: <TrendingUp /> },
    { label: 'Success Rate', value: stats.success_rate, icon: <Star /> },
    { label: 'Uptime', value: stats.uptime, icon: <LinkIcon /> },
  ];


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
    const matchesBookmark = !showBookmarked || isBookmarked(service.id);
    return matchesSearch && matchesFilter && matchesBookmark;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 10 }}>
      <Seo
        title="Free Online Developer Tools – YouTube Downloader, AI Detector, PDF Converter & More"
        description="Explore 20+ free online developer tools: YouTube downloader, AI image detector, PDF to Word converter, image compressor, OCR, text-to-speech, QR generator, and more. No sign-up required."
        keywords={[
          'free online tools 2025',
          'youtube video downloader free',
          'yt to mp4 converter online',
          'yt to mp3 free',
          'ai image detector free',
          'deepfake image checker',
          'chatgpt image detector',
          'pdf to word converter free online',
          'pdf to docx no email',
          'image compressor online',
          'reduce image file size free',
          'ocr online free no signup',
          'extract text from image',
          'text to speech neural ai',
          'qr code generator free',
          'json formatter validator online',
          'secret message sharer',
          'one time secret link',
          'developer utilities',
          'all in one dev tools',
        ]}
        faq={[
          {
            question: 'Is ExpectException free to use?',
            answer: 'Yes, all tools on ExpectException are completely free. No account, subscription, or credit card required.',
          },
          {
            question: 'Can I download YouTube videos for free?',
            answer: 'Yes. Our YouTube Downloader lets you download YouTube videos in MP4, MP3, and other formats directly in your browser with no software installation.',
          },
          {
            question: 'How does the AI Image Detector work?',
            answer: 'Our AI Detector uses ensemble machine-learning models to analyze image artifacts and patterns that indicate AI generation. Upload any image and receive an instant forensic analysis.',
          },
          {
            question: 'Can I convert PDF to Word without an account?',
            answer: 'Absolutely. Our PDF to Word converter supports DOCX, DOC, ODT, RTF, and TXT output. Upload your PDF and download the result — no email or login needed.',
          },
          {
            question: 'Is there a file size limit for image compression?',
            answer: 'We support image files up to 50 MB. Our Image Compressor uses lossless and lossy algorithms to reduce file size by up to 90% while preserving visual quality.',
          },
        ]}
      />


      {/* Header Banner */}
      <Box sx={{ 
        position: 'relative', 
        mb: 8, 
        p: { xs: 4, md: 6 }, 
        borderRadius: '24px', 
        background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.6) 0%, rgba(13, 14, 18, 0.15) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7)'
      }}>
        <BorderBeam activeColor={primaryColor} />
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
        
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h2" component="h1" gutterBottom sx={{
              fontWeight: 900,
              background: `linear-gradient(135deg, #ffffff 30%, ${primaryColor} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em',
              fontSize: { xs: '2.25rem', sm: '3.25rem', md: '3.75rem' },
              lineHeight: 1.15
            }}>
              Tools & Services
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: '650px', mt: 1.5 }}>
              Explore our collection of automated AI agent pipelines and client-side developer utilities designed to accelerate your development workflow.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
            <svg width="100%" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
              <motion.g
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              >
                <rect x="50" y="20" width="100" height="100" rx="16" fill="rgba(13, 14, 18, 0.6)" stroke={primaryColor} strokeWidth="2" style={{ filter: 'drop-shadow(0 0 12px ' + alpha(primaryColor, 0.3) + ')' }} />
                
                <motion.g
                  style={{ originX: '100px', originY: '70px' }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                >
                  <circle cx="100" cy="70" r="16" stroke={theme.palette.secondary.main} strokeWidth="2" strokeDasharray="6 4" />
                </motion.g>
                <circle cx="100" cy="70" r="4" fill="#ffffff" />
                
                <motion.circle cx="30" cy="70" r="6" fill="#a855f7" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
                <motion.circle cx="170" cy="70" r="6" fill="#f97316" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }} />
              </motion.g>
            </svg>
          </Grid>
        </Grid>
      </Box>

      {/* Filters and Search */}
      <Card sx={{ mb: 6, p: 3, background: 'rgba(13, 14, 18, 0.4)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
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
                    <Search sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', overflowX: 'auto', py: 0.5, width: '100%' }}>
                <ToggleButtonGroup
                  value={filter}
                  exclusive
                  onChange={(_, value) => value && setFilter(value)}
                  size="small"
                  sx={{
                    display: 'inline-flex',
                    gap: 1,
                    border: 'none',
                    '& .MuiToggleButtonGroup-grouped': {
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px !important',
                      mx: 0.5,
                    }
                  }}
                >
                  {categories.map((category) => (
                    <ToggleButton
                      key={category.value}
                      value={category.value}
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        px: 2, 
                        py: 0.75,
                        textTransform: 'none',
                        color: '#94a3b8',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        '&.Mui-selected': {
                          color: '#000000',
                          background: primaryColor,
                          borderColor: primaryColor,
                          '&:hover': {
                            background: alpha(primaryColor, 0.9),
                          },
                          '& .MuiChip-root': {
                            bgcolor: '#000000',
                            color: primaryColor,
                          }
                        },
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                        }
                      }}
                    >
                      {category.label}
                      <Chip
                        label={category.count}
                        size="small"
                        sx={{ 
                          ml: 1.5, 
                          height: 20, 
                          minWidth: 24,
                          bgcolor: 'rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      />
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Tooltip title="Sort by">
                <IconButton sx={{ color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                  <Sort />
                </IconButton>
              </Tooltip>

              <Tooltip title={showBookmarked ? 'Show all tools' : 'Show bookmarked tools'}>
                <IconButton
                    onClick={() => setShowBookmarked(v => !v)}
                    sx={{
                        color: showBookmarked ? 'primary.main' : '#94a3b8',
                        border: `1px solid ${showBookmarked ? primaryColor : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '8px',
                    }}
                >
                    <Bookmark sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Recent History Strip */}
      {toolHistory.length > 0 && !showBookmarked && !search && (
          <Box sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <History sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Recently Used
                  </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {toolHistory.slice(0, 5).map(entry => (
                      <Chip
                          key={entry.id}
                          label={entry.title}
                          size="small"
                          onClick={() => navigate(entry.path)}
                          sx={{
                              cursor: 'pointer',
                              bgcolor: alpha(primaryColor, 0.08),
                              color: 'text.primary',
                              border: `1px solid ${alpha(primaryColor, 0.2)}`,
                              '&:hover': { bgcolor: alpha(primaryColor, 0.15) },
                          }}
                      />
                  ))}
              </Stack>
          </Box>
      )}

      {/* Services Grid */}
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <AnimatePresence>
            <Grid container spacing={3.5}>
              {filteredServices.map((service, index) => (
                <Grid item xs={12} sm={6} key={service.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                    whileHover="hover"
                    variants={{ hover: { y: -6, transition: { duration: 0.2 } } }}
                    layout
                  >
                    <Card sx={{
                      height: '100%',
                      minHeight: '340px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      background: 'rgba(13, 14, 18, 0.3)',
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                      transition: 'border-color 0.3s ease',
                      '&:hover': {
                        borderColor: alpha(primaryColor, 0.25),
                      }
                    }}>
                      <BorderBeam />
                      <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Service Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5 }}>
                          <Box
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: '12px',
                              bgcolor: alpha(theme.palette[service.color as 'primary' | 'secondary']?.main || primaryColor, 0.1),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: theme.palette[service.color as 'primary' | 'secondary']?.main || primaryColor,
                            }}
                          >
                            <motion.div
                              variants={{ hover: { scale: 1.15, rotate: 8 } }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0.75)' }}
                            >
                              {getServiceSvgIcon(service.icon)}
                            </motion.div>
                          </Box>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Tooltip title={isBookmarked(service.id) ? 'Remove bookmark' : 'Bookmark tool'}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => { e.preventDefault(); toggleBookmark(service.id); }}
                                    sx={{ p: 0.5, color: isBookmarked(service.id) ? 'primary.main' : 'text.secondary' }}
                                >
                                    {isBookmarked(service.id) ? <Bookmark sx={{ fontSize: 18 }} /> : <BookmarkBorder sx={{ fontSize: 18 }} />}
                                </IconButton>
                            </Tooltip>
                            <Star sx={{ color: 'warning.main', fontSize: 16 }} />
                            <Typography variant="body2" fontWeight={700}>
                              {service.popularity}%
                            </Typography>
                          </Stack>
                        </Box>

                        {/* Service Content */}
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 800, mb: 1.5 }}>
                          {service.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 3.5,
                            lineHeight: 1.6,
                            height: '48px',
                            display: '-webkit-box',
                            overflow: 'hidden',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                            flexGrow: 1,
                          }}
                        >
                          {service.description}
                        </Typography>

                        {/* Tags */}
                        <Stack direction="row" spacing={1} sx={{ mb: 4, flexWrap: 'wrap', gap: 1 }}>
                          {service.tags.map((tag: string) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                borderColor: 'rgba(255, 255, 255, 0.08)', 
                                color: 'text.secondary',
                                fontSize: '0.7rem',
                                fontWeight: 500
                              }}
                            />
                          ))}
                        </Stack>

                        {/* Actions */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                          <Button
                            onClick={() => {
                                addToHistory({ id: service.id, title: service.title, path: service.path });
                                navigate(service.path);
                            }}
                            variant="contained"
                            size="small"
                            sx={{
                              borderRadius: '20px',
                              px: 3,
                              py: 0.75,
                              background: primaryColor,
                              color: '#000000',
                              fontWeight: 750,
                              '&:hover': {
                                background: alpha(primaryColor, 0.9),
                                boxShadow: `0 4px 15px ${alpha(primaryColor, 0.3)}`,
                              }
                            }}
                          >
                            Open Tool
                          </Button>
                          {toolAccess[service.path] ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Lock sx={{ fontSize: 14, color: 'warning.main' }} />
                              <Typography variant="caption" color="warning.main" fontWeight={600}>
                                Login Required
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary" fontWeight="500">
                              Free to use
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </AnimatePresence>
        </Grid>
      </Grid>

      {/* No Results */}
      {filteredServices.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Search sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom fontWeight="700">
            No tools found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Try adjusting your search query or category filters.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
            sx={{ borderRadius: '20px', px: 4 }}
          >
            Clear Filters
          </Button>
        </Box>
      )}

      {/* Stats */}
      <Grid container spacing={3.5} sx={{ mt: 10 }}>
        {statsDisplay.map((stat, index) => (
          <Grid item xs={6} md={3} key={index}>
            <Card sx={{ 
              border: '1px solid rgba(255, 255, 255, 0.04)', 
              background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.4) 0%, rgba(13, 14, 18, 0.1) 100%)',
              transition: 'all 0.3s',
              '&:hover': {
                borderColor: alpha(primaryColor, 0.2),
                transform: 'translateY(-2px)'
              }
            }}>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <Box
                  sx={{
                    color: primaryColor,
                    mb: 2,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {stat.icon}
                </Box>
                <Typography variant="h4" fontWeight={900} gutterBottom sx={{ letterSpacing: '-0.02em' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="550">
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