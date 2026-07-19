import React, { useCallback, useMemo, useState } from 'react';
import {
    Container, Card, CardContent, Box, Typography, Button, TextField, Stack, Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Spellcheck, Refresh } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const WORD_LIST = [
    'about', 'above', 'actor', 'acute', 'admit', 'adopt', 'after', 'again', 'agent', 'agree',
    'alarm', 'alert', 'alike', 'alive', 'allow', 'alone', 'along', 'angel', 'anger', 'angle',
    'apple', 'apply', 'arena', 'argue', 'arise', 'array', 'aside', 'asset', 'audio', 'audit',
    'avoid', 'awake', 'award', 'aware', 'badge', 'baker', 'basic', 'basis', 'beach', 'began',
    'begin', 'being', 'below', 'bench', 'birth', 'black', 'blade', 'blame', 'blank', 'blast',
    'blend', 'bless', 'blind', 'block', 'blood', 'board', 'boost', 'booth', 'bound', 'brain',
    'brand', 'brave', 'bread', 'break', 'breed', 'brick', 'bride', 'brief', 'bring', 'broad',
    'broke', 'brown', 'brush', 'build', 'built', 'bunch', 'burst', 'cabin', 'cable', 'candy',
];

const ATTEMPTS = 6;
const WORD_LENGTH = 5;
const STORAGE_KEY = 'sandbox.wordGuess.bestGuesses';

type LetterStatus = 'correct' | 'present' | 'absent';

interface TileResult {
    letter: string;
    status: LetterStatus;
}

const pickRandomWord = (): string => WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];

/**
 * Evaluate a guess against the target word using standard Wordle duplicate-letter rules:
 * 1) First pass marks exact position matches as 'correct' and removes them from the
 *    pool of available target letters.
 * 2) Second pass marks remaining letters as 'present' only if there's still an unmatched
 *    occurrence of that letter left in the pool (decrementing as we go), otherwise 'absent'.
 * This ensures a letter that appears once in the target but twice in the guess only
 * gets credited (green/yellow) once.
 */
const evaluateGuess = (guess: string, target: string): TileResult[] => {
    const result: TileResult[] = new Array(WORD_LENGTH);
    const targetLetters = target.split('');
    const remaining: Record<string, number> = {};

    // Pass 1: exact matches
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === targetLetters[i]) {
            result[i] = { letter: guess[i], status: 'correct' };
            targetLetters[i] = '\0'; // consume this position so pass 2 skips it
        }
    }

    // Build remaining-letter pool from the unconsumed target positions
    for (const ch of targetLetters) {
        if (ch === '\0') continue;
        remaining[ch] = (remaining[ch] || 0) + 1;
    }

    // Pass 2: present / absent
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (result[i]) continue; // already marked correct
        const letter = guess[i];
        if (remaining[letter] > 0) {
            result[i] = { letter, status: 'present' };
            remaining[letter] -= 1;
        } else {
            result[i] = { letter, status: 'absent' };
        }
    }

    return result;
};

const getStoredBest = (): number | null => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
};

