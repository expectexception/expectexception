import React, { useMemo, useRef, useState } from 'react';
import {
    Box, Card, CardContent, TextField, Typography, Button, Stack, Alert,
    Slider, FormControlLabel, Switch, useTheme, alpha, Snackbar,
} from '@mui/material';
import { ViewWeek, Download, ContentCopy } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import ServicePageShell from './ServicePageShell';

// ---------------------------------------------------------------------------
// Code128 (Subset B) encoder
//
// Code128 represents each of its 107 symbols (103 data values, 3 start codes,
// 1 stop code) as a fixed pattern of 6 alternating bar/space widths (7 for the
// stop code), each width between 1 and 4 modules, always summing to 11 (13 for
// the stop code). The table below is the standard, universally published
// Code128 symbol table — every implementation of the format (barcode
// generators, scanners, printers) uses these exact widths, so they are
// reproduced here verbatim rather than derived. Subset B maps value V (0-94)
// to ASCII character code V+32, i.e. it encodes the standard printable ASCII
// range (space through tilde).
// ---------------------------------------------------------------------------
const CODE128B_PATTERNS: string[] = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131',
    '211412', // 103: Start Code B
    '211214', // 104: Start Code B (used below as START_B = 104)
    '211232', // 105: Start Code C (unused here)
    '2331112', // 106: Stop
];
const START_B = 104;
const STOP = 106;

const MIN_CODE = 32; // space
const MAX_CODE = 126; // ~

/** Encodes `text` as a Code128 Subset B symbol value sequence:
 * [Start B, ...data values, checksum, Stop]. Throws if a character falls
 * outside the printable ASCII range (32-126) that Subset B supports. */
function textToValues(text: string): number[] {
    const values: number[] = [START_B];
    for (const ch of text) {
        const code = ch.charCodeAt(0);
        if (code < MIN_CODE || code > MAX_CODE) {
            throw new Error(`Unsupported character "${ch}" — Code128 Subset B only supports ASCII 32-126.`);
        }
        values.push(code - 32);
    }
    // Checksum = (start value + sum(position * value)) mod 103, position
    // starting at 1 for the first data character (standard Code128 algorithm).
    let checksum = values[0];
    for (let i = 1; i < values.length; i++) checksum += values[i] * i;
    values.push(checksum % 103);
    values.push(STOP);
    return values;
}

/** Expands a symbol-value sequence into a flat list of bar/space module
 * widths (still alternating bar, space, bar, space, ... across the whole
 * sequence, since every symbol pattern begins with a bar). */
function valuesToWidths(values: number[]): number[] {
    const widths: number[] = [];
    for (const v of values) {
        for (const ch of CODE128B_PATTERNS[v]) widths.push(Number(ch));
    }
    return widths;
}

const DEFAULT_TEXT = 'DEMO-12345';

