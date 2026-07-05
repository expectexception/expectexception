import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography, useTheme, alpha } from '@mui/material';
import { BubbleChart } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const STATS_KEY = 'sandbox_bubbleshooter_stats';

// Canvas + hex-grid geometry. Bubbles pack in the classic "odd-r" offset layout:
// every other row is shifted right by one radius so circles nestle into the gaps
// of the row above/below instead of sitting in a plain square grid.
const R = 15; // bubble radius
const D = R * 2; // bubble diameter
const ROW_H = Math.round(D * 0.87); // vertical spacing for hex packing (~sqrt(3)/2 * D)
const COLS_EVEN = 9; // columns in a non-shifted row
const COLS_ODD = COLS_EVEN - 1; // columns in a shifted row (inset by half a bubble each side)
const CANVAS_W = R * 2 + (COLS_EVEN - 1) * D + D; // = COLS_EVEN * D, edge-to-edge for even rows
const CANVAS_H = 400;
const TOP_PAD = R;
const SHOOTER_Y = CANVAS_H - 30;
const DANGER_Y = CANVAS_H - 80;
const INIT_ROWS = 5;
const DROP_INTERVAL = 6; // shots between new rows dropping in from the top
const SHOT_SPEED = 6.5;
const MIN_ANGLE = Math.PI * 0.12;
const MAX_ANGLE = Math.PI * 0.88;

type Status = 'idle' | 'playing' | 'won' | 'lost';

interface GridRow {
    offset: 0 | 1;
    cells: (string | null)[];
}

interface ShotBubble {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
}

interface Engine {
    grid: GridRow[];
    shotBubble: ShotBubble | null;
    currentColor: string;
    nextColor: string;
    aimAngle: number;
    shotsSinceDrop: number;
    score: number;
}

const pickRandomColor = (colors: string[]): string => colors[Math.floor(Math.random() * colors.length)];

const buildInitialGrid = (colors: string[]): GridRow[] => {
    const rows: GridRow[] = [];
    for (let r = 0; r < INIT_ROWS; r++) {
        const offset: 0 | 1 = (r % 2) as 0 | 1;
        const count = offset === 0 ? COLS_EVEN : COLS_ODD;
        rows.push({ offset, cells: Array.from({ length: count }, () => pickRandomColor(colors)) });
    }
    return rows;
};

const cellPosition = (grid: GridRow[], row: number, col: number): { x: number; y: number } => {
    const off = grid[row].offset;
    return { x: R + (off === 1 ? R : 0) + col * D, y: TOP_PAD + row * ROW_H };
};

/** Neighbor cells in the hex grid, keyed off this row's own offset flag (not its
 * absolute index) so rows can be freely unshifted without breaking alignment. */
