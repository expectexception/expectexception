import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box, Button, Card, Stack, Typography, Alert, TextField, Slider,
    ToggleButtonGroup, ToggleButton, FormControlLabel, Switch, Grid,
} from '@mui/material';
import { BrandingWatermark, Upload, Download } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const MAX_DIMENSION = 4000;

type AnchorPosition =
    | 'top-left' | 'top-center' | 'top-right'
    | 'center-left' | 'center' | 'center-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

const ANCHORS: Record<AnchorPosition, { v: 'top' | 'middle' | 'bottom'; h: 'left' | 'center' | 'right' }> = {
    'top-left': { v: 'top', h: 'left' },
    'top-center': { v: 'top', h: 'center' },
    'top-right': { v: 'top', h: 'right' },
    'center-left': { v: 'middle', h: 'left' },
    'center': { v: 'middle', h: 'center' },
    'center-right': { v: 'middle', h: 'right' },
    'bottom-left': { v: 'bottom', h: 'left' },
    'bottom-center': { v: 'bottom', h: 'center' },
    'bottom-right': { v: 'bottom', h: 'right' },
};

const POSITION_ORDER: AnchorPosition[] = [
    'top-left', 'top-center', 'top-right',
    'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right',
];

function isLightColor(hex: string): boolean {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return true;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return true;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/** Draws one instance of the watermark text at the chosen anchor. Position is
 * computed from the canvas size plus the text's own measured width (and the
 * font size as a height stand-in), so the text is pulled back from whichever
 * edge it's anchored to instead of running off the canvas. */
function drawSingleWatermark(
    ctx: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    canvasHeight: number,
    fontSizePx: number,
    color: string,
    opacity: number,
    position: AnchorPosition,
) {
    const { v, h } = ANCHORS[position];
    const padding = Math.max(12, fontSizePx * 0.5);

    ctx.save();
    ctx.font = `700 ${fontSizePx}px sans-serif`;
    ctx.textAlign = h;
    ctx.textBaseline = v;
    ctx.globalAlpha = opacity;

    const textWidth = ctx.measureText(text).width;

    let x: number;
    if (h === 'left') {
        x = padding;
        if (x + textWidth > canvasWidth - padding) x = Math.max(padding, canvasWidth - padding - textWidth);
    } else if (h === 'right') {
        x = canvasWidth - padding;
        if (x - textWidth < padding) x = Math.min(canvasWidth - padding, padding + textWidth);
    } else {
        x = canvasWidth / 2;
    }

    let y: number;
    if (v === 'top') y = padding;
    else if (v === 'bottom') y = canvasHeight - padding;
    else y = canvasHeight / 2;

    ctx.lineWidth = Math.max(1, fontSizePx * 0.05);
    ctx.strokeStyle = isLightColor(color) ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)';
    ctx.strokeText(text, x, y);

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
}

/** Repeats the watermark text in a diagonal grid across the whole canvas, a
 * common real watermarking style. The grid is drawn in a coordinate space
 * rotated around the canvas center, sized well past the canvas's own
 * diagonal so every corner stays covered once it's rotated into place. Step
 * size is floored relative to the canvas size so a very small font can't
 * balloon the tile count and stall the preview. */
