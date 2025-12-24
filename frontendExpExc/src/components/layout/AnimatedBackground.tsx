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
            {/* Gradient Orb 1 */}
            <motion.div
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -50, 50, 0],
                    scale: [1, 1.2, 0.9, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }}
                style={{
                    position: 'absolute',
                    top: '20%',
                    left: '10%',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color1} 0%, transparent 70%)`,
                    filter: 'blur(60px)',
                    opacity: 0.2,
                }}
            />

            {/* Gradient Orb 2 */}
            <motion.div
                animate={{
                    x: [0, -70, 40, 0],
                    y: [0, 60, -30, 0],
                    scale: [1, 1.1, 0.8, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }}
                style={{
                    position: 'absolute',
                    top: '50%',
                    right: '15%',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color2} 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                    opacity: 0.15,
                }}
            />

            {/* Gradient Orb 3 */}
            <motion.div
                animate={{
                    x: [0, 50, -50, 0],
                    y: [0, 30, -30, 0],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }}
                style={{
                    position: 'absolute',
                    bottom: '-10%',
                    left: '30%',
                    width: '700px',
                    height: '400px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${theme.palette.info.main} 0%, transparent 70%)`,
                    filter: 'blur(90px)',
                    opacity: 0.1,
                }}
            />

            {/* Gradient Orb 4 - Additional dynamic element */}
            <motion.div
                animate={{
                    x: [0, -80, 80, 0],
                    y: [0, -40, 40, 0],
                    scale: [1, 1.3, 0.9, 1],
                }}
                transition={{
                    duration: 22,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }}
                style={{
                    position: 'absolute',
                    top: '60%',
                    left: '60%',
                    width: '550px',
                    height: '550px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${theme.palette.success.main} 0%, transparent 70%)`,
                    filter: 'blur(100px)',
                    opacity: 0.08,
                }}
            />
        </Box>
    );
};

export default AnimatedBackground;
