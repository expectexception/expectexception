import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material';

// Parent-child hover propagation is handled by framer-motion.
// When the parent Card has whileHover="hover", these children will automatically trigger their "hover" variants.

export const WebDevSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Browser Window */}
      <motion.rect
        x="6"
        y="10"
        width="48"
        height="40"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        variants={{
          hover: { stroke: theme.palette.primary.main, scale: 1.02 }
        }}
        transition={{ duration: 0.3 }}
      />
      {/* Browser Header Line */}
      <line x1="6" y1="20" x2="54" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      {/* Three dots in header */}
      <circle cx="12" cy="15" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="17" cy="15" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="22" cy="15" r="2" fill="currentColor" opacity="0.5" />
      
      {/* Code Brackets </ > */}
      <motion.path
        d="M23 27L17 32L23 37"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hover: { 
            stroke: theme.palette.primary.main,
            x: -2,
            filter: `drop-shadow(0px 0px 4px ${theme.palette.primary.main})`
          }
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.path
        d="M37 27L43 32L37 37"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hover: { 
            stroke: theme.palette.primary.main,
            x: 2,
            filter: `drop-shadow(0px 0px 4px ${theme.palette.primary.main})`
          }
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.line
        x1="32"
        y1="26"
        x2="28"
        y2="38"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        variants={{
          hover: { 
            stroke: theme.palette.primary.main,
            rotate: 10,
            filter: `drop-shadow(0px 0px 4px ${theme.palette.primary.main})`
          }
        }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  );
};
export const BackendSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Top Database Cylinder */}
      <motion.g
        variants={{
          hover: { y: -2 }
        }}
        transition={{ duration: 0.3 }}
      >
        <path d="M12 14C12 11.2386 20.0589 9 30 9C39.9411 9 48 11.2386 48 14M12 14V20C12 22.7614 20.0589 25 30 25C39.9411 25 48 22.7614 48 20V14M12 14C12 16.7614 20.0589 19 30 19C39.9411 19 48 16.7614 48 14" stroke="currentColor" strokeWidth="2" />
        <motion.circle cx="30" cy="14" r="2" fill={theme.palette.primary.main} opacity="0" variants={{ hover: { opacity: 1 } }} />
      </motion.g>

      {/* Middle Database Cylinder */}
      <motion.g
        variants={{
          hover: { y: 0 }
        }}
        transition={{ duration: 0.3 }}
      >
        <path d="M12 27C12 24.2386 20.0589 22 30 22C39.9411 22 48 24.2386 48 27M12 27V33C12 35.7614 20.0589 38 30 38C39.9411 38 48 35.7614 48 33V27M12 27C12 29.7614 20.0589 32 30 32C39.9411 32 48 29.7614 48 27" stroke="currentColor" strokeWidth="2" />
        <motion.circle cx="30" cy="27" r="2" fill={theme.palette.primary.main} opacity="0" variants={{ hover: { opacity: 1 } }} />
      </motion.g>

      {/* Bottom Database Cylinder */}
      <motion.g
        variants={{
          hover: { y: 2 }
        }}
        transition={{ duration: 0.3 }}
      >
        <path d="M12 40C12 37.2386 20.0589 35 30 35C39.9411 35 48 37.2386 48 40M12 40V46C12 48.7614 20.0589 51 30 51C39.9411 51 48 48.7614 48 46V40M12 40C12 42.7614 20.0589 45 30 45C39.9411 45 48 42.7614 48 40" stroke="currentColor" strokeWidth="2" />
        <motion.circle cx="30" cy="40" r="2" fill={theme.palette.primary.main} opacity="0" variants={{ hover: { opacity: 1 } }} />
      </motion.g>

      {/* Pulsing data line on the left side */}
      <motion.path
        d="M8 14V46"
        stroke={theme.palette.primary.main}
        strokeWidth="1.5"
        strokeDasharray="4 4"
        animate={{ strokeDashoffset: [0, -20] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        opacity="0"
        variants={{ hover: { opacity: 0.6 } }}
      />
    </svg>
  );
};

