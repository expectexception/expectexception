import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, Card, CardContent,
    Chip, Stack, Typography,
} from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import {
    ChangeHistory, Circle, Diamond, ExpandMore, Favorite, RestartAlt, Square, Star,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import { useIsPlayModeDevice } from './shared/useFullscreenPlayMode';

const FAQ: { question: string; answer: string }[] = [
    {
        question: 'How do swaps and matches work?',
        answer: 'Tap one gem, then tap a gem directly next to it - up, down, left or right, never diagonal - to swap them. The swap only sticks if it lines up three or more of the same gem in a row or column somewhere on the board. If it does not, the two gems hop back to where they started and nothing is spent, so there is no penalty for trying a swap that does not pan out.',
    },
    {
        question: 'What actually counts as a match?',
        answer: 'Three or more of the same gem type in an unbroken straight line, horizontal or vertical. Bent shapes like an L or a T are scored as whatever straight runs they contain rather than as a single special case, which keeps the rule easy to read at a glance: if you can trace three or more in one direction without changing gem type, it clears.',
    },
    {
        question: 'How do chain combos score?',
        answer: 'Clearing a match drops the gems above it down to fill the gap and fills the top with new ones, and if that drop happens to line up another match on its own, it clears too - a chain reaction from a single swap. Each step of a chain scores more than the last: points are gems-cleared times 10 times the chain step, so a first clear of four gems is worth 40, and a second-step clear the drop triggers is worth double that per gem, and so on.',
    },
    {
        question: 'Why did the board suddenly change on its own?',
        answer: 'Every board is checked after it settles for at least one swap that would create a match. If a cascade happens to leave a board with no legal swap left at all, it reshuffles automatically rather than leaving you stuck - your score and moves remaining are untouched when that happens, only the gem layout changes.',
    },
    {
        question: 'Is the starting board always fair?',
        answer: 'Yes. Every new board is generated with no pre-existing three-in-a-row, and is checked to guarantee at least one legal swap exists before it is ever shown to you - a board that started unsolvable would just be generated again behind the scenes.',
    },
];

const GRID = 8;
const MOVE_BUDGET = 25;
const BEST_KEY = 'sandbox_gem_swap_best';

interface GemDef {
    Icon: SvgIconComponent;
    color: string;
}

const GEMS: GemDef[] = [
    { Icon: Diamond, color: '#ef5350' },
    { Icon: Star, color: '#ffca28' },
    { Icon: Favorite, color: '#ec407a' },
    { Icon: ChangeHistory, color: '#ab47bc' },
    { Icon: Square, color: '#42a5f5' },
    { Icon: Circle, color: '#66bb6a' },
];

type Board = number[][];
interface Cell { r: number; c: number }

const randomGemType = (): number => Math.floor(Math.random() * GEMS.length);

const cloneBoard = (board: Board): Board => board.map((row) => row.slice());

function wouldMatch(board: Board, r: number, c: number, type: number): boolean {
    if (c >= 2 && board[r][c - 1] === type && board[r][c - 2] === type) return true;
    if (r >= 2 && board[r - 1][c] === type && board[r - 2][c] === type) return true;
    return false;
}

function generateBoardNoMatches(): Board {
    const board: Board = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            let type = randomGemType();
            let attempts = 0;
            while (wouldMatch(board, r, c, type) && attempts < 50) {
                type = randomGemType();
                attempts++;
            }
            board[r][c] = type;
        }
    }
    return board;
}

/** Finds every cell that belongs to a run of 3+ identical gems in a row or
 * column. Runs are found by scanning each row/column once and closing out
 * whenever the value changes (or the edge is reached), which is O(n^2) and
 * never misses a run regardless of how many distinct runs sit in one line. */
function findMatches(board: Board): Set<string> {
    const matched = new Set<string>();

    for (let r = 0; r < GRID; r++) {
        let runStart = 0;
        for (let c = 1; c <= GRID; c++) {
            const continues = c < GRID && board[r][c] === board[r][runStart];
            if (continues) continue;
            if (c - runStart >= 3) {
                for (let k = runStart; k < c; k++) matched.add(`${r}-${k}`);
            }
            runStart = c;
        }
    }

    for (let c = 0; c < GRID; c++) {
        let runStart = 0;
        for (let r = 1; r <= GRID; r++) {
            const continues = r < GRID && board[r][c] === board[runStart][c];
            if (continues) continue;
            if (r - runStart >= 3) {
                for (let k = runStart; k < r; k++) matched.add(`${k}-${c}`);
            }
            runStart = r;
        }
    }

    return matched;
}

