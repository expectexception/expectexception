import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, Chip, FormControl, FormControlLabel, InputLabel,
    MenuItem, Select, Snackbar, Stack, Switch, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import { Toc, ContentCopy } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

interface Heading {
    level: number;
    /** Heading text with links flattened, used as the TOC link label. */
    label: string;
    /** Fully de-formatted text the anchor was derived from. */
    plain: string;
    slug: string;
    /** 1-based source line, shown in the preview. */
    line: number;
    /** True when the heading was written in the underlined Setext style. */
    setext: boolean;
}

interface TocRow {
    heading: Heading;
    depth: number;
    marker: string;
}

// ── Inline formatting ─────────────────────────────────────────────────

/** Reduces links and images to their visible text. Run on the TOC label too,
 * because a link nested inside a link is not valid Markdown. */
function flattenLinks(text: string): string {
    return text
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1');
}

/** Strips the inline formatting that never survives into a rendered anchor:
 * emphasis, code spans, strikethrough, raw HTML and backslash escapes. The
 * underscore rules only fire at word boundaries so a heading like
 * `snake_case_name` keeps its underscores, matching how GitHub renders it. */
function stripInlineMarkdown(text: string): string {
    let s = flattenLinks(text);
    s = s.replace(/`+([^`]*)`+/g, '$1');
    s = s.replace(/~~([^~]+)~~/g, '$1');
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
    s = s.replace(/\*([^*]+)\*/g, '$1');
    s = s.replace(/(^|[^A-Za-z0-9_])__([^_]+)__(?![A-Za-z0-9])/g, '$1$2');
    s = s.replace(/(^|[^A-Za-z0-9_])_([^_]+)_(?![A-Za-z0-9])/g, '$1$2');
    s = s.replace(/<[^>]*>/g, '');
    s = s.replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1');
    return s.trim();
}

/** Everything GitHub drops from an anchor: control characters, ASCII
 * punctuation apart from hyphen and underscore, the Latin-1 symbol block and
 * general punctuation such as curly quotes and dashes. Written as explicit
 * code-point ranges because Unicode property escapes need an ES2018 target. */
const SLUG_STRIP = new RegExp(
    '[\\u0000-\\u001F\\u0021-\\u002C\\u002E-\\u002F\\u003A-\\u0040'
    + '\\u005B-\\u005E\\u0060\\u007B-\\u007F\\u00A0-\\u00A9\\u00AB-\\u00B4'
    + '\\u00B6-\\u00B9\\u00BB-\\u00BF\\u00D7\\u00F7\\u2000-\\u206F]',
    'g',
);

function slugify(headingText: string): string {
    return stripInlineMarkdown(headingText)
        .replace(/\t/g, ' ')
        .toLowerCase()
        .replace(SLUG_STRIP, '')
        .replace(/ /g, '-');
}

/** GitHub's duplicate handling: the first `Overview` gets `overview`, the next
 * `overview-1`, then `overview-2`. The loop also covers the awkward case where
 * a later heading is literally called "Overview 1" and would otherwise collide
 * with a generated suffix. */
function makeSlugger(): (text: string) => string {
    const seen: Record<string, number> = {};
    return (text: string): string => {
        const original = slugify(text);
        let result = original;
        while (Object.prototype.hasOwnProperty.call(seen, result)) {
            seen[original] += 1;
            result = `${original}-${seen[original]}`;
        }
        seen[result] = 0;
        return result;
    };
}

// ── Scanning ──────────────────────────────────────────────────────────

const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const SETEXT_H1 = /^ {0,3}=+[ \t]*$/;
const SETEXT_H2 = /^ {0,3}-+[ \t]*$/;

/** A line that could be the text half of a Setext heading. List items, block
 * quotes, table rows, HTML and indented code are all excluded so that an
 * ordinary `---` thematic break underneath one of them is not mistaken for a
 * heading underline. */
function canBeSetextText(line: string): boolean {
    if (line.trim() === '') return false;
    if (/^ {4,}/.test(line)) return false;
    if (/^ {0,3}[-*+][ \t]/.test(line)) return false;
    if (/^ {0,3}\d+[.)][ \t]/.test(line)) return false;
    if (/^ {0,3}>/.test(line)) return false;
    if (/^ {0,3}</.test(line)) return false;
    if (line.indexOf('|') !== -1) return false;
    if (/^ {0,3}(?:\*{3,}|_{3,}|-{3,})[ \t]*$/.test(line)) return false;
    return true;
}

/** Walks the document line by line, tracking fenced code state so that a
 * `# comment` inside a bash block never reaches the TOC. Handles ATX headings,
 * Setext headings and YAML front matter. */
