import React, { useCallback, useEffect, useState } from 'react';
import {
    Box, Button, Card, CardContent, Chip, Container, Stack, Typography,
    ToggleButton, ToggleButtonGroup, useTheme,
} from '@mui/material';
import { Stairs } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const STATS_KEY = 'sandbox_hanoi_stats';
const MIN_DISKS = 3;
const MAX_DISKS = 7;
const DEFAULT_DISKS = 4;
const PEG_COUNT = 3;
const TARGET_PEG = 2;

type Pegs = number[][]; // each peg: array of disk sizes, index 0 = bottom, last = top

const buildPegs = (diskCount: number): Pegs => {
    const first = Array.from({ length: diskCount }, (_, i) => diskCount - i); // [n, n-1, ..., 1]
    return [first, [], []];
};

const optimalMoves = (diskCount: number): number => 2 ** diskCount - 1;

type BestByDiskCount = Record<number, number>;

const readBest = (): BestByDiskCount => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeBest = (stats: BestByDiskCount) => {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
        // ignore storage errors
    }
};

interface RejectedMove {
    from: number;
    to: number;
    key: number;
}

const TowerOfHanoi: React.FC = () => {
    const theme = useTheme();
    const [diskCount, setDiskCount] = useState(DEFAULT_DISKS);
    const [pegs, setPegs] = useState<Pegs>(() => buildPegs(DEFAULT_DISKS));
    const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
    const [moveCount, setMoveCount] = useState(0);
    const [solved, setSolved] = useState(false);
    const [rejected, setRejected] = useState<RejectedMove | null>(null);
    const [best, setBest] = useState<BestByDiskCount>(() => readBest());

    // Auto-clear the rejection message/shake a moment after it fires.
    useEffect(() => {
        if (!rejected) return undefined;
        const timeoutId = window.setTimeout(() => setRejected(null), 900);
        return () => window.clearTimeout(timeoutId);
    }, [rejected]);

    const resetGame = useCallback((nextDiskCount: number) => {
        setDiskCount(nextDiskCount);
        setPegs(buildPegs(nextDiskCount));
        setSelectedPeg(null);
        setMoveCount(0);
        setSolved(false);
        setRejected(null);
    }, []);

    const handlePegClick = useCallback((pegIndex: number) => {
        if (solved) return;

        if (selectedPeg === null) {
            if (pegs[pegIndex].length === 0) return;
            setSelectedPeg(pegIndex);
            return;
        }

        if (selectedPeg === pegIndex) {
            setSelectedPeg(null);
            return;
        }

        const fromPeg = pegs[selectedPeg];
        const disk = fromPeg[fromPeg.length - 1];
        const toPeg = pegs[pegIndex];
        const topOfTarget = toPeg[toPeg.length - 1];

        if (topOfTarget !== undefined && topOfTarget < disk) {
            setRejected({ from: selectedPeg, to: pegIndex, key: Date.now() });
            setSelectedPeg(null);
            return;
        }

        const nextPegs = pegs.map((peg) => peg.slice());
        nextPegs[selectedPeg].pop();
        nextPegs[pegIndex].push(disk);
        setPegs(nextPegs);
        setSelectedPeg(null);

        const nextMoveCount = moveCount + 1;
        setMoveCount(nextMoveCount);

        if (nextPegs[TARGET_PEG].length === diskCount) {
            setSolved(true);
            setBest((prev) => {
                const current = prev[diskCount];
                if (current === undefined || nextMoveCount < current) {
                    const next = { ...prev, [diskCount]: nextMoveCount };
                    writeBest(next);
                    return next;
                }
                return prev;
            });
        }
    }, [selectedPeg, pegs, solved, moveCount, diskCount]);

    const diskColor = useCallback((size: number): string => {
        const solids = [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.success.main,
            theme.palette.warning.main,
            theme.palette.info.main,
            theme.palette.error.main,
        ];
        return solids[(size - 1) % solids.length];
    }, [theme]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                title="Tower of Hanoi - Free Online Disk Puzzle Game"
                keywords={['tower of hanoi', 'hanoi puzzle online', 'disk puzzle game', 'classic logic puzzle', 'brain teaser game']}
            />
            <ServicePageHero
                icon={Stairs}
                title="Tower of Hanoi"
                subtitle="Move the whole stack from the first peg to the last, one disk at a time - and never place a bigger disk on a smaller one."
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
                    <Stack direction="row" justifyContent="center" sx={{ mb: 3 }}>
                        <ToggleButtonGroup
                            value={diskCount}
                            exclusive
                            onChange={(_, value) => value && resetGame(value)}
                            size="small"
                            sx={{
                                '& .MuiToggleButtonGroup-grouped': {
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px !important',
                                    mx: 0.5,
                                },
                            }}
                        >
                            {Array.from({ length: MAX_DISKS - MIN_DISKS + 1 }, (_, i) => MIN_DISKS + i).map((n) => (
                                <ToggleButton key={n} value={n} sx={{ px: 2, textTransform: 'none' }}>
                                    {n} disks
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" gap={1}>
                        <Chip size="small" label={`Moves: ${moveCount}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                        <Chip size="small" label={`Optimal: ${optimalMoves(diskCount)}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                        <Typography variant="body2" color="text.secondary">
                            Best: {best[diskCount] !== undefined ? `${best[diskCount]} moves` : '—'}
                        </Typography>
                    </Stack>

                    <Box sx={{ minHeight: 32, textAlign: 'center', mb: 1 }}>
                        <AnimatePresence mode="wait">
                            {rejected && (
                                <motion.div
                                    key={rejected.key}
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Typography variant="body2" sx={{ color: theme.palette.error.main, fontWeight: 700 }}>
                                        You can't place a bigger disk on a smaller one!
                                    </Typography>
                                </motion.div>
                            )}
                            {!rejected && solved && (
                                <motion.div
                                    key="solved"
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                        Solved in {moveCount} moves (optimal: {optimalMoves(diskCount)})!
                                    </Typography>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Box>

                    <Stack direction="row" spacing={{ xs: 1, sm: 2 }} justifyContent="center" sx={{ mb: 3 }}>
                        {Array.from({ length: PEG_COUNT }, (_, pegIndex) => {
                            const peg = pegs[pegIndex];
                            const isSelected = selectedPeg === pegIndex;
                            const isShaking = rejected?.to === pegIndex;
                            return (
                                <Box
                                    key={pegIndex}
                                    onClick={() => handlePegClick(pegIndex)}
                                    sx={{
                                        width: { xs: 96, sm: 140 },
                                        height: 240,
                                        position: 'relative',
                                        cursor: 'pointer',
                                        borderRadius: 2,
                                        bgcolor: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                                        border: isSelected
                                            ? `1px dashed ${theme.palette.primary.main}`
                                            : '1px dashed transparent',
                                        transition: 'background-color 0.2s ease, border-color 0.2s ease',
                                    }}
                                >
                                    {/* rod */}
                                    <Box sx={{
                                        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                                        width: 8, height: 200, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1,
                                    }} />
                                    {/* base */}
                                    <Box sx={{
                                        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                                        width: '85%', height: 12, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1,
                                    }} />

                                    <Box
                                        component={isShaking ? motion.div : 'div'}
                                        key={isShaking ? `shake-${rejected!.key}` : undefined}
                                        animate={isShaking ? { x: [0, -8, 8, -8, 8, 0] } : undefined}
                                        transition={{ duration: 0.4 }}
                                        sx={{
                                            position: 'absolute',
                                            bottom: 12,
                                            left: 0,
                                            right: 0,
                                            display: 'flex',
                                            flexDirection: 'column-reverse',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        {peg.map((size) => (
                                            <motion.div
                                                key={size}
                                                layout
                                                layoutId={`disk-${size}`}
                                                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                            >
                                                <Box sx={{
                                                    width: { xs: 24 + size * 9, sm: 32 + size * 13 },
                                                    height: 22,
                                                    borderRadius: '6px',
                                                    bgcolor: diskColor(size),
                                                    border: '1px solid rgba(0,0,0,0.25)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    color: theme.palette.getContrastText(diskColor(size)),
                                                }}>
                                                    {size}
                                                </Box>
                                            </motion.div>
                                        ))}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Stack>

                    <Button fullWidth variant="outlined" onClick={() => resetGame(diskCount)}>
                        {solved ? 'Play Again' : 'Restart'}
                    </Button>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                        Click a peg to pick up its top disk, then click another peg to drop it there.
                    </Typography>
                </CardContent>
            </Card>
        </Container>
    );
};

export default TowerOfHanoi;
