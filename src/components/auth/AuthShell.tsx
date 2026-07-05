import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import { Bookmark, History, Devices, Bolt } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

interface AuthShellProps {
    children: React.ReactNode;
}

const PERKS = [
    { icon: Bookmark, text: 'Bookmark your favorite tools for one-tap access' },
    { icon: History, text: 'Track your tool usage and conversation history' },
    { icon: Bolt, text: 'Priority access to new AI-assisted features' },
    { icon: Devices, text: 'Your settings and bookmarks follow you to any device' },
];

/** Shared two-column auth layout: a branding/perks panel (hidden below `md`)
 * next to a slot for the actual Login/Register card. Keeps both auth pages
 * visually identical and gives the auth flow a more deliberate, "product"
 * feel than a bare centered card on black. */
const AuthShell: React.FC<AuthShellProps> = ({ children }) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Branding panel */}
            <Box
                sx={{
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'center',
                    width: '42%',
                    minWidth: 380,
                    position: 'relative',
                    overflow: 'hidden',
                    px: 6,
                    borderRight: `1px solid ${alpha(primary, 0.1)}`,
                    background: `radial-gradient(circle at 20% 20%, ${alpha(primary, 0.1)}, transparent 55%), radial-gradient(circle at 80% 80%, ${alpha(secondary, 0.08)}, transparent 55%)`,
                }}
            >
                <Box sx={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: `radial-gradient(${alpha('#ffffff', 0.4)} 1px, transparent 1px)`, backgroundSize: '22px 22px', pointerEvents: 'none' }} />

                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                    <RouterLink to="/" style={{ textDecoration: 'none' }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', mb: 5, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                            Expect<Box component="span" sx={{ color: primary }}>Exception</Box>
                        </Typography>
                    </RouterLink>

                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#ffffff', mb: 2, lineHeight: 1.2 }}>
                        Every tool.<br />One account.
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 5, maxWidth: 380 }}>
                        Sign in to unlock bookmarks, usage history, and personalized access across every tool and game on the site.
                    </Typography>

                    <Stack spacing={2.5}>
                        {PERKS.map((perk, i) => (
                            <motion.div
                                key={perk.text}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{
                                        width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        bgcolor: alpha(primary, 0.1), color: primary,
                                    }}>
                                        <perk.icon sx={{ fontSize: 20 }} />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">{perk.text}</Typography>
                                </Stack>
                            </motion.div>
                        ))}
                    </Stack>
                </motion.div>
            </Box>

            {/* Form panel */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: { xs: 2.5, sm: 4 },
                    py: 8,
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default AuthShell;
