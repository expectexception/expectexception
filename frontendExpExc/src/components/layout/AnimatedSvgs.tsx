import React from 'react';
import { motion } from 'framer-motion';

// Parent-child hover propagation is handled by framer-motion.
// When the parent Card has whileHover="hover", these children will automatically trigger their "hover" variants.

export const WebDevSvg: React.FC = () => {
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
          hover: { stroke: 'var(--primary-color, #3dfc55)', scale: 1.02 }
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
            stroke: 'var(--primary-color, #3dfc55)',
            x: -2,
            filter: 'drop-shadow(0px 0px 4px var(--primary-color, #3dfc55))'
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
            stroke: 'var(--primary-color, #3dfc55)',
            x: 2,
            filter: 'drop-shadow(0px 0px 4px var(--primary-color, #3dfc55))'
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
            stroke: 'var(--primary-color, #3dfc55)',
            rotate: 10,
            filter: 'drop-shadow(0px 0px 4px var(--primary-color, #3dfc55))'
          }
        }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  );
};
export const BackendSvg: React.FC = () => {
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
        <motion.circle cx="30" cy="14" r="2" fill="var(--primary-color, #3dfc55)" opacity="0" variants={{ hover: { opacity: 1 } }} />
      </motion.g>

      {/* Middle Database Cylinder */}
      <motion.g
        variants={{
          hover: { y: 0 }
        }}
        transition={{ duration: 0.3 }}
      >
        <path d="M12 27C12 24.2386 20.0589 22 30 22C39.9411 22 48 24.2386 48 27M12 27V33C12 35.7614 20.0589 38 30 38C39.9411 38 48 35.7614 48 33V27M12 27C12 29.7614 20.0589 32 30 32C39.9411 32 48 29.7614 48 27" stroke="currentColor" strokeWidth="2" />
        <motion.circle cx="30" cy="27" r="2" fill="var(--primary-color, #3dfc55)" opacity="0" variants={{ hover: { opacity: 1 } }} />
      </motion.g>

      {/* Bottom Database Cylinder */}
      <motion.g
        variants={{
          hover: { y: 2 }
        }}
        transition={{ duration: 0.3 }}
      >
        <path d="M12 40C12 37.2386 20.0589 35 30 35C39.9411 35 48 37.2386 48 40M12 40V46C12 48.7614 20.0589 51 30 51C39.9411 51 48 48.7614 48 46V40M12 40C12 42.7614 20.0589 45 30 45C39.9411 45 48 42.7614 48 40" stroke="currentColor" strokeWidth="2" />
        <motion.circle cx="30" cy="40" r="2" fill="var(--primary-color, #3dfc55)" opacity="0" variants={{ hover: { opacity: 1 } }} />
      </motion.g>

      {/* Pulsing data line on the left side */}
      <motion.path
        d="M8 14V46"
        stroke="var(--primary-color, #3dfc55)"
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
            stroke: 'var(--primary-color, #3dfc55)',
            scale: 1.05,
            filter: 'drop-shadow(0px 0px 5px var(--primary-color, #3dfc55))'
          }
        }}
        transition={{ duration: 0.3 }}
      />
      <path d="M26 37H34M30 37V41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export const AiSvg: React.FC = () => {
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
          hover: { stroke: 'var(--primary-color, #3dfc55)', opacity: 0.4 }
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
        variants={{ hover: { stroke: 'var(--primary-color, #3dfc55)', scale: 1.2 } }}
      />
      <motion.circle
        cx="45"
        cy="30"
        r="4"
        fill="#050505"
        stroke="currentColor"
        strokeWidth="2"
        variants={{ hover: { stroke: 'var(--primary-color, #3dfc55)', scale: 1.2 } }}
      />
      <motion.circle
        cx="30"
        cy="45"
        r="4"
        fill="#050505"
        stroke="currentColor"
        strokeWidth="2"
        variants={{ hover: { stroke: 'var(--primary-color, #3dfc55)', scale: 1.2 } }}
      />
      <motion.circle
        cx="15"
        cy="30"
        r="4"
        fill="#050505"
        stroke="currentColor"
        strokeWidth="2"
        variants={{ hover: { stroke: 'var(--primary-color, #3dfc55)', scale: 1.2 } }}
      />

      {/* Central Node */}
      <motion.circle
        cx="30"
        cy="30"
        r="6"
        fill="currentColor"
        variants={{
          hover: { 
            fill: 'var(--primary-color, #3dfc55)',
            scale: 1.15,
            filter: 'drop-shadow(0px 0px 6px var(--primary-color, #3dfc55))'
          }
        }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  );
};

export const PlanningAgentSvg: React.FC = () => {
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
        <circle cx="30" cy="26" r="6" stroke="var(--primary-color, #3dfc55)" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M30 17V20M30 32V35M21 26H24M36 26H39" stroke="var(--primary-color, #3dfc55)" strokeWidth="2" strokeLinecap="round" />
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
        stroke="var(--primary-color, #3dfc55)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="100"
        initial={{ strokeDashoffset: 100 }}
        animate={{ strokeDashoffset: [100, 0, 100] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Blinking Terminal Cursor */}
      <motion.rect
        x="28" y="39" width="4" height="2" fill="var(--primary-color, #3dfc55)"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
      />
    </svg>
  );
};

export const TestingAgentSvg: React.FC = () => {
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
        stroke="var(--primary-color, #3dfc55)"
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
        cx="40" cy="38" r="3" fill="var(--primary-color, #3dfc55)"
        animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.2, 1, 0.2] }}
        transition={{ repeat: Infinity, duration: 1.5, delay: 0.75 }}
      />
    </svg>
  );
};

export const DeployAgentSvg: React.FC = () => {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Cloud Outline */}
      <path d="M18 38C15.5 38 13 36 12.2 33.5C10.5 29 13.5 24.5 18 24C19.5 19 24.5 16 30 17C35.5 16 40.5 19 42 24C46.5 24.5 49.5 29 47.8 33.5C47 36 44.5 38 42 38H18Z" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      
      {/* Upward Upload Arrow */}
      <motion.g
        animate={{ y: [4, -4, 4] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <path d="M30 44V26M30 26L24 32M30 26L36 32" stroke="var(--primary-color, #3dfc55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      {/* Floating Data Packets */}
      <motion.circle
        cx="22" cy="42" r="1.5" fill="var(--primary-color, #3dfc55)"
        animate={{ y: [0, -16], opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, delay: 0.2 }}
      />
      <motion.circle
        cx="38" cy="42" r="1.5" fill="var(--primary-color, #3dfc55)"
        animate={{ y: [0, -16], opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, delay: 0.9 }}
      />
    </svg>
  );
};