export const FullStackSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Outer rotating nodes */}
      <motion.g
        variants={{
          hover: { rotate: 45 }
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ originX: '30px', originY: '30px' }}
      >
        <circle cx="30" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="#050505" />
        <circle cx="30" cy="48" r="4" stroke="currentColor" strokeWidth="2" fill="#050505" />
        <circle cx="12" cy="30" r="4" stroke="currentColor" strokeWidth="2" fill="#050505" />
        <circle cx="48" cy="30" r="4" stroke="currentColor" strokeWidth="2" fill="#050505" />
        
        {/* Connecting lines */}
        <line x1="30" y1="16" x2="30" y2="44" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <line x1="16" y1="30" x2="44" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      </motion.g>

      {/* Central Screen Node */}
      <motion.rect
        x="20"
        y="21"
        width="20"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="#050505"
        variants={{
          hover: { 
            stroke: theme.palette.primary.main,
            scale: 1.05,
            filter: `drop-shadow(0px 0px 5px ${theme.palette.primary.main})`
          }
        }}
        transition={{ duration: 0.3 }}
      />
      <path d="M26 37H34M30 37V41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export const AiSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Neural Network mesh */}
      {/* Connections */}
      <motion.path
        d="M15 30L30 15M30 15L45 30M45 30L30 45M30 45L15 30M15 30L30 30M30 15L30 30M45 30L30 30M30 45L30 30"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
        variants={{
          hover: { stroke: theme.palette.primary.main, opacity: 0.4 }
        }}
        transition={{ duration: 0.4 }}
      />

      {/* Outer Nodes */}
      <motion.circle
        cx="30"
        cy="15"
        r="4"
        fill="#050505"
        stroke="currentColor"
        strokeWidth="2"
        variants={{ hover: { stroke: theme.palette.primary.main, scale: 1.2 } }}
      />
      <motion.circle
        cx="45"
        cy="30"
        r="4"
        fill="#050505"
        stroke="currentColor"
        strokeWidth="2"
        variants={{ hover: { stroke: theme.palette.primary.main, scale: 1.2 } }}
      />
      <motion.circle
        cx="30"
        cy="45"
        r="4"
        fill="#050505"
        stroke="currentColor"
        strokeWidth="2"
        variants={{ hover: { stroke: theme.palette.primary.main, scale: 1.2 } }}
      />
      <motion.circle
        cx="15"
        cy="30"
        r="4"
        fill="#050505"
        stroke="currentColor"
        strokeWidth="2"
        variants={{ hover: { stroke: theme.palette.primary.main, scale: 1.2 } }}
      />

      {/* Central Node */}
      <motion.circle
        cx="30"
        cy="30"
        r="6"
        fill="currentColor"
        variants={{
          hover: { 
            fill: theme.palette.primary.main,
            scale: 1.15,
            filter: `drop-shadow(0px 0px 6px ${theme.palette.primary.main})`
          }
        }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  );
};

export const PlanningAgentSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Brain/Grid Base */}
      <path d="M20 38C15 35 14 28 18 24C16 18 22 12 28 14C32 10 40 12 42 18C46 22 45 30 40 34C42 38 38 44 32 44C26 44 22 42 20 38Z" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      
      {/* Rotating Gear */}
      <motion.g
        style={{ originX: '30px', originY: '26px' }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
      >
        <circle cx="30" cy="26" r="6" stroke={theme.palette.primary.main} strokeWidth="2" strokeDasharray="3 3" />
        <path d="M30 17V20M30 32V35M21 26H24M36 26H39" stroke={theme.palette.primary.main} strokeWidth="2" strokeLinecap="round" />
      </motion.g>

      {/* Task List / Checklist items */}
      <motion.rect
        x="18" y="42" width="6" height="2" rx="1" fill="currentColor"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
      />
      <motion.rect
        x="27" y="42" width="6" height="2" rx="1" fill="currentColor"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />
      <motion.rect
        x="36" y="42" width="6" height="2" rx="1" fill="currentColor"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
      />
    </svg>
  );
};

