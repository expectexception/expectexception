import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, Button, Paper, Grid, Alert, Stack,
    ToggleButton, ToggleButtonGroup, Tooltip, useTheme, alpha,
} from '@mui/material';
import { Colorize, Upload, ContentCopy, Check } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Median-cut colour quantisation.
 *
 * The sampled pixels are treated as points in RGB space, all in one
 * bucket to start. Each step finds the bucket whose colours span the
 * widest range on one channel (R, G or B), sorts that bucket along that
 * channel, and splits it in two at the median so each half holds about
 * the same number of pixels. Repeating this until there are N buckets
 * and averaging each one's pixels gives N colours that represent how
 * the image's colour volume is actually distributed — a bucket with a
 * lot of pixels in it (e.g. a large sky) keeps getting split further,
 * so the final palette leans towards colours that cover more of the
 * image, not just whichever colours happen to be distinct.
 * ------------------------------------------------------------------ */

interface Bucket {
    pixels: [number, number, number][];
}

function channelRange(pixels: [number, number, number][], channel: 0 | 1 | 2): number {
    let min = 255, max = 0;
    for (const p of pixels) {
        const v = p[channel];
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return max - min;
}

function widestChannel(pixels: [number, number, number][]): 0 | 1 | 2 {
    const rRange = channelRange(pixels, 0);
    const gRange = channelRange(pixels, 1);
    const bRange = channelRange(pixels, 2);
    if (rRange >= gRange && rRange >= bRange) return 0;
    if (gRange >= rRange && gRange >= bRange) return 1;
    return 2;
}

function splitBucket(bucket: Bucket): [Bucket, Bucket] {
    const channel = widestChannel(bucket.pixels);
    const sorted = [...bucket.pixels].sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(sorted.length / 2);
    return [{ pixels: sorted.slice(0, mid) }, { pixels: sorted.slice(mid) }];
}

function averageColor(pixels: [number, number, number][]): [number, number, number] {
    let r = 0, g = 0, b = 0;
    for (const p of pixels) { r += p[0]; g += p[1]; b += p[2]; }
    const n = pixels.length || 1;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

export interface Swatch {
    r: number; g: number; b: number;
    hex: string;
    population: number;
    share: number;
}

function toHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Runs median-cut on the pixels already sampled from a downscaled canvas
 * and returns up to `count` swatches, sorted by how many sampled pixels
 * landed in each bucket (most dominant first). */
function extractPalette(data: Uint8ClampedArray, count: number): Swatch[] {
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < data.length; i += 4) {
        // Skip fully transparent pixels — they carry no visible colour and
        // would otherwise bias the palette towards whatever the decoder
        // fills transparent regions with.
        if (data[i + 3] === 0) continue;
        pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (pixels.length === 0) return [];

    let buckets: Bucket[] = [{ pixels }];
    while (buckets.length < count) {
        // Split the largest bucket each round, so buckets that cover more
        // of the image keep dividing instead of a single early split
        // dominating every subsequent round.
        let largestIndex = 0;
        for (let i = 1; i < buckets.length; i++) {
            if (buckets[i].pixels.length > buckets[largestIndex].pixels.length) largestIndex = i;
        }
        const target = buckets[largestIndex];
        if (target.pixels.length < 2) break; // nothing left worth splitting
        const [a, b] = splitBucket(target);
        buckets.splice(largestIndex, 1, a, b);
    }

    const total = pixels.length;
    const swatches = buckets
        .filter(bucket => bucket.pixels.length > 0)
        .map(bucket => {
            const [r, g, b] = averageColor(bucket.pixels);
            return {
                r, g, b, hex: toHex(r, g, b),
                population: bucket.pixels.length,
                share: (bucket.pixels.length / total) * 100,
            };
        });

    return swatches.sort((a, b) => b.population - a.population);
}

/** Relative luminance, used only to order swatches when the user picks
 * "lightness" instead of "dominance". */
function luminance(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

const MAX_SAMPLE_EDGE = 200;
const SWATCH_COUNTS = [5, 6, 7, 8];

const SwatchCard: React.FC<{ swatch: Swatch }> = ({ swatch }) => {
    const [copied, setCopied] = useState<'hex' | 'rgb' | null>(null);
    const rgbText = `rgb(${swatch.r}, ${swatch.g}, ${swatch.b})`;

    const copy = (text: string, which: 'hex' | 'rgb') => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(which);
            setTimeout(() => setCopied(null), 1500);
        });
    };

    const textColor = luminance(swatch.r, swatch.g, swatch.b) > 140 ? '#000000' : '#ffffff';

    return (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
                height: 64, bgcolor: swatch.hex, display: 'flex', alignItems: 'flex-end',
                justifyContent: 'flex-end', p: 1,
            }}>
                <Typography variant="caption" sx={{ color: textColor, fontWeight: 700 }}>
                    {swatch.share.toFixed(1)}%
                </Typography>
            </Box>
            <Box sx={{ p: 1.25 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontFamily="monospace" fontWeight={700}>
                        {swatch.hex.toUpperCase()}
                    </Typography>
                    <Tooltip title={copied === 'hex' ? 'Copied!' : 'Copy hex'}>
                        <Button size="small" onClick={() => copy(swatch.hex, 'hex')} sx={{ minWidth: 0, p: 0.5 }}>
                            {copied === 'hex' ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                        </Button>
                    </Tooltip>
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {rgbText}
                    </Typography>
                    <Tooltip title={copied === 'rgb' ? 'Copied!' : 'Copy rgb()'}>
                        <Button size="small" onClick={() => copy(rgbText, 'rgb')} sx={{ minWidth: 0, p: 0.5 }}>
                            {copied === 'rgb' ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                        </Button>
                    </Tooltip>
                </Stack>
            </Box>
        </Paper>
    );
};

const ImageColorExtractor: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const inputRef = useRef<HTMLInputElement>(null);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pixelData, setPixelData] = useState<Uint8ClampedArray | null>(null);
    const [swatchCount, setSwatchCount] = useState(8);
    const [sortMode, setSortMode] = useState<'dominance' | 'lightness'>('dominance');

    const handleFile = useCallback((file: File) => {
        setError(null);
        if (!file.type.startsWith('image/')) {
            setError('Please choose an image file.');
            return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            setFileName(file.name);
            setPreviewUrl(url);

            // Downscale before sampling: colour quantisation only needs a
            // representative spread of pixels, not every one of them, and
            // sampling a full-resolution photo would be slow for no
            // benefit — a 200px-wide version has the same dominant colours
            // as the original, just with redundant near-duplicate pixels
            // removed.
            const scale = Math.min(1, MAX_SAMPLE_EDGE / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) { setError('Canvas is unavailable in this browser.'); return; }

            ctx.drawImage(img, 0, 0, w, h);
            try {
                const imageData = ctx.getImageData(0, 0, w, h);
                setPixelData(imageData.data);
            } catch {
                // getImageData throws on a tainted canvas (e.g. certain
                // cross-origin sources) — shouldn't happen for a local
                // file read via an object URL, but fail safely.
                setError('Could not read pixel data from that image.');
                setPixelData(null);
            }
        };
        img.onerror = () => {
            setError('Could not decode that image.');
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }, []);

    const palette = useMemo(() => {
        if (!pixelData) return [];
        return extractPalette(pixelData, swatchCount);
    }, [pixelData, swatchCount]);

    const sortedPalette = useMemo(() => {
        if (sortMode === 'lightness') {
            return [...palette].sort((a, b) => luminance(b.r, b.g, b.b) - luminance(a.r, a.g, a.b));
        }
        return palette; // already sorted by population in extractPalette
    }, [palette, sortMode]);

    return (
        <ServicePageShell
            icon={Colorize}
            title="Image Color Palette Extractor"
            subtitle="Pull the dominant colours out of any photo, entirely in your browser"
            maxWidth="md"
            toolId={68}
            seoTitle="Image Color Palette Extractor | Get Dominant Colours From a Photo"
            seoDescription="Upload a photo and extract its dominant colours as hex and RGB swatches using real median-cut colour quantisation. Runs entirely in your browser — nothing is uploaded."
            keywords={['image color palette extractor', 'dominant color extractor', 'color picker from image', 'photo color palette generator', 'median cut color quantization', 'extract colors from photo', 'image to hex color']}
            about="This tool reads the actual pixels of an uploaded photo and groups them with median-cut quantisation: every sampled pixel starts in one bucket, and each round the tool splits the largest bucket in two along whichever colour channel — red, green or blue — spans the widest range within it, so a bucket covering more of the image keeps dividing rather than a single early split dominating every round. Once there are as many buckets as swatches requested, each bucket's pixels are averaged into one representative colour. Before sampling, the image is drawn onto an off-screen canvas capped at 200px on its longest side — that's purely a speed measure, since a full-resolution photo has far more pixels than are needed to find its dominant colours, and downscaling first mostly discards near-duplicate pixels rather than changing which colours turn out to be dominant. Everything — decoding, sampling and quantising — happens on a canvas element in your browser; the image file is never uploaded anywhere."
            howToSteps={[
                { name: 'Upload a photo', text: 'Drop an image onto the upload area, or click it to browse. It is read locally and never leaves your browser.' },
                { name: 'Choose how many colours', text: 'Pick 5 to 8 swatches. More swatches split the image\'s colour range more finely; fewer gives a broader summary.' },
                { name: 'Read the palette', text: 'Each swatch shows its hex code, RGB value, and the share of sampled pixels it represents. Click the copy icon to grab a hex or RGB value.' },
            ]}
            faq={[
                { question: 'Is my photo uploaded anywhere?', answer: 'No. The image is decoded and sampled on a canvas element entirely inside your browser — it never leaves your machine.' },
                { question: 'Why is the image downscaled before extracting colours?', answer: 'Median-cut only needs a representative sample of pixels, not every one — a multi-megapixel photo has vastly more pixels than colours. Capping the longest side at 200px keeps the calculation fast without changing which colours come out as dominant, since the discarded pixels are almost all near-duplicates of ones that remain.' },
                { question: 'What does the percentage on each swatch mean?', answer: 'The share of sampled pixels that fell into that colour\'s bucket during quantisation — a rough measure of how much of the image that colour covers, not a measure of visual prominence or saliency.' },
                { question: 'What is median-cut, in plain terms?', answer: 'A way of turning millions of slightly different pixel colours into a handful of representative ones. It repeatedly finds the group of pixels with the widest colour spread, splits that group in half at the midpoint, and keeps going until there are as many groups as colours wanted — then averages each group into one swatch.' },
                { question: 'Does it handle transparent images?', answer: 'Yes. Fully transparent pixels are excluded from sampling so they cannot skew the palette towards whatever colour a transparent background happens to decode as.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />

                    <Paper
                        onClick={() => inputRef.current?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                        sx={{
                            p: 4, textAlign: 'center', cursor: 'pointer', borderRadius: 2,
                            border: `1px dashed ${alpha(primary, 0.4)}`,
                            bgcolor: alpha(primary, 0.03),
                            '&:hover': { bgcolor: alpha(primary, 0.07) },
                        }}
                    >
                        <Upload sx={{ fontSize: 36, color: primary, mb: 1 }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                            {fileName || 'Drop a photo here, or click to choose'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Processed in your browser — never uploaded
                        </Typography>
                    </Paper>

                    {previewUrl && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={4}>
                                <Paper sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
                                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Source image</Typography>
                                    <Box
                                        component="img"
                                        src={previewUrl}
                                        alt={fileName || 'Uploaded photo'}
                                        sx={{ width: '100%', borderRadius: 1, display: 'block' }}
                                    />
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={8}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
                                    <ToggleButtonGroup
                                        size="small"
                                        exclusive
                                        value={swatchCount}
                                        onChange={(_, v) => { if (v !== null) setSwatchCount(v); }}
                                    >
                                        {SWATCH_COUNTS.map(n => (
                                            <ToggleButton key={n} value={n} sx={{ px: 1.4, fontSize: '0.72rem' }}>{n}</ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>

                                    <ToggleButtonGroup
                                        size="small"
                                        exclusive
                                        value={sortMode}
                                        onChange={(_, v) => { if (v !== null) setSortMode(v); }}
                                    >
                                        <ToggleButton value="dominance" sx={{ px: 1.2, fontSize: '0.7rem' }}>By dominance</ToggleButton>
                                        <ToggleButton value="lightness" sx={{ px: 1.2, fontSize: '0.7rem' }}>By lightness</ToggleButton>
                                    </ToggleButtonGroup>
                                </Stack>

                                {sortedPalette.length === 0 ? (
                                    <Typography variant="body2" color="text.disabled">
                                        Extracting palette…
                                    </Typography>
                                ) : (
                                    <Grid container spacing={1.25}>
                                        {sortedPalette.map((swatch, i) => (
                                            <Grid item xs={6} sm={4} md={3} key={`${swatch.hex}-${i}`}>
                                                <SwatchCard swatch={swatch} />
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ImageColorExtractor;
