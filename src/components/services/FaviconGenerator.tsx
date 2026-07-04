import React, { useState, useRef, useCallback } from 'react';
import {
    Box, Typography, Button, Stack, Paper, Alert, Grid,
} from '@mui/material';
import { Image as ImageIcon, Download } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const SIZES = [16, 32, 48, 64, 128, 192, 512];

function drawToCanvas(img: HTMLImageElement, size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, size, size);
    return canvas;
}

const FaviconGenerator: React.FC = () => {
    const [preview, setPreview] = useState<string | null>(null);
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const [canvases, setCanvases] = useState<{ size: number; url: string }[]>([]);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((file: File) => {
        setError('');
        if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
        const reader = new FileReader();
        reader.onload = e => {
            const src = e.target?.result as string;
            setPreview(src);
            const img = new window.Image();
            img.onload = () => {
                setImgEl(img);
                const generated = SIZES.map(size => ({
                    size,
                    url: drawToCanvas(img, size).toDataURL('image/png'),
                }));
                setCanvases(generated);
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    }, []);

    const downloadAll = async () => {
        for (const c of canvases) {
            const a = document.createElement('a');
            a.href = c.url;
            a.download = `favicon-${c.size}x${c.size}.png`;
            a.click();
            await new Promise(r => setTimeout(r, 100));
        }
    };

    const downloadIco = () => {
        const a = document.createElement('a');
        a.href = canvases.find(c => c.size === 32)?.url || canvases[0]?.url || '';
        a.download = 'favicon.ico';
        a.click();
    };

    return (
        <ServicePageShell
            title="Favicon Generator"
            subtitle="Upload any image and generate favicons in all standard sizes: 16×16 to 512×512."
            icon={ImageIcon}
            seoTitle="Favicon Generator — Create Favicons from Any Image Free"
            seoDescription="Generate favicons in all sizes from any image. Download PNG files or favicon.ico for your website."
            toolId={46}
            keywords={['favicon generator', 'create favicon', 'ico generator', 'favicon from image', 'favicon maker online', 'favicon.ico generator', 'png to favicon', 'website icon generator']}
            howToSteps={[
                { name: 'Upload an image', text: 'Upload any PNG, JPG, SVG or WebP image (square works best).' },
                { name: 'Preview all sizes', text: 'See your favicon rendered at all standard sizes.' },
                { name: 'Download', text: 'Download individual PNG files or all sizes at once.' },
            ]}
        >
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper
                sx={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer', mb: 3, '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
                <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {preview ? (
                    <Box><img src={preview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} /></Box>
                ) : (
                    <>
                        <ImageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">Drop an image here or click to upload</Typography>
                        <Typography variant="caption" color="text.disabled">PNG, JPG, SVG, WebP — square recommended</Typography>
                    </>
                )}
            </Paper>

            {canvases.length > 0 && (
                <>
                    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                        <Button variant="contained" startIcon={<Download />} onClick={downloadAll}>Download All PNGs</Button>
                        <Button variant="outlined" startIcon={<Download />} onClick={downloadIco}>Download favicon.ico (32px)</Button>
                    </Stack>

                    <Grid container spacing={2}>
                        {canvases.map(c => (
                            <Grid item key={c.size} xs={6} sm={4} md={3}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 80, mb: 1 }}>
                                        <img src={c.url} alt={`${c.size}px`} style={{ width: Math.min(c.size, 64), height: Math.min(c.size, 64), imageRendering: 'pixelated' }} />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">{c.size}×{c.size}</Typography>
                                    <Box>
                                        <Button size="small" onClick={() => { const a = document.createElement('a'); a.href = c.url; a.download = `favicon-${c.size}x${c.size}.png`; a.click(); }} sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                                            Download
                                        </Button>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    <Paper sx={{ mt: 3, p: 2, bgcolor: '#0d1117', borderRadius: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Add to your HTML &lt;head&gt;:</Typography>
                        <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#3dfc55', m: 0, whiteSpace: 'pre-wrap' }}>
{`<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="192x192" href="/favicon-192x192.png">
<link rel="apple-touch-icon" sizes="512x512" href="/favicon-512x512.png">`}
                        </Typography>
                    </Paper>
                </>
            )}
        </ServicePageShell>
    );
};

export default FaviconGenerator;
