import React, { useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Button, Typography } from '@mui/material';
import { Bolt, RestartAlt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const GRAVITY = 0.45;
const FLAP_VELOCITY = -7.5;
const PIPE_WIDTH = 52;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;
const PIPE_INTERVAL = 1500;
const BIRD_SIZE = 20;
const BIRD_X = 90;

interface Pipe { x: number; gapY: number; scored: boolean; }

/** A Flappy Bird-style tap-to-flap game: click, tap, or press space to flap
 * and weave through the gaps without hitting a pipe or the ground. Pure
 * canvas + rAF, no backend. */
const FlappyBlocks: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef({ w: 600, h: 420 });
    const stateRef = useRef({
        birdY: 200, velocity: 0, pipes: [] as Pipe[], lastPipeTime: 0, score: 0, started: false, dead: false,
    });
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const [dead, setDead] = useState(false);
    const [started, setStarted] = useState(false);

    const resetGame = () => {
        const s = stateRef.current;
        s.birdY = sizeRef.current.h / 2;
        s.velocity = 0;
        s.pipes = [];
        s.lastPipeTime = 0;
        s.score = 0;
        s.started = false;
        s.dead = false;
        setScore(0);
        setDead(false);
        setStarted(false);
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
            const h = 420;
            sizeRef.current = { w, h };
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        stateRef.current.birdY = sizeRef.current.h / 2;
        window.addEventListener('resize', resize);

        let lastTime = 0;
        const loop = (time: number) => {
            const s = stateRef.current;
            const { w, h } = sizeRef.current;

            if (s.started && !s.dead) {
                s.velocity += GRAVITY;
                s.birdY += s.velocity;

                if (time - s.lastPipeTime > PIPE_INTERVAL) {
                    const gapY = 60 + Math.random() * (h - 180);
                    s.pipes.push({ x: w, gapY, scored: false });
                    s.lastPipeTime = time;
                }

                s.pipes.forEach((p) => { p.x -= PIPE_SPEED; });
                s.pipes = s.pipes.filter((p) => p.x > -PIPE_WIDTH);

                for (const p of s.pipes) {
                    if (!p.scored && p.x + PIPE_WIDTH < BIRD_X) {
                        p.scored = true;
                        s.score++;
                        setScore(s.score);
                    }
                    const hitX = BIRD_X + BIRD_SIZE > p.x && BIRD_X < p.x + PIPE_WIDTH;
                    const hitY = s.birdY < p.gapY - PIPE_GAP / 2 || s.birdY + BIRD_SIZE > p.gapY + PIPE_GAP / 2;
                    if (hitX && hitY) {
                        s.dead = true;
                        setDead(true);
                        setBest((b) => Math.max(b, s.score));
                    }
                }

                if (s.birdY + BIRD_SIZE > h || s.birdY < 0) {
                    s.dead = true;
                    setDead(true);
                    setBest((b) => Math.max(b, s.score));
                }
            }

            ctx.fillStyle = '#050608';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = '#00e5ff';
            for (const p of s.pipes) {
                ctx.fillRect(p.x, 0, PIPE_WIDTH, p.gapY - PIPE_GAP / 2);
                ctx.fillRect(p.x, p.gapY + PIPE_GAP / 2, PIPE_WIDTH, h - (p.gapY + PIPE_GAP / 2));
            }

            ctx.save();
            ctx.translate(BIRD_X + BIRD_SIZE / 2, s.birdY + BIRD_SIZE / 2);
            ctx.rotate(Math.max(-0.4, Math.min(0.8, s.velocity * 0.05)));
            ctx.fillStyle = '#39ff88';
            ctx.fillRect(-BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
            ctx.restore();

            lastTime = time;
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const flap = () => {
        const s = stateRef.current;
        if (s.dead) return;
        if (!s.started) { s.started = true; setStarted(true); }
        s.velocity = FLAP_VELOCITY;
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); flap(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Flappy Blocks - Tap to Flap Arcade Game" gameId={24} />
            <ServicePageHero
                icon={Bolt}
                title="Flappy Blocks"
                subtitle="Click, tap, or press space to flap and weave through the gaps. One hit and it's over — how far can you go?"
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 6, mb: 2 }}>
                        <Typography variant="h5" fontWeight={900}>Score: {score}</Typography>
                        <Typography variant="h5" fontWeight={900} color="text.secondary">Best: {best}</Typography>
                    </Box>

                    <Box
                        ref={containerRef}
                        onPointerDown={flap}
                        sx={{
                            width: '100%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            bgcolor: '#050608',
                            border: '1px solid rgba(255,255,255,0.08)',
                            mb: 3,
                            position: 'relative',
                            touchAction: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <canvas ref={canvasRef} style={{ display: 'block' }} />
                        {!started && !dead && (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <Typography variant="h6" sx={{ bgcolor: 'rgba(0,0,0,0.6)', px: 2, py: 1, borderRadius: '10px' }}>
                                    Click / Tap / Space to start
                                </Typography>
                            </Box>
                        )}
                        {dead && (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.75)' }}>
                                <Typography variant="h4" fontWeight={900}>Game Over</Typography>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button variant="outlined" startIcon={<RestartAlt />} onClick={resetGame}>
                            Restart
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default FlappyBlocks;
