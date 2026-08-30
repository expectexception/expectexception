import React, { useState, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Grid, Stack,
    Button, Divider, useTheme, alpha,
} from '@mui/material';
import { SpaceBar, ContentCopy, Check } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Every space, tab, line break and "invisible" Unicode character gets
 * classified by exact code point and rendered as its own marker so
 * nothing can hide in a wall of plain text. The same classification
 * feeds the summary breakdown and the "copy cleaned text" action —
 * one source of truth for what counts as unusual.
 * ------------------------------------------------------------------ */

const DEMO_TEXT = 'This line looks normal, but it has a non-breaking space right there.\n'
    + 'This one hides a zero-width space​in the middle of a word.\n'
    + 'And\ttabs\tshow up too, plus a stray carriage return\r\n'
    + 'from a file that was saved on Windows.';

interface NamedChar {
    name: string;
    short: string;
}

const NAMED_CHARS: Record<number, NamedChar> = {
    0x00A0: { name: 'Non-breaking space', short: 'NBSP' },
    0x00AD: { name: 'Soft hyphen', short: 'SHY' },
    0x1680: { name: 'Ogham space mark', short: 'OGSP' },
    0x180E: { name: 'Mongolian vowel separator', short: 'MVS' },
    0x2000: { name: 'En quad', short: 'EN QUAD' },
    0x2001: { name: 'Em quad', short: 'EM QUAD' },
    0x2002: { name: 'En space', short: 'EN SP' },
    0x2003: { name: 'Em space', short: 'EM SP' },
    0x2004: { name: 'Three-per-em space', short: '3/EM' },
    0x2005: { name: 'Four-per-em space', short: '4/EM' },
    0x2006: { name: 'Six-per-em space', short: '6/EM' },
    0x2007: { name: 'Figure space', short: 'FIG SP' },
    0x2008: { name: 'Punctuation space', short: 'PUNCT SP' },
    0x2009: { name: 'Thin space', short: 'THIN SP' },
    0x200A: { name: 'Hair space', short: 'HAIR SP' },
    0x200B: { name: 'Zero-width space', short: 'ZWSP' },
    0x200C: { name: 'Zero-width non-joiner', short: 'ZWNJ' },
    0x200D: { name: 'Zero-width joiner', short: 'ZWJ' },
    0x200E: { name: 'Left-to-right mark', short: 'LRM' },
    0x200F: { name: 'Right-to-left mark', short: 'RLM' },
    0x2028: { name: 'Line separator', short: 'LSEP' },
    0x2029: { name: 'Paragraph separator', short: 'PSEP' },
    0x202F: { name: 'Narrow no-break space', short: 'NNBSP' },
    0x205F: { name: 'Medium mathematical space', short: 'MMSP' },
    0x2060: { name: 'Word joiner', short: 'WJ' },
    0x3000: { name: 'Ideographic space', short: 'IDSP' },
    0xFEFF: { name: 'Byte order mark / zero-width no-break space', short: 'BOM' },
};

const ZERO_WIDTH_CODES = new Set([0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x2060, 0xFEFF, 0x00AD, 0x180E]);
const SPACE_VARIANT_CODES = new Set([
    0x00A0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
    0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000,
]);

function hex(code: number): string {
    return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
}

function isControlCode(code: number): boolean {
    return code <= 0x1F || (code >= 0x7F && code <= 0x9F);
}

interface BreakdownEntry {
    key: string;
    label: string;
    count: number;
}

interface WhitespaceStats {
    totalChars: number;
    printableChars: number;
    breakdown: BreakdownEntry[];
}

/** Classifies one character for the summary breakdown. A plain space
 * returns null — it is expected, visible-enough, and already shown as a
 * dot in the visualization, so it is not "flagged" as unusual. */
function classifyForBreakdown(ch: string, code: number): { key: string; label: string } | null {
    if (ch === ' ') return null;
    const named = NAMED_CHARS[code];
    if (named) return { key: `n${code}`, label: `${named.name} (${hex(code)})` };
    if (ch === '\t') return { key: 'tab', label: 'Tab (U+0009)' };
    if (ch === '\n') return { key: 'lf', label: 'Line feed (U+000A)' };
    if (ch === '\r') return { key: 'cr', label: 'Carriage return (U+000D)' };
    if (isControlCode(code)) return { key: `c${code}`, label: `Control character (${hex(code)})` };
    return null;
}

function analyzeWhitespace(text: string): WhitespaceStats {
    const chars = Array.from(text);
    const breakdownMap = new Map<string, BreakdownEntry>();
    let printableChars = 0;

    chars.forEach((ch) => {
        if (ch === ' ') return;
        const code = ch.codePointAt(0) ?? 0;
        const cls = classifyForBreakdown(ch, code);
        if (cls) {
            const existing = breakdownMap.get(cls.key);
            if (existing) existing.count += 1;
            else breakdownMap.set(cls.key, { key: cls.key, label: cls.label, count: 1 });
        } else {
            printableChars += 1;
        }
    });

    const breakdown = Array.from(breakdownMap.values()).sort((a, b) => b.count - a.count);
    return { totalChars: chars.length, printableChars, breakdown };
}

