import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box,
    Button,
    Typography,
    Modal,
    useTheme,
    useMediaQuery,
    Fade,
    Backdrop,
    IconButton,
    Avatar,
    Stack
} from '@mui/material';
import {
    Close,
    GetApp,
    AddToHomeScreen,
    Star,
    Speed,
    Security
} from '@mui/icons-material';

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
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!isMobile) return;

        if (deferredPrompt) {
            const lastDismissed = localStorage.getItem('pwaPromptLastDismissed');
            if (lastDismissed) {
                const timeSinceLastDismiss = Date.now() - parseInt(lastDismissed, 10);
                // 24 hours cooldown
                if (timeSinceLastDismiss < 86400000) {
                    return;
                }
            }
            // Small delay for better UX
            const timer = setTimeout(() => setOpen(true), 2000);
            return () => clearTimeout(timer);
        } else {
            setOpen(false);
        }
    }, [deferredPrompt, isMobile]);

    const handleInstallClick = () => {
        onInstall();
        setOpen(false);
    };

    const handleClose = () => {
        setOpen(false);
        localStorage.setItem('pwaPromptLastDismissed', Date.now().toString());
        setTimeout(onDismiss, 300);
    };

    const GlassCard = React.forwardRef<HTMLDivElement>((props, ref) => (
        <Box
            ref={ref}
            sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: isMobile ? '90%' : 450,
                outline: 'none',
                borderRadius: 4,
                overflow: 'hidden',
                background: theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.6)'
                    : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            }}
        >
            {/* Decorative Gradient Background (Orb effect inside card) */}
            <Box sx={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: `radial-gradient(circle at 50% 50%, ${theme.palette.primary.main}15 0%, transparent 50%)`,
                zIndex: -1,
                pointerEvents: 'none'
            }} />

            {/* Content */}
            <Box sx={{ p: 4, position: 'relative' }}>
                <IconButton
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                >
                    <Close />
                </IconButton>

                <Stack spacing={3} alignItems="center">
                    {/* Logo / Icon */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Avatar
                            src="/logo192.png"
                            sx={{
                                width: 80,
                                height: 80,
                                boxShadow: `0 0 30px ${theme.palette.primary.main}60`,
                                bgcolor: theme.palette.primary.main
                            }}
                        >
                            <GetApp />
                        </Avatar>
                    </motion.div>

                    <Box textAlign="center">
                        <Typography variant="h5" fontWeight={800} gutterBottom sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Install ExpectException
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Install our app for a faster, full-screen experience with offline access.
                        </Typography>
                    </Box>

                    {/* Features Grid */}
                    <Stack direction="row" spacing={1} width="100%" justifyContent="center">
                        {[
                            { icon: <Speed fontSize="small" />, label: 'Faster' },
                            { icon: <Security fontSize="small" />, label: 'Secure' },
                            { icon: <Star fontSize="small" />, label: 'Premium' },
                        ].map((feature, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    flex: 1,
                                    py: 1.5,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <Box sx={{ color: theme.palette.primary.main }}>{feature.icon}</Box>
                                <Typography variant="caption" fontWeight={600} color="text.primary">
                                    {feature.label}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>

                    {/* Actions */}
                    <Stack width="100%" spacing={1.5}>
                        <Button
                            onClick={handleInstallClick}
                            variant="contained"
                            size="large"
                            startIcon={<AddToHomeScreen />}
                            sx={{
                                py: 1.5,
                                borderRadius: 3,
                                fontSize: '1rem',
                                fontWeight: 700,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                boxShadow: `0 8px 20px ${theme.palette.primary.main}40`,
                                '&:hover': {
                                    boxShadow: `0 12px 28px ${theme.palette.primary.main}60`,
                                }
                            }}
                        >
                            Install Now
                        </Button>
                        <Button
                            onClick={handleClose}
                            variant="text"
                            sx={{
                                color: 'text.secondary',
                                borderRadius: 3,
                                '&:hover': { color: 'text.primary', bgcolor: 'transparent' }
                            }}
                        >
                            Maybe Later
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Box>
    ));

    return (
        <Modal
            open={open}
            onClose={handleClose}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{
                timeout: 500,
                sx: {
                    backdropFilter: 'blur(8px)',
                    bgcolor: 'rgba(0,0,0,0.4)',
                    pointerEvents: 'auto' // Ensure clicks are registered
                },
                onClick: handleClose // Explicitly handle click
            }}
        >
            <Fade in={open}>
                <Box onClick={handleClose} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    outline: 'none'
                }}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <GlassCard />
                    </div>
                </Box>
            </Fade>
        </Modal>
    );
};

export default PWAInstallPrompt;