function extractHeadings(markdown: string): Heading[] {
    const lines = markdown.split(/\r?\n/);
    const found: Array<{ level: number; text: string; line: number; setext: boolean }> = [];
    let start = 0;

    // YAML front matter, but only when it is properly closed.
    if (lines.length > 1 && /^---[ \t]*$/.test(lines[0])) {
        let j = 1;
        while (j < lines.length && !/^(?:---|\.\.\.)[ \t]*$/.test(lines[j])) j += 1;
        if (j < lines.length) start = j + 1;
    }

    let fenceChar = '';
    let fenceLen = 0;
    let previous = '';

    for (let i = start; i < lines.length; i += 1) {
        const line = lines[i];

        if (fenceChar !== '') {
            const close = FENCE_CLOSE.exec(line);
            if (close && close[1].charAt(0) === fenceChar && close[1].length >= fenceLen) {
                fenceChar = '';
                fenceLen = 0;
            }
            previous = '';
            continue;
        }

        const open = FENCE_OPEN.exec(line);
        if (open) {
            // A backtick fence's info string may not itself contain a backtick.
            const isBacktick = open[1].charAt(0) === '`';
            if (!isBacktick || open[2].indexOf('`') === -1) {
                fenceChar = open[1].charAt(0);
                fenceLen = open[1].length;
                previous = '';
                continue;
            }
        }

        const atx = ATX.exec(line);
        if (atx) {
            const text = (atx[2] || '')
                .replace(/[ \t]+#+[ \t]*$/, '')
                .replace(/^#+$/, '')
                .trim();
            if (text !== '') found.push({ level: atx[1].length, text, line: i + 1, setext: false });
            previous = '';
            continue;
        }

        if (previous !== '') {
            if (SETEXT_H1.test(line)) {
                found.push({ level: 1, text: previous.trim(), line: i, setext: true });
                previous = '';
                continue;
            }
            if (SETEXT_H2.test(line)) {
                found.push({ level: 2, text: previous.trim(), line: i, setext: true });
                previous = '';
                continue;
            }
        }

        previous = canBeSetextText(line) ? line : '';
    }

    const slugger = makeSlugger();
    return found.map((h) => ({
        level: h.level,
        label: flattenLinks(h.text).trim(),
        plain: stripInlineMarkdown(h.text),
        slug: slugger(h.text),
        line: h.line,
        setext: h.setext,
    }));
}

// ── TOC building ──────────────────────────────────────────────────────

interface TocOptions {
    minLevel: number;
    maxLevel: number;
    ordered: boolean;
    indentSize: number;
}

/** Depth comes from a stack of open heading levels, not from `level - min`, so
 * a document that jumps straight from an h2 to an h4 indents by one step
 * instead of leaving a hole. */
function buildToc(headings: Heading[], options: TocOptions): TocRow[] {
    const included = headings.filter((h) => h.level >= options.minLevel && h.level <= options.maxLevel);
    const stack: number[] = [];
    const counters: number[] = [];
    const rows: TocRow[] = [];

    included.forEach((heading) => {
        while (stack.length > 0 && stack[stack.length - 1] >= heading.level) {
            stack.pop();
            counters.pop();
        }
        const depth = stack.length;
        stack.push(heading.level);
        counters.push(0);
        counters[depth] += 1;

        const marker = options.ordered ? `${counters[depth]}.` : '-';
        rows.push({ heading, depth, marker });
    });

    return rows;
}

function renderToc(rows: TocRow[], indentSize: number): string {
    return rows
        .map((row) => {
            const pad = new Array(row.depth * indentSize + 1).join(' ');
            const label = row.heading.label.replace(/([[\]])/g, '\\$1');
            return `${pad}${row.marker} [${label}](#${row.heading.slug})`;
        })
        .join('\n');
}

const SAMPLE = [
    '---',
    'title: Project README',
    'description: front matter is skipped',
    '---',
    '',
    '# Project Setup',
    '',
    'A short introduction.',
    '',
    '## Overview',
    '',
    'What this project does.',
    '',
    '## Installation',
    '',
    'Run the installer:',
    '',
    '```bash',
    '# Install the CLI globally, this is a shell comment',
    'npm install -g example-cli',
    '## Neither of these lines is a heading',
    '```',
    '',
    '### Requirements & Notes',
    '',
    '## Overview',
    '',
    'A second section that reuses an earlier name.',
    '',
    'Deprecated Behaviour',
    '--------------------',
    '',
    '### Config `values` and **flags**',
    '',
    'See [the docs](https://example.com/docs) for the full list.',
].join('\n');

const LEVELS = [1, 2, 3, 4, 5, 6];

const MarkdownTocGenerator: React.FC = () => {
    const theme = useTheme();
    const [input, setInput] = useState(SAMPLE);
    const [minLevel, setMinLevel] = useState(1);
    const [maxLevel, setMaxLevel] = useState(6);
    const [ordered, setOrdered] = useState(false);
    const [indentSize, setIndentSize] = useState(2);
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const headings = useMemo(() => extractHeadings(input), [input]);
    const rows = useMemo(
        () => buildToc(headings, { minLevel, maxLevel, ordered, indentSize }),
        [headings, minLevel, maxLevel, ordered, indentSize],
    );
    const output = useMemo(() => renderToc(rows, indentSize), [rows, indentSize]);

    const copyOutput = useCallback(() => {
        navigator.clipboard.writeText(output).then(
            () => setSnackbar('Table of contents copied to clipboard'),
            () => setSnackbar('Could not copy to clipboard'),
        );
    }, [output]);

    const about = "Paste a Markdown document here and get back a nested list of anchor links you can drop straight into the top of the file. The scanner tracks fenced code blocks as it walks the document, so a shell comment starting with a hash inside a bash block never turns into a phantom heading, which is the mistake that makes most quick regex approaches produce a broken contents list. Anchors follow GitHub's slug rules, including the numeric suffixes GitHub adds when two headings share a name. Both ATX headings and the underlined Setext style are recognised, and YAML front matter at the top of the file is skipped.";

    const howToSteps = [
        { name: 'Paste your Markdown', text: 'Drop in the whole file. Headings are picked up as you type, front matter and fenced code blocks included in the analysis and then excluded from the result.' },
        { name: 'Pick the heading range', text: 'Set the minimum and maximum levels. Starting at level 2 is common, since the level 1 heading is usually the document title and does not belong in its own contents list.' },
        { name: 'Choose the list style', text: 'Switch between a bulleted and a numbered list, and set the indent to two or four spaces to match the rest of your file.' },
        { name: 'Copy it into the document', text: 'Copy the generated block and paste it below your title. The preview underneath shows the nesting and the exact anchor each entry points at.' },
    ];

    const faq = [
        {
            question: 'Why are headings inside code blocks left out?',
            answer: 'Because they are not headings. A line like # Install the CLI inside a bash block is a shell comment, and a line of hashes inside a Python block is a comment too. Markdown renderers never turn those into heading elements, so no anchor exists for them and a TOC entry pointing at one would be a dead link. This tool tracks the opening and closing of every backtick and tilde fence while scanning, and skips whatever is inside.',
        },
        {
            question: 'How is the anchor slug worked out?',
            answer: "The heading text has its inline formatting removed first, so bold markers, code span backticks and link syntax all drop away and only the visible words are left. That text is lowercased, punctuation other than hyphens and underscores is deleted, and remaining spaces become hyphens. Those are GitHub's rules, so the links work on GitHub, in a pull request description and in a GitHub wiki. Other renderers differ: some strip accents, some prefix anchors with user-content-, and some keep a numbered id instead. A contents list generated here may need adjusting if the file is published through a different pipeline.",
        },
        {
            question: 'Two of my headings have the same name. What happens?',
            answer: 'The first one keeps the plain slug and each later one gets a numeric suffix, so three sections called Overview become #overview, #overview-1 and #overview-2. That is what GitHub does, and it is why the second link in a generated list sometimes looks wrong when it is in fact correct.',
        },
        {
            question: 'Are underlined headings supported?',
            answer: 'Yes. A line of text with equals signs beneath it is a level 1 heading and one with hyphens beneath it is a level 2 heading. The scanner only treats an underline as a heading when the line above it is a plain paragraph, so a row of hyphens after a list item or a table stays a thematic break.',
        },
        {
            question: 'Does it handle emoji and non-English headings?',
            answer: 'Letters outside the Latin alphabet are kept as they are, matching GitHub. Emoji and other symbols are dropped from the anchor, which can leave a heading made entirely of emoji with an empty slug.',
        },
    ];

    const total = headings.length;
    const hasInput = input.trim() !== '';

    return (
        <ServicePageShell
            icon={Toc}
            title="Markdown Table of Contents Generator"
            subtitle="Turn Markdown headings into a nested list of GitHub-style anchor links."
            maxWidth="md"
            toolId={106}
            seoTitle="Markdown Table of Contents Generator - Free Online Tool"
            seoDescription="Generate a nested Markdown table of contents with GitHub-style anchor slugs. Skips headings inside fenced code blocks, supports Setext headings, and handles duplicate heading names the way GitHub does."
            keywords={['markdown table of contents generator', 'markdown toc generator', 'github anchor links', 'markdown heading slug', 'readme table of contents', 'generate toc from markdown']}
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
                <TextField
                    label="Markdown"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    fullWidth
                    multiline
                    minRows={8}
                    maxRows={14}
                    placeholder="Paste your Markdown document here."
                    InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                    sx={{ mb: 2 }}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <FormControl size="small" sx={{ flex: 1, width: '100%' }}>
                        <InputLabel id="toc-min-level">Minimum level</InputLabel>
                        <Select
                            labelId="toc-min-level"
                            label="Minimum level"
                            value={minLevel}
                            onChange={(e) => {
                                const next = Number(e.target.value);
                                setMinLevel(next);
                                if (next > maxLevel) setMaxLevel(next);
                            }}
                        >
                            {LEVELS.map((l) => <MenuItem key={l} value={l}>{`H${l}`}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ flex: 1, width: '100%' }}>
                        <InputLabel id="toc-max-level">Maximum level</InputLabel>
                        <Select
                            labelId="toc-max-level"
                            label="Maximum level"
                            value={maxLevel}
                            onChange={(e) => {
                                const next = Number(e.target.value);
                                setMaxLevel(next);
                                if (next < minLevel) setMinLevel(next);
                            }}
                        >
                            {LEVELS.map((l) => <MenuItem key={l} value={l}>{`H${l}`}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ flex: 1, width: '100%' }}>
                        <InputLabel id="toc-indent">Indent</InputLabel>
                        <Select
                            labelId="toc-indent"
                            label="Indent"
                            value={indentSize}
                            onChange={(e) => setIndentSize(Number(e.target.value))}
                        >
                            <MenuItem value={2}>2 spaces</MenuItem>
                            <MenuItem value={3}>3 spaces</MenuItem>
                            <MenuItem value={4}>4 spaces</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControlLabel
                        control={<Switch checked={ordered} onChange={(e) => setOrdered(e.target.checked)} />}
                        label="Numbered"
                        sx={{ flexShrink: 0, mr: 0 }}
                    />
                </Stack>

                {hasInput && total === 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        No headings were found. Headings start with one to six hash characters at the
                        beginning of a line, or are written as a line of text underlined with equals
                        signs or hyphens. Anything inside a fenced code block is skipped on purpose.
                    </Alert>
                )}

                {rows.length > 0 && (
                    <>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {total} heading{total === 1 ? '' : 's'} found, {rows.length} in the list
                            </Typography>
                            <Button size="small" startIcon={<ContentCopy />} onClick={copyOutput}>Copy</Button>
                        </Stack>

                        <TextField
                            value={output}
                            fullWidth
                            multiline
                            minRows={5}
                            maxRows={12}
                            InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                            sx={{ mb: 2.5 }}
                        />

                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Structure and anchors
                        </Typography>
                        <Box sx={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            p: 1.5,
                            maxHeight: 260,
                            overflowY: 'auto',
                        }}>
                            {rows.map((row) => (
                                <Stack
                                    key={`${row.heading.slug}-${row.heading.line}`}
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{ pl: row.depth * 2, py: 0.35, minWidth: 0 }}
                                >
                                    <Chip
                                        size="small"
                                        label={`H${row.heading.level}`}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                                            color: 'primary.main',
                                        }}
                                    />
                                    <Typography variant="body2" noWrap sx={{ flexShrink: 1, minWidth: 0 }}>
                                        {row.heading.plain}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        noWrap
                                        sx={{ fontFamily: 'monospace', minWidth: 0 }}
                                    >
                                        #{row.heading.slug}
                                    </Typography>
                                    {row.heading.setext && (
                                        <Chip size="small" variant="outlined" label="setext" sx={{ height: 20, fontSize: '0.62rem' }} />
                                    )}
                                </Stack>
                            ))}
                        </Box>
                    </>
                )}

                {total > 0 && rows.length === 0 && (
                    <Alert severity="warning">
                        {total} heading{total === 1 ? ' was' : 's were'} found, but none of them fall between
                        H{minLevel} and H{maxLevel}. Widen the level range to include them.
                    </Alert>
                )}
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default MarkdownTocGenerator;
