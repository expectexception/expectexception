import React, { useCallback, useEffect, useState } from 'react';
import { Box, Card, Typography, Stack, Chip, Button, Alert, useTheme } from '@mui/material';
import { FontDownload, Refresh } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/** Fonts that are (almost) guaranteed to exist as one of the three generic
 * CSS font families, used as the fallback every candidate is measured
 * against. */
const BASELINE_FONTS = ['monospace', 'sans-serif', 'serif'] as const;

/** A wide/narrow mix of characters so differences in glyph metrics between
 * fonts show up clearly in the measured width. */
const TEST_STRING = 'mmmmmmmmmmlli';
const TEST_SIZE = '72px';

interface FontEntry {
    name: string;
    group: 'Windows' | 'macOS' | 'Linux' | 'Cross-platform / Web';
}

const CANDIDATE_FONTS: FontEntry[] = [
    { name: 'Arial', group: 'Windows' },
    { name: 'Times New Roman', group: 'Windows' },
    { name: 'Courier New', group: 'Windows' },
    { name: 'Verdana', group: 'Windows' },
    { name: 'Comic Sans MS', group: 'Windows' },
    { name: 'Impact', group: 'Windows' },
    { name: 'Trebuchet MS', group: 'Windows' },
    { name: 'Calibri', group: 'Windows' },
    { name: 'Cambria', group: 'Windows' },
    { name: 'Consolas', group: 'Windows' },
    { name: 'Segoe UI', group: 'Windows' },
    { name: 'Tahoma', group: 'Windows' },
    { name: 'Century Gothic', group: 'Windows' },
    { name: 'Franklin Gothic Medium', group: 'Windows' },
    { name: 'Arial Black', group: 'Windows' },
    { name: 'Lucida Console', group: 'Windows' },
    { name: 'Lucida Sans Unicode', group: 'Windows' },
    { name: 'Book Antiqua', group: 'Windows' },
    { name: 'Helvetica', group: 'macOS' },
    { name: 'Georgia', group: 'macOS' },
    { name: 'Palatino', group: 'macOS' },
    { name: 'San Francisco', group: 'macOS' },
    { name: 'Menlo', group: 'macOS' },
    { name: 'Monaco', group: 'macOS' },
    { name: 'SF Mono', group: 'macOS' },
    { name: 'Ubuntu', group: 'Linux' },
    { name: 'Cantarell', group: 'Linux' },
    { name: 'DejaVu Sans', group: 'Linux' },
    { name: 'Liberation Sans', group: 'Linux' },
    { name: 'Noto Sans', group: 'Linux' },
    { name: 'Roboto', group: 'Cross-platform / Web' },
    { name: 'Open Sans', group: 'Cross-platform / Web' },
    { name: 'Garamond', group: 'Cross-platform / Web' },
    { name: 'Fira Code', group: 'Cross-platform / Web' },
    { name: 'Source Code Pro', group: 'Cross-platform / Web' },
];

const GROUP_ORDER: FontEntry['group'][] = ['Windows', 'macOS', 'Linux', 'Cross-platform / Web'];

interface DetectionResult {
    detected: Record<string, boolean>;
    durationMs: number;
}

/** Classic canvas text-measurement font detection: render the same test
 * string once with just a generic fallback font, then again asking for the
 * candidate font with that fallback behind it. If the candidate is actually
 * installed, the browser renders with it and the glyph metrics (and so the
 * measured width) differ from the fallback-only render. If it isn't
 * installed, the browser silently substitutes the fallback and the two
 * widths come out identical. Checking against all three generic fallbacks
 * (monospace/sans-serif/serif) avoids a false negative in the rare case a
 * font's metrics happen to coincide with one specific fallback. */
function detectFonts(candidates: FontEntry[]): DetectionResult {
    const start = performance.now();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const detected: Record<string, boolean> = {};

    if (!ctx) {
        candidates.forEach((c) => { detected[c.name] = false; });
        return { detected, durationMs: performance.now() - start };
    }

    const baselineWidths = BASELINE_FONTS.map((baseline) => {
        ctx.font = `${TEST_SIZE} ${baseline}`;
        return ctx.measureText(TEST_STRING).width;
    });

    for (const { name } of candidates) {
        const differsFromEveryBaseline = BASELINE_FONTS.every((baseline, i) => {
            ctx.font = `${TEST_SIZE} '${name}', ${baseline}`;
            const width = ctx.measureText(TEST_STRING).width;
            return Math.abs(width - baselineWidths[i]) > 0.01;
        });
        detected[name] = differsFromEveryBaseline;
    }

    return { detected, durationMs: performance.now() - start };
}

