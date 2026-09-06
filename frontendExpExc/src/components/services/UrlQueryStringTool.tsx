import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Box, Button, Card, Stack, Typography, TextField, Tabs, Tab, IconButton,
    Table, TableBody, TableCell, TableHead, TableRow, Snackbar,
} from '@mui/material';
import { ManageSearch, ContentCopy, Add, DeleteOutline } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

interface ParsedPair {
    key: string;
    value: string;
}

interface QueryRow {
    id: number;
    key: string;
    value: string;
}

/** Parses either a full absolute URL or a bare query string. `new URL()` is
 * tried first; if the input isn't a full URL it throws, and the fallback
 * treats the whole input as the search portion (stripping one leading `?`
 * if present, though URLSearchParams would strip it anyway). Iterating with
 * forEach (rather than .get, which only returns the first match) is what
 * makes repeated keys show up as separate rows instead of overwriting each
 * other. */
function parseUrlOrQuery(raw: string): ParsedPair[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    let search: string;
    try {
        search = new URL(trimmed).search;
    } catch {
        search = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
    }

    const params = new URLSearchParams(search);
    const pairs: ParsedPair[] = [];
    params.forEach((value, key) => pairs.push({ key, value }));
    return pairs;
}

/** Appends encoded key/value rows onto a base URL using URLSearchParams, so
 * a value containing &, =, spaces, or unicode always comes out correctly
 * percent-encoded rather than hand-rolled. */
function buildUrl(baseUrl: string, rows: QueryRow[]): string {
    const params = new URLSearchParams();
    rows.forEach((row) => {
        if (row.key.trim() === '') return;
        params.append(row.key, row.value);
    });
    const query = params.toString();
    const base = baseUrl.trim();

    if (!query) return base;
    if (!base) return `?${query}`;
    if (base.endsWith('?') || base.endsWith('&')) return `${base}${query}`;
    return base.includes('?') ? `${base}&${query}` : `${base}?${query}`;
}

