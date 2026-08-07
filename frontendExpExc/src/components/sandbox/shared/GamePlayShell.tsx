import React from 'react';
import { createPortal } from 'react-dom';
import { Box, IconButton, Typography, Stack, Container, alpha } from '@mui/material';
import { ArrowBack, Replay } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { SvgIconComponent } from '@mui/icons-material';
import ServicePageHero from '../../services/ServicePageHero';
import { useIsPlayModeDevice, useLockBodyScroll } from './useFullscreenPlayMode';

interface GamePlayShellProps {
    title: string;
    icon: SvgIconComponent;
    subtitle: string;
    /** Rendered docked at the bottom of the fullscreen mobile layout (a D-pad,
     * action buttons, etc). Omit for games that are fully playable by tapping/
     * dragging directly on the board/canvas (Minesweeper, Pong, ...). */
    controls?: React.ReactNode;
    /** Wired to the restart/reset button in the mobile play-mode top bar. */
    onRestart?: () => void;
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

/** Shared game-page layout. Desktop/mouse: the classic ServicePageHero +
 * Container + page flow every game already used. Touch/narrow-viewport:
 * a fixed fullscreen "play mode" - board centered above a thumb-height
 * control dock, page chrome (nav, hero, footer) hidden - via a portal to
 * `document.body` so it renders truly fixed regardless of any transformed
 * ancestor (PageTransition animates via CSS transform, which would otherwise
 * break `position: fixed`). */
const GamePlayShell: React.FC<GamePlayShellProps> = ({
    title, icon: Icon, subtitle, controls, onRestart, maxWidth = 'sm', children,
}) => {
    const navigate = useNavigate();
    const isPlayMode = useIsPlayModeDevice();
    useLockBodyScroll(isPlayMode);

    if (!isPlayMode) {
        return (
            <Container maxWidth={maxWidth} sx={{ py: { xs: 2, sm: 6 }, px: { xs: 1.5, sm: 3 } }}>
                <ServicePageHero title={title} subtitle={subtitle} icon={Icon} />
                {children}
            </Container>
        );
    }

    return createPortal(
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 20000,
                height: '100dvh',
                width: '100vw',
                bgcolor: '#050608',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                    px: 1,
                    py: 0.75,
                    flexShrink: 0,
                    borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`,
                }}
            >
                <IconButton size="small" onClick={() => navigate('/sandbox')} sx={{ color: '#ffffff' }} aria-label="Back to sandbox">
                    <ArrowBack fontSize="small" />
                </IconButton>
                <Typography variant="subtitle2" fontWeight={800} noWrap color="#ffffff" sx={{ flex: 1, textAlign: 'center', px: 1 }}>
                    {title}
                </Typography>
                {onRestart ? (
                    <IconButton size="small" onClick={onRestart} sx={{ color: '#ffffff' }} aria-label="Restart game">
                        <Replay fontSize="small" />
                    </IconButton>
                ) : (
                    <Box sx={{ width: 34 }} />
                )}
            </Stack>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 1,
                    overflow: 'hidden',
                }}
            >
                {children}
            </Box>

            {controls && (
                <Box
                    sx={{
                        flexShrink: 0,
                        px: 2,
                        pt: 1.5,
                        pb: 'max(14px, env(safe-area-inset-bottom))',
                        borderTop: `1px solid ${alpha('#ffffff', 0.08)}`,
                        bgcolor: alpha('#0d0e12', 0.6),
                    }}
                >
                    {controls}
                </Box>
            )}
        </Box>,
        document.body
    );
};

export default GamePlayShell;
