import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box, Card, Typography, Grid, Paper, Stack, Button, Alert, useTheme,
} from '@mui/material';
import { GraphicEq, PlayArrow, VolumeUp } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const SCHEDULE_AHEAD_S = 0.1; // schedule the blip 100ms into the future
const BLIP_DURATION_S = 0.05; // 50ms tone
const BLIP_GAIN = 0.05; // quiet on purpose

type Status = 'idle' | 'checking' | 'ready' | 'unsupported' | 'error';

interface AudioInfo {
    baseLatencyMs: number | null;
    outputLatencyMs: number | null;
    sampleRate: number;
}

interface SchedulingResult {
    requestedDelayMs: number;
    measuredDelayMs: number;
    differenceMs: number;
}

// Safari has historically exposed webkitAudioContext instead of (or ahead
// of) AudioContext. This is the one narrow `any`-free way to feature-detect
// it without widening the global Window type project-wide.
interface WindowWithWebkitAudio extends Window {
    webkitAudioContext?: typeof AudioContext;
}

function getAudioContextClass(): typeof AudioContext | undefined {
    if (typeof window === 'undefined') return undefined;
    return window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
}

function StatTile({ label, value }: { label: string; value: string }) {
    return (
        <Paper sx={{
            p: 2, textAlign: 'center', borderRadius: 2,
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

const AudioLatencyAnalyzer: React.FC = () => {
    const theme = useTheme();

    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
    const [schedulingResult, setSchedulingResult] = useState<SchedulingResult | null>(null);
    const [schedulingTesting, setSchedulingTesting] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const pollRafRef = useRef<number | null>(null);

    const closeCurrentContext = useCallback(() => {
        if (pollRafRef.current !== null) {
            cancelAnimationFrame(pollRafRef.current);
            pollRafRef.current = null;
        }
        const ctx = audioContextRef.current;
        audioContextRef.current = null;
        if (ctx && ctx.state !== 'closed') {
            ctx.close().catch(() => { /* already closing/closed */ });
        }
    }, []);

    useEffect(() => closeCurrentContext, [closeCurrentContext]);

    const checkAudioSystem = useCallback(async () => {
        closeCurrentContext();
        setError(null);
        setAudioInfo(null);
        setSchedulingResult(null);
        setStatus('checking');

        const AudioContextClass = getAudioContextClass();
        if (!AudioContextClass) {
            setStatus('unsupported');
            setError('The Web Audio API is not available in this browser.');
            return;
        }

        try {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            setAudioInfo({
                baseLatencyMs: typeof ctx.baseLatency === 'number' ? ctx.baseLatency * 1000 : null,
                outputLatencyMs: typeof ctx.outputLatency === 'number' ? ctx.outputLatency * 1000 : null,
                sampleRate: ctx.sampleRate,
            });
            setStatus('ready');

            // Scheduling-precision test: schedule a quiet, short blip for a
            // fixed instant in AudioContext time, anchor a performance.now()
            // wall-clock reading at the same moment, then poll until the
            // context's own clock reaches that instant and compare the two.
            setSchedulingTesting(true);
            const anchorAudioTime = ctx.currentTime;
            const anchorWallTime = performance.now();
            const scheduledAudioTime = anchorAudioTime + SCHEDULE_AHEAD_S;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 440;
            gain.gain.value = BLIP_GAIN;
            osc.connect(gain).connect(ctx.destination);
            osc.start(scheduledAudioTime);
            osc.stop(scheduledAudioTime + BLIP_DURATION_S);

            const poll = () => {
                if (audioContextRef.current !== ctx) return; // superseded by a new test or unmount
                if (ctx.currentTime >= scheduledAudioTime) {
                    const requestedDelayMs = SCHEDULE_AHEAD_S * 1000;
                    const measuredDelayMs = performance.now() - anchorWallTime;
                    setSchedulingResult({
                        requestedDelayMs,
                        measuredDelayMs,
                        differenceMs: measuredDelayMs - requestedDelayMs,
                    });
                    setSchedulingTesting(false);
                    pollRafRef.current = null;
                } else {
                    pollRafRef.current = requestAnimationFrame(poll);
                }
            };
            pollRafRef.current = requestAnimationFrame(poll);
        } catch (e) {
            setStatus('error');
            setSchedulingTesting(false);
            setError(e instanceof Error ? e.message : 'Failed to initialize the audio system.');
        }
    }, [closeCurrentContext]);

    const fmtMs = (v: number | null) => (v === null ? 'Not reported by this browser' : `${v.toFixed(2)} ms`);

    const about = "This reads the real latency figures your browser's audio stack reports through the Web Audio API: baseLatency and outputLatency, both spec-defined properties describing the delay between your code and your speakers, plus the context's actual sample rate. It also runs a scheduling-precision test that schedules a short, quiet tone at a specific future instant on the AudioContext clock and measures, using a separate performance.now() wall clock anchored at the same moment, how closely the browser hits that instant in practice. Clicking the button below will play a brief 50ms tone at low volume as part of that test, so it isn't silent. This all requires a user gesture to start (a browser security requirement for audio), which is why it runs on click rather than automatically on page load.";

    const howToSteps = [
        { name: 'Click Check Audio System', text: 'This creates an AudioContext (requires a user gesture in modern browsers) and reads its reported latency figures.' },
        { name: 'Listen for the test tone', text: 'A short, quiet 50ms tone plays as part of the scheduling-precision test. It is intentionally quiet, not silent.' },
        { name: 'Review the numbers', text: 'Base latency, output latency, sample rate, and the scheduling accuracy result all appear once the test finishes, usually well under a second later.' },
    ];

    const faq = [
        {
            question: 'What does "latency" mean here?',
            answer: "It's the delay between telling the browser to play a sound and that sound actually reaching your speakers or headphones. baseLatency is the minimum the audio stack itself needs to process a buffer; outputLatency adds the estimated time from there through the OS's audio path to the physical output.",
        },
        {
            question: 'Why does this vary by OS, hardware, and browser?',
            answer: 'Audio buffer sizes, the OS-level audio driver stack, and how each browser implements the Web Audio API all differ. A gaming laptop with ASIO-style low-latency drivers and a Chromebook with a generic audio path can report meaningfully different numbers for the same web page.',
        },
        {
            question: 'Is the scheduling test perfectly precise?',
            answer: 'No, and it should not be presented as such. AudioContext time and performance.now() are two different clocks, and reading both close together carries a few milliseconds of inherent uncertainty on its own, before any actual scheduling drift is measured. Treat the result as a reasonable estimate of scheduling accuracy, not a lab-grade measurement.',
        },
        {
            question: 'Can I use this to measure my headphones\' physical delay?',
            answer: 'No. This measures the browser and OS audio stack up to the point sound is handed off for output, not the acoustic or electronic delay inside a specific pair of headphones or speakers. It is aimed at browser-based audio work (web apps, browser-based DAWs, games), not hardware review.',
        },
        {
            question: 'Why is outputLatency sometimes "Not reported by this browser"?',
            answer: 'outputLatency support has historically had gaps, notably in Safari. When a browser does not implement it, the property comes back undefined rather than a real number, and this tool shows that honestly instead of displaying a misleading 0.',
        },
        {
            question: 'Does this upload any audio or send anything to a server?',
            answer: 'No. Everything happens locally through the Web Audio API in your browser; nothing is recorded, uploaded, or sent anywhere.',
        },
    ];

    return (
        <ServicePageShell
            icon={GraphicEq}
            title="Audio Latency Analyzer"
            subtitle="Real Web Audio API latency figures and a live scheduling-precision test"
            maxWidth="sm"
            toolId={92}
            seoTitle="Audio Latency Test Online | Web Audio Base & Output Latency Checker"
            seoDescription="Measure your browser's real Web Audio API latency: baseLatency, outputLatency, sample rate, and live audio-clock scheduling precision."
            keywords={['audio latency test', 'web audio api latency', 'browser audio latency checker', 'baseLatency outputLatency test', 'audio scheduling precision test', 'low latency audio browser test']}
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
                        <Typography variant="h6" fontWeight={700}>Audio System Check</Typography>
                        <Typography variant="body2" color="text.secondary">Plays a brief, quiet test tone as part of the check.</Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<PlayArrow />}
                        onClick={checkAudioSystem}
                        disabled={status === 'checking' || schedulingTesting}
                    >
                        {status === 'checking' || schedulingTesting ? 'Testing…' : audioInfo ? 'Test Again' : 'Check Audio System'}
                    </Button>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {audioInfo && (
                    <Box sx={{ mb: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}><StatTile label="Base Latency" value={fmtMs(audioInfo.baseLatencyMs)} /></Grid>
                            <Grid item xs={12} sm={4}><StatTile label="Output Latency" value={fmtMs(audioInfo.outputLatencyMs)} /></Grid>
                            <Grid item xs={12} sm={4}><StatTile label="Sample Rate" value={`${audioInfo.sampleRate.toLocaleString()} Hz`} /></Grid>
                        </Grid>
                    </Box>
                )}

                {schedulingTesting && (
                    <Alert severity="info" icon={<VolumeUp />} sx={{ mb: 3 }}>
                        Playing a short, quiet test tone and measuring audio-clock scheduling precision…
                    </Alert>
                )}

                {schedulingResult && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                            Scheduling precision test
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={4}><StatTile label="Requested" value={`${schedulingResult.requestedDelayMs.toFixed(2)} ms`} /></Grid>
                            <Grid item xs={4}><StatTile label="Measured" value={`${schedulingResult.measuredDelayMs.toFixed(2)} ms`} /></Grid>
                            <Grid item xs={4}>
                                <StatTile
                                    label="Difference"
                                    value={`${schedulingResult.differenceMs >= 0 ? '+' : ''}${schedulingResult.differenceMs.toFixed(2)} ms`}
                                />
                            </Grid>
                        </Grid>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            A blip was scheduled 100ms ahead on the AudioContext clock. "Measured" is the wall-clock time (via performance.now())
                            until that instant actually arrived. AudioContext time and performance.now() are separate clocks, so this
                            comparison carries roughly a few milliseconds of inherent uncertainty on its own, independent of any real scheduling drift.
                        </Typography>
                    </Box>
                )}

                {status === 'idle' && !audioInfo && (
                    <Typography variant="body2" color="text.secondary" sx={{ color: theme.palette.text.secondary }}>
                        Click "Check Audio System" above to read your browser's real audio latency figures.
                    </Typography>
                )}
            </Card>
        </ServicePageShell>
    );
};

export default AudioLatencyAnalyzer;