export const CodingAgentSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Code Editor Frame */}
      <rect x="8" y="12" width="44" height="36" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <line x1="8" y1="22" x2="52" y2="22" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <circle cx="14" cy="17" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="17" r="1.5" fill="currentColor" opacity="0.6" />
      
      {/* Typing Code Lines */}
      <motion.path
        d="M14 28H34M14 34H42M14 40H26"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="100"
        initial={{ strokeDashoffset: 100 }}
        animate={{ strokeDashoffset: [100, 0, 100] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Blinking Terminal Cursor */}
      <motion.rect
        x="28" y="39" width="4" height="2" fill={theme.palette.primary.main}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
      />
    </svg>
  );
};

export const TestingAgentSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Target Grid */}
      <circle cx="30" cy="30" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <circle cx="30" cy="30" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
      <line x1="30" y1="6" x2="30" y2="54" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      <line x1="6" y1="30" x2="54" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.1" />

      {/* Radar Sweeper */}
      <motion.line
        x1="30" y1="30" x2="48" y2="20"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ originX: '30px', originY: '30px' }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
      />

      {/* Flashing Bug/Nodes being scanned */}
      <motion.circle
        cx="20" cy="22" r="3" fill="#ef4444"
        animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.2, 1, 0.2] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      />
      <motion.circle
        cx="40" cy="38" r="3" fill={theme.palette.primary.main}
        animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.2, 1, 0.2] }}
        transition={{ repeat: Infinity, duration: 1.5, delay: 0.75 }}
      />
    </svg>
  );
};

export const DeployAgentSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Cloud Outline */}
      <path d="M18 38C15.5 38 13 36 12.2 33.5C10.5 29 13.5 24.5 18 24C19.5 19 24.5 16 30 17C35.5 16 40.5 19 42 24C46.5 24.5 49.5 29 47.8 33.5C47 36 44.5 38 42 38H18Z" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      
      {/* Upward Upload Arrow */}
      <motion.g
        animate={{ y: [4, -4, 4] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <path d="M30 44V26M30 26L24 32M30 26L36 32" stroke={theme.palette.primary.main} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      {/* Floating Data Packets */}
      <motion.circle
        cx="22" cy="42" r="1.5" fill={theme.palette.primary.main}
        animate={{ y: [0, -16], opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, delay: 0.2 }}
      />
      <motion.circle
        cx="38" cy="42" r="1.5" fill={theme.palette.primary.main}
        animate={{ y: [0, -16], opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, delay: 0.9 }}
      />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Service tool icons — one per ServicesPage/HomePage `service.icon` name.
// Each has a subtle always-on idle loop (so mobile, with no hover, still
// reads as "alive") plus a hover-triggered accent via `variants.hover`
// (propagates from an ancestor Card/div using whileHover="hover").
// ---------------------------------------------------------------------------

export const DownloadToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M14 38V44C14 46.2091 15.7909 48 18 48H42C44.2091 48 46 46.2091 46 44V38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <motion.path
        d="M30 12V34M30 34L22 26M30 34L38 26"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ y: [0, 4, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        variants={{ hover: { filter: `drop-shadow(0px 0px 5px ${theme.palette.primary.main})` } }}
      />
    </svg>
  );
};

export const VideoDownloadSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="9" y="10" width="42" height="28" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <motion.path
        d="M26 18L36 24L26 30V18Z"
        fill="currentColor"
        variants={{ hover: { fill: theme.palette.primary.main } }}
        transition={{ duration: 0.3 }}
      />
      <motion.path
        d="M24 44L30 50L36 44"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
      />
    </svg>
  );
};

