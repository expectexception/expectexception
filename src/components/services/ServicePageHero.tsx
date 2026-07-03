import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import type { SvgIconComponent } from '@mui/icons-material';

interface ServicePageHeroProps {
    icon: SvgIconComponent;
    title: string;
    subtitle: string;
}

/** Shared animated header for service pages: rotating SVG glow rings behind a
 * floating icon, gradient title, and a staggered entrance - keeps every tool
 * page visually consistent with the homepage instead of a static icon+text block. */
const ServicePageHero: React.FC<ServicePageHeroProps> = ({ icon: Icon, title, subtitle }) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;

    return (
        <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Box sx={{ position: 'relative', display: 'inline-block', width: 120, height: 120, mb: 1 }}>
                <Box
                    component={motion.svg}
                    viewBox="0 0 120 120"
                    sx={{ position: 'absolute', inset: 0, zIndex: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                >
                    <circle cx="60" cy="60" r="52" fill="none" stroke={alpha(primary, 0.25)} strokeWidth="1.5" strokeDasharray="4 10" />
                    <circle cx="60" cy="60" r="40" fill="none" stroke={alpha(secondary, 0.2)} strokeWidth="1" strokeDasharray="2 6" />
                </Box>
                <Box
                    component={motion.div}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                    }}
                >
                    <Icon sx={{ fontSize: 60, color: 'primary.main', filter: `drop-shadow(0 0 15px ${alpha(primary, 0.5)})` }} />
                </Box>
            </Box>

            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <Typography variant="h3" component="h1" gutterBottom sx={{
                    fontWeight: 900,
                    background: `linear-gradient(135deg, #ffffff 30%, ${primary} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                    mb: 2,
                }}>
                    {title}
                </Typography>
            </motion.div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.15 }}
            >
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                    {subtitle}
                </Typography>
            </motion.div>
        </Box>
    );
};

export default ServicePageHero;
