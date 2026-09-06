import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Button, Card, CardContent, Stack, Typography, ToggleButtonGroup, ToggleButton,
    Accordion, AccordionSummary, AccordionDetails, alpha,
} from '@mui/material';
import { ViewComfy, Refresh, ExpandMore } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import { useIsPlayModeDevice } from './shared/useFullscreenPlayMode';

const FAQ: { question: string; answer: string }[] = [
    {
        question: 'What do the numbers next to each row and column mean?',
        answer: 'Each number is the length of one consecutive run of filled cells in that row or column, listed in the order the runs appear. A clue of 3 1 means a run of three filled cells, then at least one empty cell, then a single filled cell, somewhere along that line.',
    },
    {
        question: 'Is every puzzle guaranteed to have only one solution?',
        answer: "It's guaranteed solvable, since its clues are derived directly from a real grid that satisfies them by definition. Uniqueness is a different guarantee: hand-designed nonograms are usually checked to have exactly one valid answer, and this generator skips that check, so a puzzle here could occasionally admit more than one grid that fits the same clues.",
    },
    {
        question: "What's the difference between flagging a cell and just leaving it alone?",
        answer: 'Nothing, as far as winning goes. Flagging marks a cell with an X so you remember you already ruled it out, but the win check only looks at which cells are filled. An untouched cell and a flagged cell score exactly the same.',
    },
];

type CellState = 'empty' | 'filled' | 'flagged';

const SIZE_OPTIONS: { size: number; label: string }[] = [
    { size: 5, label: 'Easy (5x5)' },
    { size: 10, label: 'Standard (10x10)' },
    { size: 15, label: 'Hard (15x15)' },
];

const BEST_KEY_PREFIX = 'sandbox_nonogram_best_';

const readBest = (n: number): number | null => {
    try {
        const raw = localStorage.getItem(`${BEST_KEY_PREFIX}${n}`);
        if (!raw) return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
};

const writeBest = (n: number, seconds: number) => {
    try {
        localStorage.setItem(`${BEST_KEY_PREFIX}${n}`, String(seconds));
    } catch {
        // localStorage unavailable - best time just won't persist
    }
};

function makeEmptyGrid(n: number): CellState[][] {
    return Array.from({ length: n }, () => Array.from({ length: n }, () => 'empty' as CellState));
}

function hasEmptyLine(grid: boolean[][], n: number): boolean {
    for (let r = 0; r < n; r++) {
        if (grid[r].every((cell) => !cell)) return true;
    }
    for (let c = 0; c < n; c++) {
        let allEmpty = true;
        for (let r = 0; r < n; r++) {
            if (grid[r][c]) { allEmpty = false; break; }
        }
        if (allEmpty) return true;
    }
    return false;
}

/** Fills each cell independently at a random probability (kept in the
 * 45-55% band), regenerating if a whole row or column comes out completely
 * empty - that produces a blank, uninteresting clue like [0] for that line.
 * A generated solution always satisfies the clues derived from it, which is
 * all a casual puzzle needs; nothing here checks for a *unique* solution. */
function generateSolution(n: number): boolean[][] {
    const fillProbability = 0.45 + Math.random() * 0.1;
    let grid: boolean[][];
    let attempts = 0;
    do {
        grid = Array.from({ length: n }, () => Array.from({ length: n }, () => Math.random() < fillProbability));
        attempts += 1;
    } while (hasEmptyLine(grid, n) && attempts < 200);
    return grid;
}

/** Run-length encodes one row/column of booleans into nonogram clue form,
 * e.g. [true,false,true,true,false,false,true] -> [1,2,1]. An all-empty line
 * is reported as [0] rather than an empty list, so its clue area is never
 * left blank in a way that could be mistaken for a missing clue. */
function lineClue(line: boolean[]): number[] {
    const clue: number[] = [];
    let run = 0;
    for (const cell of line) {
        if (cell) {
            run += 1;
        } else if (run > 0) {
            clue.push(run);
            run = 0;
        }
    }
    if (run > 0) clue.push(run);
    return clue.length > 0 ? clue : [0];
}

function gridMatchesSolution(grid: CellState[][], solution: boolean[][], n: number): boolean {
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if ((grid[r][c] === 'filled') !== solution[r][c]) return false;
        }
    }
    return true;
}