export const QrCodeToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {[[10, 10], [10, 24], [24, 10], [38, 10], [10, 38], [38, 38], [24, 38], [38, 24], [24, 24]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" opacity={i === 8 ? 0 : 0.5} fill={i === 8 ? undefined : 'none'} />
      ))}
      <motion.line
        x1="6" y1="10" x2="54" y2="10"
        stroke={theme.palette.primary.main}
        strokeWidth="2"
        animate={{ y: [0, 40, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0px 0px 3px ${theme.palette.primary.main})` }}
      />
    </svg>
  );
};

export const CodeToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M22 20L10 30L22 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <path d="M38 20L50 30L38 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <motion.rect
        x="27" y="42" width="6" height="2.5" rx="1.25"
        fill={theme.palette.primary.main}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        variants={{ hover: { scale: 1.3 } }}
      />
    </svg>
  );
};

export const TextToSpeechSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M16 24V36H23L33 45V15L23 24H16Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.7" />
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M${39 + i * 5} ${30 - (i + 1) * 6}A${(i + 1) * 6} ${(i + 1) * 6} 0 0 1 ${39 + i * 5} ${30 + (i + 1) * 6}`}
          stroke={theme.palette.primary.main}
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.25 }}
        />
      ))}
    </svg>
  );
};

export const CompressToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="14" y="14" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <motion.g
        animate={{ x: [-2, 2, -2], y: [-2, 2, -2] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <path d="M22 22L28 28M22 22V27M22 22H27" stroke={theme.palette.primary.main} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M38 38L32 32M38 38V33M38 38H33" stroke={theme.palette.primary.main} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  );
};

export const AiDetectorSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M22 40C16 37 14 28 19 23C17 16 25 10 32 13C38 9 47 14 46 22C51 26 49 36 42 39C43 44 37 49 31 47C26 50 20 46 22 40Z" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      {[[24, 22], [37, 25], [30, 34], [22, 38]].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx} cy={cy} r="2.5"
          fill={theme.palette.primary.main}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.35 }}
        />
      ))}
    </svg>
  );
};

export const DocConvertSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M12 10H26L34 18V46C34 47.1 33.1 48 32 48H12C10.9 48 10 47.1 10 46V12C10 10.9 10.9 10 12 10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.5" />
      <path d="M26 10V18H34" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.5" />
      <motion.path
        d="M38 28L48 28M48 28L44 24M48 28L44 32"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ x: [0, 3, 0] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
      />
    </svg>
  );
};

export const LinkToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <motion.path
        d="M25 35L35 25"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      />
      <rect x="14" y="28" width="16" height="10" rx="5" transform="rotate(-45 14 28)" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
      <rect x="30" y="12" width="16" height="10" rx="5" transform="rotate(-45 30 12)" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
    </svg>
  );
};

export const VoiceWaveSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="26" y="14" width="8" height="18" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <path d="M18 28V30C18 37.2 23.8 43 31 43H29C36.2 43 42 37.2 42 30V28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="30" y1="43" x2="30" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x={16 + i * 14} y="46" width="4" height="4" rx="1"
          fill={theme.palette.primary.main}
          animate={{ height: [4, 10, 4], y: [46, 43, 46] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
        />
      ))}
    </svg>
  );
};

export const TerminalToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="8" y="12" width="44" height="36" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <line x1="8" y1="21" x2="52" y2="21" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <motion.path
        d="M17 40V29C17 27 19 26 21 27L27 30"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ repeat: Infinity, duration: 3, times: [0, 0.4, 0.8, 1] }}
      />
      <motion.path
        d="M43 40V29C43 27 41 26 39 27L33 30"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ repeat: Infinity, duration: 3, times: [0, 0.4, 0.8, 1], delay: 0.3 }}
      />
    </svg>
  );
};

