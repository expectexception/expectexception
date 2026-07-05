import React, { useMemo, useState } from 'react';
import {
    Box, Card, CardContent, Typography, Slider, Grid, Button, Stack,
    Snackbar, useTheme, alpha,
} from '@mui/material';
import { GridView, ContentCopy, RestartAlt } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const MIN_COLS = 2, MAX_COLS = 8;
const MIN_ROWS = 2, MAX_ROWS = 6;
const MIN_FR = 1, MAX_FR = 4;

const resize = (arr: number[], len: number, fill = 1): number[] => {
    if (arr.length === len) return arr;
    if (arr.length > len) return arr.slice(0, len);
    return [...arr, ...Array(len - arr.length).fill(fill)];
};

const CssGridGenerator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [numCols, setNumCols] = useState(3);
    const [numRows, setNumRows] = useState(2);
    const [colSizes, setColSizes] = useState<number[]>([1, 1, 1]);
    const [rowSizes, setRowSizes] = useState<number[]>([1, 1]);
    const [gap, setGap] = useState(16);
    const [snackbar, setSnackbar] = useState(false);

    const handleNumCols = (v: number) => {
        setNumCols(v);
        setColSizes(prev => resize(prev, v));
    };
    const handleNumRows = (v: number) => {
        setNumRows(v);
        setRowSizes(prev => resize(prev, v));
    };
    const updateColSize = (i: number, v: number) => setColSizes(prev => prev.map((s, idx) => (idx === i ? v : s)));
    const updateRowSize = (i: number, v: number) => setRowSizes(prev => prev.map((s, idx) => (idx === i ? v : s)));
    const resetSizes = () => {
        setColSizes(Array(numCols).fill(1));
        setRowSizes(Array(numRows).fill(1));
    };

    const gridTemplateColumns = colSizes.map(s => `${s}fr`).join(' ');
    const gridTemplateRows = rowSizes.map(s => `${s}fr`).join(' ');

    const cssCode = useMemo(
        () =>
            `.grid-container {\n` +
            `  display: grid;\n` +
            `  grid-template-columns: ${gridTemplateColumns};\n` +
            `  grid-template-rows: ${gridTemplateRows};\n` +
            `  gap: ${gap}px;\n` +
            `}`,
        [gridTemplateColumns, gridTemplateRows, gap]
    );

    const handleCopy = () => {
        navigator.clipboard.writeText(cssCode);
        setSnackbar(true);
    };

    return (
        <ServicePageShell
            toolId={57}
            icon={GridView}
            title="CSS Grid Generator"
            subtitle="Build a CSS Grid layout visually and copy the generated grid-template CSS"
            maxWidth="md"
            seoTitle="CSS Grid Generator — Visual grid-template-columns & Rows Builder"
            keywords={['css grid generator', 'grid template columns generator', 'css grid layout builder', 'grid template rows', 'fr unit calculator', 'css grid tool', 'visual grid builder', 'grid gap generator']}
            about="Builds a CSS Grid container by letting you set the number of columns and rows, assign each one an independent fr (fractional) size, and control the gap between cells — the same grid-template-columns, grid-template-rows, and gap properties you'd hand-write in a stylesheet. The bordered preview updates live so you can see exactly how the fr ratios divide the available space before copying the generated CSS into your own project. Everything runs client-side using plain CSS Grid math — no build step, framework, or server round-trip required."
            howToSteps={[
                { name: 'Set columns and rows', text: 'Drag the Columns (2-8) and Rows (2-6) sliders to choose the grid\'s basic dimensions.' },
                { name: 'Adjust the gap', text: 'Drag the Gap slider (0-40px) to control the spacing between grid cells.' },
                { name: 'Fine-tune column and row sizes', text: 'Use the small fr sliders under Column Sizes and Row Sizes to give individual columns or rows more or less space relative to the others.' },
                { name: 'Copy the generated CSS', text: 'Click Copy CSS to copy the grid-template-columns, grid-template-rows, and gap declarations to your clipboard.' },
            ]}
            faq={[
                { question: 'What does the fr unit mean?', answer: 'fr stands for "fractional unit" — it divides the available space in the grid container proportionally. A column set to 2fr gets twice as much width as a column set to 1fr, regardless of the container\'s pixel size.' },
                { question: 'Can I create named grid-template-areas with this tool?', answer: 'Not directly — this tool focuses on generating grid-template-columns, grid-template-rows, and gap from row/column counts and fr sizes, which covers most real-world grid layouts without needing to hand-name each area.' },
                { question: 'Does the numbered preview match my real content?', answer: 'The numbered cells represent grid cells, not your actual content — swap in your own elements after copying the CSS and the same column/row proportions will apply to them.' },
                { question: 'Is there a limit to how many columns or rows I can use?', answer: 'This tool caps at 8 columns and 6 rows to keep the per-cell fr sliders usable, but you can hand-edit the copied CSS afterward to add more if you need a larger grid.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                                Columns: {numCols}
                            </Typography>
                            <Slider value={numCols} onChange={(_, v) => handleNumCols(v as number)} min={MIN_COLS} max={MAX_COLS} step={1} sx={{ color: primary }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                                Rows: {numRows}
                            </Typography>
                            <Slider value={numRows} onChange={(_, v) => handleNumRows(v as number)} min={MIN_ROWS} max={MAX_ROWS} step={1} sx={{ color: primary }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                                Gap: {gap}px
                            </Typography>
                            <Slider value={gap} onChange={(_, v) => setGap(v as number)} min={0} max={40} step={2} sx={{ color: primary }} />
                        </Grid>
                    </Grid>

                    {/* Live preview */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns,
                            gridTemplateRows,
                            gap: `${gap}px`,
                            border: `1px dashed ${alpha(primary, 0.4)}`,
                            borderRadius: 2,
                            p: 1.5,
                            mb: 3,
                            minHeight: 240,
                        }}
                    >
                        {Array.from({ length: numCols * numRows }).map((_, i) => (
                            <Box
                                key={i}
                                sx={{
                                    bgcolor: alpha(primary, i % 2 === 0 ? 0.1 : 0.16),
                                    border: `1px solid ${alpha(primary, 0.3)}`,
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: primary,
                                    fontSize: '0.8rem',
                                    minHeight: 36,
                                }}
                            >
                                {i + 1}
                            </Box>
                        ))}
                    </Box>

                    {/* Per-column / per-row fr sliders */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Column Sizes
                                </Typography>
                            </Box>
                            <Stack spacing={1.5}>
                                {colSizes.map((s, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography variant="caption" sx={{ minWidth: 42, fontFamily: 'monospace' }}>C{i + 1}: {s}fr</Typography>
                                        <Slider value={s} onChange={(_, v) => updateColSize(i, v as number)} min={MIN_FR} max={MAX_FR} step={1} size="small" sx={{ color: primary }} />
                                    </Box>
                                ))}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                Row Sizes
                            </Typography>
                            <Stack spacing={1.5}>
                                {rowSizes.map((s, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography variant="caption" sx={{ minWidth: 42, fontFamily: 'monospace' }}>R{i + 1}: {s}fr</Typography>
                                        <Slider value={s} onChange={(_, v) => updateRowSize(i, v as number)} min={MIN_FR} max={MAX_FR} step={1} size="small" sx={{ color: primary }} />
                                    </Box>
                                ))}
                            </Stack>
                        </Grid>
                    </Grid>

                    <Box
                        component="pre"
                        sx={{
                            p: 2,
                            borderRadius: '10px',
                            bgcolor: 'rgba(0,0,0,0.3)',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            mb: 2,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                        }}
                    >
                        {cssCode}
                    </Box>

                    <Stack direction="row" spacing={1.5}>
                        <Button variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
                            Copy CSS
                        </Button>
                        <Button variant="outlined" startIcon={<RestartAlt />} onClick={resetSizes}>
                            Reset Sizes
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="CSS copied to clipboard!" />
        </ServicePageShell>
    );
};

export default CssGridGenerator;
