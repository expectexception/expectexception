import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Search, Refresh } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

const GRID_SIZE = 12;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const WORD_BANK = [
    'JAVASCRIPT', 'PYTHON', 'BROWSER', 'KEYBOARD', 'NETWORK', 'DATABASE',
    'FUNCTION', 'VARIABLE', 'COMPUTER', 'INTERNET', 'SOFTWARE', 'HARDWARE',
    'ALGORITHM', 'COMPILER', 'DEBUGGER', 'FIREWALL', 'GATEWAY', 'PROTOCOL',
    'ENCRYPT', 'BACKEND', 'FRONTEND', 'MODULE', 'LIBRARY', 'FRAMEWORK',
    'SERVER', 'CLIENT', 'CACHE', 'THREAD', 'PROCESS', 'BINARY',
];

interface Placement {
    word: string;
    cells: { row: number; col: number }[];
}

const DIRECTIONS: { dr: number; dc: number }[] = [
    { dr: 0, dc: 1 }, { dr: 0, dc: -1 },
    { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
    { dr: 1, dc: 1 }, { dr: -1, dc: -1 },
    { dr: 1, dc: -1 }, { dr: -1, dc: 1 },
];

function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function buildPuzzle(wordCount: number): { grid: string[][]; placements: Placement[] } {
    const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    const words = shuffle(WORD_BANK).slice(0, wordCount).sort((a, b) => b.length - a.length);
    const placements: Placement[] = [];

    for (const word of words) {
        let placed = false;
        for (let attempt = 0; attempt < 200 && !placed; attempt++) {
            const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            const startRow = Math.floor(Math.random() * GRID_SIZE);
            const startCol = Math.floor(Math.random() * GRID_SIZE);
            const endRow = startRow + dir.dr * (word.length - 1);
            const endCol = startCol + dir.dc * (word.length - 1);
            if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) continue;

            const cells = Array.from({ length: word.length }, (_, i) => ({ row: startRow + dir.dr * i, col: startCol + dir.dc * i }));
            const fits = cells.every((c, i) => {
                const existing = grid[c.row][c.col];
                return existing === null || existing === word[i];
            });
            if (!fits) continue;

            cells.forEach((c, i) => { grid[c.row][c.col] = word[i]; });
            placements.push({ word, cells });
            placed = true;
        }
        // If a word can't be placed after 200 attempts (rare on a 12x12 grid
        // with <=12 words), it's simply skipped rather than retried forever.
    }

    const filledGrid: string[][] = grid.map(row => row.map(cell => cell ?? LETTERS[Math.floor(Math.random() * LETTERS.length)]));
    return { grid: filledGrid, placements };
}

interface Stats { puzzlesCompleted: number; bestTimeSeconds: number | null }
const STATS_KEY = 'sandbox_word_search_stats';
const DEFAULT_STATS: Stats = { puzzlesCompleted: 0, bestTimeSeconds: null };

const readStats = (): Stats => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return DEFAULT_STATS;
        const parsed = JSON.parse(raw);
        return {
            puzzlesCompleted: Number.isFinite(parsed.puzzlesCompleted) ? parsed.puzzlesCompleted : 0,
            bestTimeSeconds: Number.isFinite(parsed.bestTimeSeconds) ? parsed.bestTimeSeconds : null,
        };
    } catch {
        return DEFAULT_STATS;
    }
};
const writeStats = (s: Stats) => {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};

const cellKey = (row: number, col: number) => `${row}-${col}`;

