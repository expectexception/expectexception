import React, { useState } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  VideogameAsset,
  Apps,
  GridOn,
  AutoAwesome,
  Grain,
  Spellcheck,
  Extension,
  Bolt,
  GpsFixed,
  Search,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/seo/Seo';
import gamesData from '../data/games.json';

const ICONS: Record<string, React.ReactElement> = {
  VideogameAsset: <VideogameAsset fontSize="large" />,
  Apps: <Apps fontSize="large" />,
  GridOn: <GridOn fontSize="large" />,
  AutoAwesome: <AutoAwesome fontSize="large" />,
  Grain: <Grain fontSize="large" />,
  Spellcheck: <Spellcheck fontSize="large" />,
  Extension: <Extension fontSize="large" />,
  Bolt: <Bolt fontSize="large" />,
  GpsFixed: <GpsFixed fontSize="large" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Games',
  classic: 'Classic',
  creative: 'Creative & Visual',
  puzzle: 'Puzzle & Brain',
  reaction: 'Reaction & Skill',
};

const SandboxPage: React.FC = () => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const [filter, setFilter] = useState('all');

  const categories = ['all', 'classic', 'creative', 'puzzle', 'reaction'].map((value) => ({
    value,
    label: CATEGORY_LABELS[value],
    count: value === 'all' ? gamesData.length : gamesData.filter((g) => g.category === value).length,
  }));

  const filteredGames = gamesData.filter((g) => filter === 'all' || g.category === filter);

  return (
    <Container maxWidth="xl" sx={{ py: 10 }}>
      <Seo
        title="Sandbox - Mini Games & Interactive Playground"
        description="A dedicated playground of fast, free, browser-only mini games and creative toys - classic arcade games, generative art, puzzles, and reaction tests. No installs, no accounts."
        keywords={['mini games', 'browser games', 'snake game', '2048', 'tic tac toe ai', 'reaction time test', 'aim trainer', 'falling sand simulator', 'word guessing game']}
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
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7)',
      }}>
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
              lineHeight: 1.15,
            }}>
              Sandbox
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: '650px', mt: 1.5 }}>
              A playground of fast, free, browser-only games and toys. No installs, no accounts -
              just open a game and play.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
            <motion.svg
              width="100%"
              height="140"
              viewBox="0 0 200 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ overflow: 'visible' }}
            >
              <motion.g animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
                <rect x="40" y="35" width="50" height="50" rx="10" fill={alpha(primaryColor, 0.12)} stroke={primaryColor} strokeWidth="2" />
                <rect x="110" y="55" width="50" height="50" rx="10" fill={alpha(theme.palette.secondary.main, 0.12)} stroke={theme.palette.secondary.main} strokeWidth="2" />
                <motion.circle cx="65" cy="60" r="5" fill={primaryColor} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
                <motion.circle cx="135" cy="80" r="5" fill={theme.palette.secondary.main} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} />
              </motion.g>
            </motion.svg>
          </Grid>
        </Grid>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 6, p: 3, background: 'rgba(13, 14, 18, 0.4)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', overflowX: 'auto', py: 0.5 }}>
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
              },
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
                    '&:hover': { background: alpha(primaryColor, 0.9) },
                    '& .MuiChip-root': { bgcolor: '#000000', color: primaryColor },
                  },
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                }}
              >
                {category.label}
                <Chip
                  label={category.count}
                  size="small"
                  sx={{ ml: 1.5, height: 20, minWidth: 24, bgcolor: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', fontWeight: 700 }}
                />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Card>

      {/* Games Grid */}
      <AnimatePresence>
        <Grid container spacing={3.5}>
          {filteredGames.map((game, index) => {
            const accent = theme.palette[game.color as 'primary' | 'secondary' | 'success' | 'warning' | 'info']?.main || primaryColor;
            return (
              <Grid item xs={12} sm={6} md={4} key={game.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  layout
                >
                  <Card sx={{
                    height: '100%',
                    minHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'rgba(13, 14, 18, 0.3)',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    transition: 'border-color 0.3s ease',
                    '&:hover': { borderColor: alpha(accent, 0.3) },
                  }}>
                    <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <Box sx={{
                        width: 52,
                        height: 52,
                        borderRadius: '12px',
                        bgcolor: alpha(accent, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: accent,
                        mb: 3,
                      }}>
                        <motion.div whileHover={{ scale: 1.2, rotate: 10 }} style={{ display: 'flex' }}>
                          {ICONS[game.icon] || <VideogameAsset fontSize="large" />}
                        </motion.div>
                      </Box>

                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 800, mb: 1.5 }}>
                        {game.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3, lineHeight: 1.6, flexGrow: 1 }}
                      >
                        {game.description}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                        {game.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', color: 'text.secondary', fontSize: '0.7rem', fontWeight: 500 }}
                          />
                        ))}
                      </Stack>

                      <Button
                        component={Link}
                        to={game.path}
                        variant="contained"
                        size="small"
                        sx={{
                          mt: 'auto',
                          borderRadius: '20px',
                          px: 3,
                          py: 0.75,
                          background: accent,
                          color: '#000000',
                          fontWeight: 750,
                          alignSelf: 'flex-start',
                          '&:hover': { background: alpha(accent, 0.9), boxShadow: `0 4px 15px ${alpha(accent, 0.3)}` },
                        }}
                      >
                        Play Now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      </AnimatePresence>

      {filteredGames.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Search sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom fontWeight={700}>No games found</Typography>
        </Box>
      )}
    </Container>
  );
};

export default SandboxPage;
