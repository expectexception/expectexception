import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Casino } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

const BEST_KEY = 'sandbox_yahtzee_best';
const DICE_COUNT = 5;
const MAX_ROLLS = 3;
const UPPER_BONUS_THRESHOLD = 63;
const UPPER_BONUS = 35;

type Category =
    | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
    | 'threeKind' | 'fourKind' | 'fullHouse' | 'smallStraight' | 'largeStraight' | 'yahtzee' | 'chance';

type ScoreSheet = Record<Category, number | null>;

const EMPTY_SCORES: ScoreSheet = {
    ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
    threeKind: null, fourKind: null, fullHouse: null, smallStraight: null,
    largeStraight: null, yahtzee: null, chance: null,
};

const UPPER_CATEGORIES: { id: Category; label: string; face: number }[] = [
    { id: 'ones', label: 'Ones', face: 1 },
    { id: 'twos', label: 'Twos', face: 2 },
    { id: 'threes', label: 'Threes', face: 3 },
    { id: 'fours', label: 'Fours', face: 4 },
    { id: 'fives', label: 'Fives', face: 5 },
    { id: 'sixes', label: 'Sixes', face: 6 },
];

const LOWER_CATEGORIES: { id: Category; label: string; hint: string }[] = [
    { id: 'threeKind', label: 'Three of a Kind', hint: 'Sum of all dice' },
    { id: 'fourKind', label: 'Four of a Kind', hint: 'Sum of all dice' },
    { id: 'fullHouse', label: 'Full House', hint: '25 pts' },
    { id: 'smallStraight', label: 'Small Straight', hint: '30 pts' },
    { id: 'largeStraight', label: 'Large Straight', hint: '40 pts' },
    { id: 'yahtzee', label: 'Yahtzee', hint: '50 pts' },
    { id: 'chance', label: 'Chance', hint: 'Sum of all dice' },
];

const ALL_CATEGORIES: Category[] = [...UPPER_CATEGORIES.map((c) => c.id), ...LOWER_CATEGORIES.map((c) => c.id)];

// ─── Scoring ────────────────────────────────────────────────────────────────

const rollDie = (): number => Math.floor(Math.random() * 6) + 1;

/** counts[face] = how many dice show that face, 1-indexed (counts[0] unused). */
const tally = (dice: number[]): number[] => {
    const counts = new Array(7).fill(0);
    dice.forEach((d) => { counts[d] += 1; });
    return counts;
};

const sumDice = (dice: number[]): number => dice.reduce((a, b) => a + b, 0);

const nOfAKindSum = (dice: number[], n: number): number => (tally(dice).some((c) => c >= n) ? sumDice(dice) : 0);

const fullHouseScore = (dice: number[]): number => {
    const counts = tally(dice).filter((c) => c > 0);
    return counts.includes(3) && counts.includes(2) ? 25 : 0;
};

const smallStraightScore = (dice: number[]): number => {
    const uniq = new Set(dice);
    const runs = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
    return runs.some((run) => run.every((v) => uniq.has(v))) ? 30 : 0;
};

const largeStraightScore = (dice: number[]): number => {
    const uniq = Array.from(new Set(dice)).sort((a, b) => a - b);
    return uniq.length === 5 && uniq[4] - uniq[0] === 4 ? 40 : 0;
};

const yahtzeeScore = (dice: number[]): number => (tally(dice).some((c) => c === 5) ? 50 : 0);

const scoreForCategory = (category: Category, dice: number[]): number => {
    switch (category) {
        case 'ones': return tally(dice)[1] * 1;
        case 'twos': return tally(dice)[2] * 2;
        case 'threes': return tally(dice)[3] * 3;
        case 'fours': return tally(dice)[4] * 4;
        case 'fives': return tally(dice)[5] * 5;
        case 'sixes': return tally(dice)[6] * 6;
        case 'threeKind': return nOfAKindSum(dice, 3);
        case 'fourKind': return nOfAKindSum(dice, 4);
        case 'fullHouse': return fullHouseScore(dice);
        case 'smallStraight': return smallStraightScore(dice);
        case 'largeStraight': return largeStraightScore(dice);
        case 'yahtzee': return yahtzeeScore(dice);
        case 'chance': return sumDice(dice);
        default: return 0;
    }
};

const upperSubtotal = (scores: ScoreSheet): number =>
    UPPER_CATEGORIES.reduce((total, cat) => total + (scores[cat.id] ?? 0), 0);

const lowerSubtotal = (scores: ScoreSheet): number =>
    LOWER_CATEGORIES.reduce((total, cat) => total + (scores[cat.id] ?? 0), 0);

const upperBonus = (scores: ScoreSheet): number => (upperSubtotal(scores) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0);

const grandTotal = (scores: ScoreSheet): number => upperSubtotal(scores) + upperBonus(scores) + lowerSubtotal(scores);

// ─── Persistence ────────────────────────────────────────────────────────────

const loadBest = (): number => {
    try {
        const raw = localStorage.getItem(BEST_KEY);
        if (raw === null) return 0;
        const n = Number(raw);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
        return 0;
    }
};

