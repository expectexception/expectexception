import React, { useState } from 'react';
import {
    Box, Card, CardContent, TextField, Typography, Button, Stack, Alert,
    Slider, Grid, Paper, useTheme, alpha, Snackbar,
} from '@mui/material';
import { Straighten, ContentCopy } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const ROOT_FONT_SIZE = 16; // px — the standard browser default for `1rem`

/** Rounds to 4 decimal places and drops trailing zeros (via plain Number
 * formatting), matching the precision used by well-known fluid-typography
 * calculators such as Utopia. */
const round = (n: number): number => Math.round(n * 10000) / 10000;

interface ClampResult {
    minSizeRem: number;
    maxSizeRem: number;
    preferred: string;
    css: string;
}

/** Standard fluid-typography linear interpolation — the same math behind
 * Utopia.fyi and the well-known CSS-Tricks "linearly scale" formula. Sizes
 * are converted from px to rem first; a slope (rem of size change per px of
 * viewport width) and a y-intercept are then derived so that evaluating
 * `calc(intercept*1rem + slope*100*1vw)` at the current viewport width
 * reproduces exactly minSize at minVw and exactly maxSize at maxVw, with a
 * straight-line ramp in between. */
function computeClamp(minSizePx: number, maxSizePx: number, minVw: number, maxVw: number): ClampResult {
    const minSizeRem = minSizePx / ROOT_FONT_SIZE;
    const maxSizeRem = maxSizePx / ROOT_FONT_SIZE;
    const slope = (maxSizeRem - minSizeRem) / (maxVw - minVw);
    const yInterceptRem = minSizeRem - slope * minVw;
    const vwCoefficient = slope * 100;
    const preferred = `calc(${round(yInterceptRem)}rem + ${round(vwCoefficient)}vw)`;
    const css = `clamp(${round(minSizeRem)}rem, ${preferred}, ${round(maxSizeRem)}rem)`;
    return { minSizeRem, maxSizeRem, preferred, css };
}

/** Directly interpolates the rendered size (in px) at a hypothetical
 * viewport width, for the live preview slider — mathematically the same
 * curve as the generated CSS, computed in plain JS so the preview works
 * regardless of the actual browser window size. */
function previewSizePx(vw: number, minSizePx: number, maxSizePx: number, minVw: number, maxVw: number): number {
    if (vw <= minVw) return minSizePx;
    if (vw >= maxVw) return maxSizePx;
    const t = (vw - minVw) / (maxVw - minVw);
    return minSizePx + t * (maxSizePx - minSizePx);
}