const UrlQueryStringTool: React.FC = () => {
    const [tab, setTab] = useState(0);
    const [snackbar, setSnackbar] = useState<string | null>(null);

    // ---- Parse mode ----
    const [rawInput, setRawInput] = useState('');
    const parsedPairs = useMemo(() => parseUrlOrQuery(rawInput), [rawInput]);

    const copyParsed = useCallback(() => {
        const text = parsedPairs.map((p) => `${p.key}: ${p.value}`).join('\n');
        navigator.clipboard.writeText(text).then(
            () => setSnackbar('Parameters copied to clipboard'),
            () => setSnackbar('Could not copy to clipboard'),
        );
    }, [parsedPairs]);

    // ---- Build mode ----
    const nextIdRef = useRef(1);
    const [baseUrl, setBaseUrl] = useState('https://example.com/search');
    const [rows, setRows] = useState<QueryRow[]>(() => [{ id: nextIdRef.current++, key: '', value: '' }]);

    const addRow = useCallback(() => {
        setRows((prev) => [...prev, { id: nextIdRef.current++, key: '', value: '' }]);
    }, []);
    const removeRow = useCallback((id: number) => {
        setRows((prev) => prev.filter((r) => r.id !== id));
    }, []);
    const updateRow = useCallback((id: number, field: 'key' | 'value', value: string) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    }, []);

    const builtUrl = useMemo(() => buildUrl(baseUrl, rows), [baseUrl, rows]);

    const copyBuilt = useCallback(() => {
        navigator.clipboard.writeText(builtUrl).then(
            () => setSnackbar('URL copied to clipboard'),
            () => setSnackbar('Could not copy to clipboard'),
        );
    }, [builtUrl]);

    const about = "URL Query String Tool works in both directions. Paste a full URL or a bare query string and it breaks every parameter out into a table, or start from a base URL and add key/value rows to build one up from nothing, watching the final address take shape as you type. Both modes lean entirely on the browser's own URL and URLSearchParams objects, so parsing and encoding behave exactly the way a real server would see them.";

    const howToSteps = [
        { name: 'Choose Parse or Build', text: 'Switch tabs depending on whether you have a URL to break down or want to construct one from scratch.' },
        { name: 'Parse a URL', text: 'Paste a full URL or just its query string into the box. Every parameter appears as its own row below, including repeated keys.' },
        { name: 'Build a URL', text: 'Enter a base URL, then add key/value rows. The full, correctly encoded URL updates live underneath as you type.' },
        { name: 'Copy the result', text: 'Use the Copy button to grab the parsed list or the built URL onto your clipboard.' },
    ];

    const faq = [
        {
            question: 'Why not just split the string on & and = manually?',
            answer: "Because query strings can contain literal & and = characters once they're properly percent-encoded inside a value, and a naive split has no way to tell those apart from the real separators. URLSearchParams also knows that a + means a space in this context, something a plain string split gets wrong by default. Using the real API means the result matches the URL spec instead of an approximation of it.",
        },
        {
            question: 'What happens with repeated keys, like ?tag=a&tag=b?',
            answer: 'Each occurrence shows up as its own row, both tagged with the key tag. That mirrors how servers that support array-style query parameters actually receive them.',
        },
        {
            question: 'Is anything I type here sent anywhere?',
            answer: 'No. Parsing and building both happen with URL and URLSearchParams, objects built into every modern browser, so the URL never leaves your machine.',
        },
        {
            question: 'Does the Build tab handle a base URL that already has a query string?',
            answer: 'Yes. It checks whether the base already contains a ? and joins your new parameters with & instead of starting a second, invalid question mark.',
        },
    ];

    return (
        <ServicePageShell
            icon={ManageSearch}
            title="URL Query String Parser & Builder"
            subtitle="Break a URL's query string down into a table, or build one up from key/value rows."
            maxWidth="md"
            toolId={98}
            seoTitle="URL Query String Parser & Builder - Free Online Tool"
            seoDescription="Parse a URL's query parameters into a table, including repeated keys, or build a URL from a base address and key/value rows with correct percent-encoding. Runs entirely in your browser."
            keywords={['url query string parser', 'query parameter parser online', 'url builder tool', 'urlsearchparams tool', 'parse query string online', 'build url from parameters']}
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
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <Tab label="Parse" />
                    <Tab label="Build" />
                </Tabs>

                {tab === 0 && (
                    <Box>
                        <TextField
                            label="URL or query string"
                            placeholder="https://example.com/search?q=hello+world&tag=a&tag=b"
                            value={rawInput}
                            onChange={(e) => setRawInput(e.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                            sx={{ mb: 2 }}
                        />

                        {parsedPairs.length > 0 ? (
                            <>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        {parsedPairs.length} parameter{parsedPairs.length === 1 ? '' : 's'}
                                    </Typography>
                                    <Button size="small" startIcon={<ContentCopy />} onClick={copyParsed}>Copy</Button>
                                </Stack>
                                <Box sx={{ overflowX: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Key</TableCell>
                                                <TableCell>Value</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {parsedPairs.map((p, i) => (
                                                <TableRow key={`${p.key}-${i}`}>
                                                    <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{p.key}</TableCell>
                                                    <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{p.value}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                {rawInput.trim() ? 'No parameters found in that input.' : 'Paste a URL or query string above to see its parameters.'}
                            </Typography>
                        )}
                    </Box>
                )}

                {tab === 1 && (
                    <Box>
                        <TextField
                            label="Base URL"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            fullWidth
                            size="small"
                            sx={{ mb: 2.5 }}
                        />

                        <Stack spacing={1.5} sx={{ mb: 2 }}>
                            {rows.map((row) => (
                                <Stack key={row.id} direction="row" spacing={1} alignItems="center">
                                    <TextField
                                        label="Key"
                                        value={row.key}
                                        onChange={(e) => updateRow(row.id, 'key', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        label="Value"
                                        value={row.value}
                                        onChange={(e) => updateRow(row.id, 'value', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                    />
                                    <IconButton aria-label="Remove row" onClick={() => removeRow(row.id)} size="small">
                                        <DeleteOutline fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                        </Stack>

                        <Button size="small" startIcon={<Add />} onClick={addRow} sx={{ mb: 3 }}>
                            Add row
                        </Button>

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">Resulting URL</Typography>
                            <Button size="small" startIcon={<ContentCopy />} onClick={copyBuilt}>Copy</Button>
                        </Stack>
                        <TextField
                            value={builtUrl}
                            fullWidth
                            multiline
                            minRows={2}
                            InputProps={{ readOnly: true, sx: { fontFamily: 'monospace' } }}
                        />
                    </Box>
                )}
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default UrlQueryStringTool;
