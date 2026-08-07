import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, Box, Button, Typography } from '@mui/material';
import { Bolt, RestartAlt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import ActionButtons from './shared/ActionButtons';

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

    const cardRef = useRef<HTMLDivElement | null>(null);

    const handleFlapOrStart = () => {
        flap();
        if (!started && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <>
            <Seo title="Flappy Blocks - Tap to Flap Arcade Game" gameId={24} />
            <GamePlayShell
                icon={Bolt}
                title="Flappy Blocks"
                subtitle="Click, tap, or press space to flap and weave through the gaps."
                maxWidth="md"
                onRestart={resetGame}
                controls={<ActionButtons buttons={[{ key: 'flap', label: 'FLAP', icon: Bolt, onPress: flap, accentColor: '#39ff88' }]} />}
            >
            <Card
                ref={cardRef}
                sx={{
                    background: 'rgba(13, 14, 18, 0.5)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: { xs: '16px', sm: '24px' },
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 1.5, sm: 3 }
                }}
            >
                <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 2 }}>
                        <Typography variant="h6" fontWeight={900}>Score: <span style={{ color: '#00e5ff' }}>{score}</span></Typography>
                        <Typography variant="h6" fontWeight={900} color="text.secondary">Best: {best}</Typography>
                    </Box>

                    <Box
                        ref={containerRef}
                        onPointerDown={handleFlapOrStart}
                        sx={{
                            width: '100%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            bgcolor: '#050608',
                            border: '1px solid rgba(255,255,255,0.12)',
                            mb: 2,
                            position: 'relative',
                            touchAction: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <canvas ref={canvasRef} style={{ display: 'block' }} />
                        {!started && !dead && (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', bgcolor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="h6" sx={{ bgcolor: 'rgba(0,0,0,0.7)', px: 3, py: 1.5, borderRadius: '12px', fontWeight: 800, color: '#39ff88' }}>
                                    Tap Anywhere to Start 🚀
                                </Typography>
                            </Box>
                        )}
                        {dead && (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
                                <Typography variant="h4" fontWeight={900} color="#ff4d4d">Game Over</Typography>
                                <Typography variant="body1" fontWeight={700}>Score: {score}</Typography>
                                <Button variant="contained" onClick={resetGame} sx={{ px: 4, py: 1, borderRadius: '12px', fontWeight: 800 }}>
                                    Play Again 🔄
                                </Button>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={resetGame} sx={{ borderRadius: '10px' }}>
                            Restart
                        </Button>
                    </Box>
                </CardContent>
            </Card>
            </GamePlayShell>
        </>
    );
};

export default FlappyBlocks;
