import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, FormControl, IconButton, InputLabel, MenuItem,
    Select, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { SettingsEthernet, ContentCopy, SwapHoriz } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type Format = 'env' | 'json' | 'yaml';

const FORMAT_LABELS: Record<Format, string> = {
    env: '.env',
    json: 'JSON',
    yaml: 'YAML',
};

interface EnvEntry {
    key: string;
    value: string;
}

/** The shape every format is parsed into and emitted from. `.env` always
 * produces a flat map of strings; JSON and YAML may nest. */
interface DataMap {
    [key: string]: DataValue;
}
type DataValue = string | number | boolean | null | DataValue[] | DataMap;

interface ParseOutcome {
    data: DataMap;
    /** Non-fatal complaints (a suspicious line, a trailing fragment). The
     * parse still produced usable data. */
    issues: string[];
    /** Set when nothing usable came out at all. */
    fatal: string | null;
}

// ── .env parsing ──────────────────────────────────────────────────────

/** Escape sequences that a DOUBLE-quoted dotenv value expands. Single-quoted
 * values expand nothing, which is the whole point of the two quote styles. */
const DOUBLE_QUOTE_ESCAPES: Record<string, string> = {
    n: '\n',
    r: '\r',
    t: '\t',
    b: '\b',
    f: '\f',
    v: '\v',
    '0': '\0',
    '\\': '\\',
    '"': '"',
    "'": "'",
};

interface QuotedScan {
    value: string;
    endLine: number;
    endCol: number;
}

/** Reads a quoted value starting at `startCol` on `lines[startLine]`, which
 * must hold the opening quote. Real .env files sometimes wrap a quoted value
 * across several physical lines (a PEM key is the usual culprit), so running
 * off the end of a line inside the quotes continues onto the next one with a
 * real newline in between. Returns null when the closing quote never turns up.
 */
function scanQuotedValue(
    lines: string[],
    startLine: number,
    startCol: number,
    quote: string,
): QuotedScan | null {
    let out = '';
    let line = startLine;
    let col = startCol + 1;

    while (line < lines.length) {
        const text = lines[line];
        while (col < text.length) {
            const ch = text.charAt(col);
            if (quote === '"' && ch === '\\') {
                const next = text.charAt(col + 1);
                out += Object.prototype.hasOwnProperty.call(DOUBLE_QUOTE_ESCAPES, next)
                    ? DOUBLE_QUOTE_ESCAPES[next]
                    : next;
                col += 2;
                continue;
            }
            if (ch === quote) return { value: out, endLine: line, endCol: col };
            out += ch;
            col += 1;
        }
        out += '\n';
        line += 1;
        col = 0;
    }
    return null;
}

/** Parses dotenv syntax properly rather than splitting on '='. Comments,
 * `export` prefixes, both quote styles, inline comments after an unquoted
 * value and empty values all behave the way dotenv itself behaves. */
