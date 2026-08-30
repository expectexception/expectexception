import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Grid, Paper, Stack,
    Alert, IconButton, ToggleButton, ToggleButtonGroup, Divider, useTheme, alpha,
} from '@mui/material';
import { Straighten, ContentCopy, Check } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Fluid-typography math.
 *
 * clamp(MIN, PREFERRED, MAX) needs a PREFERRED term that equals MIN at
 * the min viewport width and MAX at the max viewport width, and moves
 * in a straight line between the two. Writing PREFERRED as a linear
 * function of the viewport width w:
 *
 *   size(w) = slope * w + constant
 *
 * Solving size(minVw) = minSize and size(maxVw) = maxSize gives:
 *
 *   slope    = (maxSize - minSize) / (maxVw - minVw)
 *   constant = minSize - slope * minVw
 *
 * CSS has no plain "w in pixels" value to plug into a calc(), but 1vw
 * is defined as 1% of the viewport width, so w = 100 * (that many vw
 * units). Substituting turns the line above into the calc() actually
 * used in the declaration:
 *
 *   PREFERRED = calc(constant + (slope * 100)vw)
 *
 * Checked against a concrete example: 16px at a 320px viewport and
 * 24px at a 1280px viewport gives slope = 8 / 960 = 0.008333, so the
 * vw coefficient is 0.8333vw and the constant is 16 - 0.008333 * 320
 * = 13.333px. At w = 320: 13.333 + 0.8333 * 3.2 = 16.0. At w = 1280:
 * 13.333 + 0.8333 * 12.8 = 24.0. Both land exactly on target.
 * ------------------------------------------------------------------ */

type SizeUnit = 'px' | 'rem';

interface ClampMath {
    slope: number;
    constant: number;
    vwCoefficient: number;
    minCss: string;
    maxCss: string;
    preferredExpr: string;
    declaration: string;
}

const round = (n: number, places = 4): number => {
    const f = Math.pow(10, places);
    return Math.round(n * f) / f;
};

function computeClamp(minSize: number, maxSize: number, minVw: number, maxVw: number, unit: SizeUnit): ClampMath {
    const slope = (maxSize - minSize) / (maxVw - minVw);
    const constant = minSize - slope * minVw;
    const vwCoefficient = slope * 100;
    const minCss = `${round(minSize)}${unit}`;
    const maxCss = `${round(maxSize)}${unit}`;
    const preferredExpr = `calc(${round(constant)}${unit} + ${round(vwCoefficient)}vw)`;
    const declaration = `font-size: clamp(${minCss}, ${preferredExpr}, ${maxCss});`;
    return { slope, constant: round(constant), vwCoefficient: round(vwCoefficient), minCss, maxCss, preferredExpr, declaration };
}

/** Plain-JS mirror of what the generated clamp() evaluates to at a given
 * viewport width, used only for the numeric "current value" readout. The
 * preview text itself uses the real CSS clamp() string as its inline
 * style, so it tracks actual window resizes on its own without any JS
 * recomputation. */
function sizeAtViewport(vw: number, minSize: number, maxSize: number, minVw: number, maxVw: number): number {
    if (vw <= minVw) return minSize;
    if (vw >= maxVw) return maxSize;
    const t = (vw - minVw) / (maxVw - minVw);
    return minSize + t * (maxSize - minSize);
}

