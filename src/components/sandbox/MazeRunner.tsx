import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box, Button, Card, CardContent, Chip, Container, IconButton, Stack, Typography,
    ToggleButton, ToggleButtonGroup, useTheme, alpha,
} from '@mui/material';
import {
    AltRoute, Flag, KeyboardArrowUp, KeyboardArrowDown, KeyboardArrowLeft, KeyboardArrowRight, Refresh,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const STATS_KEY = 'sandbox_maze_stats';
const CANVAS = 450;
const DEFAULT_SIZE = 15;
const SIZES = [11, 15, 19] as const;

type Dir = 'N' | 'E' | 'S' | 'W';

interface Cell {
    N: boolean;
    E: boolean;
    S: boolean;
    W: boolean;
}

const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const DELTA: Record<Dir, { dr: number; dc: number }> = {
    N: { dr: -1, dc: 0 },
    E: { dr: 0, dc: 1 },
    S: { dr: 1, dc: 0 },
    W: { dr: 0, dc: -1 },
};

/**
 * Recursive backtracking maze generator (iterative, via an explicit stack, to
 * avoid deep recursion on larger grids). Carves a perfect maze - a spanning
 * tree over every cell - so there is always exactly one path from start to
 * goal and the result is guaranteed solvable.
 */
const generateMaze = (size: number): Cell[] => {
    const cells: Cell[] = Array.from({ length: size * size }, () => ({ N: true, E: true, S: true, W: true }));
    const visited = new Array(size * size).fill(false);
    const idx = (r: number, c: number) => r * size + c;

    const stack: number[] = [0];
    visited[0] = true;

    while (stack.length) {
        const current = stack[stack.length - 1];
        const r = Math.floor(current / size);
        const c = current % size;

        const options: [Dir, number][] = [];
        if (r > 0 && !visited[idx(r - 1, c)]) options.push(['N', idx(r - 1, c)]);
        if (c < size - 1 && !visited[idx(r, c + 1)]) options.push(['E', idx(r, c + 1)]);
        if (r < size - 1 && !visited[idx(r + 1, c)]) options.push(['S', idx(r + 1, c)]);
        if (c > 0 && !visited[idx(r, c - 1)]) options.push(['W', idx(r, c - 1)]);

        if (options.length === 0) {
            stack.pop();
            continue;
        }

        const [dir, nextIndex] = options[Math.floor(Math.random() * options.length)];
        cells[current][dir] = false;
        cells[nextIndex][OPPOSITE[dir]] = false;
        visited[nextIndex] = true;
        stack.push(nextIndex);
    }

    return cells;
};

const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const ss = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
};

interface BestRecord {
    moves: number;
    timeMs: number;
}

type BestBySize = Record<number, BestRecord>;

const readBest = (): BestBySize => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeBest = (stats: BestBySize) => {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
        // ignore storage errors
    }
};

