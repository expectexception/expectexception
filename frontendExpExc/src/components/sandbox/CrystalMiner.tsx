import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, ButtonBase, Card,
    CardContent, Stack, Typography, useTheme,
} from '@mui/material';
import { Bolt, Diamond, ExpandMore, Paid, Speed, WarningAmber } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import { useIsPlayModeDevice } from './shared/useFullscreenPlayMode';

const FAQ: { question: string; answer: string }[] = [
    {
        question: 'How is offline progress calculated?',
        answer: 'Every save records the exact moment it was written. The next time the page loads, it compares that timestamp to right now, multiplies the gap by your passive shards-per-second rate at the time you left, and adds the result as a lump sum with a "while you were away" summary. The gap is capped at 8 hours so a save from last week does not hand you weeks of income at once, and so nudging your system clock forward is not a useful way to farm progress.',
    },
    {
        question: 'How do upgrade costs scale?',
        answer: 'Each upgrade has a base cost that rises by about 15-18% every time you buy another one of that same upgrade, compounding: the first Hand Drill is cheap, the tenth is a lot more than ten times the price of the first. That curve is what keeps the game feeling like it has room to grow rather than being solved by buying one thing forever.',
    },
    {
        question: 'Click power or passive income - which matters more?',
        answer: 'Click power only pays while you are actively tapping the crystal, so it is strongest early and in short bursts. Passive upgrades earn shards every second whether you are looking at the screen or not, including while the tab is in the background, so they end up carrying most of your long-run income once you have a few tiers of them running.',
    },
    {
        question: 'Where is my progress saved?',
        answer: 'Entirely in this browser\'s local storage - nothing is sent anywhere. That means it survives closing the tab and reopening it, but clearing your browser\'s site data, using a different browser, or switching devices will lose it. There is no account system behind this game to recover a save from.',
    },
];

const SAVE_KEY = 'sandbox_crystal_miner_save';
const AUTOSAVE_MS = 5000;
const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

type UpgradeKind = 'click' | 'passive';

interface UpgradeDef {
    id: string;
    name: string;
    description: string;
    kind: UpgradeKind;
    power: number;
    baseCost: number;
    growth: number;
}

const UPGRADES: UpgradeDef[] = [
    { id: 'pick', name: 'Sturdier Pickaxe', description: '+1 shard per click', kind: 'click', power: 1, baseCost: 15, growth: 1.15 },
    { id: 'gloves', name: 'Reinforced Gloves', description: '+3 shards per click', kind: 'click', power: 3, baseCost: 100, growth: 1.17 },
    { id: 'drill', name: 'Hand Drill', description: '+1 shard/sec', kind: 'passive', power: 1, baseCost: 50, growth: 1.15 },
    { id: 'cart', name: 'Mining Cart Crew', description: '+5 shards/sec', kind: 'passive', power: 5, baseCost: 400, growth: 1.16 },
    { id: 'excavator', name: 'Automated Excavator', description: '+25 shards/sec', kind: 'passive', power: 25, baseCost: 3000, growth: 1.18 },
];

const upgradeCost = (def: UpgradeDef, owned: number): number => Math.ceil(def.baseCost * Math.pow(def.growth, owned));

function formatNumber(n: number): string {
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    if (abs < 1000) return `${sign}${Math.floor(abs)}`;
    const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
    let value = abs;
    let unitIndex = -1;
    while (value >= 1000 && unitIndex < units.length - 1) {
        value /= 1000;
        unitIndex++;
    }
    const decimals = value < 10 ? 2 : value < 100 ? 1 : 0;
    return `${sign}${value.toFixed(decimals)}${units[unitIndex]}`;
}

interface SaveData {
    shards: number;
    owned: Record<string, number>;
    lastSaved: number;
}

const readSave = (): SaveData | null => {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return null;
        const data = parsed as Partial<SaveData>;
        if (typeof data.shards !== 'number' || typeof data.lastSaved !== 'number' || typeof data.owned !== 'object' || data.owned === null) {
            return null;
        }
        return { shards: data.shards, owned: data.owned as Record<string, number>, lastSaved: data.lastSaved };
    } catch {
        return null;
    }
};

