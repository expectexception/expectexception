import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Button, Paper, Grid, Chip, Alert,
    Stack, useTheme, alpha,
} from '@mui/material';
import { Visibility, Upload, Download } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Colour vision deficiency simulation.
 *
 * Works in LMS space (long/medium/short cone response) rather than
 * directly on RGB: a deficiency is a property of a cone type, so the
 * honest model is convert RGB -> LMS, collapse the affected cone's
 * response onto what the remaining cones can distinguish, then convert
 * back. Matrices are the Brettel/Viénot-derived ones in common use.
 * ------------------------------------------------------------------ */

type Deficiency = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

interface Variant {
    key: Deficiency;
    label: string;
    prevalence: string;
    description: string;
    /** Row-major 3x3 applied in linear RGB. */
    matrix: number[];
}

const VARIANTS: Variant[] = [
    {
        key: 'protanopia',
        label: 'Protanopia',
        prevalence: '~1% of men',
        description: 'No working long-wavelength (red) cones. Reds darken heavily and red/green separation collapses.',
        matrix: [0.567, 0.433, 0.0, 0.558, 0.442, 0.0, 0.0, 0.242, 0.758],
    },
    {
        key: 'deuteranopia',
        label: 'Deuteranopia',
        prevalence: '~1% of men',
        description: 'No working medium-wavelength (green) cones. The most common form of red/green colour blindness.',
        matrix: [0.625, 0.375, 0.0, 0.7, 0.3, 0.0, 0.0, 0.3, 0.7],
    },
    {
        key: 'tritanopia',
        label: 'Tritanopia',
        prevalence: '~0.01%',
        description: 'No working short-wavelength (blue) cones. Blue and yellow become hard to tell apart.',
        matrix: [0.95, 0.05, 0.0, 0.0, 0.433, 0.567, 0.0, 0.475, 0.525],
    },
    {
        key: 'achromatopsia',
        label: 'Achromatopsia',
        prevalence: 'very rare',
        description: 'No colour discrimination at all — only luminance. A useful worst case for checking contrast.',
        matrix: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
    },
];

/** sRGB is gamma-encoded, so the matrices must be applied in linear light.
 * Skipping this step is the usual reason a simulation comes out too dark. */
function srgbToLinear(c: number): number {
    const n = c / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
}

function simulate(data: Uint8ClampedArray, matrix: number[]): void {
    const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = matrix;
    for (let i = 0; i < data.length; i += 4) {
        const r = srgbToLinear(data[i]);
        const g = srgbToLinear(data[i + 1]);
        const b = srgbToLinear(data[i + 2]);
        data[i] = linearToSrgb(m0 * r + m1 * g + m2 * b);
        data[i + 1] = linearToSrgb(m3 * r + m4 * g + m5 * b);
        data[i + 2] = linearToSrgb(m6 * r + m7 * g + m8 * b);
    }
}

const MAX_EDGE = 900;

