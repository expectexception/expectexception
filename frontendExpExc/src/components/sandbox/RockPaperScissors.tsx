import React, { useState } from 'react';
import { Container, Card, CardContent, Box, Button, Typography } from '@mui/material';
import { Casino, RestartAlt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

type Move = 'rock' | 'paper' | 'scissors';
const MOVES: { key: Move; emoji: string; label: string }[] = [
    { key: 'rock', emoji: '✊', label: 'Rock' },
    { key: 'paper', emoji: '✋', label: 'Paper' },
    { key: 'scissors', emoji: '✌', label: 'Scissors' },
];
const BEATS: Record<Move, Move> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

/** Rock-Paper-Scissors against an AI that leans slightly toward whatever
 * counters your most-played move (a light pattern-read), so repeating the
 * same move stops working after a few rounds. Pure client-side, no backend. */
const RockPaperScissors: React.FC = () => {
    const [playerHistory, setPlayerHistory] = useState<Move[]>([]);
    const [playerMove, setPlayerMove] = useState<Move | null>(null);
    const [aiMove, setAiMove] = useState<Move | null>(null);
    const [result, setResult] = useState<'win' | 'lose' | 'tie' | null>(null);
    const [score, setScore] = useState({ player: 0, ai: 0 });

    const pickAiMove = (history: Move[]): Move => {
        // 60% of the time, counter the player's single most frequent move; otherwise random.
        if (history.length >= 3 && Math.random() < 0.6) {
            const counts: Record<Move, number> = { rock: 0, paper: 0, scissors: 0 };
            history.forEach((m) => counts[m]++);
            const mostPlayed = (Object.keys(counts) as Move[]).sort((a, b) => counts[b] - counts[a])[0];
            const counter = (Object.keys(BEATS) as Move[]).find((m) => BEATS[m] === mostPlayed);
            if (counter) return counter;
        }
        const all: Move[] = ['rock', 'paper', 'scissors'];
        return all[Math.floor(Math.random() * 3)];
    };

    const handlePlay = (move: Move) => {
        const newHistory = [...playerHistory, move];
        setPlayerHistory(newHistory);
        const ai = pickAiMove(playerHistory);
        setPlayerMove(move);
        setAiMove(ai);

        if (move === ai) {
            setResult('tie');
        } else if (BEATS[move] === ai) {
            setResult('win');
            setScore((s) => ({ ...s, player: s.player + 1 }));
        } else {
            setResult('lose');
            setScore((s) => ({ ...s, ai: s.ai + 1 }));
        }
    };

    const handleReset = () => {
        setPlayerHistory([]);
        setPlayerMove(null);
        setAiMove(null);
        setResult(null);
        setScore({ player: 0, ai: 0 });
    };

    const resultText = result === 'win' ? 'You Win!' : result === 'lose' ? 'AI Wins!' : result === 'tie' ? "It's a Tie" : '';
    const resultColor = result === 'win' ? 'primary.main' : result === 'lose' ? 'error.main' : 'text.secondary';

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo title="Rock Paper Scissors vs AI - Classic Game" gameId={23} />
            <ServicePageHero
                icon={Casino}
                title="Rock Paper Scissors"
                subtitle="Play against an AI that quietly learns your habits — favor one move too often and it starts countering you."
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 6, mb: 3 }}>
                        <Box>
                            <Typography variant="h4" fontWeight={900} color="primary.main">{score.player}</Typography>
                            <Typography variant="caption" color="text.secondary">You</Typography>
                        </Box>
                        <Box>
                            <Typography variant="h4" fontWeight={900} color="error.main">{score.ai}</Typography>
                            <Typography variant="caption" color="text.secondary">AI</Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 3, minHeight: 90 }}>
                        <Box sx={{ fontSize: '3.5rem' }}>{playerMove ? MOVES.find((m) => m.key === playerMove)?.emoji : '❓'}</Box>
                        <Typography variant="h4" sx={{ alignSelf: 'center', color: 'text.secondary' }}>vs</Typography>
                        <Box sx={{ fontSize: '3.5rem' }}>{aiMove ? MOVES.find((m) => m.key === aiMove)?.emoji : '❓'}</Box>
                    </Box>

                    <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: resultColor, minHeight: 40 }}>
                        {resultText}
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                        {MOVES.map((m) => (
                            <Button
                                key={m.key}
                                variant="outlined"
                                onClick={() => handlePlay(m.key)}
                                sx={{ fontSize: '1.75rem', minWidth: 70, height: 70, borderRadius: '16px' }}
                            >
                                {m.emoji}
                            </Button>
                        ))}
                    </Box>

                    <Button variant="text" startIcon={<RestartAlt />} onClick={handleReset}>
                        Reset Score
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default RockPaperScissors;
