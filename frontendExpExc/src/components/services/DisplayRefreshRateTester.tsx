import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box, Card, Typography, Grid, Paper, Stack, Button, Chip, LinearProgress, Alert, useTheme,
} from '@mui/material';
import { Monitor, PlayArrow, Warning } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * How this works: requestAnimationFrame callbacks fire right before the
 * browser paints a frame, so the gap between two consecutive callback
 * timestamps is the real interval the display is being driven at (about
 * 16.67ms at 60Hz, 8.33ms at 120Hz, 6.94ms at 144Hz). That is a genuine,
 * well-known timing technique, not a simulation - the numbers below come
 * directly from the deltas collected during the run.
 * ------------------------------------------------------------------ */
const TEST_DURATION_MS = 3000;
const WARMUP_FRAMES = 8; // discard early frames while layout/JIT settle
const UI_UPDATE_INTERVAL_MS = 200; // throttle the live readout to a few times/sec
const ROLLING_WINDOW_SIZE = 15; // frames averaged for the live readout
const COMMON_RATES = [60, 75, 90, 120, 144, 165, 240];
const HISTOGRAM_BIN_COUNT = 16;

type TestStatus = 'idle' | 'running' | 'complete' | 'aborted';

interface Histogram {
    bins: number[];
    binWidth: number;
    min: number;
}

