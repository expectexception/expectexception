import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Palette } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

const CODE_LENGTH = 4;
const MAX_GUESSES = 10;

type ColorId = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple';

interface ColorSpec {
    id: ColorId;
    label: string;
    hex: string;
}

const COLORS: ColorSpec[] = [
    { id: 'red', label: 'Red', hex: '#e53935' },
    { id: 'blue', label: 'Blue', hex: '#1e88e5' },
    { id: 'green', label: 'Green', hex: '#43a047' },
    { id: 'yellow', label: 'Yellow', hex: '#fdd835' },
    { id: 'orange', label: 'Orange', hex: '#fb8c00' },
    { id: 'purple', label: 'Purple', hex: '#8e24aa' },
];

const colorHex = (id: ColorId): string => COLORS.find((c) => c.id === id)?.hex ?? '#666';
const colorLabel = (id: ColorId): string => COLORS.find((c) => c.id === id)?.label ?? id;

interface Feedback {
    black: number;
    white: number;
}

interface GuessEntry {
    guess: ColorId[];
    feedback: Feedback;
}

interface Stats {
    wins: number;
    losses: number;
    totalGuessesOnWins: number;
}

const STATS_KEY = 'sandbox_mastermind_stats';
const DEFAULT_STATS: Stats = { wins: 0, losses: 0, totalGuessesOnWins: 0 };

const readStats = (): Stats => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return DEFAULT_STATS;
        const parsed = JSON.parse(raw);
        return {
            wins: Number.isFinite(parsed.wins) ? parsed.wins : 0,
            losses: Number.isFinite(parsed.losses) ? parsed.losses : 0,
            totalGuessesOnWins: Number.isFinite(parsed.totalGuessesOnWins) ? parsed.totalGuessesOnWins : 0,
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

const generateSecret = (): ColorId[] =>
    Array.from({ length: CODE_LENGTH }, () => COLORS[Math.floor(Math.random() * COLORS.length)].id);

/** Standard Mastermind scoring. Black pegs: exact color+position matches, found and
 * removed from consideration first. White pegs: among what's left, color-only matches -
 * counted with a frequency map so a single secret peg is never matched against more than
 * one guess peg of the same color (or vice versa), which is the subtlety that's easy to
 * get subtly wrong with repeated colors. */
const scoreGuess = (secret: ColorId[], guess: ColorId[]): Feedback => {
    const secretRemaining: (ColorId | null)[] = [...secret];
    const guessRemaining: (ColorId | null)[] = [...guess];

    let black = 0;
    for (let i = 0; i < CODE_LENGTH; i++) {
        if (guessRemaining[i] !== null && guessRemaining[i] === secretRemaining[i]) {
            black += 1;
            secretRemaining[i] = null;
            guessRemaining[i] = null;
        }
    }

    const secretCounts = new Map<ColorId, number>();
    for (const c of secretRemaining) {
        if (c === null) continue;
        secretCounts.set(c, (secretCounts.get(c) ?? 0) + 1);
    }

    let white = 0;
    for (const c of guessRemaining) {
        if (c === null) continue;
        const remaining = secretCounts.get(c) ?? 0;
        if (remaining > 0) {
            white += 1;
            secretCounts.set(c, remaining - 1);
        }
    }

    return { black, white };
};

// ─── Peg components ─────────────────────────────────────────────────────────

interface PegProps {
    colorId: ColorId | null;
    size?: number;
    interactive?: boolean;
    onClick?: () => void;
}

const Peg: React.FC<PegProps> = ({ colorId, size = 40, interactive = false, onClick }) => (
    <Box
        onClick={() => interactive && onClick && onClick()}
        role={interactive ? 'button' : undefined}
        aria-label={colorId ? `${colorLabel(colorId)} peg` : 'Empty slot'}
        sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            flexShrink: 0,
            cursor: interactive ? 'pointer' : 'default',
            bgcolor: colorId ? colorHex(colorId) : 'rgba(255,255,255,0.05)',
            border: colorId ? '2px solid rgba(255,255,255,0.25)' : '2px dashed rgba(255,255,255,0.25)',
            boxShadow: colorId
                ? 'inset 0 -4px 6px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.4)'
                : 'none',
            transition: 'transform 0.12s ease',
            '&:hover': interactive ? { transform: 'scale(1.08)' } : undefined,
        }}
    />
);

