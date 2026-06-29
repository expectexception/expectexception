import React, { useMemo, useState } from 'react';
import {
    Container, Card, CardContent, Box, Typography, Button, Slider, Grid,
    ToggleButtonGroup, ToggleButton, Snackbar, IconButton,
} from '@mui/material';
import { Gradient, ContentCopy, Add, Close, Shuffle } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from './ServicePageHero';

interface Stop {
    id: number;
    color: string;
    pos: number;
}

const randomColor = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;

let nextId = 3;

const CssGradientGenerator: React.FC = () => {
    const [type, setType] = useState<'linear' | 'radial'>('linear');
    const [angle, setAngle] = useState(135);
    const [stops, setStops] = useState<Stop[]>([
        { id: 1, color: '#3dfc55', pos: 0 },
        { id: 2, color: '#00e5ff', pos: 100 },
    ]);
    const [snackbar, setSnackbar] = useState(false);

    const gradientCss = useMemo(() => {
        const stopsCss = [...stops].sort((a, b) => a.pos - b.pos).map(s => `${s.color} ${s.pos}%`).join(', ');
        return type === 'linear'
            ? `linear-gradient(${angle}deg, ${stopsCss})`
            : `radial-gradient(circle, ${stopsCss})`;
    }, [type, angle, stops]);

    const cssCode = `background: ${gradientCss};`;

    const updateStop = (id: number, patch: Partial<Stop>) => {
        setStops(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
    };

    const addStop = () => {
        if (stops.length >= 5) return;
        setStops(prev => [...prev, { id: nextId++, color: randomColor(), pos: 50 }]);
    };

    const removeStop = (id: number) => {
        if (stops.length <= 2) return;
        setStops(prev => prev.filter(s => s.id !== id));
    };

    const randomize = () => {
        setStops(prev => prev.map(s => ({ ...s, color: randomColor() })));
        setAngle(Math.floor(Math.random() * 360));
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(cssCode);
        setSnackbar(true);
    };

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="CSS Gradient Generator - Free Online Tool" toolId={31} />
            <ServicePageHero
                icon={Gradient}
                title="CSS Gradient Generator"
                subtitle="Design linear and radial gradients visually and copy the CSS - all in your browser."
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3
            }}>
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{
                        height: 220,
                        borderRadius: '16px',
                        mb: 3,
                        background: gradientCss,
                        border: '1px solid rgba(255,255,255,0.08)',
                    }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <ToggleButtonGroup value={type} exclusive onChange={(_, v) => v && setType(v)} color="primary">
                            <ToggleButton value="linear">Linear</ToggleButton>
                            <ToggleButton value="radial">Radial</ToggleButton>
                        </ToggleButtonGroup>
                        <Button startIcon={<Shuffle />} onClick={randomize}>Randomize</Button>
                    </Box>

                    {type === 'linear' && (
                        <Box sx={{ mb: 3 }}>
                            <Typography gutterBottom>Angle: {angle}&deg;</Typography>
                            <Slider value={angle} onChange={(_, v) => setAngle(v as number)} min={0} max={360} />
                        </Box>
                    )}

                    <Typography gutterBottom sx={{ mt: 2 }}>Color Stops</Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {stops.map((s) => (
                            <Grid item xs={12} sm={6} key={s.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.02)' }}>
                                    <input
                                        type="color"
                                        value={s.color}
                                        onChange={(e) => updateStop(s.id, { color: e.target.value })}
                                        style={{ width: 36, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none' }}
                                    />
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Slider
                                            value={s.pos}
                                            onChange={(_, v) => updateStop(s.id, { pos: v as number })}
                                            min={0}
                                            max={100}
                                            size="small"
                                        />
                                    </Box>
                                    <Typography variant="caption" sx={{ minWidth: 36 }}>{s.pos}%</Typography>
                                    <IconButton size="small" onClick={() => removeStop(s.id)} disabled={stops.length <= 2}>
                                        <Close fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                    <Button startIcon={<Add />} onClick={addStop} disabled={stops.length >= 5} sx={{ mb: 3 }}>
                        Add Color Stop
                    </Button>

                    <Box sx={{
                        p: 2,
                        borderRadius: '10px',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        mb: 2,
                        wordBreak: 'break-all',
                    }}>
                        {cssCode}
                    </Box>
                    <Button variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
                        Copy CSS
                    </Button>
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="CSS copied to clipboard!" />
        </Container>
    );
};

export default CssGradientGenerator;