const writeSave = (data: SaveData) => {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
        // localStorage unavailable - progress just stays in memory for this session.
    }
};

const computeRate = (owned: Record<string, number>, kind: UpgradeKind): number => UPGRADES
    .filter((u) => u.kind === kind)
    .reduce((sum, u) => sum + u.power * (owned[u.id] ?? 0), 0);

interface OfflineBanner { shards: number; seconds: number }

function loadInitialState(): { shards: number; owned: Record<string, number>; banner: OfflineBanner | null } {
    const save = readSave();
    if (!save) return { shards: 0, owned: {}, banner: null };

    const passiveRate = computeRate(save.owned, 'passive');
    const elapsedMs = Math.max(0, Math.min(Date.now() - save.lastSaved, OFFLINE_CAP_MS));
    const elapsedSeconds = elapsedMs / 1000;
    const earned = passiveRate * elapsedSeconds;

    return {
        shards: save.shards + earned,
        owned: save.owned,
        banner: earned >= 1 ? { shards: earned, seconds: elapsedSeconds } : null,
    };
}

const CrystalMiner: React.FC = () => {
    const theme = useTheme();
    const isPlayMode = useIsPlayModeDevice();
    const initial = useMemo(() => loadInitialState(), []);

    const [shards, setShards] = useState(initial.shards);
    const [owned, setOwned] = useState<Record<string, number>>(initial.owned);
    const [offlineBanner, setOfflineBanner] = useState<OfflineBanner | null>(initial.banner);
    const [confirmingReset, setConfirmingReset] = useState(false);
    const [popTick, setPopTick] = useState(0);

    const shardsRef = useRef(shards);
    const ownedRef = useRef(owned);
    useEffect(() => { shardsRef.current = shards; }, [shards]);
    useEffect(() => { ownedRef.current = owned; }, [owned]);

    const clickPower = useMemo(() => 1 + computeRate(owned, 'click'), [owned]);
    const passiveRate = useMemo(() => computeRate(owned, 'passive'), [owned]);
    const passiveRateRef = useRef(passiveRate);
    useEffect(() => { passiveRateRef.current = passiveRate; }, [passiveRate]);

    // Delta-time driven so income stays accurate even if the tab is
    // throttled in the background rather than assuming each tick fired on
    // schedule.
    const lastTickRef = useRef(performance.now());
    useEffect(() => {
        let raf: number;
        const loop = (now: number) => {
            const dtSec = (now - lastTickRef.current) / 1000;
            lastTickRef.current = now;
            if (dtSec > 0 && passiveRateRef.current > 0) {
                setShards((s) => s + passiveRateRef.current * dtSec);
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const saveNow = useCallback(() => {
        writeSave({ shards: shardsRef.current, owned: ownedRef.current, lastSaved: Date.now() });
    }, []);

    useEffect(() => {
        const interval = window.setInterval(saveNow, AUTOSAVE_MS);
        const onVisibility = () => { if (document.hidden) saveNow(); };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibility);
            saveNow();
        };
    }, [saveNow]);

    const onCrystalClick = useCallback(() => {
        setShards((s) => s + clickPower);
        setPopTick((t) => t + 1);
    }, [clickPower]);

    const buyUpgrade = useCallback((id: string) => {
        const def = UPGRADES.find((u) => u.id === id);
        if (!def) return;
        const currentOwned = owned[id] ?? 0;
        const cost = upgradeCost(def, currentOwned);
        if (shards < cost) return;
        setShards((s) => s - cost);
        setOwned((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    }, [owned, shards]);

    const resetProgress = useCallback(() => {
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch {
            // localStorage unavailable - nothing to clear.
        }
        setShards(0);
        setOwned({});
        setOfflineBanner(null);
        setConfirmingReset(false);
        lastTickRef.current = performance.now();
    }, []);

    return (
        <>
            <Seo
                gameId={51}
                title="Crystal Miner - A Free Idle Clicker Game"
                description="Play Crystal Miner online for free, an idle clicker game. Click the crystal for shards, buy click-power and passive-income upgrades with exponentially scaling costs, and keep earning while you're away - progress saves automatically in your browser."
                keywords={['idle clicker game', 'incremental game online', 'free idle game browser', 'clicker game upgrades', 'offline progress clicker']}
            />
            <GamePlayShell
                icon={Paid}
                title="Crystal Miner"
                subtitle="Click the crystal for shards, then spend them on upgrades that earn more, on their own, forever."
                maxWidth="sm"
            >
                {offlineBanner && (
                    <Card sx={{
                        mb: 2,
                        bgcolor: alpha(theme.palette.success.main, 0.12),
                        border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                        borderRadius: '14px',
                    }}>
                        <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Typography variant="body2" fontWeight={700} color="success.main">
                                While you were away ({Math.round(offlineBanner.seconds / 60)} min): +{formatNumber(offlineBanner.shards)} shards
                            </Typography>
                            <Button size="small" onClick={() => setOfflineBanner(null)}>Dismiss</Button>
                        </CardContent>
                    </Card>
                )}

                <Card sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 1.5, sm: 3 },
                }}>
                    <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                        <Typography sx={{ textAlign: 'center', fontWeight: 800, fontSize: '1.6rem', mb: 0.5 }}>
                            {formatNumber(shards)} shards
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
                            {formatNumber(clickPower)} per click &bull; {formatNumber(passiveRate)} per second
                        </Typography>

                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                            <ButtonBase
                                onClick={onCrystalClick}
                                sx={{
                                    width: 140,
                                    height: 140,
                                    borderRadius: '50%',
                                    bgcolor: alpha(theme.palette.info.main, 0.18),
                                    border: `3px solid ${alpha(theme.palette.info.main, 0.6)}`,
                                    boxShadow: `0 0 30px ${alpha(theme.palette.info.main, 0.35)}`,
                                    transition: 'transform 0.08s ease',
                                    '&:active': { transform: 'scale(0.94)' },
                                }}
                                aria-label="Mine the crystal"
                            >
                                <Diamond key={popTick % 2} sx={{ fontSize: 72, color: theme.palette.info.light }} />
                            </ButtonBase>
                        </Box>

                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                            Upgrades
                        </Typography>
                        <Stack spacing={1} sx={{ mb: 2 }}>
                            {UPGRADES.map((def) => {
                                const count = owned[def.id] ?? 0;
                                const cost = upgradeCost(def, count);
                                const affordable = shards >= cost;
                                return (
                                    <Box
                                        key={def.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 1,
                                            p: 1.25,
                                            borderRadius: '10px',
                                            bgcolor: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                            {def.kind === 'click' ? <Bolt fontSize="small" color="warning" /> : <Speed fontSize="small" color="info" />}
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} noWrap>
                                                    {def.name} {count > 0 && <Typography component="span" variant="caption" color="text.secondary">x{count}</Typography>}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {def.description}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Button
                                            size="small"
                                            variant={affordable ? 'contained' : 'outlined'}
                                            disabled={!affordable}
                                            onClick={() => buyUpgrade(def.id)}
                                            sx={{ flexShrink: 0 }}
                                        >
                                            {formatNumber(cost)}
                                        </Button>
                                    </Box>
                                );
                            })}
                        </Stack>

                        {!confirmingReset ? (
                            <Button
                                size="small"
                                color="error"
                                variant="text"
                                startIcon={<WarningAmber />}
                                onClick={() => setConfirmingReset(true)}
                            >
                                Reset progress
                            </Button>
                        ) : (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="text.secondary">Erase all progress?</Typography>
                                <Button size="small" color="error" variant="contained" onClick={resetProgress}>Yes, reset</Button>
                                <Button size="small" onClick={() => setConfirmingReset(false)}>Cancel</Button>
                            </Stack>
                        )}
                    </CardContent>
                </Card>

                {!isPlayMode && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                            Frequently asked questions
                        </Typography>
                        <Stack spacing={1}>
                            {FAQ.map((item, i) => (
                                <Accordion
                                    key={i}
                                    disableGutters
                                    sx={{
                                        bgcolor: alpha('#fff', 0.02),
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px !important',
                                        '&:before': { display: 'none' },
                                    }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="body2" fontWeight={700}>{item.question}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Typography variant="body2" color="text.secondary">{item.answer}</Typography>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Stack>
                    </Box>
                )}
            </GamePlayShell>
        </>
    );
};

export default CrystalMiner;