function parseEnv(source: string): ParseOutcome {
    const data: DataMap = {};
    const issues: string[] = [];
    const lines = source.split(/\r?\n/);
    let index = 0;
    let found = 0;

    while (index < lines.length) {
        const lineNo = index + 1;
        const trimmedStart = lines[index].replace(/^[ \t]+/, '');
        const offset = lines[index].length - trimmedStart.length;

        if (trimmedStart === '' || trimmedStart.charAt(0) === '#') {
            index += 1;
            continue;
        }

        let body = trimmedStart;
        let bodyOffset = offset;
        const exportPrefix = /^export[ \t]+/.exec(body);
        if (exportPrefix) {
            body = body.slice(exportPrefix[0].length);
            bodyOffset += exportPrefix[0].length;
        }

        const eq = body.indexOf('=');
        if (eq === -1) {
            issues.push(`Line ${lineNo}: no "=" on this line, so it was skipped.`);
            index += 1;
            continue;
        }

        const key = body.slice(0, eq).trim();
        if (key === '') {
            issues.push(`Line ${lineNo}: the key before "=" is empty, so the line was skipped.`);
            index += 1;
            continue;
        }

        const afterEq = body.slice(eq + 1);
        const leading = afterEq.length - afterEq.replace(/^[ \t]+/, '').length;
        const valueStart = bodyOffset + eq + 1 + leading;
        const firstChar = lines[index].charAt(valueStart);

        if (firstChar === '"' || firstChar === "'") {
            const scanned = scanQuotedValue(lines, index, valueStart, firstChar);
            if (!scanned) {
                const style = firstChar === '"' ? 'double' : 'single';
                issues.push(`Line ${lineNo}: the ${style}-quoted value for ${key} is never closed.`);
                index += 1;
                continue;
            }
            data[key] = scanned.value;
            found += 1;
            const tail = lines[scanned.endLine].slice(scanned.endCol + 1).trim();
            if (tail !== '' && tail.charAt(0) !== '#') {
                issues.push(`Line ${scanned.endLine + 1}: text after the closing quote of ${key} was ignored.`);
            }
            index = scanned.endLine + 1;
            continue;
        }

        // Unquoted: a '#' starts a comment, matching dotenv's own behaviour.
        const bare = afterEq.replace(/^[ \t]+/, '');
        const hash = bare.indexOf('#');
        data[key] = (hash === -1 ? bare : bare.slice(0, hash)).trim();
        found += 1;
        index += 1;
    }

    const fatal = found === 0 && source.trim() !== ''
        ? 'No KEY=value pairs were found in that input.'
        : null;
    return { data, issues, fatal };
}

// ── .env emitting ─────────────────────────────────────────────────────

function envValueNeedsQuotes(value: string): boolean {
    if (value === '') return false;
    if (/^\s|\s$/.test(value)) return true;
    return /[\s#"'\\$`]/.test(value);
}

function emitEnv(entries: EnvEntry[]): string {
    return entries
        .map((entry) => {
            if (!envValueNeedsQuotes(entry.value)) return `${entry.key}=${entry.value}`;
            const escaped = entry.value
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
            return `${entry.key}="${escaped}"`;
        })
        .join('\n');
}

/** Collapses nesting into flat KEY paths, because .env has no concept of a
 * nested object. Arrays become numeric path segments. */
function flattenValue(value: DataValue, prefix: string, separator: string, out: EnvEntry[]): void {
    if (value === null) {
        out.push({ key: prefix, value: '' });
        return;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) {
            out.push({ key: prefix, value: '' });
            return;
        }
        value.forEach((item, i) => {
            flattenValue(item, prefix === '' ? String(i) : `${prefix}${separator}${i}`, separator, out);
        });
        return;
    }
    if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) {
            out.push({ key: prefix, value: '' });
            return;
        }
        keys.forEach((k) => {
            flattenValue(value[k], prefix === '' ? k : `${prefix}${separator}${k}`, separator, out);
        });
        return;
    }
    out.push({ key: prefix, value: String(value) });
}

// ── YAML (the flat / lightly nested subset) ───────────────────────────

interface ScalarResult {
    ok: boolean;
    value: DataValue;
    message: string;
}

function scanYamlQuoted(text: string, start: number, quote: string): { value: string; end: number } | null {
    let out = '';
    let i = start + 1;
    while (i < text.length) {
        const ch = text.charAt(i);
        if (quote === '"' && ch === '\\') {
            const next = text.charAt(i + 1);
            if (next === 'n') out += '\n';
            else if (next === 'r') out += '\r';
            else if (next === 't') out += '\t';
            else if (next === '0') out += '\0';
            else out += next;
            i += 2;
            continue;
        }
        if (ch === quote) {
            // In YAML single-quoted style, '' is one literal quote.
            if (quote === "'" && text.charAt(i + 1) === "'") {
                out += "'";
                i += 2;
                continue;
            }
            return { value: out, end: i };
        }
        out += ch;
        i += 1;
    }
    return null;
}

const NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

