import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Box, Card, Typography, Stack, Button, Chip, LinearProgress, Alert,
    Table, TableBody, TableCell, TableHead, TableRow, useTheme,
} from '@mui/material';
import { NetworkPing, PlayArrow, Stop, InfoOutlined } from '@mui/icons-material';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * How this works: browsers give JavaScript no access to raw ICMP
 * sockets, so a web page cannot send a real "ping" the way the ping
 * command on your OS does. What it can do is time a real HTTP request
 * with performance.now() wrapped around fetch(). Each ping below fires
 * a `no-cors` fetch at a small, stable favicon on a well-known domain
 * and measures how long the browser takes to get any response back -
 * that's the standard, honest way every browser-based latency tool
 * works, and the FAQ below is explicit about how it differs from ICMP.
 * ------------------------------------------------------------------ */
interface Target {
    name: string;
    url: string;
}

const TARGETS: Target[] = [
    { name: 'Google', url: 'https://www.google.com/favicon.ico' },
    { name: 'Cloudflare', url: 'https://www.cloudflare.com/favicon.ico' },
    { name: 'Microsoft', url: 'https://www.microsoft.com/favicon.ico' },
    { name: 'Amazon', url: 'https://www.amazon.com/favicon.ico' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org/favicon.ico' },
];

const PING_COUNT = 10;
const PING_TIMEOUT_MS = 5000; // a hung request counts as a failed ping rather than blocking the run forever

interface TargetState {
    target: Target;
    samples: (number | null)[]; // null = that ping failed or timed out
}

interface Stats {
    min: number | null;
    avg: number | null;
    max: number | null;
    jitter: number | null;
    succeeded: number;
    attempted: number;
}

function fmtMs(n: number | null): string {
    if (n === null || !isFinite(n)) return '--';
    return `${n.toFixed(1)} ms`;
}

// Jitter here is the mean absolute difference between consecutive
// successful ping times, not standard deviation - simpler to compute
// and just as legitimate a measure of how much RTT bounces around.
function computeStats(samples: (number | null)[]): Stats {
    const successful = samples.filter((s): s is number => s !== null);
    const attempted = samples.length;
    const succeeded = successful.length;
    if (succeeded === 0) {
        return { min: null, avg: null, max: null, jitter: null, succeeded, attempted };
    }
    const min = Math.min(...successful);
    const max = Math.max(...successful);
    const avg = successful.reduce((a, b) => a + b, 0) / succeeded;
    let jitter = 0;
    if (succeeded >= 2) {
        let diffSum = 0;
        for (let i = 1; i < successful.length; i++) diffSum += Math.abs(successful[i] - successful[i - 1]);
        jitter = diffSum / (successful.length - 1);
    }
    return { min, avg, max, jitter, succeeded, attempted };
}

async function pingOnce(url: string, stopSignal: AbortSignal): Promise<number | null> {
    if (stopSignal.aborted) return null;
    const controller = new AbortController();
    const onStop = () => controller.abort();
    stopSignal.addEventListener('abort', onStop);
    const timeoutId = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const start = performance.now();
    try {
        // no-cors is required since these are cross-origin requests and we
        // only need timing, not the response body - an opaque response
        // resolving still reflects a real, completed request/response
        // round trip at the network level.
        await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
        return performance.now() - start;
    } catch {
        return null;
    } finally {
        window.clearTimeout(timeoutId);
        stopSignal.removeEventListener('abort', onStop);
    }
}

function Sparkline({ samples, color }: { samples: (number | null)[]; color: string }) {
    const data = samples.map((rtt, i) => ({ i, rtt: rtt === null ? null : Math.round(rtt) }));
    const hasData = data.some((d) => d.rtt !== null);
    if (!hasData) {
        return <Typography variant="caption" color="text.secondary">--</Typography>;
    }
    return (
        <Box sx={{ width: 110, height: 32 }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <XAxis hide dataKey="i" />
                    <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                    <Area
                        type="monotone"
                        dataKey="rtt"
                        stroke={color}
                        strokeWidth={1.5}
                        fill={color}
                        fillOpacity={0.2}
                        isAnimationActive={false}
                        connectNulls
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Box>
    );
}

function freshResults(): TargetState[] {
    return TARGETS.map((t) => ({ target: t, samples: [] }));
}

const NetworkLatencyTester: React.FC = () => {
    const theme = useTheme();
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<TargetState[]>(freshResults());
    const [error, setError] = useState<string | null>(null);

    const stopControllerRef = useRef<AbortController | null>(null);
    const runIdRef = useRef(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopControllerRef.current?.abort();
        };
    }, []);

    const runTest = useCallback(async () => {
        setError(null);
        setResults(freshResults());
        setRunning(true);

        const controller = new AbortController();
        stopControllerRef.current = controller;
        const myRunId = ++runIdRef.current;

        try {
            await Promise.all(TARGETS.map(async (target, ti) => {
                for (let i = 0; i < PING_COUNT; i++) {
                    if (controller.signal.aborted) break;
                    const rtt = await pingOnce(target.url, controller.signal);
                    if (!isMountedRef.current || runIdRef.current !== myRunId) return;
                    setResults((prev) => {
                        const next = prev.slice();
                        next[ti] = { ...next[ti], samples: [...next[ti].samples, rtt] };
                        return next;
                    });
                }
            }));
        } catch (e: any) {
            if (isMountedRef.current && runIdRef.current === myRunId) {
                setError(e?.message || 'The latency test failed unexpectedly.');
            }
        } finally {
            if (isMountedRef.current && runIdRef.current === myRunId) {
                setRunning(false);
            }
            if (stopControllerRef.current === controller) stopControllerRef.current = null;
        }
    }, []);

    const stopTest = useCallback(() => {
        stopControllerRef.current?.abort();
        setRunning(false);
    }, []);

    const hasAnyData = results.some((r) => r.samples.length > 0);

    const howToSteps = [
        { name: 'Start the test', text: 'Click Run Test. The tool immediately starts sending timed HTTP requests to five well-known endpoints from your browser.' },
        { name: 'Watch pings land live', text: 'Each row fills in as its pings complete, so you see individual round-trip times arrive in real time instead of waiting for a final summary.' },
        { name: 'Compare the targets', text: 'Once ten pings finish for a target, its min, average, max, and jitter settle. Lower and more consistent numbers mean a cleaner path to that endpoint from where you are.' },
        { name: 'Rerun when it matters', text: 'Latency shifts with time of day, network load, and routing changes, so treat one run as a snapshot. Run it again if a connection feels off and compare.' },
    ];

    const faq = [
        {
            question: 'Is this a real ping test?',
            answer: "It measures round-trip time over HTTP, not ICMP echo requests like the ping command on your computer sends. Browsers have no access to raw sockets, so JavaScript on a web page simply cannot issue a true ICMP ping. Instead this times a real HTTP fetch to each target's favicon and measures how long the browser takes to get a response back. In practice that tracks closely with ICMP ping, just with a bit of TLS handshake and HTTP overhead layered on top of the pure network round trip.",
        },
        {
            question: 'Why do my numbers change every time I run it?',
            answer: 'Your requests take a real path through real infrastructure, and that path is not fixed. Routing between your ISP and the target can shift, the target server can be under more or less load at any given moment, and your own local network (Wi-Fi congestion, other devices, a VPN) all play a part. Rerunning a few minutes apart and comparing tells you more than trusting any single run.',
        },
        {
            question: "What does 'jitter' mean here?",
            answer: "The average absolute difference between consecutive successful ping times to the same target, in milliseconds. A jitter of 2ms means your ping times were moving around by about 2ms from one request to the next. Some tools compute standard deviation instead; the consecutive-difference approach here is simpler and still a solid signal of how stable a connection is.",
        },
        {
            question: 'A ping shows as failed but the site loads fine in my browser. Why?',
            answer: "The test uses no-cors fetch requests, which return an opaque response the page cannot read the status or body of. A failed ping means the request never completed in time: a timeout, a DNS hiccup, or something blocking the connection locally. This measures whether a response came back at all, which is the right question for latency, even though it means a server returning an error page would still register as a successful ping since the page can't see the status code.",
        },
        {
            question: 'Why these five targets specifically?',
            answer: 'Google, Cloudflare, Microsoft, Amazon, and Wikipedia all run globally distributed infrastructure with small favicon files that stay put for years. That combination makes them reliable, low-overhead reference points you can test against repeatedly.',
        },
        {
            question: 'Does this send my data anywhere?',
            answer: "No account and no server involved on this end. Every request goes straight from your browser to the target's own servers, and results only ever live in this page's memory until you close or reload it.",
        },
    ];

    return (
        <ServicePageShell
            icon={NetworkPing}
            title="Network Latency & Jitter Tester"
            subtitle="Real round-trip time and jitter to major internet endpoints, measured live in your browser"
            maxWidth="md"
            toolId={89}
            seoTitle="Network Latency & Jitter Tester - Free Online Ping Test | ExpectException"
            seoDescription="Measure real round-trip latency and jitter from your browser to Google, Cloudflare, Microsoft, Amazon, and Wikipedia using live HTTP timing. No install, nothing leaves your browser but the requests themselves."
            keywords={['network latency test', 'jitter test online', 'browser ping test', 'rtt test online', 'internet latency checker', 'packet loss test', 'ping test no download', 'network jitter checker']}
            about="This tool times how long your browser takes to get a response from five well-known servers: Google, Cloudflare, Microsoft, Amazon, and Wikipedia. It sends ten timed HTTP requests to each one using fetch() wrapped in performance.now(), the standard way a web page can measure round-trip time since JavaScript has no access to raw ICMP sockets. Each target gets its own row with live results as pings land, plus min, average, max, and jitter once all ten complete. Nothing is uploaded or logged anywhere; every request goes straight from your browser to the target's servers and the numbers only exist in this page's memory."
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
            }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        {PING_COUNT} HTTP requests per target, timed with performance.now()
                    </Typography>
                    <Button
                        variant="contained"
                        color={running ? 'error' : 'primary'}
                        startIcon={running ? <Stop /> : <PlayArrow />}
                        onClick={running ? stopTest : runTest}
                    >
                        {running ? 'Stop' : hasAnyData ? 'Run Again' : 'Run Test'}
                    </Button>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Target</TableCell>
                                <TableCell sx={{ minWidth: 90 }}>Progress</TableCell>
                                <TableCell align="right">Min</TableCell>
                                <TableCell align="right">Avg</TableCell>
                                <TableCell align="right">Max</TableCell>
                                <TableCell align="right">Jitter</TableCell>
                                <TableCell align="right">Success</TableCell>
                                <TableCell align="right">Trend</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {results.map((r) => {
                                const stats = computeStats(r.samples);
                                const pct = (stats.attempted / PING_COUNT) * 100;
                                let chipColor: 'default' | 'success' | 'warning' | 'error' = 'default';
                                if (stats.attempted === PING_COUNT) {
                                    chipColor = stats.succeeded === PING_COUNT ? 'success' : stats.succeeded === 0 ? 'error' : 'warning';
                                }
                                return (
                                    <TableRow key={r.target.name}>
                                        <TableCell sx={{ fontWeight: 700 }}>{r.target.name}</TableCell>
                                        <TableCell>
                                            <LinearProgress variant="determinate" value={pct} sx={{ borderRadius: 1, height: 5 }} />
                                        </TableCell>
                                        <TableCell align="right">{fmtMs(stats.min)}</TableCell>
                                        <TableCell align="right">{fmtMs(stats.avg)}</TableCell>
                                        <TableCell align="right">{fmtMs(stats.max)}</TableCell>
                                        <TableCell align="right">{fmtMs(stats.jitter)}</TableCell>
                                        <TableCell align="right">
                                            {stats.attempted === 0 ? (
                                                <Typography variant="caption" color="text.secondary">--</Typography>
                                            ) : (
                                                <Chip size="small" label={`${stats.succeeded}/${stats.attempted}`} color={chipColor} variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Sparkline samples={r.samples} color={theme.palette.primary.main} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>

                <Alert severity="info" icon={<InfoOutlined />} sx={{ mt: 2.5 }}>
                    This measures HTTP-layer round-trip time, not a true ICMP ping, since browsers cannot open raw sockets. It is the same approach every browser-based latency tool uses, and it tracks closely with ICMP in practice.
                </Alert>
            </Card>
        </ServicePageShell>
    );
};

export default NetworkLatencyTester;
