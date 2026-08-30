import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, Stack, TextField,
    Button, FormControlLabel, Checkbox, Slider, useTheme, alpha,
} from '@mui/material';
import { AspectRatio, Download, ContentCopy, Check, RestartAlt } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Everything below draws to a single <canvas> with the plain Canvas 2D
 * API — a fillRect for the background, then centered fillText for the
 * overlay. The canvas's pixel buffer (canvas.width/height) always equals
 * the real requested resolution, which is what makes the PNG download
 * correct-resolution even though the on-page preview is scaled down with
 * CSS/object-fit for large sizes.
 * ------------------------------------------------------------------ */

const MIN_DIM = 16;
const MAX_DIM = 4096;

interface Preset {
    label: string;
    width: number;
    height: number;
}

const PRESETS: Preset[] = [
    { label: 'OG image', width: 1200, height: 630 },
    { label: 'Square', width: 1080, height: 1080 },
    { label: '16:9', width: 1920, height: 1080 },
    { label: 'Avatar', width: 400, height: 400 },
];

function clampDim(n: number): number {
    if (!Number.isFinite(n)) return MIN_DIM;
    return Math.min(MAX_DIM, Math.max(MIN_DIM, Math.round(n)));
}

function autoDefaultText(width: number, height: number): string {
    return `${width} × ${height}`;
}

/** Picks a starting font size proportional to the canvas, then shrinks it
 * (never grows it) until the text actually fits within `maxWidth` — so
 * long custom overlay text on a narrow canvas doesn't run off the edge.
 * `ctx.font` is left set to the winning size as a side effect. */
function fitFontSize(ctx: CanvasRenderingContext2D, text: string, startSize: number, maxWidth: number, minSize = 10): number {
    let size = Math.max(minSize, Math.round(startSize));
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    while (size > minSize && ctx.measureText(text).width > maxWidth) {
        size -= 1;
        ctx.font = `700 ${size}px system-ui, sans-serif`;
    }
    return size;
}