function parseYamlScalar(raw: string, lineNo: number): ScalarResult {
    const first = raw.charAt(0);

    if (first === '"' || first === "'") {
        const scanned = scanYamlQuoted(raw, 0, first);
        if (!scanned) {
            return { ok: false, value: '', message: `Line ${lineNo}: the quoted value is never closed.` };
        }
        return { ok: true, value: scanned.value, message: '' };
    }
    if (first === '|' || first === '>') {
        return { ok: false, value: '', message: `Line ${lineNo}: block scalars (| and >) are outside what this converter reads.` };
    }
    if (first === '[' || first === '{') {
        return { ok: false, value: '', message: `Line ${lineNo}: inline flow collections ([...] and {...}) are outside what this converter reads.` };
    }
    if (first === '&' || first === '*') {
        return { ok: false, value: '', message: `Line ${lineNo}: anchors and aliases are outside what this converter reads.` };
    }

    // Plain scalar: an unquoted ' #' starts a trailing comment.
    const commentAt = raw.search(/\s#/);
    const text = (commentAt === -1 ? raw : raw.slice(0, commentAt)).trim();

    if (text === '' || text === '~' || /^null$/i.test(text)) {
        return { ok: true, value: text === '' ? '' : null, message: '' };
    }
    if (/^true$/i.test(text)) return { ok: true, value: true, message: '' };
    if (/^false$/i.test(text)) return { ok: true, value: false, message: '' };
    if (NUMBER_PATTERN.test(text)) return { ok: true, value: Number(text), message: '' };
    return { ok: true, value: text, message: '' };
}

function splitYamlKey(content: string): { key: string; rest: string } | null {
    const first = content.charAt(0);
    if (first === '"' || first === "'") {
        const scanned = scanYamlQuoted(content, 0, first);
        if (!scanned) return null;
        const after = content.slice(scanned.end + 1);
        if (after.charAt(0) !== ':') return null;
        return { key: scanned.value, rest: after.slice(1).replace(/^[ \t]+/, '') };
    }
    for (let i = 0; i < content.length; i += 1) {
        if (content.charAt(i) !== ':') continue;
        const next = content.charAt(i + 1);
        if (next === '' || next === ' ' || next === '\t') {
            return { key: content.slice(0, i).trim(), rest: content.slice(i + 1).replace(/^[ \t]+/, '') };
        }
    }
    return null;
}

interface YamlFrame {
    indent: number;
    map: DataMap;
    childIndent: number | null;
    parent: DataMap | null;
    parentKey: string;
}

/** Reads the plain key/value corner of YAML that configuration files live in:
 * mappings, nesting by space indentation, quoted or plain scalars, comments.
 * Lists, anchors, block scalars and multi-document streams are reported as
 * unsupported instead of being silently mangled. */
function parseSimpleYaml(source: string): ParseOutcome {
    const root: DataMap = {};
    const issues: string[] = [];
    const stack: YamlFrame[] = [{ indent: -1, map: root, childIndent: null, parent: null, parentKey: '' }];
    const lines = source.split(/\r?\n/);
    let found = 0;

    const closeFrame = (): void => {
        const frame = stack.pop();
        if (frame && frame.parent && Object.keys(frame.map).length === 0) {
            frame.parent[frame.parentKey] = '';
        }
    };

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const lineNo = i + 1;
        if (line.trim() === '' || line.replace(/^\s+/, '').charAt(0) === '#') continue;

        if (/^\t/.test(line)) {
            issues.push(`Line ${lineNo}: YAML does not allow tab characters for indentation.`);
            continue;
        }

        const indent = line.length - line.replace(/^ +/, '').length;
        const content = line.slice(indent).replace(/\s+$/, '');

        if (content === '---' || content === '...') continue;
        if (content === '-' || content.indexOf('- ') === 0) {
            issues.push(`Line ${lineNo}: list items are outside what this converter reads, since .env has no list equivalent.`);
            continue;
        }

        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) closeFrame();
        const frame = stack[stack.length - 1];

        if (frame.childIndent === null) {
            frame.childIndent = indent;
        } else if (indent !== frame.childIndent) {
            issues.push(`Line ${lineNo}: indentation of ${indent} spaces does not line up with the ${frame.childIndent} used by its siblings.`);
            continue;
        }

        const split = splitYamlKey(content);
        if (!split) {
            issues.push(`Line ${lineNo}: expected "key: value" here.`);
            continue;
        }

        if (split.rest === '' || split.rest.charAt(0) === '#') {
            const child: DataMap = {};
            frame.map[split.key] = child;
            stack.push({ indent, map: child, childIndent: null, parent: frame.map, parentKey: split.key });
            continue;
        }

        const scalar = parseYamlScalar(split.rest, lineNo);
        if (!scalar.ok) {
            issues.push(scalar.message);
            continue;
        }
        frame.map[split.key] = scalar.value;
        found += 1;
    }

    while (stack.length > 1) closeFrame();

    const fatal = found === 0 && source.trim() !== ''
        ? 'No key/value pairs were found in that YAML.'
        : null;
    return { data: root, issues, fatal };
}

