import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box, Card, Typography, Grid, Paper, Stack, Button, Tabs, Tab,
    Chip, LinearProgress, Alert, ToggleButtonGroup, ToggleButton,
    Table, TableBody, TableCell, TableHead, TableRow, alpha, useTheme,
} from '@mui/material';
import {
    Memory, PlayArrow, Stop, DeviceThermostat, DeleteOutline,
    Bolt, Storage,
} from '@mui/icons-material';
import {
    AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis as PolarAngleAxisImpl, PolarRadiusAxis, Radar,
    ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import ServicePageShell from './ServicePageShell';

// recharts' PolarAngleAxis is typed as returning React.ReactNode instead of
// JSX.Element, which @types/react 18 rejects as a JSX component - cast once
// here rather than suppressing the whole file.
const PolarAngleAxis = PolarAngleAxisImpl as unknown as React.FC<any>;

/* ------------------------------------------------------------------ *
 * All four sub-tests (single-core, multi-core, GPU, memory) measure
 * something real: divisibility checks/sec, matrix FLOPS, shader-pixel
 * iterations/sec via WebGL, and TypedArray MB/s. Those raw numbers are
 * accurate, reproducible measurements of actual work this specific
 * browser+device did.
 *
 * The composite "Score" on top of them is a relative convenience
 * number (measured/baseline * 1000, same idea PassMark/Geekbench use
 * internally), NOT a claim of absolute silicon performance - a
 * sandboxed JS engine can't observe that. Baselines below come from a
 * real run of these exact loops in Node's V8 (see project notes), not
 * guesses, so a typical modern device lands near 1000 per category.
 * ------------------------------------------------------------------ */
const BASELINE = {
    singleInt: 90_000_000, // divisibility checks/sec
    singleFloat: 600_000_000, // FLOPS
    gpu: 1_400_000_000, // shader pixel-iterations/sec
    memWrite: 1400, // MB/s
    memRead: 4000,
    memRandom: 400,
};

const SCORE_WEIGHTS = { single: 0.25, multi: 0.35, gpu: 0.25, memory: 0.15 };

/* ------------------------------------------------------------------ *
 * Live Stress Test throttle detection. Every worker posts a progress
 * message roughly every 200ms (REPORT_INTERVAL_MS in the worker), so
 * with N workers the combined message rate is ~N per 200ms - on an
 * 8+ core machine that's enough samples to satisfy a fixed sample-count
 * gate in well under a second, long before per-core throughput has
 * actually stabilized (workers spin up at slightly different times,
 * and V8 needs a moment to JIT-warm the hot loop). A gate expressed in
 * elapsed time instead of sample count behaves the same regardless of
 * core count, and giving the peak the same grace period stops one
 * noisy early reading from anchoring an unrealistically high bar that
 * later, perfectly normal throughput can't clear.
 * ------------------------------------------------------------------ */
const STRESS_WARMUP_MS = 3000; // ignore samples this early when tracking peak throughput
const STRESS_MIN_ELAPSED_FOR_CHECK_MS = 6000; // don't evaluate throttle status before this much time has passed
const STRESS_RECENT_WINDOW_MS = 4000; // "recent average" is a trailing wall-clock window, not a sample count
const STRESS_THROTTLE_RATIO = 0.85;

type Phase = 'idle' | 'single-int' | 'single-float' | 'multi-int' | 'multi-float' | 'gpu' | 'memory' | 'complete';

const PHASE_ORDER: { key: Phase; label: string }[] = [
    { key: 'single-int', label: 'Single-Core' },
    { key: 'multi-int', label: 'Multi-Core' },
    { key: 'gpu', label: 'GPU' },
    { key: 'memory', label: 'Memory' },
];

function phaseGroup(p: Phase): Phase {
    if (p === 'single-float') return 'single-int';
    if (p === 'multi-float') return 'multi-int';
    return p;
}

interface BenchmarkResults {
    singleCoreIntOps: number;
    singleCoreFloatFlops: number;
    multiCoreIntOps: number;
    multiCoreFloatFlops: number;
    gpuFps: number;
    gpuOpsPerSec: number;
    gpuRenderer: string;
    gpuSupported: boolean;
    memWriteMBs: number;
    memReadMBs: number;
    memRandomMBs: number;
    singleCoreScore: number;
    multiCoreScore: number;
    gpuScore: number;
    memoryScore: number;
    totalScore: number;
    cores: number;
    timestamp: number;
}

const HISTORY_KEY = 'cpuLoadTestHistory';
const MAX_HISTORY = 10;

function loadHistory(): BenchmarkResults[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}
function saveHistory(entries: BenchmarkResults[]) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
    } catch {
        // localStorage unavailable (private mode / quota) - history just won't persist
    }
}