const ColorBlindnessSimulator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const inputRef = useRef<HTMLInputElement>(null);

    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [renders, setRenders] = useState<Record<string, string>>({});

    const handleFile = useCallback((file: File) => {
        setError(null);
        if (!file.type.startsWith('image/')) {
            setError('Please choose an image file.');
            return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            setImage(img);
            setFileName(file.name);
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            setError('Could not decode that image.');
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }, []);

    // Re-render every variant whenever a new image lands.
    useEffect(() => {
        if (!image) return;

        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
        const w = Math.max(1, Math.round(image.width * scale));
        const h = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) { setError('Canvas is unavailable in this browser.'); return; }

        ctx.drawImage(image, 0, 0, w, h);
        const original = ctx.getImageData(0, 0, w, h);

        const next: Record<string, string> = { original: canvas.toDataURL('image/png') };
        for (const variant of VARIANTS) {
            // Fresh copy per variant — simulating in place would stack the
            // transforms on top of each other.
            const copy = new ImageData(new Uint8ClampedArray(original.data), w, h);
            simulate(copy.data, variant.matrix);
            ctx.putImageData(copy, 0, 0);
            next[variant.key] = canvas.toDataURL('image/png');
        }
        setRenders(next);
    }, [image]);

    const download = useCallback((key: string) => {
        const src = renders[key];
        if (!src) return;
        const a = document.createElement('a');
        a.href = src;
        a.download = `${fileName.replace(/\.[^.]+$/, '') || 'image'}-${key}.png`;
        a.click();
    }, [renders, fileName]);

    return (
        <ServicePageShell
            icon={Visibility}
            title="Colour Blindness Simulator"
            subtitle="See your design the way 1 in 12 men and 1 in 200 women do"
            maxWidth="lg"
            seoTitle="Colour Blindness Simulator | Test Images for Deuteranopia & Protanopia"
            seoDescription="Upload a design, chart or screenshot and see it simulated for protanopia, deuteranopia, tritanopia and full achromatopsia. Runs entirely in your browser — nothing is uploaded."
            toolId={64}
            keywords={['color blindness simulator', 'deuteranopia simulator', 'protanopia test image', 'colour blind accessibility check', 'tritanopia simulator', 'accessible design checker', 'color vision deficiency simulator']}
            about="Around one in twelve men and one in two hundred women have some form of colour vision deficiency, which means a chart that separates its series by red and green alone is unreadable to a substantial slice of any audience. This tool re-renders an image through four simulations so you can check a design before shipping it. The transform is done properly in linear light: pixels are converted out of gamma-encoded sRGB, projected through the cone-response matrix for each deficiency, and converted back — skipping that step is why many simulators produce results that are noticeably too dark. Everything happens on a canvas in your browser, so unreleased designs are not uploaded anywhere."
            howToSteps={[
                { name: 'Upload an image', text: 'Choose a chart, UI screenshot or design. It is processed locally and never uploaded.' },
                { name: 'Compare the simulations', text: 'The original is shown alongside protanopia, deuteranopia, tritanopia and achromatopsia renderings.' },
                { name: 'Look for lost distinctions', text: 'If two elements that carry different meaning become the same colour, add a non-colour cue — a label, pattern, shape or thickness.' },
            ]}
            faq={[
                { question: 'Is my image uploaded to a server?', answer: 'No. The image is decoded and transformed on a canvas element inside your browser, so it never leaves your machine.' },
                { question: 'Which deficiency should I design for?', answer: 'Deuteranopia is the most common, so it is the usual first check. The reliable rule, though, is never to rely on colour alone to carry meaning — the achromatopsia view is a fast way to test that, since anything still distinguishable there works for everyone.' },
                { question: 'How accurate are these simulations?', answer: 'They use the standard cone-response matrices for full dichromacy and are a good design check, but they model the complete absence of one cone type. Most people with a deficiency have an anomalous cone rather than a missing one, so their real experience usually sits somewhere between the original and the simulation.' },
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
                            {fileName || 'Drop an image here, or click to choose'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Processed in your browser — never uploaded
                        </Typography>
                    </Paper>

                    {renders.original && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6} lg={4}>
                                <Paper sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${alpha(primary, 0.25)}` }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={800}>Original</Typography>
                                        <Chip label="reference" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                    </Stack>
                                    <Box component="img" src={renders.original} alt="Original" sx={{ width: '100%', borderRadius: 1, display: 'block' }} />
                                </Paper>
                            </Grid>

                            {VARIANTS.map(variant => (
                                <Grid item xs={12} md={6} lg={4} key={variant.key}>
                                    <Paper sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={800}>{variant.label}</Typography>
                                            <Chip label={variant.prevalence} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                        </Stack>
                                        <Box component="img" src={renders[variant.key]} alt={variant.label} sx={{ width: '100%', borderRadius: 1, display: 'block' }} />
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                            {variant.description}
                                        </Typography>
                                        <Button
                                            size="small"
                                            startIcon={<Download />}
                                            onClick={() => download(variant.key)}
                                            sx={{ mt: 1 }}
                                        >
                                            Download
                                        </Button>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ColorBlindnessSimulator;
