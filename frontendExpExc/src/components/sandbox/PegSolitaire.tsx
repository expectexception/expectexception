import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, Card, CardContent,
    Chip, Stack, Typography, useTheme,
} from '@mui/material';
import { Circle, ExpandMore, RestartAlt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import { useIsPlayModeDevice } from './shared/useFullscreenPlayMode';

const FAQ: { question: string; answer: string }[] = [
    {
        question: 'What are the rules?',
        answer: 'The board starts full of pegs except the center hole. A move picks up one peg and jumps it in a straight line - up, down, left or right, never diagonally - over an adjacent peg into an empty hole exactly two spaces away. The peg that got jumped is removed from the board. That is the only legal move: no sliding into an empty hole next door, and no jumping over an empty hole or off the edge of the board.',
    },
    {
        question: 'Why does the board start with the center hole empty?',
        answer: 'It is the traditional setup, and it is also what makes the puzzle symmetrical: from that single starting gap, the first jump can come from any of four directions and the board looks the same rotated any quarter turn. Starting from a different empty hole is a legitimate (harder or easier, depending which one) variant, just not the classic one this board uses.',
    },
    {
        question: 'What counts as winning?',
        answer: 'Getting down to exactly one peg anywhere on the board is a win. Finishing with that last peg back in the center hole is the traditional "perfect" win, considered the real target by solitaire players, since it means the whole game folded back to where it started. Both are tracked here, and only the perfect finish gets called out separately.',
    },
    {
        question: 'What happens if I get stuck?',
        answer: 'If no peg on the board has a legal jump available and more than one peg remains, the game flags it as stuck rather than leaving you clicking on dead pegs. Your pegs-remaining count for that attempt is still recorded if it beats your best, since getting down to a handful of pegs on a tricky line is real progress even without a full clear.',
    },
    {
        question: 'Any tips for actually clearing the board?',
        answer: 'Try not to strand single pegs off in a corner early on - a peg with no neighbor within jumping range on any side can only ever be removed by something jumping over it, so it becomes dead weight if nothing reaches it in time. It generally pays to clear pegs from the outer arms of the cross first and work toward the center, since the middle of the board offers the most directions to jump in and is the easiest place to end up short on options.',
    },
];

const SIZE = 7;
type Cell = { r: number; c: number };
const cellKey = (r: number, c: number) => `${r}-${c}`;
const CENTER_KEY = cellKey(3, 3);

/** The standard English board: a 7x7 grid with the four 2x2 corner blocks
 * removed, leaving a 33-hole cross/plus shape. */
const isValidCell = (r: number, c: number): boolean => {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
    const cornerRow = r < 2 || r > 4;
    const cornerCol = c < 2 || c > 4;
    return !(cornerRow && cornerCol);
};

const VALID_CELLS: Cell[] = [];
for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
        if (isValidCell(r, c)) VALID_CELLS.push({ r, c });
    }
}

const initialPegs = (): Set<string> => {
    const pegs = new Set<string>();
    VALID_CELLS.forEach(({ r, c }) => {
        const key = cellKey(r, c);
        if (key !== CENTER_KEY) pegs.add(key);
    });
    return pegs;
};

const JUMP_DIRS: { dr: number; dc: number }[] = [
    { dr: -2, dc: 0 }, { dr: 2, dc: 0 }, { dr: 0, dc: -2 }, { dr: 0, dc: 2 },
];

/** For a peg at (r,c), the holes it could legally jump to right now. */
function legalDestinations(r: number, c: number, pegs: ReadonlySet<string>): string[] {
    const destinations: string[] = [];
    for (const { dr, dc } of JUMP_DIRS) {
        const midR = r + dr / 2;
        const midC = c + dc / 2;
        const destR = r + dr;
        const destC = c + dc;
        if (!isValidCell(destR, destC) || !isValidCell(midR, midC)) continue;
        if (pegs.has(cellKey(destR, destC))) continue;
        if (!pegs.has(cellKey(midR, midC))) continue;
        destinations.push(cellKey(destR, destC));
    }
    return destinations;
}

function hasAnyLegalMove(pegs: ReadonlySet<string>): boolean {
    return Array.from(pegs).some((key) => {
        const [r, c] = key.split('-').map(Number);
        return legalDestinations(r, c, pegs).length > 0;
    });
}

const BEST_KEY = 'sandbox_peg_solitaire_best_english';

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

const writeBest = (remaining: number) => {
    try {
        localStorage.setItem(BEST_KEY, String(remaining));
    } catch {
        // localStorage unavailable - the record just stays in memory for this session.
    }
};