const WordGuess: React.FC = () => {
    const theme = useTheme();
    const [target, setTarget] = useState<string>(() => pickRandomWord());
    const [guesses, setGuesses] = useState<TileResult[][]>([]);
    const [current, setCurrent] = useState('');
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    const [error, setError] = useState('');
    const [best, setBest] = useState<number | null>(() => getStoredBest());

    const startNewWord = useCallback(() => {
        setTarget(pickRandomWord());
        setGuesses([]);
        setCurrent('');
        setStatus('playing');
        setError('');
    }, []);

    const submitGuess = useCallback(() => {
        if (status !== 'playing') return;
        const normalized = current.trim().toLowerCase();

        if (normalized.length !== WORD_LENGTH) {
            setError(`Word must be ${WORD_LENGTH} letters`);
            return;
        }
        if (!/^[a-z]+$/.test(normalized)) {
            setError('Only letters a-z are allowed');
            return;
        }

        const evaluated = evaluateGuess(normalized, target);
        const nextGuesses = [...guesses, evaluated];
        setGuesses(nextGuesses);
        setCurrent('');
        setError('');

        const isWin = evaluated.every((tile) => tile.status === 'correct');
        if (isWin) {
            setStatus('won');
            const guessCount = nextGuesses.length;
            if (best === null || guessCount < best) {
                setBest(guessCount);
                localStorage.setItem(STORAGE_KEY, String(guessCount));
            }
        } else if (nextGuesses.length >= ATTEMPTS) {
            setStatus('lost');
        }
    }, [current, guesses, status, target, best]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitGuess();
        }
    };

    const tileColor = useCallback((statusVal: LetterStatus): string => {
        if (statusVal === 'correct') return theme.palette.primary.main;
        if (statusVal === 'present') return theme.palette.secondary.main;
        return 'rgba(255,255,255,0.12)';
    }, [theme]);

    const emptyRows = useMemo(() => {
        const remainingRows = ATTEMPTS - guesses.length - (status === 'playing' ? 1 : 0);
        return Math.max(remainingRows, 0);
    }, [guesses.length, status]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo title="Word Guess - Free Online Wordle-Style Puzzle Game" gameId={6} />
            <ServicePageHero
                icon={Spellcheck}
                title="Word Guess"
                subtitle="Guess the hidden 5-letter word in 6 tries. Green means correct spot, yellow means wrong spot, grey means not in the word."
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
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            Best: {best !== null ? `${best} ${best === 1 ? 'guess' : 'guesses'}` : '—'}
                        </Typography>
                        <Chip
                            size="small"
                            label={`Attempt ${Math.min(guesses.length + (status === 'playing' ? 1 : 0), ATTEMPTS)} / ${ATTEMPTS}`}
                            sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
                        />
                    </Stack>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                        {guesses.map((row, rowIdx) => (
                            <Box key={rowIdx} sx={{ display: 'grid', gridTemplateColumns: `repeat(${WORD_LENGTH}, 1fr)`, gap: 1 }}>
                                {row.map((tile, tileIdx) => (
                                    <Box
                                        key={tileIdx}
                                        sx={{
                                            aspectRatio: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '8px',
                                            bgcolor: tileColor(tile.status),
                                            color: tile.status === 'absent' ? 'text.secondary' : '#0d0e12',
                                            fontWeight: 800,
                                            fontSize: '1.4rem',
                                            textTransform: 'uppercase',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                        }}
                                    >
                                        {tile.letter}
                                    </Box>
                                ))}
                            </Box>
                        ))}

                        {status === 'playing' && (
                            <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${WORD_LENGTH}, 1fr)`, gap: 1 }}>
                                {Array.from({ length: WORD_LENGTH }).map((_, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            aspectRatio: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '8px',
                                            bgcolor: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            fontWeight: 800,
                                            fontSize: '1.4rem',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {current[idx] || ''}
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {Array.from({ length: emptyRows }).map((_, rowIdx) => (
                            <Box key={`empty-${rowIdx}`} sx={{ display: 'grid', gridTemplateColumns: `repeat(${WORD_LENGTH}, 1fr)`, gap: 1 }}>
                                {Array.from({ length: WORD_LENGTH }).map((_, tileIdx) => (
                                    <Box
                                        key={tileIdx}
                                        sx={{
                                            aspectRatio: '1',
                                            borderRadius: '8px',
                                            bgcolor: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}
                                    />
                                ))}
                            </Box>
                        ))}
                    </Box>

                    {status === 'won' && (
                        <Typography sx={{ color: 'primary.main', fontWeight: 700, mb: 2, textAlign: 'center' }}>
                            You got it in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}!
                        </Typography>
                    )}
                    {status === 'lost' && (
                        <Typography sx={{ color: 'secondary.main', fontWeight: 700, mb: 2, textAlign: 'center' }}>
                            Out of attempts. The word was "{target.toUpperCase()}".
                        </Typography>
                    )}

                    {status === 'playing' && (
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 1 }}>
                            <TextField
                                fullWidth
                                value={current}
                                onChange={(e) => {
                                    const v = e.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, WORD_LENGTH);
                                    setCurrent(v);
                                    setError('');
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a 5-letter word"
                                error={Boolean(error)}
                                helperText={error || ' '}
                                inputProps={{ maxLength: WORD_LENGTH, autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }}
                            />
                            <Button variant="contained" onClick={submitGuess} sx={{ mt: 0.25 }}>
                                Guess
                            </Button>
                        </Box>
                    )}

                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={startNewWord}
                        sx={{ mt: status === 'playing' ? 1 : 0 }}
                    >
                        New Word
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default WordGuess;