function formatElapsed(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const Nonogram: React.FC = () => {
    const isPlayMode = useIsPlayModeDevice();
    const [n, setN] = useState(10);
    const [solution, setSolution] = useState<boolean[][]>(() => generateSolution(10));
    const [playerGrid, setPlayerGrid] = useState<CellState[][]>(() => makeEmptyGrid(10));
    const [mode, setMode] = useState<'fill' | 'flag'>('fill');
    const [won, setWon] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [best, setBest] = useState<number | null>(() => readBest(10));

    const startTimeRef = useRef(Date.now());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const rowClues = useMemo(() => solution.map(lineClue), [solution]);
    const colClues = useMemo(
        () => Array.from({ length: n }, (_, c) => lineClue(solution.map((row) => row[c]))),
        [solution, n],
    );

    const stopTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const startTimer = useCallback(() => {
        stopTimer();
        startTimeRef.current = Date.now();
        setElapsed(0);
        intervalRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
    }, [stopTimer]);

    const newPuzzle = useCallback((size: number) => {
        setN(size);
        setSolution(generateSolution(size));
        setPlayerGrid(makeEmptyGrid(size));
        setWon(false);
        setBest(readBest(size));
        startTimer();
    }, [startTimer]);

    useEffect(() => {
        startTimer();
        return () => stopTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Win check runs whenever the player's grid changes - comparing the
    // filled cells (flags never count) against the solution grid.
    useEffect(() => {
        if (won) return;
        if (!gridMatchesSolution(playerGrid, solution, n)) return;

        setWon(true);
        stopTimer();
        const finalElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(finalElapsed);
        setBest((prevBest) => {
            if (prevBest === null || finalElapsed < prevBest) {
                writeBest(n, finalElapsed);
                return finalElapsed;
            }
            return prevBest;
        });
    }, [playerGrid, solution, n, won, stopTimer]);

    const applyToggle = useCallback((r: number, c: number, kind: 'fill' | 'flag') => {
        if (won) return;
        setPlayerGrid((prev) => {
            const current = prev[r][c];
            const next: CellState = kind === 'fill'
                ? (current === 'filled' ? 'empty' : 'filled')
                : (current === 'filled' ? current : (current === 'flagged' ? 'empty' : 'flagged'));
            if (next === current) return prev;
            const grid = prev.map((row) => row.slice());
            grid[r][c] = next;
            return grid;
        });
    }, [won]);

    const handleCellContextMenu = useCallback((e: React.MouseEvent, r: number, c: number) => {
        e.preventDefault();
        applyToggle(r, c, 'flag');
    }, [applyToggle]);

    const cellPx = n <= 6 ? 42 : n <= 10 ? 32 : 24;
    const maxRowClueLen = Math.max(...rowClues.map((c) => c.length));
    const maxColClueLen = Math.max(...colClues.map((c) => c.length));
    const clueColWidthPx = Math.max(48, maxRowClueLen * 18 + 12);
    const clueRowHeightPx = Math.max(40, maxColClueLen * 15 + 10);

    const thickBorder = '2px solid rgba(255,255,255,0.28)';
    const thinBorder = '1px solid rgba(255,255,255,0.08)';

    return (
        <>
            <Seo
                title="Nonogram (Picross) - Play Free Online Logic Puzzle"
                description="Solve nonogram picture logic puzzles online for free. Use row and column clues to work out which cells are filled, flag the ones you rule out, and race your best time. No sign-up required. Puzzles are generated fresh and always solvable, though not guaranteed to have a unique solution."
                keywords={['nonogram online', 'picross game', 'play nonogram free', 'logic puzzle game', 'picture cross puzzle', 'griddler online']}
            />
            <GamePlayShell
                icon={ViewComfy}
                title="Nonogram"
                subtitle="Use the row and column clues to work out which cells are filled. Match the hidden picture to win."
                onRestart={() => newPuzzle(n)}
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
                    <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                            <ToggleButtonGroup
                                size="small"
                                value={n}
                                exclusive
                                onChange={(_, v: number | null) => v && v !== n && newPuzzle(v)}
                            >
                                {SIZE_OPTIONS.map((opt) => (
                                    <ToggleButton key={opt.size} value={opt.size}>{opt.label}</ToggleButton>
                                ))}
                            </ToggleButtonGroup>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    Time: {formatElapsed(elapsed)}
                                </Typography>
                                {best !== null && (
                                    <Typography variant="caption" color="text.secondary">
                                        (best: {formatElapsed(best)})
                                    </Typography>
                                )}
                            </Stack>
                        </Stack>

                        <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
                            <ToggleButtonGroup
                                size="small"
                                value={mode}
                                exclusive
                                onChange={(_, v: 'fill' | 'flag' | null) => v && setMode(v)}
                            >
                                <ToggleButton value="fill">Fill</ToggleButton>
                                <ToggleButton value="flag">Flag</ToggleButton>
                            </ToggleButtonGroup>
                            <Button size="small" startIcon={<Refresh />} onClick={() => newPuzzle(n)}>
                                New Puzzle
                            </Button>
                        </Stack>

                        {won && (
                            <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ textAlign: 'center', mb: 2 }}>
                                Solved in {formatElapsed(elapsed)}!
                            </Typography>
                        )}

                        <Box sx={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                            <Box component="table" sx={{ borderCollapse: 'collapse' }}>
                                <Box component="tbody">
                                    <Box component="tr">
                                        <Box component="td" sx={{ width: clueColWidthPx, height: clueRowHeightPx }} />
                                        {Array.from({ length: n }, (_, c) => (
                                            <Box
                                                component="td"
                                                key={`colclue-${c}`}
                                                sx={{
                                                    width: cellPx, height: clueRowHeightPx, verticalAlign: 'bottom', textAlign: 'center',
                                                    borderLeft: c % 5 === 0 ? thickBorder : thinBorder,
                                                }}
                                            >
                                                <Stack alignItems="center" spacing={0} sx={{ pb: 0.5 }}>
                                                    {colClues[c].map((num, i) => (
                                                        <Typography key={i} variant="caption" sx={{ lineHeight: 1.15, fontWeight: 700, fontSize: 11 }}>
                                                            {num}
                                                        </Typography>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        ))}
                                    </Box>

                                    {Array.from({ length: n }, (_, r) => (
                                        <Box component="tr" key={`row-${r}`}>
                                            <Box
                                                component="td"
                                                sx={{
                                                    width: clueColWidthPx, textAlign: 'right', pr: 1,
                                                    borderTop: r % 5 === 0 ? thickBorder : thinBorder,
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>
                                                    {rowClues[r].join(' ')}
                                                </Typography>
                                            </Box>
                                            {Array.from({ length: n }, (_, c) => {
                                                const state = playerGrid[r][c];
                                                return (
                                                    <Box
                                                        component="td"
                                                        key={`cell-${r}-${c}`}
                                                        onClick={() => applyToggle(r, c, mode)}
                                                        onContextMenu={(e) => handleCellContextMenu(e, r, c)}
                                                        aria-label={`Row ${r + 1}, column ${c + 1}, ${state}`}
                                                        sx={{
                                                            width: cellPx, height: cellPx,
                                                            cursor: won ? 'default' : 'pointer',
                                                            bgcolor: state === 'filled' ? 'primary.main' : 'rgba(255,255,255,0.03)',
                                                            borderTop: r % 5 === 0 ? thickBorder : thinBorder,
                                                            borderLeft: c % 5 === 0 ? thickBorder : thinBorder,
                                                            position: 'relative',
                                                            userSelect: 'none',
                                                        }}
                                                    >
                                                        {state === 'flagged' && (
                                                            <Box sx={{
                                                                position: 'absolute', inset: 0, display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center',
                                                            }}>
                                                                <Typography sx={{ fontSize: Math.max(10, cellPx * 0.5), color: 'text.secondary', fontWeight: 900, lineHeight: 1 }}>
                                                                    ×
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {!isPlayMode && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                            Frequently asked questions
                        </Typography>
                        <Stack spacing={1}>
                            {FAQ.map((item, i) => (
                                <Accordion
                                    key={i}
                                    disableGutters
                                    sx={{
                                        bgcolor: alpha('#fff', 0.02),
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px !important',
                                        '&:before': { display: 'none' },
                                    }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="body2" fontWeight={700}>{item.question}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Typography variant="body2" color="text.secondary">{item.answer}</Typography>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Stack>
                    </Box>
                )}
            </GamePlayShell>
        </>
    );
};

export default Nonogram;
