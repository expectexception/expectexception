import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography, useTheme } from '@mui/material';
import { Keyboard, Refresh } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const BEST_KEY = 'sandbox_typing_best_wpm';

const SENTENCES = [
    'The quick brown fox jumps over the lazy dog while the sun sets behind the hills.',
    'Clean code always looks like it was written by someone who cares about the next reader.',
    'A good developer writes code that a human can understand, not just a machine can run.',
    'Ship small, ship often, and never let a green test suite lull you into false confidence.',
    'Simplicity is the ultimate sophistication, especially when the deadline is closing in fast.',
    'Every millisecond of latency you remove is a small gift to every user who ever visits.',
    'Great interfaces feel obvious in hindsight but take real effort and taste to design well.',
];

const pickSentence = () => SENTENCES[Math.floor(Math.random() * SENTENCES.length)];

const loadBest = (): number => {
    try {
        const n = Number(localStorage.getItem(BEST_KEY));
        return Number.isFinite(n) ? n : 0;
    } catch {
        return 0;
    }
};

const TypingTest: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [target, setTarget] = useState<string>(pickSentence);
    const [typed, setTyped] = useState('');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [done, setDone] = useState(false);
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [best, setBest] = useState<number>(() => loadBest());
    const inputRef = useRef<HTMLInputElement>(null);

    const reset = useCallback(() => {
        setTarget(pickSentence());
        setTyped('');
        setStartTime(null);
        setDone(false);
        setWpm(0);
        setAccuracy(100);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, []);

    const finish = useCallback((finalTyped: string, started: number) => {
        const minutes = (Date.now() - started) / 60000;
        const words = finalTyped.trim().split(/\s+/).length;
        const grossWpm = Math.max(0, Math.round(words / Math.max(minutes, 1 / 600)));
        let correct = 0;
        for (let i = 0; i < finalTyped.length; i++) if (finalTyped[i] === target[i]) correct += 1;
        const acc = finalTyped.length ? Math.round((correct / finalTyped.length) * 100) : 100;
        // Net WPM penalises errors so it can't be gamed by mashing keys.
        const netWpm = Math.max(0, Math.round(grossWpm * (acc / 100)));
        setWpm(netWpm);
        setAccuracy(acc);
        setDone(true);
        if (netWpm > best) {
            setBest(netWpm);
            try { localStorage.setItem(BEST_KEY, String(netWpm)); } catch { /* ignore */ }
        }
    }, [target, best]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (done) return;
        const value = e.target.value.slice(0, target.length);
        let started = startTime;
        if (started === null && value.length > 0) {
            started = Date.now();
            setStartTime(started);
        }
        setTyped(value);
        if (value.length === target.length && started !== null) finish(value, started);
    }, [done, target.length, startTime, finish]);

    const progress = Math.round((typed.length / target.length) * 100);
    const liveWpm = useMemo(() => {
        if (!startTime || typed.length === 0) return 0;
        const minutes = (Date.now() - startTime) / 60000;
        return Math.round((typed.trim().split(/\s+/).length) / Math.max(minutes, 1 / 600));
    }, [startTime, typed]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                title="Typing Speed Test — Free WPM Test Online"
                keywords={['typing speed test', 'wpm test', 'typing test online free', 'words per minute test', 'keyboard speed test', 'typing practice']}
            />
            <ServicePageHero
                icon={Keyboard}
                title="Typing Speed Test"
                subtitle="Type the sentence as fast and accurately as you can. Your net WPM and accuracy are scored at the end."
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
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="body1"><strong>{done ? wpm : liveWpm}</strong> WPM</Typography>
                        <Typography variant="body1" color="text.secondary">{progress}%</Typography>
                        <Typography variant="body1" color="text.secondary">Best: {best}</Typography>
                    </Stack>

                    {/* Target text with per-character correctness colouring */}
                    <Box sx={{
                        p: 2,
                        borderRadius: '12px',
                        bgcolor: 'rgba(255,255,255,0.03)',
                        fontFamily: 'monospace',
                        fontSize: { xs: '1rem', sm: '1.15rem' },
                        lineHeight: 1.7,
                        mb: 2,
                        letterSpacing: '0.02em',
                    }}>
                        {target.split('').map((ch, i) => {
                            let color = 'rgba(255,255,255,0.35)';
                            let bg = 'transparent';
                            if (i < typed.length) color = typed[i] === ch ? primary : theme.palette.error.main;
                            if (i === typed.length && !done) bg = 'rgba(255,255,255,0.15)';
                            return (
                                <Box component="span" key={i} sx={{ color, bgcolor: bg, borderRadius: '2px' }}>
                                    {ch}
                                </Box>
                            );
                        })}
                    </Box>

                    <input
                        ref={inputRef}
                        value={typed}
                        onChange={handleChange}
                        disabled={done}
                        autoFocus
                        placeholder="Click here and start typing…"
                        aria-label="Typing input"
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.02)',
                            color: '#fff',
                            fontSize: '1rem',
                            fontFamily: 'monospace',
                            outline: 'none',
                        }}
                    />

                    {done && (
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: primary }}>
                                {wpm} WPM · {accuracy}% accuracy
                            </Typography>
                            <Button variant="contained" startIcon={<Refresh />} onClick={reset} sx={{ mt: 2 }}>
                                Try another sentence
                            </Button>
                        </Box>
                    )}
                    {!done && (
                        <Button size="small" startIcon={<Refresh />} onClick={reset} sx={{ mt: 1.5 }}>
                            New sentence
                        </Button>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default TypingTest;
