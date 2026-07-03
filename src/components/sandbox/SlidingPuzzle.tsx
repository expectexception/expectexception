import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Typography, Button, Stack, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Extension, Refresh } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const SIZE = 4; // 4x4 grid
const TILE_COUNT = SIZE * SIZE; // 16 cells, values 1..15 + blank (0)
const BLANK = 0;
const SHUFFLE_MOVES = 150;
const STORAGE_KEY = 'sandbox.slidingPuzzle.best';

interface BestRecord {
    moves: number;
    timeMs: number;
}

const SOLVED: number[] = Array.from({ length: TILE_COUNT }, (_, i) => (i === TILE_COUNT - 1 ? BLANK : i + 1));

const isSolved = (board: number[]): boolean => board.every((v, i) => v === SOLVED[i]);

const indexToRowCol = (index: number): [number, number] => [Math.floor(index / SIZE), index % SIZE];

const getAdjacentIndices = (index: number): number[] => {
    const [row, col] = indexToRowCol(index);
    const neighbors: number[] = [];
    if (row > 0) neighbors.push(index - SIZE);
    if (row < SIZE - 1) neighbors.push(index + SIZE);
    if (col > 0) neighbors.push(index - 1);
    if (col < SIZE - 1) neighbors.push(index + 1);
    return neighbors;
};

/**
 * Generate a shuffled board by performing a long sequence of random *valid* slides
 * starting from the solved state. Because every move is a legal slide (swap blank
 * with a random adjacent tile, avoiding immediately undoing the previous move so we
 * don't waste moves oscillating), the resulting board is guaranteed to be solvable -
 * unlike a pure Fisher-Yates shuffle of all 16 values, which produces an unsolvable
 * permutation half the time (15-puzzle solvability is tied to permutation parity).
 */
const generateShuffledBoard = (): number[] => {
    const board = [...SOLVED];
    let blankIndex = board.indexOf(BLANK);
    let lastBlankIndex = -1;

    for (let i = 0; i < SHUFFLE_MOVES; i++) {
        const neighbors = getAdjacentIndices(blankIndex).filter((n) => n !== lastBlankIndex);
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        board[blankIndex] = board[next];
        board[next] = BLANK;
        lastBlankIndex = blankIndex;
        blankIndex = next;
    }

    // Guard against the astronomically unlikely case the shuffle landed back on solved.
    if (isSolved(board)) {
        const neighbors = getAdjacentIndices(blankIndex);
        const next = neighbors[0];
        board[blankIndex] = board[next];
        board[next] = BLANK;
    }

    return board;
};

const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const ss = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
};

const getStoredBest = (): BestRecord | null => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.moves === 'number' && typeof parsed.timeMs === 'number') return parsed;
        return null;
    } catch {
        return null;
    }
};

const SlidingPuzzle: React.FC = () => {
    const theme = useTheme();
    const [board, setBoard] = useState<number[]>(() => generateShuffledBoard());
    const [moves, setMoves] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [solved, setSolved] = useState(false);
    const [best, setBest] = useState<BestRecord | null>(() => getStoredBest());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const blankIndex = useMemo(() => board.indexOf(BLANK), [board]);

    useEffect(() => {
        if (startTime !== null && !solved) {
            intervalRef.current = setInterval(() => {
                setElapsedMs(Date.now() - startTime);
            }, 1000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [startTime, solved]);

    const newGame = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setBoard(generateShuffledBoard());
        setMoves(0);
        setStartTime(null);
        setElapsedMs(0);
        setSolved(false);
    }, []);

    const handleTileClick = useCallback((index: number) => {
        if (solved) return;
        const neighbors = getAdjacentIndices(blankIndex);
        if (!neighbors.includes(index)) return;

        const nextBoard = [...board];
        nextBoard[blankIndex] = nextBoard[index];
        nextBoard[index] = BLANK;
        setBoard(nextBoard);

        const nextMoves = moves + 1;
        setMoves(nextMoves);

        const effectiveStart = startTime ?? Date.now();
        if (startTime === null) setStartTime(effectiveStart);

        if (isSolved(nextBoard)) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            const finalElapsed = Date.now() - effectiveStart;
            setElapsedMs(finalElapsed);
            setSolved(true);

            if (!best || nextMoves < best.moves || (nextMoves === best.moves && finalElapsed < best.timeMs)) {
                const record: BestRecord = { moves: nextMoves, timeMs: finalElapsed };
                setBest(record);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
            }
        }
    }, [blankIndex, board, moves, startTime, best]);

    const movableSet = useMemo(() => new Set(getAdjacentIndices(blankIndex)), [blankIndex]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo title="Sliding Puzzle - Free Online 15-Puzzle Brain Game" />
            <ServicePageHero
                icon={Extension}
                title="Sliding Puzzle"
                subtitle="Slide the numbered tiles into order, 1 through 15, by moving pieces into the empty space. A classic brain teaser, right in your browser."
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
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }} flexWrap="wrap" gap={1}>
                        <Chip size="small" label={`Moves: ${moves}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                        <Chip size="small" label={`Time: ${formatTime(elapsedMs)}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                        <Typography variant="body2" color="text.secondary">
                            Best: {best ? `${best.moves} moves / ${formatTime(best.timeMs)}` : '—'}
                        </Typography>
                    </Stack>

                    {solved && (
                        <Typography sx={{ color: 'primary.main', fontWeight: 700, mb: 2, textAlign: 'center' }}>
                            Solved in {moves} moves and {formatTime(elapsedMs)}!
                        </Typography>
                    )}

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
                            gap: 1,
                            mb: 3,
                            aspectRatio: '1',
                            p: 1,
                            borderRadius: '12px',
                            bgcolor: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        {board.map((value, index) => {
                            if (value === BLANK) {
                                return <Box key={`blank-${index}`} />;
                            }
                            const movable = movableSet.has(index) && !solved;
                            return (
                                <Box
                                    key={value}
                                    onClick={() => handleTileClick(index)}
                                    sx={{
                                        aspectRatio: '1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '1.3rem',
                                        cursor: movable ? 'pointer' : 'default',
                                        userSelect: 'none',
                                        bgcolor: movable ? 'primary.main' : 'rgba(255,255,255,0.06)',
                                        color: movable ? theme.palette.getContrastText(theme.palette.primary.main) : 'text.primary',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        transition: 'background-color 0.15s ease, transform 0.1s ease',
                                        '&:hover': movable ? { transform: 'scale(0.96)' } : undefined,
                                    }}
                                >
                                    {value}
                                </Box>
                            );
                        })}
                    </Box>

                    <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={newGame}>
                        New Game
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default SlidingPuzzle;
