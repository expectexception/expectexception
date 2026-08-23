import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, IconButton, Stack, Typography, useTheme } from '@mui/material';
import { RocketLaunch, RotateLeft, RotateRight, ArrowUpward, FiberManualRecord } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

const BEST_KEY = 'sandbox_asteroids_best_score';
const CANVAS_HEIGHT = 480;

const SHIP_RADIUS = 11;
const ROTATION_SPEED = 0.065; // rad / frame
const THRUST_POWER = 0.09; // px / frame^2
const FRICTION = 0.988; // velocity multiplier / frame
const MAX_SPEED = 6.5; // px / frame

const BULLET_SPEED = 8; // px / frame
const BULLET_LIFETIME_MS = 850;
const FIRE_COOLDOWN_MS = 220;

const STARTING_LIVES = 3;
const INVULNERABLE_MS = 2000;
const INITIAL_ASTEROID_COUNT = 4;
const SAFE_SPAWN_RADIUS = 140; // keep new asteroids clear of the ship's spawn point
const WAVE_BANNER_MS = 1800;
const SHAPE_POINTS = 10;

type AsteroidSize = 'large' | 'medium' | 'small';
type Phase = 'idle' | 'playing' | 'gameover';

const SIZE_RADIUS: Record<AsteroidSize, number> = { large: 46, medium: 27, small: 14 };
const SIZE_SCORE: Record<AsteroidSize, number> = { large: 20, medium: 50, small: 100 };
const NEXT_SIZE: Record<AsteroidSize, AsteroidSize | null> = { large: 'medium', medium: 'small', small: null };

interface Ship {
    x: number; y: number; vx: number; vy: number; angle: number;
}

interface Bullet {
    x: number; y: number; vx: number; vy: number; bornAt: number;
}

interface Asteroid {
    x: number; y: number; vx: number; vy: number;
    angle: number; spin: number; radius: number; size: AsteroidSize; shape: number[];
}

interface Star { x: number; y: number; r: number; }

const wrap = (value: number, max: number): number => {
    if (value < 0) return value + max;
    if (value > max) return value - max;
    return value;
};

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x1 - x2, y1 - y2);

const makeAsteroidShape = (): number[] =>
    Array.from({ length: SHAPE_POINTS }, () => 0.7 + Math.random() * 0.3);

const makeAsteroid = (x: number, y: number, size: AsteroidSize, minSpeed: number, maxSpeed: number): Asteroid => {
    const dir = Math.random() * Math.PI * 2;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    return {
        x,
        y,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.03,
        radius: SIZE_RADIUS[size],
        size,
        shape: makeAsteroidShape(),
    };
};

const spawnWave = (count: number, w: number, h: number, avoidX: number, avoidY: number): Asteroid[] => {
    const asteroids: Asteroid[] = [];
    for (let i = 0; i < count; i++) {
        let x = 0;
        let y = 0;
        let attempts = 0;
        do {
            x = Math.random() * w;
            y = Math.random() * h;
            attempts += 1;
        } while (dist(x, y, avoidX, avoidY) < SAFE_SPAWN_RADIUS && attempts < 20);
        asteroids.push(makeAsteroid(x, y, 'large', 0.4, 1.4));
    }
    return asteroids;
};

const splitAsteroid = (a: Asteroid): Asteroid[] => {
    const next = NEXT_SIZE[a.size];
    if (!next) return [];
    const [minSpeed, maxSpeed] = next === 'medium' ? [0.6, 1.8] : [1.0, 2.6];
    return [
        makeAsteroid(a.x, a.y, next, minSpeed, maxSpeed),
        makeAsteroid(a.x, a.y, next, minSpeed, maxSpeed),
    ];
};

const loadBest = (): number => {
    try {
        const n = Number(localStorage.getItem(BEST_KEY));
        return Number.isFinite(n) ? n : 0;
    } catch {
        return 0;
    }
};

/** Draws `draw(dx, dy)` at the object's true position, plus "ghost" copies
 * offset by the canvas width/height whenever the object is near an edge -
 * so it visibly slides through the boundary instead of popping between
 * sides, selling the screen-wrap. */
