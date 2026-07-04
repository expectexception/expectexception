import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography, useTheme } from '@mui/material';
import { SportsEsports } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const BEST_KEY = 'sandbox_breakout_best_score';
const W = 480;
const H = 360;
const PADDLE_W = 78;
const PADDLE_H = 12;
const BALL_R = 7;
const ROWS = 5;
const COLS = 9;
const BRICK_H = 16;
const BRICK_GAP = 5;
const TOP_OFFSET = 40;

type Status = 'idle' | 'playing' | 'won' | 'lost';

interface Brick { x: number; y: number; w: number; alive: boolean; hue: number; }

const buildBricks = (): Brick[] => {
    const bricks: Brick[] = [];
    const brickW = (W - BRICK_GAP * (COLS + 1)) / COLS;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            bricks.push({
                x: BRICK_GAP + c * (brickW + BRICK_GAP),
                y: TOP_OFFSET + r * (BRICK_H + BRICK_GAP),
                w: brickW,
                alive: true,
                hue: 130 - r * 18,
            });
        }
    }
    return bricks;
};

const loadBest = (): number => {
    try {
        const n = Number(localStorage.getItem(BEST_KEY));
        return Number.isFinite(n) ? n : 0;
    } catch {
        return 0;
    }
};

const Breakout: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    const [status, setStatus] = useState<Status>('idle');
    const [score, setScore] = useState(0);
    const [best, setBest] = useState<number>(() => loadBest());

    const state = useRef({
        paddleX: W / 2 - PADDLE_W / 2,
        ballX: W / 2,
        ballY: H - 40,
        vx: 3,
        vy: -3,
        bricks: buildBricks(),
        score: 0,
    });

    const draw = useCallback((ctx: CanvasRenderingContext2D) => {
        const s = state.current;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, W, H);

        // bricks
        s.bricks.forEach(b => {
            if (!b.alive) return;
            ctx.fillStyle = `hsl(${b.hue}, 70%, 55%)`;
            ctx.fillRect(b.x, b.y, b.w, BRICK_H);
        });

        // paddle
        ctx.fillStyle = primary;
        ctx.fillRect(s.paddleX, H - 22, PADDLE_W, PADDLE_H);

        // ball
        ctx.beginPath();
        ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }, [primary]);

    const endGame = useCallback((result: Status) => {
        cancelAnimationFrame(rafRef.current);
        setStatus(result);
        const finalScore = state.current.score;
        if (finalScore > best) {
            setBest(finalScore);
            try { localStorage.setItem(BEST_KEY, String(finalScore)); } catch { /* ignore */ }
        }
    }, [best]);

    const tick = useCallback(() => {
        const s = state.current;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        s.ballX += s.vx;
        s.ballY += s.vy;

        if (s.ballX < BALL_R || s.ballX > W - BALL_R) s.vx *= -1;
        if (s.ballY < BALL_R) s.vy *= -1;

        // paddle collision
        if (
            s.ballY > H - 22 - BALL_R &&
            s.ballY < H - 22 + PADDLE_H &&
            s.ballX > s.paddleX &&
            s.ballX < s.paddleX + PADDLE_W &&
            s.vy > 0
        ) {
            const hit = (s.ballX - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
            s.vx = hit * 4.5;
            s.vy = -Math.abs(s.vy);
        }

        // brick collision
        for (const b of s.bricks) {
            if (!b.alive) continue;
            if (s.ballX > b.x && s.ballX < b.x + b.w && s.ballY > b.y && s.ballY < b.y + BRICK_H) {
                b.alive = false;
                s.vy *= -1;
                s.score += 10;
                setScore(s.score);
                break;
            }
        }

        if (s.bricks.every(b => !b.alive)) { draw(ctx); endGame('won'); return; }
        if (s.ballY > H) { endGame('lost'); return; }

        draw(ctx);
        rafRef.current = requestAnimationFrame(tick);
    }, [draw, endGame]);

    const start = useCallback(() => {
        state.current = {
            paddleX: W / 2 - PADDLE_W / 2,
            ballX: W / 2,
            ballY: H - 40,
            vx: 3 * (Math.random() > 0.5 ? 1 : -1),
            vy: -3,
            bricks: buildBricks(),
            score: 0,
        };
        setScore(0);
        setStatus('playing');
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    }, [tick]);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    // Initial idle draw
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) draw(ctx);
    }, [draw]);

    const movePaddle = useCallback((clientX: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scale = W / rect.width;
        const x = (clientX - rect.left) * scale;
        state.current.paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (status !== 'playing') return;
            if (e.key === 'ArrowLeft') state.current.paddleX = Math.max(0, state.current.paddleX - 26);
            if (e.key === 'ArrowRight') state.current.paddleX = Math.min(W - PADDLE_W, state.current.paddleX + 26);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [status]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                title="Breakout — Free Online Brick Breaker Arcade Game"
                keywords={['breakout game', 'brick breaker online', 'arkanoid game free', 'classic arcade game', 'ball and paddle game', 'brick breaking game']}
            />
            <ServicePageHero
                icon={SportsEsports}
                title="Breakout"
                subtitle="Bounce the ball off your paddle to smash every brick. Move with your mouse, touch, or arrow keys."
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: { xs: 2, sm: 3 },
            }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="body1"><strong>Score:</strong> {score}</Typography>
                        <Typography variant="body1" color="text.secondary">Best: {best}</Typography>
                    </Stack>

                    <Box sx={{ position: 'relative', width: '100%', maxWidth: W, mx: 'auto' }}>
                        <canvas
                            ref={canvasRef}
                            width={W}
                            height={H}
                            onMouseMove={e => movePaddle(e.clientX)}
                            onTouchMove={e => { e.preventDefault(); movePaddle(e.touches[0].clientX); }}
                            style={{
                                width: '100%',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.08)',
                                touchAction: 'none',
                                display: 'block',
                            }}
                        />
                        {status !== 'playing' && (
                            <Box sx={{
                                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 2,
                                bgcolor: 'rgba(0,0,0,0.55)', borderRadius: '12px',
                            }}>
                                {status === 'won' && <Typography variant="h5" sx={{ color: primary, fontWeight: 800 }}>You cleared it! 🎉</Typography>}
                                {status === 'lost' && <Typography variant="h5" sx={{ color: theme.palette.error.main, fontWeight: 800 }}>Game Over</Typography>}
                                <Button variant="contained" onClick={start} sx={{ px: 4, fontWeight: 700 }}>
                                    {status === 'idle' ? 'Start' : 'Play again'}
                                </Button>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Breakout;