const getNeighbors = (grid: GridRow[], row: number, col: number): [number, number][] => {
    const off = grid[row].offset;
    const deltas: [number, number][] = off === 0
        ? [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]
        : [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
    const result: [number, number][] = [];
    for (const [dr, dc] of deltas) {
        const nr = row + dr;
        if (nr < 0 || nr >= grid.length) continue;
        const nc = col + dc;
        const rowCells = grid[nr].cells;
        if (nc < 0 || nc >= rowCells.length) continue;
        result.push([nr, nc]);
    }
    return result;
};

const findMatchGroup = (grid: GridRow[], row: number, col: number): [number, number][] => {
    const color = grid[row].cells[col];
    if (!color) return [];
    const visited = new Set<string>();
    const stack: [number, number][] = [[row, col]];
    const group: [number, number][] = [];
    while (stack.length) {
        const [r, c] = stack.pop()!;
        const key = `${r},${c}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (grid[r].cells[c] !== color) continue;
        group.push([r, c]);
        for (const [nr, nc] of getNeighbors(grid, r, c)) {
            if (!visited.has(`${nr},${nc}`)) stack.push([nr, nc]);
        }
    }
    return group;
};

/** Any bubble not connected (directly or transitively) to the top row is
 * floating in mid-air and should drop - the classic "orphaned cluster" rule. */
const findFloating = (grid: GridRow[]): [number, number][] => {
    const reachable = new Set<string>();
    const stack: [number, number][] = [];
    if (grid.length > 0) {
        grid[0].cells.forEach((color, c) => {
            if (color) {
                reachable.add(`0,${c}`);
                stack.push([0, c]);
            }
        });
    }
    while (stack.length) {
        const [r, c] = stack.pop()!;
        for (const [nr, nc] of getNeighbors(grid, r, c)) {
            const key = `${nr},${nc}`;
            if (reachable.has(key) || !grid[nr].cells[nc]) continue;
            reachable.add(key);
            stack.push([nr, nc]);
        }
    }
    const floating: [number, number][] = [];
    grid.forEach((rowObj, r) => {
        rowObj.cells.forEach((color, c) => {
            if (color && !reachable.has(`${r},${c}`)) floating.push([r, c]);
        });
    });
    return floating;
};

interface BestStats {
    bestScore: number;
}

const readBest = (): BestStats => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return { bestScore: 0 };
        const parsed = JSON.parse(raw);
        return { bestScore: Number.isFinite(parsed.bestScore) ? parsed.bestScore : 0 };
    } catch {
        return { bestScore: 0 };
    }
};

const writeBest = (stats: BestStats) => {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
        // ignore storage errors
    }
};

const BubbleShooter: React.FC = () => {
    const theme = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    const [status, setStatus] = useState<Status>('idle');
    const [score, setScore] = useState(0);
    const [best, setBest] = useState<BestStats>(() => readBest());
    const [preview, setPreview] = useState<{ current: string; next: string }>({ current: '', next: '' });

    const colors = useMemo(() => ([
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.info.main,
    ]), [theme]);

    const engine = useRef<Engine>({
        grid: [],
        shotBubble: null,
        currentColor: colors[0],
        nextColor: colors[0],
        aimAngle: Math.PI / 2,
        shotsSinceDrop: 0,
        score: 0,
    });

    const draw = useCallback((ctx: CanvasRenderingContext2D) => {
        const s = engine.current;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // danger line
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = alpha(theme.palette.error.main, 0.4);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, DANGER_Y);
        ctx.lineTo(CANVAS_W, DANGER_Y);
        ctx.stroke();
        ctx.restore();

        // grid bubbles
        s.grid.forEach((rowObj, r) => {
            rowObj.cells.forEach((color, c) => {
                if (!color) return;
                const { x, y } = cellPosition(s.grid, r, c);
                ctx.beginPath();
                ctx.arc(x, y, R - 1.5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                ctx.stroke();
            });
        });

        // aim guide
        if (status === 'playing' && !s.shotBubble) {
            ctx.save();
            ctx.setLineDash([3, 6]);
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(CANVAS_W / 2, SHOOTER_Y);
            ctx.lineTo(
                CANVAS_W / 2 + Math.cos(s.aimAngle) * 130,
                SHOOTER_Y - Math.sin(s.aimAngle) * 130,
            );
            ctx.stroke();
            ctx.restore();
        }

        // shooter bubble (sitting, pre-fire)
        if (!s.shotBubble && status === 'playing') {
            ctx.beginPath();
            ctx.arc(CANVAS_W / 2, SHOOTER_Y, R - 1.5, 0, Math.PI * 2);
            ctx.fillStyle = s.currentColor;
            ctx.fill();
        }

        // flying shot bubble
        if (s.shotBubble) {
            ctx.beginPath();
            ctx.arc(s.shotBubble.x, s.shotBubble.y, R - 1.5, 0, Math.PI * 2);
            ctx.fillStyle = s.shotBubble.color;
            ctx.fill();
        }
    }, [status, theme]);

    const endGame = useCallback((result: 'won' | 'lost') => {
        cancelAnimationFrame(rafRef.current);
        setStatus(result);
        const finalScore = engine.current.score;
        setBest((prev) => {
            if (finalScore > prev.bestScore) {
                const next = { bestScore: finalScore };
                writeBest(next);
                return next;
            }
            return prev;
        });
    }, []);

    const resolveShot = useCallback(() => {
        const s = engine.current;
        const b = s.shotBubble;
        if (!b) return;

        let hitRow = -1;
        let hitCol = -1;
        let minDist = Infinity;
        s.grid.forEach((rowObj, r) => {
            rowObj.cells.forEach((color, c) => {
                if (!color) return;
                const pos = cellPosition(s.grid, r, c);
                const dist = Math.hypot(pos.x - b.x, pos.y - b.y);
                if (dist < D - 4 && dist < minDist) {
                    minDist = dist;
                    hitRow = r;
                    hitCol = c;
                }
            });
        });

        const ceilingHit = b.y - R <= TOP_PAD - 2;
        if (hitRow === -1 && !ceilingHit) return; // still flying, nothing to resolve yet

        let attach: [number, number] | null = null;
        if (hitRow !== -1) {
            const emptyNeighbors = getNeighbors(s.grid, hitRow, hitCol).filter(([nr, nc]) => !s.grid[nr].cells[nc]);
            let bestDist = Infinity;
            for (const [nr, nc] of emptyNeighbors) {
                const pos = cellPosition(s.grid, nr, nc);
                const dist = Math.hypot(pos.x - b.x, pos.y - b.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    attach = [nr, nc];
                }
            }
        } else if (s.grid.length > 0) {
            let bestDist = Infinity;
            s.grid[0].cells.forEach((color, c) => {
                if (color) return;
                const pos = cellPosition(s.grid, 0, c);
                const dist = Math.abs(pos.x - b.x);
                if (dist < bestDist) {
                    bestDist = dist;
                    attach = [0, c];
                }
            });
        }

        if (attach) {
            const [ar, ac] = attach;
            s.grid[ar].cells[ac] = b.color;
            const group = findMatchGroup(s.grid, ar, ac);
            let gained = 0;
            if (group.length >= 3) {
                group.forEach(([r, c]) => { s.grid[r].cells[c] = null; });
                gained += group.length * 10;
                const floating = findFloating(s.grid);
                floating.forEach(([r, c]) => { s.grid[r].cells[c] = null; });
                gained += floating.length * 20;
            }
            if (gained > 0) {
                s.score += gained;
                setScore(s.score);
            }
        }

        s.shotBubble = null;
        s.currentColor = s.nextColor;
        s.nextColor = pickRandomColor(colors);
        setPreview({ current: s.currentColor, next: s.nextColor });

        s.shotsSinceDrop += 1;
        if (s.shotsSinceDrop >= DROP_INTERVAL) {
            s.shotsSinceDrop = 0;
            const newOffset: 0 | 1 = s.grid.length > 0 ? ((1 - s.grid[0].offset) as 0 | 1) : 0;
            const count = newOffset === 0 ? COLS_EVEN : COLS_ODD;
            s.grid.unshift({ offset: newOffset, cells: Array.from({ length: count }, () => pickRandomColor(colors)) });
        }

        const remaining = s.grid.some((rowObj) => rowObj.cells.some((c) => c !== null));
        if (!remaining) {
            endGame('won');
            return;
        }

        let over = false;
        s.grid.forEach((rowObj, r) => {
            if (over) return;
            rowObj.cells.forEach((color) => {
                if (color && TOP_PAD + r * ROW_H + R >= DANGER_Y) over = true;
            });
        });
        if (over) endGame('lost');
    }, [colors, endGame]);

    const tick = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const s = engine.current;

        if (s.shotBubble) {
            const b = s.shotBubble;
            b.x += b.vx;
            b.y += b.vy;
            if (b.x - R < 0) { b.x = R; b.vx *= -1; }
            if (b.x + R > CANVAS_W) { b.x = CANVAS_W - R; b.vx *= -1; }
            resolveShot();
        }

        draw(ctx);
        if (status === 'playing') rafRef.current = requestAnimationFrame(tick);
    }, [draw, resolveShot, status]);

    const start = useCallback(() => {
        engine.current = {
            grid: buildInitialGrid(colors),
            shotBubble: null,
            currentColor: pickRandomColor(colors),
            nextColor: pickRandomColor(colors),
            aimAngle: Math.PI / 2,
            shotsSinceDrop: 0,
            score: 0,
        };
        setScore(0);
        setPreview({ current: engine.current.currentColor, next: engine.current.nextColor });
        setStatus('playing');
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    }, [colors, tick]);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    // Initial idle draw
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) draw(ctx);
    }, [draw]);

    const updateAim = useCallback((clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas || status !== 'playing') return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const localX = (clientX - rect.left) * scaleX;
        const localY = (clientY - rect.top) * scaleY;
        const dx = localX - CANVAS_W / 2;
        const dy = SHOOTER_Y - localY;
        let angle = Math.atan2(dy, dx);
        angle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angle));
        engine.current.aimAngle = angle;
    }, [status]);

    const fireShot = useCallback(() => {
        const s = engine.current;
        if (status !== 'playing' || s.shotBubble) return;
        const angle = s.aimAngle;
        s.shotBubble = {
            x: CANVAS_W / 2,
            y: SHOOTER_Y,
            vx: Math.cos(angle) * SHOT_SPEED,
            vy: -Math.sin(angle) * SHOT_SPEED,
            color: s.currentColor,
        };
    }, [status]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                title="Bubble Shooter - Free Online Bubble Pop Arcade Game"
                keywords={['bubble shooter game', 'bubble pop online', 'match 3 bubbles', 'free arcade game', 'bubble shooter free']}
            />
            <ServicePageHero
                icon={BubbleChart}
                title="Bubble Shooter"
                subtitle="Aim with your mouse or finger and fire colored bubbles into the grid. Match 3 or more of the same color to pop them - clear the board before the bubbles reach the bottom."
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
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                        <Typography variant="body1"><strong>Score:</strong> {score}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary">Next:</Typography>
                            <Box sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                bgcolor: preview.next || 'rgba(255,255,255,0.15)',
                                border: '2px solid rgba(255,255,255,0.2)',
                            }} />
                        </Stack>
                        <Typography variant="body1" color="text.secondary">Best: {best.bestScore}</Typography>
                    </Stack>

                    <Box sx={{ position: 'relative', width: '100%', maxWidth: CANVAS_W, mx: 'auto' }}>
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_W}
                            height={CANVAS_H}
                            onMouseMove={(e) => updateAim(e.clientX, e.clientY)}
                            onClick={fireShot}
                            onTouchStart={(e) => updateAim(e.touches[0].clientX, e.touches[0].clientY)}
                            onTouchMove={(e) => { e.preventDefault(); updateAim(e.touches[0].clientX, e.touches[0].clientY); }}
                            onTouchEnd={fireShot}
                            style={{
                                width: '100%',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.08)',
                                touchAction: 'none',
                                display: 'block',
                                cursor: 'crosshair',
                            }}
                        />
                        <AnimatePresence>
                            {status !== 'playing' && (
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    sx={{
                                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', gap: 2,
                                        bgcolor: 'rgba(0,0,0,0.55)', borderRadius: '12px',
                                    }}
                                >
                                    {status === 'won' && (
                                        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 800 }}>
                                            Board cleared!
                                        </Typography>
                                    )}
                                    {status === 'lost' && (
                                        <Typography variant="h5" sx={{ color: theme.palette.error.main, fontWeight: 800 }}>
                                            Game Over
                                        </Typography>
                                    )}
                                    {status === 'idle' && (
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            Ready to pop some bubbles?
                                        </Typography>
                                    )}
                                    <Button variant="contained" onClick={start} sx={{ px: 4, fontWeight: 700 }}>
                                        {status === 'idle' ? 'Start' : 'Play again'}
                                    </Button>
                                </Box>
                            )}
                        </AnimatePresence>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                        Move your mouse or drag your finger to aim, then click or release to fire.
                    </Typography>
                </CardContent>
            </Card>
        </Container>
    );
};

export default BubbleShooter;
