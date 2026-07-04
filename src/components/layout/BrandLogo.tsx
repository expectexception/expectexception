import React from 'react';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material';

interface BrandLogoProps {
    size?: number;
    /** Runs the one-time draw-in on mount. Turn off for places the logo
     * re-mounts often (e.g. inside a list) so it doesn't replay constantly. */
    animateIn?: boolean;
}

/** The ExpectException mark: two angle brackets around a blinking cursor —
 * literally "expect an exception" rendered as a terminal waiting for input.
 * Replaces the generic MUI <Code/> icon used in the header/footer and the
 * old logo192.png raster image on the static loading screen. Pure SVG +
 * framer-motion, no image request. */
const BrandLogo: React.FC<BrandLogoProps> = ({ size = 32, animateIn = true }) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;

    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
                <linearGradient id="brand-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={primary} />
                    <stop offset="100%" stopColor={secondary} />
                </linearGradient>
            </defs>

            {/* Slow-breathing outer ring */}
            <motion.circle
                cx="50" cy="50" r="46"
                stroke={alpha(primary, 0.2)}
                strokeWidth="2"
                animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '50px 50px' }}
            />

            {/* Left bracket */}
            <motion.path
                d="M 40 26 L 15 50 L 40 74"
                stroke="url(#brand-logo-grad)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={100}
                initial={animateIn ? { strokeDashoffset: 100 } : { strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            />

            {/* Right bracket */}
            <motion.path
                d="M 60 26 L 85 50 L 60 74"
                stroke="url(#brand-logo-grad)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={100}
                initial={animateIn ? { strokeDashoffset: 100 } : { strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            />

            {/* Blinking terminal cursor */}
            <motion.rect
                x="46" y="32" width="8" height="36" rx="4"
                fill={primary}
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.55, 1], ease: 'easeInOut' }}
                style={{ filter: `drop-shadow(0 0 4px ${primary})` }}
            />
        </svg>
    );
};

export default BrandLogo;