function hasAnyLegalMove(board: Board): boolean {
    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            if (c + 1 < GRID) {
                const swapped = cloneBoard(board);
                const tmp = swapped[r][c];
                swapped[r][c] = swapped[r][c + 1];
                swapped[r][c + 1] = tmp;
                if (findMatches(swapped).size > 0) return true;
            }
            if (r + 1 < GRID) {
                const swapped = cloneBoard(board);
                const tmp = swapped[r][c];
                swapped[r][c] = swapped[r + 1][c];
                swapped[r + 1][c] = tmp;
                if (findMatches(swapped).size > 0) return true;
            }
        }
    }
    return false;
}

function generateBoard(): Board {
    let board = generateBoardNoMatches();
    let tries = 0;
    while (!hasAnyLegalMove(board) && tries < 50) {
        board = generateBoardNoMatches();
        tries++;
    }
    return board;
}

/** Repeatedly clears matches, drops surviving gems down, and fills the top
 * with fresh ones, until nothing matches any more. Each pass scores higher
 * than the last (cleared * 10 * pass number) to reward chain reactions. */
function resolveCascades(board: Board): { board: Board; scoreGained: number; combo: number } {
    const current = cloneBoard(board);
    let combo = 0;
    let scoreGained = 0;

    while (true) {
        const matches = findMatches(current);
        if (matches.size === 0) break;
        combo += 1;
        scoreGained += matches.size * 10 * combo;

        matches.forEach((key) => {
            const [r, c] = key.split('-').map(Number);
            current[r][c] = -1;
        });

        for (let c = 0; c < GRID; c++) {
            const survivors: number[] = [];
            for (let r = 0; r < GRID; r++) {
                if (current[r][c] !== -1) survivors.push(current[r][c]);
            }
            const missing = GRID - survivors.length;
            const refilled = Array.from({ length: missing }, () => randomGemType()).concat(survivors);
            for (let r = 0; r < GRID; r++) current[r][c] = refilled[r];
        }
    }

    return { board: current, scoreGained, combo };
}

const isAdjacent = (a: Cell, b: Cell): boolean => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

