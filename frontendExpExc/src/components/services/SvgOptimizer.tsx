import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Grid, Paper, Stack, Divider,
    Alert, Button, Checkbox, FormControlLabel, useTheme, alpha,
} from '@mui/material';
import { Compress, Upload, ContentCopy, Check, SelectAll } from '@mui/icons-material';
import DOMPurify from 'dompurify';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * A deliberately simple, transparent SVG "optimizer" — a handful of
 * independent, honest string/regex passes, not a real XML parser and
 * nowhere near a full SVGO port. Each pass is small enough that a user
 * can read this file and know exactly what happened to their markup,
 * which is the entire point of the tool (see the FAQ below).
 * ------------------------------------------------------------------ */

/** Matches a whole <text>...</text> block, but not <textPath ...> — the
 * lookahead after "text" requires whitespace, "/" or ">" so it can't match
 * the start of a longer tag name. Nested <tspan> elements are always
 * inside a <text> element per the SVG spec, so protecting this outer block
 * protects them too without needing a separate rule. */
const TEXT_BLOCK_RE = /(<text(?=[\s/>])[\s\S]*?<\/text>)/gi;

function stripComments(svg: string): string {
    return svg.replace(/<!--[\s\S]*?-->/g, '');
}

function stripXmlDeclaration(svg: string): string {
    return svg.replace(/<\?xml[\s\S]*?\?>\s*/i, '');
}

function stripDoctype(svg: string): string {
    return svg.replace(/<!DOCTYPE[^>]*>\s*/i, '');
}

const EDITOR_NAMESPACES = ['inkscape', 'sodipodi'];

/** Removes Inkscape/Sodipodi editor elements, their attributes, and the
 * xmlns declarations that introduce those two prefixes — all cruft that
 * design tools leave behind but browsers never render. Also drops
 * xmlns:xlink when nothing in the document actually has an
 * xlink:-prefixed attribute left to justify keeping the declaration. */
