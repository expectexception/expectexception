import React, { useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, Chip, Stack } from '@mui/material';
import { Contrast, CheckCircle, Cancel } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

const hexToRgb = (hex: string): [number, number, number] | null => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
    const num = parseInt(full, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

// WCAG relative luminance formula (sRGB → linear → weighted sum).
const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
    const toLinear = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

const contrastRatio = (hex1: string, hex2: string): number | null => {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    if (!rgb1 || !rgb2) return null;
    const l1 = relativeLuminance(rgb1);
    const l2 = relativeLuminance(rgb2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
};

const ColorContrastChecker: React.FC = () => {
    const [fg, setFg] = useState('#39ff88');
    const [bg, setBg] = useState('#0d0e12');

    const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg]);

    const checks = ratio ? [
        { label: 'AA — Normal Text', pass: ratio >= 4.5 },
        { label: 'AA — Large Text', pass: ratio >= 3 },
        { label: 'AAA — Normal Text', pass: ratio >= 7 },
        { label: 'AAA — Large Text', pass: ratio >= 4.5 },
    ] : [];

    return (
        <ServicePageShell
            icon={Contrast}
            title="Color Contrast Checker"
            subtitle="Check WCAG AA/AAA contrast ratios between a foreground and background color — for accessible text on any UI."
        >
            <Seo title="Color Contrast Checker - WCAG AA/AAA Accessibility Tool" />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
            }}>
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                label="Foreground (text)"
                                value={fg}
                                onChange={(e) => setFg(e.target.value)}
                                fullWidth
                                InputProps={{ startAdornment: <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: fg, mr: 1, border: '1px solid rgba(255,255,255,0.2)' }} /> }}
                            />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                label="Background"
                                value={bg}
                                onChange={(e) => setBg(e.target.value)}
                                fullWidth
                                InputProps={{ startAdornment: <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: bg, mr: 1, border: '1px solid rgba(255,255,255,0.2)' }} /> }}
                            />
                        </Box>
                    </Box>

                    <Box sx={{
                        p: 4,
                        borderRadius: '12px',
                        bgcolor: bg,
                        border: '1px solid rgba(255,255,255,0.08)',
                        mb: 3,
                        textAlign: 'center',
                    }}>
                        <Typography sx={{ color: fg, fontSize: '1.4rem', fontWeight: 800, mb: 0.5 }}>
                            The quick brown fox
                        </Typography>
                        <Typography sx={{ color: fg, fontSize: '0.95rem' }}>
                            jumps over the lazy dog
                        </Typography>
                    </Box>

                    <Typography variant="h4" fontWeight={900} sx={{ textAlign: 'center', mb: 0.5 }}>
                        {ratio ? `${ratio.toFixed(2)} : 1` : 'Invalid color'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                        Contrast ratio
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                        {checks.map((c) => (
                            <Chip
                                key={c.label}
                                label={c.label}
                                icon={c.pass ? <CheckCircle /> : <Cancel />}
                                color={c.pass ? 'success' : 'error'}
                                variant="outlined"
                            />
                        ))}
                    </Stack>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ColorContrastChecker;