const YAML_RESERVED_WORDS = /^(?:true|false|null|yes|no|on|off|~)$/i;
const YAML_LEADING_INDICATORS = '-?:,[]{}#&*!|>\'"%@`';

function formatYamlScalar(value: string | number | boolean | null): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);

    const needsQuotes =
        value === '' ||
        /^\s|\s$/.test(value) ||
        /[\n\r\t]/.test(value) ||
        value.indexOf(': ') !== -1 ||
        /:$/.test(value) ||
        /\s#/.test(value) ||
        YAML_LEADING_INDICATORS.indexOf(value.charAt(0)) !== -1 ||
        YAML_RESERVED_WORDS.test(value) ||
        NUMBER_PATTERN.test(value);

    return needsQuotes ? JSON.stringify(value) : value;
}

function emitYaml(data: DataMap, indentSize: number, depth: number): string {
    const pad = new Array(depth * indentSize + 1).join(' ');
    const lines: string[] = [];

    Object.keys(data).forEach((key) => {
        const value = data[key];
        const label = /^[A-Za-z0-9_.-]+$/.test(key) ? key : JSON.stringify(key);

        if (value === null) {
            lines.push(`${pad}${label}: null`);
            return;
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                // Arrays have no home in an env-shaped document, so they are
                // written out as indexed child keys, never YAML sequences.
                const asMap: DataMap = {};
                value.forEach((item, i) => { asMap[String(i)] = item; });
                lines.push(`${pad}${label}:`);
                lines.push(emitYaml(asMap, indentSize, depth + 1));
                return;
            }
            if (Object.keys(value).length === 0) {
                lines.push(`${pad}${label}: ""`);
                return;
            }
            lines.push(`${pad}${label}:`);
            lines.push(emitYaml(value, indentSize, depth + 1));
            return;
        }
        lines.push(`${pad}${label}: ${formatYamlScalar(value)}`);
    });

    return lines.join('\n');
}

// ── JSON ──────────────────────────────────────────────────────────────

function parseJsonInput(source: string): ParseOutcome {
    try {
        const parsed: unknown = JSON.parse(source);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { data: {}, issues: [], fatal: 'The top level of the JSON needs to be an object of key/value pairs.' };
        }
        return { data: parsed as DataMap, issues: [], fatal: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { data: {}, issues: [], fatal: `Invalid JSON: ${message}` };
    }
}

// ── Conversion ────────────────────────────────────────────────────────

interface ConversionResult {
    output: string;
    issues: string[];
    fatal: string | null;
    count: number;
}

function convert(source: string, from: Format, to: Format, separator: string): ConversionResult {
    if (source.trim() === '') return { output: '', issues: [], fatal: null, count: 0 };

    let parsed: ParseOutcome;
    if (from === 'env') parsed = parseEnv(source);
    else if (from === 'json') parsed = parseJsonInput(source);
    else parsed = parseSimpleYaml(source);

    if (parsed.fatal) {
        return { output: '', issues: parsed.issues, fatal: parsed.fatal, count: 0 };
    }

    const flat: EnvEntry[] = [];
    flattenValue(parsed.data, '', separator, flat);

    let output: string;
    if (to === 'env') output = emitEnv(flat);
    else if (to === 'json') output = JSON.stringify(parsed.data, null, 2);
    else output = emitYaml(parsed.data, 2, 0);

    return { output, issues: parsed.issues, fatal: null, count: flat.length };
}