export const MergeToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <motion.rect
        x="10" y="14" width="16" height="20" rx="3"
        stroke="currentColor" strokeWidth="2" opacity="0.5"
        animate={{ x: [10, 15, 10] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
      <motion.rect
        x="34" y="26" width="16" height="20" rx="3"
        stroke="currentColor" strokeWidth="2" opacity="0.5"
        animate={{ x: [34, 29, 34] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
      <rect x="22" y="20" width="16" height="20" rx="3" fill={theme.palette.primary.main} opacity="0.15" stroke={theme.palette.primary.main} strokeWidth="2" />
    </svg>
  );
};

export const ImageResizeSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="14" y="14" width="32" height="32" rx="3" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <circle cx="24" cy="30" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <path d="M14 40L24 30L30 36L38 26L46 34" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      {[[10, 10], [50, 10], [10, 50], [50, 50]].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx} cy={cy} r="3"
          fill={theme.palette.primary.main}
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.15 }}
        />
      ))}
    </svg>
  );
};

export const SecretShareSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M18 27V21C18 14.9 22.9 10 29 10C35.1 10 40 14.9 40 21V27" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <rect x="12" y="27" width="34" height="24" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <motion.circle
        cx="29" cy="37" r="4"
        fill={theme.palette.primary.main}
        animate={{ opacity: [0.3, 1, 0.3], boxShadow: 'none' }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ filter: `drop-shadow(0px 0px 4px ${theme.palette.primary.main})` }}
      />
      <line x1="29" y1="41" x2="29" y2="45" stroke={theme.palette.primary.main} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

export const PdfToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M14 8H32L42 18V50C42 51.1 41.1 52 40 52H14C12.9 52 12 51.1 12 50V10C12 8.9 12.9 8 14 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.5" />
      <path d="M32 8V18H42" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.5" />
      <motion.rect
        x="16" y="30" width="22" height="12" rx="2"
        fill={theme.palette.primary.main}
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      <text x="19" y="39" fontSize="8" fontWeight="800" fill={theme.palette.primary.main} style={{ fontFamily: 'sans-serif' }}>PDF</text>
    </svg>
  );
};

export const MagicWandSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M18 42L38 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M34 18L38 22L42 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      {[[42, 14], [50, 22], [16, 44]].map(([cx, cy], i) => (
        <motion.path
          key={i}
          d={`M${cx - 3} ${cy}h6M${cx} ${cy - 3}v6`}
          stroke={theme.palette.primary.main}
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.4 }}
        />
      ))}
    </svg>
  );
};

export const FingerprintToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {[8, 12, 16, 20].map((r, i) => (
        <path
          key={i}
          d={`M${30 - r} 30a${r} ${r} 0 1 1 ${r * 2} 0`}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.25 + i * 0.05}
        />
      ))}
      <motion.line
        x1="12" x2="48" y1="14" y2="14"
        stroke={theme.palette.primary.main}
        strokeWidth="2"
        animate={{ y: [0, 32, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0px 0px 3px ${theme.palette.primary.main})` }}
      />
    </svg>
  );
};

export const WritePenSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M32 16L44 28L24 48H12V36L32 16Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.6" />
      <path d="M28 20L40 32" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <motion.path
        d="M12 52H24"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="14"
        animate={{ strokeDashoffset: [14, 0, 14] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
    </svg>
  );
};

export const PadlockToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <motion.path
        d="M20 27V21C20 15.5 24.5 11 30 11C35.5 11 40 15.5 40 21V27"
        stroke="currentColor"
        strokeWidth="2.5"
        animate={{ rotate: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        style={{ originX: '20px', originY: '27px' }}
      />
      <rect x="14" y="27" width="32" height="22" rx="4" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />
      <motion.circle
        cx="30" cy="36" r="3"
        fill={theme.palette.primary.main}
        variants={{ hover: { fill: theme.palette.primary.main, scale: 1.3 } }}
      />
      <line x1="30" y1="39" x2="30" y2="43" stroke={theme.palette.primary.main} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};

export const BranchPathSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M14 14V26C14 30 17 33 21 33H30M30 33H39C43 33 46 36 46 40V46M30 33V46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <circle cx="14" cy="10" r="4" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <circle cx="46" cy="50" r="4" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <circle cx="30" cy="50" r="4" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <motion.circle
        r="3"
        fill={theme.palette.primary.main}
        initial={{ cx: 14, cy: 10, opacity: 1 }}
        animate={{
          cx: [14, 14, 30, 46],
          cy: [10, 26, 40, 50],
          opacity: [1, 1, 1, 0],
        }}
        transition={{ repeat: Infinity, duration: 2.4, times: [0, 0.35, 0.7, 1] }}
      />
    </svg>
  );
};

export const DnsToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {[12, 25, 38].map((y, i) => (
        <g key={i}>
          <rect x="14" y={y} width="32" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          <circle cx="19" cy={y + 4.5} r="1.5" fill="currentColor" opacity="0.5" />
        </g>
      ))}
      <motion.circle
        r="2.5"
        fill={theme.palette.primary.main}
        cx="40"
        initial={{ cy: 16.5 }}
        animate={{ cy: [16.5, 29.5, 42.5, 29.5, 16.5] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0px 0px 3px ${theme.palette.primary.main})` }}
      />
    </svg>
  );
};