interface RefreshRateResults {
    rawRate: number;
    roundedRate: number;
    frameCount: number;
    minDelta: number;
    maxDelta: number;
    medianDelta: number;
    stdDevDelta: number;
    droppedFrames: number;
    histogram: Histogram;
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function standardDeviation(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

function nearestCommonRate(rate: number): number {
    return COMMON_RATES.reduce((closest, candidate) =>
        Math.abs(candidate - rate) < Math.abs(closest - rate) ? candidate : closest, COMMON_RATES[0]);
}

function buildHistogram(deltas: number[], binCount = HISTOGRAM_BIN_COUNT): Histogram {
    if (deltas.length === 0) return { bins: [], binWidth: 0, min: 0 };
    const min = Math.min(...deltas);
    const max = Math.max(...deltas);
    const range = Math.max(max - min, 0.01);
    const binWidth = range / binCount;
    const bins = new Array(binCount).fill(0);
    deltas.forEach((d) => {
        let idx = Math.floor((d - min) / binWidth);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        bins[idx] += 1;
    });
    return { bins, binWidth, min };
}

function StatTile({ label, value }: { label: string; value: string }) {
    return (
        <Paper sx={{
            p: 1.5, textAlign: 'center', borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
        }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
                {label}
            </Typography>
            <Typography variant="h6" fontWeight={800}>{value}</Typography>
        </Paper>
    );
}

const DisplayRefreshRateTester: React.FC = () => {
    const theme = useTheme();

    const [status, setStatus] = useState<TestStatus>('idle');
    const [liveFps, setLiveFps] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [results, setResults] = useState<RefreshRateResults | null>(null);

    const rafIdRef = useRef<number | null>(null);
    const deltasRef = useRef<number[]>([]);
    const recentDeltasRef = useRef<number[]>([]);
    const lastTimestampRef = useRef(0);
    const measureStartRef = useRef(0);
    const frameCountRef = useRef(0);
    const lastUiUpdateRef = useRef(0);
    const visibilityHandlerRef = useRef<(() => void) | null>(null);

    const cleanup = useCallback(() => {
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        if (visibilityHandlerRef.current) {
            document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
            visibilityHandlerRef.current = null;
        }
    }, []);

    useEffect(() => cleanup, [cleanup]);

    const startTest = useCallback(() => {
        cleanup();
        setResults(null);
        setLiveFps(0);
        setElapsedMs(0);
        setStatus('running');

        deltasRef.current = [];
        recentDeltasRef.current = [];
        lastTimestampRef.current = 0;
        measureStartRef.current = 0;
        frameCountRef.current = 0;
        lastUiUpdateRef.current = 0;

        const finish = () => {
            cleanup();
            const deltas = deltasRef.current;
            const mean = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
            const med = median(deltas);
            const rawRate = med > 0 ? 1000 / med : 0;
            setResults({
                rawRate,
                roundedRate: nearestCommonRate(rawRate),
                frameCount: deltas.length,
                minDelta: deltas.length ? Math.min(...deltas) : 0,
                maxDelta: deltas.length ? Math.max(...deltas) : 0,
                medianDelta: med,
                stdDevDelta: standardDeviation(deltas, mean),
                droppedFrames: deltas.filter((d) => d > med * 1.5).length,
                histogram: buildHistogram(deltas),
            });
            setStatus('complete');
        };

        const abort = () => {
            cleanup();
            setStatus('aborted');
        };

        const handleVisibilityChange = () => {
            if (document.hidden) abort();
        };
        visibilityHandlerRef.current = handleVisibilityChange;
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const loop = (timestamp: number) => {
            if (document.hidden) {
                abort();
                return;
            }
            frameCountRef.current += 1;

            if (lastTimestampRef.current !== 0 && frameCountRef.current > WARMUP_FRAMES) {
                const delta = timestamp - lastTimestampRef.current;
                if (measureStartRef.current === 0) measureStartRef.current = timestamp;
                deltasRef.current.push(delta);
                recentDeltasRef.current.push(delta);
                if (recentDeltasRef.current.length > ROLLING_WINDOW_SIZE) recentDeltasRef.current.shift();

                if (timestamp - lastUiUpdateRef.current > UI_UPDATE_INTERVAL_MS) {
                    lastUiUpdateRef.current = timestamp;
                    const avgDelta = recentDeltasRef.current.reduce((a, b) => a + b, 0) / recentDeltasRef.current.length;
                    setLiveFps(avgDelta > 0 ? 1000 / avgDelta : 0);
                    setElapsedMs(timestamp - measureStartRef.current);
                }
            }
            lastTimestampRef.current = timestamp;

            const measuredElapsed = measureStartRef.current ? timestamp - measureStartRef.current : 0;
            if (measuredElapsed >= TEST_DURATION_MS) {
                finish();
            } else {
                rafIdRef.current = requestAnimationFrame(loop);
            }
        };

        rafIdRef.current = requestAnimationFrame(loop);
    }, [cleanup]);

    const progressPct = Math.min(100, (elapsedMs / TEST_DURATION_MS) * 100);
    const maxBinCount = results ? Math.max(...results.histogram.bins, 1) : 1;

    const about = "This tool measures your monitor's real refresh rate by timing requestAnimationFrame callbacks, the same browser scheduling API that drives on-screen animation, rather than reading any hardware descriptor. Each callback lands right before the browser paints a new frame, so the gap between consecutive callback timestamps is the actual interval your display is running at: roughly 16.67ms on a 60Hz panel, 8.33ms on 120Hz, or 6.94ms on 144Hz. The test throws away the first several frames to let the rendering pipeline settle, then collects about three seconds of timing data and reports the raw measured rate alongside the nearest common refresh rate it rounds to. This only works correctly while the tab stays focused and visible, since browsers deliberately slow down animation frames in background tabs to save power. If that happens mid-run, the test aborts rather than reporting a corrupted number.";

    const howToSteps = [
        { name: 'Keep this tab focused', text: 'Stay on this browser tab for the whole run. Switching away mid-test will abort the measurement.' },
        { name: 'Click Start Test', text: 'A short warm-up period is discarded automatically, then the tool measures for about three seconds.' },
        { name: 'Watch the live reading', text: 'A rolling frames-per-second number updates a few times a second while the test is in progress.' },
        { name: 'Read the results', text: 'You get the raw measured rate, the nearest common refresh rate, frame-time stats (min, max, median, standard deviation, dropped frames), and a histogram of the distribution.' },
    ];

    const faq = [
        {
            question: 'Is this reading my monitor\'s actual hardware specs?',
            answer: 'No. Browsers don\'t expose EDID or other hardware descriptors to web pages. This is an empirical timing measurement of how fast the browser\'s compositor is actually delivering frames, which in practice tracks your display\'s real refresh rate closely.',
        },
        {
            question: 'Why is the raw number something odd like 59.94Hz instead of a clean 60?',
            answer: 'Timer resolution, OS scheduling, and small variations in how the compositor hands off frames all add a bit of jitter to any individual measurement. That is normal and expected, which is exactly why the tool also shows the nearest common refresh rate next to the raw figure.',
        },
        {
            question: 'Can something other than my monitor cap this number?',
            answer: 'Yes, several things can. OS-level power-saving settings, the browser throttling background or low-priority tabs, and a laptop\'s adaptive or variable refresh rate feature can all lower what gets measured even if the panel itself is capable of more.',
        },
        {
            question: 'What counts as a "dropped frame" here?',
            answer: 'Any frame interval more than 1.5 times the median interval for that run. A single dropped frame at 60Hz would show up as a gap north of 25ms instead of the usual ~16.67ms, meaning a frame was skipped or delayed.',
        },
        {
            question: 'Why did my test abort partway through?',
            answer: "Most likely you switched tabs, minimized the window, or the tab lost focus. Browsers intentionally throttle requestAnimationFrame in background tabs to save power, and that throttling would make the timing data meaningless, so the tool watches document.hidden and stops itself the moment it happens instead of showing you a broken result.",
        },
    ];

    return (
        <ServicePageShell
            icon={Monitor}
            title="Display Refresh Rate & Frame Time Tester"
            subtitle="Measure your monitor's real refresh rate and frame-time consistency with live browser timing"
            maxWidth="md"
            toolId={88}
            seoTitle="Refresh Rate Test Online | Monitor Hz & Frame Time Checker"
            seoDescription="Measure your display's actual refresh rate and frame-time consistency directly in your browser using requestAnimationFrame timing. No download, no plugin."
            keywords={['refresh rate test', 'monitor hz test', 'frame time test', 'fps test online', '144hz test', '120hz test', 'display refresh rate checker', 'frame time consistency test']}
            about={about}
            howToSteps={howToSteps}
            faq={faq}
        >
            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
            }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Refresh Rate Test</Typography>
                        <Typography variant="body2" color="text.secondary">Runs for about 3 seconds. Keep this tab focused and visible.</Typography>
                    </Box>
                    <Button variant="contained" startIcon={<PlayArrow />} onClick={startTest} disabled={status === 'running'}>
                        {status === 'running' ? 'Testing…' : results ? 'Test Again' : 'Start Test'}
                    </Button>
                </Stack>

                {status === 'aborted' && (
                    <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
                        Test aborted because the tab lost focus or was backgrounded. Browsers throttle animation timing in background tabs, which would corrupt the measurement. Keep this tab visible and focused, then click Start Test again.
                    </Alert>
                )}

                {status === 'running' && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="overline" color="text.secondary">Live reading</Typography>
                        <Typography variant="h2" fontWeight={900} sx={{ lineHeight: 1, my: 1 }}>
                            {liveFps > 0 ? `${liveFps.toFixed(1)} fps` : 'Measuring…'}
                        </Typography>
                        <LinearProgress variant="determinate" value={progressPct} sx={{ borderRadius: 1, height: 6 }} />
                    </Box>
                )}

                {results && status === 'complete' && (
                    <Box>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 3 }}>
                            <Box>
                                <Typography variant="overline" color="text.secondary">Nearest common refresh rate</Typography>
                                <Typography variant="h2" fontWeight={900} sx={{ lineHeight: 1 }}>{results.roundedRate} Hz</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Raw measured: {results.rawRate.toFixed(2)} Hz (median frame interval {results.medianDelta.toFixed(3)} ms)
                                </Typography>
                            </Box>
                            <Chip label={`${results.frameCount} frames sampled`} variant="outlined" />
                        </Stack>

                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={6} sm={3}><StatTile label="Min" value={`${results.minDelta.toFixed(2)} ms`} /></Grid>
                            <Grid item xs={6} sm={3}><StatTile label="Max" value={`${results.maxDelta.toFixed(2)} ms`} /></Grid>
                            <Grid item xs={6} sm={3}><StatTile label="Median" value={`${results.medianDelta.toFixed(2)} ms`} /></Grid>
                            <Grid item xs={6} sm={3}><StatTile label="Std Dev" value={`${results.stdDevDelta.toFixed(2)} ms`} /></Grid>
                        </Grid>

                        {results.droppedFrames > 0 && (
                            <Alert severity="info" sx={{ mb: 3 }}>
                                {results.droppedFrames} frame{results.droppedFrames === 1 ? '' : 's'} took more than 1.5x the median interval during this run, a sign of a skipped or delayed frame.
                            </Alert>
                        )}

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Frame-time distribution
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 120, mb: 1 }}>
                            {results.histogram.bins.map((count, i) => {
                                const pct = (count / maxBinCount) * 100;
                                return (
                                    <Box key={i} sx={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                                        <Box sx={{
                                            width: '100%',
                                            height: `${pct}%`,
                                            minHeight: count > 0 ? 3 : 0,
                                            bgcolor: theme.palette.primary.main,
                                            opacity: 0.85,
                                            borderRadius: '2px 2px 0 0',
                                            transition: 'height 0.2s ease',
                                        }} />
                                    </Box>
                                );
                            })}
                        </Box>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">{results.histogram.min.toFixed(1)} ms</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {(results.histogram.min + results.histogram.binWidth * HISTOGRAM_BIN_COUNT).toFixed(1)} ms
                            </Typography>
                        </Stack>
                    </Box>
                )}
            </Card>
        </ServicePageShell>
    );
};

export default DisplayRefreshRateTester;
