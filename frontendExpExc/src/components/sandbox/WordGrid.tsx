import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, Card, CardContent,
    Chip, Stack, Typography, useTheme,
} from '@mui/material';
import { Abc, Backspace, ExpandMore, RestartAlt, SendRounded } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import { useIsPlayModeDevice } from './shared/useFullscreenPlayMode';
import { WORD_SET } from './wordGridWords';

const FAQ: { question: string; answer: string }[] = [
    {
        question: 'How do I trace a word?',
        answer: 'Press and drag through a chain of letters that touch each other, including diagonally, to spell a word - then release to submit it. You can also build a word by tapping letters one at a time and pressing Submit when you are done. Either way, the same cell can only be used once in a single word, and every step has to land on a letter touching the one before it.',
    },
    {
        question: 'How is a round scored?',
        answer: 'Longer words score more, and the jump is steep on purpose: 3-4 letters is worth 1 point, 5 letters is 2, 6 letters is 3, 7 letters is 5, and 8 or more letters is worth 11. Hunting for one long word is often worth more than a handful of short ones.',
    },
    {
        question: 'Why was a real word rejected?',
        answer: 'Two reasons cover almost every case. Either the letters were not actually adjacent on the board in the order you traced them, or the word simply is not in the roughly 3,000-word list this game checks against. That list is a curated set of common English words, not a full dictionary, so genuine but less common words can occasionally get turned away.',
    },
    {
        question: 'Can I find the same word twice?',
        answer: 'No - once a word has scored in a round, tracing it again does nothing. Each board rewards finding as many distinct words as you can before the timer runs out, not repeating your best one.',
    },
    {
        question: 'Any tips for finding more words?',
        answer: 'Scan for common letter pairs first - ER, ING, RE, TH, ST tend to sit near real words waiting to be extended in either direction. Long snaking paths that double back through the middle of the grid usually beat short straight lines, since diagonal moves let you reach far more letters without leaving a small corner of the board.',
    },
];

const GRID = 4;
const ROUND_SECONDS = 90;
const BEST_KEY = 'sandbox_word_grid_best';

// Rough English letter frequency, repeated proportionally so common letters
// (vowels, common consonants) come up far more often than rare ones like Q
// or Z - closer to what a real Boggle-style letter distribution feels like
// than picking uniformly among all 26 letters.
const LETTER_POOL =
    'EEEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOOIIIIIIINNNNNNNSSSSSSHHHHHHRRRRRRDDDDLLLL' +
    'CCCUUUMMWWFFGGYYPPBBVKJXQZ';

const randomLetter = (): string => LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];

type Grid = string[][];
interface Cell { r: number; c: number }

const isTouching = (a: Cell, b: Cell): boolean => Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1 && !(a.r === b.r && a.c === b.c);

/** Bounded-depth search for at least one findable word, so a freshly dealt
 * board is (almost) never a dud. Depth is capped at 5 letters - short words
 * are common enough that this is fast and still meaningfully filters out
 * hopeless boards, without the cost of exploring the full 8-way tree. */
function hasFindableWord(grid: Grid): boolean {
    const visited: boolean[][] = Array.from({ length: GRID }, () => Array(GRID).fill(false));
    let found = false;

    function dfs(r: number, c: number, word: string, depth: number) {
        if (found || depth > 5) return;
        const next = word + grid[r][c].toLowerCase();
        if (next.length >= 3 && WORD_SET.has(next)) {
            found = true;
            return;
        }
        visited[r][c] = true;
        for (let dr = -1; dr <= 1 && !found; dr++) {
            for (let dc = -1; dc <= 1 && !found; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID || visited[nr][nc]) continue;
                dfs(nr, nc, next, depth + 1);
            }
        }
        visited[r][c] = false;
    }

    for (let r = 0; r < GRID && !found; r++) {
        for (let c = 0; c < GRID && !found; c++) {
            dfs(r, c, '', 0);
        }
    }
    return found;
}

function generateGrid(): Grid {
    let grid: Grid = [];
    for (let attempt = 0; attempt < 20; attempt++) {
        grid = Array.from({ length: GRID }, () => Array.from({ length: GRID }, randomLetter));
        if (hasFindableWord(grid)) return grid;
    }
    return grid;
}

function scoreForLength(len: number): number {
    if (len <= 4) return 1;
    if (len === 5) return 2;
    if (len === 6) return 3;
    if (len === 7) return 5;
    return 11;
}

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

interface LastResult { word: string; points: number; status: 'accepted' | 'duplicate' | 'rejected' }