const WordSearch: React.FC = () => {
    const theme = useTheme();
    const [puzzle, setPuzzle] = useState(() => buildPuzzle(10));
    const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
    const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
    const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ row: number; col: number } | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [stats, setStats] = useState<Stats>(readStats);
    const [recorded, setRecorded] = useState(false);
    const startTimeRef = useRef(Date.now());

    const allFound = foundWords.size === puzzle.placements.length && puzzle.placements.length > 0;

    const newGame = useCallback(() => {
        setPuzzle(buildPuzzle(10));
        setFoundWords(new Set());
        setFoundCells(new Set());
        setDragStart(null);
        setDragCurrent(null);
        setElapsedSeconds(0);
        setRecorded(false);
        startTimeRef.current = Date.now();
    }, []);

    useEffect(() => {
        if (allFound) return;
        const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
        return () => clearInterval(interval);
    }, [allFound]);

    useEffect(() => {
        if (!allFound || recorded) return;
        setRecorded(true);
        setStats(prev => {
            const next: Stats = {
                puzzlesCompleted: prev.puzzlesCompleted + 1,
                bestTimeSeconds: prev.bestTimeSeconds === null ? elapsedSeconds : Math.min(prev.bestTimeSeconds, elapsedSeconds),
            };
            writeStats(next);
            return next;
        });
    }, [allFound, recorded, elapsedSeconds]);

    // A drag selection is a straight line (horizontal, vertical, or diagonal)
    // from dragStart to dragCurrent, snapped to the nearest valid direction.
    const selectedCells = useMemo(() => {
        if (!dragStart || !dragCurrent) return [];
        const dr = dragCurrent.row - dragStart.row;
        const dc = dragCurrent.col - dragStart.col;
        const steps = Math.max(Math.abs(dr), Math.abs(dc));
        if (steps === 0) return [dragStart];
        const stepR = Math.sign(dr);
        const stepC = Math.sign(dc);
        // Only accept perfectly straight lines: horizontal, vertical, or exact diagonal.
        if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return [dragStart];
        const cells = [];
        for (let i = 0; i <= steps; i++) cells.push({ row: dragStart.row + stepR * i, col: dragStart.col + stepC * i });
        return cells;
    }, [dragStart, dragCurrent]);

    const selectedKeys = useMemo(() => new Set(selectedCells.map(c => cellKey(c.row, c.col))), [selectedCells]);

    const finishSelection = useCallback(() => {
        if (selectedCells.length < 2) {
            setDragStart(null);
            setDragCurrent(null);
            return;
        }
        const selectedStr = selectedCells.map(c => puzzle.grid[c.row][c.col]).join('');
        const reversedStr = selectedStr.split('').reverse().join('');

        const match = puzzle.placements.find(p => {
            if (foundWords.has(p.word)) return false;
            const placementKeys = new Set(p.cells.map(c => cellKey(c.row, c.col)));
            if (placementKeys.size !== selectedKeys.size) return false;
            const sameSet = Array.from(placementKeys).every(k => selectedKeys.has(k));
            return sameSet && (p.word === selectedStr || p.word === reversedStr);
        });

        if (match) {
            setFoundWords(prev => new Set(prev).add(match.word));
            setFoundCells(prev => {
                const next = new Set(prev);
                match.cells.forEach(c => next.add(cellKey(c.row, c.col)));
                return next;
            });
        }
        setDragStart(null);
        setDragCurrent(null);
    }, [selectedCells, selectedKeys, puzzle, foundWords]);

    const handlePointerDown = (row: number, col: number) => {
        if (allFound) return;
        setDragStart({ row, col });
        setDragCurrent({ row, col });
    };
    const handlePointerEnter = (row: number, col: number) => {
        if (dragStart) setDragCurrent({ row, col });
    };

    useEffect(() => {
        if (!dragStart) return;
        const handleUp = () => finishSelection();
        window.addEventListener('pointerup', handleUp);
        return () => window.removeEventListener('pointerup', handleUp);
    }, [dragStart, finishSelection]);

    const CELL = 28;
    const boardSize = GRID_SIZE * CELL;

    return (
        <>
            <Seo
                title="Word Search - Play Free Online Puzzle"
                description="Find hidden tech words in a 12x12 letter grid, hidden forward, backward, and diagonally. Drag to select, track your time, and beat your best. Play free, no sign-up."
                keywords={['word search game', 'word search online', 'play word search free', 'word find puzzle', 'hidden word puzzle online']}
            />
            <GamePlayShell
                icon={Search}
                title="Word Search"
                subtitle="Find every hidden word in the grid. Words run forward, backward, and diagonally in any direction."
                onRestart={newGame}
                maxWidth="md"
            >
                <Card sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 2, sm: 3 },
                }}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: { xs: 1, sm: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: boardSize + 220, mb: 2, flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                Solved {stats.puzzlesCompleted} · Best {stats.bestTimeSeconds !== null ? `${stats.bestTimeSeconds}s` : '-'}
                            </Typography>
                            <Chip
                                size="small"
                                label={`${foundWords.size} / ${puzzle.placements.length} found · ${elapsedSeconds}s`}
                                sx={{ bgcolor: alpha(theme.palette.text.primary, 0.08), fontWeight: 800 }}
                            />
                        </Box>

                        {allFound && (
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', textAlign: 'center' }}>
                                All words found in {elapsedSeconds}s!
                            </Typography>
                        )}

                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: boardSize,
                                    height: boardSize,
                                    userSelect: 'none',
                                    touchAction: 'none',
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL}px)`,
                                    gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL}px)`,
                                }}
                            >
                                {puzzle.grid.map((rowArr, row) =>
                                    rowArr.map((letter, col) => {
                                        const key = cellKey(row, col);
                                        const isFound = foundCells.has(key);
                                        const isSelected = selectedKeys.has(key);
                                        return (
                                            <Box
                                                key={key}
                                                onPointerDown={() => handlePointerDown(row, col)}
                                                onPointerEnter={() => handlePointerEnter(row, col)}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 700,
                                                    fontSize: '0.85rem',
                                                    cursor: allFound ? 'default' : 'pointer',
                                                    bgcolor: isFound
                                                        ? alpha(theme.palette.primary.main, 0.35)
                                                        : isSelected
                                                            ? alpha(theme.palette.primary.main, 0.6)
                                                            : 'rgba(255,255,255,0.03)',
                                                    color: isFound || isSelected ? '#fff' : 'text.primary',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    transition: 'background-color 0.1s ease',
                                                }}
                                            >
                                                {letter}
                                            </Box>
                                        );
                                    }),
                                )}
                            </Box>

                            <Box sx={{ minWidth: 180 }}>
                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Words to find</Typography>
                                <Stack spacing={0.5} sx={{ mt: 1 }}>
                                    {puzzle.placements.map(p => (
                                        <Chip
                                            key={p.word}
                                            size="small"
                                            label={p.word}
                                            sx={{
                                                fontFamily: 'monospace',
                                                fontWeight: 700,
                                                justifyContent: 'flex-start',
                                                textDecoration: foundWords.has(p.word) ? 'line-through' : 'none',
                                                opacity: foundWords.has(p.word) ? 0.5 : 1,
                                                bgcolor: foundWords.has(p.word) ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.text.primary, 0.06),
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        </Box>

                        <Button sx={{ mt: 3 }} variant={allFound ? 'contained' : 'outlined'} onClick={newGame} startIcon={<Refresh />}>
                            New Puzzle
                        </Button>
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default WordSearch;