const CssClampCalculator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [unit, setUnit] = useState<SizeUnit>('px');
    const [minSize, setMinSize] = useState(16);
    const [maxSize, setMaxSize] = useState(24);
    const [minVw, setMinVw] = useState(320);
    const [maxVw, setMaxVw] = useState(1280);
    const [copied, setCopied] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

    useEffect(() => {
        const onResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const handleUnitChange = (_: React.MouseEvent<HTMLElement>, next: SizeUnit | null) => {
        if (!next || next === unit) return;
        // Converting the numbers when the unit is switched (assuming the
        // standard 16px root font size) keeps the fields showing a size
        // that means the same thing, instead of silently reinterpreting
        // "24" as 24rem the moment the toggle is clicked.
        const factor = next === 'rem' ? 1 / 16 : 16;
        setMinSize(v => round(v * factor, 3));
        setMaxSize(v => round(v * factor, 3));
        setUnit(next);
    };

    const errorMessage = useMemo(() => {
        if (maxVw <= minVw) return 'Max viewport width must be greater than min viewport width.';
        if (maxSize < minSize) return 'Max size should be greater than or equal to min size.';
        return null;
    }, [minSize, maxSize, minVw, maxVw]);

    const clamp = useMemo(
        () => (errorMessage ? null : computeClamp(minSize, maxSize, minVw, maxVw, unit)),
        [errorMessage, minSize, maxSize, minVw, maxVw, unit],
    );

    const currentSize = clamp ? round(sizeAtViewport(viewportWidth, minSize, maxSize, minVw, maxVw), 2) : null;
    const previewCss = clamp ? `clamp(${clamp.minCss}, ${clamp.preferredExpr}, ${clamp.maxCss})` : undefined;

    const copy = () => {
        if (!clamp) return;
        navigator.clipboard.writeText(clamp.declaration);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <ServicePageShell
            icon={Straighten}
            title="CSS Clamp / Fluid Typography Calculator"
            subtitle="Generate a clamp() value that scales font size smoothly between two viewport widths, no breakpoints needed"
            maxWidth="md"
            toolId={79}
            seoTitle="CSS clamp() Calculator | Fluid Typography Generator"
            seoDescription="Generate a CSS clamp() declaration for fluid, responsive font sizing. Enter a min and max size and viewport width and get ready-to-use CSS, with the underlying math shown and a live preview."
            keywords={['css clamp calculator', 'fluid typography generator', 'css clamp generator', 'responsive font size calculator', 'fluid font size css', 'vw font size formula', 'clamp function css', 'responsive typography without media queries']}
            about="This tool works out the calc() expression that belongs inside a CSS clamp() function, so a font size can scale smoothly between a minimum and a maximum as the viewport width changes. It uses the standard fluid-typography formula: a straight line is fitted between the min size at the min viewport width and the max size at the max viewport width, then rewritten in terms of the vw unit so a browser can evaluate it without any JavaScript. Below the min viewport the size stays fixed at the minimum, above the max viewport it stays fixed at the maximum, and it scales continuously in between. Everything runs in your browser, so nothing you enter here is sent anywhere."
            howToSteps={[
                { name: 'Choose a unit', text: "Pick px or rem for the font sizes. rem is usually the better choice for font-size, since it respects a visitor's browser font-size setting." },
                { name: 'Set the min and max sizes', text: 'Enter the smallest size the text should ever be and the largest size it should grow to.' },
                { name: 'Set the viewport range', text: 'Enter the viewport width where the size should stop shrinking and the width where it should stop growing. 320px and 1280px are reasonable defaults, covering small phones through small laptops.' },
                { name: 'Copy the CSS', text: 'Click Copy to grab the finished clamp() declaration for your stylesheet.' },
            ]}
            faq={[
                { question: 'What does clamp() actually do?', answer: 'clamp() takes three arguments: a minimum, a preferred value, and a maximum. The browser evaluates the preferred value and uses it as-is, unless it falls below the minimum or above the maximum, in which case it uses whichever limit was crossed instead. Here the preferred value is a calc() expression built from a vw unit, so the effective size grows continuously with the viewport until it hits one of the two limits.' },
                { question: 'Why is this better than setting font sizes at a few breakpoints?', answer: 'Breakpoints change a size in visible jumps: it holds steady, then suddenly steps to a new value at one specific width. A clamp()-based size changes by a fraction of a pixel with every pixel of viewport change, so there is no jump to notice, and no set of breakpoint values to pick and maintain in the first place.' },
                { question: 'Do I need to worry about browser support?', answer: 'Not really. clamp() has been supported in every major browser, Chrome, Firefox, Safari and Edge, since 2020. For a site targeting current browsers there is no real compatibility caveat here.' },
                { question: 'Why does the calc() mix a fixed amount with a vw term instead of just using vw?', answer: 'A pure vw value has no floor or ceiling of its own: on a very narrow or very wide screen it keeps shrinking or growing without limit. Adding a fixed rem or px amount and wrapping the whole thing in clamp() is what gives the result a hard minimum and maximum while it still scales smoothly in between.' },
            ]}
        >
            <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
                <Grid item xs={12} md={5}>
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={800}>Font size</Typography>
                                <ToggleButtonGroup size="small" exclusive value={unit} onChange={handleUnitChange}>
                                    <ToggleButton value="px" sx={{ px: 1.5, fontSize: '0.7rem' }}>px</ToggleButton>
                                    <ToggleButton value="rem" sx={{ px: 1.5, fontSize: '0.7rem' }}>rem</ToggleButton>
                                </ToggleButtonGroup>
                            </Stack>

                            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                <TextField
                                    fullWidth
                                    label={`Min size (${unit})`}
                                    type="number"
                                    size="small"
                                    value={minSize}
                                    onChange={e => setMinSize(Math.max(0, Number(e.target.value)))}
                                    inputProps={{ step: unit === 'rem' ? 0.1 : 1, min: 0 }}
                                />
                                <TextField
                                    fullWidth
                                    label={`Max size (${unit})`}
                                    type="number"
                                    size="small"
                                    value={maxSize}
                                    onChange={e => setMaxSize(Math.max(0, Number(e.target.value)))}
                                    inputProps={{ step: unit === 'rem' ? 0.1 : 1, min: 0 }}
                                />
                            </Stack>

                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2 }}>Viewport range</Typography>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Min viewport (px)"
                                    type="number"
                                    size="small"
                                    value={minVw}
                                    onChange={e => setMinVw(Math.max(0, Number(e.target.value)))}
                                    inputProps={{ step: 10, min: 0 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Max viewport (px)"
                                    type="number"
                                    size="small"
                                    value={maxVw}
                                    onChange={e => setMaxVw(Math.max(0, Number(e.target.value)))}
                                    inputProps={{ step: 10, min: 0 }}
                                />
                            </Stack>

                            {unit === 'rem' && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                                    Assumes the standard 16px root font size when converting between units.
                                </Typography>
                            )}

                            {errorMessage && <Alert severity="warning" sx={{ mt: 2 }}>{errorMessage}</Alert>}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Stack spacing={2}>
                        <Paper sx={{ p: 3, borderRadius: 2, bgcolor: alpha(primary, 0.06), border: `1px solid ${alpha(primary, 0.2)}`, textAlign: 'center', overflow: 'hidden' }}>
                            {clamp ? (
                                <>
                                    <Box
                                        component="p"
                                        style={{ fontSize: previewCss, margin: 0, fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word' }}
                                    >
                                        The quick brown fox jumps
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                                        At your current viewport ({viewportWidth}px) this evaluates to <strong>{currentSize}{unit}</strong>. Resize the browser window to watch it change live.
                                    </Typography>
                                </>
                            ) : (
                                <Typography variant="body2" color="text.disabled">Fix the values on the left to see a preview.</Typography>
                            )}
                        </Paper>

                        <Paper sx={{ p: 2, bgcolor: '#0d1117', borderRadius: 2, position: 'relative', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Generated CSS</Typography>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#3dfc55', wordBreak: 'break-all', pr: 5 }}>
                                {clamp ? clamp.declaration : '/* fix the values on the left */'}
                            </Typography>
                            <IconButton onClick={copy} size="small" disabled={!clamp} sx={{ position: 'absolute', top: 8, right: 8, color: copied ? 'success.main' : 'text.secondary' }}>
                                {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                            </IconButton>
                        </Paper>

                        {clamp && (
                            <Paper sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                                    HOW IT IS CALCULATED
                                </Typography>
                                <Grid container spacing={1.5}>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="text.secondary" display="block">Slope</Typography>
                                        <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{round(clamp.slope, 6)}</Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="text.secondary" display="block">vw coefficient</Typography>
                                        <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{clamp.vwCoefficient}vw</Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="text.secondary" display="block">Constant</Typography>
                                        <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{clamp.constant}{unit}</Typography>
                                    </Grid>
                                </Grid>
                                <Divider sx={{ my: 1.5 }} />
                                <Typography variant="caption" color="text.secondary">
                                    constant = min size - (slope x min viewport). vw coefficient = slope x 100. The preferred value lands on exactly {clamp.minCss} at {minVw}px of viewport width and exactly {clamp.maxCss} at {maxVw}px.
                                </Typography>
                            </Paper>
                        )}
                    </Stack>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default CssClampCalculator;
