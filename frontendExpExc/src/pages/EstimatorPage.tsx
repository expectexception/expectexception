import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  Typography,
  Button,
  Box,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Switch,
  alpha,
  useTheme
} from '@mui/material';
import {
  Apartment,
  Build,
  DeveloperMode,
  ChevronRight,
  TrendingUp
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Seo from '../components/seo/Seo';

const EstimatorPage: React.FC = () => {
  const theme = useTheme();
  const primaryColor = '#3dfc55';

  const [pages, setPages] = useState(5);
  const [complexity, setComplexity] = useState('standard');
  const [includeAi, setIncludeAi] = useState(false);
  const [timeline, setTimeline] = useState('standard');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedDays, setEstimatedDays] = useState(0);

  useEffect(() => {
    let basePrice = 600;
    let baseDays = 6;

    // Pages
    basePrice += pages * 180;
    baseDays += pages * 1.2;

    // Complexity
    if (complexity === 'simple') {
      basePrice += 0;
      baseDays += 0;
    } else if (complexity === 'standard') {
      basePrice += 500;
      baseDays += 4;
    } else if (complexity === 'advanced') {
      basePrice += 1500;
      baseDays += 12;
    }

    // AI Feature
    if (includeAi) {
      basePrice += 1000;
      baseDays += 6;
    }

    // Timeline
    if (timeline === 'relaxed') {
      basePrice *= 0.9;
      baseDays *= 1.35;
    } else if (timeline === 'rush') {
      basePrice *= 1.4;
      baseDays *= 0.65;
    }

    setEstimatedCost(Math.round(basePrice));
    setEstimatedDays(Math.round(baseDays));
  }, [pages, complexity, includeAi, timeline]);

  // --- Dynamic Building SVG Render ---
  const renderBuildingVisualizer = () => {
    const floorHeight = 16;
    const baseWidth = 140;
    const paddingBottom = 20;
    const maxFloors = 15;
    const svgHeight = 340;
    const startY = svgHeight - paddingBottom;

    // Determine color based on complexity
    const complexityColor = 
      complexity === 'simple' ? '#00eeff' :
      complexity === 'standard' ? '#3dfc55' : '#a855f7';

    return (
      <svg width="100%" height={svgHeight} viewBox={`0 0 240 ${svgHeight}`} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
        {/* Background Grid Lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" />

        {/* Dynamic Building Group */}
        <g>
          {/* Ground/Foundation Block */}
          <rect
            x={120 - baseWidth / 2 - 10}
            y={startY}
            width={baseWidth + 20}
            height="12"
            rx="3"
            fill="rgba(13, 14, 18, 0.9)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
          />

          {/* Floors */}
          {Array.from({ length: pages }).map((_, idx) => {
            const floorY = startY - (idx + 1) * floorHeight;
            const currentWidth = baseWidth - (idx * (baseWidth / 2.5 / maxFloors));
            const isTopFloor = idx === pages - 1;

            return (
              <motion.g
                key={idx}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                style={{ transformOrigin: '120px 0px' }}
              >
                {/* Floor Block */}
                <rect
                  x={120 - currentWidth / 2}
                  y={floorY}
                  width={currentWidth}
                  height={floorHeight - 2}
                  rx="2"
                  fill="rgba(13, 14, 18, 0.75)"
                  stroke={complexityColor}
                  strokeWidth="1.2"
                  style={{
                    filter: `drop-shadow(0 0 4px ${alpha(complexityColor, 0.3)})`,
                    backdropFilter: 'blur(4px)'
                  }}
                />

                {/* Windows (Interior details based on complexity) */}
                {complexity !== 'simple' && (
                  <g opacity="0.6">
                    <rect x={120 - currentWidth / 3} y={floorY + 4} width="6" height="6" rx="1" fill={complexityColor} />
                    <rect x={120 - 3} y={floorY + 4} width="6" height="6" rx="1" fill={complexityColor} />
                    <rect x={120 + currentWidth / 3 - 6} y={floorY + 4} width="6" height="6" rx="1" fill={complexityColor} />
                  </g>
                )}
                {complexity === 'advanced' && (
                  <g opacity="0.8">
                    <line x1={120 - currentWidth / 2} y1={floorY + floorHeight/2} x2={120 + currentWidth / 2} y2={floorY + floorHeight/2} stroke={complexityColor} strokeWidth="0.5" strokeDasharray="2 2" />
                  </g>
                )}
              </motion.g>
            );
          })}

          {/* AI Antenna (Renders on top floor) */}
          {includeAi && (
            <motion.g
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 100 }}
            >
              {/* Antenna Mast */}
              <line
                x1="120"
                y1={startY - pages * floorHeight}
                x2="120"
                y2={startY - pages * floorHeight - 28}
                stroke="#a855f7"
                strokeWidth="2.5"
              />
              {/* Pulsing Beacon */}
              <circle
                cx="120"
                cy={startY - pages * floorHeight - 28}
                r="4"
                fill="#a855f7"
              />
              <circle
                cx="120"
                cy={startY - pages * floorHeight - 28}
                r="12"
                stroke="#a855f7"
                strokeWidth="1.5"
                opacity="0.5"
                style={{
                  transformOrigin: `120px ${startY - pages * floorHeight - 28}px`,
                  animation: 'beacon-pulse 1.8s infinite'
                }}
              />
            </motion.g>
          )}
        </g>
        <style>
          {`
            @keyframes beacon-pulse {
              0% { transform: scale(0.6); opacity: 0.8; }
              100% { transform: scale(1.8); opacity: 0; }
            }
          `}
        </style>
      </svg>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 10 }}>
      <Seo
        title="Interactive Project Cost Estimator - ExpectException"
        description="Estimate your software development, workflow automation, and AI agent integration costs in real-time."
      />

      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{
          fontWeight: 900,
          background: 'linear-gradient(135deg, #ffffff 30%, #3dfc55 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' }
        }}>
          Interactive Project Estimator
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: '650px', mx: 'auto', mt: 1.5 }}>
          Customize your architecture and resource requirements to watch your custom software build take shape in real-time.
        </Typography>
      </Box>

      <Grid container spacing={5} alignItems="flex-start">
        {/* Sliders and Controls (Left) */}
        <Grid item xs={12} md={7}>
          <Card sx={{
            p: 4,
            background: 'rgba(13, 14, 18, 0.4)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
          }}>
            <Stack spacing={4.5}>
              {/* Pages Slider */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight="700" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Apartment sx={{ color: primaryColor }} /> Project Size (Pages / Views)
                  </Typography>
                  <Typography variant="h6" fontWeight="800" color="primary.main">
                    {pages}
                  </Typography>
                </Stack>
                <Slider
                  value={pages}
                  min={1}
                  max={15}
                  step={1}
                  onChange={(_, val) => setPages(val as number)}
                  sx={{
                    color: primaryColor,
                    '& .MuiSlider-thumb': {
                      boxShadow: '0 0 10px rgba(61, 252, 85, 0.4)'
                    }
                  }}
                />
              </Box>

              {/* Complexity */}
              <Box>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Build sx={{ color: primaryColor }} /> Project Complexity
                </Typography>
                <ToggleButtonGroup
                  value={complexity}
                  exclusive
                  onChange={(_, val) => val && setComplexity(val)}
                  fullWidth
                  sx={{
                    gap: 1.5,
                    border: 'none',
                    '& .MuiToggleButtonGroup-grouped': {
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px !important',
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      color: 'grey.400',
                      py: 1.25,
                      '&.Mui-selected': {
                        color: '#000000',
                        bgcolor: primaryColor,
                        borderColor: primaryColor,
                        fontWeight: 700,
                        boxShadow: `0 4px 15px ${alpha(primaryColor, 0.25)}`,
                        '&:hover': { bgcolor: alpha(primaryColor, 0.9) }
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.05)'
                      }
                    }
                  }}
                >
                  {[
                    { label: 'Simple MVP', value: 'simple' },
                    { label: 'Standard Production', value: 'standard' },
                    { label: 'Enterprise Architecture', value: 'advanced' }
                  ].map(opt => (
                    <ToggleButton key={opt.value} value={opt.value}>
                      {opt.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* AI Integration */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2.5,
                borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="700" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DeveloperMode sx={{ color: '#a855f7' }} /> Include AI Integrations
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Chatbots, vector databases, custom RAG pipelines, or autonomous agent loops.
                  </Typography>
                </Box>
                <Switch
                  checked={includeAi}
                  onChange={(e) => setIncludeAi(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#a855f7',
                      '& + .MuiSwitch-track': {
                        backgroundColor: '#a855f7',
                      },
                    },
                  }}
                />
              </Box>

              {/* Timeline */}
              <Box>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp sx={{ color: primaryColor }} /> Development Pace
                </Typography>
                <ToggleButtonGroup
                  value={timeline}
                  exclusive
                  onChange={(_, val) => val && setTimeline(val)}
                  fullWidth
                  sx={{
                    gap: 1.5,
                    border: 'none',
                    '& .MuiToggleButtonGroup-grouped': {
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px !important',
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      color: 'grey.400',
                      py: 1.25,
                      '&.Mui-selected': {
                        color: '#000000',
                        bgcolor: primaryColor,
                        borderColor: primaryColor,
                        fontWeight: 700,
                        boxShadow: `0 4px 15px ${alpha(primaryColor, 0.25)}`,
                        '&:hover': { bgcolor: alpha(primaryColor, 0.9) }
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.05)'
                      }
                    }
                  }}
                >
                  {[
                    { label: 'Relaxed (Eco)', value: 'relaxed' },
                    { label: 'Standard Schedule', value: 'standard' },
                    { label: 'Expedited (Rush)', value: 'rush' }
                  ].map(opt => (
                    <ToggleButton key={opt.value} value={opt.value}>
                      {opt.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Visualizer and Quote (Right) */}
        <Grid item xs={12} md={5}>
          <Card sx={{
            p: 4,
            background: 'rgba(13, 14, 18, 0.6)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 3, textTransform: 'uppercase', letterSpacing: 1, color: 'grey.400' }}>
              Structural Blueprint
            </Typography>
            
            {/* SVG Interactive Visualizer */}
            <Box sx={{ width: '100%', mb: 4, bgcolor: 'rgba(5, 5, 5, 0.3)', borderRadius: '16px', p: 1, border: '1px solid rgba(255,255,255,0.03)' }}>
              {renderBuildingVisualizer()}
            </Box>

            {/* Price Output Cards */}
            <Grid container spacing={2.5} sx={{ mb: 4, width: '100%' }}>
              <Grid item xs={6}>
                <Box sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.02)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.04)', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                    Estimated Cost
                  </Typography>
                  <Typography variant="h4" fontWeight="900" sx={{ color: primaryColor, textShadow: `0 0 15px ${alpha(primaryColor, 0.3)}` }}>
                    ${estimatedCost}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.02)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.04)', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                    Timeline
                  </Typography>
                  <Typography variant="h4" fontWeight="900" sx={{ color: '#ffffff' }}>
                    {estimatedDays} days
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* CTAs */}
            <Button
              component={Link}
              to={`/hire?pages=${pages}&complexity=${complexity}&ai=${includeAi ? 'yes' : 'no'}&timeline=${timeline}&cost=${estimatedCost}&days=${estimatedDays}`}
              variant="contained"
              fullWidth
              endIcon={<ChevronRight />}
              sx={{
                bgcolor: primaryColor,
                color: '#000000',
                fontWeight: 800,
                py: 1.75,
                borderRadius: '12px',
                fontSize: '1rem',
                boxShadow: `0 6px 20px ${alpha(primaryColor, 0.25)}`,
                '&:hover': {
                  bgcolor: alpha(primaryColor, 0.9),
                  boxShadow: `0 6px 25px ${alpha(primaryColor, 0.35)}`,
                }
              }}
            >
              Book Project Blueprint
            </Button>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default EstimatorPage;
