import React from 'react';
import { Box, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

const AnimatedBackground = () => {
    const theme = useTheme();

    // Define colors based on the theme
    const color1 = theme.palette.primary.dark;
    const color2 = theme.palette.secondary.dark;
    const color3 = '#0f172a'; // Deep slate

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: -1,
                overflow: 'hidden',
                background: color3,
            }}
        >
        </Box>
    );
};

export default AnimatedBackground;