export const AudioSplitSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <circle cx="30" cy="20" r="7" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M30 27V33" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={`l${i}`}
          x={10 + i * 4} width="2.5" rx="1"
          fill={theme.palette.primary.main}
          initial={{ height: 6, y: 38 }}
          animate={{ height: [6, 14, 6], y: [38, 34, 38] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={`r${i}`}
          x={34 + i * 4} width="2.5" rx="1"
          fill="#a855f7"
          initial={{ height: 6, y: 38 }}
          animate={{ height: [6, 12, 6], y: [38, 35, 38] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 + i * 0.15 }}
        />
      ))}
    </svg>
  );
};

export const SpeedGaugeSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M12 38C12 24.7 22.7 14 36 14C40.3 14 44.3 15.1 47.8 17.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M12 38A18 18 0 0 1 30 20" stroke={theme.palette.primary.main} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <motion.line
        x1="30" y1="38" x2="30" y2="24"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        animate={{ rotate: [-40, 40, -40] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        style={{ originX: '30px', originY: '38px', filter: `drop-shadow(0px 0px 3px ${theme.palette.primary.main})` }}
      />
      <circle cx="30" cy="38" r="3" fill="currentColor" />
    </svg>
  );
};

export const SignalBarsSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {[0, 1, 2, 3].map((i) => {
        const h = 10 + i * 8;
        return (
          <motion.rect
            key={i}
            x={16 + i * 8}
            y={44 - h}
            width="5"
            height={h}
            rx="1.5"
            fill={theme.palette.primary.main}
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.2 }}
          />
        );
      })}
    </svg>
  );
};

export const RocketToolSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <motion.g
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      >
        <path d="M30 12C36 18 38 26 36 34L24 34C22 26 24 18 30 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.7" />
        <circle cx="30" cy="22" r="3" stroke={theme.palette.primary.main} strokeWidth="2" />
        <path d="M24 30L17 36V30L24 27" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.6" />
        <path d="M36 30L43 36V30L36 27" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.6" />
      </motion.g>
      <motion.path
        d="M27 36Q30 46 33 36"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        animate={{ opacity: [0.3, 1, 0.3], scaleY: [0.8, 1.3, 0.8] }}
        transition={{ repeat: Infinity, duration: 0.6 }}
        style={{ originY: '36px' }}
      />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Shared icon-name -> animated SVG mapping, used by both ServicesPage and
// HomePage's tool grids (previously two separate MUI-icon switch statements
// that had drifted out of sync with each other).
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Uptime Monitor type icons — one per UptimeMonitor.monitor_type.
// ---------------------------------------------------------------------------

