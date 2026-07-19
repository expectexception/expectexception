import React, { useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Button, Chip, Typography, useTheme } from '@mui/material';
import { AutoAwesome, Delete } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const SYMMETRY_OPTIONS = [4, 6, 8, 12];

/** Draw anywhere in the canvas and the stroke is mirrored around the center
 * with N-fold radial symmetry, so a single freehand gesture becomes a
 * kaleidoscope pattern. Pure canvas + pointer events, no backend. */
const Kaleidoscope: React.FC = () => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const hueRef = useRef(0);
    const [symmetry, setSymmetry] = useState(8);
    const symmetryRef = useRef(symmetry);

    useEffect(() => { symmetryRef.current = symmetry; }, [symmetry]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const size = Math.max(1, Math.floor(Math.min(rect.width, 520)));
            const prev = document.createElement('canvas');
            prev.width = canvas.width;
            prev.height = canvas.height;
            const prevCtx = prev.getContext('2d');
            if (prevCtx && canvas.width > 0) prevCtx.drawImage(canvas, 0, 0);

            canvas.width = Math.floor(size * dpr);
            canvas.height = Math.floor(size * dpr);
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const drawMirrored = (x0: number, y0: number, x1: number, y1: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const size = canvas.width / dpr;
        const cx = size / 2;
        const cy = size / 2;
        const n = symmetryRef.current;

        hueRef.current = (hueRef.current + 1.5) % 360;
        ctx.strokeStyle = `hsl(${hueRef.current}, 85%, 62%)`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = `hsl(${hueRef.current}, 85%, 62%)`;
        ctx.shadowBlur = 4;

        const rx0 = x0 - cx, ry0 = y0 - cy;
        const rx1 = x1 - cx, ry1 = y1 - cy;

        for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 * i) / n;
            const cosA = Math.cos(angle), sinA = Math.sin(angle);

            const p0x = rx0 * cosA - ry0 * sinA + cx;
            const p0y = rx0 * sinA + ry0 * cosA + cy;
            const p1x = rx1 * cosA - ry1 * sinA + cx;
            const p1y = rx1 * sinA + ry1 * cosA + cy;
            ctx.beginPath();
            ctx.moveTo(p0x, p0y);
            ctx.lineTo(p1x, p1y);
            ctx.stroke();

            // Mirror reflection across the axis too, doubling the pattern density.
            const mx0 = rx0 * cosA + ry0 * sinA + cx;
            const my0 = -rx0 * sinA + ry0 * cosA + cy;
            const mx1 = rx1 * cosA + ry1 * sinA + cx;
            const my1 = -rx1 * sinA + ry1 * cosA + cy;
            ctx.beginPath();
            ctx.moveTo(mx0, my0);
            ctx.lineTo(mx1, my1);
            ctx.stroke();
        }
    };

    const getLocalPoint = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        drawingRef.current = true;
        lastPointRef.current = getLocalPoint(e.clientX, e.clientY);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current || !lastPointRef.current) return;
        const p = getLocalPoint(e.clientX, e.clientY);
        drawMirrored(lastPointRef.current.x, lastPointRef.current.y, p.x, p.y);
        lastPointRef.current = p;
    };

    const stopDrawing = () => {
        drawingRef.current = false;
        lastPointRef.current = null;
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    };

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Kaleidoscope Drawing - Symmetric Art Toy" gameId={17} />
            <ServicePageHero
                icon={AutoAwesome}
                title="Kaleidoscope"
                subtitle="Draw anywhere and the stroke mirrors around the center with radial symmetry. One gesture, an instant mandala."
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
                            touchAction: 'none',
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={stopDrawing}
                            onPointerLeave={stopDrawing}
                            onPointerCancel={stopDrawing}
                            style={{ display: 'block', cursor: 'crosshair' }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            Symmetry:
                        </Typography>
                        {SYMMETRY_OPTIONS.map((n) => (
                            <Chip
                                key={n}
                                label={`${n}-fold`}
                                clickable
                                color={symmetry === n ? 'primary' : 'default'}
                                variant={symmetry === n ? 'filled' : 'outlined'}
                                onClick={() => setSymmetry(n)}
                            />
                        ))}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button variant="outlined" startIcon={<Delete />} onClick={handleClear}>
                            Clear
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Kaleidoscope;
