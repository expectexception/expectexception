import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Button, Chip, Typography, useTheme } from '@mui/material';
import { AutoAwesome, Delete } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number; // remaining life, seconds
    maxLife: number;
    radius: number;
    burst: boolean; // true if spawned from a click burst (fades + dies), false if ambient drifting particle
}

const MAX_PARTICLES = 400;
const AMBIENT_COUNT = 120;
const REPEL_RADIUS = 110;

type Palette = 'primary' | 'secondary' | 'white';

/** A canvas of softly drifting particles that are repelled by the pointer and
 * burst into colorful sparks on click/tap. Pure client-side animation, no backend. */
const ParticlePlayground: React.FC = () => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const pointerRef = useRef<{ x: number; y: number; active: boolean }>({ x: -9999, y: -9999, active: false });
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
    const paletteRef = useRef<Palette>('primary');
    const [palette, setPalette] = useState<Palette>('primary');

    const colorFor = useCallback((p: Palette): string => {
        if (p === 'primary') return theme.palette.primary.main;
        if (p === 'secondary') return theme.palette.secondary.main;
        return '#ffffff';
    }, [theme]);

    useEffect(() => {
        paletteRef.current = palette;
    }, [palette]);

    const spawnAmbient = useCallback((count: number, width: number, height: number) => {
        const arr = particlesRef.current;
        for (let i = 0; i < count && arr.length < MAX_PARTICLES; i++) {
            arr.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: Infinity,
                maxLife: Infinity,
                radius: 1 + Math.random() * 2,
                burst: false,
            });
        }
    }, []);

    const spawnBurst = useCallback((x: number, y: number) => {
        const arr = particlesRef.current;
        const burstSize = 24;
        for (let i = 0; i < burstSize; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 160;
            const maxLife = 0.6 + Math.random() * 0.8;
            arr.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: maxLife,
                maxLife,
                radius: 1.5 + Math.random() * 2.5,
                burst: true,
            });
        }
        // Enforce cap: drop oldest particles first (ambient ones at the front of the array
        // are the oldest since ambient is only seeded once at start).
        if (arr.length > MAX_PARTICLES) {
            arr.splice(0, arr.length - MAX_PARTICLES);
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const width = Math.max(1, Math.floor(rect.width));
            const height = Math.max(1, Math.floor(rect.height));
            sizeRef.current = { width, height };
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        if (particlesRef.current.length === 0) {
            spawnAmbient(AMBIENT_COUNT, sizeRef.current.width, sizeRef.current.height);
        }

        const handleResize = () => resize();
        window.addEventListener('resize', handleResize);

        let lastTime = performance.now();

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            const { width, height } = sizeRef.current;
            const color = colorFor(paletteRef.current);

            ctx.clearRect(0, 0, width, height);

            const arr = particlesRef.current;
            const pointer = pointerRef.current;
            const next: Particle[] = [];

            for (let i = 0; i < arr.length; i++) {
                const p = arr[i];

                // Pointer repulsion
                if (pointer.active) {
                    const dx = p.x - pointer.x;
                    const dy = p.y - pointer.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < REPEL_RADIUS * REPEL_RADIUS && distSq > 0.01) {
                        const dist = Math.sqrt(distSq);
                        const force = (1 - dist / REPEL_RADIUS) * 280;
                        p.vx += (dx / dist) * force * dt;
                        p.vy += (dy / dist) * force * dt;
                    }
                }

                // Gentle ambient drift jitter
                if (!p.burst) {
                    p.vx += (Math.random() - 0.5) * 6 * dt;
                    p.vy += (Math.random() - 0.5) * 6 * dt;
                    // damping to keep ambient particles slow
                    p.vx *= 0.98;
                    p.vy *= 0.98;
                } else {
                    // burst particles slow down faster (drag)
                    p.vx *= 0.96;
                    p.vy *= 0.96;
                }

                p.x += p.vx * dt;
                p.y += p.vy * dt;

                // Wrap ambient particles around edges; let burst particles just fade/die
                if (!p.burst) {
                    if (p.x < 0) p.x += width;
                    if (p.x > width) p.x -= width;
                    if (p.y < 0) p.y += height;
                    if (p.y > height) p.y -= height;
                } else {
                    p.life -= dt;
                    if (p.life <= 0) continue; // drop dead burst particle
                }

                next.push(p);

                const alpha = p.burst ? Math.max(0, p.life / p.maxLife) : 0.7;
                ctx.beginPath();
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            particlesRef.current = next;
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorFor, spawnAmbient]);

    const getLocalPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const { x, y } = getLocalPoint(e);
        pointerRef.current = { x, y, active: true };
        spawnBurst(x, y);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const { x, y } = getLocalPoint(e);
        pointerRef.current.x = x;
        pointerRef.current.y = y;
        pointerRef.current.active = true;
    };

    const handlePointerUp = () => {
        pointerRef.current.active = false;
    };

    const handlePointerLeave = () => {
        pointerRef.current.active = false;
    };

    const handleClear = () => {
        particlesRef.current = [];
        spawnAmbient(AMBIENT_COUNT, sizeRef.current.width, sizeRef.current.height);
    };

    const palettes: { key: Palette; label: string }[] = [
        { key: 'primary', label: 'Primary' },
        { key: 'secondary', label: 'Secondary' },
        { key: 'white', label: 'White' },
    ];

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Particle Playground - Interactive Canvas Toy" gameId={4} />
            <ServicePageHero
                icon={AutoAwesome}
                title="Particle Playground"
                subtitle="A drifting field of particles that react to your cursor or finger. Click or tap to trigger a burst of sparks."
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
                            height: { xs: 320, sm: 420 },
                            borderRadius: '12px',
                            overflow: 'hidden',
                            bgcolor: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            mb: 3,
                            position: 'relative',
                            touchAction: 'none',
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onPointerCancel={handlePointerUp}
                            style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer' }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            Color:
                        </Typography>
                        {palettes.map((p) => (
                            <Chip
                                key={p.key}
                                label={p.label}
                                clickable
                                color={palette === p.key ? 'primary' : 'default'}
                                variant={palette === p.key ? 'filled' : 'outlined'}
                                onClick={() => setPalette(p.key)}
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

export default ParticlePlayground;