const MazeRunner: React.FC = () => {
    const theme = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [size, setSize] = useState(DEFAULT_SIZE);
    const [maze, setMaze] = useState<Cell[]>(() => generateMaze(DEFAULT_SIZE));
    const [playerIndex, setPlayerIndex] = useState(0);
    const [moves, setMoves] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [solved, setSolved] = useState(false);
    const [best, setBest] = useState<BestBySize>(() => readBest());

    const cellSize = CANVAS / size;

    useEffect(() => {
        if (startTime !== null && !solved) {
            intervalRef.current = setInterval(() => setElapsedMs(Date.now() - startTime), 1000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [startTime, solved]);

    const newMaze = useCallback((nextSize: number = size) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSize(nextSize);
        setMaze(generateMaze(nextSize));
        setPlayerIndex(0);
        setMoves(0);
        setStartTime(null);
        setElapsedMs(0);
        setSolved(false);
    }, [size]);

    // Draw the maze walls onto the canvas whenever the maze or its size changes.
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS, CANVAS);
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, CANVAS, CANVAS);

        // goal tile highlight
        const goalX = (size - 1) * cellSize;
        const goalY = (size - 1) * cellSize;
        ctx.fillStyle = alpha(theme.palette.secondary.main, 0.18);
        ctx.fillRect(goalX + 2, goalY + 2, cellSize - 4, cellSize - 4);

        ctx.strokeStyle = alpha(theme.palette.text.primary, 0.4);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = maze[r * size + c];
                if (!cell) continue;
                const x = c * cellSize;
                const y = r * cellSize;
                if (cell.N) { ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); }
                if (cell.W) { ctx.moveTo(x, y); ctx.lineTo(x, y + cellSize); }
                if (cell.S) { ctx.moveTo(x, y + cellSize); ctx.lineTo(x + cellSize, y + cellSize); }
                if (cell.E) { ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); }
            }
        }
        ctx.stroke();
    }, [maze, size, cellSize, theme]);

    const move = useCallback((dir: Dir) => {
        if (solved || maze.length === 0) return;
        const r = Math.floor(playerIndex / size);
        const c = playerIndex % size;
        const cell = maze[playerIndex];
        if (!cell || cell[dir]) return; // wall blocks this direction

        const { dr, dc } = DELTA[dir];
        const nextIndex = (r + dr) * size + (c + dc);
        const effectiveStart = startTime ?? Date.now();
        if (startTime === null) setStartTime(effectiveStart);

        const nextMoves = moves + 1;
        setMoves(nextMoves);
        setPlayerIndex(nextIndex);

        if (nextIndex === size * size - 1) {
            const finalElapsed = Date.now() - effectiveStart;
            if (intervalRef.current) clearInterval(intervalRef.current);
            setElapsedMs(finalElapsed);
            setSolved(true);
            setBest((prev) => {
                const current = prev[size];
                if (!current || nextMoves < current.moves || (nextMoves === current.moves && finalElapsed < current.timeMs)) {
                    const next = { ...prev, [size]: { moves: nextMoves, timeMs: finalElapsed } };
                    writeBest(next);
                    return next;
                }
                return prev;
            });
        }
    }, [solved, maze, playerIndex, size, startTime, moves]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const map: Record<string, Dir> = {
                ArrowUp: 'N', ArrowDown: 'S', ArrowLeft: 'W', ArrowRight: 'E',
            };
            const dir = map[e.key];
            if (!dir) return;
            e.preventDefault();
            move(dir);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [move]);

    const handleTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; // ignore taps
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'E' : 'W');
        else move(dy > 0 ? 'S' : 'N');
    };

    const playerRow = Math.floor(playerIndex / size);
    const playerCol = playerIndex % size;
    const playerLeftPct = ((playerCol + 0.5) / size) * 100;
    const playerTopPct = ((playerRow + 0.5) / size) * 100;
    const goalLeftPct = ((size - 0.5) / size) * 100;
    const goalTopPct = ((size - 0.5) / size) * 100;

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                title="Maze Runner - Free Online Random Maze Game"
                keywords={['maze game online', 'maze runner free', 'random maze generator', 'maze puzzle game', 'labyrinth game']}
            />
            <ServicePageHero
                icon={AltRoute}
                title="Maze Runner"
                subtitle="Navigate a freshly generated maze from start to goal. Arrow keys, on-screen arrows, or a swipe - every maze is guaranteed solvable."
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
                    <Stack direction="row" justifyContent="center" sx={{ mb: 3 }}>
                        <ToggleButtonGroup
                            value={size}
                            exclusive
                            onChange={(_, value) => value && newMaze(value)}
                            size="small"
                            sx={{
                                '& .MuiToggleButtonGroup-grouped': {
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px !important',
                                    mx: 0.5,
                                },
                            }}
                        >
                            <ToggleButton value={SIZES[0]} sx={{ px: 2, textTransform: 'none' }}>Small</ToggleButton>
                            <ToggleButton value={SIZES[1]} sx={{ px: 2, textTransform: 'none' }}>Medium</ToggleButton>
                            <ToggleButton value={SIZES[2]} sx={{ px: 2, textTransform: 'none' }}>Large</ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                        <Chip size="small" label={`Moves: ${moves}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                        <Chip size="small" label={`Time: ${formatTime(elapsedMs)}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                        <Typography variant="body2" color="text.secondary">
                            Best: {best[size] ? `${best[size].moves} moves / ${formatTime(best[size].timeMs)}` : '—'}
                        </Typography>
                    </Stack>

                    {solved && (
                        <Typography sx={{ color: 'primary.main', fontWeight: 700, mb: 2, textAlign: 'center' }}>
                            Reached the goal in {moves} moves and {formatTime(elapsedMs)}!
                        </Typography>
                    )}

                    <Box
                        sx={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: CANVAS,
                            aspectRatio: '1',
                            mx: 'auto',
                            mb: 3,
                            touchAction: 'none',
                        }}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        <canvas
                            ref={canvasRef}
                            width={CANVAS}
                            height={CANVAS}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'block',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        />
                        <Box
                            component={motion.div}
                            animate={{ left: `${goalLeftPct}%`, top: `${goalTopPct}%` }}
                            sx={{
                                position: 'absolute',
                                width: '5%',
                                height: '5%',
                                marginLeft: '-2.5%',
                                marginTop: '-2.5%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: theme.palette.secondary.main,
                                pointerEvents: 'none',
                            }}
                        >
                            <Flag sx={{ fontSize: '1.1rem' }} />
                        </Box>
                        <Box
                            component={motion.div}
                            animate={{ left: `${playerLeftPct}%`, top: `${playerTopPct}%` }}
                            transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                            sx={{
                                position: 'absolute',
                                width: '6%',
                                height: '6%',
                                marginLeft: '-3%',
                                marginTop: '-3%',
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.7)}`,
                                pointerEvents: 'none',
                            }}
                        />
                    </Box>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 48px)',
                        gridTemplateRows: 'repeat(3, 48px)',
                        gap: 1,
                        justifyContent: 'center',
                        mb: 3,
                    }}>
                        <Box />
                        <IconButton onClick={() => move('N')} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }}>
                            <KeyboardArrowUp />
                        </IconButton>
                        <Box />
                        <IconButton onClick={() => move('W')} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }}>
                            <KeyboardArrowLeft />
                        </IconButton>
                        <Box />
                        <IconButton onClick={() => move('E')} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }}>
                            <KeyboardArrowRight />
                        </IconButton>
                        <Box />
                        <IconButton onClick={() => move('S')} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }}>
                            <KeyboardArrowDown />
                        </IconButton>
                        <Box />
                    </Box>

                    <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={() => newMaze()}>
                        New Maze
                    </Button>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                        Arrow keys, the on-screen pad, or a swipe on the maze all move you one step.
                    </Typography>
                </CardContent>
            </Card>
        </Container>
    );
};

export default MazeRunner;
