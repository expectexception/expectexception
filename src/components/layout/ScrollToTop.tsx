import React, { useState, useEffect } from 'react';
import { Fab, useScrollTrigger, Zoom } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';

const ScrollToTop: React.FC = () => {
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const trigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 100,
    });

    return (
        <Zoom in={trigger}>
            <Fab
                onClick={scrollToTop}
                size="medium"
                aria-label="scroll back to top"
                sx={{
                    position: 'fixed',
                    bottom: { xs: 16, md: 32 },
                    right: { xs: 16, md: 32 },
                    bgcolor: 'primary.main',
                    color: 'white',
                    zIndex: 1000,
                    boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.35)',
                    '&:hover': {
                        bgcolor: 'primary.dark',
                        transform: 'scale(1.1) translateY(-4px)',
                        boxShadow: '0 12px 48px 0 rgba(59, 130, 246, 0.45)',
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <KeyboardArrowUp />
            </Fab>
        </Zoom>
    );
};

export default ScrollToTop;