export const PingRadarSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <circle cx="30" cy="30" r="4" fill={theme.palette.primary.main} />
      {[1, 2, 3].map((i) => (
        <motion.circle
          key={i}
          cx="30" cy="30"
          stroke={theme.palette.primary.main}
          strokeWidth="2"
          fill="none"
          initial={{ r: 6, opacity: 0.8 }}
          animate={{ r: [6, 24], opacity: [0.8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
        />
      ))}
    </svg>
  );
};

export const PortPlugSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="10" y="24" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <line x1="16" y1="24" x2="16" y2="18" stroke="currentColor" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
      <line x1="22" y1="24" x2="22" y2="18" stroke="currentColor" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
      <motion.line
        x1="28" y1="30" x2="46" y2="30"
        stroke={theme.palette.primary.main}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 4"
        animate={{ strokeDashoffset: [0, -16] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <motion.circle
        cx="48" cy="30" r="4"
        fill={theme.palette.primary.main}
        animate={{ scale: [1, 1.25, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ filter: `drop-shadow(0 0 4px ${theme.palette.primary.main})` }}
      />
    </svg>
  );
};

export const HeartbeatPulseSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <circle cx="30" cy="30" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <motion.path
        d="M10 30H20L24 20L30 40L34 26L38 30H50"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="90"
        initial={{ strokeDashoffset: 90 }}
        animate={{ strokeDashoffset: [90, 0, 0, -90] }}
        transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.55, 0.85, 1], ease: 'linear' }}
        style={{ filter: `drop-shadow(0 0 3px ${theme.palette.primary.main})` }}
      />
    </svg>
  );
};

export const KeywordScanSvg: React.FC = () => {
  const theme = useTheme();
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="10" y="12" width="34" height="36" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <line x1="16" y1="22" x2="38" y2="22" stroke="currentColor" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      <motion.line
        x1="16" y1="30" x2="34" y2="30"
        stroke={theme.palette.primary.main}
        strokeWidth="2.5"
        strokeLinecap="round"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <line x1="16" y1="38" x2="30" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      <motion.g
        animate={{ x: [0, 6, 0], y: [0, 4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <circle cx="40" cy="38" r="9" stroke={theme.palette.secondary.main} strokeWidth="2.5" fill="rgba(0,0,0,0.2)" />
        <line x1="46.5" y1="44.5" x2="52" y2="50" stroke={theme.palette.secondary.main} strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
};

export const getMonitorTypeSvgIcon = (monitorType: string): React.ReactElement => {
  switch (monitorType) {
    case 'ping': return <PingRadarSvg />;
    case 'port': return <PortPlugSvg />;
    case 'ssl': return <PadlockToolSvg />;
    case 'heartbeat': return <HeartbeatPulseSvg />;
    case 'keyword': return <KeywordScanSvg />;
    case 'http':
    case 'https':
    default: return <LinkToolSvg />;
  }
};

export const getServiceSvgIcon = (iconName: string): React.ReactElement => {
  switch (iconName) {
    case 'Download': return <DownloadToolSvg />;
    case 'Movie': return <VideoDownloadSvg />;
    case 'QrCode': return <QrCodeToolSvg />;
    case 'Code': return <CodeToolSvg />;
    case 'VolumeUp': return <TextToSpeechSvg />;
    case 'Compress': return <CompressToolSvg />;
    case 'Psychology': return <AiDetectorSvg />;
    case 'Description': return <DocConvertSvg />;
    case 'Link': return <LinkToolSvg />;
    case 'RecordVoiceOver': return <VoiceWaveSvg />;
    case 'Terminal': return <TerminalToolSvg />;
    case 'MergeType': return <MergeToolSvg />;
    case 'PhotoSizeSelectActual': return <ImageResizeSvg />;
    case 'EnhancedEncryption': return <SecretShareSvg />;
    case 'PictureAsPdf': return <PdfToolSvg />;
    case 'AutoFixHigh': return <MagicWandSvg />;
    case 'Fingerprint': return <FingerprintToolSvg />;
    case 'Create': return <WritePenSvg />;
    case 'Lock': return <PadlockToolSvg />;
    case 'AltRoute': return <BranchPathSvg />;
    case 'Dns': return <DnsToolSvg />;
    case 'Mic': return <AudioSplitSvg />;
    case 'Speed': return <SpeedGaugeSvg />;
    case 'NetworkCheck': return <SignalBarsSvg />;
    case 'RocketLaunch': return <RocketToolSvg />;
    default: return <CodeToolSvg />;
  }
};