const SAMPLE_ENV = [
    '# Database connection',
    'export DATABASE_URL="postgres://user:pass@localhost:5432/app#main"',
    'DB_POOL_SIZE=10',
    '',
    "SINGLE_QUOTED='Line one\\nStill line one'",
    'DOUBLE_QUOTED="Line one\\nLine two"',
    '',
    'EMPTY_VALUE=',
    'FEATURE_FLAGS=alpha,beta   # inline comment',
].join('\n');

const EnvFileConverter: React.FC = () => {
    const [source, setSource] = useState<Format>('env');
    const [target, setTarget] = useState<Format>('json');
    const [separator, setSeparator] = useState('_');
    const [input, setInput] = useState(SAMPLE_ENV);
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const result = useMemo(
        () => convert(input, source, target, separator),
        [input, source, target, separator],
    );

    const swap = useCallback(() => {
        setSource(target);
        setTarget(source);
        setInput(result.output || input);
    }, [source, target, result.output, input]);

    const copyOutput = useCallback(() => {
        navigator.clipboard.writeText(result.output).then(
            () => setSnackbar('Output copied to clipboard'),
            () => setSnackbar('Could not copy to clipboard'),
        );
    }, [result.output]);

    const about = "This converter moves configuration between the three formats a project usually keeps it in: a .env file, a JSON block, and a YAML document. The .env side implements dotenv's real rules, so an inline comment, an export prefix, an empty value and a hash inside a quoted URL all survive the round trip instead of being mangled by a split on the equals sign. Going the other way, nested JSON or YAML keys are flattened into flat environment variable names, because the environment itself has no idea what a nested object is. Everything runs in your browser, so a file full of production secrets never leaves the machine you pasted it on.";

    const howToSteps = [
        { name: 'Pick the two formats', text: 'Choose what you are pasting in and what you want out. The swap button flips the direction and moves the current output into the input box.' },
        { name: 'Paste your configuration', text: 'Drop the .env file, JSON object, or YAML block into the input area. Conversion runs as you type.' },
        { name: 'Choose a separator if you are producing .env', text: 'Nested keys have to be flattened into flat names. Pick an underscore for conventional SCREAMING_SNAKE variables, or a dot if your loader expects dotted paths.' },
        { name: 'Check the notes, then copy', text: 'Anything the parser found questionable is listed above the output with its line number. Copy the result when it looks right.' },
    ];

    const faq = [
        {
            question: "What is the difference between single and double quotes in a .env file?",
            answer: 'Double quotes expand escape sequences, so DOUBLE="a\\nb" holds a real line break and \\" gives you a literal quote character. Single quotes expand nothing at all, so SINGLE=\'a\\nb\' holds a backslash followed by the letter n, four characters that never become a newline. Loaders in most languages follow this rule, and it is the source of a lot of confusion when a multi-line private key gets pasted into the wrong quote style.',
        },
        {
            question: 'How do nested JSON keys turn into environment variables?',
            answer: 'Each level of nesting becomes part of the flat key name, joined by the separator you pick. An object like {"db": {"host": "localhost"}} becomes DB_HOST=localhost with an underscore, or db.host=localhost with a dot. Arrays get numeric segments, so a list of two hosts becomes DB_HOSTS_0 and DB_HOSTS_1. The flattening exists because the process environment is a flat list of strings and cannot represent a tree, which is also why the reverse direction can never rebuild the original nesting on its own.',
        },
        {
            question: 'How complete is the YAML support?',
            answer: 'It covers the straightforward key/value subset that configuration files use: mappings, nesting by space indentation, quoted and plain scalars, and comments. It is not a general-purpose YAML engine. Anchors and aliases, merge keys, block scalars with | or >, flow collections, sequences and multi-document streams are all reported as unsupported rather than being parsed incorrectly. If you have a full Kubernetes manifest, use a real YAML library.',
        },
        {
            question: 'Does a # inside a value get treated as a comment?',
            answer: 'Only outside quotes. In DATABASE_URL="postgres://host/db#main" the fragment stays part of the value, while in FLAGS=alpha # dev everything from the hash onward is dropped, which is how dotenv itself behaves.',
        },
        {
            question: 'Is any of this uploaded?',
            answer: 'No. The parsing and emitting are plain JavaScript running in this tab, with no network request involved.',
        },
    ];

    return (
        <ServicePageShell
            icon={SettingsEthernet}
            title=".env File Converter"
            subtitle="Convert between .env, JSON and YAML with real dotenv quoting and comment rules."
            maxWidth="md"
            toolId={104}
            seoTitle=".env to JSON & YAML Converter - Free Online Tool"
            seoDescription="Convert .env files to JSON or YAML and back, with correct dotenv parsing: quoted values, inline comments, export prefixes, and single versus double quote escaping. Runs entirely in your browser."
            keywords={['env to json converter', 'env to yaml converter', 'json to env file', 'yaml to env converter', 'dotenv parser online', 'environment variables converter']}
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                    <FormControl size="small" sx={{ flex: 1, width: '100%' }}>
                        <InputLabel id="env-source-format">From</InputLabel>
                        <Select
                            labelId="env-source-format"
                            label="From"
                            value={source}
                            onChange={(e) => setSource(e.target.value as Format)}
                        >
                            {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
                                <MenuItem key={f} value={f}>{FORMAT_LABELS[f]}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Tooltip title="Swap direction">
                        <IconButton aria-label="Swap source and target formats" onClick={swap} size="small">
                            <SwapHoriz />
                        </IconButton>
                    </Tooltip>

                    <FormControl size="small" sx={{ flex: 1, width: '100%' }}>
                        <InputLabel id="env-target-format">To</InputLabel>
                        <Select
                            labelId="env-target-format"
                            label="To"
                            value={target}
                            onChange={(e) => setTarget(e.target.value as Format)}
                        >
                            {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
                                <MenuItem key={f} value={f}>{FORMAT_LABELS[f]}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {target === 'env' && (
                        <FormControl size="small" sx={{ flex: 1, width: '100%' }}>
                            <InputLabel id="env-separator">Nested key separator</InputLabel>
                            <Select
                                labelId="env-separator"
                                label="Nested key separator"
                                value={separator}
                                onChange={(e) => setSeparator(e.target.value)}
                            >
                                <MenuItem value="_">Underscore (DB_HOST)</MenuItem>
                                <MenuItem value=".">Dot (db.host)</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                </Stack>

                <TextField
                    label={`${FORMAT_LABELS[source]} input`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    fullWidth
                    multiline
                    minRows={8}
                    maxRows={16}
                    InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                    sx={{ mb: 2 }}
                />

                {result.fatal && (
                    <Alert severity="error" sx={{ mb: 2 }}>{result.fatal}</Alert>
                )}

                {result.issues.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                            {result.issues.length} note{result.issues.length === 1 ? '' : 's'} while parsing
                        </Typography>
                        {result.issues.map((issue, i) => (
                            <Typography key={i} variant="body2">{issue}</Typography>
                        ))}
                    </Alert>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        {FORMAT_LABELS[target]} output
                        {result.count > 0 ? ` (${result.count} key${result.count === 1 ? '' : 's'})` : ''}
                    </Typography>
                    <Button size="small" startIcon={<ContentCopy />} onClick={copyOutput} disabled={!result.output}>
                        Copy
                    </Button>
                </Stack>

                <TextField
                    value={result.output}
                    fullWidth
                    multiline
                    minRows={8}
                    maxRows={16}
                    placeholder="Converted output appears here."
                    InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />

                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        Everything is parsed in this tab. Nothing you paste is uploaded.
                    </Typography>
                </Box>
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default EnvFileConverter;
