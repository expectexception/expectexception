/* eslint-disable no-restricted-globals */
// Runs the actual CPU/memory compute workloads off the main thread so the
// UI stays responsive while a core is pegged at 100%. Each workload is a
// single synchronous loop - postMessage() out doesn't require the worker to
// yield, and a fixed-duration run naturally returns on its own, so there's
// no need for chunked/cooperative cancellation here. The "Live Stress Test"
// mode reuses the exact same loops with durationMs = Infinity and relies on
// the main thread calling worker.terminate() to stop it, which is instant
// and needs no in-loop cooperation either.
export {};

const ctx: Worker = self as any;

type InMsg =
    | { type: 'run'; workload: 'int' | 'float'; durationMs: number }
    | { type: 'stress'; workload: 'int' | 'float' }
    | { type: 'memory'; sizeMB: number };

const REPORT_INTERVAL_MS = 200;

/** Trial-division prime search. Deliberately not sieve-based: this is a
 * synthetic CPU load generator, not a "find primes fast" exercise, so the
 * point is to burn real integer/branch/division cycles. `totalChecks`
 * (divisibility tests performed) is the throughput unit reported out. */
function runInt(durationMs: number) {
    const start = performance.now();
    let candidate = 2;
    let totalChecks = 0;
    let primesFound = 0;
    let lastReport = 0;

    while (true) {
        for (let i = 0; i < 256; i++) {
            candidate++;
            let isPrime = true;
            const limit = Math.sqrt(candidate);
            for (let d = 2; d <= limit; d++) {
                totalChecks++;
                if (candidate % d === 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) primesFound++;
        }

        const elapsed = performance.now() - start;
        if (elapsed - lastReport > REPORT_INTERVAL_MS) {
            ctx.postMessage({
                type: 'progress',
                opsPerSec: totalChecks / (elapsed / 1000),
                totalOps: totalChecks,
                elapsedMs: elapsed,
            });
            lastReport = elapsed;
        }

        if (elapsed >= durationMs) {
            ctx.postMessage({
                type: 'done',
                opsPerSec: totalChecks / (elapsed / 1000),
                totalOps: totalChecks,
                elapsedMs: elapsed,
                extra: primesFound,
            });
            return;
        }
    }
}

/** Dense NxN matrix multiply, repeated. Real floating-point throughput
 * (FLOPS), not vectorised by the JS engine, so it reflects scalar FP
 * performance. Feeding c[0] back into a[0] each pass stops the JIT from
 * recognising the loop body as invariant and hoisting/skipping it. */
function runFloat(durationMs: number) {
    const start = performance.now();
    const N = 48;
    const a = new Float64Array(N * N);
    const b = new Float64Array(N * N);
    const c = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) {
        a[i] = Math.sin(i);
        b[i] = Math.cos(i);
    }
    const flopsPerMul = 2 * N * N * N;
    let totalFlops = 0;
    let multiplications = 0;
    let lastReport = 0;

    while (true) {
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                let sum = 0;
                for (let k = 0; k < N; k++) {
                    sum += a[i * N + k] * b[k * N + j];
                }
                c[i * N + j] = sum;
            }
        }
        multiplications++;
        totalFlops += flopsPerMul;
        a[0] = (c[0] % 1000) * 0.0001 + 0.5;

        const elapsed = performance.now() - start;
        if (elapsed - lastReport > REPORT_INTERVAL_MS) {
            ctx.postMessage({
                type: 'progress',
                opsPerSec: totalFlops / (elapsed / 1000),
                totalOps: totalFlops,
                elapsedMs: elapsed,
            });
            lastReport = elapsed;
        }

        if (elapsed >= durationMs) {
            ctx.postMessage({
                type: 'done',
                opsPerSec: totalFlops / (elapsed / 1000),
                totalOps: totalFlops,
                elapsedMs: elapsed,
                extra: multiplications,
            });
            return;
        }
    }
}

/** Sequential write, sequential read, then pseudo-random-index read over a
 * large Float64Array, each timed separately. Random access is expected to
 * land far below sequential - that gap is cache-miss behaviour, a real
 * signal, not a bug in the test. */
function runMemory(sizeMB: number) {
    try {
        const bytes = sizeMB * 1024 * 1024;
        const count = Math.floor(bytes / 8);
        const buf = new Float64Array(count);

        let t0 = performance.now();
        for (let i = 0; i < count; i++) buf[i] = i * 0.5;
        let t1 = performance.now();
        const writeMBs = bytes / 1048576 / ((t1 - t0) / 1000);

        t0 = performance.now();
        let sum = 0;
        for (let i = 0; i < count; i++) sum += buf[i];
        t1 = performance.now();
        const readMBs = bytes / 1048576 / ((t1 - t0) / 1000);

        const numAccess = Math.min(count, 4_000_000);
        let seed = 12345;
        let randSum = 0;
        t0 = performance.now();
        for (let i = 0; i < numAccess; i++) {
            // Simple LCG - deterministic and fast, just needs to scatter
            // indices enough to defeat sequential prefetch.
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            randSum += buf[seed % count];
        }
        t1 = performance.now();
        const randomMBs = (numAccess * 8) / 1048576 / ((t1 - t0) / 1000);

        ctx.postMessage({
            type: 'memory-done',
            writeMBs,
            readMBs,
            randomMBs,
            checksum: sum + randSum,
        });
    } catch (e: any) {
        ctx.postMessage({
            type: 'error',
            message: e?.message || 'Memory test failed - the requested block may be too large for this device.',
        });
    }
}

ctx.onmessage = (e: MessageEvent<InMsg>) => {
    const msg = e.data;
    if (msg.type === 'run') {
        if (msg.workload === 'int') runInt(msg.durationMs);
        else runFloat(msg.durationMs);
    } else if (msg.type === 'stress') {
        if (msg.workload === 'int') runInt(Infinity);
        else runFloat(Infinity);
    } else if (msg.type === 'memory') {
        runMemory(msg.sizeMB);
    }
};
