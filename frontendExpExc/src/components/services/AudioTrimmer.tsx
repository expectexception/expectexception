import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box, Button, Card, Stack, Typography, Alert, alpha, useTheme, LinearProgress,
} from '@mui/material';
import { ContentCut, Upload, Download } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const WAVEFORM_HEIGHT = 140;
const MIN_SELECTION_SECONDS = 0.05;
const HANDLE_HIT_PX = 14;

/** mm:ss.ss, guarding against toFixed(2) rounding 59.995s up into "60.00"
 * instead of carrying it into the next minute. */
function formatTime(totalSeconds: number): string {
    const clamped = Math.max(0, totalSeconds);
    let minutes = Math.floor(clamped / 60);
    let seconds = clamped - minutes * 60;
    if (seconds >= 59.995) {
        seconds = 0;
        minutes += 1;
    }
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}

/** Downsamples every channel of an AudioBuffer into `numBuckets` min/max
 * pairs (one bucket per canvas pixel column) - the standard technique for
 * drawing a waveform without plotting every individual sample. Channels are
 * averaged together purely for this visual; the actual trim/export below
 * keeps every channel intact. */
function computeWaveformPeaks(buffer: AudioBuffer, numBuckets: number): { min: Float32Array; max: Float32Array } {
    const length = buffer.length;
    const numChannels = buffer.numberOfChannels;
    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

    const min = new Float32Array(numBuckets);
    const max = new Float32Array(numBuckets);
    const samplesPerBucket = length / numBuckets;

    for (let b = 0; b < numBuckets; b++) {
        const start = Math.floor(b * samplesPerBucket);
        const end = Math.min(length, Math.floor((b + 1) * samplesPerBucket));
        let bucketMin = 0;
        let bucketMax = 0;
        if (end > start) {
            bucketMin = Infinity;
            bucketMax = -Infinity;
            for (let i = start; i < end; i++) {
                let sum = 0;
                for (let c = 0; c < numChannels; c++) sum += channels[c][i];
                const v = sum / numChannels;
                if (v < bucketMin) bucketMin = v;
                if (v > bucketMax) bucketMax = v;
            }
        }
        min[b] = bucketMin;
        max[b] = bucketMax;
    }
    return { min, max };
}

/** Hand-writes a standard 44-byte RIFF/WAVE/fmt/data header followed by
 * interleaved 16-bit PCM samples, covering only [startSample, endSample) of
 * every channel. This is the well-established way to produce a playable WAV
 * from raw Web Audio API data with no encoder library. */