/** Builds a cleaned copy: zero-width/format characters are dropped,
 * exotic Unicode spaces become a plain space, CRLF/CR/line-and-paragraph
 * separators become a plain \n, and stray control characters (other than
 * tab and newline) are stripped. The input the user pasted is never
 * mutated — this only ever produces a separate string for "Copy cleaned
 * text" to put on the clipboard. */
function buildCleanedText(text: string): string {
    const chars = Array.from(text);
    let out = '';
    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const code = ch.codePointAt(0) ?? 0;

        if (ch === '\r') {
            if (chars[i + 1] === '\n') continue; // let the following \n represent the break
            out += '\n';
            continue;
        }
        if (code === 0x2028 || code === 0x2029) { out += '\n'; continue; }
        if (ZERO_WIDTH_CODES.has(code)) continue;
        if (SPACE_VARIANT_CODES.has(code)) { out += ' '; continue; }
        if (isControlCode(code) && ch !== '\n' && ch !== '\t') continue;
        out += ch;
    }
    return out;
}

const LegendItem: React.FC<{ symbol: string; label: string; color: string }> = ({ symbol, label, color }) => (
    <Stack direction="row" spacing={0.5} alignItems="center">
        <Box component="span" sx={{ fontWeight: 700, color, fontSize: '0.8rem', minWidth: 18, textAlign: 'center' }}>
            {symbol}
        </Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Stack>
);

