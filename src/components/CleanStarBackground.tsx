import React, { useMemo } from 'react';
import { Box, keyframes } from '@mui/material';

const twinkle = keyframes`
  0%, 100% { opacity: 0.25; transform: scale(1); }
  40%      { opacity: 0.9;  transform: scale(1.15); }
  70%      { opacity: 0.4;  transform: scale(0.95); }
`;

const shoot = keyframes`
  0%   { opacity: 0; transform: translateX(0) translateY(0) scale(1); }
  5%   { opacity: 0.9; }
  60%  { opacity: 0.7; transform: translateX(120vw) translateY(80vh) scale(0.4); }
  100% { opacity: 0; }
`;

interface Star {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  glow?: number;
  isShooting?: boolean;
}

const CleanStarBackground = ({ withNebula = true }: { withNebula?: boolean }) => {
  const layers = useMemo(() => {
    const stars: Star[] = [];

    // Layer 1: tiny distant stars (~600) – very faint, slow
    for (let i = 0; i < 600; i++) {
      stars.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 1.1 + 0.4, // 0.4–1.5 px
        delay: Math.random() * 12,
        duration: 8 + Math.random() * 14, // very slow
        opacity: 0.15 + Math.random() * 0.25,
      });
    }

    // Layer 2: medium visible twinkling (~180)
    for (let i = 0; i < 180; i++) {
      const size = Math.random() * 1.8 + 1.2;
      stars.push({
        id: 10000 + i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size,
        delay: Math.random() * 8,
        duration: 4 + Math.random() * 9,
        opacity: 0.5 + Math.random() * 0.35,
        glow: size * 1.6,
      });
    }

    // Layer 3: rare brighter stars + very rare shooting stars (~8–12 total)
    for (let i = 0; i < 8; i++) {
      const isShooting = Math.random() < 0.25; // ~25% chance to be shooter
      const size = isShooting ? 2.5 + Math.random() * 2 : 2.2 + Math.random() * 2.5;

      stars.push({
        id: 20000 + i,
        left: isShooting ? -10 - Math.random() * 30 : Math.random() * 100,
        top: isShooting ? -10 - Math.random() * 30 : Math.random() * 100,
        size,
        delay: isShooting ? Math.random() * 30 + 10 : Math.random() * 6,
        duration: isShooting ? 2.5 + Math.random() * 2.5 : 3 + Math.random() * 5,
        opacity: isShooting ? 0.9 : 0.75 + Math.random() * 0.2,
        glow: size * 2.2,
        isShooting,
      });
    }

    return stars;
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        zIndex: -1,
        background: withNebula
          ? 'radial-gradient(circle at 20% 30%, rgba(40,20,80,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(60,0,100,0.08) 0%, transparent 50%), #02040f'
          : '#02040f',
        pointerEvents: 'none',
      }}
    >
      {layers.map((star) => (
        <Box
          key={star.id}
          sx={{
            position: 'absolute',
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            bgcolor: 'white',
            opacity: star.opacity,
            boxShadow: star.glow
              ? `0 0 ${star.glow}px ${star.glow * 0.5}px rgba(255,255,255,0.5),
                 0 0 ${star.glow * 2.2}px ${star.glow}px rgba(220,220,255,0.3)`
              : undefined,
            animation: star.isShooting
              ? `${shoot} ${star.duration}s linear ${star.delay}s infinite`
              : `${twinkle} ${star.duration}s cubic-bezier(0.4, 0, 0.6, 1) ${star.delay}s infinite`,
            willChange: 'opacity, transform',
            transformOrigin: 'center',
          }}
        />
      ))}
    </Box>
  );
};

export default CleanStarBackground;