import React, { useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Button, Typography, useTheme } from '@mui/material';
import { DirectionsRun, RestartAlt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const STATS_KEY = 'sandbox_endless_runner_stats';

const GRAVITY = 0.85;
const JUMP_VELOCITY = -13.5;
const BASE_SPEED = 4.5;
const MAX_SPEED = 10;
const SPEED_RAMP_DIVISOR = 2200; // higher = slower difficulty ramp
const SCORE_DIVISOR = 10; // higher = slower score climb
const GROUND_MARGIN = 50; // px from canvas bottom to the ground line
const PLAYER_SIZE = 32;
const PLAYER_X = 50;
const CANVAS_HEIGHT = 280;
const MIN_SPAWN_INTERVAL = 900;
const MAX_SPAWN_INTERVAL = 1600;
const HITBOX_INSET = 4; // shrinks collision boxes slightly so near-misses feel fair

interface Obstacle {
    x: number;
    width: number;
    height: number;
    type: 'box' | 'spike';
}

interface RunnerStats {
    best: number;
}

const DEFAULT_STATS: RunnerStats = { best: 0 };

const readStats = (): RunnerStats => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return DEFAULT_STATS;
        const parsed = JSON.parse(raw);
        return { best: Number.isFinite(parsed?.best) ? parsed.best : 0 };
    } catch {
        return DEFAULT_STATS;
    }
};

const writeStats = (stats: RunnerStats) => {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
        // ignore storage errors (private browsing, quota, etc.)
    }
};

/** A Chrome-Dino-style endless runner: press space, click, or tap to jump over
 * obstacles that scroll in from the right at ever-increasing speed. Pure
 * canvas + rAF, no backend. */