function encodeWavSlice(buffer: AudioBuffer, startSample: number, endSample: number): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const frameCount = Math.max(0, endSample - startSample);
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = frameCount * blockAlign;

    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, text: string) => {
        for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM fmt chunk size
    view.setUint16(20, 1, true); // audio format 1 = PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channelData: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) channelData.push(buffer.getChannelData(c));

    let offset = 44;
    for (let i = startSample; i < endSample; i++) {
        for (let c = 0; c < numChannels; c++) {
            const sample = Math.max(-1, Math.min(1, channelData[c][i]));
            view.setInt16(offset, sample * 0x7fff, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

const AudioTrimmer: React.FC = () => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const waveCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const draggingRef = useRef<'start' | 'end' | null>(null);

    const [containerWidth, setContainerWidth] = useState(0);
    const [fileName, setFileName] = useState<string | null>(null);
    const [decoding, setDecoding] = useState(false);
    const [ready, setReady] = useState(false);
    const [duration, setDuration] = useState(0);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const getAudioContext = useCallback((): AudioContext => {
        if (!audioContextRef.current) {
            // Safari historically exposed this constructor only with a
            // vendor prefix. Reaching it through an inline shape (rather
            // than `any`) keeps this narrowly typed to just that lookup.
            const ctor: typeof AudioContext =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioContextRef.current = new ctor();
        }
        return audioContextRef.current;
    }, []);

    useEffect(() => {
        return () => {
            audioContextRef.current?.close().catch(() => {
                // already closed / closing - nothing to do
            });
        };
    }, []);

    // Track the waveform box's actual rendered width so both canvases can be
    // sized to it and the waveform is downsampled to real pixel columns.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const width = Math.floor(entries[0].contentRect.width);
            setContainerWidth((prev) => (Math.abs(prev - width) > 1 ? width : prev));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Base waveform layer - only recomputed when the decoded buffer or the
    // canvas width changes, since re-bucketing every sample is the
    // expensive part of drawing this.
    useEffect(() => {
        const canvas = waveCanvasRef.current;
        if (!canvas || containerWidth === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(containerWidth * dpr);
        canvas.height = Math.floor(WAVEFORM_HEIGHT * dpr);
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${WAVEFORM_HEIGHT}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, containerWidth, WAVEFORM_HEIGHT);

        const buffer = audioBufferRef.current;
        if (!buffer) return;

        const { min, max } = computeWaveformPeaks(buffer, containerWidth);
        const mid = WAVEFORM_HEIGHT / 2;
        ctx.strokeStyle = alpha(theme.palette.primary.main, 0.9);
        ctx.lineWidth = 1;
        for (let x = 0; x < containerWidth; x++) {
            const yTop = mid - max[x] * mid;
            const yBottom = mid - min[x] * mid;
            ctx.beginPath();
            ctx.moveTo(x + 0.5, Math.min(yTop, mid - 0.5));
            ctx.lineTo(x + 0.5, Math.max(yBottom, mid + 0.5));
            ctx.stroke();
        }
    }, [containerWidth, ready, theme]);

    // Overlay layer (selection dimming + drag handles) - cheap to redraw on
    // every drag frame since it never touches the sample data.
    useEffect(() => {
        const canvas = overlayCanvasRef.current;
        if (!canvas || containerWidth === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(containerWidth * dpr);
        canvas.height = Math.floor(WAVEFORM_HEIGHT * dpr);
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${WAVEFORM_HEIGHT}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, containerWidth, WAVEFORM_HEIGHT);

        if (!ready || duration <= 0) return;

        const startX = (trimStart / duration) * containerWidth;
        const endX = (trimEnd / duration) * containerWidth;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        if (startX > 0) ctx.fillRect(0, 0, startX, WAVEFORM_HEIGHT);
        if (endX < containerWidth) ctx.fillRect(endX, 0, containerWidth - endX, WAVEFORM_HEIGHT);

        ctx.fillStyle = theme.palette.primary.main;
        ctx.fillRect(Math.max(0, startX - 2), 0, 4, WAVEFORM_HEIGHT);
        ctx.fillRect(Math.max(0, endX - 2), 0, 4, WAVEFORM_HEIGHT);
        ctx.fillRect(Math.max(0, startX - 6), 0, 12, 10);
        ctx.fillRect(Math.max(0, endX - 6), 0, 12, 10);
    }, [containerWidth, trimStart, trimEnd, duration, ready, theme]);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset so choosing the same file twice in a row still fires onChange.
        e.target.value = '';
        if (!file) return;

        setError(null);
        setDecoding(true);
        setReady(false);
        audioBufferRef.current = null;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const context = getAudioContext();
            const decoded = await context.decodeAudioData(arrayBuffer);
            audioBufferRef.current = decoded;
            setFileName(file.name);
            setDuration(decoded.duration);
            setTrimStart(0);
            setTrimEnd(decoded.duration);
            setReady(true);
        } catch {
            audioBufferRef.current = null;
            setFileName(null);
            setDuration(0);
            setTrimStart(0);
            setTrimEnd(0);
            setError('Could not decode that file. It may be corrupted or in a format this browser cannot play.');
        } finally {
            setDecoding(false);
        }
    }, [getAudioContext]);

    const timeAtClientX = useCallback((clientX: number, rectLeft: number, rectWidth: number): number => {
        if (duration <= 0 || rectWidth <= 0) return 0;
        const ratio = (clientX - rectLeft) / rectWidth;
        return Math.max(0, Math.min(duration, ratio * duration));
    }, [duration]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!ready) return;
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const startX = (trimStart / duration) * rect.width;
        const endX = (trimEnd / duration) * rect.width;
        const distStart = Math.abs(x - startX);
        const distEnd = Math.abs(x - endX);
        if (distStart > HANDLE_HIT_PX && distEnd > HANDLE_HIT_PX) return;
        draggingRef.current = distStart <= distEnd ? 'start' : 'end';
        canvas.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!draggingRef.current) return;
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const t = timeAtClientX(e.clientX, rect.left, rect.width);
        if (draggingRef.current === 'start') {
            setTrimStart(Math.max(0, Math.min(t, trimEnd - MIN_SELECTION_SECONDS)));
        } else {
            setTrimEnd(Math.min(duration, Math.max(t, trimStart + MIN_SELECTION_SECONDS)));
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        draggingRef.current = null;
        const canvas = overlayCanvasRef.current;
        if (canvas && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };

    const handleDownload = useCallback(() => {
        const buffer = audioBufferRef.current;
        if (!buffer) return;
        const startSample = Math.max(0, Math.floor(trimStart * buffer.sampleRate));
        const endSample = Math.min(buffer.length, Math.ceil(trimEnd * buffer.sampleRate));
        if (endSample <= startSample) return;

        const blob = encodeWavSlice(buffer, startSample, endSample);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const base = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'audio';
        a.href = url;
        a.download = `${base}-trimmed.wav`;
        a.click();
        URL.revokeObjectURL(url);
    }, [trimStart, trimEnd, fileName]);

    const canDownload = ready && trimEnd - trimStart >= MIN_SELECTION_SECONDS;

    const about = "Audio Trimmer decodes your file with the Web Audio API and draws its real waveform on a canvas so you can see what you're cutting instead of guessing from a timestamp. Drag the two handles over the waveform to set a start and end point, watch the selected duration update as you move them, and download the result as a WAV file. Every step, decoding, drawing, and slicing, runs on your device using standard browser APIs.";

    const howToSteps = [
        { name: 'Upload an audio file', text: 'Choose any audio file your browser can play. It decodes locally using the Web Audio API, nothing is sent to a server.' },
        { name: 'Review the waveform', text: 'Once decoding finishes, the real waveform is drawn on a canvas so you can see the shape of the clip and find the section you want.' },
        { name: 'Drag the two handles', text: 'The left handle sets the start point and the right handle sets the end point. The selected duration updates live as you drag either one.' },
        { name: 'Download the trimmed clip', text: 'Click Download Trimmed Audio to save the selected range as a WAV file.' },
    ];

    const faq = [
        {
            question: 'Why is the download a WAV file instead of MP3 or the original format?',
            answer: "Re-encoding audio into a compressed format like MP3 inside a browser needs a dedicated encoder library, which is a lot of extra weight for a tool that just cuts a clip down. WAV stores the raw PCM samples with a small header and no encoding step, so it needs no library at all. The tradeoff is size: a WAV of the same clip is noticeably larger than an MP3 would be.",
        },
        {
            question: 'Does this apply fades or any other audio effects?',
            answer: 'No. It only cuts the audio down to the range between your two handles. There is no fade-in, fade-out, normalization, or volume change applied to what you download.',
        },
        {
            question: 'Is my audio file uploaded anywhere?',
            answer: "It stays on your device the whole time. Decoding, drawing the waveform, and slicing the samples into a WAV file all happen locally through the Web Audio API, and the resulting download is built in your browser, never sent to a server.",
        },
        {
            question: 'What happens if my file fails to decode?',
            answer: 'You get an error message instead of a frozen page. This can happen with a corrupted download or a codec your browser does not support, try re-exporting the file or opening it in a different browser.',
        },
    ];

    return (
        <ServicePageShell
            icon={ContentCut}
            title="Audio Trimmer & Cutter"
            subtitle="Drag a waveform to pick the exact range you want, then download it as a WAV file."
            maxWidth="md"
            toolId={96}
            seoTitle="Audio Trimmer & Cutter Online - Free, No Upload"
            seoDescription="Trim and cut audio files online for free. Upload an audio file, drag the waveform handles to choose a start and end point, and download the trimmed clip as a WAV file. Runs entirely in your browser."
            keywords={['audio trimmer online', 'trim audio free', 'cut audio file online', 'mp3 cutter online', 'wav trimmer tool', 'online audio editor free', 'audio cutter no upload']}
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
            }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 3 }}>
                    <input
                        id="audio-trimmer-file-input"
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <label htmlFor="audio-trimmer-file-input">
                        <Button component="span" variant="contained" startIcon={<Upload />}>
                            {fileName ? 'Choose a different file' : 'Upload audio file'}
                        </Button>
                    </label>
                    {fileName && (
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 320 }}>
                            {fileName}
                        </Typography>
                    )}
                </Stack>

                {decoding && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

                <Box
                    ref={containerRef}
                    sx={{
                        position: 'relative',
                        width: '100%',
                        height: WAVEFORM_HEIGHT,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.08)',
                        mb: 2,
                        touchAction: 'none',
                        bgcolor: '#0b0c10',
                    }}
                >
                    <canvas ref={waveCanvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />
                    <canvas
                        ref={overlayCanvasRef}
                        style={{ position: 'absolute', top: 0, left: 0, display: 'block', cursor: ready ? 'ew-resize' : 'default' }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    />
                    {!ready && !decoding && (
                        <Box sx={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Typography variant="body2" color="text.secondary">
                                Upload an audio file to see its waveform here
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                        {ready
                            ? `Selected ${formatTime(trimStart)} to ${formatTime(trimEnd)} (${formatTime(trimEnd - trimStart)} of ${formatTime(duration)})`
                            : 'No audio loaded yet'}
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={handleDownload}
                        disabled={!canDownload}
                    >
                        Download Trimmed Audio
                    </Button>
                </Stack>
            </Card>
        </ServicePageShell>
    );
};

export default AudioTrimmer;