const BarcodeGenerator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [text, setText] = useState(DEFAULT_TEXT);
    const [moduleWidth, setModuleWidth] = useState(2);
    const [barHeight, setBarHeight] = useState(100);
    const [showText, setShowText] = useState(true);
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const { widths, error } = useMemo(() => {
        if (!text) return { widths: [] as number[], error: null as string | null };
        try {
            return { widths: valuesToWidths(textToValues(text)), error: null };
        } catch (e) {
            return { widths: [] as number[], error: (e as Error).message };
        }
    }, [text]);

    const quiet = 10 * moduleWidth;
    const totalModules = widths.reduce((a, b) => a + b, 0);
    const barsWidth = totalModules * moduleWidth;
    const svgWidth = Math.max(barsWidth + quiet * 2, 40);
    const textHeight = showText ? 26 : 0;
    const svgHeight = barHeight + textHeight + 20;

    const bars: { x: number; w: number }[] = [];
    if (widths.length) {
        let x = quiet;
        let isBar = true;
        for (const w of widths) {
            const wPx = w * moduleWidth;
            if (isBar) bars.push({ x, w: wPx });
            x += wPx;
            isBar = !isBar;
        }
    }

    const handleDownloadPng = async () => {
        if (!containerRef.current) return;
        try {
            const canvas = await html2canvas(containerRef.current, { backgroundColor: '#ffffff', scale: 2 });
            canvas.toBlob(blob => {
                if (blob) saveAs(blob, `barcode-${Date.now()}.png`);
            });
        } catch {
            setSnackbar('Failed to render PNG');
        }
    };

    const handleCopySvg = () => {
        if (!svgRef.current) return;
        navigator.clipboard.writeText(svgRef.current.outerHTML);
        setSnackbar('SVG markup copied to clipboard!');
    };

    return (
        <ServicePageShell
            toolId={56}
            icon={ViewWeek}
            title="Barcode Generator"
            subtitle="Generate a scannable Code128 barcode from any text — rendered entirely in your browser"
            maxWidth="md"
            seoTitle="Barcode Generator — Free Code128 Barcode Maker"
            keywords={['barcode generator', 'code128 generator', 'free barcode maker', 'generate barcode online', 'code 128 barcode', 'text to barcode', 'barcode png download', 'inventory barcode generator']}
            about="Encodes any text you type into a scannable Code128 (Subset B) barcode using the standard Code128 symbol width table, implemented directly in JavaScript and rendered as SVG bars — no image API or server call involved. Code128 is the flexible, alphanumeric barcode format used for shipping labels, inventory tags, and internal asset tracking; it is not the UPC-A/EAN-13 format printed on retail packaging, and this tool does not generate retail barcodes. Subset B supports the full standard printable ASCII range (letters, digits, punctuation, and spaces), and the checksum is calculated using the official modulo-103 Code128 algorithm so the result is scannable by standard barcode readers. Adjust the bar width and height, then download it as a PNG or copy the raw SVG markup."
            howToSteps={[
                { name: 'Type the text to encode', text: 'Enter any text using standard printable ASCII characters (codes 32-126) — letters, numbers, spaces, and most punctuation are supported.' },
                { name: 'Adjust bar width and height', text: 'Drag the Bar Width and Bar Height sliders to resize the barcode for your label size or print DPI.' },
                { name: 'Toggle the human-readable text', text: 'Switch "Show text below barcode" on or off depending on whether you want the encoded value printed under the bars.' },
                { name: 'Download or copy', text: 'Click Download PNG to save the rendered barcode as an image, or Copy SVG to copy the scalable markup to your clipboard.' },
            ]}
            faq={[
                { question: 'Is this a UPC or EAN retail barcode?', answer: 'No — this generates Code128 (Subset B), a variable-length barcode used for shipping, logistics, and inventory tracking. It is not the UPC-A/EAN-13 format required for retail point-of-sale scanning.' },
                { question: 'What characters can I encode?', answer: 'Any standard printable ASCII character with code 32 to 126 — uppercase and lowercase letters, digits 0-9, spaces, and common punctuation such as - . / : and #. Characters outside that range (emoji, accented letters, control characters) are not supported by Code128 Subset B.' },
                { question: 'Will this scan with a real barcode scanner?', answer: 'Yes — the bar widths come directly from the standard Code128 symbol table with a correctly calculated modulo-103 checksum, so most barcode scanners and scanning apps can read it. Print or display it large enough that the narrowest bar is still comfortably resolvable by your scanner.' },
                { question: 'Does any of my text get sent to a server?', answer: 'No. Encoding and rendering both happen locally in your browser as plain JavaScript and SVG — nothing is uploaded.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <TextField
                        fullWidth
                        label="Text to encode"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="DEMO-12345"
                        inputProps={{ maxLength: 48, style: { fontFamily: 'monospace' } }}
                        helperText={`${text.length}/48 characters — Code128 Subset B (ASCII 32-126)`}
                        sx={{ mb: 2 }}
                    />

                    {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box
                        ref={containerRef}
                        sx={{
                            bgcolor: '#fff',
                            borderRadius: 2,
                            p: 2,
                            mb: 3,
                            display: 'flex',
                            justifyContent: 'center',
                            overflowX: 'auto',
                            border: `1px solid ${alpha(primary, 0.15)}`,
                        }}
                    >
                        {bars.length > 0 ? (
                            <svg ref={svgRef} width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                                <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#ffffff" />
                                {bars.map((b, i) => (
                                    <rect key={i} x={b.x} y={10} width={b.w} height={barHeight} fill="#000000" />
                                ))}
                                {showText && (
                                    <text
                                        x={svgWidth / 2}
                                        y={barHeight + 30}
                                        textAnchor="middle"
                                        fontFamily="monospace"
                                        fontSize={16}
                                        fill="#000000"
                                    >
                                        {text}
                                    </text>
                                )}
                            </svg>
                        ) : (
                            <Box sx={{ py: 4, color: '#999' }}>
                                <Typography variant="body2">Enter valid text above to generate a barcode</Typography>
                            </Box>
                        )}
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 3 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                                Bar Width: {moduleWidth}px / module
                            </Typography>
                            <Slider value={moduleWidth} onChange={(_, v) => setModuleWidth(v as number)} min={1} max={4} step={1} sx={{ color: primary }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                                Bar Height: {barHeight}px
                            </Typography>
                            <Slider value={barHeight} onChange={(_, v) => setBarHeight(v as number)} min={60} max={160} step={5} sx={{ color: primary }} />
                        </Box>
                    </Stack>

                    <FormControlLabel
                        control={<Switch checked={showText} onChange={e => setShowText(e.target.checked)} />}
                        label="Show text below barcode"
                        sx={{ mb: 2 }}
                    />

                    <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
                        <Button variant="contained" startIcon={<Download />} onClick={handleDownloadPng} disabled={!bars.length}>
                            Download PNG
                        </Button>
                        <Button variant="outlined" startIcon={<ContentCopy />} onClick={handleCopySvg} disabled={!bars.length}>
                            Copy SVG
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default BarcodeGenerator;