const EndlessRunner: React.FC = () => {
    const theme = useTheme();
    const playerColor = theme.palette.primary.main;
    const dangerColor = theme.palette.error.main;

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef({ w: 600, h: CANVAS_HEIGHT });

    const stateRef = useRef({
        playerY: 0,
        velocity: 0,
        grounded: true,
        obstacles: [] as Obstacle[],
        distance: 0,
        speed: BASE_SPEED,
        lastSpawnTime: -1,
        nextSpawnInterval: MIN_SPAWN_INTERVAL,
        score: 0,
        started: false,
        dead: false,
    });

    const [score, setScore] = useState(0);
    const [best, setBest] = useState<number>(() => readStats().best);
    const [dead, setDead] = useState(false);
    const [started, setStarted] = useState(false);

    const resetGame = () => {
        const s = stateRef.current;
        const groundY = sizeRef.current.h - GROUND_MARGIN;
        s.playerY = groundY - PLAYER_SIZE;
        s.velocity = 0;
        s.grounded = true;
        s.obstacles = [];
        s.distance = 0;
        s.speed = BASE_SPEED;
        s.lastSpawnTime = -1;
        s.nextSpawnInterval = MIN_SPAWN_INTERVAL;
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
            const h = CANVAS_HEIGHT;
            sizeRef.current = { w, h };
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        stateRef.current.playerY = sizeRef.current.h - GROUND_MARGIN - PLAYER_SIZE;
        window.addEventListener('resize', resize);

        const loop = (time: number) => {
            const s = stateRef.current;
            const { w, h } = sizeRef.current;
            const groundY = h - GROUND_MARGIN;

            if (s.started && !s.dead) {
                if (s.lastSpawnTime < 0) {
                    // Anchor the spawn timer to the moment play actually begins
                    // instead of rAF's page-load-relative timestamp epoch -
                    // otherwise the first obstacle could spawn instantly if the
                    // tab had already been open a while before the player started.
                    s.lastSpawnTime = time;
                    s.nextSpawnInterval = MIN_SPAWN_INTERVAL + Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL);
                }

                // Real gravity + velocity integration (not a teleport-to-apex jump).
                s.velocity += GRAVITY;
                s.playerY += s.velocity;
                if (s.playerY >= groundY - PLAYER_SIZE) {
                    s.playerY = groundY - PLAYER_SIZE;
                    s.velocity = 0;
                    s.grounded = true;
                }

                // Distance drives both the displayed score and the difficulty ramp.
                s.distance += s.speed;
                s.speed = Math.min(MAX_SPEED, BASE_SPEED + s.distance / SPEED_RAMP_DIVISOR);
                const newScore = Math.floor(s.distance / SCORE_DIVISOR);
                if (newScore !== s.score) {
                    s.score = newScore;
                    setScore(newScore);
                }

                // Spawn obstacles at randomized intervals.
                if (time - s.lastSpawnTime > s.nextSpawnInterval) {
                    s.lastSpawnTime = time;
                    s.nextSpawnInterval = MIN_SPAWN_INTERVAL + Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL);
                    if (Math.random() < 0.35) {
                        s.obstacles.push({ x: w, width: 26, height: 32, type: 'spike' });
                    } else {
                        s.obstacles.push({
                            x: w,
                            width: 22 + Math.random() * 10,
                            height: 26 + Math.random() * 30,
                            type: 'box',
                        });
                    }
                }

                // Move obstacles and check collisions (AABB for both types - the
                // spike's bounding box is used even though it renders as a
                // triangle, which is a deliberately slightly-generous simplification).
                for (const o of s.obstacles) {
                    o.x -= s.speed;
                    const px1 = PLAYER_X + HITBOX_INSET;
                    const px2 = PLAYER_X + PLAYER_SIZE - HITBOX_INSET;
                    const py1 = s.playerY + HITBOX_INSET;
                    const py2 = s.playerY + PLAYER_SIZE - HITBOX_INSET;
                    const ox1 = o.x + HITBOX_INSET;
                    const ox2 = o.x + o.width - HITBOX_INSET;
                    const oy1 = groundY - o.height;
                    const oy2 = groundY;
                    if (px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < oy2) {
                        s.dead = true;
                        setDead(true);
                        setBest((b) => {
                            const nextBest = Math.max(b, s.score);
                            if (nextBest > b) writeStats({ best: nextBest });
                            return nextBest;
                        });
                        break;
                    }
                }
                s.obstacles = s.obstacles.filter((o) => o.x + o.width > -5);
            }

            // ── draw ──
            ctx.fillStyle = '#050608';
            ctx.fillRect(0, 0, w, h);

            // Scrolling ground dashes - purely cosmetic, sells the speed increase.
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 2;
            const dashLen = 22, gapLen = 16, period = dashLen + gapLen;
            const offset = s.distance % period;
            ctx.beginPath();
            for (let x = -offset; x < w; x += period) {
                ctx.moveTo(x, groundY + 8);
                ctx.lineTo(Math.min(x + dashLen, w), groundY + 8);
            }
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(w, groundY);
            ctx.stroke();

            // obstacles
            ctx.fillStyle = dangerColor;
            for (const o of s.obstacles) {
                if (o.type === 'box') {
                    ctx.fillRect(o.x, groundY - o.height, o.width, o.height);
                } else {
                    ctx.beginPath();
                    ctx.moveTo(o.x, groundY);
                    ctx.lineTo(o.x + o.width / 2, groundY - o.height);
                    ctx.lineTo(o.x + o.width, groundY);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // player (slight tilt with vertical velocity, purely cosmetic)
            ctx.save();
            ctx.translate(PLAYER_X + PLAYER_SIZE / 2, s.playerY + PLAYER_SIZE / 2);
            const tilt = s.started && !s.dead ? Math.max(-0.3, Math.min(0.5, s.velocity * 0.04)) : 0;
            ctx.rotate(tilt);
            ctx.fillStyle = playerColor;
            ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
            ctx.restore();

            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const jump = () => {
        const s = stateRef.current;
        if (s.dead) return;
        if (!s.started) { s.started = true; setStarted(true); }
        if (s.grounded) {
            s.velocity = JUMP_VELOCITY;
            s.grounded = false;
        }
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); jump(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo
                title="Endless Runner - Free Online Dino Style Arcade Game"
                description="Play a free online endless runner: jump over obstacles as the speed ramps up, track your distance score, and beat your best run. No download needed."
                keywords={['endless runner game', 'dino game online', 'chrome dino run', 'no internet game online', 'jumping game free', 'browser arcade game']}
            />
            <ServicePageHero
                icon={DirectionsRun}
                title="Endless Runner"
                subtitle="Press space, click, or tap to jump over obstacles racing toward you. One hit ends the run — how far can you go before the speed catches you?"
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
                        onPointerDown={jump}
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
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', px: 2 }}>
                                <Typography variant="h6" sx={{ bgcolor: 'rgba(0,0,0,0.6)', px: 2, py: 1, borderRadius: '10px', textAlign: 'center' }}>
                                    Press Space or tap to start
                                </Typography>
                            </Box>
                        )}
                        {dead && (
                            <Box sx={{
                                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 1.5,
                                bgcolor: 'rgba(0,0,0,0.75)',
                            }}>
                                <Typography variant="h4" fontWeight={900}>Game Over</Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Score: {score} · Best: {best}
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<RestartAlt />}
                                    onClick={resetGame}
                                    sx={{ mt: 1 }}
                                >
                                    Play again
                                </Button>
                            </Box>
                        )}
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                        Space, click, or tap to jump. Obstacles speed up the longer you survive.
                    </Typography>
                </CardContent>
            </Card>
        </Container>
    );
};

export default EndlessRunner;