function drawTiledWatermark(
    ctx: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    canvasHeight: number,
    fontSizePx: number,
    color: string,
    opacity: number,
) {
    ctx.save();
    ctx.font = `700 ${fontSizePx}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.strokeStyle = isLightColor(color) ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(1, fontSizePx * 0.04);

    const textWidth = ctx.measureText(text).width;
    const stepX = Math.max(textWidth + fontSizePx * 3, canvasWidth / 20);
    const stepY = Math.max(fontSizePx * 4, canvasHeight / 20);

    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate(-Math.PI / 8);

    const diag = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
    const cols = Math.ceil(diag / stepX) + 1;
    const rows = Math.ceil(diag / stepY) + 1;

    for (let row = -rows; row <= rows; row++) {
        const offsetX = row % 2 === 0 ? 0 : stepX / 2;
        for (let col = -cols; col <= cols; col++) {
            const x = col * stepX + offsetX;
            const y = row * stepY;
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
        }
    }
    ctx.restore();
}

const ImageWatermarkAdder: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const [targetSize, setTargetSize] = useState({ width: 0, height: 0 });
    const [downscaledFrom, setDownscaledFrom] = useState<{ width: number; height: number } | null>(null);

    const [watermarkText, setWatermarkText] = useState('© Your Brand');
    const [fontSizePercent, setFontSizePercent] = useState(5);
    const [color, setColor] = useState('#ffffff');
    const [opacityPercent, setOpacityPercent] = useState(60);
    const [position, setPosition] = useState<AnchorPosition>('bottom-right');
    const [tile, setTile] = useState(false);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setError(null);
        setReady(false);
        imageRef.current = null;

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            imageRef.current = img;
            setFileName(file.name);

            const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
            const width = Math.max(1, Math.round(img.naturalWidth * scale));
            const height = Math.max(1, Math.round(img.naturalHeight * scale));
            setTargetSize({ width, height });
            setDownscaledFrom(scale < 1 ? { width: img.naturalWidth, height: img.naturalHeight } : null);
            setReady(true);
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            setError('Could not load that image. Try a different file.');
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }, []);

    // Redraw from a clean copy of the base image every time any setting
    // changes, so adjusting a slider never stacks a new watermark on top of
    // the last one.
    useEffect(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image || !ready) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = targetSize.width;
        canvas.height = targetSize.height;
        ctx.clearRect(0, 0, targetSize.width, targetSize.height);
        ctx.drawImage(image, 0, 0, targetSize.width, targetSize.height);

        const text = watermarkText.trim();
        if (!text) return;

        const fontSizePx = Math.max(8, Math.round((fontSizePercent / 100) * targetSize.width));
        const opacity = Math.max(0, Math.min(1, opacityPercent / 100));

        if (tile) {
            drawTiledWatermark(ctx, text, targetSize.width, targetSize.height, fontSizePx, color, opacity);
        } else {
            drawSingleWatermark(ctx, text, targetSize.width, targetSize.height, fontSizePx, color, opacity, position);
        }
    }, [ready, targetSize, watermarkText, fontSizePercent, color, opacityPercent, position, tile]);

    const handleDownload = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const base = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'watermarked-image';
            a.href = url;
            a.download = `${base}-watermarked.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }, [fileName]);

    const about = "Image Watermark Adder overlays text on top of your image, right in the browser, using the canvas fillText and strokeText APIs. Set the text, size, color, opacity, and position, or switch on tiling to repeat it diagonally across the whole frame the way a lot of stock photo sites do. The preview redraws from the original image every time you change a setting, so nothing ever stacks or compounds, and downloading gives you a PNG with the watermark baked in.";

    const howToSteps = [
        { name: 'Upload an image', text: 'Choose the image you want to watermark. Very large images are automatically scaled down to a manageable size first.' },
        { name: 'Type your watermark text', text: 'Enter whatever text you want overlaid, a name, a website, a copyright line.' },
        { name: 'Adjust size, color, opacity, and position', text: 'Pick where it sits using the 3x3 position grid, or turn on Tile to repeat it diagonally across the entire image.' },
        { name: 'Download', text: 'Click Download to save the watermarked image as a PNG.' },
    ];

    const faq = [
        {
            question: 'Will this stop someone from stealing my image?',
            answer: 'Not by itself. A visible text watermark like this works for basic attribution and mild deterrence, the kind that discourages casual reuse. Anyone determined enough can still crop it out or paint over it in an image editor, since it carries only the visible text you typed in, with no hidden or forensic tracking data embedded in the file.',
        },
        {
            question: 'Why does it only export as PNG?',
            answer: "One format keeps the tool simple and avoids any quality loss from re-compression. If you need a JPEG or WebP afterward, run the PNG through this site's Image Converter tool.",
        },
        {
            question: 'Does my image get uploaded to a server?',
            answer: 'No, it stays in your browser tab the entire time. The image is drawn onto a canvas element, the watermark is drawn on top of it with JavaScript, and the download comes straight out of that canvas.',
        },
        {
            question: 'Why did my image get resized?',
            answer: `Anything larger than ${MAX_DIMENSION}px on its longest edge is scaled down proportionally before it touches the canvas. Without a cap like that, a very large photo could freeze the tab while the browser tries to process it. A note appears above the preview whenever this happens, along with the original and new dimensions.`,
        },
    ];

    return (
        <ServicePageShell
            icon={BrandingWatermark}
            title="Image Watermark Adder"
            subtitle="Overlay a text watermark on any image and download the result as a PNG."
            maxWidth="md"
            toolId={97}
            seoTitle="Image Watermark Adder Online - Free Text Watermark Tool"
            seoDescription="Add a text watermark to any image for free. Choose the text, size, color, opacity, and position, or tile it across the whole photo. Everything runs in your browser, nothing is uploaded."
            keywords={['add watermark to image', 'image watermark online', 'free watermark tool', 'text watermark maker', 'watermark photo online', 'tile watermark image']}
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

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                    <input
                        id="watermark-file-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <label htmlFor="watermark-file-input">
                        <Button component="span" variant="contained" startIcon={<Upload />}>
                            {fileName ? 'Choose a different image' : 'Upload image'}
                        </Button>
                    </label>
                    {fileName && (
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 320 }}>
                            {fileName}
                        </Typography>
                    )}
                </Stack>

                {downscaledFrom && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Downscaled from {downscaledFrom.width}×{downscaledFrom.height} to {targetSize.width}×{targetSize.height} to keep the preview fast.
                    </Alert>
                )}

                {ready && (
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={5}>
                            <Stack spacing={2.5}>
                                <TextField
                                    label="Watermark text"
                                    value={watermarkText}
                                    onChange={(e) => setWatermarkText(e.target.value)}
                                    fullWidth
                                    size="small"
                                />

                                <Box>
                                    <Typography variant="caption" color="text.secondary">Font size ({fontSizePercent}% of image width)</Typography>
                                    <Slider
                                        aria-label="Font size"
                                        value={fontSizePercent}
                                        onChange={(_, v) => setFontSizePercent(v as number)}
                                        min={1}
                                        max={15}
                                        step={0.5}
                                        size="small"
                                    />
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary">Opacity ({opacityPercent}%)</Typography>
                                    <Slider
                                        aria-label="Opacity"
                                        value={opacityPercent}
                                        onChange={(_, v) => setOpacityPercent(v as number)}
                                        min={5}
                                        max={100}
                                        step={5}
                                        size="small"
                                    />
                                </Box>

                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Typography variant="caption" color="text.secondary">Color</Typography>
                                    <input
                                        type="color"
                                        aria-label="Watermark color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        style={{ width: 48, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
                                    />
                                </Stack>

                                <FormControlLabel
                                    control={<Switch checked={tile} onChange={(e) => setTile(e.target.checked)} />}
                                    label="Tile across the whole image"
                                />

                                {!tile && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Position</Typography>
                                        <ToggleButtonGroup
                                            value={position}
                                            exclusive
                                            onChange={(_, v: AnchorPosition | null) => v && setPosition(v)}
                                            sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, width: 132 }}
                                        >
                                            {POSITION_ORDER.map((key) => (
                                                <ToggleButton key={key} value={key} aria-label={key.replace('-', ' ')} sx={{ width: 40, height: 40, p: 0 }}>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'currentColor' }} />
                                                </ToggleButton>
                                            ))}
                                        </ToggleButtonGroup>
                                    </Box>
                                )}
                            </Stack>
                        </Grid>

                        <Grid item xs={12} md={7}>
                            <Box sx={{
                                borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
                                bgcolor: '#0b0c10', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1,
                            }}>
                                <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: 8 }} />
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Download />}
                                onClick={handleDownload}
                                fullWidth
                                sx={{ mt: 2 }}
                            >
                                Download
                            </Button>
                        </Grid>
                    </Grid>
                )}

                {!ready && !error && (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Upload an image to start adding a watermark.
                        </Typography>
                    </Box>
                )}
            </Card>
        </ServicePageShell>
    );
};

export default ImageWatermarkAdder;