const CssClampCalculator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [minSize, setMinSize] = useState('16');
    const [maxSize, setMaxSize] = useState('32');
    const [minVw, setMinVw] = useState('375');
    const [maxVw, setMaxVw] = useState('1440');
    const [property, setProperty] = useState('font-size');
    const [previewVw, setPreviewVw] = useState(860);
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const minSizePx = parseFloat(minSize);
    const maxSizePx = parseFloat(maxSize);
    const minVwPx = parseFloat(minVw);
    const maxVwPx = parseFloat(maxVw);

    let error: string | null = null;
    if ([minSizePx, maxSizePx, minVwPx, maxVwPx].some(n => Number.isNaN(n))) {
        error = 'Enter a number in every field.';
    } else if (minSizePx <= 0 || maxSizePx <= 0 || minVwPx <= 0 || maxVwPx <= 0) {
        error = 'All values must be greater than zero.';
    } else if (maxVwPx <= minVwPx) {
        error = 'Max viewport width must be greater than min viewport width.';
    } else if (maxSizePx < minSizePx) {
        error = 'Max size should be greater than or equal to min size.';
    }

    const result = error ? null : computeClamp(minSizePx, maxSizePx, minVwPx, maxVwPx);
    const declaration = result ? `${property || 'font-size'}: ${result.css};` : '';

    const copy = () => {
        if (!declaration) return;
        navigator.clipboard.writeText(declaration);
        setSnackbar('CSS copied to clipboard!');
    };

    // Slider range always covers the fluid zone plus a padded flat region on
    // each side, so both the "locked at minimum" and "locked at maximum"
    // behavior are visible no matter what viewport widths are entered.
    let sliderMin = 280;
    let sliderMax = 2560;
    let clampedPreviewVw = previewVw;
    let previewPx = minSizePx || 16;
    if (result) {
        const pad = Math.max(50, (maxVwPx - minVwPx) * 0.2);
        sliderMin = Math.max(0, minVwPx - pad);
        sliderMax = maxVwPx + pad;
        clampedPreviewVw = Math.min(Math.max(previewVw, sliderMin), sliderMax);
        previewPx = previewSizePx(clampedPreviewVw, minSizePx, maxSizePx, minVwPx, maxVwPx);
    }
    const viewportPercent = result ? ((clampedPreviewVw - sliderMin) / (sliderMax - sliderMin)) * 100 : 0;

    return (
        <ServicePageShell
            icon={Straighten}
            title="CSS Clamp() Calculator"
            subtitle="Generate a fluid, responsive clamp() value that scales smoothly between a min and max viewport width — no media queries"
            maxWidth="md"
            seoTitle="CSS clamp() Calculator — Fluid Responsive Font Size Generator"
            keywords={['css clamp calculator', 'fluid typography generator', 'css clamp generator', 'responsive font size css', 'fluid font size calculator', 'css clamp min max preferred', 'vw font size formula', 'responsive typography without media queries', 'css locking calculator']}
            about="Generates a CSS clamp() declaration that scales a size fluidly between a minimum value at a minimum viewport width and a maximum value at a maximum viewport width, using the same linear-interpolation formula behind well-known fluid-typography calculators: a slope and rem offset are derived from the four inputs and combined into a calc() expression mixing a fixed rem amount with a vw, or viewport-width, term. Below the min viewport width the size stays locked at the minimum; above the max viewport width it stays locked at the maximum; in between, it scales continuously with no breakpoints or media queries at all. It defaults to font-size but the property name is editable, since the exact same clamp() value works for any scalable length such as padding, gap, or line-height. All the math runs locally in the browser as plain JavaScript, and the mock viewport slider recomputes the previewed size at any chosen width without needing to actually resize the browser window."
            howToSteps={[
                { name: 'Set the min and max sizes', text: 'Enter the smallest size the property should ever be and the largest size it should ever reach, in pixels.' },
                { name: 'Set the min and max viewport widths', text: 'Enter the viewport width at which the size should stop shrinking, and the width at which it should stop growing.' },
                { name: 'Name the CSS property', text: 'Leave it as font-size, or change it to padding, gap, line-height, or any other scalable property; the generated clamp value works the same way.' },
                { name: 'Drag the preview slider', text: 'Move the mock viewport slider to see the exact computed size at any width, including the flat regions below the min and above the max viewport.' },
                { name: 'Copy the CSS', text: 'Click Copy to copy the ready-to-use declaration to the clipboard.' },
            ]}
            faq={[
                { question: 'Why use clamp() instead of media query breakpoints?', answer: 'A single clamp() declaration replaces several breakpoint-specific rules and scales continuously with the viewport instead of jumping in steps at each breakpoint, which typically looks smoother and takes less CSS code.' },
                { question: 'What happens outside the min and max viewport range?', answer: 'The size is locked flat: it stays at the minimum for any viewport narrower than the min width, and at the maximum for any viewport wider than the max width. Interpolation only happens strictly between the two.' },
                { question: 'Is clamp() supported in all browsers?', answer: 'Yes, in any browser released since around 2020, including Chrome, Firefox, Safari, and Edge. It is not supported in Internet Explorer.' },
                { question: 'Can this be used for something other than font-size?', answer: 'Yes, the generated value is a plain CSS length, so it works for padding, margin, gap, width, line-height, or any other property that accepts a length. Just change the property name field before copying.' },
            ]}
        >
            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                fullWidth size="small" label="Min size (px)" type="number"
                                value={minSize} onChange={e => setMinSize(e.target.value)}
                                inputProps={{ min: 0, step: 1 }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                fullWidth size="small" label="Max size (px)" type="number"
                                value={maxSize} onChange={e => setMaxSize(e.target.value)}
                                inputProps={{ min: 0, step: 1 }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                fullWidth size="small" label="Min viewport (px)" type="number"
                                value={minVw} onChange={e => setMinVw(e.target.value)}
                                inputProps={{ min: 0, step: 1 }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                fullWidth size="small" label="Max viewport (px)" type="number"
                                value={maxVw} onChange={e => setMaxVw(e.target.value)}
                                inputProps={{ min: 0, step: 1 }}
                            />
                        </Grid>
                    </Grid>

                    <TextField
                        size="small"
                        label="CSS property"
                        value={property}
                        onChange={e => setProperty(e.target.value)}
                        helperText="Applied to the generated declaration below — change it if you are not styling font-size"
                        sx={{ maxWidth: 260 }}
                    />

                    {error && <Alert severity="warning">{error}</Alert>}

                    {result && (
                        <>
                            <Paper sx={{ p: 2, bgcolor: '#0d1117', borderRadius: 2, position: 'relative', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    Generated CSS
                                </Typography>
                                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#3dfc55', wordBreak: 'break-all', pr: 5 }}>
                                    {declaration}
                                </Typography>
                                <Button
                                    size="small"
                                    onClick={copy}
                                    startIcon={<ContentCopy sx={{ fontSize: 14 }} />}
                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                >
                                    Copy
                                </Button>
                            </Paper>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                                    Mock viewport width: {Math.round(clampedPreviewVw)}px &rarr; {previewPx.toFixed(1)}px ({(previewPx / ROOT_FONT_SIZE).toFixed(3)}rem)
                                </Typography>
                                <Slider
                                    value={clampedPreviewVw}
                                    onChange={(_, v) => setPreviewVw(v as number)}
                                    min={sliderMin}
                                    max={sliderMax}
                                    step={1}
                                    sx={{ color: primary }}
                                />
                                <Stack direction="row" justifyContent="space-between" sx={{ mt: -1, mb: 2 }}>
                                    <Typography variant="caption" color="text.disabled">{Math.round(sliderMin)}px</Typography>
                                    <Typography variant="caption" color="text.disabled">{Math.round(sliderMax)}px</Typography>
                                </Stack>

                                <Box sx={{ border: `1px dashed ${alpha(primary, 0.35)}`, borderRadius: 2, p: 2, overflowX: 'auto' }}>
                                    <Box
                                        sx={{
                                            width: `${Math.max(viewportPercent, 6)}%`,
                                            minWidth: 140,
                                            mx: 'auto',
                                            bgcolor: alpha(primary, 0.08),
                                            border: `1px solid ${alpha(primary, 0.25)}`,
                                            borderRadius: 1.5,
                                            p: 2,
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Typography
                                            sx={{ fontSize: `${previewPx}px`, fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}
                                        >
                                            The quick brown fox
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default CssClampCalculator;
