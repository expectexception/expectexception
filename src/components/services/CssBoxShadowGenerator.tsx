import React, { useState, useCallback } from 'react';
import {
    Box, Typography, Slider, Stack, Grid, TextField, Switch,
    FormControlLabel, IconButton, Chip, Paper,
} from '@mui/material';
import { ContentCopy, Check, Layers as LayersIcon } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

interface Shadow {
    x: number; y: number; blur: number; spread: number;
    color: string; opacity: number; inset: boolean;
}

const defaultShadow = (): Shadow => ({ x: 4, y: 4, blur: 10, spread: 0, color: '#000000', opacity: 40, inset: false });

const toCss = (s: Shadow) =>
    `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${hexToRgba(s.color, s.opacity)}`;

function hexToRgba(hex: string, opacity: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${(opacity / 100).toFixed(2)})`;
}

const CssBoxShadowGenerator: React.FC = () => {
    const [shadows, setShadows] = useState<Shadow[]>([defaultShadow()]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [bgColor, setBgColor] = useState('#1e293b');
    const [boxColor, setBoxColor] = useState('#3b82f6');
    const [copied, setCopied] = useState(false);

    const cssValue = shadows.map(toCss).join(', ');
    const fullCss = `box-shadow: ${cssValue};`;

    const update = useCallback((key: keyof Shadow, val: any) => {
        setShadows(prev => prev.map((s, i) => i === activeIdx ? { ...s, [key]: val } : s));
    }, [activeIdx]);

    const copy = () => {
        navigator.clipboard.writeText(fullCss);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const active = shadows[activeIdx];

    return (
        <ServicePageShell
            title="CSS Box Shadow Generator"
            subtitle="Visually build CSS box-shadow values with live preview. Add multiple layers, control blur, spread, inset, and color with opacity."
            icon={LayersIcon}
            seoDescription="Generate CSS box-shadow code visually. Multi-layer shadows with live preview."
            howToSteps={[
                { name: 'Adjust shadow settings', text: 'Use sliders to control X/Y offset, blur, spread, and color.' },
                { name: 'Add layers', text: 'Click + to stack multiple shadow layers for depth effects.' },
                { name: 'Copy CSS', text: 'Click Copy to get the ready-to-use box-shadow property.' },
            ]}
        >
            <Grid container spacing={3}>
                {/* Controls */}
                <Grid item xs={12} md={5}>
                    <Stack spacing={2}>
                        {/* Layer tabs */}
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {shadows.map((_, i) => (
                                <Chip
                                    key={i}
                                    label={`Layer ${i + 1}`}
                                    onClick={() => setActiveIdx(i)}
                                    onDelete={shadows.length > 1 ? () => {
                                        setShadows(prev => prev.filter((__, j) => j !== i));
                                        setActiveIdx(Math.max(0, i - 1));
                                    } : undefined}
                                    color={activeIdx === i ? 'primary' : 'default'}
                                    sx={{ fontWeight: 600 }}
                                />
                            ))}
                            {shadows.length < 5 && (
                                <Chip label="+" onClick={() => { setShadows(p => [...p, defaultShadow()]); setActiveIdx(shadows.length); }} sx={{ fontWeight: 700 }} />
                            )}
                        </Stack>

                        {[
                            { label: 'Horizontal (X)', key: 'x', min: -50, max: 50 },
                            { label: 'Vertical (Y)', key: 'y', min: -50, max: 50 },
                            { label: 'Blur Radius', key: 'blur', min: 0, max: 100 },
                            { label: 'Spread Radius', key: 'spread', min: -50, max: 50 },
                            { label: 'Opacity (%)', key: 'opacity', min: 0, max: 100 },
                        ].map(({ label, key, min, max }) => (
                            <Box key={key}>
                                <Typography variant="caption" color="text.secondary">{label}: <b>{active[key as keyof Shadow]}{key === 'opacity' ? '%' : 'px'}</b></Typography>
                                <Slider min={min} max={max} value={active[key as keyof Shadow] as number} onChange={(_, v) => update(key as keyof Shadow, v)} size="small" />
                            </Box>
                        ))}

                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box>
                                <Typography variant="caption" color="text.secondary">Shadow Color</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <input type="color" value={active.color} onChange={e => update('color', e.target.value)} style={{ width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }} />
                                    <TextField size="small" value={active.color} onChange={e => update('color', e.target.value)} sx={{ width: 110 }} />
                                </Box>
                            </Box>
                            <FormControlLabel control={<Switch checked={active.inset} onChange={e => update('inset', e.target.checked)} size="small" />} label={<Typography variant="body2">Inset</Typography>} />
                        </Stack>

                        <Stack direction="row" spacing={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Background</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                </Box>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Box Color</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <input type="color" value={boxColor} onChange={e => setBoxColor(e.target.value)} style={{ width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                </Box>
                            </Box>
                        </Stack>
                    </Stack>
                </Grid>

                {/* Preview + Output */}
                <Grid item xs={12} md={7}>
                    <Stack spacing={2}>
                        <Paper sx={{ bgcolor: bgColor, p: 4, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
                            <Box sx={{ width: 140, height: 140, borderRadius: 2, bgcolor: boxColor, boxShadow: cssValue }} />
                        </Paper>

                        <Paper sx={{ p: 2, bgcolor: '#0d1117', borderRadius: 2, position: 'relative' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Generated CSS</Typography>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#3dfc55', wordBreak: 'break-all' }}>
                                {fullCss}
                            </Typography>
                            <IconButton onClick={copy} size="small" sx={{ position: 'absolute', top: 8, right: 8, color: copied ? 'success.main' : 'text.secondary' }}>
                                {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                            </IconButton>
                        </Paper>
                    </Stack>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default CssBoxShadowGenerator;
