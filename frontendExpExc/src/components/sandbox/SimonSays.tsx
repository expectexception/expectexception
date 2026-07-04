import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography, useTheme } from '@mui/material';
import { Hearing } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const BEST_KEY = 'sandbox_simon_best_round';

const PADS = [
    { id: 0, color: '#22c55e' },
    { id: 1, color: '#ef4444' },
    { id: 2, color: '#3b82f6' },
    { id: 3, color: '#eab308' },
];

type Phase = 'idle' | 'showing' | 'input' | 'over';

const loadBest = (): number => {
    try {
        const n = Number(localStorage.getItem(BEST_KEY));
        return Number.isFinite(n) ? n : 0;
    } catch {
        return 0;
    }
};

const SimonSays: React.FC = () => {
    const theme = useTheme();

    const [sequence, setSequence] = useState<number[]>([]);
    const [phase, setPhase] = useState<Phase>('idle');
    const [active, setActive] = useState<number | null>(null);
    const [best, setBest] = useState<number>(() => loadBest());
    const inputIndexRef = useRef(0);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const round = sequence.length;

    const clearTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    useEffect(() => () => clearTimers(), [clearTimers]);

    const playSequence = useCallback((seq: number[]) => {
        setPhase('showing');
        clearTimers();
        seq.forEach((pad, i) => {
            timersRef.current.push(setTimeout(() => setActive(pad), 600 * i + 250));
            timersRef.current.push(setTimeout(() => setActive(null), 600 * i + 250 + 350));
        });
        timersRef.current.push(setTimeout(() => {
            inputIndexRef.current = 0;
            setPhase('input');
        }, 600 * seq.length + 250));
    }, [clearTimers]);

    const nextRound = useCallback((prev: number[]) => {
        const seq = [...prev, Math.floor(Math.random() * 4)];
        setSequence(seq);
        playSequence(seq);
    }, [playSequence]);

    const start = useCallback(() => {
        setPhase('idle');
        nextRound([]);
    }, [nextRound]);

    const flash = useCallback((pad: number) => {
        setActive(pad);
        timersRef.current.push(setTimeout(() => setActive(null), 220));
    }, []);

    const handlePad = useCallback((pad: number) => {
        if (phase !== 'input') return;
        flash(pad);
        const expected = sequence[inputIndexRef.current];
        if (pad !== expected) {
            setPhase('over');
            if (round - 1 > best) {
                const score = round - 1;
                setBest(score);
                try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* ignore */ }
            }
            return;
        }
        inputIndexRef.current += 1;
        if (inputIndexRef.current >= sequence.length) {
            if (round > best) {
                setBest(round);
                try { localStorage.setItem(BEST_KEY, String(round)); } catch { /* ignore */ }
            }
            setPhase('showing');
            timersRef.current.push(setTimeout(() => nextRound(sequence), 700));
        }
    }, [phase, sequence, round, best, flash, nextRound]);

    const statusText = phase === 'idle' ? 'Press Start to play'
        : phase === 'showing' ? 'Watch the pattern…'
        : phase === 'input' ? 'Your turn — repeat it'
        : `Game over — you reached round ${round - 1}`;

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                title="Simon Says — Memory Sequence Game Online"
                keywords={['simon says game', 'memory sequence game', 'color memory game', 'simon game online', 'pattern memory game', 'brain memory test']}
            />
            <ServicePageHero
                icon={Hearing}
                title="Simon Says"
                subtitle="Watch the colour pattern, then repeat it back. Each round adds one more step."
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
                        <Typography variant="body1"><strong>Round:</strong> {phase === 'idle' ? 0 : round}</Typography>
                        <Typography variant="body1" color="text.secondary">Best: {best}</Typography>
                    </Stack>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 2,
                        maxWidth: 340,
                        mx: 'auto',
                    }}>
                        {PADS.map(pad => (
                            <Box
                                key={pad.id}
                                onClick={() => handlePad(pad.id)}
                                sx={{
                                    aspectRatio: '1 / 1',
                                    borderRadius: '16px',
                                    bgcolor: pad.color,
                                    opacity: active === pad.id ? 1 : 0.32,
                                    boxShadow: active === pad.id ? `0 0 30px ${pad.color}` : 'none',
                                    cursor: phase === 'input' ? 'pointer' : 'default',
                                    transition: 'opacity 0.15s, box-shadow 0.15s, transform 0.1s',
                                    '&:active': phase === 'input' ? { transform: 'scale(0.97)' } : {},
                                }}
                            />
                        ))}
                    </Box>

                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Typography variant="body1" sx={{ mb: 1.5, color: phase === 'over' ? theme.palette.error.main : 'text.secondary' }}>
                            {statusText}
                        </Typography>
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

export default SimonSays;