const WordGrid: React.FC = () => {
    const theme = useTheme();
    const isPlayMode = useIsPlayModeDevice();
    const [grid, setGrid] = useState<Grid>(() => generateGrid());
    const [path, setPath] = useState<Cell[]>([]);
    const [found, setFound] = useState<Set<string>>(new Set());
    const [score, setScore] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
    const [roundActive, setRoundActive] = useState(true);
    const [best, setBest] = useState<number | null>(() => readBest());
    const [lastResult, setLastResult] = useState<LastResult | null>(null);

    const isPointerDownRef = useRef(false);
    const draggedRef = useRef(false);
    const pathRef = useRef<Cell[]>([]);
    const boardRef = useRef<Grid>(grid);
    const foundRef = useRef<Set<string>>(found);
    const roundActiveRef = useRef(roundActive);

    useEffect(() => { pathRef.current = path; }, [path]);
    useEffect(() => { boardRef.current = grid; }, [grid]);
    useEffect(() => { foundRef.current = found; }, [found]);
    useEffect(() => { roundActiveRef.current = roundActive; }, [roundActive]);

    const submitCurrentPath = useCallback(() => {
        const currentPath = pathRef.current;
        if (currentPath.length >= 3) {
            const word = currentPath.map((p) => boardRef.current[p.r][p.c]).join('').toLowerCase();
            if (foundRef.current.has(word)) {
                setLastResult({ word, points: 0, status: 'duplicate' });
            } else if (WORD_SET.has(word)) {
                const pts = scoreForLength(word.length);
                setFound((prev) => new Set(prev).add(word));
                setScore((s) => s + pts);
                setLastResult({ word, points: pts, status: 'accepted' });
            } else {
                setLastResult({ word, points: 0, status: 'rejected' });
            }
        }
        setPath([]);
    }, []);

    const extendPath = useCallback((r: number, c: number) => {
        setPath((prev) => {
            if (prev.length === 0) return [{ r, c }];
            if (prev.some((p) => p.r === r && p.c === c)) return prev;
            const last = prev[prev.length - 1];
            if (isTouching(last, { r, c })) return [...prev, { r, c }];
            return prev;
        });
    }, []);

    const handlePointerDown = useCallback((r: number, c: number, event: React.PointerEvent<HTMLDivElement>) => {
        if (!roundActiveRef.current) return;
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            // Some browsers refuse release before capture is established - harmless.
        }
        isPointerDownRef.current = true;
        draggedRef.current = false;
        setPath((prev) => {
            if (prev.length === 0) return [{ r, c }];
            if (prev.some((p) => p.r === r && p.c === c)) return prev;
            const last = prev[prev.length - 1];
            if (isTouching(last, { r, c })) return [...prev, { r, c }];
            return [{ r, c }];
        });
    }, []);

    const handlePointerEnter = useCallback((r: number, c: number) => {
        if (!isPointerDownRef.current || !roundActiveRef.current) return;
        draggedRef.current = true;
        extendPath(r, c);
    }, [extendPath]);

    useEffect(() => {
        const onPointerUp = () => {
            if (!isPointerDownRef.current) return;
            isPointerDownRef.current = false;
            if (draggedRef.current) {
                submitCurrentPath();
            }
            draggedRef.current = false;
        };
        window.addEventListener('pointerup', onPointerUp);
        return () => window.removeEventListener('pointerup', onPointerUp);
    }, [submitCurrentPath]);

    const clearPath = useCallback(() => setPath([]), []);

    const newRound = useCallback(() => {
        setGrid(generateGrid());
        setPath([]);
        setFound(new Set());
        setScore(0);
        setSecondsLeft(ROUND_SECONDS);
        setRoundActive(true);
        setBest(readBest());
        setLastResult(null);
    }, []);

    useEffect(() => {
        if (!roundActive) return;
        const interval = window.setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) return 0;
                return s - 1;
            });
        }, 1000);
        return () => window.clearInterval(interval);
    }, [roundActive]);

    useEffect(() => {
        if (secondsLeft > 0 || !roundActive) return;
        setRoundActive(false);
        setPath([]);
        setBest((prev) => {
            if (prev === null || score > prev) {
                writeBest(score);
                return score;
            }
            return prev;
        });
    }, [secondsLeft, roundActive, score]);

    const currentWord = useMemo(() => path.map((p) => grid[p.r][p.c]).join(''), [path, grid]);

    const cellPx = isPlayMode ? 62 : 72;
    const boardPx = GRID * cellPx;
    const pathKey = (r: number, c: number) => path.findIndex((p) => p.r === r && p.c === c);

    return (
        <>
            <Seo
                gameId={50}
                title="Word Grid - Play a Free Word Finding Grid Game"
                description="Play Word Grid online for free. Trace chains of adjacent letters to spell words before the 90-second timer runs out, score by word length, and beat your best. A fresh letter grid every round, drag or tap to play."
                keywords={['word finding grid game', 'word search puzzle online', 'letter grid word game', 'free word game browser', 'trace letters word game']}
            />
            <GamePlayShell
                icon={Abc}
                title="Word Grid"
                subtitle="Trace a chain of touching letters to spell a word. Longer words score a lot more than short ones."
                onRestart={newRound}
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
                            <Chip size="small" label={`Time: ${secondsLeft}s`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip
                                size="small"
                                label={best === null ? 'Best: none yet' : `Best: ${best}`}
                                sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
                            />
                        </Stack>

                        {!roundActive && (
                            <Stack spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ textAlign: 'center' }}>
                                    Time's up - final score {score}!
                                </Typography>
                                <Button size="small" variant="contained" startIcon={<RestartAlt />} onClick={newRound}>
                                    New round
                                </Button>
                            </Stack>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }} onPointerLeave={() => { /* dragging continues via window listener */ }}>
                            <Box
                                sx={{
                                    width: boardPx,
                                    height: boardPx,
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${GRID}, ${cellPx}px)`,
                                    gridTemplateRows: `repeat(${GRID}, ${cellPx}px)`,
                                    gap: '4px',
                                    p: '6px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    bgcolor: 'rgba(0,0,0,0.35)',
                                    touchAction: 'none',
                                }}
                            >
                                {grid.map((row, r) => row.map((letter, c) => {
                                    const order = pathKey(r, c);
                                    const inPath = order !== -1;
                                    return (
                                        <Box
                                            key={`${r}-${c}`}
                                            onPointerDown={(e) => handlePointerDown(r, c, e)}
                                            onPointerEnter={() => handlePointerEnter(r, c)}
                                            sx={{
                                                position: 'relative',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '8px',
                                                cursor: roundActive ? 'pointer' : 'default',
                                                userSelect: 'none',
                                                bgcolor: inPath ? alpha(theme.palette.primary.main, 0.35) : 'rgba(255,255,255,0.04)',
                                                border: `2px solid ${inPath ? theme.palette.primary.main : 'rgba(255,255,255,0.08)'}`,
                                                transition: 'background-color 0.1s ease, border-color 0.1s ease',
                                            }}
                                        >
                                            <Typography sx={{ fontWeight: 800, fontSize: cellPx * 0.4 }}>{letter}</Typography>
                                            {inPath && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{ position: 'absolute', top: 2, right: 4, opacity: 0.7, fontWeight: 700 }}
                                                >
                                                    {order + 1}
                                                </Typography>
                                            )}
                                        </Box>
                                    );
                                }))}
                            </Box>
                        </Box>

                        <Typography sx={{ textAlign: 'center', fontWeight: 800, letterSpacing: '0.08em', minHeight: '1.6em', mb: 1 }}>
                            {currentWord || ' '}
                        </Typography>

                        {lastResult && (
                            <Typography
                                variant="body2"
                                sx={{
                                    textAlign: 'center',
                                    mb: 1.5,
                                    fontWeight: 700,
                                    color: lastResult.status === 'accepted' ? 'success.main' : lastResult.status === 'duplicate' ? 'warning.main' : 'error.main',
                                }}
                            >
                                {lastResult.status === 'accepted' && `"${lastResult.word.toUpperCase()}" +${lastResult.points}`}
                                {lastResult.status === 'duplicate' && `Already found "${lastResult.word.toUpperCase()}"`}
                                {lastResult.status === 'rejected' && `"${lastResult.word.toUpperCase()}" not recognized`}
                            </Typography>
                        )}

                        <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mb: 2 }}>
                            <Button size="small" variant="contained" startIcon={<SendRounded />} onClick={submitCurrentPath} disabled={!roundActive || path.length < 3}>
                                Submit
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<Backspace />} onClick={clearPath} disabled={path.length === 0}>
                                Clear
                            </Button>
                        </Stack>

                        {found.size > 0 && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="center">
                                {Array.from(found).map((w) => (
                                    <Chip key={w} size="small" label={w.toUpperCase()} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                                ))}
                            </Stack>
                        )}
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

export default WordGrid;
