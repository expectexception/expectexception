import React, { useState, useEffect, useRef } from 'react';
import { Box, useTheme, alpha } from '@mui/material';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const hexToRgb = (hex: string): string => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '61, 252, 85';
};

const AnimatedBackground: React.FC = () => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const colorRgb = hexToRgb(primaryColor);

  // Mouse position state for the grid glow
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  
  // Custom cursor motion values for smooth lag effect
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 250, mass: 0.5 };
  const cursorRingX = useSpring(cursorX, springConfig);
  const cursorRingY = useSpring(cursorY, springConfig);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Update grid glow position
      setMousePos({ x: e.clientX, y: e.clientY });
      
      // Update custom cursor position
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    // Detect if hovering over clickable elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const isClickable = 
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('a') || 
        target.closest('button') ||
        target.closest('.MuiButton-root') ||
        target.closest('.MuiCard-root') ||
        target.closest('.MuiToggleButton-root') ||
        target.style.cursor === 'pointer';
        
      setIsHovered(!!isClickable);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [cursorX, cursorY, isVisible]);

  return (
    <>
      {/* --- Interactive Grid Background --- */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -2,
          overflow: 'hidden',
          bgcolor: '#050505',
          background: `
            radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(${colorRgb}, 0.06), transparent 70%),
            linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 56px 56px, 56px 56px',
          pointerEvents: 'none',
          transition: 'background 0.1s ease',
        }}
      />

      {/* Subtle bottom ambient light */}
      <Box
        sx={{
          position: 'fixed',
          bottom: '-20%',
          left: '10%',
          width: '80%',
          height: '40%',
          zIndex: -2,
          background: `radial-gradient(ellipse at bottom, rgba(${colorRgb}, 0.03), transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* --- Custom Cursor --- */}
      {isVisible && (
        <>
          {/* Main Dot */}
          <motion.div
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: 8,
              height: 8,
              backgroundColor: primaryColor,
              borderRadius: '50%',
              zIndex: 9999,
              pointerEvents: 'none',
              x: cursorX,
              y: cursorY,
              translateX: '-50%',
              translateY: '-50%',
            }}
            animate={{
              scale: isHovered ? 1.5 : 1,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          />

          {/* Glowing Outer Ring */}
          <motion.div
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: 32,
              height: 32,
              border: `1.5px solid ${primaryColor}`,
              borderRadius: '50%',
              zIndex: 9998,
              pointerEvents: 'none',
              x: cursorRingX,
              y: cursorRingY,
              translateX: '-50%',
              translateY: '-50%',
              boxShadow: `0 0 10px ${alpha(primaryColor, 0.3)}`,
            }}
            animate={{
              scale: isHovered ? 1.6 : 1,
              backgroundColor: isHovered ? alpha(primaryColor, 0.08) : 'rgba(0,0,0,0)',
              borderColor: isHovered ? primaryColor : alpha(primaryColor, 0.6),
            }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
          />
        </>
      )}
    </>
  );
};

export default AnimatedBackground;
