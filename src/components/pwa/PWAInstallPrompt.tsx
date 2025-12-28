import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box,
    Button,
    Typography,
    IconButton,
    Stack,
    useTheme,
    useMediaQuery,
    Avatar,
    Paper,
    Backdrop
} from '@mui/material';
import {
    Close,
    GetApp,
    NotificationsActive,
    Share,
    AddToHomeScreen
} from '@mui/icons-material';
import NotificationManager from '../../utils/NotificationManager';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallPromptProps {
    deferredPrompt: BeforeInstallPromptEvent | null;
    onInstall: () => void;
    onDismiss: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ deferredPrompt, onInstall, onDismiss }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [step, setStep] = useState<'install' | 'notifications'>('install');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (deferredPrompt) {
            const lastDismissed = localStorage.getItem('pwaPromptLastDismissed');
            if (lastDismissed) {
                const timeSinceLastDismiss = Date.now() - parseInt(lastDismissed, 10);
                // 6 hours * 60 min * 60 sec * 1000 ms = 21600000
                if (timeSinceLastDismiss < 21600000) {
                    console.log('PWA Prompt suppressed: dismissed less than 6 hours ago.');
                    return;
                }
            }

            // Small delay to ensure smooth entry
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [deferredPrompt]);

    const handleInstallClick = async () => {
        onInstall();
        // After install (or attempt), move to notifications step if supported and not denied
        if (NotificationManager.isSupported() && NotificationManager.getPermissionStatus() === 'default') {
            setStep('notifications');
        } else {
            setIsVisible(false);
        }
    };

    const handleNotificationEnable = async () => {
        await NotificationManager.subscribe();
        setIsVisible(false);
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Allow exit animation
        localStorage.setItem('pwaPromptLastDismissed', Date.now().toString());
    };

    // Variants for animation
    const containerVariants = {
        hidden: { y: '100%', opacity: 0 },
        visible: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 0 }
    };

    const desktopVariants = {
        hidden: { y: 20, opacity: 0, scale: 0.95 },
        visible: { y: 0, opacity: 1, scale: 1 },
        exit: { y: 20, opacity: 0, scale: 0.95 }
    };

    const GlassPaper = (props: any) => (
        <Paper
            elevation={24}
            sx={{
                background: theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.8)' // Darker slate for dark mode
                    : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px)',
                borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
                color: theme.palette.text.primary,
                ...props.sx
            }}
        >
            {props.children}
        </Paper>
    );

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop for mobile focus */}
                    {isMobile && (
                        <Backdrop
                            open={isVisible}
                            onClick={handleClose}
                            sx={{ zIndex: theme.zIndex.drawer + 1, backdropFilter: 'blur(4px)' }}
                        />
                    )}

                    <Box
                        component={motion.div}
                        variants={isMobile ? containerVariants : desktopVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        sx={{
                            position: 'fixed',
                            bottom: isMobile ? 0 : 32,
                            right: isMobile ? 0 : 32,
                            left: isMobile ? 0 : 'auto',
                            width: isMobile ? '100%' : 400,
                            maxWidth: '100%',
                            zIndex: theme.zIndex.drawer + 2,
                        }}
                    >
                        <GlassPaper sx={{ p: 0 }}>
                            {/* Header Gradient */}
                            <Box sx={{
                                height: 6,
                                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                            }} />

                            <Box sx={{ p: 3, position: 'relative' }}>
                                <IconButton
                                    onClick={handleClose}
                                    size="small"
                                    sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        color: 'text.secondary',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                                    }}
                                >
                                    <Close fontSize="small" />
                                </IconButton>

                                <Stack spacing={2.5}>
                                    {/* Content for Install Step */}
                                    {step === 'install' && (
                                        <>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar
                                                    src="/logo192.png"
                                                    variant="rounded"
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        boxShadow: theme.shadows[3],
                                                        bgcolor: 'transparent'
                                                    }}
                                                />
                                                <Box>
                                                    <Typography variant="h6" fontWeight={800} lineHeight={1.2} color="text.primary">
                                                        Install App
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Get the full native experience.
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                <Box sx={{ flex: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, textAlign: 'center' }}>
                                                    <GetApp color="primary" />
                                                    <Typography variant="caption" display="block" fontWeight={600} color="text.primary">Offline</Typography>
                                                </Box>
                                                <Box sx={{ flex: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, textAlign: 'center' }}>
                                                    <NotificationsActive color="secondary" />
                                                    <Typography variant="caption" display="block" fontWeight={600} color="text.primary">Updates</Typography>
                                                </Box>
                                                <Box sx={{ flex: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, textAlign: 'center' }}>
                                                    <Share color="action" />
                                                    <Typography variant="caption" display="block" fontWeight={600} color="text.primary">Share</Typography>
                                                </Box>
                                            </Stack>

                                            <Button
                                                variant="contained"
                                                size="large"
                                                fullWidth
                                                startIcon={<AddToHomeScreen />}
                                                onClick={handleInstallClick}
                                                sx={{
                                                    borderRadius: 3,
                                                    py: 1.5,
                                                    fontSize: '1rem',
                                                    fontWeight: 700,
                                                    boxShadow: `0 8px 20px ${theme.palette.primary.main}40`,
                                                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                                                }}
                                            >
                                                Add to Home Screen
                                            </Button>
                                        </>
                                    )}

                                    {/* Content for Notifications Step */}
                                    {step === 'notifications' && (
                                        <>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar sx={{ bgcolor: theme.palette.secondary.dark, color: theme.palette.common.white }}>
                                                    <NotificationsActive />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={800} color="text.primary">
                                                        Stay Updated?
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Get notified when downloads complete.
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <Stack direction="row" spacing={2}>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    onClick={handleClose}
                                                    sx={{
                                                        borderRadius: 2,
                                                        borderColor: 'rgba(255,255,255,0.2)',
                                                        color: 'text.secondary',
                                                        '&:hover': {
                                                            borderColor: 'text.primary',
                                                            color: 'text.primary'
                                                        }
                                                    }}
                                                >
                                                    Later
                                                </Button>
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    onClick={handleNotificationEnable}
                                                    sx={{
                                                        borderRadius: 2,
                                                        background: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, ${theme.palette.secondary.dark} 90%)`,
                                                        color: 'white'
                                                    }}
                                                >
                                                    Enable
                                                </Button>
                                            </Stack>
                                        </>
                                    )}
                                </Stack>
                            </Box>
                        </GlassPaper>
                    </Box>
                </>
            )}
        </AnimatePresence>
    );
};

export default PWAInstallPrompt;
