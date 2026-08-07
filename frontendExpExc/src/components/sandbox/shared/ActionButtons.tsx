import React from 'react';
import { Box, ButtonBase, Typography, alpha } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

export interface ActionButtonSpec {
    key: string;
    label: string;
    icon?: SvgIconComponent;
    onPress: () => void;
    accentColor?: string;
    /** Bigger primary action (e.g. "JUMP", "DROP") vs a smaller secondary one. */
    size?: 'large' | 'small';
}

interface ActionButtonsProps {
    buttons: ActionButtonSpec[];
}

/** Row of large round tap targets for single/multi-action games (Tetris
 * rotate/drop, Flappy Blocks/Endless Runner jump, ...). */
const ActionButtons: React.FC<ActionButtonsProps> = ({ buttons }) => (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {buttons.map((btn) => {
            const accent = btn.accentColor || '#00e5ff';
            const dim = btn.size === 'small' ? 52 : 68;
            const Icon = btn.icon;
            return (
                <ButtonBase
                    key={btn.key}
                    onClick={btn.onPress}
                    sx={{
                        width: dim,
                        height: dim,
                        borderRadius: '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.25,
                        color: '#ffffff',
                        bgcolor: alpha(accent, 0.15),
                        border: `1px solid ${alpha(accent, 0.4)}`,
                        '&:active': { bgcolor: alpha(accent, 0.35) },
                        touchAction: 'manipulation',
                    }}
                >
                    {Icon && <Icon sx={{ fontSize: btn.size === 'small' ? 20 : 26 }} />}
                    <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
                        {btn.label}
                    </Typography>
                </ButtonBase>
            );
        })}
    </Box>
);

export default ActionButtons;
