import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, FormControl, IconButton, InputLabel, MenuItem,
    Select, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { ContentCopy, SwapHoriz, Transform } from '@mui/icons-material';
import { dump, load, YAMLException } from 'js-yaml';
import ServicePageShell from './ServicePageShell';

type Format = 'yaml' | 'json';

const FORMAT_LABELS: Record<Format, string> = { yaml: 'YAML', json: 'JSON' };

interface ConvertResult {
    output: string;
    error: string | null;
}

/** Real conversion, not a hand-rolled subset: `load`/`dump` from js-yaml do
 * the actual parsing and serializing, so sequences, nested maps, block
 * scalars, flow collections and typed scalars all round-trip correctly. */
function convert(input: string, from: Format, to: Format, jsonIndent: number): ConvertResult {
    if (input.trim() === '') return { output: '', error: null };

    let data: unknown;
    if (from === 'json') {
        try {
            data = JSON.parse(input);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { output: '', error: `Invalid JSON: ${message}` };
        }
    } else {
        try {
            // A single document only - js-yaml's loadAll would be needed for
            // a file with multiple `---`-separated documents.
            data = load(input);
        } catch (err) {
            if (err instanceof YAMLException) return { output: '', error: err.message };
            const message = err instanceof Error ? err.message : String(err);
            return { output: '', error: `Invalid YAML: ${message}` };
        }
    }

    if (data === undefined) return { output: '', error: null };

    try {
        if (to === 'json') return { output: JSON.stringify(data, null, jsonIndent), error: null };
        return { output: dump(data, { indent: 2, lineWidth: -1, noRefs: true }), error: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { output: '', error: `Could not produce ${FORMAT_LABELS[to]} output: ${message}` };
    }
}

const SAMPLE_YAML = [
    'service: checkout-api',
    'replicas: 3',
    'healthy: true',
    'tags: [payments, critical]',
    'resources:',
    '  requests:',
    '    cpu: "250m"',
    '    memory: 256Mi',
    'env:',
    '  - name: NODE_ENV',
    '    value: production',
    '  - name: LOG_LEVEL',
    '    value: info',
    'readme: |',
    '  Multi-line block scalars',
    '  keep their line breaks.',
].join('\n');

const YamlJsonConverter: React.FC = () => {
    const [source, setSource] = useState<Format>('yaml');
    const [target, setTarget] = useState<Format>('json');
    const [jsonIndent, setJsonIndent] = useState(2);
    const [input, setInput] = useState(SAMPLE_YAML);
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const result = useMemo(() => convert(input, source, target, jsonIndent), [input, source, target, jsonIndent]);

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

    const about = "This converts between YAML and JSON using js-yaml, a full YAML parser, rather than the deliberately limited flat/lightly-nested subset built into this site's .env converter (which explicitly says to reach for a real YAML library beyond that point - this tool is that library). Sequences, nested mappings, multi-line block scalars written with | or >, inline flow collections like [a, b] or {a: b}, and typed scalars such as numbers, booleans, null and dates are all read and written correctly. Converting the other direction serializes plain JavaScript data back into clean, canonically-indented YAML. Everything runs in your browser, and nothing you paste is uploaded anywhere.";

    const howToSteps = [
        { name: 'Pick a direction', text: 'Choose YAML to JSON or JSON to YAML, or use the swap button to flip the direction and carry the current output into the input box.' },
        { name: 'Paste your document', text: 'Conversion runs as you type. A parse error shows the exact line and column js-yaml stopped at.' },
        { name: 'Set the JSON indent width', text: 'When converting to JSON, choose 2 or 4 spaces for the output.' },
        { name: 'Copy the result', text: 'Copy the converted text straight to your clipboard once it looks right.' },
    ];

    const faq = [
        {
            question: 'What YAML features does this actually support?',
            answer: 'The real thing: nested mappings and sequences at any depth, multi-line block scalars (| keeps line breaks, > folds them into spaces), inline flow collections like [a, b] and {a: b}, anchors and aliases, and typed scalars for numbers, booleans, null and ISO dates. The one thing it does not do is read a file with multiple ----separated documents - only the first document converts, since that covers the overwhelming majority of config files people paste in here.',
        },
        {
            question: 'Why does converting JSON to YAML and back not give me byte-identical YAML?',
            answer: "Key order is preserved, but quoting style is not: the serializer picks a canonical style for each value (plain where it's unambiguous, quoted where a value would otherwise be misread, such as a string that looks like a number). If your original YAML had stylistic quoting choices - single quotes where double would also have worked, or a quoted key that didn't need it - those choices don't survive a round trip through JSON, because JSON has no concept of them to carry along.",
        },
        {
            question: "What is the 'Norway problem', and does it happen here?",
            answer: "It's a YAML 1.1 quirk in older parsers (classic PyYAML, and js-yaml before version 4) where an unquoted country code like NO for Norway gets silently parsed as the boolean false, because that schema treats yes/no/on/off as booleans alongside true/false. This tool uses js-yaml's modern core schema, which only recognizes true and false (in any case) as booleans - no, yes, on and off all stay ordinary strings. It's still good practice to quote a value that happens to look like a keyword, since not every YAML tool you might hand the output to uses the same schema.",
        },
        {
            question: 'Why does my YAML get rejected for using tabs?',
            answer: 'The YAML specification forbids tab characters in indentation outright - only spaces are allowed there. js-yaml enforces this and reports the line it found a tab on, rather than guessing how many spaces you meant it to be.',
        },
        {
            question: 'Is anything I paste here sent anywhere?',
            answer: 'No. Parsing and serializing both happen in this browser tab with no network request involved.',
        },
    ];

    return (
        <ServicePageShell
            icon={Transform}
            title="YAML ↔ JSON Converter"
            subtitle="Convert between YAML and JSON in both directions with a real YAML parser, not a limited subset."
            maxWidth="md"
            toolId={108}
            seoTitle="YAML to JSON Converter (and back) - Free Online Tool"
            seoDescription="Convert YAML to JSON or JSON to YAML online with real YAML parsing: sequences, nested mappings, block scalars, flow collections and anchors all supported. Clear line/column errors on invalid input. Runs entirely in your browser."
            keywords={['yaml to json converter', 'json to yaml converter', 'yaml validator online', 'yaml parser online', 'convert yaml online', 'json yaml converter']}
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
                        <InputLabel id="yj-source-format">From</InputLabel>
                        <Select
                            labelId="yj-source-format"
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
                        <InputLabel id="yj-target-format">To</InputLabel>
                        <Select
                            labelId="yj-target-format"
                            label="To"
                            value={target}
                            onChange={(e) => setTarget(e.target.value as Format)}
                        >
                            {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
                                <MenuItem key={f} value={f}>{FORMAT_LABELS[f]}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {target === 'json' && (
                        <FormControl size="small" sx={{ flex: 1, width: '100%' }}>
                            <InputLabel id="yj-indent">JSON indent</InputLabel>
                            <Select
                                labelId="yj-indent"
                                label="JSON indent"
                                value={jsonIndent}
                                onChange={(e) => setJsonIndent(Number(e.target.value))}
                            >
                                <MenuItem value={2}>2 spaces</MenuItem>
                                <MenuItem value={4}>4 spaces</MenuItem>
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

                {result.error && (
                    <Alert severity="error" sx={{ mb: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}>{result.error}</Alert>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        {FORMAT_LABELS[target]} output
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

export default YamlJsonConverter;