function stripEditorCruft(svg: string): string {
    let result = svg;

    for (const ns of EDITOR_NAMESPACES) {
        // Self-closing editor elements, e.g. <sodipodi:namedview ... />
        result = result.replace(new RegExp(`<${ns}:[\\w-]+(?:\\s[^>]*)?/>`, 'gi'), '');
        // Paired editor elements, e.g. <inkscape:clipboard>...</inkscape:clipboard>
        result = result.replace(new RegExp(`<(${ns}:[\\w-]+)(?:\\s[^>]*)?>[\\s\\S]*?<\\/\\1>`, 'gi'), '');
        // Attributes carrying the namespace prefix, e.g. inkscape:label="Layer 1"
        result = result.replace(new RegExp(`\\s${ns}:[\\w-]+=("[^"]*"|'[^']*')`, 'gi'), '');
        // The namespace declaration itself, e.g. xmlns:inkscape="..."
        result = result.replace(new RegExp(`\\sxmlns:${ns}=("[^"]*"|'[^']*')`, 'gi'), '');
    }

    const usesXlink = /\bxlink:[\w-]+\s*=/.test(result);
    if (!usesXlink) {
        result = result.replace(/\sxmlns:xlink=("[^"]*"|'[^']*')/gi, '');
    }

    return result;
}

const EMPTY_CONTAINER_TAGS = ['defs', 'metadata', 'title', 'desc'];

function stripEmptyContainersOnce(svg: string): string {
    let result = svg;
    for (const tag of EMPTY_CONTAINER_TAGS) {
        result = result.replace(new RegExp(`<${tag}(?:\\s[^>]*)?/>`, 'gi'), '');
        result = result.replace(new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*<\\/${tag}>`, 'gi'), '');
    }
    return result;
}

/** Runs the empty-container pass to a fixed point: removing an empty
 * <title>/<desc> can leave its parent <defs> empty too, so one pass isn't
 * always enough. Capped so a pathological input can't loop forever. */
function stripEmptyContainers(svg: string): string {
    let result = svg;
    for (let i = 0; i < 5; i++) {
        const next = stripEmptyContainersOnce(result);
        if (next === result) break;
        result = next;
    }
    return result;
}

/** Attributes worth rounding. Deliberately an allowlist of geometry /
 * numeric presentation attributes rather than "every attribute" — an id,
 * class or href can legitimately contain digits (e.g. id="path123") and
 * has no business being touched by numeric rounding. */
const NUMERIC_ATTRS = new Set([
    'd', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
    'width', 'height', 'viewBox', 'transform', 'offset', 'stroke-width',
    'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'fill-opacity', 'stroke-opacity',
    'font-size',
]);

const NUMBER_TOKEN_RE = /-?\d*\.\d+(?:e[-+]?\d+)?|-?\d+(?:e[-+]?\d+)?/gi;

function roundNumberToken(token: string, precision: number): string {
    const value = parseFloat(token);
    if (!isFinite(value)) return token;
    let str = (value === 0 ? 0 : value).toFixed(precision);
    if (str.includes('.')) {
        str = str.replace(/0+$/, '').replace(/\.$/, '');
    }
    return str;
}

/** Rounds every numeric token inside the value of a known numeric
 * attribute (path coordinates, radii, transforms, ...) to `precision`
 * decimal places. This is a real per-token regex pass, not a cosmetic
 * reformat — it's usually the single biggest size reduction available
 * without touching the SVG's actual geometry. */
function roundNumbers(svg: string, precision: number): string {
    return svg.replace(/([\w:-]+)=("[^"]*"|'[^']*')/g, (whole: string, name: string, quoted: string) => {
        if (!NUMERIC_ATTRS.has(name)) return whole;
        const quoteChar = quoted[0];
        const value = quoted.slice(1, -1);
        const rounded = value.replace(NUMBER_TOKEN_RE, (m: string) => roundNumberToken(m, precision));
        return `${name}=${quoteChar}${rounded}${quoteChar}`;
    });
}

/** Strips inter-tag whitespace and collapses redundant whitespace inside
 * attribute values, without ever touching the inside of a <text> element
 * (visually significant content). Splitting on a capturing regex keeps
 * the <text> blocks in the result array at the odd indices, so only the
 * even ("normal") segments get collapsed. */
function collapseWhitespace(svg: string): string {
    const segments = svg.split(TEXT_BLOCK_RE);
    return segments
        .map((segment, i) => (i % 2 === 1 ? segment : segment.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ')))
        .join('')
        .trim();
}

interface OptimizeOptions {
    stripComments: boolean;
    stripXmlDeclaration: boolean;
    stripDoctype: boolean;
    stripEmptyContainers: boolean;
    stripEditorCruft: boolean;
    collapseWhitespace: boolean;
    roundNumbers: boolean;
    precision: number;
}

const DEFAULT_OPTIONS: OptimizeOptions = {
    stripComments: true,
    stripXmlDeclaration: true,
    stripDoctype: true,
    stripEmptyContainers: true,
    stripEditorCruft: true,
    collapseWhitespace: true,
    roundNumbers: true,
    precision: 2,
};

function optimizeSvg(input: string, options: OptimizeOptions): string {
    let result = input;
    if (options.stripComments) result = stripComments(result);
    if (options.stripXmlDeclaration) result = stripXmlDeclaration(result);
    if (options.stripDoctype) result = stripDoctype(result);
    if (options.stripEditorCruft) result = stripEditorCruft(result);
    if (options.stripEmptyContainers) result = stripEmptyContainers(result);
    if (options.roundNumbers) result = roundNumbers(result, options.precision);
    if (options.collapseWhitespace) result = collapseWhitespace(result);
    return result.trim();
}

function byteLength(str: string): number {
    return new TextEncoder().encode(str).length;
}

type ToggleKey = 'stripComments' | 'stripXmlDeclaration' | 'stripDoctype'
    | 'stripEmptyContainers' | 'stripEditorCruft' | 'collapseWhitespace';

const OPTIMIZATION_TOGGLES: { key: ToggleKey; label: string }[] = [
    { key: 'stripComments', label: 'Strip XML comments' },
    { key: 'stripXmlDeclaration', label: 'Remove <?xml ... ?> declaration' },
    { key: 'stripDoctype', label: 'Remove <!DOCTYPE ...> declaration' },
    { key: 'stripEmptyContainers', label: 'Remove empty <defs>/<metadata>/<title>/<desc>' },
    { key: 'stripEditorCruft', label: 'Remove Inkscape/Sodipodi cruft & unused xmlns:xlink' },
    { key: 'collapseWhitespace', label: 'Collapse whitespace (keeps <text>/<tspan> content intact)' },
];

const SvgPreviewBox: React.FC<{ label: string; svg: string }> = ({ label, svg }) => {
    const sanitized = useMemo(
        () => DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } }),
        [svg],
    );
    return (
        <Paper sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                {label.toUpperCase()}
            </Typography>
            <Box
                sx={{
                    height: 170, borderRadius: 1, bgcolor: '#ffffff', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', p: 1,
                    '& svg': { maxWidth: '100%', maxHeight: '100%' },
                }}
                // Sanitized above — the user's own pasted markup could contain a
                // <script> tag or an on* event-handler attribute, and this is
                // rendered straight into the page, so it must never go in
                // unsanitized. Same DOMPurify SVG-profile pattern MarkdownPreview
                // uses for the same class of risk.
                dangerouslySetInnerHTML={{ __html: sanitized }}
            />
        </Paper>
    );
};

const SvgOptimizer: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const outputRef = useRef<HTMLTextAreaElement>(null);

    const [rawInput, setRawInput] = useState('');
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [options, setOptions] = useState<OptimizeOptions>(DEFAULT_OPTIONS);
    const [copied, setCopied] = useState(false);

    const setToggle = useCallback((key: ToggleKey, value: boolean) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleFile = useCallback((file: File) => {
        setError(null);
        if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
            setError('Please choose an .svg file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setRawInput(String(reader.result ?? ''));
            setFileName(file.name);
        };
        reader.onerror = () => setError('Could not read that file.');
        reader.readAsText(file);
    }, []);

    const optimized = useMemo(() => optimizeSvg(rawInput, options), [rawInput, options]);

    const originalBytes = useMemo(() => byteLength(rawInput), [rawInput]);
    const optimizedBytes = useMemo(() => byteLength(optimized), [optimized]);
    const reductionPct = originalBytes > 0 ? ((originalBytes - optimizedBytes) / originalBytes) * 100 : 0;

    const copyOutput = () => {
        navigator.clipboard.writeText(optimized).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    const selectOutput = () => {
        outputRef.current?.focus();
        outputRef.current?.select();
    };

    const hasInput = rawInput.trim().length > 0;

    return (
        <ServicePageShell
            icon={Compress}
            title="SVG Optimizer"
            subtitle="Clean and minify raw SVG markup with transparent, honest passes — entirely in your browser"
            maxWidth="lg"
            toolId={74}
            seoTitle="SVG Optimizer | Clean & Minify SVG Markup Online"
            seoDescription="Paste or upload SVG markup and strip comments, editor cruft and excess precision to shrink the file size. A transparent, regex-based optimizer that runs entirely in your browser — see exactly which passes ran."
            keywords={['svg optimizer', 'svg minifier', 'clean svg online', 'reduce svg file size', 'remove inkscape metadata svg', 'svg compressor', 'minify svg markup']}
            about="This tool shrinks SVG markup with a small set of independent, regex-based passes rather than a full XML parser: stripping comments, the XML declaration and DOCTYPE, empty <defs>/<metadata>/<title>/<desc> left behind by design tools, Inkscape/Sodipodi editor attributes and elements, an unused xmlns:xlink declaration, redundant whitespace outside of <text>/<tspan> content, and excess decimal precision on coordinate and geometry attributes. Every pass can be switched off individually, and the checklist below always reflects exactly what ran on the markup you pasted. Because it works on the source text rather than actually parsing the SVG's geometry, it won't merge paths, remove a <defs> entry that is defined but never referenced, or do anything that requires understanding what the shapes mean — see the FAQ for the full list of what it deliberately doesn't attempt. Both the original and optimized markup are sanitized before being rendered as a live preview, since pasted SVG can contain a <script> tag or an event-handler attribute just like any other HTML."
            howToSteps={[
                { name: 'Paste or upload', text: 'Paste SVG markup into the text box, or drop an .svg file onto the upload area.' },
                { name: 'Choose which passes run', text: 'Every optimization is an individual checkbox — untick anything you want left alone, and set the rounding precision for coordinates.' },
                { name: 'Compare and copy', text: 'Check the before/after size and rendered preview, then copy the optimized markup or select it all from the output box.' },
            ]}
            faq={[
                { question: 'Is this a full SVGO replacement?', answer: 'No — it is intentionally a lightweight, transparent optimizer built from a handful of safe regex and string passes that are all enumerated in the checklist. A real optimizer like SVGO parses the SVG as a DOM and can merge paths, remove definitions that are provably unreferenced, collapse groups and understand the actual geometry. This tool never parses the SVG at all, so it cannot safely do any of that — it only edits text patterns that are safe regardless of what the shapes mean.' },
                { question: 'Can this break my SVG?', answer: 'The passes are deliberately conservative: whitespace inside <text>/<tspan> elements is never touched (since it can be visually significant), and only numbers inside a fixed allowlist of geometry attributes are rounded — not ids, classes or hrefs. Rounding coordinates to very few decimal places can visibly distort very small or very precise artwork, so if a shape looks off after optimizing, raise the precision or untick "round numbers".' },
                { question: 'Why round coordinate numbers?', answer: 'Design tools routinely export coordinates with far more decimal places than any screen can render a difference for (e.g. 12.847213658). Rounding to 1–2 decimal places is usually the single largest size reduction available and is invisible at normal display sizes.' },
                { question: 'Is my SVG uploaded anywhere?', answer: 'No. Reading, optimizing and rendering the preview all happen in your browser with plain JavaScript string processing — nothing you paste or upload is sent to a server.' },
                { question: 'Why is the preview sanitized if it is my own file?', answer: 'SVG can carry a <script> tag or an event-handler attribute like onload, exactly like HTML can. This page renders the SVG markup directly into the DOM so you can see it, so both the original and optimized versions are run through DOMPurify first — the same safeguard this site uses anywhere else it renders user-supplied markup.' },
            ]}
        >
            <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>SVG source</Typography>
                            {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".svg,image/svg+xml"
                                hidden
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                            />
                            <Paper
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                                sx={{
                                    p: 2, textAlign: 'center', cursor: 'pointer', borderRadius: 2, mb: 2,
                                    border: `1px dashed ${alpha(primary, 0.4)}`,
                                    bgcolor: alpha(primary, 0.03),
                                    '&:hover': { bgcolor: alpha(primary, 0.07) },
                                }}
                            >
                                <Upload sx={{ fontSize: 26, color: primary, mb: 0.5 }} />
                                <Typography variant="body2" fontWeight={700}>
                                    {fileName || 'Drop an .svg file here, or click to choose'}
                                </Typography>
                            </Paper>

                            <TextField
                                fullWidth
                                multiline
                                rows={8}
                                placeholder="...or paste raw SVG markup here"
                                value={rawInput}
                                onChange={e => { setRawInput(e.target.value); setFileName(''); }}
                                sx={{ mb: 2, '& textarea': { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                            />

                            <Divider sx={{ mb: 1.5 }} />
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                                Optimizations applied
                            </Typography>
                            <Stack spacing={0}>
                                {OPTIMIZATION_TOGGLES.map(t => (
                                    <FormControlLabel
                                        key={t.key}
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={options[t.key]}
                                                onChange={e => setToggle(t.key, e.target.checked)}
                                            />
                                        }
                                        label={<Typography variant="body2">{t.label}</Typography>}
                                    />
                                ))}
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 1, pt: 0.5 }}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={options.roundNumbers}
                                                onChange={e => setOptions(prev => ({ ...prev, roundNumbers: e.target.checked }))}
                                            />
                                        }
                                        label={<Typography variant="body2">Round numbers to</Typography>}
                                        sx={{ mr: 0.5 }}
                                    />
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={options.precision}
                                        disabled={!options.roundNumbers}
                                        onChange={e => setOptions(prev => ({
                                            ...prev,
                                            precision: Math.min(4, Math.max(0, Math.round(Number(e.target.value) || 0))),
                                        }))}
                                        inputProps={{ min: 0, max: 4, style: { textAlign: 'center' } }}
                                        sx={{ width: 64 }}
                                    />
                                    <Typography variant="body2" color="text.secondary">decimal places</Typography>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            {!hasInput ? (
                                <Typography variant="body2" color="text.disabled">
                                    Paste or upload an SVG on the left to see the optimized result.
                                </Typography>
                            ) : (
                                <>
                                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                                        <Grid item xs={4}>
                                            <Paper sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>ORIGINAL</Typography>
                                                <Typography variant="h6" fontWeight={800}>{originalBytes.toLocaleString()} B</Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Paper sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>OPTIMIZED</Typography>
                                                <Typography variant="h6" fontWeight={800} sx={{ color: primary }}>{optimizedBytes.toLocaleString()} B</Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Paper sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>REDUCTION</Typography>
                                                <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.success.main }}>
                                                    {reductionPct.toFixed(1)}%
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>

                                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                                        <Grid item xs={6}>
                                            <SvgPreviewBox label="Original" svg={rawInput} />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <SvgPreviewBox label="Optimized" svg={optimized} />
                                        </Grid>
                                    </Grid>

                                    <Divider sx={{ mb: 1.5 }} />
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={800}>Optimized markup</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button size="small" startIcon={<SelectAll fontSize="small" />} onClick={selectOutput}>
                                                Select all
                                            </Button>
                                            <Button
                                                size="small"
                                                startIcon={copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                                                onClick={copyOutput}
                                            >
                                                {copied ? 'Copied' : 'Copy'}
                                            </Button>
                                        </Stack>
                                    </Stack>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={8}
                                        value={optimized}
                                        inputRef={outputRef}
                                        InputProps={{ readOnly: true }}
                                        sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default SvgOptimizer;
