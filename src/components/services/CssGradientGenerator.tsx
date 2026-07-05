import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, Button, Slider, Grid,
    ToggleButtonGroup, ToggleButton, Snackbar, IconButton,
} from '@mui/material';
import { Gradient, ContentCopy, Add, Close, Shuffle } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

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
        <ServicePageShell
            icon={Gradient}
            title="CSS Gradient Generator"
            subtitle="Design linear and radial gradients visually and copy the CSS - all in your browser."
            maxWidth="md"
            about="Builds a CSS linear-gradient or radial-gradient by letting you add up to 5 color stops, position each one along the gradient, and (for linear gradients) set the angle in degrees. The preview updates live and the exact `background:` CSS is generated below it, ready to copy into your stylesheet. Everything happens in your browser — there's no upload or server round-trip — so it works offline with no limit tied to file size or account usage."
            howToSteps={[
                { name: 'Choose a gradient type', text: 'Use the Linear / Radial toggle to pick the gradient style you want.' },
                { name: 'Set the angle', text: 'For linear gradients, drag the Angle slider (0–360°) to change the direction of the gradient.' },
                { name: 'Edit color stops', text: "Click a stop's color swatch to change its color, and drag its slider to move its position along the gradient (0–100%)." },
                { name: 'Add or remove stops', text: 'Click Add Color Stop for up to 5 stops total, or use the X button next to a stop to remove it (minimum 2 stops).' },
                { name: 'Copy the CSS', text: 'Click Copy CSS to copy the generated background declaration to your clipboard.' },
            ]}
            faq={[
                { question: 'How many color stops can I use?', answer: "Between 2 and 5. The Add Color Stop button disables once you hit 5, and you can't remove a stop below 2 since a gradient needs at least two colors." },
                { question: 'Does the angle setting apply to radial gradients too?', answer: 'No — angle only affects linear gradients. Radial gradients in this tool always expand outward from the center, so the angle control is hidden once you switch to Radial.' },
                { question: 'Is my gradient saved anywhere?', answer: "No. The gradient exists only in your browser's memory for the current session — refreshing the page resets it back to the default two-stop gradient." },
                { question: 'What does the Randomize button do?', answer: 'It assigns a new random color to every existing stop and picks a new random angle, which is a quick way to explore gradient ideas without manually picking each color.' },
            ]}
        >
            <Seo title="CSS Gradient Generator - Free Online Tool" toolId={31} />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
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
        </ServicePageShell>
    );
};

export default CssGradientGenerator;
