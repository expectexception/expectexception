import React, { useState, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Stack, Grid, Tooltip, Chip, Button, useTheme, alpha, Paper, Slider } from '@mui/material';
import { Palette, ContentCopy, Check } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const hexToHsl = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const hslToHex = (h: number, s: number, l: number): string => {
    const sl = s / 100, ll = l / 100;
    const a = sl * Math.min(ll, 1 - ll);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const c = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

const generatePalette = (hex: string, steps: number) => {
    const [h, s] = hexToHsl(hex);
    return Array.from({ length: steps }, (_, i) => {
        const l = Math.round(5 + (i / (steps - 1)) * 85);
        return { hex: hslToHex(h, s, l), l };
    });
};

const generateShades = (hex: string) => {
    const [h, s] = hexToHsl(hex);
    const levels = [95, 85, 70, 55, 40, 30, 20, 10];
    const labels = ['50', '100', '200', '300', '400', '500', '600', '700'];
    return levels.map((l, i) => ({ hex: hslToHex(h, s, l), label: labels[i] }));
};

const contrast = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 128 ? '#000000' : '#ffffff';
};

const ColorSwatch: React.FC<{ hex: string; label?: string }> = ({ hex, label }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(hex).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    };
    return (
        <Tooltip title={copied ? 'Copied!' : `Click to copy ${hex}`} placement="top">
            <Box onClick={copy} sx={{
                height: 72, borderRadius: 1.5, bgcolor: hex, cursor: 'pointer', position: 'relative',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: 0.75,
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 20px rgba(0,0,0,0.4)` },
            }}>
                {copied && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 'inherit' }}>
                        <Check sx={{ color: '#fff', fontSize: 20 }} />
                    </Box>
                )}
                {label && <Typography variant="caption" sx={{ color: contrast(hex), fontWeight: 700, fontSize: '0.65rem' }}>{label}</Typography>}
                <Typography variant="caption" sx={{ color: contrast(hex), fontSize: '0.62rem', opacity: 0.8 }}>{hex}</Typography>
            </Box>
        </Tooltip>
    );
};

const ColorPaletteGenerator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [baseColor, setBaseColor] = useState('#3dfc55');
    const [steps, setSteps] = useState(10);

    const palette = generatePalette(baseColor, steps);
    const shades = generateShades(baseColor);
    const [h, s, l] = hexToHsl(baseColor);

    const complementary = hslToHex((h + 180) % 360, s, l);
    const triadic = [hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)];
    const analogous = [hslToHex((h - 30 + 360) % 360, s, l), hslToHex((h + 30) % 360, s, l)];

    return (
        <ServicePageShell icon={Palette} title="Color Palette Generator" subtitle="Generate beautiful color palettes, shades, and harmonies from any color" maxWidth="xl">
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" display="block" sx={{ mb: 0.5 }}>Base Color</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: baseColor, border: '3px solid rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative' }}>
                                    <input type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)}
                                        style={{ position: 'absolute', inset: '-4px', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', cursor: 'pointer', opacity: 0 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontFamily="monospace" fontWeight="700" color={primary}>{baseColor.toUpperCase()}</Typography>
                                    <Typography variant="caption" color="text.disabled">HSL({h}, {s}%, {l}%)</Typography>
                                </Box>
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 180 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" display="block" sx={{ mb: 0.5 }}>Steps: {steps}</Typography>
                            <Slider value={steps} onChange={(_, v) => setSteps(v as number)} min={5} max={20} step={1} sx={{ color: primary }} />
                        </Box>
                    </Box>

                    {/* Gradient palette */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.72rem' }}>
                            Lightness Scale
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {palette.map((swatch, i) => (
                                <Box key={i} sx={{ flex: 1, minWidth: 50 }}>
                                    <ColorSwatch hex={swatch.hex} />
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Material-style shades */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.72rem' }}>
                            Material Design Shades
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {shades.map((s) => (
                                <Box key={s.label} sx={{ flex: 1, minWidth: 60 }}>
                                    <ColorSwatch hex={s.hex} label={s.label} />
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Harmonies */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.72rem' }}>
                            Color Harmonies
                        </Typography>
                        <Grid container spacing={2}>
                            {[
                                { label: 'Complementary', colors: [baseColor, complementary] },
                                { label: 'Triadic', colors: [baseColor, ...triadic] },
                                { label: 'Analogous', colors: [...analogous, baseColor] },
                            ].map(harmony => (
                                <Grid item xs={12} sm={4} key={harmony.label}>
                                    <Paper sx={{ p: 2, bgcolor: alpha('#fff', 0.02), border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                        <Typography variant="caption" fontWeight="700" color="text.secondary" display="block" sx={{ mb: 1 }}>{harmony.label}</Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            {harmony.colors.map((c, i) => <Box key={i} sx={{ flex: 1 }}><ColorSwatch hex={c} /></Box>)}
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ColorPaletteGenerator;
