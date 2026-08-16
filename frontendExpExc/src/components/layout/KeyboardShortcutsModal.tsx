import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, Typography, Box, Grid, Chip, IconButton, alpha, useTheme,
} from '@mui/material';
import { Close, Keyboard, Search, Bookmark, Extension } from '@mui/icons-material';

interface Props {
    open: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    { key: '⌘ + K / Ctrl + K', description: 'Open Global Command Palette (Spotlight Search)', icon: <Search fontSize="small" /> },
    { key: 'Shift + P', description: 'Launch Multi-Tool Pipeline Builder', icon: <Extension fontSize="small" /> },
    { key: 'Shift + F', description: 'Toggle Bookmarked Tools View', icon: <Bookmark fontSize="small" /> },
    { key: 'Esc', description: 'Close Modals & Dialogs', icon: <Close fontSize="small" /> },
    { key: '?', description: 'Show Keyboard Shortcuts Cheat Sheet', icon: <Keyboard fontSize="small" /> },
];

const KeyboardShortcutsModal: React.FC<Props> = ({ open, onClose }) => {
    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#0d0e12',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
                    p: 1,
                }
            }}
            sx={{ '& .MuiBackdrop-root': { backdropFilter: 'blur(8px)' } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Keyboard sx={{ color: primaryColor, fontSize: 24 }} />
                    <Typography variant="h6" fontWeight={800} color="#ffffff">
                        Keyboard Shortcuts
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
                    <Close fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Use these global shortcuts to navigate, trigger workflows, and perform actions quickly from anywhere.
                </Typography>

                <Grid container spacing={2}>
                    {SHORTCUTS.map((sc, idx) => (
                        <Grid item xs={12} key={idx}>
                            <Box sx={{
                                p: 1.75,
                                borderRadius: 2,
                                bgcolor: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    bgcolor: alpha(primaryColor, 0.06),
                                    borderColor: alpha(primaryColor, 0.2),
                                }
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ color: primaryColor, display: 'flex' }}>
                                        {sc.icon}
                                    </Box>
                                    <Typography variant="body2" fontWeight={600} color="#ffffff">
                                        {sc.description}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={sc.key}
                                    size="small"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                                        color: primaryColor,
                                        border: `1px solid ${alpha(primaryColor, 0.3)}`,
                                        px: 0.5,
                                    }}
                                />
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
        </Dialog>
    );
};

export default KeyboardShortcutsModal;
