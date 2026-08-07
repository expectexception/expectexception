import React from 'react';
import { Box, IconButton, alpha } from '@mui/material';
import { KeyboardArrowUp, KeyboardArrowDown, KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface DPadControlsProps {
    onDirection: (direction: Direction) => void;
    accentColor?: string;
}

const dpadButtonSx = (accent: string) => ({
    width: 52,
    height: 52,
    color: '#ffffff',
    bgcolor: alpha(accent, 0.15),
    border: `1px solid ${alpha(accent, 0.4)}`,
    '&:active': { bgcolor: alpha(accent, 0.35) },
    touchAction: 'manipulation' as const,
});

/** Thumb-sized on-screen D-pad for directional games (Snake, Tetris, MazeRunner,
 * 2048, ...). Fires once per press via onDirection - games with continuous
 * movement should call it on their own repeat/interval if needed. */
const DPadControls: React.FC<DPadControlsProps> = ({ onDirection, accentColor = '#00e5ff' }) => {
    const btnSx = dpadButtonSx(accentColor);
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 52px)',
                gridTemplateRows: 'repeat(3, 52px)',
                gap: 0.75,
                justifyContent: 'center',
                mx: 'auto',
            }}
        >
            <Box sx={{ gridColumn: 2, gridRow: 1 }}>
                <IconButton sx={btnSx} onClick={() => onDirection('UP')} aria-label="Up">
                    <KeyboardArrowUp />
                </IconButton>
            </Box>
            <Box sx={{ gridColumn: 1, gridRow: 2 }}>
                <IconButton sx={btnSx} onClick={() => onDirection('LEFT')} aria-label="Left">
                    <KeyboardArrowLeft />
                </IconButton>
            </Box>
            <Box sx={{ gridColumn: 3, gridRow: 2 }}>
                <IconButton sx={btnSx} onClick={() => onDirection('RIGHT')} aria-label="Right">
                    <KeyboardArrowRight />
                </IconButton>
            </Box>
            <Box sx={{ gridColumn: 2, gridRow: 3 }}>
                <IconButton sx={btnSx} onClick={() => onDirection('DOWN')} aria-label="Down">
                    <KeyboardArrowDown />
                </IconButton>
            </Box>
        </Box>
    );
};

export default DPadControls;
