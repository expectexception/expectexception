import React, { useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Button, Typography, Slider, Grid } from '@mui/material';
import { Circle, Delete, Casino } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

/** Renders a hypotrochoid curve (the math behind a mechanical Spirograph):
 * a small circle of radius r rolls inside a fixed circle of radius R, and a
 * pen offset by d from the small circle's center traces the pattern. Redraws
 * progressively as an animation whenever R/r/d change. Pure canvas, no backend. */
const Spirograph: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef(480);
    const [bigR, setBigR] = useState(120);
    const [smallR, setSmallR] = useState(37);
    const [offset, setOffset] = useState(80);
    const [hue, setHue] = useState(140);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const size = Math.max(1, Math.floor(Math.min(rect.width, 480)));
            sizeRef.current = size;
            canvas.width = Math.floor(size * dpr);
            canvas.height = Math.floor(size * dpr);
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

        const size = sizeRef.current;
        const cx = size / 2;
        const cy = size / 2;
        const R = bigR, r = Math.max(1, smallR), d = offset;

        // GCD-based period so the curve closes exactly instead of trailing off mid-loop.
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const g = gcd(Math.round(R), Math.round(r)) || 1;
        const periodSteps = (2 * Math.PI * (r / g)) / 0.02;
        const totalSteps = Math.min(periodSteps, 6000);

        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = `hsl(${hue}, 85%, 62%)`;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = `hsl(${hue}, 85%, 62%)`;
        ctx.shadowBlur = 3;
        ctx.beginPath();

        let t = 0;
        let first = true;
        const stepsPerFrame = 24;

        const drawChunk = () => {
            for (let i = 0; i < stepsPerFrame && t <= totalSteps; i++, t += 1) {
                const theta = t * 0.02;
                const x = (R - r) * Math.cos(theta) + d * Math.cos(((R - r) / r) * theta);
                const y = (R - r) * Math.sin(theta) - d * Math.sin(((R - r) / r) * theta);
                const px = cx + x, py = cy + y;
                if (first) { ctx.moveTo(px, py); first = false; } else { ctx.lineTo(px, py); }
            }
            ctx.stroke();
            if (t <= totalSteps) {
                rafRef.current = requestAnimationFrame(drawChunk);
            }
        };
        rafRef.current = requestAnimationFrame(drawChunk);

        return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    }, [bigR, smallR, offset, hue]);

    const handleRandomize = () => {
        setBigR(80 + Math.floor(Math.random() * 80));
        setSmallR(15 + Math.floor(Math.random() * 60));
        setOffset(20 + Math.floor(Math.random() * 90));
        setHue(Math.floor(Math.random() * 360));
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, sizeRef.current, sizeRef.current);
    };

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Spirograph Generator - Parametric Curve Art" />
            <ServicePageHero
                icon={Circle}
                title="Spirograph"
                subtitle="The math behind the classic toy: drag the sliders to change the gear ratio and pen offset, and watch the curve draw itself."
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
                    <Box
                        ref={containerRef}
                        sx={{
                            width: '100%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            bgcolor: '#050608',
                            border: '1px solid rgba(255,255,255,0.08)',
                            mb: 3,
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        <canvas ref={canvasRef} style={{ display: 'block' }} />
                    </Box>

                    <Grid container spacing={3} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>Fixed radius (R): {bigR}</Typography>
                            <Slider value={bigR} min={40} max={160} onChange={(_, v) => setBigR(v as number)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>Rolling radius (r): {smallR}</Typography>
                            <Slider value={smallR} min={5} max={75} onChange={(_, v) => setSmallR(v as number)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>Pen offset (d): {offset}</Typography>
                            <Slider value={offset} min={5} max={110} onChange={(_, v) => setOffset(v as number)} />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button variant="outlined" startIcon={<Casino />} onClick={handleRandomize}>
                            Randomize
                        </Button>
                        <Button variant="outlined" startIcon={<Delete />} onClick={handleClear}>
                            Clear
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Spirograph;
