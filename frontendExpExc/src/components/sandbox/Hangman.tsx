import React, { useState } from 'react';
import { Container, Card, CardContent, Box, Button, Typography, useTheme } from '@mui/material';
import { Spellcheck, RestartAlt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const WORDS = [
    'PYTHON', 'DJANGO', 'REACT', 'BROWSER', 'FUNCTION', 'VARIABLE', 'KEYBOARD',
    'INTERNET', 'ALGORITHM', 'COMPILER', 'DATABASE', 'FRAMEWORK', 'JAVASCRIPT',
    'CONTAINER', 'NETWORK', 'PIPELINE', 'GRADIENT', 'TERMINAL', 'ENDPOINT', 'ROUTER',
];
const MAX_WRONG = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Classic Hangman: guess the hidden word one letter at a time before six
 * wrong guesses complete the drawing. Pure client-side, no backend. */
const Hangman: React.FC = () => {
    const theme = useTheme();
    const [word, setWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
    const [guessed, setGuessed] = useState<Set<string>>(new Set());

    const wrongGuesses = Array.from(guessed).filter((l) => !word.includes(l));
    const wrongCount = wrongGuesses.length;
    const isWon = word.split('').every((l) => guessed.has(l));
    const isLost = wrongCount >= MAX_WRONG;
    const isOver = isWon || isLost;

    const handleGuess = (letter: string) => {
        if (isOver || guessed.has(letter)) return;
        setGuessed((prev) => new Set(prev).add(letter));
    };

    const handleRestart = () => {
        setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
        setGuessed(new Set());
    };

    // Simple stick-figure hangman drawn progressively as wrong guesses accumulate.
    const HangmanDrawing: React.FC<{ stage: number }> = ({ stage }) => (
        <svg width="160" height="180" viewBox="0 0 160 180" fill="none">
            <line x1="10" y1="170" x2="110" y2="170" stroke="currentColor" strokeWidth="3" opacity="0.4" />
            <line x1="35" y1="170" x2="35" y2="15" stroke="currentColor" strokeWidth="3" opacity="0.4" />
            <line x1="35" y1="15" x2="100" y2="15" stroke="currentColor" strokeWidth="3" opacity="0.4" />
            <line x1="100" y1="15" x2="100" y2="35" stroke="currentColor" strokeWidth="3" opacity="0.4" />
            {stage > 0 && <circle cx="100" cy="50" r="15" stroke={theme.palette.error.main} strokeWidth="3" />}
            {stage > 1 && <line x1="100" y1="65" x2="100" y2="105" stroke={theme.palette.error.main} strokeWidth="3" />}
            {stage > 2 && <line x1="100" y1="75" x2="80" y2="95" stroke={theme.palette.error.main} strokeWidth="3" />}
            {stage > 3 && <line x1="100" y1="75" x2="120" y2="95" stroke={theme.palette.error.main} strokeWidth="3" />}
            {stage > 4 && <line x1="100" y1="105" x2="82" y2="140" stroke={theme.palette.error.main} strokeWidth="3" />}
            {stage > 5 && <line x1="100" y1="105" x2="118" y2="140" stroke={theme.palette.error.main} strokeWidth="3" />}
        </svg>
    );

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo title="Hangman - Classic Word Guessing Game" gameId={22} />
            <ServicePageHero
                icon={Spellcheck}
                title="Hangman"
                subtitle="Guess the hidden word one letter at a time. Six wrong guesses and the drawing is complete."
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3
            }}>
                <CardContent sx={{ p: 1, textAlign: 'center' }}>
                    <Box sx={{ color: 'text.secondary', mb: 2 }}>
                        <HangmanDrawing stage={wrongCount} />
                    </Box>

                    <Typography variant="h4" sx={{ fontFamily: 'monospace', letterSpacing: '0.3em', fontWeight: 800, mb: 1 }}>
                        {word.split('').map((l) => (guessed.has(l) ? l : '_')).join(' ')}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Wrong guesses: {wrongCount} / {MAX_WRONG}
                    </Typography>

                    {isOver && (
                        <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: isWon ? 'primary.main' : 'error.main' }}>
                            {isWon ? 'You Won!' : `Game Over — it was ${word}`}
                        </Typography>
                    )}

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.75, mb: 3 }}>
                        {ALPHABET.map((letter) => {
                            const used = guessed.has(letter);
                            const correct = used && word.includes(letter);
                            return (
                                <Box
                                    key={letter}
                                    onClick={() => handleGuess(letter)}
                                    sx={{
                                        width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '8px', cursor: isOver || used ? 'default' : 'pointer', fontWeight: 700,
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        bgcolor: used ? (correct ? 'rgba(57,255,136,0.15)' : 'rgba(239,68,68,0.15)') : 'transparent',
                                        color: used ? (correct ? 'primary.main' : 'error.main') : 'text.primary',
                                        opacity: isOver && !used ? 0.3 : 1,
                                        '&:hover': !isOver && !used ? { borderColor: 'primary.main' } : {},
                                    }}
                                >
                                    {letter}
                                </Box>
                            );
                        })}
                    </Box>

                    <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleRestart}>
                        New Word
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Hangman;