function fmt(n: number, digits = 0) {
    if (!isFinite(n)) return '--';
    return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
function fmtOps(n: number) {
    if (!isFinite(n) || n <= 0) return '--';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return fmt(n);
}

function makeWorker() {
    return new Worker(new URL('../../workers/benchmarkWorker.ts', import.meta.url));
}

function runWorkerTask(worker: Worker, message: any, onProgress?: (data: any) => void): Promise<any> {
    return new Promise((resolve, reject) => {
        const handler = (e: MessageEvent) => {
            const data = e.data;
            if (data.type === 'progress') {
                onProgress?.(data);
            } else if (data.type === 'done' || data.type === 'memory-done') {
                worker.removeEventListener('message', handler);
                resolve(data);
            } else if (data.type === 'error') {
                worker.removeEventListener('message', handler);
                reject(new Error(data.message));
            }
        };
        worker.addEventListener('message', handler);
        worker.postMessage(message);
    });
}

function ScoreTile({ label, value, disabled, suffix }: { label: string; value: number; disabled?: boolean; suffix?: string }) {
    return (
        <Paper sx={{
            p: 2, textAlign: 'center', borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.08)',
            opacity: disabled ? 0.5 : 1,
        }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="h5" fontWeight={800}>
                {disabled ? 'N/A' : `${fmt(value)}${suffix || ''}`}
            </Typography>
        </Paper>
    );
}

function CoreGrid({ loads }: { loads: number[] }) {
    const max = Math.max(...loads, 1);
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: 1 }}>
            {loads.map((v, i) => {
                const pct = Math.min(100, (v / max) * 100);
                return (
                    <Box key={i} sx={{ textAlign: 'center' }}>
                        <Box sx={{
                            height: 52, borderRadius: 1, bgcolor: alpha('#fff', 0.05),
                            display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            <Box sx={{
                                width: '100%', height: `${pct}%`,
                                bgcolor: pct > 85 ? 'success.main' : pct > 40 ? 'warning.main' : 'error.main',
                                transition: 'height 0.2s ease',
                            }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">C{i}</Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

const CpuLoadTest: React.FC = () => {
    const theme = useTheme();
    const [tab, setTab] = useState(0);

    const cores = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory as number | undefined;

    // ---------- Benchmark suite ----------
    const [phase, setPhase] = useState<Phase>('idle');
    const [running, setRunning] = useState(false);
    const [liveValue, setLiveValue] = useState(0);
    const [phaseProgress, setPhaseProgress] = useState(0);
    const [coreLoads, setCoreLoads] = useState<number[]>([]);
    const [results, setResults] = useState<BenchmarkResults | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<BenchmarkResults[]>(() => loadHistory());

    const gpuCanvasRef = useRef<HTMLCanvasElement>(null);

    // Workers spawned by the current/last runFullBenchmark() call. Tracked
    // separately from the stress-test workers below so an unmount mid-run
    // (or an error partway through) can't leave a benchmark worker pegging
    // a core forever - runFullBenchmark already terminates each worker as
    // soon as it's done with it on the happy path, but Promise.all rejecting
    // mid-phase would otherwise skip those terminate() calls entirely.
    const benchmarkWorkersRef = useRef<Worker[]>([]);
    const benchmarkCancelledRef = useRef(false);

    useEffect(() => {
        return () => {
            benchmarkCancelledRef.current = true;
            benchmarkWorkersRef.current.forEach((w) => w.terminate());
            benchmarkWorkersRef.current = [];
        };
    }, []);

    const runGpuTest = useCallback((durationMs: number, shouldCancel: () => boolean): Promise<{ fps: number; opsPerSec: number; renderer: string; supported: boolean }> => {
        const canvas = gpuCanvasRef.current;
        if (!canvas) return Promise.resolve({ fps: 0, opsPerSec: 0, renderer: 'Canvas unavailable', supported: false });

        const SIZE = 512;
        const MAX_ITER = 180;
        canvas.width = SIZE;
        canvas.height = SIZE;
        const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
        if (!gl) return Promise.resolve({ fps: 0, opsPerSec: 0, renderer: 'WebGL not supported', supported: false });

        let renderer = 'Hidden by browser privacy settings';
        const dbgInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbgInfo) {
            try {
                renderer = gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) as string;
            } catch {
                // leave default
            }
        }

        const vsSource = `
            attribute vec2 aPos;
            void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
        `;
        const fsSource = `
            precision highp float;
            uniform vec2 uResolution;
            uniform float uTime;
            void main() {
                vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 3.0 - 1.5;
                vec2 c = vec2(-0.745 + 0.1 * sin(uTime * 0.3), 0.15 + 0.1 * cos(uTime * 0.2));
                vec2 z = uv;
                float iter = 0.0;
                for (float i = 0.0; i < ${MAX_ITER.toFixed(1)}; i++) {
                    if (dot(z, z) > 4.0) break;
                    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
                    iter += 1.0;
                }
                float t = iter / ${MAX_ITER.toFixed(1)};
                gl_FragColor = vec4(0.5 + 0.5 * cos(6.0 * t), 0.5 + 0.5 * cos(6.0 * t + 2.0), 0.5 + 0.5 * cos(6.0 * t + 4.0), 1.0);
            }
        `;

        function compile(type: number, src: string) {
            const sh = gl!.createShader(type)!;
            gl!.shaderSource(sh, src);
            gl!.compileShader(sh);
            if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
                const info = gl!.getShaderInfoLog(sh);
                throw new Error(info || 'Shader compile error');
            }
            return sh;
        }

        try {
            const prog = gl.createProgram()!;
            gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
            gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
            gl.linkProgram(prog);
            gl.useProgram(prog);

            const posBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
            const aPos = gl.getAttribLocation(prog, 'aPos');
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

            const uResolution = gl.getUniformLocation(prog, 'uResolution');
            const uTime = gl.getUniformLocation(prog, 'uTime');
            gl.uniform2f(uResolution, SIZE, SIZE);
            gl.viewport(0, 0, SIZE, SIZE);

            return new Promise((resolve) => {
                const start = performance.now();
                let frames = 0;
                let rafId = 0;
                function frame(now: number) {
                    if (shouldCancel()) {
                        cancelAnimationFrame(rafId);
                        resolve({ fps: 0, opsPerSec: 0, renderer, supported: true });
                        return;
                    }
                    const elapsed = now - start;
                    gl!.uniform1f(uTime, elapsed / 1000);
                    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
                    frames++;
                    setLiveValue(frames / (elapsed / 1000 || 1));
                    setPhaseProgress(Math.min(100, (elapsed / durationMs) * 100));
                    if (elapsed < durationMs) {
                        rafId = requestAnimationFrame(frame);
                    } else {
                        cancelAnimationFrame(rafId);
                        const fps = frames / (elapsed / 1000);
                        const opsPerSec = fps * SIZE * SIZE * MAX_ITER;
                        resolve({ fps, opsPerSec, renderer, supported: true });
                    }
                }
                rafId = requestAnimationFrame(frame);
            });
        } catch (e: any) {
            return Promise.resolve({ fps: 0, opsPerSec: 0, renderer: e?.message || 'GPU test failed', supported: false });
        }
    }, []);

    const runFullBenchmark = useCallback(async () => {
        setRunning(true);
        setError(null);
        setResults(null);
        setCoreLoads([]);
        benchmarkCancelledRef.current = false;

        // Every worker this run spawns is tracked here so the `finally`
        // block below can unconditionally terminate whatever's left,
        // whether the run finished cleanly, threw mid-phase (Promise.all
        // rejecting skips the normal terminate() calls further down), or
        // the component unmounted while a phase was still in flight.
        const spawned: Worker[] = [];
        const spawn = () => {
            const w = makeWorker();
            spawned.push(w);
            benchmarkWorkersRef.current.push(w);
            return w;
        };
        const cancelled = () => benchmarkCancelledRef.current;

        try {
            setPhase('single-int');
            setLiveValue(0);
            setPhaseProgress(0);
            const w1 = spawn();
            const singleInt = await runWorkerTask(w1, { type: 'run', workload: 'int', durationMs: 3500 }, (p) => {
                setLiveValue(p.opsPerSec);
                setPhaseProgress(Math.min(100, (p.elapsedMs / 3500) * 100));
            });
            if (cancelled()) return;

            setPhase('single-float');
            setLiveValue(0);
            setPhaseProgress(0);
            const singleFloat = await runWorkerTask(w1, { type: 'run', workload: 'float', durationMs: 3500 }, (p) => {
                setLiveValue(p.opsPerSec);
                setPhaseProgress(Math.min(100, (p.elapsedMs / 3500) * 100));
            });
            w1.terminate();
            if (cancelled()) return;

            setPhase('multi-int');
            setLiveValue(0);
            setPhaseProgress(0);
            const workers = Array.from({ length: cores }, spawn);
            const loads = new Array(cores).fill(0);
            setCoreLoads(loads.slice());
            const multiIntResults = await Promise.all(workers.map((w, i) =>
                runWorkerTask(w, { type: 'run', workload: 'int', durationMs: 3500 }, (p) => {
                    loads[i] = p.opsPerSec;
                    setCoreLoads(loads.slice());
                    setLiveValue(loads.reduce((a, b) => a + b, 0));
                    setPhaseProgress(Math.min(100, (p.elapsedMs / 3500) * 100));
                })
            ));
            const multiCoreIntOps = multiIntResults.reduce((sum, r) => sum + r.opsPerSec, 0);
            if (cancelled()) return;

            setPhase('multi-float');
            setLiveValue(0);
            setPhaseProgress(0);
            loads.fill(0);
            setCoreLoads(loads.slice());
            const multiFloatResults = await Promise.all(workers.map((w, i) =>
                runWorkerTask(w, { type: 'run', workload: 'float', durationMs: 3500 }, (p) => {
                    loads[i] = p.opsPerSec;
                    setCoreLoads(loads.slice());
                    setLiveValue(loads.reduce((a, b) => a + b, 0));
                    setPhaseProgress(Math.min(100, (p.elapsedMs / 3500) * 100));
                })
            ));
            const multiCoreFloatFlops = multiFloatResults.reduce((sum, r) => sum + r.opsPerSec, 0);
            workers.forEach((w) => w.terminate());
            setCoreLoads([]);
            if (cancelled()) return;

            setPhase('gpu');
            setLiveValue(0);
            setPhaseProgress(0);
            const gpu = await runGpuTest(4000, cancelled);
            if (cancelled()) return;

            setPhase('memory');
            setLiveValue(0);
            setPhaseProgress(0);
            const w2 = spawn();
            const mem = await runWorkerTask(w2, { type: 'memory', sizeMB: 64 });
            w2.terminate();
            if (cancelled()) return;

            const singleCoreIntOps = singleInt.opsPerSec;
            const singleCoreFloatFlops = singleFloat.opsPerSec;

            const singleCoreScore = ((singleCoreIntOps / BASELINE.singleInt) + (singleCoreFloatFlops / BASELINE.singleFloat)) / 2 * 1000;
            const multiCoreScore = ((multiCoreIntOps / BASELINE.singleInt) + (multiCoreFloatFlops / BASELINE.singleFloat)) / 2 * 1000;
            const gpuScore = gpu.supported ? (gpu.opsPerSec / BASELINE.gpu) * 1000 : 0;
            const memoryScore = ((mem.writeMBs / BASELINE.memWrite) * 0.4 + (mem.readMBs / BASELINE.memRead) * 0.4 + (mem.randomMBs / BASELINE.memRandom) * 0.2) * 1000;
            const totalScore = singleCoreScore * SCORE_WEIGHTS.single + multiCoreScore * SCORE_WEIGHTS.multi + gpuScore * SCORE_WEIGHTS.gpu + memoryScore * SCORE_WEIGHTS.memory;

            const result: BenchmarkResults = {
                singleCoreIntOps, singleCoreFloatFlops, multiCoreIntOps, multiCoreFloatFlops,
                gpuFps: gpu.fps, gpuOpsPerSec: gpu.opsPerSec, gpuRenderer: gpu.renderer, gpuSupported: gpu.supported,
                memWriteMBs: mem.writeMBs, memReadMBs: mem.readMBs, memRandomMBs: mem.randomMBs,
                singleCoreScore, multiCoreScore, gpuScore, memoryScore, totalScore,
                cores, timestamp: Date.now(),
            };
            setResults(result);
            setPhase('complete');
            setHistory((prev) => {
                const next = [result, ...prev].slice(0, MAX_HISTORY);
                saveHistory(next);
                return next;
            });
        } catch (e: any) {
            if (!cancelled()) {
                setError(e?.message || 'Benchmark failed unexpectedly.');
                setPhase('idle');
            }
        } finally {
            setRunning(false);
            // Safety net: terminate() is a no-op on an already-terminated
            // worker, so it's safe to sweep every worker this run spawned
            // here regardless of whether the happy path already terminated
            // them individually - this is what actually closes the leak
            // when Promise.all rejects mid multi-core phase.
            spawned.forEach((w) => w.terminate());
            benchmarkWorkersRef.current = benchmarkWorkersRef.current.filter((w) => !spawned.includes(w));
        }
    }, [cores, runGpuTest]);

    const clearHistory = () => {
        setHistory([]);
        saveHistory([]);
    };

    // ---------- Live stress test ----------
    const [stressRunning, setStressRunning] = useState(false);
    const [stressWorkload, setStressWorkload] = useState<'int' | 'float'>('int');
    const [stressCoreLoads, setStressCoreLoads] = useState<number[]>([]);
    const [stressChart, setStressChart] = useState<{ time: number; total: number }[]>([]);
    const [stressElapsed, setStressElapsed] = useState(0);
    const [stressPeak, setStressPeak] = useState(0);
    const [throttleWarning, setThrottleWarning] = useState(false);

    const stressWorkersRef = useRef<Worker[]>([]);
    const stressChartRef = useRef<{ time: number; total: number }[]>([]);
    const stressPeakRef = useRef(0);
    const stressStartRef = useRef(0);
    const recentRef = useRef<{ atMs: number; total: number }[]>([]);

    const startStress = useCallback(() => {
        setStressRunning(true);
        setThrottleWarning(false);
        setStressChart([]);
        stressChartRef.current = [];
        stressPeakRef.current = 0;
        setStressPeak(0);
        stressStartRef.current = Date.now();
        recentRef.current = [];

        const n = cores;
        const workers = Array.from({ length: n }, makeWorker);
        stressWorkersRef.current = workers;
        const loads = new Array(n).fill(0);
        setStressCoreLoads(loads.slice());

        workers.forEach((w, i) => {
            w.onmessage = (e: MessageEvent) => {
                const data = e.data;
                if (data.type !== 'progress') return;
                loads[i] = data.opsPerSec;
                setStressCoreLoads(loads.slice());

                const total = loads.reduce((a, b) => a + b, 0);
                const elapsedMs = Date.now() - stressStartRef.current;
                const t = elapsedMs / 1000;
                setStressElapsed(t);

                stressChartRef.current = [...stressChartRef.current.slice(-150), { time: parseFloat(t.toFixed(1)), total }];
                setStressChart([...stressChartRef.current]);

                // Skip the warm-up window when tracking peak: an early reading
                // taken before every worker has ramped up (or before the JIT
                // has warmed the hot loop) can be noisy in either direction,
                // and if it happens to be a high outlier it sets a bar normal
                // sustained throughput may never actually clear.
                if (elapsedMs > STRESS_WARMUP_MS && total > stressPeakRef.current) {
                    stressPeakRef.current = total;
                    setStressPeak(total);
                }

                recentRef.current = [...recentRef.current, { atMs: elapsedMs, total }]
                    .filter((s) => elapsedMs - s.atMs <= STRESS_RECENT_WINDOW_MS);

                if (elapsedMs > STRESS_MIN_ELAPSED_FOR_CHECK_MS && stressPeakRef.current > 0 && recentRef.current.length > 0) {
                    const avg = recentRef.current.reduce((a, s) => a + s.total, 0) / recentRef.current.length;
                    setThrottleWarning(avg < stressPeakRef.current * STRESS_THROTTLE_RATIO);
                } else {
                    setThrottleWarning(false);
                }
            };
            w.postMessage({ type: 'stress', workload: stressWorkload });
        });
    }, [cores, stressWorkload]);

    const stopStress = useCallback(() => {
        stressWorkersRef.current.forEach((w) => w.terminate());
        stressWorkersRef.current = [];
        setStressRunning(false);
    }, []);

    useEffect(() => () => {
        stressWorkersRef.current.forEach((w) => w.terminate());
    }, []);

    // ---------- System info ----------
    const [sysGpuRenderer, setSysGpuRenderer] = useState('Detecting...');
    const [webgl2Supported, setWebgl2Supported] = useState(false);

    useEffect(() => {
        try {
            const canvas = document.createElement('canvas');
            const gl2 = canvas.getContext('webgl2');
            const gl = gl2 || canvas.getContext('webgl');
            setWebgl2Supported(!!gl2);
            if (gl) {
                const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                if (dbg) {
                    setSysGpuRenderer((gl as WebGLRenderingContext).getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string);
                } else {
                    setSysGpuRenderer('Hidden by browser privacy settings');
                }
            } else {
                setSysGpuRenderer('WebGL not supported');
            }
        } catch {
            setSysGpuRenderer('Unable to detect');
        }
    }, []);

    const activeGroup = phaseGroup(phase);
    const radarData = results ? [
        { subject: 'Single-Core', score: Math.round(results.singleCoreScore) },
        { subject: 'Multi-Core', score: Math.round(results.multiCoreScore) },
        { subject: 'GPU', score: Math.round(results.gpuScore) },
        { subject: 'Memory', score: Math.round(results.memoryScore) },
    ] : [];

    const howToSteps = [
        { name: 'Check System Info', text: 'Open the System Info tab to see your logical core count, reported device memory, and GPU renderer string before you test.' },
        { name: 'Run the full benchmark', text: 'Click Run Benchmark - it automatically steps through single-core, multi-core, GPU, and RAM bandwidth phases, one after another.' },
        { name: 'Watch it live', text: 'Each phase shows a live readout (ops/sec, FLOPS, FPS, or MB/s) as it runs, plus a per-core load grid during the multi-core phase.' },
        { name: 'Read your score', text: 'The composite score and its four subscores appear at the end, alongside the raw measured numbers behind them.' },
        { name: 'Push it further', text: 'Switch to Live Stress Test to peg all cores continuously and watch for sustained throughput drop-off (a sign of thermal throttling).' },
    ];

    const faq = [
        { question: 'Is this as accurate as Cinebench or Geekbench?', answer: "The raw numbers are real and accurate - divisibility checks/sec, matrix FLOPS, WebGL shader iterations/sec, and TypedArray MB/s are all genuinely measured work your browser just did, not estimates. The composite 'Score' is a relative reference (measured ÷ baseline × 1000), the same normalisation idea native benchmarks use internally, calibrated to typical modern hardware. It's honest about capturing your browser + JS engine + OS overhead together, not isolated silicon performance, so it's best used to compare your own device/browser combinations against each other or over time, not against a different benchmarking tool's number." },
        { question: 'Why does my score change between runs?', answer: 'Background tabs, browser power-saving mode, thermal state from a previous run, and other apps competing for CPU/GPU all shift the result run to run - that variability is real, not measurement noise.' },
        { question: 'What exactly does the GPU test measure?', answer: 'Fragment (pixel) shader throughput: it renders an animated fractal via WebGL and times how many frames it can draw in a fixed window. That is one real slice of GPU performance, not a full 3D rendering or ray-tracing benchmark.' },
        { question: 'Why is random-access memory speed so much lower than sequential?', answer: "CPU cache misses. Sequential access lets the hardware prefetcher stay ahead of you; scattering reads across a large array defeats that and falls back to slower main-memory latency on almost every access. That gap is a real, expected effect - not a bug in the test." },
        { question: 'Is any of my data sent anywhere?', answer: 'No. Every test runs entirely in your browser via Web Workers and WebGL - nothing is uploaded, and results are only stored locally in your browser if you want a history to compare against.' },
        { question: 'Will running this stress test damage my device?', answer: "It briefly pushes CPU/GPU utilisation to 100%, the same as any demanding app. Stop the stress test any time. Modern hardware has thermal protection built in, but very old or passively-cooled devices may get warm and slow down under sustained load - that throttling is exactly what the Live Stress Test is designed to reveal." },
    ];

    return (
        <ServicePageShell
            icon={Memory}
            title="CPU, GPU & RAM Benchmark"
            subtitle="Real-time system load testing and benchmark scoring, 100% in your browser"
            maxWidth="lg"
            toolId={67}
            keywords={['cpu benchmark online', 'gpu benchmark browser', 'ram speed test', 'cpu stress test online', 'browser benchmark tool', 'multi-core benchmark', 'webgl gpu test', 'system performance test']}
            howToSteps={howToSteps}
            faq={faq}
            about="Benchmarks single-core and multi-core CPU throughput (integer trial-division and floating-point matrix workloads run in Web Workers across every logical core reported by your browser), GPU fragment-shader throughput (an animated fractal rendered via WebGL), and RAM bandwidth (sequential vs. random-access TypedArray timing). A Live Stress Test mode keeps every core loaded continuously so you can watch sustained performance and spot thermal throttling in real time. Everything runs client-side - no upload, no server round-trip."
        >
            <canvas ref={gpuCanvasRef} style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />

            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}
            >
                <Tab label="Benchmark" />
                <Tab label="Live Stress Test" />
                <Tab label="System Info" />
            </Tabs>

            {tab === 0 && (
                <Box sx={{ overflowY: 'auto' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {PHASE_ORDER.map((p) => {
                                const isActive = running && activeGroup === p.key;
                                const isDone = phase === 'complete' || PHASE_ORDER.findIndex((x) => x.key === p.key) < PHASE_ORDER.findIndex((x) => x.key === activeGroup);
                                return (
                                    <Chip
                                        key={p.key}
                                        label={p.label}
                                        size="small"
                                        color={isActive ? 'primary' : isDone ? 'success' : 'default'}
                                        variant={isActive || isDone ? 'filled' : 'outlined'}
                                    />
                                );
                            })}
                        </Stack>
                        <Button
                            variant="contained"
                            startIcon={<PlayArrow />}
                            onClick={runFullBenchmark}
                            disabled={running}
                        >
                            {running ? 'Running…' : results ? 'Run Again' : 'Run Benchmark'}
                        </Button>
                    </Stack>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {running && (
                        <Card sx={{ p: 2.5, mb: 3 }}>
                            <Typography variant="overline" color="text.secondary">
                                {phase === 'single-int' && 'Single-Core · Integer workload'}
                                {phase === 'single-float' && 'Single-Core · Floating-point workload'}
                                {phase === 'multi-int' && `Multi-Core (${cores} threads) · Integer workload`}
                                {phase === 'multi-float' && `Multi-Core (${cores} threads) · Floating-point workload`}
                                {phase === 'gpu' && 'GPU · WebGL shader throughput'}
                                {phase === 'memory' && 'RAM · Bandwidth'}
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ my: 1 }}>
                                {phase === 'memory' ? 'Measuring…' :
                                    phase === 'gpu' ? `${fmt(liveValue, 1)} fps` :
                                    `${fmtOps(liveValue)} ${phase.includes('float') ? 'FLOPS' : 'ops/sec'}`}
                            </Typography>
                            <LinearProgress
                                variant={phase === 'memory' ? 'indeterminate' : 'determinate'}
                                value={phase === 'memory' ? undefined : phaseProgress}
                                sx={{ borderRadius: 1, height: 6 }}
                            />
                            {(phase === 'multi-int' || phase === 'multi-float') && coreLoads.length > 0 && (
                                <Box sx={{ mt: 2.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Per-core load</Typography>
                                    <CoreGrid loads={coreLoads} />
                                </Box>
                            )}
                        </Card>
                    )}

                    {results && !running && (
                        <Card sx={{ p: 3, mb: 3 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">Composite Score</Typography>
                                    <Typography variant="h2" fontWeight={900} sx={{ lineHeight: 1 }}>{fmt(results.totalScore)}</Typography>
                                </Box>
                                <Chip icon={<Bolt />} label={`${results.cores} logical cores`} variant="outlined" />
                            </Stack>

                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6} sm={3}><ScoreTile label="Single-Core" value={results.singleCoreScore} /></Grid>
                                <Grid item xs={6} sm={3}><ScoreTile label="Multi-Core" value={results.multiCoreScore} /></Grid>
                                <Grid item xs={6} sm={3}><ScoreTile label="GPU" value={results.gpuScore} disabled={!results.gpuSupported} /></Grid>
                                <Grid item xs={6} sm={3}><ScoreTile label="Memory" value={results.memoryScore} /></Grid>
                            </Grid>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={5}>
                                    <Box sx={{ height: 260 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={radarData} outerRadius="75%">
                                                <PolarGrid stroke="rgba(255,255,255,0.15)" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                                                <PolarRadiusAxis tick={false} axisLine={false} />
                                                <Radar dataKey="score" stroke={theme.palette.primary.main} fill={theme.palette.primary.main} fillOpacity={0.35} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={7}>
                                    <Table size="small">
                                        <TableBody>
                                            <TableRow>
                                                <TableCell sx={{ border: 0 }}>Single-core integer</TableCell>
                                                <TableCell sx={{ border: 0 }} align="right">{fmtOps(results.singleCoreIntOps)} checks/sec</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ border: 0 }}>Single-core float</TableCell>
                                                <TableCell sx={{ border: 0 }} align="right">{fmtOps(results.singleCoreFloatFlops)} FLOPS</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ border: 0 }}>Multi-core integer</TableCell>
                                                <TableCell sx={{ border: 0 }} align="right">{fmtOps(results.multiCoreIntOps)} checks/sec</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ border: 0 }}>Multi-core float</TableCell>
                                                <TableCell sx={{ border: 0 }} align="right">{fmtOps(results.multiCoreFloatFlops)} FLOPS</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ border: 0 }}>GPU</TableCell>
                                                <TableCell sx={{ border: 0 }} align="right">{results.gpuSupported ? `${fmt(results.gpuFps, 1)} fps` : 'Not supported'}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ border: 0 }}>RAM write / read / random</TableCell>
                                                <TableCell sx={{ border: 0 }} align="right">{fmt(results.memWriteMBs)} / {fmt(results.memReadMBs)} / {fmt(results.memRandomMBs)} MB/s</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ border: 0 }}>GPU renderer</TableCell>
                                                <TableCell sx={{ border: 0 }} align="right">{results.gpuRenderer}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </Grid>
                            </Grid>
                        </Card>
                    )}

                    {history.length > 0 && (
                        <Card sx={{ p: 2.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="subtitle2" color="text.secondary">Run History (this browser)</Typography>
                                <Button size="small" startIcon={<DeleteOutline />} onClick={clearHistory}>Clear</Button>
                            </Stack>
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>When</TableCell>
                                            <TableCell align="right">Score</TableCell>
                                            <TableCell align="right">Single</TableCell>
                                            <TableCell align="right">Multi</TableCell>
                                            <TableCell align="right">GPU</TableCell>
                                            <TableCell align="right">Memory</TableCell>
                                            <TableCell align="right">Cores</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {history.map((h) => (
                                            <TableRow key={h.timestamp}>
                                                <TableCell>{new Date(h.timestamp).toLocaleString()}</TableCell>
                                                <TableCell align="right"><strong>{fmt(h.totalScore)}</strong></TableCell>
                                                <TableCell align="right">{fmt(h.singleCoreScore)}</TableCell>
                                                <TableCell align="right">{fmt(h.multiCoreScore)}</TableCell>
                                                <TableCell align="right">{h.gpuSupported ? fmt(h.gpuScore) : 'N/A'}</TableCell>
                                                <TableCell align="right">{fmt(h.memoryScore)}</TableCell>
                                                <TableCell align="right">{h.cores}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Card>
                    )}
                </Box>
            )}

            {tab === 1 && (
                <Box sx={{ overflowY: 'auto' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
                        <ToggleButtonGroup
                            size="small"
                            value={stressWorkload}
                            exclusive
                            onChange={(_, v) => v && setStressWorkload(v)}
                            disabled={stressRunning}
                        >
                            <ToggleButton value="int">Integer</ToggleButton>
                            <ToggleButton value="float">Floating-Point</ToggleButton>
                        </ToggleButtonGroup>
                        <Button
                            variant="contained"
                            color={stressRunning ? 'error' : 'primary'}
                            startIcon={stressRunning ? <Stop /> : <PlayArrow />}
                            onClick={stressRunning ? stopStress : startStress}
                        >
                            {stressRunning ? 'Stop' : 'Start Stress Test'}
                        </Button>
                    </Stack>

                    {throttleWarning && (
                        <Alert severity="warning" icon={<DeviceThermostat />} sx={{ mb: 2 }}>
                            Sustained throughput has dropped more than 15% below its peak - this can indicate thermal throttling under sustained load.
                        </Alert>
                    )}

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={4}><ScoreTile label="Elapsed" value={stressElapsed} suffix="s" /></Grid>
                        <Grid item xs={4}><ScoreTile label="Current /s" value={stressCoreLoads.reduce((a, b) => a + b, 0)} /></Grid>
                        <Grid item xs={4}><ScoreTile label="Peak /s" value={stressPeak} /></Grid>
                    </Grid>

                    <Card sx={{ p: 2.5, mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Aggregate throughput over time
                        </Typography>
                        <Box sx={{ width: '100%', height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stressChart}>
                                    <defs>
                                        <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis hide dataKey="time" />
                                    <YAxis hide domain={[0, 'auto']} />
                                    <Area type="monotone" dataKey="total" stroke={theme.palette.primary.main} strokeWidth={2} fill="url(#stressGradient)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>

                    {stressCoreLoads.length > 0 && (
                        <Card sx={{ p: 2.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                                Per-core load ({cores} logical cores)
                            </Typography>
                            <CoreGrid loads={stressCoreLoads} />
                        </Card>
                    )}
                </Box>
            )}

            {tab === 2 && (
                <Box sx={{ overflowY: 'auto' }}>
                    <Card sx={{ p: 2.5 }}>
                        <Table size="small">
                            <TableBody>
                                <TableRow>
                                    <TableCell sx={{ border: 0 }}>Logical CPU cores</TableCell>
                                    <TableCell sx={{ border: 0 }} align="right">{cores}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: 0 }}>Reported device memory</TableCell>
                                    <TableCell sx={{ border: 0 }} align="right">
                                        {deviceMemory ? `≥ ${deviceMemory} GB (browser-capped, Chrome-only)` : 'Not reported by this browser'}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: 0 }}>GPU renderer</TableCell>
                                    <TableCell sx={{ border: 0 }} align="right">{sysGpuRenderer}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: 0 }}>WebGL2 support</TableCell>
                                    <TableCell sx={{ border: 0 }} align="right">{webgl2Supported ? 'Yes' : 'No (WebGL1 fallback)'}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: 0 }}>Platform</TableCell>
                                    <TableCell sx={{ border: 0 }} align="right">{navigator.platform || 'Unknown'}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Card>
                    <Alert severity="info" icon={<Storage />} sx={{ mt: 2 }}>
                        Device memory and CPU core counts reported by browsers are intentionally rounded/capped for privacy - they're a lower bound, not an exact spec. The benchmark itself measures real, unrounded throughput instead of relying on these figures.
                    </Alert>
                </Box>
            )}
        </ServicePageShell>
    );
};

export default CpuLoadTest;