const PegSolitaire: React.FC = () => {
    const theme = useTheme();
    const isPlayMode = useIsPlayModeDevice();
    const [pegs, setPegs] = useState<Set<string>>(() => initialPegs());
    const [selected, setSelected] = useState<string | null>(null);
    const [jumps, setJumps] = useState(0);
    const [won, setWon] = useState(false);
    const [perfect, setPerfect] = useState(false);
    const [stuck, setStuck] = useState(false);
    const [best, setBest] = useState<number | null>(() => readBest());

    const finished = won || stuck;

    const destinations = useMemo(() => {
        if (!selected || finished) return new Set<string>();
        const [r, c] = selected.split('-').map(Number);
        return new Set(legalDestinations(r, c, pegs));
    }, [selected, pegs, finished]);

    const resetBoard = useCallback(() => {
        setPegs(initialPegs());
        setSelected(null);
        setJumps(0);
        setWon(false);
        setPerfect(false);
        setStuck(false);
        setBest(readBest());
    }, []);

    const performJump = useCallback((from: string, to: string) => {
        const [fr, fc] = from.split('-').map(Number);
        const [tr, tc] = to.split('-').map(Number);
        const midKey = cellKey((fr + tr) / 2, (fc + tc) / 2);
        setPegs((prev) => {
            const next = new Set(prev);
            next.delete(from);
            next.delete(midKey);
            next.add(to);
            return next;
        });
        setJumps((j) => j + 1);
        setSelected(null);
    }, []);

    const handleCellClick = useCallback((r: number, c: number) => {
        if (finished || !isValidCell(r, c)) return;
        const key = cellKey(r, c);
        if (selected === key) {
            setSelected(null);
            return;
        }
        if (pegs.has(key)) {
            setSelected(key);
            return;
        }
        if (selected && destinations.has(key)) {
            performJump(selected, key);
            return;
        }
        setSelected(null);
    }, [finished, selected, pegs, destinations, performJump]);

    // Win / stuck detection, and recording the best (fewest pegs remaining) run.
    useEffect(() => {
        if (finished) return;
        const remaining = pegs.size;
        if (remaining === 1) {
            setWon(true);
            setPerfect(pegs.has(CENTER_KEY));
            if (best === null || remaining < best) {
                setBest(remaining);
                writeBest(remaining);
            }
            return;
        }
        if (!hasAnyLegalMove(pegs)) {
            setStuck(true);
            if (best === null || remaining < best) {
                setBest(remaining);
                writeBest(remaining);
            }
        }
    }, [pegs, finished, best]);

    const cellPx = isPlayMode ? 42 : 48;
    const boardPx = SIZE * cellPx;

    return (
        <>
            <Seo
                gameId={47}
                title="Peg Solitaire - Play the Classic Board Game Free"
                description="Play peg solitaire (brainvita) online for free on the classic 33-hole English board. Jump pegs over each other to remove them, and try to finish with just one peg left, ideally back in the center. Legal jumps highlight automatically, with a fewest-pegs-remaining best score."
                keywords={['peg solitaire online', 'peg solitaire game', 'cross board peg game', 'solitaire board puzzle', 'jump peg puzzle', 'brainvita game']}
            />
            <GamePlayShell
                icon={Circle}
                title="Peg Solitaire"
                subtitle="Jump a peg over a neighbor into an empty hole to remove it. Clear the board down to one peg to win."
                onRestart={resetBoard}
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
                            <Chip size="small" label={`Pegs: ${pegs.size}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip size="small" label={`Jumps: ${jumps}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip
                                size="small"
                                label={best === null ? 'Best: none yet' : `Best: ${best} left`}
                                sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
                            />
                        </Stack>

                        {won && (
                            <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ textAlign: 'center', mb: 2 }}>
                                {perfect ? 'One peg left, back in the center - a perfect finish!' : 'Down to one peg - you win!'}
                            </Typography>
                        )}
                        {stuck && (
                            <Typography variant="h6" fontWeight={800} color="warning.main" sx={{ textAlign: 'center', mb: 2 }}>
                                No legal jumps left, with {pegs.size} pegs remaining.
                            </Typography>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${SIZE}, ${cellPx}px)`,
                                    gridTemplateRows: `repeat(${SIZE}, ${cellPx}px)`,
                                    width: boardPx,
                                    height: boardPx,
                                }}
                            >
                                {Array.from({ length: SIZE * SIZE }, (_, index) => {
                                    const r = Math.floor(index / SIZE);
                                    const c = index % SIZE;
                                    if (!isValidCell(r, c)) return <Box key={index} />;

                                    const key = cellKey(r, c);
                                    const hasPeg = pegs.has(key);
                                    const isSelected = selected === key;
                                    const isDestination = destinations.has(key);
                                    const isCenter = key === CENTER_KEY;

                                    return (
                                        <Box
                                            key={index}
                                            onClick={() => handleCellClick(r, c)}
                                            aria-label={`Row ${r + 1}, column ${c + 1}, ${hasPeg ? 'peg' : 'empty hole'}`}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: finished ? 'default' : 'pointer',
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: cellPx * 0.7,
                                                    height: cellPx * 0.7,
                                                    borderRadius: '50%',
                                                    bgcolor: hasPeg
                                                        ? alpha(theme.palette.primary.main, 0.9)
                                                        : isDestination
                                                            ? alpha(theme.palette.success.main, 0.3)
                                                            : isCenter
                                                                ? alpha(theme.palette.text.primary, 0.08)
                                                                : 'rgba(255,255,255,0.05)',
                                                    border: hasPeg
                                                        ? `2px solid ${isSelected ? '#fff' : alpha(theme.palette.primary.light, 0.6)}`
                                                        : isDestination
                                                            ? `2px dashed ${alpha(theme.palette.success.main, 0.9)}`
                                                            : '1px solid rgba(255,255,255,0.1)',
                                                    boxShadow: isSelected ? `0 0 14px ${alpha(theme.palette.primary.main, 0.7)}` : 'none',
                                                    transition: 'background-color 0.12s ease, box-shadow 0.12s ease',
                                                }}
                                            />
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1.5 }}>
                            {selected ? 'Tap a highlighted hole to jump there.' : 'Tap a peg to see its legal jumps.'}
                        </Typography>

                        <Stack direction="row" spacing={1.5} justifyContent="center">
                            <Button size="small" variant="outlined" startIcon={<RestartAlt />} onClick={resetBoard}>
                                Reset board
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

export default PegSolitaire;
