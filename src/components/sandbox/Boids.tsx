import React, { useEffect, useRef } from 'react';
import { Container, Card, CardContent, Box, Button, Typography } from '@mui/material';
import { Pets, RestartAlt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const BOID_COUNT = 90;
const VISUAL_RANGE = 55;
const PROTECTED_RANGE = 16;
const MAX_SPEED = 3.2;
const MIN_SPEED = 1.6;

interface Boid {
    x: number; y: number; vx: number; vy: number;
}

/** Classic boids flocking simulation (Craig Reynolds' three rules: separation,
 * alignment, cohesion) rendered as a live canvas animation. Click to scatter
 * a burst of boids at that point. Pure canvas + rAF, no backend. */
const Boids: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const boidsRef = useRef<Boid[]>([]);
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef({ w: 600, h: 380 });

    const seedBoids = (w: number, h: number) => {
        const boids: Boid[] = [];
        for (let i = 0; i < BOID_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            boids.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: Math.cos(angle) * MAX_SPEED,
                vy: Math.sin(angle) * MAX_SPEED,
            });
        }
        boidsRef.current = boids;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = Math.max(1, Math.floor(rect.width));
            const h = 380;
            sizeRef.current = { w, h };
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        seedBoids(sizeRef.current.w, sizeRef.current.h);
        window.addEventListener('resize', resize);

        const step = () => {
            const { w, h } = sizeRef.current;
            const boids = boidsRef.current;

            for (const b of boids) {
                let closeX = 0, closeY = 0;
                let avgVx = 0, avgVy = 0, avgVCount = 0;
                let avgX = 0, avgY = 0, avgPCount = 0;

                for (const other of boids) {
                    if (other === b) continue;
                    const dx = b.x - other.x;
                    const dy = b.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < PROTECTED_RANGE) {
                        closeX += dx;
                        closeY += dy;
                    } else if (dist < VISUAL_RANGE) {
                        avgVx += other.vx; avgVy += other.vy; avgVCount++;
                        avgX += other.x; avgY += other.y; avgPCount++;
                    }
                }

                // Separation
                b.vx += closeX * 0.03;
                b.vy += closeY * 0.03;

                // Alignment
                if (avgVCount > 0) {
                    b.vx += (avgVx / avgVCount - b.vx) * 0.05;
                    b.vy += (avgVy / avgVCount - b.vy) * 0.05;
                }
                // Cohesion
                if (avgPCount > 0) {
                    b.vx += (avgX / avgPCount - b.x) * 0.0008;
                    b.vy += (avgY / avgPCount - b.y) * 0.0008;
                }

                // Soft edge steering instead of hard bounce — keeps flocks fluid near borders.
                const margin = 40;
                if (b.x < margin) b.vx += 0.25;
                if (b.x > w - margin) b.vx -= 0.25;
                if (b.y < margin) b.vy += 0.25;
                if (b.y > h - margin) b.vy -= 0.25;

                const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 0.0001;
                if (speed > MAX_SPEED) { b.vx = (b.vx / speed) * MAX_SPEED; b.vy = (b.vy / speed) * MAX_SPEED; }
                if (speed < MIN_SPEED) { b.vx = (b.vx / speed) * MIN_SPEED; b.vy = (b.vy / speed) * MIN_SPEED; }

                b.x += b.vx;
                b.y += b.vy;
                b.x = ((b.x % w) + w) % w;
                b.y = ((b.y % h) + h) % h;
            }

            ctx.fillStyle = 'rgba(5, 6, 8, 0.35)';
            ctx.fillRect(0, 0, w, h);
            for (const b of boids) {
                const angle = Math.atan2(b.vy, b.vx);
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(angle);
                ctx.fillStyle = '#39ff88';
                ctx.beginPath();
                ctx.moveTo(6, 0);
                ctx.lineTo(-5, 3.5);
                ctx.lineTo(-5, -3.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleScatter = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            boidsRef.current.push({ x, y, vx: Math.cos(angle) * MAX_SPEED, vy: Math.sin(angle) * MAX_SPEED });
        }
        if (boidsRef.current.length > BOID_COUNT * 2) {
            boidsRef.current.splice(0, boidsRef.current.length - BOID_COUNT * 2);
        }
    };

    const handleReset = () => seedBoids(sizeRef.current.w, sizeRef.current.h);

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Boids Flocking Simulation - Emergent Behavior Toy" />
            <ServicePageHero
                icon={Pets}
                title="Boids"
                subtitle="Craig Reynolds' classic flocking algorithm — separation, alignment, and cohesion produce lifelike flocking from three simple rules. Click to scatter a burst."
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
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            onPointerDown={(e) => handleScatter(e.clientX, e.clientY)}
                            style={{ display: 'block', cursor: 'crosshair' }}
                        />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Click the canvas to scatter a burst of boids at that point.
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleReset}>
                            Reset Flock
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Boids;