const saveBest = (n: number) => {
    try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* ignore */ }
};

// ─── Dice pip layout ────────────────────────────────────────────────────────
// Each die is drawn as a 3x3 grid of pip slots; PIP_LAYOUT lists which [row, col]
// slots (0-2) are lit for a given face value, matching the standard arrangement.
const PIP_LAYOUT: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

interface DieProps {
    value: number;
    held: boolean;
    canHold: boolean;
    onToggle: () => void;
}

const Die: React.FC<DieProps> = ({ value, held, canHold, onToggle }) => {
    const theme = useTheme();
    const litSlots = new Set(PIP_LAYOUT[value]?.map(([r, c]) => `${r}-${c}`) ?? []);

    return (
        <Box
            onClick={() => canHold && onToggle()}
            role="button"
            aria-pressed={held}
            aria-label={`Die showing ${value}${held ? ', held' : ''}`}
            sx={{
                width: { xs: 52, sm: 60 },
                height: { xs: 52, sm: 60 },
                borderRadius: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(3, 1fr)',
                gap: '3px',
                // A percentage `p` is resolved against the *containing
                // block's* width, not this box's own fixed 52-60px size -
                // inside this component's flex row that containing block is
                // much wider, so `p: '10%'` was computing a padding many
                // times larger than the die itself, collapsing the grid's
                // own track sizing to 0px and leaving every pip invisible
                // despite the correct value/lit-slot logic underneath. A
                // fixed pixel padding has no such ambiguity.
                p: '6px',
                flexShrink: 0,
                bgcolor: held ? alpha(theme.palette.primary.main, 0.22) : '#f4f4f4',
                border: held ? `2px solid ${theme.palette.primary.main}` : '2px solid rgba(0,0,0,0.15)',
                boxShadow: held
                    ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}, 0 3px 8px rgba(0,0,0,0.4)`
                    : '0 3px 6px rgba(0,0,0,0.4)',
                cursor: canHold ? 'pointer' : 'default',
                transition: 'background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
                transform: held ? 'translateY(-3px)' : 'none',
                userSelect: 'none',
                touchAction: 'manipulation',
            }}
        >
            {Array.from({ length: 9 }, (_, i) => {
                const r = Math.floor(i / 3);
                const c = i % 3;
                const lit = litSlots.has(`${r}-${c}`);
                return (
                    <Box
                        key={i}
                        sx={{
                            borderRadius: '50%',
                            bgcolor: lit ? (held ? theme.palette.primary.main : '#1a1a1a') : 'transparent',
                        }}
                    />
                );
            })}
        </Box>
    );
};

// ─── Component ───────────────────────────────────────────────────────────────

const createInitialDice = (): number[] => Array.from({ length: DICE_COUNT }, () => 1);

const Yahtzee: React.FC = () => {
    const theme = useTheme();

    const [dice, setDice] = useState<number[]>(createInitialDice);
    const [held, setHeld] = useState<boolean[]>(() => Array(DICE_COUNT).fill(false));
    const [rollsUsed, setRollsUsed] = useState(0);
    const [scores, setScores] = useState<ScoreSheet>(EMPTY_SCORES);
    const [best, setBest] = useState<number>(loadBest);
    const [bestRecorded, setBestRecorded] = useState(false);

    const filledCount = useMemo(() => ALL_CATEGORIES.filter((c) => scores[c] !== null).length, [scores]);
    const gameOver = filledCount === ALL_CATEGORIES.length;
    const hasRolled = rollsUsed > 0;
    const rollsLeft = MAX_ROLLS - rollsUsed;
    const total = useMemo(() => grandTotal(scores), [scores]);

    const resetGame = useCallback(() => {
        setDice(createInitialDice());
        setHeld(Array(DICE_COUNT).fill(false));
        setRollsUsed(0);
        setScores(EMPTY_SCORES);
        setBestRecorded(false);
    }, []);

    // Record the best score exactly once per finished game.
    useEffect(() => {
        if (!gameOver || bestRecorded) return;
        setBestRecorded(true);
        if (total > best) {
            setBest(total);
            saveBest(total);
        }
    }, [gameOver, bestRecorded, total, best]);

    const rollDice = () => {
        if (gameOver || rollsUsed >= MAX_ROLLS) return;
        setDice((prev) => prev.map((v, i) => (held[i] ? v : rollDie())));
        setRollsUsed((prev) => prev + 1);
    };

    const toggleHold = (index: number) => {
        if (gameOver || !hasRolled) return;
        setHeld((prev) => prev.map((h, i) => (i === index ? !h : h)));
    };

    const chooseCategory = (category: Category) => {
        if (gameOver || !hasRolled || scores[category] !== null) return;
        setScores((prev) => ({ ...prev, [category]: scoreForCategory(category, dice) }));
        setHeld(Array(DICE_COUNT).fill(false));
        setRollsUsed(0);
    };

    const cardRef = useRef<HTMLDivElement | null>(null);

    const renderCategoryRow = (id: Category, label: string, hint?: string) => {
        const locked = scores[id];
        const isLocked = locked !== null;
        const preview = hasRolled && !isLocked ? scoreForCategory(id, dice) : null;
        const clickable = !gameOver && hasRolled && !isLocked;

        return (
            <Box
                key={id}
                onClick={() => clickable && chooseCategory(id)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.25,
                    py: 0.85,
                    borderRadius: '8px',
                    cursor: clickable ? 'pointer' : 'default',
                    bgcolor: isLocked ? alpha(theme.palette.text.primary, 0.04) : 'transparent',
                    transition: 'background-color 0.15s ease',
                    '&:hover': clickable ? { bgcolor: alpha(theme.palette.primary.main, 0.1) } : undefined,
                }}
            >
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: isLocked ? 700 : 600 }}>
                        {label}
                    </Typography>
                    {hint && !isLocked && (
                        <Typography variant="caption" color="text.secondary">{hint}</Typography>
                    )}
                </Box>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 800,
                        minWidth: 28,
                        textAlign: 'right',
                        color: isLocked
                            ? 'text.primary'
                            : preview !== null
                              ? alpha(theme.palette.primary.main, preview > 0 ? 1 : 0.5)
                              : 'text.disabled',
                    }}
                >
                    {isLocked ? locked : preview !== null ? preview : '–'}
                </Typography>
            </Box>
        );
    };

    return (
        <>
            <Seo
                title="Yahtzee - Play Free Online Dice Game"
                description="Play classic Yahtzee free in your browser. Roll five dice up to three times per turn, hold what you want to keep, and fill all 13 categories for your best score. No sign-up."
                keywords={['yahtzee online', 'yahtzee game free', 'dice game online', 'play yahtzee', 'yahtzee scoresheet', 'free dice game']}
            />
            <GamePlayShell
                icon={Casino}
                title="Yahtzee"
                subtitle="Roll five dice up to three times a turn, hold the ones you want to keep, then lock in a scoring category. Fill all 13 categories for your final score."
                onRestart={resetGame}
            >
                <Card ref={cardRef} sx={{
                    background: 'rgba(13, 14, 18, 0.5)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: { xs: '16px', sm: '24px' },
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 1.5, sm: 3 },
                }}>
                    <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                            <Typography variant="body1" sx={{ fontWeight: 800 }}>
                                Score: <span style={{ color: theme.palette.primary.main }}>{total}</span>
                            </Typography>
                            <Chip
                                size="small"
                                label={`Best: ${best}`}
                                sx={{ bgcolor: alpha(theme.palette.text.primary, 0.08), fontWeight: 800 }}
                            />
                        </Stack>

                        {gameOver ? (
                            <Box
                                sx={{
                                    mb: 2.5,
                                    p: 2,
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                                }}
                            >
                                <Typography variant="body1" fontWeight={800} sx={{ color: theme.palette.primary.main }}>
                                    Game Over — Final Score: {total}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    {total >= best ? 'New best score!' : `Best: ${best}`}
                                </Typography>
                                <Button variant="contained" onClick={resetGame} sx={{ fontWeight: 800, borderRadius: '12px' }}>
                                    New Game
                                </Button>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 1, sm: 1.5 }, mb: 2, flexWrap: 'wrap' }}>
                                    {dice.map((value, i) => (
                                        <Die
                                            key={i}
                                            value={value}
                                            held={held[i]}
                                            canHold={hasRolled}
                                            onToggle={() => toggleHold(i)}
                                        />
                                    ))}
                                </Box>

                                <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center" sx={{ mb: 2.5 }}>
                                    <Button
                                        variant="contained"
                                        onClick={rollDice}
                                        disabled={rollsUsed >= MAX_ROLLS}
                                        sx={{ minWidth: 140, fontWeight: 800, borderRadius: '12px' }}
                                    >
                                        {hasRolled ? 'Roll Again' : 'Roll'}
                                    </Button>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                                        {rollsUsed >= MAX_ROLLS ? 'No rolls left — pick a category' : `Rolls left: ${rollsLeft}`}
                                    </Typography>
                                </Stack>
                            </>
                        )}

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2, sm: 3 } }}>
                            <Box>
                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, pl: 1.25 }}>
                                    Upper Section
                                </Typography>
                                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                                    {UPPER_CATEGORIES.map((c) => renderCategoryRow(c.id, c.label))}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.25, py: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Subtotal ({upperSubtotal(scores)}/{UPPER_BONUS_THRESHOLD} for +{UPPER_BONUS})
                                        </Typography>
                                        <Typography variant="caption" fontWeight={800}>
                                            {upperSubtotal(scores)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.25 }}>
                                        <Typography variant="caption" color="text.secondary">Bonus</Typography>
                                        <Typography variant="caption" fontWeight={800} color={upperBonus(scores) > 0 ? 'primary.main' : 'text.secondary'}>
                                            {upperBonus(scores)}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>

                            <Box>
                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, pl: 1.25 }}>
                                    Lower Section
                                </Typography>
                                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                                    {LOWER_CATEGORIES.map((c) => renderCategoryRow(c.id, c.label, c.hint))}
                                </Stack>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default Yahtzee;
