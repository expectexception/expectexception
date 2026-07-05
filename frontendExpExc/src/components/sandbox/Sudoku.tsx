import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography, useTheme, alpha } from '@mui/material';
import { Grid3x3, Timer, RestartAlt, Backspace, EmojiEvents } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

type Grid = number[][];
type Difficulty = 'easy' | 'medium' | 'hard';
type Phase = 'select' | 'playing' | 'won';

interface Position {
    row: number;
    col: number;
}

const STATS_KEY = 'sandbox_sudoku_stats';

// Number of pre-filled cells per difficulty - fewer givens means more solving.
const DIFFICULTY_GIVENS: Record<Difficulty, number> = {
    easy: 40,
    medium: 32,
    hard: 26,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
};

interface DifficultyStats {
    best: number | null;
    solved: number;
}

type Stats = Record<Difficulty, DifficultyStats>;

const DEFAULT_STATS: Stats = {
    easy: { best: null, solved: 0 },
    medium: { best: null, solved: 0 },
    hard: { best: null, solved: 0 },
};

const readStats = (): Stats => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return DEFAULT_STATS;
        const parsed = JSON.parse(raw);
        const safe = (d: Partial<DifficultyStats> | undefined): DifficultyStats => ({
            best: d && Number.isFinite(d.best) && (d.best as number) > 0 ? (d.best as number) : null,
            solved: d && Number.isFinite(d.solved) ? (d.solved as number) : 0,
        });
        return {
            easy: safe(parsed?.easy),
            medium: safe(parsed?.medium),
            hard: safe(parsed?.hard),
        };
    } catch {
        return DEFAULT_STATS;
    }
};

const writeStats = (stats: Stats) => {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
        // ignore storage errors
    }
};

const createEmptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));

const cloneGrid = (grid: Grid): Grid => grid.map((row) => row.slice());

const shuffle = <T,>(arr: T[]): T[] => {
    const next = arr.slice();
    for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
};

const boxIndex = (row: number, col: number): number => Math.floor(row / 3) * 3 + Math.floor(col / 3);

const isValidPlacement = (grid: Grid, row: number, col: number, num: number): boolean => {
    for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num) return false;
        if (grid[i][col] === num) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (grid[boxRow + r][boxCol + c] === num) return false;
        }
    }
    return true;
};

/**
 * Recursive backtracking fill, scanning cells in row-major order but trying
 * candidate numbers in random order - produces a different valid, complete
 * grid every call without needing any pre-seeded template.
 */
const fillGrid = (grid: Grid): boolean => {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] !== 0) continue;
            const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            for (const num of candidates) {
                if (isValidPlacement(grid, row, col, num)) {
                    grid[row][col] = num;
                    if (fillGrid(grid)) return true;
                    grid[row][col] = 0;
                }
            }
            return false; // no candidate works here - backtrack
        }
    }
    return true; // every cell filled
};

const generateSolvedGrid = (): Grid => {
    const grid = createEmptyGrid();
    fillGrid(grid);
    return grid;
};

/**
 * Builds a puzzle by punching random holes in a complete solution. A strict
 * "unique solution" check is intentionally skipped - it would require a much
 * heavier solver pass for a nice-to-have guarantee, and win detection below
 * already validates the player's own completed grid on its own merits rather
 * than diffing against this exact `solution`.
 */
const generatePuzzle = (difficulty: Difficulty): { puzzle: Grid; solution: Grid } => {
    const solution = generateSolvedGrid();
    const puzzle = cloneGrid(solution);
    const givens = DIFFICULTY_GIVENS[difficulty];
    const cellsToRemove = 81 - givens;

    const positions = shuffle(Array.from({ length: 81 }, (_, i) => ({ row: Math.floor(i / 9), col: i % 9 }))).slice(
        0,
        cellsToRemove,
    );

    positions.forEach(({ row, col }) => {
        puzzle[row][col] = 0;
    });

    return { puzzle, solution };
};

