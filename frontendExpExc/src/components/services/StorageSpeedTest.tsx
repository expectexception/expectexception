import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Box, Card, Typography, Grid, Paper, Stack, Button, LinearProgress, Alert,
    Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import { SdStorage, PlayArrow } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * How this works: ordinary JavaScript in a browser tab has no access
 * to the real filesystem, so IndexedDB is the closest thing to a real
 * "disk" a web page can benchmark. This writes real random bytes into
 * a real IndexedDB object store, times the write transaction from
 * start to commit, reads every byte back in a second transaction, and
 * times that too. The MB/s numbers below come directly from those two
 * measured durations. See the FAQ for why that number differs from a
 * raw hardware disk-speed rating.
 * ------------------------------------------------------------------ */
const DB_NAME = 'storage-speed-test-db';
const STORE_NAME = 'chunks';
const DB_VERSION = 1;
const CHUNK_SIZE = 256 * 1024; // 256KB
const CHUNK_COUNT = 50; // ~12.5MB total
const TOTAL_BYTES = CHUNK_SIZE * CHUNK_COUNT;
const CRYPTO_MAX_BYTES = 65536; // crypto.getRandomValues() rejects requests larger than this
const MAX_HISTORY = 5;

type Stage = 'idle' | 'preparing' | 'writing' | 'reading' | 'cleaning' | 'done';

interface RunResult {
    timestamp: number;
    writeMBs: number;
    readMBs: number;
    writeMs: number;
    readMs: number;
    totalBytes: number;
    chunkCount: number;
}

function randomBytes(size: number): Uint8Array {
    const buf = new Uint8Array(size);
    for (let offset = 0; offset < size; offset += CRYPTO_MAX_BYTES) {
        const end = Math.min(offset + CRYPTO_MAX_BYTES, size);
        crypto.getRandomValues(buf.subarray(offset, end));
    }
    return buf;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB is not available in this browsing context.'));
            return;
        }
        let req: IDBOpenDBRequest;
        try {
            req = window.indexedDB.open(DB_NAME, DB_VERSION);
        } catch {
            reject(new Error('IndexedDB is not available in this browsing context.'));
            return;
        }
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB is not available in this browsing context.'));
        req.onblocked = () => reject(new Error('The IndexedDB open request was blocked by another open tab using the same test database.'));
    });
}

// Times the full write transaction from start to commit, exactly like a
// real disk-write benchmark would. Progress is reported as each put()
// request resolves, but the timed value is the transaction's total
// wall-clock duration, not the sum of individual request times.
function runWrite(db: IDBDatabase, chunks: Uint8Array[], onProgress: (done: number) => void): Promise<number> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const start = performance.now();
        let completed = 0;
        chunks.forEach((chunk, i) => {
            const req = store.put(chunk, i);
            req.onsuccess = () => {
                completed++;
                onProgress(completed);
            };
        });
        tx.oncomplete = () => resolve(performance.now() - start);
        tx.onerror = () => reject(tx.error || new Error('The write test failed partway through.'));
        tx.onabort = () => reject(tx.error || new Error('The write transaction was aborted.'));
    });
}

// Reads every chunk back and sums its bytes so the read genuinely has to
// touch the returned data (a JS engine can't fold that away like it
// might with an unused value), then times the whole transaction.
function runRead(db: IDBDatabase, keys: number[], onProgress: (done: number) => void): Promise<{ elapsedMs: number; checksum: number }> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const start = performance.now();
        let completed = 0;
        let checksum = 0;
        keys.forEach((key) => {
            const req = store.get(key);
            req.onsuccess = () => {
                const data = req.result as Uint8Array | undefined;
                if (data) {
                    let sum = 0;
                    for (let i = 0; i < data.length; i++) sum += data[i];
                    checksum += sum;
                }
                completed++;
                onProgress(completed);
            };
        });
        tx.oncomplete = () => resolve({ elapsedMs: performance.now() - start, checksum });
        tx.onerror = () => reject(tx.error || new Error('The read test failed partway through.'));
        tx.onabort = () => reject(tx.error || new Error('The read transaction was aborted.'));
    });
}

function clearStore(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Failed to clear test data.'));
        tx.onabort = () => reject(tx.error || new Error('Failed to clear test data.'));
    });
}

function fmtMBs(n: number): string {
    if (!isFinite(n) || n <= 0) return '--';
    return `${n.toFixed(1)} MB/s`;
}

