import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Container, Typography, useTheme } from '@mui/material';
import { Bolt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const BEST_KEY = 'sandbox_reaction_test_best_ms';
const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 4500;
const HISTORY_SIZE = 5;

type GameState = 'idle' | 'waiting' | 'go' | 'result' | 'tooSoon';

const loadBest = (): number | null => {
    try {
        const raw = localStorage.getItem(BEST_KEY);
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const saveBest = (ms: number) => {
    try {
        localStorage.setItem(BEST_KEY, String(ms));
    } catch {
        // ignore storage failures (e.g. private mode)
    }
};

const ReactionTest: React.FC = () => {
    const theme = useTheme();

    const [state, setState] = useState<GameState>('idle');
    const [lastResult, setLastResult] = useState<number | null>(null);
    const [history, setHistory] = useState<number[]>([]);
    const [best, setBest] = useState<number | null>(() => loadBest());

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const goAtRef = useRef<number>(0);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => clearTimer();
    }, [clearTimer]);

    const startWaiting = useCallback(() => {
        clearTimer();
        setState('waiting');
        const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
        timerRef.current = setTimeout(() => {
            goAtRef.current = performance.now();
            setState('go');
        }, delay);
    }, [clearTimer]);

    const handleBoxClick = useCallback(() => {
        if (state === 'idle' || state === 'result' || state === 'tooSoon') {
            startWaiting();
            return;
        }

        if (state === 'waiting') {
            // Clicked before the color change.
            clearTimer();
            setState('tooSoon');
            return;
        }

        if (state === 'go') {
            const elapsed = Math.round(performance.now() - goAtRef.current);
            setLastResult(elapsed);
            setHistory((prev) => {
                const next = [elapsed, ...prev].slice(0, HISTORY_SIZE);
                return next;
            });
            if (best === null || elapsed < best) {
                setBest(elapsed);
                saveBest(elapsed);
            }
            setState('result');
        }
    }, [state, startWaiting, clearTimer, best]);

    const average = history.length > 0
        ? Math.round(history.reduce((sum, v) => sum + v, 0) / history.length)
        : null;

    let boxLabel: string;
    let boxBg: string;

    switch (state) {
        case 'idle':
            boxLabel = 'Click to start';
            boxBg = 'rgba(255,255,255,0.06)';
            break;
        case 'waiting':
            boxLabel = 'Wait for green...';
            boxBg = theme.palette.error.main;
            break;
        case 'go':
            boxLabel = 'Click!';
            boxBg = theme.palette.success.main;
            break;
        case 'tooSoon':
            boxLabel = 'Too soon! Click to try again';
            boxBg = theme.palette.warning.main;
            break;
        case 'result':
            boxLabel = `${lastResult} ms — click to try again`;
            boxBg = theme.palette.primary.main;
            break;
        default:
            boxLabel = 'Click to start';
            boxBg = 'rgba(255,255,255,0.06)';
    }

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo title="Reaction Time Test - Free Online Game" />
            <ServicePageHero
                icon={Bolt}
                title="Reaction Test"
                subtitle="Measure how fast you react. Click when the box turns green - but not before!"
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
                    <Box
                        onClick={handleBoxClick}
                        sx={{
                            height: 260,
                            borderRadius: '16px',
                            bgcolor: boxBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            userSelect: 'none',
                            textAlign: 'center',
                            px: 2,
                            mb: 3,
                            transition: state === 'go' ? 'none' : 'background-color 0.15s ease',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <Typography variant="h5" sx={{ fontWeight: 700, color: state === 'idle' ? 'text.secondary' : '#fff' }}>
                            {boxLabel}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Best
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {best !== null ? `${best} ms` : '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Average (last {history.length || 0})
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {average !== null ? `${average} ms` : '—'}
                            </Typography>
                        </Box>
                    </Box>

                    {history.length > 0 && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Recent attempts
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {history.map((ms, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: '8px',
                                            bgcolor: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            fontFamily: 'monospace',
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        {ms} ms
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default ReactionTest;