/** Every (row,col) that currently shares a value with another filled cell in
 * the same row, column, or 3x3 box - i.e. all active rule violations. */
const computeConflicts = (values: Grid): Set<string> => {
    const conflicts = new Set<string>();

    const markGroup = (cells: Position[]) => {
        const seen = new Map<number, Position[]>();
        cells.forEach(({ row, col }) => {
            const v = values[row][col];
            if (!v) return;
            const list = seen.get(v) ?? [];
            list.push({ row, col });
            seen.set(v, list);
        });
        seen.forEach((list) => {
            if (list.length > 1) {
                list.forEach(({ row, col }) => conflicts.add(`${row}-${col}`));
            }
        });
    };

    for (let i = 0; i < 9; i++) {
        markGroup(Array.from({ length: 9 }, (_, c) => ({ row: i, col: c })));
        markGroup(Array.from({ length: 9 }, (_, r) => ({ row: r, col: i })));
    }
    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
            const cells: Position[] = [];
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    cells.push({ row: br * 3 + r, col: bc * 3 + c });
                }
            }
            markGroup(cells);
        }
    }
    return conflicts;
};

const isGridFull = (values: Grid): boolean => values.every((row) => row.every((v) => v !== 0));

const formatTime = (totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const Sudoku: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [phase, setPhase] = useState<Phase>('select');
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [given, setGiven] = useState<Grid>(createEmptyGrid);
    const [values, setValues] = useState<Grid>(createEmptyGrid);
    const [selected, setSelected] = useState<Position | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [stats, setStats] = useState<Stats>(readStats);
    const [isNewBest, setIsNewBest] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => () => stopTimer(), [stopTimer]);

    const startPuzzle = useCallback(
        (level: Difficulty) => {
            stopTimer();
            const { puzzle } = generatePuzzle(level);
            setDifficulty(level);
            setGiven(puzzle);
            setValues(cloneGrid(puzzle));
            setSelected(null);
            setSeconds(0);
            setIsNewBest(false);
            setPhase('playing');
            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        },
        [stopTimer],
    );

    const backToMenu = useCallback(() => {
        stopTimer();
        setPhase('select');
        setSelected(null);
    }, [stopTimer]);

    const conflicts = useMemo(() => computeConflicts(values), [values]);
    const isWon = phase === 'won';

    // Win detection: the grid is solved once every cell is filled with no
    // row/column/box conflicts - a directly-verifiable win condition that
    // doesn't depend on matching one particular (possibly non-unique) solution.
    useEffect(() => {
        if (phase !== 'playing') return;
        if (!isGridFull(values) || conflicts.size > 0) return;
        stopTimer();
        setPhase('won');
        setStats((prev) => {
            const current = prev[difficulty];
            const beatBest = current.best === null || seconds < current.best;
            setIsNewBest(beatBest);
            const next: Stats = {
                ...prev,
                [difficulty]: { best: beatBest ? seconds : current.best, solved: current.solved + 1 },
            };
            writeStats(next);
            return next;
        });
    }, [values, conflicts, phase, difficulty, seconds, stopTimer]);

    const isGivenCell = useCallback((row: number, col: number) => given[row][col] !== 0, [given]);

    const handleCellClick = (row: number, col: number) => {
        if (phase !== 'playing') return;
        setSelected({ row, col });
    };

    const placeNumber = useCallback(
        (num: number) => {
            if (phase !== 'playing' || !selected) return;
            if (isGivenCell(selected.row, selected.col)) return;
            setValues((prev) => {
                const next = cloneGrid(prev);
                next[selected.row][selected.col] = num;
                return next;
            });
        },
        [phase, selected, isGivenCell],
    );

    const clearCell = useCallback(() => {
        if (phase !== 'playing' || !selected) return;
        if (isGivenCell(selected.row, selected.col)) return;
        setValues((prev) => {
            const next = cloneGrid(prev);
            next[selected.row][selected.col] = 0;
            return next;
        });
    }, [phase, selected, isGivenCell]);

    // Keyboard support for desktop players, layered on top of the on-screen
    // number pad that mobile/touch users depend on for entry.
    useEffect(() => {
        if (phase !== 'playing') return undefined;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '1' && e.key <= '9') {
                placeNumber(Number(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
                clearCell();
            } else if (e.key === 'ArrowUp') {
                setSelected((s) => (s ? { row: Math.max(0, s.row - 1), col: s.col } : { row: 8, col: 0 }));
            } else if (e.key === 'ArrowDown') {
                setSelected((s) => (s ? { row: Math.min(8, s.row + 1), col: s.col } : { row: 0, col: 0 }));
            } else if (e.key === 'ArrowLeft') {
                setSelected((s) => (s ? { row: s.row, col: Math.max(0, s.col - 1) } : { row: 0, col: 8 }));
            } else if (e.key === 'ArrowRight') {
                setSelected((s) => (s ? { row: s.row, col: Math.min(8, s.col + 1) } : { row: 0, col: 0 }));
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [phase, placeNumber, clearCell]);

    // How many of each digit are currently placed, so a fully-used number can
    // be disabled on the pad instead of letting players keep stacking it.
    const numberCounts = useMemo(() => {
        const counts = Array(10).fill(0);
        values.forEach((row) => row.forEach((v) => {
            if (v) counts[v] += 1;
        }));
        return counts;
    }, [values]);

    const bestForDifficulty = stats[difficulty]?.best ?? null;

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                title="Sudoku — Free Online 9x9 Puzzle"
                keywords={['sudoku', 'play sudoku online', 'free sudoku puzzle', 'sudoku easy medium hard', 'number puzzle game']}
            />
            <ServicePageHero
                icon={Grid3x3}
                title="Sudoku"
                subtitle="Fill the grid so every row, column, and 3x3 box holds the numbers 1 to 9 exactly once. Pick a difficulty and race the clock."
            />

            <Card
                sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 2, sm: 3 },
                }}
            >
                <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                    {phase === 'select' && (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                                Choose a difficulty
                            </Typography>
                            <Stack spacing={2} sx={{ maxWidth: 320, mx: 'auto' }}>
                                {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                                    <Button
                                        key={level}
                                        variant="contained"
                                        size="large"
                                        onClick={() => startPuzzle(level)}
                                        sx={{ py: 1.25, fontWeight: 700 }}
                                    >
                                        {DIFFICULTY_LABELS[level]}
                                        {stats[level].best !== null && (
                                            <Typography component="span" variant="body2" sx={{ ml: 1, opacity: 0.75 }}>
                                                (best {formatTime(stats[level].best as number)})
                                            </Typography>
                                        )}
                                    </Button>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {phase !== 'select' && (
                        <>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                                    {DIFFICULTY_LABELS[difficulty]}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Timer sx={{ fontSize: 18 }} />
                                    {formatTime(seconds)} · Best: {bestForDifficulty !== null ? formatTime(bestForDifficulty) : '—'}
                                </Typography>
                                <Button size="small" startIcon={<RestartAlt />} onClick={backToMenu}>
                                    New
                                </Button>
                            </Stack>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(9, 1fr)',
                                    gap: 0,
                                    maxWidth: 400,
                                    mx: 'auto',
                                    border: '2px solid rgba(255,255,255,0.25)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    userSelect: 'none',
                                    touchAction: 'manipulation',
                                    opacity: isWon ? 0.55 : 1,
                                    pointerEvents: isWon ? 'none' : 'auto',
                                    transition: 'opacity 0.3s ease',
                                }}
                            >
                                {values.map((row, r) => row.map((value, c) => {
                                    const isSelected = selected?.row === r && selected?.col === c;
                                    const isPeer = !!selected
                                        && !isSelected
                                        && (selected.row === r || selected.col === c || boxIndex(selected.row, selected.col) === boxIndex(r, c));
                                    const isSameValue = !!selected
                                        && !!value
                                        && values[selected.row][selected.col] === value
                                        && !isSelected;
                                    const hasConflict = conflicts.has(`${r}-${c}`);
                                    const isGivenVal = given[r][c] !== 0;

                                    let bgcolor = 'rgba(255,255,255,0.03)';
                                    if (isSameValue) bgcolor = alpha(primary, 0.22);
                                    else if (isPeer) bgcolor = alpha(primary, 0.08);
                                    if (hasConflict) bgcolor = alpha(theme.palette.error.main, 0.2);
                                    if (isSelected) bgcolor = alpha(primary, hasConflict ? 0.35 : 0.32);

                                    return (
                                        <Box
                                            key={`${r}-${c}`}
                                            onClick={() => handleCellClick(r, c)}
                                            sx={{
                                                aspectRatio: '1 / 1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: isGivenVal ? 'default' : 'pointer',
                                                bgcolor,
                                                borderRight: c % 3 === 2 && c !== 8
                                                    ? '2px solid rgba(255,255,255,0.25)'
                                                    : '1px solid rgba(255,255,255,0.06)',
                                                borderBottom: r % 3 === 2 && r !== 8
                                                    ? '2px solid rgba(255,255,255,0.25)'
                                                    : '1px solid rgba(255,255,255,0.06)',
                                                transition: 'background-color 0.15s ease',
                                            }}
                                        >
                                            <AnimatePresence mode="wait">
                                                {value !== 0 && (
                                                    <motion.div
                                                        key={value}
                                                        initial={{ scale: 0.4, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ duration: 0.15, ease: 'easeOut' }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontSize: { xs: '1rem', sm: '1.2rem' },
                                                                fontWeight: isGivenVal ? 800 : 600,
                                                                color: hasConflict
                                                                    ? theme.palette.error.main
                                                                    : isGivenVal
                                                                        ? 'text.primary'
                                                                        : primary,
                                                            }}
                                                        >
                                                            {value}
                                                        </Typography>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </Box>
                                    );
                                }))}
                            </Box>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(9, 1fr)',
                                    gap: 0.75,
                                    maxWidth: 400,
                                    mx: 'auto',
                                    mt: 2.5,
                                }}
                            >
                                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
                                    <Button
                                        key={num}
                                        variant="outlined"
                                        disabled={!selected || isWon || numberCounts[num] >= 9}
                                        onClick={() => placeNumber(num)}
                                        sx={{
                                            minWidth: 0,
                                            px: 0,
                                            py: 1,
                                            fontWeight: 700,
                                            borderColor: 'rgba(255,255,255,0.12)',
                                        }}
                                    >
                                        {num}
                                    </Button>
                                ))}
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                                <Button size="small" startIcon={<Backspace />} disabled={!selected || isWon} onClick={clearCell}>
                                    Erase
                                </Button>
                            </Box>

                            <AnimatePresence>
                                {isWon && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                                            <EmojiEvents sx={{ fontSize: 36, color: primary, mb: 0.5 }} />
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: primary }}>
                                                Solved in {formatTime(seconds)}!
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {isNewBest
                                                    ? `New best time for ${DIFFICULTY_LABELS[difficulty]}.`
                                                    : `Best for ${DIFFICULTY_LABELS[difficulty]}: ${formatTime(bestForDifficulty ?? seconds)}`}
                                            </Typography>
                                            <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2 }}>
                                                <Button variant="contained" onClick={() => startPuzzle(difficulty)}>
                                                    Play Again
                                                </Button>
                                                <Button variant="outlined" onClick={backToMenu}>
                                                    Change Difficulty
                                                </Button>
                                            </Stack>
                                        </Box>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                                Select a cell, then tap a number below to fill it in.
                            </Typography>
                        </>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default Sudoku;