const drawWrapped = (
    x: number, y: number, radius: number, w: number, h: number,
    draw: (dx: number, dy: number) => void
) => {
    const offsetsX = [0];
    if (x < radius) offsetsX.push(w);
    if (x > w - radius) offsetsX.push(-w);
    const offsetsY = [0];
    if (y < radius) offsetsY.push(h);
    if (y > h - radius) offsetsY.push(-h);
    for (const ox of offsetsX) {
        for (const oy of offsetsY) {
            draw(x + ox, y + oy);
        }
    }
};

/** Classic vector-style Asteroids: rotate and thrust a triangular ship
 * around a wrapping canvas, blast rocky polygons into smaller pieces, and
 * survive as long as possible. Pure canvas + rAF, no backend. Keyboard
 * (arrows/WASD + space) on desktop, four held on-screen buttons on touch -
 * mirroring Tetris's startHold/stopHold pattern but via boolean refs the
 * rAF loop polls every frame, since rotation/thrust are continuous physics
 * rather than discrete steps. */
const Asteroids: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef({ w: 640, h: CANVAS_HEIGHT });
    const starsRef = useRef<Star[]>(
        Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3 }))
    );

    const stateRef = useRef({
        phase: 'idle' as Phase,
        ship: { x: 320, y: 240, vx: 0, vy: 0, angle: 0 } as Ship,
        bullets: [] as Bullet[],
        asteroids: [] as Asteroid[],
        score: 0,
        lives: STARTING_LIVES,
        wave: 1,
        waveAsteroidCount: INITIAL_ASTEROID_COUNT,
        lastFireTime: -Infinity,
        invulnerableUntil: 0,
        waveBannerUntil: 0,
        waveBannerWave: 1,
    });

    const leftRef = useRef(false);
    const rightRef = useRef(false);
    const thrustRef = useRef(false);
    const fireRef = useRef(false);

    const [phase, setPhase] = useState<Phase>('idle');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(STARTING_LIVES);
    const [wave, setWave] = useState(1);
    const [best, setBest] = useState<number>(() => loadBest());

    const startGame = () => {
        const { w, h } = sizeRef.current;
        const s = stateRef.current;
        s.phase = 'playing';
        s.ship = { x: w / 2, y: h / 2, vx: 0, vy: 0, angle: 0 };
        s.bullets = [];
        s.score = 0;
        s.lives = STARTING_LIVES;
        s.wave = 1;
        s.waveAsteroidCount = INITIAL_ASTEROID_COUNT;
        s.lastFireTime = -Infinity;
        s.invulnerableUntil = performance.now() + INVULNERABLE_MS;
        s.waveBannerUntil = performance.now() + WAVE_BANNER_MS;
        s.waveBannerWave = 1;
        s.asteroids = spawnWave(INITIAL_ASTEROID_COUNT, w, h, s.ship.x, s.ship.y);
        setPhase('playing');
        setScore(0);
        setLives(STARTING_LIVES);
        setWave(1);
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
        stateRef.current.ship.x = sizeRef.current.w / 2;
        stateRef.current.ship.y = sizeRef.current.h / 2;
        window.addEventListener('resize', resize);

        const endGame = () => {
            const s = stateRef.current;
            s.phase = 'gameover';
            setPhase('gameover');
            setBest((b) => {
                if (s.score > b) {
                    try { localStorage.setItem(BEST_KEY, String(s.score)); } catch { /* ignore */ }
                    return s.score;
                }
                return b;
            });
        };

        const loop = (time: number) => {
            const s = stateRef.current;
            const { w, h } = sizeRef.current;

            if (s.phase === 'playing') {
                const ship = s.ship;

                if (leftRef.current) ship.angle -= ROTATION_SPEED;
                if (rightRef.current) ship.angle += ROTATION_SPEED;

                if (thrustRef.current) {
                    ship.vx += Math.sin(ship.angle) * THRUST_POWER;
                    ship.vy -= Math.cos(ship.angle) * THRUST_POWER;
                }

                ship.vx *= FRICTION;
                ship.vy *= FRICTION;
                const speed = Math.hypot(ship.vx, ship.vy);
                if (speed > MAX_SPEED) {
                    ship.vx = (ship.vx / speed) * MAX_SPEED;
                    ship.vy = (ship.vy / speed) * MAX_SPEED;
                }
                ship.x = wrap(ship.x + ship.vx, w);
                ship.y = wrap(ship.y + ship.vy, h);

                if (fireRef.current && time - s.lastFireTime > FIRE_COOLDOWN_MS) {
                    s.lastFireTime = time;
                    s.bullets.push({
                        x: wrap(ship.x + Math.sin(ship.angle) * SHIP_RADIUS, w),
                        y: wrap(ship.y - Math.cos(ship.angle) * SHIP_RADIUS, h),
                        vx: Math.sin(ship.angle) * BULLET_SPEED,
                        vy: -Math.cos(ship.angle) * BULLET_SPEED,
                        bornAt: time,
                    });
                }

                s.bullets = s.bullets
                    .filter((b) => time - b.bornAt < BULLET_LIFETIME_MS)
                    .map((b) => ({ ...b, x: wrap(b.x + b.vx, w), y: wrap(b.y + b.vy, h) }));

                s.asteroids.forEach((a) => {
                    a.x = wrap(a.x + a.vx, w);
                    a.y = wrap(a.y + a.vy, h);
                    a.angle += a.spin;
                });

                // Bullet vs. asteroid collisions - one bullet can destroy one
                // asteroid per frame; destroyed asteroids split into two
                // smaller ones (or vanish entirely once already "small").
                let bulletsAlive = [...s.bullets];
                const asteroidsAlive: Asteroid[] = [];
                let scoreGained = 0;
                for (const a of s.asteroids) {
                    let hitIndex = -1;
                    for (let i = 0; i < bulletsAlive.length; i++) {
                        if (dist(a.x, a.y, bulletsAlive[i].x, bulletsAlive[i].y) < a.radius) {
                            hitIndex = i;
                            break;
                        }
                    }
                    if (hitIndex >= 0) {
                        bulletsAlive = bulletsAlive.filter((_, i) => i !== hitIndex);
                        scoreGained += SIZE_SCORE[a.size];
                        asteroidsAlive.push(...splitAsteroid(a));
                    } else {
                        asteroidsAlive.push(a);
                    }
                }
                s.bullets = bulletsAlive;
                s.asteroids = asteroidsAlive;
                if (scoreGained > 0) {
                    s.score += scoreGained;
                    setScore(s.score);
                }

                // Ship vs. asteroid collision (skipped while briefly invulnerable
                // after a respawn so death isn't an instant repeat loop).
                if (time > s.invulnerableUntil) {
                    for (let i = 0; i < s.asteroids.length; i++) {
                        const a = s.asteroids[i];
                        if (dist(ship.x, ship.y, a.x, a.y) < a.radius + SHIP_RADIUS) {
                            s.asteroids = s.asteroids.filter((_, idx) => idx !== i);
                            s.lives -= 1;
                            setLives(s.lives);
                            if (s.lives <= 0) {
                                endGame();
                            } else {
                                ship.x = w / 2;
                                ship.y = h / 2;
                                ship.vx = 0;
                                ship.vy = 0;
                                ship.angle = 0;
                                s.invulnerableUntil = time + INVULNERABLE_MS;
                            }
                            break;
                        }
                    }
                }

                // Wave cleared - ramp difficulty by one extra asteroid next wave.
                if (s.phase === 'playing' && s.asteroids.length === 0) {
                    s.wave += 1;
                    s.waveAsteroidCount += 1;
                    s.asteroids = spawnWave(s.waveAsteroidCount, w, h, ship.x, ship.y);
                    s.waveBannerUntil = time + WAVE_BANNER_MS;
                    s.waveBannerWave = s.wave;
                    setWave(s.wave);
                }
            }

            // ── draw ──
            ctx.fillStyle = '#050608';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            for (const star of starsRef.current) {
                ctx.beginPath();
                ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.strokeStyle = 'rgba(255,255,255,0.75)';
            ctx.lineWidth = 1.5;
            for (const a of s.asteroids) {
                drawWrapped(a.x, a.y, a.radius, w, h, (dx, dy) => {
                    ctx.save();
                    ctx.translate(dx, dy);
                    ctx.rotate(a.angle);
                    ctx.beginPath();
                    a.shape.forEach((mult, i) => {
                        const ang = (i / a.shape.length) * Math.PI * 2;
                        const r = a.radius * mult;
                        const px = Math.cos(ang) * r;
                        const py = Math.sin(ang) * r;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    });
                    ctx.closePath();
                    ctx.fillStyle = 'rgba(255,255,255,0.04)';
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                });
            }

            ctx.fillStyle = '#ffe066';
            for (const b of s.bullets) {
                drawWrapped(b.x, b.y, 3, w, h, (dx, dy) => {
                    ctx.beginPath();
                    ctx.arc(dx, dy, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            if (s.phase !== 'idle') {
                const invulnerable = time < s.invulnerableUntil;
                const blinkVisible = !invulnerable || Math.floor(time / 120) % 2 === 0;
                if (blinkVisible) {
                    drawWrapped(s.ship.x, s.ship.y, SHIP_RADIUS, w, h, (dx, dy) => {
                        ctx.save();
                        ctx.translate(dx, dy);
                        ctx.rotate(s.ship.angle);
                        ctx.beginPath();
                        ctx.moveTo(0, -14);
                        ctx.lineTo(9, 10);
                        ctx.lineTo(0, 4);
                        ctx.lineTo(-9, 10);
                        ctx.closePath();
                        ctx.strokeStyle = primary;
                        ctx.lineWidth = 2;
                        ctx.fillStyle = 'rgba(255,255,255,0.08)';
                        ctx.fill();
                        ctx.stroke();

                        if (thrustRef.current && s.phase === 'playing') {
                            const flicker = 6 + Math.random() * 8;
                            ctx.beginPath();
                            ctx.moveTo(-5, 8);
                            ctx.lineTo(0, 8 + flicker);
                            ctx.lineTo(5, 8);
                            ctx.closePath();
                            ctx.fillStyle = '#ff8a3d';
                            ctx.fill();
                        }
                        ctx.restore();
                    });
                }
            }

            if (s.phase === 'playing' && time < s.waveBannerUntil) {
                const remaining = s.waveBannerUntil - time;
                const alpha = Math.min(1, remaining / 400);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ffffff';
                ctx.font = '700 28px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`Wave ${s.waveBannerWave}`, w / 2, h / 2 - 60);
                ctx.restore();
            }

            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (stateRef.current.phase !== 'playing') return;
            switch (e.key) {
                case 'ArrowLeft': case 'a': case 'A':
                    e.preventDefault(); leftRef.current = true; break;
                case 'ArrowRight': case 'd': case 'D':
                    e.preventDefault(); rightRef.current = true; break;
                case 'ArrowUp': case 'w': case 'W':
                    e.preventDefault(); thrustRef.current = true; break;
                case ' ':
                    e.preventDefault(); fireRef.current = true; break;
                default:
                    break;
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft': case 'a': case 'A':
                    leftRef.current = false; break;
                case 'ArrowRight': case 'd': case 'D':
                    rightRef.current = false; break;
                case 'ArrowUp': case 'w': case 'W':
                    thrustRef.current = false; break;
                case ' ':
                    fireRef.current = false; break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    const cardRef = useRef<HTMLDivElement | null>(null);

    const handleStartClick = () => {
        startGame();
        if (cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const heldButtonSx = {
        minWidth: 56,
        minHeight: 56,
        bgcolor: 'rgba(255,255,255,0.06)',
        border: '1.5px solid rgba(255,255,255,0.15)',
        borderRadius: '14px',
        color: '#ffffff',
        touchAction: 'none' as const,
        '&:active': { bgcolor: 'rgba(255,255,255,0.18)' },
    };

    const controllerDock = (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Stack direction="row" spacing={1.5} justifyContent="center">
                <IconButton
                    aria-label="Rotate left"
                    disabled={phase !== 'playing'}
                    onPointerDown={() => { leftRef.current = true; }}
                    onPointerUp={() => { leftRef.current = false; }}
                    onPointerLeave={() => { leftRef.current = false; }}
                    onPointerCancel={() => { leftRef.current = false; }}
                    sx={heldButtonSx}
                >
                    <RotateLeft fontSize="large" />
                </IconButton>
                <IconButton
                    aria-label="Thrust"
                    disabled={phase !== 'playing'}
                    onPointerDown={() => { thrustRef.current = true; }}
                    onPointerUp={() => { thrustRef.current = false; }}
                    onPointerLeave={() => { thrustRef.current = false; }}
                    onPointerCancel={() => { thrustRef.current = false; }}
                    sx={{ ...heldButtonSx, '&:active': { bgcolor: 'rgba(255,138,61,0.35)' } }}
                >
                    <ArrowUpward fontSize="large" />
                </IconButton>
                <IconButton
                    aria-label="Rotate right"
                    disabled={phase !== 'playing'}
                    onPointerDown={() => { rightRef.current = true; }}
                    onPointerUp={() => { rightRef.current = false; }}
                    onPointerLeave={() => { rightRef.current = false; }}
                    onPointerCancel={() => { rightRef.current = false; }}
                    sx={heldButtonSx}
                >
                    <RotateRight fontSize="large" />
                </IconButton>
            </Stack>
            <IconButton
                aria-label="Fire"
                disabled={phase !== 'playing'}
                onPointerDown={() => { fireRef.current = true; }}
                onPointerUp={() => { fireRef.current = false; }}
                onPointerLeave={() => { fireRef.current = false; }}
                onPointerCancel={() => { fireRef.current = false; }}
                sx={{ ...heldButtonSx, minWidth: 68, minHeight: 68, '&:active': { bgcolor: 'rgba(255,224,102,0.35)' } }}
            >
                <FiberManualRecord fontSize="large" />
            </IconButton>
        </Box>
    );

    return (
        <>
            <Seo
                title="Asteroids - Free Online Vector Arcade Game"
                description="Play a free online Asteroids clone in your browser: rotate and thrust a triangular ship, blast rocky asteroids into smaller pieces, and survive as long as you can. No download, no sign-up."
                keywords={['asteroids game', 'asteroids online free', 'classic vector arcade game', 'space shooter browser game', 'retro arcade game online', 'spaceship shooting game']}
            />
            <GamePlayShell
                icon={RocketLaunch}
                title="Asteroids"
                subtitle="Rotate and thrust through the void, blast the asteroids into smaller pieces, and don't get crushed."
                maxWidth="md"
                onRestart={handleStartClick}
                controls={controllerDock}
            >
                <Card
                    ref={cardRef}
                    sx={{
                        background: 'rgba(13, 14, 18, 0.4)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '20px',
                        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                        p: { xs: 1.5, sm: 3 },
                    }}
                >
                    <CardContent sx={{ p: 1 }}>
                        <Stack direction="row" flexWrap="wrap" justifyContent="center" spacing={3} sx={{ mb: 2 }}>
                            <Typography variant="h6" fontWeight={900}>
                                Score: <span style={{ color: primary }}>{score}</span>
                            </Typography>
                            <Typography variant="h6" fontWeight={900} color="text.secondary">Best: {best}</Typography>
                            <Typography variant="h6" fontWeight={900} sx={{ color: '#ff8a3d' }}>
                                {'▲'.repeat(Math.max(0, lives))}
                            </Typography>
                            <Typography variant="h6" fontWeight={900} color="text.secondary">Wave: {wave}</Typography>
                        </Stack>

                        <Box
                            ref={containerRef}
                            sx={{
                                width: '100%',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                bgcolor: '#050608',
                                border: '1px solid rgba(255,255,255,0.08)',
                                mb: 3,
                                position: 'relative',
                            }}
                        >
                            <canvas ref={canvasRef} style={{ display: 'block' }} />
                            {phase !== 'playing' && (
                                <Box sx={{
                                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 2,
                                    bgcolor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                                }}>
                                    {phase === 'gameover' && (
                                        <>
                                            <Typography variant="h4" fontWeight={900} sx={{ color: theme.palette.error.main }}>
                                                Game Over
                                            </Typography>
                                            <Typography variant="body1">
                                                Score: {score} · Best: {best}
                                            </Typography>
                                        </>
                                    )}
                                    {phase === 'idle' && (
                                        <Typography variant="h5" fontWeight={800}>Ready to Play?</Typography>
                                    )}
                                    <Button
                                        variant="contained"
                                        onClick={handleStartClick}
                                        sx={{ px: 4, py: 1.2, fontWeight: 800, borderRadius: '12px', fontSize: '1rem' }}
                                    >
                                        {phase === 'idle' ? 'Start Game 🚀' : 'Play Again'}
                                    </Button>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'center', mb: 1 }}>
                            {controllerDock}
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                            Arrow keys or WASD to rotate/thrust, space to fire. On mobile, use the on-screen controls.
                        </Typography>
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default Asteroids;
