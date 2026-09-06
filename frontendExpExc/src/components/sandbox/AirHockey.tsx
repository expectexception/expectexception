import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { SportsHockey } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

// Landscape table: goal mouths sit in the middle of the left and right
// walls. CPU defends the left goal, the player defends the right one and
// is confined to the right half of the table.
const W = 560;
const H = 360;
const PADDLE_R = 26;
const PUCK_R = 12;
const GOAL_HALF_HEIGHT = 65;
const GOAL_TOP = H / 2 - GOAL_HALF_HEIGHT;
const GOAL_BOTTOM = H / 2 + GOAL_HALF_HEIGHT;

const WIN_SCORE = 7;
const SERVE_SPEED = 4.2;
const MAX_PUCK_SPEED = 15;
const MIN_HIT_SPEED = 5;
const PADDLE_IMPART = 0.55;
const CPU_LERP = 0.08;
const CPU_MAX_SPEED = 5.5;

interface Vec2 { x: number; y: number; }
interface PuckState { x: number; y: number; vx: number; vy: number; }

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Random serve direction with the horizontal component kept meaningful, so
 * a serve can't skid along the top or bottom wall forever without ever
 * reaching either goal (which sit on the left and right walls). */
function randomServeVelocity(speed: number): { vx: number; vy: number } {
    let angle = Math.random() * Math.PI * 2;
    while (Math.abs(Math.cos(angle)) < 0.35) angle = Math.random() * Math.PI * 2;
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

/** Standard circle-circle bounce: the outgoing direction comes from the
 * normal between paddle center and puck center at the moment of contact, so
 * an off-center hit angles the shot instead of always sending it straight
 * back. A slice of the paddle's own recent velocity (its frame-to-frame
 * position delta) is added on top, so a fast swing actually accelerates the
 * puck rather than just redirecting it. */
function resolvePaddleHit(puck: PuckState, paddle: Vec2, paddleVX: number, paddleVY: number): void {
    const dx = puck.x - paddle.x;
    const dy = puck.y - paddle.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;

    const overlap = PUCK_R + PADDLE_R - dist;
    if (overlap > 0) {
        puck.x += nx * overlap;
        puck.y += ny * overlap;
    }

    const incomingSpeed = Math.max(Math.hypot(puck.vx, puck.vy), SERVE_SPEED);
    let vx = nx * incomingSpeed + paddleVX * PADDLE_IMPART;
    let vy = ny * incomingSpeed + paddleVY * PADDLE_IMPART;

    const speed = Math.hypot(vx, vy);
    if (speed > MAX_PUCK_SPEED) {
        const s = MAX_PUCK_SPEED / speed;
        vx *= s; vy *= s;
    } else if (speed < MIN_HIT_SPEED) {
        const s = MIN_HIT_SPEED / (speed || 0.0001);
        vx *= s; vy *= s;
    }

    puck.vx = vx;
    puck.vy = vy;
}

interface Stats { wins: number; losses: number; }
const STATS_KEY = 'sandbox_air_hockey_stats';
const DEFAULT_STATS: Stats = { wins: 0, losses: 0 };

const readStats = (): Stats => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return DEFAULT_STATS;
        const parsed = JSON.parse(raw);
        return {
            wins: Number.isFinite(parsed.wins) ? parsed.wins : 0,
            losses: Number.isFinite(parsed.losses) ? parsed.losses : 0,
        };
    } catch {
        return DEFAULT_STATS;
    }
};

const writeStats = (stats: Stats) => {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
        // localStorage unavailable - stats just won't persist
    }
};

