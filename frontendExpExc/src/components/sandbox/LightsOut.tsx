import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, ButtonBase, Card,
    CardContent, Chip, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { ExpandMore, Lightbulb, Refresh, RestartAlt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import { useIsPlayModeDevice } from './shared/useFullscreenPlayMode';

const FAQ: { question: string; answer: string }[] = [
    {
        question: 'What exactly does a click do?',
        answer: 'Clicking a cell flips that cell plus the four cells directly above, below, left and right of it. Lights that were on go off, and lights that were off come on. Diagonal neighbours are never touched, and a cell on an edge or in a corner simply has fewer neighbours to flip.',
    },
    {
        question: 'Is every puzzle here guaranteed to be solvable?',
        answer: 'Yes. Each board starts fully switched off, and the generator scrambles it by pressing a random selection of cells. Whatever a run of presses can do, the same presses can undo, because pressing a cell twice puts the board back exactly where it was. Solvability comes free from that. Dealing out a random pattern of lights instead would be a bad bet: on the classic 5x5 board only one arrangement in four can be cleared at all, so most random patterns would strand you with no legal way to finish.',
    },
    {
        question: 'Does the order I click in matter?',
        answer: 'It makes no difference at all, and that is the most useful thing to know about this game. Every press flips a fixed group of cells, and flipping twice cancels out, so the final board depends only on which cells you pressed an odd number of times. A solution is really a set of cells rather than a sequence, and you can click that set in whatever order you like. The same reasoning explains why clicking one cell twice burns two moves and changes nothing.',
    },
    {
        question: 'What is the difference between New Puzzle and Reset?',
        answer: 'New Puzzle scrambles a fresh board from scratch. Reset puts the current board back to the arrangement you were given at the start and zeroes your move count, so you can attack the same puzzle again after a messy first attempt.',
    },
];

type Board = boolean[][];

interface BestRecord {
    /** Fewest moves used on a completed board of this size, null until a first win. */
    moves: number | null;
    /** Fastest completion in whole seconds, tracked independently of the move record. */
    seconds: number | null;
}

const SIZE_OPTIONS: { size: number; label: string }[] = [
    { size: 3, label: 'Small (3x3)' },
    { size: 5, label: 'Classic (5x5)' },
    { size: 7, label: 'Large (7x7)' },
];

const DEFAULT_SIZE = 5;
const BEST_KEY_PREFIX = 'sandbox_lights_out_best_';
const EMPTY_BEST: BestRecord = { moves: null, seconds: null };

const readBest = (n: number): BestRecord => {
    try {
        const raw = localStorage.getItem(`${BEST_KEY_PREFIX}${n}`);
        if (!raw) return EMPTY_BEST;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return EMPTY_BEST;
        const record = parsed as { moves?: unknown; seconds?: unknown };
        return {
            moves: typeof record.moves === 'number' && Number.isFinite(record.moves) ? record.moves : null,
            seconds: typeof record.seconds === 'number' && Number.isFinite(record.seconds) ? record.seconds : null,
        };
    } catch {
        return EMPTY_BEST;
    }
};

const writeBest = (n: number, record: BestRecord) => {
    try {
        localStorage.setItem(`${BEST_KEY_PREFIX}${n}`, JSON.stringify(record));
    } catch {
        // localStorage unavailable (private mode, blocked storage) - records
        // just stay in memory for this session.
    }
};

const makeAllOff = (n: number): Board => Array.from({ length: n }, () => Array.from({ length: n }, () => false));

const cloneBoard = (board: Board): Board => board.map((row) => row.slice());

/** The one and only legal move: flip (r, c) plus its four orthogonal
 * neighbours, skipping anything that falls off the edge. Mutates `board`,
 * which is safe because every caller owns a fresh copy. */
function pressInPlace(board: Board, r: number, c: number): void {
    const n = board.length;
    const targets: [number, number][] = [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (let i = 0; i < targets.length; i++) {
        const [rr, cc] = targets[i];
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) board[rr][cc] = !board[rr][cc];
    }
}

const isAllOff = (board: Board): boolean => board.every((row) => row.every((cell) => !cell));

const countOn = (board: Board): number => board.reduce(
    (total, row) => total + row.reduce((rowTotal, cell) => rowTotal + (cell ? 1 : 0), 0),
    0,
);

/**
 * Scrambles a board by starting from the solved state (all lights off) and
 * pressing a random subset of cells. Every position produced this way is
 * solvable by construction: a press is its own inverse, so replaying the same
 * subset in any order switches everything back off again. Generating a random
 * bit pattern would be wrong - the reachable configurations are a strict
 * subset of all configurations, and on a 5x5 board only a quarter of the
 * 2^25 patterns can be cleared.
 *
 * The subset is drawn from *distinct* cells because pressing the same cell
 * twice cancels out, so duplicates would silently reduce the scramble depth.
 */
function generateBoard(n: number): Board {
    const total = n * n;
    const minPresses = Math.max(2, Math.round(total * 0.35));
    const maxPresses = Math.max(minPresses + 1, Math.round(total * 0.7));

    for (let attempt = 0; attempt < 32; attempt++) {
        const cells: number[] = Array.from({ length: total }, (_, i) => i);
        for (let i = total - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const swap = cells[i];
            cells[i] = cells[j];
            cells[j] = swap;
        }
        const pressCount = minPresses + Math.floor(Math.random() * (maxPresses - minPresses + 1));
        const board = makeAllOff(n);
        for (let i = 0; i < pressCount; i++) {
            pressInPlace(board, Math.floor(cells[i] / n), cells[i] % n);
        }
        // A subset can cancel itself out and hand back the solved board, which
        // would be a puzzle with nothing to do. Draw again when that happens.
        if (!isAllOff(board)) return board;
    }

    // Fallback that cannot fail: one press on an all-off board always lights
    // at least three cells.
    const board = makeAllOff(n);
    pressInPlace(board, 0, 0);
    return board;
}

function formatElapsed(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const LightsOut: React.FC = () => {
    const isPlayMode = useIsPlayModeDevice();
    const [size, setSize] = useState(DEFAULT_SIZE);
    const [startBoard, setStartBoard] = useState<Board>(() => generateBoard(DEFAULT_SIZE));
    const [board, setBoard] = useState<Board>(() => cloneBoard(startBoard));
    const [moves, setMoves] = useState(0);
    const [won, setWon] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [best, setBest] = useState<BestRecord>(() => readBest(DEFAULT_SIZE));

    const startTimeRef = useRef(Date.now());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const litCount = useMemo(() => countOn(board), [board]);

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

    useEffect(() => {
        startTimer();
        return () => stopTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const newPuzzle = useCallback((n: number) => {
        const scrambled = generateBoard(n);
        setSize(n);
        setStartBoard(scrambled);
        setBoard(cloneBoard(scrambled));
        setMoves(0);
        setWon(false);
        setBest(readBest(n));
        startTimer();
    }, [startTimer]);

    const resetToStart = useCallback(() => {
        setBoard(cloneBoard(startBoard));
        setMoves(0);
        setWon(false);
        startTimer();
    }, [startBoard, startTimer]);

    const handlePress = useCallback((r: number, c: number) => {
        if (won) return;
        setBoard((prev) => {
            const next = cloneBoard(prev);
            pressInPlace(next, r, c);
            return next;
        });
        setMoves((prev) => prev + 1);
    }, [won]);

    // Win check: the board is solved the moment every light is off. The
    // scrambler never hands out an already-solved board, so no move guard is
    // needed here beyond the `won` latch.
    useEffect(() => {
        if (won || !isAllOff(board)) return;

        setWon(true);
        stopTimer();
        const finalElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(finalElapsed);
        setBest((prev) => {
            const bestMoves = prev.moves === null || moves < prev.moves ? moves : prev.moves;
            const bestSeconds = prev.seconds === null || finalElapsed < prev.seconds ? finalElapsed : prev.seconds;
            if (bestMoves === prev.moves && bestSeconds === prev.seconds) return prev;
            const record: BestRecord = { moves: bestMoves, seconds: bestSeconds };
            writeBest(size, record);
            return record;
        });
    }, [board, moves, size, won, stopTimer]);

    const boardPx = size === 3 ? 300 : size === 5 ? 380 : 420;

    return (
        <>
            <Seo
                gameId={44}
                title="Lights Out - Play the Classic Light Switching Puzzle Free"
                description="Play Lights Out online for free. Click a cell to flip it and its four neighbours, and switch the whole grid off. Choose 3x3, 5x5 or 7x7, track your move count and best time, and retry the same board as often as you like. Every puzzle is scrambled from a solved board, so all of them can be finished."
                keywords={['lights out game', 'lights out puzzle online', 'play lights out free', 'light switching puzzle', 'grid logic puzzle', 'turn off all the lights game']}
            />
            <GamePlayShell
                icon={Lightbulb}
                title="Lights Out"
                subtitle="Clicking a cell flips it along with the four cells beside it. Switch every light off to solve the board."
                onRestart={resetToStart}
                maxWidth="sm"
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
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ sm: 'center' }}
                            sx={{ mb: 2 }}
                        >
                            <ToggleButtonGroup
                                size="small"
                                value={size}
                                exclusive
                                onChange={(_, value: number | null) => value && value !== size && newPuzzle(value)}
                            >
                                {SIZE_OPTIONS.map((opt) => (
                                    <ToggleButton key={opt.size} value={opt.size}>{opt.label}</ToggleButton>
                                ))}
                            </ToggleButtonGroup>

                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Chip size="small" label={`Moves: ${moves}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                                <Chip size="small" label={`Time: ${formatElapsed(elapsed)}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                                <Chip size="small" label={`Lit: ${litCount}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            </Stack>
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1.5 }}>
                            {best.moves === null
                                ? `No ${size}x${size} record yet. Clear a board to set one.`
                                : `Best on ${size}x${size}: ${best.moves} moves, ${formatElapsed(best.seconds ?? 0)}`}
                        </Typography>

                        {won && (
                            <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ textAlign: 'center', mb: 2 }}>
                                All lights out in {moves} moves and {formatElapsed(elapsed)}!
                            </Typography>
                        )}

                        <Box
                            sx={{
                                width: '100%',
                                maxWidth: boardPx,
                                mx: 'auto',
                                mb: 2,
                                display: 'grid',
                                gridTemplateColumns: `repeat(${size}, 1fr)`,
                                gap: { xs: 0.75, sm: 1 },
                                aspectRatio: '1',
                                p: 1,
                                borderRadius: '14px',
                                bgcolor: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            {board.map((row, r) => row.map((lit, c) => (
                                <ButtonBase
                                    key={`cell-${r}-${c}`}
                                    onClick={() => handlePress(r, c)}
                                    disabled={won}
                                    aria-label={`Row ${r + 1}, column ${c + 1}, light ${lit ? 'on' : 'off'}`}
                                    sx={{
                                        aspectRatio: '1',
                                        borderRadius: '10px',
                                        border: '1px solid',
                                        borderColor: lit ? alpha('#ffd54f', 0.7) : 'rgba(255,255,255,0.08)',
                                        bgcolor: lit ? alpha('#ffc107', 0.85) : 'rgba(255,255,255,0.04)',
                                        boxShadow: lit ? `0 0 18px ${alpha('#ffc107', 0.55)}` : 'none',
                                        transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
                                        '&:hover': won ? undefined : { transform: 'scale(0.96)' },
                                        '&.Mui-disabled': {
                                            borderColor: lit ? alpha('#ffd54f', 0.7) : 'rgba(255,255,255,0.08)',
                                        },
                                    }}
                                />
                            )))}
                        </Box>

                        <Stack direction="row" spacing={1.5} justifyContent="center">
                            <Button size="small" variant="outlined" startIcon={<Refresh />} onClick={() => newPuzzle(size)}>
                                New Puzzle
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<RestartAlt />} onClick={resetToStart}>
                                Reset
                            </Button>
                        </Stack>
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

export default LightsOut;
