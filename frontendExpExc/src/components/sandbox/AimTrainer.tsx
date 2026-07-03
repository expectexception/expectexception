import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Container, Typography, Button, useTheme } from '@mui/material';
import { GpsFixed } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const BEST_KEY = 'sandbox_aim_trainer_best';
const SESSION_MS = 30000;
const TARGET_LIFETIME_MS = 1500;
const TARGET_SIZE = 42; // px
const PLAY_AREA_HEIGHT = 400; // px

type GameState = 'idle' | 'playing' | 'finished';

interface TargetPos {
    x: number; // px from left
    y: number; // px from top
}

interface BestRecord {
    accuracy: number;
    hits: number;
}

const loadBest = (): BestRecord | null => {
    try {
        const raw = localStorage.getItem(BEST_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.accuracy === 'number' && typeof parsed?.hits === 'number') {
            return parsed as BestRecord;
        }
        return null;
    } catch {
        return null;
    }
};

const saveBest = (record: BestRecord) => {
    try {
        localStorage.setItem(BEST_KEY, JSON.stringify(record));
    } catch {
        // ignore storage failures (e.g. private mode)
    }
};

/** A new best beats the previous one if accuracy is higher, or accuracy ties
 * and more hits were recorded (more attempts at the same precision). */
const isNewBest = (candidate: BestRecord, current: BestRecord | null): boolean => {
    if (!current) return true;
    if (candidate.accuracy > current.accuracy) return true;
    if (candidate.accuracy === current.accuracy && candidate.hits > current.hits) return true;
    return false;
};

const AimTrainer: React.FC = () => {
    const theme = useTheme();

    const [state, setState] = useState<GameState>('idle');
    const [target, setTarget] = useState<TargetPos | null>(null);
    const [hits, setHits] = useState(0);
    const [misses, setMisses] = useState(0);
    const [reactionTimes, setReactionTimes] = useState<number[]>([]);
    const [timeLeft, setTimeLeft] = useState(SESSION_MS / 1000);
    const [best, setBest] = useState<BestRecord | null>(() => loadBest());
    const [justBeatBest, setJustBeatBest] = useState(false);

    const playAreaRef = useRef<HTMLDivElement | null>(null);
    const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const targetSpawnedAtRef = useRef<number>(0);

    const clearAllTimers = useCallback(() => {
        if (spawnTimerRef.current !== null) {
            clearTimeout(spawnTimerRef.current);
            spawnTimerRef.current = null;
        }
        if (sessionTimerRef.current !== null) {
            clearTimeout(sessionTimerRef.current);
            sessionTimerRef.current = null;
        }
        if (tickIntervalRef.current !== null) {
            clearInterval(tickIntervalRef.current);
            tickIntervalRef.current = null;
        }
    }, []);

    // Clean up all timers on unmount.
    useEffect(() => {
        return () => clearAllTimers();
    }, [clearAllTimers]);

    const randomPosition = useCallback((): TargetPos => {
        const el = playAreaRef.current;
        const width = el?.clientWidth ?? 600;
        const height = PLAY_AREA_HEIGHT;
        const maxX = Math.max(width - TARGET_SIZE, 0);
        const maxY = Math.max(height - TARGET_SIZE, 0);
        return {
            x: Math.random() * maxX,
            y: Math.random() * maxY,
        };
    }, []);

    const spawnTarget = useCallback(() => {
        if (spawnTimerRef.current !== null) {
            clearTimeout(spawnTimerRef.current);
            spawnTimerRef.current = null;
        }
        targetSpawnedAtRef.current = performance.now();
        setTarget(randomPosition());

        spawnTimerRef.current = setTimeout(() => {
            // Target expired without being clicked - counts as a miss.
            setMisses((m) => m + 1);
            spawnTarget();
        }, TARGET_LIFETIME_MS);
    }, [randomPosition]);

    const endSession = useCallback(() => {
        clearAllTimers();
        setTarget(null);
        setState('finished');
    }, [clearAllTimers]);

    // Compute and persist best record whenever a session finishes.
    useEffect(() => {
        if (state !== 'finished') return;
        const total = hits + misses;
        const accuracy = total > 0 ? Math.round((hits / total) * 1000) / 10 : 0;
        const candidate: BestRecord = { accuracy, hits };
        if (isNewBest(candidate, best)) {
            setBest(candidate);
            saveBest(candidate);
            setJustBeatBest(true);
        } else {
            setJustBeatBest(false);
        }
        // Only run this once per finished session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    const startSession = useCallback(() => {
        clearAllTimers();
        setHits(0);
        setMisses(0);
        setReactionTimes([]);
        setJustBeatBest(false);
        setTimeLeft(SESSION_MS / 1000);
        setState('playing');

        sessionTimerRef.current = setTimeout(() => {
            endSession();
        }, SESSION_MS);

        tickIntervalRef.current = setInterval(() => {
            setTimeLeft((t) => (t > 0 ? t - 1 : 0));
        }, 1000);

        spawnTarget();
    }, [clearAllTimers, endSession, spawnTarget]);

    const handleTargetClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (state !== 'playing') return;
        const reactionTime = performance.now() - targetSpawnedAtRef.current;
        setReactionTimes((prev) => [...prev, reactionTime]);
        setHits((h) => h + 1);
        spawnTarget();
    }, [state, spawnTarget]);

    const totalAttempts = hits + misses;
    const accuracy = totalAttempts > 0 ? Math.round((hits / totalAttempts) * 1000) / 10 : 0;
    const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((sum, v) => sum + v, 0) / reactionTimes.length)
        : null;

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Aim Trainer - Free Online Reflex Game" />
            <ServicePageHero
                icon={GpsFixed}
                title="Aim Trainer"
                subtitle="Click the targets as fast as you can. You have 30 seconds - how many can you hit?"
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Time left
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {state === 'playing' ? `${timeLeft}s` : '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Hits
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {hits}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Misses
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {misses}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Best
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                                {best ? `${best.accuracy}% / ${best.hits} hits` : '—'}
                            </Typography>
                        </Box>
                    </Box>

                    <Box
                        ref={playAreaRef}
                        sx={{
                            position: 'relative',
                            height: PLAY_AREA_HEIGHT,
                            borderRadius: '16px',
                            bgcolor: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                            mb: 3,
                        }}
                    >
                        {state !== 'playing' && (
                            <Box sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                textAlign: 'center',
                                px: 2,
                            }}>
                                {state === 'finished' && (
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                            {justBeatBest ? 'New best!' : 'Session complete'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {hits} hits, {misses} misses, {accuracy}% accuracy
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Avg reaction: {avgReaction !== null ? `${avgReaction} ms` : '—'}
                                        </Typography>
                                    </Box>
                                )}
                                {state === 'idle' && (
                                    <Typography variant="body1" color="text.secondary">
                                        Press start and hit as many targets as you can in 30 seconds.
                                    </Typography>
                                )}
                                <Button variant="contained" onClick={startSession}>
                                    {state === 'finished' ? 'Play Again' : 'Start'}
                                </Button>
                            </Box>
                        )}

                        {state === 'playing' && target && (
                            <Box
                                onClick={handleTargetClick}
                                sx={{
                                    position: 'absolute',
                                    left: target.x,
                                    top: target.y,
                                    width: TARGET_SIZE,
                                    height: TARGET_SIZE,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    boxShadow: `0 0 16px ${theme.palette.primary.main}`,
                                    cursor: 'pointer',
                                    border: '2px solid rgba(255,255,255,0.4)',
                                }}
                            />
                        )}
                    </Box>

                    {state === 'playing' && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                            Accuracy so far: {accuracy}%
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default AimTrainer;
