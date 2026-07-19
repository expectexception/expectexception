import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography, useTheme } from '@mui/material';
import { Pets } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const HOLES = 9;
const GAME_MS = 30000;
const BEST_KEY = 'sandbox_whack_best_score';

type Phase = 'idle' | 'playing' | 'over';

const loadBest = (): number => {
    try {
        const n = Number(localStorage.getItem(BEST_KEY));
        return Number.isFinite(n) ? n : 0;
    } catch {
        return 0;
    }
};

const WhackAMole: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [phase, setPhase] = useState<Phase>('idle');
    const [active, setActive] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_MS / 1000);
    const [best, setBest] = useState<number>(() => loadBest());
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const phaseRef = useRef<Phase>('idle');

    const clearAll = useCallback(() => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    }, []);

    useEffect(() => () => clearAll(), [clearAll]);

    const scheduleMole = useCallback(() => {
        if (phaseRef.current !== 'playing') return;
        const hole = Math.floor(Math.random() * HOLES);
        const life = 600 + Math.random() * 700;
        setActive(hole);
        timers.current.push(setTimeout(() => {
            setActive(cur => (cur === hole ? null : cur));
            const gap = 150 + Math.random() * 350;
            timers.current.push(setTimeout(scheduleMole, gap));
        }, life));
    }, []);

    const endGame = useCallback(() => {
        clearAll();
        phaseRef.current = 'over';
        setPhase('over');
        setActive(null);
        setScore(s => {
            if (s > best) {
                setBest(s);
                try { localStorage.setItem(BEST_KEY, String(s)); } catch { /* ignore */ }
            }
            return s;
        });
    }, [best, clearAll]);

    const start = useCallback(() => {
        clearAll();
        setScore(0);
        setTimeLeft(GAME_MS / 1000);
        phaseRef.current = 'playing';
        setPhase('playing');
        scheduleMole();
        countdownRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { endGame(); return 0; }
                return t - 1;
            });
        }, 1000);
    }, [clearAll, scheduleMole, endGame]);

    const whack = useCallback((hole: number) => {
        if (phaseRef.current !== 'playing' || hole !== active) return;
        setScore(s => s + 1);
        setActive(null);
    }, [active]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                gameId={15}
                title="Whack-a-Mole — Free Online Reaction Game"
                keywords={['whack a mole game', 'whack a mole online', 'reaction game free', 'click speed game', 'arcade tap game', 'whack a mole browser']}
            />
            <ServicePageHero
                icon={Pets}
                title="Whack-a-Mole"
                subtitle="Tap the moles as fast as they pop up. You have 30 seconds — how many can you hit?"
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: { xs: 2, sm: 3 },
            }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                        <Typography variant="body1"><strong>Score:</strong> {score}</Typography>
                        <Typography variant="body1" color={timeLeft <= 5 && phase === 'playing' ? 'error.main' : 'text.secondary'}>
                            ⏱ {timeLeft}s
                        </Typography>
                        <Typography variant="body1" color="text.secondary">Best: {best}</Typography>
                    </Stack>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: { xs: 1.25, sm: 2 },
                        maxWidth: 360,
                        mx: 'auto',
                    }}>
                        {Array.from({ length: HOLES }).map((_, i) => {
                            const up = active === i;
                            return (
                                <Box
                                    key={i}
                                    onClick={() => whack(i)}
                                    sx={{
                                        aspectRatio: '1 / 1',
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(0,0,0,0.35)',
                                        border: '2px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: { xs: '1.8rem', sm: '2.4rem' },
                                        cursor: phase === 'playing' ? 'pointer' : 'default',
                                        overflow: 'hidden',
                                        position: 'relative',
                                    }}
                                >
                                    <Box sx={{
                                        transition: 'transform 0.12s ease-out',
                                        transform: up ? 'translateY(0) scale(1)' : 'translateY(60%) scale(0.4)',
                                        opacity: up ? 1 : 0,
                                    }}>
                                        🐹
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        {phase === 'over' && (
                            <Typography variant="h6" sx={{ fontWeight: 800, color: primary, mb: 1.5 }}>
                                Time! You scored {score} 🎉
                            </Typography>
                        )}
                        {(phase === 'idle' || phase === 'over') && (
                            <Button variant="contained" onClick={start} sx={{ px: 4, fontWeight: 700 }}>
                                {phase === 'over' ? 'Play again' : 'Start'}
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default WhackAMole;