const AirHockey: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const runningRef = useRef(true);

    const stateRef = useRef({
        player: { x: W - W / 4, y: H / 2 } as Vec2,
        prevPlayer: { x: W - W / 4, y: H / 2 } as Vec2,
        cpu: { x: W / 4, y: H / 2 } as Vec2,
        prevCpu: { x: W / 4, y: H / 2 } as Vec2,
        puck: { x: W / 2, y: H / 2, vx: 0, vy: 0 } as PuckState,
        playerScore: 0,
        cpuScore: 0,
    });

    const [scores, setScores] = useState({ player: 0, cpu: 0 });
    const [gameOver, setGameOver] = useState<string | null>(null);
    const [stats, setStats] = useState<Stats>(() => readStats());

    const resetPuck = useCallback(() => {
        const s = stateRef.current;
        s.puck.x = W / 2;
        s.puck.y = H / 2;
        const v = randomServeVelocity(SERVE_SPEED);
        s.puck.vx = v.vx;
        s.puck.vy = v.vy;
    }, []);

    const recordResult = useCallback((won: boolean) => {
        setStats((prev) => {
            const next = won ? { ...prev, wins: prev.wins + 1 } : { ...prev, losses: prev.losses + 1 };
            writeStats(next);
            return next;
        });
    }, []);

    const endGame = useCallback((winner: 'player' | 'cpu') => {
        runningRef.current = false;
        setGameOver(winner === 'player' ? 'You Win!' : 'CPU Wins');
        recordResult(winner === 'player');
    }, [recordResult]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = W;
        canvas.height = H;
        resetPuck();

        const loop = () => {
            const s = stateRef.current;

            if (runningRef.current) {
                const playerVX = s.player.x - s.prevPlayer.x;
                const playerVY = s.player.y - s.prevPlayer.y;
                s.prevPlayer.x = s.player.x;
                s.prevPlayer.y = s.player.y;

                // CPU AI: chase the puck's x when it's on the CPU's own
                // side (so it can actually intercept and hit back), fall
                // back toward its goal line otherwise. Smoothed toward the
                // target and speed-capped so it's beatable, not a wall.
                const targetX = s.puck.x < W / 2
                    ? clamp(s.puck.x, PADDLE_R, W / 2 - PADDLE_R)
                    : PADDLE_R + 40;
                const targetY = clamp(s.puck.y, PADDLE_R, H - PADDLE_R);
                let dx = (targetX - s.cpu.x) * CPU_LERP;
                let dy = (targetY - s.cpu.y) * CPU_LERP;
                const moveDist = Math.hypot(dx, dy);
                if (moveDist > CPU_MAX_SPEED) {
                    const sc = CPU_MAX_SPEED / moveDist;
                    dx *= sc; dy *= sc;
                }
                s.cpu.x = clamp(s.cpu.x + dx, PADDLE_R, W / 2 - PADDLE_R);
                s.cpu.y = clamp(s.cpu.y + dy, PADDLE_R, H - PADDLE_R);

                const cpuVX = s.cpu.x - s.prevCpu.x;
                const cpuVY = s.cpu.y - s.prevCpu.y;
                s.prevCpu.x = s.cpu.x;
                s.prevCpu.y = s.cpu.y;

                s.puck.x += s.puck.vx;
                s.puck.y += s.puck.vy;

                // Top / bottom walls always bounce - no goals up there.
                if (s.puck.y - PUCK_R < 0) {
                    s.puck.y = PUCK_R;
                    s.puck.vy = Math.abs(s.puck.vy);
                } else if (s.puck.y + PUCK_R > H) {
                    s.puck.y = H - PUCK_R;
                    s.puck.vy = -Math.abs(s.puck.vy);
                }

                const inGoalMouth = s.puck.y > GOAL_TOP && s.puck.y < GOAL_BOTTOM;

                if (s.puck.x - PUCK_R < 0) {
                    if (inGoalMouth) {
                        if (s.puck.x + PUCK_R < 0) {
                            // Puck has fully crossed the left goal line - player scores.
                            s.playerScore += 1;
                            setScores({ player: s.playerScore, cpu: s.cpuScore });
                            if (s.playerScore >= WIN_SCORE) endGame('player');
                            else resetPuck();
                        }
                        // else: still travelling through the gap, no collision yet.
                    } else {
                        s.puck.x = PUCK_R;
                        s.puck.vx = Math.abs(s.puck.vx);
                    }
                } else if (s.puck.x + PUCK_R > W) {
                    if (inGoalMouth) {
                        if (s.puck.x - PUCK_R > W) {
                            // Fully crossed the right goal line - CPU scores.
                            s.cpuScore += 1;
                            setScores({ player: s.playerScore, cpu: s.cpuScore });
                            if (s.cpuScore >= WIN_SCORE) endGame('cpu');
                            else resetPuck();
                        }
                    } else {
                        s.puck.x = W - PUCK_R;
                        s.puck.vx = -Math.abs(s.puck.vx);
                    }
                }

                if (Math.hypot(s.puck.x - s.player.x, s.puck.y - s.player.y) < PUCK_R + PADDLE_R) {
                    resolvePaddleHit(s.puck, s.player, playerVX, playerVY);
                }
                if (Math.hypot(s.puck.x - s.cpu.x, s.puck.y - s.cpu.y) < PUCK_R + PADDLE_R) {
                    resolvePaddleHit(s.puck, s.cpu, cpuVX, cpuVY);
                }
            }

            // ---- draw ----
            ctx.fillStyle = '#04262b';
            ctx.fillRect(0, 0, W, H);

            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 4;
            // Top and bottom walls, full width.
            ctx.beginPath();
            ctx.moveTo(0, 2); ctx.lineTo(W, 2);
            ctx.moveTo(0, H - 2); ctx.lineTo(W, H - 2);
            ctx.stroke();
            // Left wall, split around the goal mouth.
            ctx.beginPath();
            ctx.moveTo(2, 0); ctx.lineTo(2, GOAL_TOP);
            ctx.moveTo(2, GOAL_BOTTOM); ctx.lineTo(2, H);
            ctx.stroke();
            // Right wall, split around the goal mouth.
            ctx.beginPath();
            ctx.moveTo(W - 2, 0); ctx.lineTo(W - 2, GOAL_TOP);
            ctx.moveTo(W - 2, GOAL_BOTTOM); ctx.lineTo(W - 2, H);
            ctx.stroke();

            ctx.fillStyle = 'rgba(0,229,255,0.18)';
            ctx.fillRect(0, GOAL_TOP, 6, GOAL_BOTTOM - GOAL_TOP);
            ctx.fillStyle = 'rgba(57,255,136,0.18)';
            ctx.fillRect(W - 6, GOAL_TOP, 6, GOAL_BOTTOM - GOAL_TOP);

            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 8]);
            ctx.beginPath();
            ctx.moveTo(W / 2, 0);
            ctx.lineTo(W / 2, H);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, 46, 0, Math.PI * 2);
            ctx.stroke();

            const s2 = stateRef.current;
            ctx.beginPath();
            ctx.fillStyle = '#00e5ff';
            ctx.arc(s2.cpu.x, s2.cpu.y, PADDLE_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#39ff88';
            ctx.arc(s2.player.x, s2.player.y, PADDLE_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.arc(s2.puck.x, s2.puck.y, PUCK_R, 0, Math.PI * 2);
            ctx.fill();

            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!runningRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        stateRef.current.player.x = clamp(x, W / 2 + PADDLE_R, W - PADDLE_R);
        stateRef.current.player.y = clamp(y, PADDLE_R, H - PADDLE_R);
    };

    const handleRestart = useCallback(() => {
        const s = stateRef.current;
        s.playerScore = 0;
        s.cpuScore = 0;
        s.player = { x: W - W / 4, y: H / 2 };
        s.prevPlayer = { x: W - W / 4, y: H / 2 };
        s.cpu = { x: W / 4, y: H / 2 };
        s.prevCpu = { x: W / 4, y: H / 2 };
        setScores({ player: 0, cpu: 0 });
        setGameOver(null);
        runningRef.current = true;
        resetPuck();
    }, [resetPuck]);

    return (
        <>
            <Seo
                title="Air Hockey - Play Free Online Against the CPU"
                description="Play air hockey online for free. Move your mouse or finger to control your paddle, angle your shots off the puck's impact point, and score seven goals before the CPU does."
                keywords={['air hockey online', 'air hockey game free', 'play air hockey', 'browser air hockey', 'air hockey vs computer']}
            />
            <GamePlayShell
                icon={SportsHockey}
                title="Air Hockey"
                subtitle="Move your mouse or finger to slide your paddle. Angle your shots by hitting the puck off-center, first to 7 wins."
                onRestart={handleRestart}
                maxWidth="md"
            >
                <Card sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 1.5, sm: 3 },
                }}>
                    <CardContent sx={{ p: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                W {stats.wins} · L {stats.losses}
                            </Typography>
                            <Stack direction="row" spacing={4}>
                                <Typography variant="h4" fontWeight={900} sx={{ color: '#00e5ff' }}>{scores.cpu}</Typography>
                                <Typography variant="h4" fontWeight={900} color="primary.main">{scores.player}</Typography>
                            </Stack>
                        </Stack>

                        <Box
                            sx={{
                                width: '100%',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                position: 'relative',
                                touchAction: 'none',
                                mb: 3,
                            }}
                        >
                            <canvas
                                ref={canvasRef}
                                onPointerMove={handlePointerMove}
                                style={{ display: 'block', width: '100%', height: 'auto' }}
                            />
                            {gameOver && (
                                <Box sx={{
                                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.75)',
                                }}>
                                    <Typography variant="h4" fontWeight={900} sx={{ mb: 2 }}>{gameOver}</Typography>
                                    <Button variant="contained" onClick={handleRestart}>Play Again</Button>
                                </Box>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default AirHockey;