const WhitespaceVisualizer: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const spaceColor = theme.palette.text.disabled;
    const tabColor = theme.palette.info.main;
    const newlineColor = theme.palette.secondary.main;
    const namedColor = theme.palette.warning.main;
    const controlColor = theme.palette.error.main;

    const [text, setText] = useState(DEMO_TEXT);
    const [copied, setCopied] = useState(false);

    const stats = useMemo(() => analyzeWhitespace(text), [text]);
    const cleanedText = useMemo(() => buildCleanedText(text), [text]);

    const visualized = useMemo(() => {
        const chars = Array.from(text);
        const nodes: React.ReactNode[] = [];
        let buffer = '';
        let key = 0;

        const flush = () => {
            if (buffer) {
                nodes.push(<React.Fragment key={`t${key++}`}>{buffer}</React.Fragment>);
                buffer = '';
            }
        };

        const chip = (content: string, color: string, title: string, k: string) => {
            nodes.push(
                <Box
                    component="span"
                    key={k}
                    title={title}
                    sx={{
                        display: 'inline-block',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        lineHeight: 1.6,
                        px: 0.5,
                        mx: '1px',
                        borderRadius: '4px',
                        bgcolor: alpha(color, 0.2),
                        color,
                        verticalAlign: 'middle',
                    }}
                >
                    {content}
                </Box>,
            );
        };

        chars.forEach((ch) => {
            const code = ch.codePointAt(0) ?? 0;

            if (ch === ' ') {
                flush();
                nodes.push(
                    <Box component="span" key={`s${key++}`} title="Space (U+0020)" sx={{ color: spaceColor }}>·</Box>,
                );
                return;
            }
            if (ch === '\t') {
                flush();
                chip('→', tabColor, 'Tab (U+0009)', `tb${key++}`);
                return;
            }
            if (ch === '\n') {
                flush();
                chip('¶', newlineColor, 'Line feed (U+000A)', `nl${key++}`);
                nodes.push(<br key={`br${key++}`} />);
                return;
            }
            if (ch === '\r') {
                flush();
                chip('CR', controlColor, 'Carriage return (U+000D)', `cr${key++}`);
                return;
            }
            const named = NAMED_CHARS[code];
            if (named) {
                flush();
                chip(named.short, namedColor, `${named.name} (${hex(code)})`, `nm${key++}`);
                return;
            }
            if (isControlCode(code)) {
                flush();
                chip(hex(code), controlColor, `Control character (${hex(code)})`, `ct${key++}`);
                return;
            }
            buffer += ch;
        });
        flush();
        return nodes;
    }, [text, spaceColor, tabColor, newlineColor, namedColor, controlColor]);

    const handleCopyClean = () => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(cleanedText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {
            // Clipboard write can fail silently (permissions, focus) — the
            // button just stays unconfirmed so the user can try again.
        });
    };

    return (
        <ServicePageShell
            icon={SpaceBar}
            title="Whitespace & Invisible Character Visualizer"
            subtitle="See every space, tab, line break and hidden Unicode character actually inside your text"
            maxWidth="lg"
            toolId={78}
            seoTitle="Whitespace & Invisible Character Visualizer | Find Hidden Unicode Characters"
            seoDescription="Paste text to reveal every space, tab, line break and invisible or unusual Unicode character it contains, including non-breaking spaces and zero-width characters. Copy a cleaned version. Runs entirely in your browser."
            keywords={['whitespace visualizer', 'invisible character checker', 'non-breaking space detector', 'zero width space finder', 'hidden unicode character checker', 'whitespace debugger', 'nbsp detector online']}
            about={'Text that looks completely normal can still fail an exact match, break CSS whitespace handling, or trip up a script, usually because it contains a character that looks like a space but is not one. This happens often with text copied from Word, Google Docs, PDFs or certain websites, which frequently insert a non-breaking space, a zero-width space or another Unicode character in places you would never notice by eye. This tool takes whatever you paste and re-renders it with every space, tab, line break and unusual character marked, so you can actually see what is there: a dot for a normal space, an arrow for a tab, a pilcrow for a line break, and a labeled chip for anything less common, such as a non-breaking space or a zero-width joiner. A summary panel lists exactly what was found and how many of each. Everything runs locally in your browser.'}
            howToSteps={[
                { name: 'Paste the text', text: 'Drop in whatever string is behaving strangely, copied from a document, a webpage, an API response, or anywhere else. Analysis runs automatically as you type or paste.' },
                { name: 'Read the visualized version', text: 'Every space, tab and line break gets a visible marker. Anything unusual, like a non-breaking space, a zero-width character or a control character, gets its own labeled chip so it stands out.' },
                { name: 'Check the summary, then clean if needed', text: 'The summary lists exactly what was found and how many. If you want a fixed version, click "Copy cleaned text" to copy a version with the odd characters normalized or removed.' },
            ]}
            faq={[
                { question: 'Why does my text look identical but not match in code?', answer: 'Usually because it contains a character that renders the same as a regular space but has a different code point. The most common culprit is a non-breaking space (U+00A0), which browsers, word processors and some websites insert automatically. String comparisons, CSS whitespace collapsing and exact-match validation all treat it differently from a normal space (U+0020), even though your eyes cannot tell them apart.' },
                { question: 'Where do these characters usually come from?', answer: 'Pasting from Word or Google Docs is the most common source. Both use non-breaking spaces, and sometimes zero-width characters, for formatting. PDFs, some CMS editors and certain websites do similar things, so even copying a single sentence from a formatted document can carry one of these along with no visual sign of it.' },
                { question: 'Does "Copy cleaned text" change the text I pasted?', answer: 'No, it leaves the input box untouched. It builds a separate cleaned copy: zero-width characters are removed, unusual spaces are converted to regular ones, and line endings are normalized. That copy is placed on your clipboard so you can compare it with the original.' },
                { question: 'Is anything I paste sent anywhere?', answer: 'No. Both the analysis and the cleanup run in JavaScript inside your browser. Nothing you type or paste leaves your machine.' },
            ]}
        >
            <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Paste your text</Typography>
                            <TextField
                                multiline
                                minRows={10}
                                fullWidth
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Paste text here…"
                                sx={{ mb: 1.5 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                Analysis updates as you type or paste. Nothing is sent anywhere, it all runs in your browser.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>What&apos;s actually there</Typography>

                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 1.5, rowGap: 0.5 }}>
                                <LegendItem symbol="·" label="space" color={spaceColor} />
                                <LegendItem symbol="→" label="tab" color={tabColor} />
                                <LegendItem symbol="¶" label="line break" color={newlineColor} />
                                <LegendItem symbol="NBSP" label="named/invisible character" color={namedColor} />
                                <LegendItem symbol="U+xx" label="control character" color={controlColor} />
                            </Stack>

                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 180,
                                    maxHeight: 340,
                                    overflow: 'auto',
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(primary, 0.03),
                                    border: `1px solid ${alpha(primary, 0.15)}`,
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                                    fontSize: '0.85rem',
                                    lineHeight: 2,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {text ? visualized : (
                                    <Typography variant="body2" color="text.disabled">
                                        Paste some text to see it visualized.
                                    </Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                justifyContent="space-between"
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                spacing={2}
                                sx={{ mb: 2 }}
                            >
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800}>Summary</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {stats.totalChars.toLocaleString()} characters total · {stats.printableChars.toLocaleString()} visible/printable
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    startIcon={copied ? <Check /> : <ContentCopy />}
                                    onClick={handleCopyClean}
                                    disabled={!text}
                                >
                                    {copied ? 'Copied' : 'Copy cleaned text'}
                                </Button>
                            </Stack>

                            {stats.breakdown.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    No unusual whitespace or invisible characters found, just plain spaces and line breaks (if any).
                                </Typography>
                            ) : (
                                <Stack spacing={0.75}>
                                    {stats.breakdown.map(b => (
                                        <Stack
                                            key={b.key}
                                            direction="row"
                                            justifyContent="space-between"
                                            sx={{ py: 0.5, px: 1.5, borderRadius: 1, bgcolor: alpha(namedColor, 0.08) }}
                                        >
                                            <Typography variant="body2">{b.label}</Typography>
                                            <Typography variant="body2" fontWeight={700}>{b.count}×</Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            )}

                            <Divider sx={{ my: 2 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                "Copy cleaned text" is a separate, opt-in action. It does not change the text above. It copies a cleaned
                                version to your clipboard instead, with zero-width characters removed, exotic spaces turned into regular
                                ones, and line endings normalized.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default WhitespaceVisualizer;