const FeedbackPegs: React.FC<{ feedback: Feedback }> = ({ feedback }) => {
    const dots: ('black' | 'white' | 'empty')[] = [
        ...Array(feedback.black).fill('black' as const),
        ...Array(feedback.white).fill('white' as const),
    ];
    while (dots.length < CODE_LENGTH) dots.push('empty');

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px', width: 26, height: 26, flexShrink: 0 }}>
            {dots.map((d, i) => (
                <Box
                    key={i}
                    sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: d === 'black' ? '#161616' : d === 'white' ? '#f0f0f0' : 'transparent',
                        border: d === 'empty' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.5)',
                    }}
                />
            ))}
        </Box>
    );
};

// ─── Component ───────────────────────────────────────────────────────────────

const createEmptyGuess = (): (ColorId | null)[] => Array(CODE_LENGTH).fill(null);

const Mastermind: React.FC = () => {
    const theme = useTheme();

    const [secret, setSecret] = useState<ColorId[]>(generateSecret);
    const [currentGuess, setCurrentGuess] = useState<(ColorId | null)[]>(createEmptyGuess);
    const [history, setHistory] = useState<GuessEntry[]>([]);
    const [stats, setStats] = useState<Stats>(readStats);
    const [statsRecorded, setStatsRecorded] = useState(false);

    const won = history.length > 0 && history[history.length - 1].feedback.black === CODE_LENGTH;
    const lost = !won && history.length >= MAX_GUESSES;
    const gameOver = won || lost;
    const guessesUsed = history.length;

    const newGame = useCallback(() => {
        setSecret(generateSecret());
        setCurrentGuess(createEmptyGuess());
        setHistory([]);
        setStatsRecorded(false);
    }, []);

    // Record the win/loss tally (and guesses-to-win for the average) exactly once per finished game.
    useEffect(() => {
        if (!gameOver || statsRecorded) return;
        setStatsRecorded(true);
        setStats((prev) => {
            const next: Stats = won
                ? { ...prev, wins: prev.wins + 1, totalGuessesOnWins: prev.totalGuessesOnWins + guessesUsed }
                : { ...prev, losses: prev.losses + 1 };
            writeStats(next);
            return next;
        });
    }, [gameOver, statsRecorded, won, guessesUsed]);

    const fillNextSlot = (colorId: ColorId) => {
        if (gameOver) return;
        setCurrentGuess((prev) => {
            const idx = prev.findIndex((c) => c === null);
            if (idx === -1) return prev;
            return prev.map((c, i) => (i === idx ? colorId : c));
        });
    };

    const clearSlot = (index: number) => {
        if (gameOver) return;
        setCurrentGuess((prev) => prev.map((c, i) => (i === index ? null : c)));
    };

    const clearGuess = () => setCurrentGuess(createEmptyGuess());

    const canSubmit = !gameOver && currentGuess.every((c) => c !== null);

    const submitGuess = () => {
        if (!canSubmit) return;
        const guess = currentGuess as ColorId[];
        const feedback = scoreGuess(secret, guess);
        setHistory((prev) => [...prev, { guess, feedback }]);
        setCurrentGuess(createEmptyGuess());
    };

    const avgGuesses = stats.wins > 0 ? (stats.totalGuessesOnWins / stats.wins).toFixed(1) : '-';

    const cardRef = useRef<HTMLDivElement | null>(null);

    let statusText: string;
    if (won) statusText = `You cracked the code in ${guessesUsed} guess${guessesUsed === 1 ? '' : 'es'}!`;
    else if (lost) statusText = 'Out of guesses. Better luck next time.';
    else statusText = `Guess ${guessesUsed + 1} of ${MAX_GUESSES}`;

    const reversedHistory = useMemo(() => [...history].reverse(), [history]);

    return (
        <>
            <Seo
                title="Mastermind - Play Free Online Code-Breaking Game"
                description="Crack the secret 4-color code in 10 guesses or fewer. Get black peg and white peg feedback after every guess. Play classic Mastermind free in your browser, no sign-up."
                keywords={['mastermind game', 'mastermind online', 'code breaking game', 'play mastermind free', 'logic puzzle game', 'deduction game online']}
            />
            <GamePlayShell
                icon={Palette}
                title="Mastermind"
                subtitle="Guess the secret 4-color code within 10 tries. Each guess gets feedback: black pegs for right color in the right spot, white pegs for right color in the wrong spot."
                onRestart={newGame}
                maxWidth="sm"
            >
                <Card ref={cardRef} sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 2, sm: 3 },
                }}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: { xs: 1, sm: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 420, mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                W {stats.wins} · L {stats.losses}
                            </Typography>
                            <Chip
                                size="small"
                                label={`Avg guesses: ${avgGuesses}`}
                                sx={{ bgcolor: alpha(theme.palette.text.primary, 0.08), fontWeight: 800 }}
                            />
                        </Box>

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                mb: won || lost ? 1 : 2,
                                textAlign: 'center',
                                color: won ? 'primary.main' : lost ? 'error.main' : 'text.primary',
                            }}
                        >
                            {statusText}
                        </Typography>

                        {lost && (
                            <Stack alignItems="center" spacing={0.75} sx={{ mb: 2.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    The code was:
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    {secret.map((c, i) => (
                                        <Peg key={i} colorId={c} size={34} />
                                    ))}
                                </Stack>
                            </Stack>
                        )}

                        {won && (
                            <Stack alignItems="center" spacing={0.75} sx={{ mb: 2.5 }}>
                                <Stack direction="row" spacing={1}>
                                    {secret.map((c, i) => (
                                        <Peg key={i} colorId={c} size={34} />
                                    ))}
                                </Stack>
                            </Stack>
                        )}

                        {!gameOver && (
                            <>
                                <Stack direction="row" spacing={1.25} justifyContent="center" sx={{ mb: 2.5 }}>
                                    {currentGuess.map((c, i) => (
                                        <Peg key={i} colorId={c} interactive={c !== null} onClick={() => clearSlot(i)} />
                                    ))}
                                </Stack>

                                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ mb: 2, rowGap: 1 }}>
                                    {COLORS.map((color) => (
                                        <Peg key={color.id} colorId={color.id} size={38} interactive onClick={() => fillNextSlot(color.id)} />
                                    ))}
                                </Stack>

                                <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mb: 3 }}>
                                    <Button variant="contained" disabled={!canSubmit} onClick={submitGuess} sx={{ fontWeight: 800, borderRadius: '12px', minWidth: 120 }}>
                                        Submit Guess
                                    </Button>
                                    <Button variant="text" onClick={clearGuess} disabled={currentGuess.every((c) => c === null)}>
                                        Clear
                                    </Button>
                                </Stack>
                            </>
                        )}

                        {gameOver && (
                            <Button sx={{ mb: 3 }} variant="contained" onClick={newGame} startIcon={<Palette />}>
                                New Game
                            </Button>
                        )}

                        {reversedHistory.length > 0 && (
                            <Box sx={{ width: '100%' }}>
                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, pl: 0.5 }}>
                                    Guess History
                                </Typography>
                                <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                                    {reversedHistory.map((entry, idx) => {
                                        const guessNumber = reversedHistory.length - idx;
                                        return (
                                            <Box
                                                key={guessNumber}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 1,
                                                    px: 1.25,
                                                    py: 0.75,
                                                    borderRadius: '10px',
                                                    bgcolor: alpha(theme.palette.text.primary, 0.04),
                                                }}
                                            >
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, minWidth: 18 }}>
                                                    {guessNumber}
                                                </Typography>
                                                <Stack direction="row" spacing={0.75} sx={{ flex: 1 }}>
                                                    {entry.guess.map((c, i) => (
                                                        <Peg key={i} colorId={c} size={26} />
                                                    ))}
                                                </Stack>
                                                <FeedbackPegs feedback={entry.feedback} />
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default Mastermind;
