import React, { useMemo } from 'react';
import { Box } from '@mui/material';

const CleanStarBackground = () => {
    // Simple static stars to prove it works
    const stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.7 + 0.3
    })), []);

    return (
        <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, background: '#0f172a' }}>
            {stars.map(s => (
                <Box
                    key={s.id}
                    sx={{
                        position: 'absolute',
                        left: `${s.left}%`,
                        top: `${s.top}%`,
                        width: s.size,
                        height: s.size,
                        borderRadius: '50%',
                        bgcolor: 'white',
                        opacity: s.opacity,
                    }}
                />
            ))}
        </Box>
    );
};

export default CleanStarBackground;