const PlaceholderImageGenerator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [width, setWidth] = useState(1200);
    const [height, setHeight] = useState(630);
    const [bgColor, setBgColor] = useState('#334155');
    const [textColor, setTextColor] = useState('#f1f5f9');

    const [customText, setCustomText] = useState('');
    const [textIsCustom, setTextIsCustom] = useState(false);

    const [autoFontSize, setAutoFontSize] = useState(true);
    const [manualFontSize, setManualFontSize] = useState(48);

    const [copied, setCopied] = useState(false);
    const [clipboardSupported] = useState(
        () => typeof navigator !== 'undefined' && !!navigator.clipboard && typeof window !== 'undefined' && 'ClipboardItem' in window,
    );

    const displayText = textIsCustom && customText.trim() !== '' ? customText : autoDefaultText(width, height);

    const applyPreset = (preset: Preset) => {
        setWidth(preset.width);
        setHeight(preset.height);
    };

    const resetText = () => {
        setTextIsCustom(false);
        setCustomText('');
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        const text = displayText;
        if (text.trim() === '') return;

        const maxTextWidth = width * 0.9;
        const baseSize = autoFontSize
            ? Math.max(14, Math.round(Math.min(width, height) * 0.14))
            : manualFontSize;
        const finalSize = fitFontSize(ctx, text, baseSize, maxTextWidth);

        ctx.font = `700 ${finalSize}px system-ui, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
    }, [width, height, bgColor, textColor, displayText, autoFontSize, manualFontSize]);

    useEffect(() => {
        draw();
    }, [draw]);

    const fileName = useMemo(() => `placeholder-${width}x${height}.png`, [width, height]);

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleCopy = () => {
        const canvas = canvasRef.current;
        if (!canvas || !clipboardSupported) return;
        canvas.toBlob((blob) => {
            if (!blob) return;
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }).catch(() => {
                // Clipboard write can fail silently (permissions, focus) —
                // there's nothing more useful to do than leave the button
                // unconfirmed so the user can just try again or download instead.
            });
        }, 'image/png');
    };

    return (
        <ServicePageShell
            icon={AspectRatio}
            title="Placeholder Image Generator"
            subtitle="Solid-color placeholder images with custom text, sized to spec — download as PNG"
            maxWidth="lg"
            toolId={76}
            seoTitle="Placeholder Image Generator | Custom Size PNG Placeholders Online"
            seoDescription="Generate a placeholder image at any exact pixel size with your own background color, text color and overlay text. Common presets for OG images, square posts, 16:9 and avatars. Renders on canvas in your browser — download as PNG or copy to clipboard."
            keywords={['placeholder image generator', 'placehold.co alternative', 'dummy image generator', 'og image generator', 'image placeholder maker', 'blank image generator', 'wireframe placeholder image']}
            about="This generates a plain placeholder image directly on an HTML canvas — a solid background fill plus centered text — and never uploads anything to a server. It's the kind of image used to hold a spot in a design mockup or wireframe before the real asset exists, as a quick Open Graph/social-share image while drafting a blog post, or as a stand-in in a README or prototype where any exact photo is beside the point. Set the exact pixel width and height (or use a common preset), pick background and text colors, and either leave the overlay text as the auto-generated dimensions label or type your own. The on-page preview is scaled down to fit the screen for large sizes, but the canvas's actual pixel buffer — and therefore the downloaded PNG — is always rendered at the exact resolution you asked for."
            howToSteps={[
                { name: 'Set a size', text: 'Enter an exact width and height, or click a preset (OG image, square, 16:9, avatar) to set both at once.' },
                { name: 'Pick colors and text', text: 'Choose a background and text color, and optionally type your own overlay text — it defaults to showing the dimensions until you do.' },
                { name: 'Download or copy', text: 'Click "Download PNG" to save the file at full resolution, or "Copy image" to put it straight on your clipboard if your browser supports it.' },
            ]}
            faq={[
                { question: 'What resolution is the downloaded file?', answer: 'Exactly the width and height you entered. The on-screen preview is visually scaled down so a large image (e.g. 1920×1080) doesn\'t overwhelm the page, but the canvas\'s underlying pixel buffer — what actually gets encoded into the PNG — is always set to the real requested dimensions.' },
                { question: 'Is anything uploaded to a server?', answer: 'No. The image is drawn entirely with the Canvas 2D API running in your browser, and the download is generated locally from that canvas. Nothing about the size, colors or text you choose is sent anywhere.' },
                { question: 'Why does my overlay text sometimes shrink?', answer: 'Text is measured against the canvas before it\'s drawn, and if it would run past about 90% of the width, the font size is reduced until it fits — so a long custom label on a narrow image stays readable instead of overflowing the edges.' },
                { question: 'Can I copy the image instead of downloading it?', answer: 'Yes, if your browser supports the Clipboard API\'s image write (most current desktop browsers do). The "Copy image" button only appears enabled when that\'s available — on a browser without support it\'s disabled rather than failing silently, and downloading always works as a fallback.' },
            ]}
        >
            <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Presets</Typography>
                            <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                                {PRESETS.map(p => (
                                    <Button
                                        key={p.label}
                                        size="small"
                                        variant={width === p.width && height === p.height ? 'contained' : 'outlined'}
                                        onClick={() => applyPreset(p)}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {p.label} <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.7 }}>{p.width}×{p.height}</Typography>
                                    </Button>
                                ))}
                            </Stack>

                            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Width"
                                    type="number"
                                    value={width}
                                    onChange={e => setWidth(clampDim(Number(e.target.value)))}
                                    inputProps={{ min: MIN_DIM, max: MAX_DIM }}
                                    InputProps={{ endAdornment: 'px' }}
                                />
                                <TextField
                                    fullWidth
                                    label="Height"
                                    type="number"
                                    value={height}
                                    onChange={e => setHeight(clampDim(Number(e.target.value)))}
                                    inputProps={{ min: MIN_DIM, max: MAX_DIM }}
                                    InputProps={{ endAdornment: 'px' }}
                                />
                            </Stack>

                            <Stack direction="row" spacing={3} sx={{ mb: 2.5 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                                        BACKGROUND
                                    </Typography>
                                    <input
                                        type="color"
                                        value={bgColor}
                                        onChange={e => setBgColor(e.target.value)}
                                        style={{ width: 40, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none' }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                                        TEXT COLOR
                                    </Typography>
                                    <input
                                        type="color"
                                        value={textColor}
                                        onChange={e => setTextColor(e.target.value)}
                                        style={{ width: 40, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none' }}
                                    />
                                </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 2.5 }}>
                                <TextField
                                    fullWidth
                                    label="Overlay text"
                                    placeholder={autoDefaultText(width, height)}
                                    value={textIsCustom ? customText : ''}
                                    onChange={e => { setCustomText(e.target.value); setTextIsCustom(true); }}
                                    helperText={textIsCustom ? 'Custom text — clear to go back to the dimensions label' : 'Showing the dimensions automatically. Type to override.'}
                                />
                                {textIsCustom && (
                                    <Button size="small" onClick={resetText} startIcon={<RestartAlt fontSize="small" />} sx={{ mt: 1, whiteSpace: 'nowrap' }}>
                                        Reset
                                    </Button>
                                )}
                            </Stack>

                            <FormControlLabel
                                control={<Checkbox size="small" checked={autoFontSize} onChange={e => setAutoFontSize(e.target.checked)} />}
                                label={<Typography variant="body2">Auto-size text to fit the canvas</Typography>}
                            />
                            {!autoFontSize && (
                                <Box sx={{ px: 1, mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">Font size: {manualFontSize}px</Typography>
                                    <Slider
                                        size="small"
                                        value={manualFontSize}
                                        min={10}
                                        max={300}
                                        step={2}
                                        onChange={(_, v) => setManualFontSize(v as number)}
                                    />
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="subtitle2" fontWeight={800}>Preview</Typography>
                                <Typography variant="caption" color="text.secondary">{width} × {height}px</Typography>
                            </Stack>

                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 240,
                                    maxHeight: 460,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 2,
                                    p: 1.5,
                                    mb: 2.5,
                                    bgcolor: alpha(primary, 0.03),
                                    border: `1px dashed ${alpha(primary, 0.3)}`,
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        width: 'auto',
                                        height: 'auto',
                                        objectFit: 'contain',
                                        borderRadius: 8,
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                                    }}
                                />
                            </Box>

                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<Download />}
                                    onClick={handleDownload}
                                >
                                    Download PNG
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    disabled={!clipboardSupported}
                                    startIcon={copied ? <Check /> : <ContentCopy />}
                                    onClick={handleCopy}
                                >
                                    {copied ? 'Copied' : clipboardSupported ? 'Copy image' : 'Copy unsupported'}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default PlaceholderImageGenerator;