const FontDetector: React.FC = () => {
    const theme = useTheme();
    const [result, setResult] = useState<DetectionResult | null>(null);

    const runScan = useCallback(() => {
        setResult(detectFonts(CANDIDATE_FONTS));
    }, []);

    useEffect(() => {
        runScan();
    }, [runScan]);

    const detectedCount = result ? Object.values(result.detected).filter(Boolean).length : 0;

    const about = 'Measures which fonts from a candidate list are actually available for your browser to render, using the canvas text-measurement technique that has been the standard way to do this client-side for well over a decade. It renders a test string with a generic fallback font, renders it again asking for each candidate font with that same fallback behind it, and compares the pixel widths. When a font is installed the browser renders it with different glyph metrics than the fallback, so the width changes; when it is missing the browser silently substitutes the fallback and the width stays identical. Everything happens in an off-screen canvas in your browser, so nothing about your installed fonts is sent anywhere.';

    const howToSteps = [
        { name: 'Load the page', text: 'The scan runs automatically on an off-screen canvas as soon as the page opens. There is nothing to configure first.' },
        { name: 'Read the chip grid', text: 'Filled green chips are fonts detected as installed, each rendered in its own font so you can see the actual glyphs. Outlined gray chips were not detected.' },
        { name: 'Check the summary count', text: 'The top of the results shows how many of the candidate fonts were found, plus how long the scan took.' },
        { name: 'Re-scan if needed', text: 'If you install a new font and restart your browser, click Re-scan to measure again without reloading the page.' },
    ];

    const faq = [
        {
            question: 'How does this actually detect a font, technically?',
            answer: 'It draws the same string of text on a hidden canvas twice: once with only a generic fallback font (monospace, sans-serif, or serif), and once asking for the candidate font first with that same fallback as a backup. Browsers report the pixel width of rendered text via canvas measureText(), and different fonts have different character widths at the same size. If the candidate font is installed, its width differs from the fallback-only width; if it is missing, the browser quietly falls back and the two widths match exactly. That is the whole trick: comparing rendered widths, nothing more exotic than that.',
        },
        {
            question: 'Can this see every font installed on my computer?',
            answer: 'No, only the ones in this tool\'s candidate list, which is around three dozen common fonts across Windows, macOS, and Linux. There is no browser API that lets a website enumerate your full system font list, and that is deliberate: a complete font inventory is a strong browser fingerprinting signal, since the combination of fonts you have installed can narrow down who you are across visits. This tool only checks the specific names in its list and never transmits results anywhere, but it is worth understanding that the general technique (measuring font metrics) is the same one fingerprinting scripts use, which is exactly why full enumeration is blocked at the platform level.',
        },
        {
            question: 'I have a font installed but it shows as not detected. Why?',
            answer: 'A couple of common reasons. First, the font family name the OS registered it under might not exactly match the name this tool tests for (font naming is surprisingly inconsistent between vendors and platforms). Second, some locked-down browser configurations or sandboxed environments restrict which installed fonts are exposed to web content at all, even though the OS has the font. Neither case means the detection technique failed; it means the specific name tested did not match what your system reports.',
        },
        {
            question: 'Does installing more fonts make my browser fingerprint more unique?',
            answer: 'Yes, and that is exactly why browsers do not expose a full font list to websites. An unusual combination of installed fonts (a set of design tools, foreign-language packs, or niche typefaces) can make your browser more identifiable across sites even without cookies. This tool only demonstrates the mechanism on a small, fixed candidate list and keeps every result local to your browser.',
        },
    ];

    return (
        <ServicePageShell
            icon={FontDownload}
            title="Installed Font Detector"
            subtitle="Detects which fonts from a candidate list are actually installed, using real canvas text measurement"
            maxWidth="md"
            toolId={94}
            seoTitle="Font Detector | Check Installed Fonts in Your Browser"
            seoDescription="Detect which common fonts are actually installed on your device using the canvas text-measurement technique. Runs entirely client-side; nothing about your fonts is sent anywhere."
            keywords={['font detector', 'installed fonts checker', 'canvas font detection', 'what fonts do i have', 'browser font fingerprint test', 'system font checker']}
            about={about}
            howToSteps={howToSteps}
            faq={faq}
        >
            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                overflowY: 'auto',
            }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="h5" fontWeight={900}>
                            {detectedCount} of {CANDIDATE_FONTS.length} fonts detected
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {result ? `Scanned in ${result.durationMs.toFixed(1)}ms via canvas text measurement.` : 'Scanning…'}
                        </Typography>
                    </Box>
                    <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={runScan}>
                        Re-scan
                    </Button>
                </Stack>

                <Alert severity="info" sx={{ mb: 3 }}>
                    Only fonts in this tool's ~{CANDIDATE_FONTS.length}-font candidate list can be detected. There is no browser API to list every font on your system, by design.
                </Alert>

                <Stack spacing={3}>
                    {GROUP_ORDER.map((group) => {
                        const fonts = CANDIDATE_FONTS.filter((f) => f.group === group);
                        return (
                            <Box key={group}>
                                <Typography variant="overline" fontWeight={800} sx={{ color: theme.palette.primary.main, letterSpacing: 1 }}>
                                    {group}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                    {fonts.map(({ name }) => {
                                        const isDetected = !!result?.detected[name];
                                        return (
                                            <Chip
                                                key={name}
                                                label={name}
                                                color={isDetected ? 'success' : 'default'}
                                                variant={isDetected ? 'filled' : 'outlined'}
                                                sx={{
                                                    fontFamily: isDetected ? `'${name}', sans-serif` : undefined,
                                                    fontSize: '0.9rem',
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        );
                    })}
                </Stack>
            </Card>
        </ServicePageShell>
    );
};

export default FontDetector;
