import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, TextField, Button, Select, MenuItem,
    IconButton, Snackbar, Divider, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { Terminal, ContentCopy, Add, Delete } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface HeaderRow {
    key: string;
    value: string;
}

function shellQuote(value: string): string {
    // Single-quote the value and escape any embedded single quotes the
    // POSIX-shell way: close the quote, emit an escaped quote, reopen it.
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildCurlCommand(opts: {
    url: string;
    method: string;
    headers: HeaderRow[];
    body: string;
    multiline: boolean;
    followRedirects: boolean;
    insecure: boolean;
}): string {
    const { url, method, headers, body, multiline, followRedirects, insecure } = opts;
    const sep = multiline ? ' \\\n  ' : ' ';
    const parts: string[] = ['curl'];

    if (method !== 'GET') parts.push(`-X ${method}`);
    if (followRedirects) parts.push('-L');
    if (insecure) parts.push('-k');

    headers
        .filter(h => h.key.trim() !== '')
        .forEach(h => parts.push(`-H ${shellQuote(`${h.key}: ${h.value}`)}`));

    const hasJsonContentType = headers.some(h => h.key.toLowerCase() === 'content-type');
    if (body.trim() !== '' && method !== 'GET' && method !== 'HEAD') {
        if (!hasJsonContentType) parts.push(`-H ${shellQuote('Content-Type: application/json')}`);
        parts.push(`-d ${shellQuote(body)}`);
    }

    parts.push(shellQuote(url || 'https://example.com'));

    return parts.join(sep);
}

const CurlCommandGenerator: React.FC = () => {
    const [url, setUrl] = useState('https://api.example.com/v1/users');
    const [method, setMethod] = useState('GET');
    const [headers, setHeaders] = useState<HeaderRow[]>([{ key: 'Authorization', value: 'Bearer YOUR_TOKEN' }]);
    const [body, setBody] = useState('{\n  "name": "example"\n}');
    const [multiline, setMultiline] = useState(true);
    const [followRedirects, setFollowRedirects] = useState(false);
    const [insecure, setInsecure] = useState(false);
    const [snackbar, setSnackbar] = useState(false);

    const command = useMemo(
        () => buildCurlCommand({ url, method, headers, body, multiline, followRedirects, insecure }),
        [url, method, headers, body, multiline, followRedirects, insecure],
    );

    const updateHeader = (index: number, patch: Partial<HeaderRow>) => {
        setHeaders(prev => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
    };
    const addHeader = () => setHeaders(prev => [...prev, { key: '', value: '' }]);
    const removeHeader = (index: number) => setHeaders(prev => prev.filter((_, i) => i !== index));

    const handleCopy = () => {
        navigator.clipboard.writeText(command);
        setSnackbar(true);
    };

    return (
        <ServicePageShell
            icon={Terminal}
            title="cURL Command Generator"
            subtitle="Build a properly quoted curl command from a URL, method, headers and body without hunting for flag syntax"
            maxWidth="md"
            toolId={82}
            seoTitle="cURL Command Generator | Build curl Commands from URL, Headers & Body"
            seoDescription="Free online curl command generator. Fill in a URL, HTTP method, headers and a request body and get a correctly quoted curl command ready to paste into a terminal. Runs entirely in your browser."
            keywords={['curl command generator', 'curl builder', 'generate curl command', 'curl request builder', 'curl header generator', 'http to curl converter']}
            about="Turns a URL, an HTTP method, a set of headers and an optional request body into a curl command you can paste straight into a terminal. The part that is easy to get wrong by hand is quoting: header values and JSON bodies often contain characters a shell would otherwise treat as special, so this generator wraps every value in single quotes and escapes any single quotes inside them the standard POSIX way, rather than leaving that for you to catch after a confusing shell error."
            howToSteps={[
                { name: 'Enter the URL and pick a method', text: 'Type the request URL and choose GET, POST, PUT, PATCH, DELETE, HEAD or OPTIONS.' },
                { name: 'Add any headers', text: 'Add key/value rows for headers like Authorization or a custom Content-Type. Empty rows are ignored.' },
                { name: 'Add a request body if needed', text: 'For non-GET requests, paste a body. A Content-Type header is added automatically if you have not set one.' },
                { name: 'Copy the generated command', text: 'The curl command updates live as you type. Click Copy to put it on your clipboard.' },
            ]}
            faq={[
                {
                    question: 'Why does the body add a Content-Type header automatically?',
                    answer: 'curl does not set a Content-Type header on its own just because you passed -d; without one, a server has no reliable way to know how to parse the body. This tool assumes application/json for a filled-in body if you have not already added your own Content-Type header, since that is by far the most common case for API requests, but you can override it by adding your own Content-Type row.',
                },
                {
                    question: 'Why are values wrapped in single quotes instead of double quotes?',
                    answer: "Single quotes in a POSIX shell suppress essentially all special-character handling, including $ variable expansion, which double quotes do not. That makes single quotes the safer default for arbitrary header values, tokens and JSON bodies. The one character single quotes cannot contain literally is another single quote, so this tool escapes any embedded single quote using the standard close-quote, escaped-quote, reopen-quote sequence.",
                },
                {
                    question: 'What does the multi-line toggle actually change?',
                    answer: "It only changes formatting, not behavior: with it on, each flag is placed on its own line with a trailing backslash, which is easier to read and diff for commands with several headers. With it off, the whole command is on a single line, which is easier to paste into some tools or chat messages that mangle multi-line input.",
                },
                {
                    question: 'Does this tool send my request anywhere?',
                    answer: 'No. It only builds the text of a curl command; nothing here makes an actual network request. The URL, headers and body you type never leave your browser tab.',
                },
            ]}
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
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                        <Select
                            value={method}
                            onChange={e => setMethod(e.target.value)}
                            size="small"
                            sx={{ minWidth: 110, fontFamily: 'monospace', fontWeight: 700 }}
                        >
                            {METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </Select>
                        <TextField
                            fullWidth
                            size="small"
                            label="URL"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            inputProps={{ spellCheck: false, style: { fontFamily: 'monospace' } }}
                        />
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Headers</Typography>
                    {headers.map((h, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <TextField
                                size="small"
                                placeholder="Header-Name"
                                value={h.key}
                                onChange={e => updateHeader(i, { key: e.target.value })}
                                sx={{ flex: 1 }}
                                inputProps={{ spellCheck: false }}
                            />
                            <TextField
                                size="small"
                                placeholder="value"
                                value={h.value}
                                onChange={e => updateHeader(i, { value: e.target.value })}
                                sx={{ flex: 2 }}
                                inputProps={{ spellCheck: false }}
                            />
                            <IconButton size="small" onClick={() => removeHeader(i)} aria-label="Remove header">
                                <Delete fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                    <Button size="small" startIcon={<Add />} onClick={addHeader} sx={{ mb: 2 }}>Add header</Button>

                    {method !== 'GET' && method !== 'HEAD' && (
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            maxRows={8}
                            label="Body"
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            sx={{ mb: 2 }}
                            inputProps={{ spellCheck: false, style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                        />
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <ToggleButtonGroup size="small" value={multiline ? 'multi' : 'single'} exclusive
                            onChange={(_, v) => { if (v !== null) setMultiline(v === 'multi'); }}>
                            <ToggleButton value="multi">Multi-line</ToggleButton>
                            <ToggleButton value="single">Single line</ToggleButton>
                        </ToggleButtonGroup>
                        <ToggleButtonGroup size="small" value={followRedirects ? 'on' : 'off'} exclusive
                            onChange={(_, v) => { if (v !== null) setFollowRedirects(v === 'on'); }}>
                            <ToggleButton value="off">No -L</ToggleButton>
                            <ToggleButton value="on">-L (follow redirects)</ToggleButton>
                        </ToggleButtonGroup>
                        <ToggleButtonGroup size="small" value={insecure ? 'on' : 'off'} exclusive
                            onChange={(_, v) => { if (v !== null) setInsecure(v === 'on'); }}>
                            <ToggleButton value="off">No -k</ToggleButton>
                            <ToggleButton value="on">-k (skip TLS verify)</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{
                        p: 2,
                        borderRadius: '12px',
                        bgcolor: 'rgba(0,0,0,0.4)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        border: '1px solid rgba(255,255,255,0.08)',
                        mb: 2,
                    }}>
                        {command}
                    </Box>

                    <Button fullWidth variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
                        Copy command
                    </Button>
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="curl command copied to clipboard!" />
        </ServicePageShell>
    );
};

export default CurlCommandGenerator;