function fmtMB(bytes: number): string {
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function StatTile({ label, value }: { label: string; value: string }) {
    return (
        <Paper sx={{
            p: 2, textAlign: 'center', borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.08)',
        }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="h5" fontWeight={800}>{value}</Typography>
        </Paper>
    );
}

const STAGE_LABEL: Record<Stage, string> = {
    idle: '',
    preparing: 'Generating random test data…',
    writing: 'Writing to IndexedDB',
    reading: 'Reading from IndexedDB',
    cleaning: 'Clearing test data…',
    done: 'Done',
};

const StorageSpeedTest: React.FC = () => {
    const [stage, setStage] = useState<Stage>('idle');
    const [chunksDone, setChunksDone] = useState(0);
    const [result, setResult] = useState<RunResult | null>(null);
    const [history, setHistory] = useState<RunResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [unsupported, setUnsupported] = useState(false);

    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        try {
            if (typeof window === 'undefined' || !window.indexedDB) setUnsupported(true);
        } catch {
            setUnsupported(true);
        }
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const running = stage !== 'idle' && stage !== 'done';

    const runTest = useCallback(async () => {
        setError(null);
        setResult(null);
        setChunksDone(0);
        setStage('preparing');

        let db: IDBDatabase | null = null;
        try {
            db = await openDb();

            // Generate every chunk up front so random-data generation time
            // doesn't bleed into the write timing below.
            const chunks: Uint8Array[] = Array.from({ length: CHUNK_COUNT }, () => randomBytes(CHUNK_SIZE));
            if (!isMountedRef.current) return;

            setStage('writing');
            const writeMs = await runWrite(db, chunks, (done) => {
                if (isMountedRef.current) setChunksDone(done);
            });
            if (!isMountedRef.current) return;

            setStage('reading');
            setChunksDone(0);
            const keys = chunks.map((_, i) => i);
            const { elapsedMs: readMs } = await runRead(db, keys, (done) => {
                if (isMountedRef.current) setChunksDone(done);
            });
            if (!isMountedRef.current) return;

            setStage('cleaning');
            await clearStore(db);
            if (!isMountedRef.current) return;

            const writeMBs = (TOTAL_BYTES / 1048576) / (writeMs / 1000);
            const readMBs = (TOTAL_BYTES / 1048576) / (readMs / 1000);
            const entry: RunResult = {
                timestamp: Date.now(),
                writeMBs, readMBs, writeMs, readMs,
                totalBytes: TOTAL_BYTES,
                chunkCount: CHUNK_COUNT,
            };
            setResult(entry);
            setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
            setStage('done');
        } catch (e: any) {
            if (isMountedRef.current) {
                const message: string = e?.message || 'The storage speed test failed unexpectedly.';
                setError(
                    e?.name === 'QuotaExceededError'
                        ? "This browsing context doesn't have enough storage quota available to run the test (common in private/incognito windows)."
                        : message
                );
                setStage('idle');
                if (/indexeddb is not available/i.test(message)) setUnsupported(true);
            }
        } finally {
            if (db) {
                try { db.close(); } catch { /* already closed */ }
            }
        }
    }, []);

    const progressPct = (chunksDone / CHUNK_COUNT) * 100;

    const howToSteps = [
        { name: 'Run the test', text: 'Click Run Test. The tool first generates about 12.5MB of random data in memory, then writes it into a dedicated IndexedDB database in a single transaction.' },
        { name: 'Watch the write phase', text: 'A live counter tracks each chunk as IndexedDB confirms it was persisted, and the progress bar fills as the write transaction commits.' },
        { name: 'Watch the read phase', text: 'Once every chunk is written, the tool reads all of them back and sums every byte so the browser cannot skip the work.' },
        { name: 'Check the results', text: 'Write and read throughput in MB/s appear once both phases finish, and the roughly 12.5MB of test data is cleared from IndexedDB automatically right after.' },
    ];

    const faq = [
        {
            question: 'Is this measuring my SSD or hard drive speed?',
            answer: "Not directly. IndexedDB usually sits on top of your operating system's real filesystem, but the browser adds its own layer on top of that: each chunk gets serialized, wrapped in a transaction, and committed according to that browser's own storage engine. What you're seeing is how fast a web page can persist and retrieve data through that layer. That's a real, useful number on its own, even though it differs from a raw hardware benchmark of the drive itself.",
        },
        {
            question: "Why is my result slower than my drive's rated speed?",
            answer: 'A few things stack up: per-write transaction bookkeeping, structured-clone serialization of each chunk, storage quota accounting, and on some operating systems, encryption-at-rest applied transparently below the browser. None of that is a flaw in the test. It is the actual cost of going through a browser storage API instead of writing to a file directly.',
        },
        {
            question: 'Does this leave data sitting in my browser afterward?',
            answer: "During the test, yes, by design. It writes about 12.5MB of random bytes to a database called storage-speed-test-db under this site's origin, because that's what makes the measurement come from a real write and read rather than a guess. The tool clears that data automatically as soon as the read phase finishes, so nothing lingers between runs.",
        },
        {
            question: 'Why do write and read speeds differ so much?',
            answer: "Writes have to go through a full transaction commit, and on most browsers that means the data is flushed and confirmed durable before the transaction reports complete. Reads only have to fetch bytes that are already sitting in storage, often still warm in the OS page cache from the write you just did, so it's normal for reads to come back noticeably faster.",
        },
        {
            question: 'Will this work in private or incognito mode?',
            answer: 'It depends on the browser. Some restrict IndexedDB to a small quota in private windows, others disable it outright. If IndexedDB is not usable in your current browsing context, the tool detects that up front and says so plainly instead of failing partway through.',
        },
    ];

    return (
        <ServicePageShell
            icon={SdStorage}
            title="Storage (IndexedDB) Speed Test"
            subtitle="Real write and read throughput to your browser's IndexedDB storage, measured in MB/s"
            maxWidth="sm"
            toolId={91}
            seoTitle="IndexedDB Storage Speed Test - Real Browser Read/Write Benchmark | ExpectException"
            seoDescription="Measure real write and read throughput to your browser's IndexedDB storage in MB/s. A genuine client-side benchmark with no upload; test data is cleared automatically after every run."
            keywords={['indexeddb speed test', 'browser storage benchmark', 'disk speed test online', 'indexeddb read write test', 'client side storage benchmark', 'web storage performance test']}
            about="This tool measures write and read throughput to your browser's IndexedDB, the closest thing to a real storage benchmark a web page can run since ordinary JavaScript has no access to your actual filesystem. It generates about 12.5MB of random data across 50 chunks, writes them into a single IndexedDB transaction and times it from start to commit, then reads every chunk back in a separate transaction and sums every byte so the browser can't skip the work. Results show write and read speed in MB/s alongside the total data size and chunk count. All of the test data is deleted from IndexedDB automatically once the read finishes, so nothing is left behind between runs."
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
                {unsupported ? (
                    <Alert severity="warning">
                        IndexedDB is not available in this browsing context. Some browsers restrict or disable it in private/incognito windows, which makes a real storage benchmark impossible to run here.
                    </Alert>
                ) : (
                    <>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {CHUNK_COUNT} chunks × 256KB (~{fmtMB(TOTAL_BYTES)}) written, then read back
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<PlayArrow />}
                                onClick={runTest}
                                disabled={running}
                            >
                                {running ? 'Running…' : result ? 'Run Again' : 'Run Test'}
                            </Button>
                        </Stack>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        {running && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="overline" color="text.secondary">
                                    {STAGE_LABEL[stage]}
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ my: 1 }}>
                                    {stage === 'writing' || stage === 'reading'
                                        ? `Chunk ${chunksDone}/${CHUNK_COUNT}`
                                        : 'Please wait…'}
                                </Typography>
                                <LinearProgress
                                    variant={stage === 'writing' || stage === 'reading' ? 'determinate' : 'indeterminate'}
                                    value={stage === 'writing' || stage === 'reading' ? progressPct : undefined}
                                    sx={{ borderRadius: 1, height: 6 }}
                                />
                            </Box>
                        )}

                        {result && !running && (
                            <Grid container spacing={2} sx={{ mb: history.length > 0 ? 3 : 0 }}>
                                <Grid item xs={6} sm={3}><StatTile label="Write" value={fmtMBs(result.writeMBs)} /></Grid>
                                <Grid item xs={6} sm={3}><StatTile label="Read" value={fmtMBs(result.readMBs)} /></Grid>
                                <Grid item xs={6} sm={3}><StatTile label="Data size" value={fmtMB(result.totalBytes)} /></Grid>
                                <Grid item xs={6} sm={3}><StatTile label="Chunks" value={`${result.chunkCount}`} /></Grid>
                            </Grid>
                        )}

                        {history.length > 0 && (
                            <Box sx={{ overflowX: 'auto' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    Run history (this session)
                                </Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>When</TableCell>
                                            <TableCell align="right">Write</TableCell>
                                            <TableCell align="right">Read</TableCell>
                                            <TableCell align="right">Size</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {history.map((h) => (
                                            <TableRow key={h.timestamp}>
                                                <TableCell>{new Date(h.timestamp).toLocaleTimeString()}</TableCell>
                                                <TableCell align="right">{fmtMBs(h.writeMBs)}</TableCell>
                                                <TableCell align="right">{fmtMBs(h.readMBs)}</TableCell>
                                                <TableCell align="right">{fmtMB(h.totalBytes)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </>
                )}
            </Card>
        </ServicePageShell>
    );
};

export default StorageSpeedTest;