const readBest = (): number | null => {
    try {
        const raw = localStorage.getItem(BEST_KEY);
        if (!raw) return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
};

const writeBest = (score: number) => {
    try {
        localStorage.setItem(BEST_KEY, String(score));
    } catch {
        // localStorage unavailable - the record just stays in memory for this session.
    }
};

const GemSwap: React.FC = () => {
    const isPlayMode = useIsPlayModeDevice();
    const [board, setBoard] = useState<Board>(() => generateBoard());
    const [selected, setSelected] = useState<Cell | null>(null);
    const [invalidPair, setInvalidPair] = useState<[Cell, Cell] | null>(null);
    const [score, setScore] = useState(0);
    const [movesLeft, setMovesLeft] = useState(MOVE_BUDGET);
    const [gameOver, setGameOver] = useState(false);
    const [best, setBest] = useState<number | null>(() => readBest());
    const [message, setMessage] = useState<string | null>(null);

    const showMessage = useCallback((text: string) => {
        setMessage(text);
        window.setTimeout(() => setMessage((prev) => (prev === text ? null : prev)), 2200);
    }, []);

    const restart = useCallback(() => {
        setBoard(generateBoard());
        setSelected(null);
        setInvalidPair(null);
        setScore(0);
        setMovesLeft(MOVE_BUDGET);
        setGameOver(false);
        setBest(readBest());
        setMessage(null);
    }, []);

    const attemptSwap = useCallback((a: Cell, b: Cell) => {
        setBoard((prevBoard) => {
            const swapped = cloneBoard(prevBoard);
            const tmp = swapped[a.r][a.c];
            swapped[a.r][a.c] = swapped[b.r][b.c];
            swapped[b.r][b.c] = tmp;

            if (findMatches(swapped).size === 0) {
                setInvalidPair([a, b]);
                window.setTimeout(() => setInvalidPair(null), 300);
                return prevBoard;
            }

            const { board: settled, scoreGained, combo } = resolveCascades(swapped);
            let finalBoard = settled;
            if (!hasAnyLegalMove(finalBoard)) {
                finalBoard = generateBoard();
                showMessage('No more moves - board reshuffled!');
            } else if (combo > 1) {
                showMessage(`Combo x${combo}!`);
            }

            setScore((s) => s + scoreGained);
            setMovesLeft((m) => m - 1);
            return finalBoard;
        });
        setSelected(null);
    }, [showMessage]);

    const onCellClick = useCallback((r: number, c: number) => {
        if (gameOver) return;
        setSelected((prev) => {
            if (!prev) return { r, c };
            if (prev.r === r && prev.c === c) return null;
            if (isAdjacent(prev, { r, c })) {
                attemptSwap(prev, { r, c });
                return null;
            }
            return { r, c };
        });
    }, [gameOver, attemptSwap]);

    useEffect(() => {
        if (movesLeft > 0 || gameOver) return;
        setGameOver(true);
        setBest((prev) => {
            if (prev === null || score > prev) {
                writeBest(score);
                return score;
            }
            return prev;
        });
    }, [movesLeft, gameOver, score]);

    const cellPx = isPlayMode ? 38 : 44;
    const boardPx = GRID * cellPx;

    const isInvalidCell = useMemo(() => {
        if (!invalidPair) return () => false;
        const [a, b] = invalidPair;
        return (r: number, c: number) => (a.r === r && a.c === c) || (b.r === r && b.c === c);
    }, [invalidPair]);

    return (
        <>
            <Seo
                gameId={49}
                title="Gem Swap - Play a Free Match-3 Puzzle Game"
                description="Play Gem Swap online for free, a match-3 puzzle game. Swap adjacent gems to line up three or more, chain combos for bonus score, and clear as much as you can before your moves run out. Every board is guaranteed to start with a legal move."
                keywords={['match 3 puzzle game', 'gem matching game online', 'free match three game', 'swap gems puzzle', 'tile matching puzzle browser']}
            />
            <GamePlayShell
                icon={Diamond}
                title="Gem Swap"
                subtitle="Swap adjacent gems to line up three or more. Chains score bigger the longer they run."
                onRestart={restart}
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
                        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                            <Chip size="small" label={`Score: ${score}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip size="small" label={`Moves left: ${Math.max(movesLeft, 0)}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip
                                size="small"
                                label={best === null ? 'Best: none yet' : `Best: ${best}`}
                                sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
                            />
                        </Stack>

                        {message && (
                            <Typography variant="body2" fontWeight={800} color="success.main" sx={{ textAlign: 'center', mb: 1.5 }}>
                                {message}
                            </Typography>
                        )}

                        {gameOver && (
                            <Stack spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ textAlign: 'center' }}>
                                    Out of moves - final score {score}!
                                </Typography>
                                <Button size="small" variant="contained" startIcon={<RestartAlt />} onClick={restart}>
                                    Play again
                                </Button>
                            </Stack>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Box
                                sx={{
                                    width: boardPx,
                                    height: boardPx,
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${GRID}, ${cellPx}px)`,
                                    gridTemplateRows: `repeat(${GRID}, ${cellPx}px)`,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    bgcolor: 'rgba(0,0,0,0.35)',
                                }}
                            >
                                {board.map((row, r) => row.map((type, c) => {
                                    const gem = GEMS[type];
                                    const isSelected = selected?.r === r && selected?.c === c;
                                    const isInvalid = isInvalidCell(r, c);
                                    return (
                                        <Box
                                            key={`${r}-${c}`}
                                            onClick={() => onCellClick(r, c)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: gameOver ? 'default' : 'pointer',
                                                borderRight: '1px solid rgba(255,255,255,0.04)',
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            }}
                                        >
                                            <motion.div
                                                key={`${r}-${c}-${type}`}
                                                initial={{ scale: 0.4, opacity: 0 }}
                                                animate={{
                                                    scale: isInvalid ? [1, 0.85, 1] : 1,
                                                    opacity: 1,
                                                }}
                                                transition={{ duration: isInvalid ? 0.3 : 0.18 }}
                                                style={{
                                                    width: '76%',
                                                    height: '76%',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: alpha(gem.color, 0.22),
                                                    border: `2px solid ${isSelected ? '#fff' : alpha(gem.color, 0.75)}`,
                                                    boxShadow: isSelected ? `0 0 12px ${alpha(gem.color, 0.7)}` : 'none',
                                                }}
                                            >
                                                <gem.Icon sx={{ color: gem.color, fontSize: cellPx * 0.5 }} />
                                            </motion.div>
                                        </Box>
                                    );
                                }))}
                            </Box>
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                            Tap a gem, then tap a neighbour to swap.
                        </Typography>
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

export default GemSwap;
