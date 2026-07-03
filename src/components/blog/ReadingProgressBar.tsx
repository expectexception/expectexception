import React, { useEffect, useState } from 'react';
import { Box, LinearProgress } from '@mui/material';

const ReadingProgressBar: React.FC = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const totalScroll = documentHeight - windowHeight;
            const currentProgress = (scrollTop / totalScroll) * 100;

            setProgress(Math.min(currentProgress, 100));
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1200,
            }}
        >
            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    height: 3,
                    bgcolor: 'transparent',
                    '& .MuiLinearProgress-bar': {
                        bgcolor: 'primary.main',
                    },
                }}
            />
        </Box>
    );
};

export default ReadingProgressBar;
