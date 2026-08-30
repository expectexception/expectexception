import React, { useCallback, useMemo, useState } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Button, IconButton, Stack,
    Divider, Alert, Chip, MenuItem, Select, Table, TableBody, TableCell,
    TableHead, TableRow, CircularProgress, Snackbar, useTheme, alpha,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
    Api, Send, ContentCopy, AddCircleOutline, DeleteOutline, DataObject, History,
} from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * A minimal, Postman-style client: build a request, send it with the
 * browser's own fetch(), show the real response. The request goes
 * straight from this browser tab to whatever URL is entered — this
 * site's backend is never in the path, which also means the request is
 * subject to the target server's CORS policy exactly like any other
 * page's fetch() would be, with no client-side way around that.
 * ------------------------------------------------------------------ */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

// fetch() has no built-in timeout, so a hung/unreachable host would
// otherwise leave the UI stuck "loading" forever — this caps it with
// AbortController instead.
const TIMEOUT_MS = 30000;

interface HeaderRow { key: string; value: string }

interface ResponseResult {
    status: number;
    statusText: string;
    headers: [string, string][];
    bodyText: string;
    bodyIsJson: boolean;
    durationMs: number;
}

interface HistoryEntry {
    id: number;
    method: HttpMethod;
    url: string;
    headers: HeaderRow[];
    body: string;
    status: number | null;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

type StatusColor = 'success' | 'error' | 'warning' | 'info' | 'default';

function statusColor(status: number): StatusColor {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400) return 'error';
    if (status >= 300 && status < 400) return 'info';
    return 'warning';
}

const ApiRequestTester: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [method, setMethod] = useState<HttpMethod>('GET');
    const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
    const [headerRows, setHeaderRows] = useState<HeaderRow[]>([{ key: '', value: '' }]);
    const [body, setBody] = useState('');
    const [bodyFormatError, setBodyFormatError] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<ResponseResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [snackbar, setSnackbar] = useState(false);

    const supportsBody = BODY_METHODS.includes(method);

    const updateHeaderRow = (index: number, field: 'key' | 'value', value: string) => {
        setHeaderRows(rows => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    };
    const addHeaderRow = () => setHeaderRows(rows => [...rows, { key: '', value: '' }]);
    const removeHeaderRow = (index: number) => setHeaderRows(rows => rows.filter((_, i) => i !== index));

    const handleFormatJson = () => {
        try {
            setBody(JSON.stringify(JSON.parse(body), null, 2));
            setBodyFormatError(null);
        } catch {
            setBodyFormatError('Body is not valid JSON — nothing to format.');
        }
    };

    const activeHeaders = useMemo(
        () => headerRows.filter(h => h.key.trim().length > 0),
        [headerRows],
    );

    const handleSend = useCallback(async () => {
        if (!url.trim()) {
            setError('Enter a URL to send the request to.');
            return;
        }

        setLoading(true);
        setError(null);
        setResponse(null);

        const fetchHeaders: Record<string, string> = {};
        activeHeaders.forEach(h => { fetchHeaders[h.key.trim()] = h.value; });
        const init: RequestInit = { method, headers: fetchHeaders };
        if (supportsBody && body.trim()) init.body = body;

        const start = performance.now();
        try {
            const res = await fetchWithTimeout(url.trim(), init, TIMEOUT_MS);
            const durationMs = Math.round(performance.now() - start);

            const respHeaders: [string, string][] = [];
            res.headers.forEach((value, key) => respHeaders.push([key, value]));

            const text = await res.text();
            let bodyIsJson = false;
            let bodyText = text;
            if (text.trim()) {
                try {
                    bodyText = JSON.stringify(JSON.parse(text), null, 2);
                    bodyIsJson = true;
                } catch {
                    bodyText = text;
                }
            }

            setResponse({ status: res.status, statusText: res.statusText, headers: respHeaders, bodyText, bodyIsJson, durationMs });
            setHistory(h => [
                { id: Date.now(), method, url: url.trim(), headers: activeHeaders, body, status: res.status },
                ...h,
            ].slice(0, 5));
        } catch (e) {
            const isAbort = e instanceof DOMException && e.name === 'AbortError';
            setError(isAbort
                ? `Request timed out after ${TIMEOUT_MS / 1000} seconds with no response.`
                : "Request failed — either the target is unreachable, or it blocked this request via CORS (no Access-Control-Allow-Origin header permitting this site's origin). Browsers deliberately hide the exact reason for security, so there is no way to tell which from here, and no client-side workaround for a real CORS block.");
            setHistory(h => [
                { id: Date.now(), method, url: url.trim(), headers: activeHeaders, body, status: null },
                ...h,
            ].slice(0, 5));
        } finally {
            setLoading(false);
        }
    }, [url, method, activeHeaders, body, supportsBody]);

    const loadFromHistory = (entry: HistoryEntry) => {
        setMethod(entry.method);
        setUrl(entry.url);
        setHeaderRows(entry.headers.length ? entry.headers.map(h => ({ ...h })) : [{ key: '', value: '' }]);
        setBody(entry.body);
        setResponse(null);
        setError(null);
    };

    const handleCopyBody = () => {
        if (!response) return;
        navigator.clipboard.writeText(response.bodyText);
        setSnackbar(true);
    };

    return (
        <ServicePageShell
            icon={Api}
            title="API Request Tester"
            subtitle="Build and send a real HTTP request from your browser, then inspect the response"
            maxWidth="md"
            toolId={73}
            keywords={['api request tester', 'http client online', 'browser rest client', 'fetch api tester', 'test api endpoint online', 'cors tester', 'online postman alternative', 'http request builder']}
            about="A minimal, Postman-style HTTP client that runs entirely in your browser: build a request (method, URL, headers, body), send it with the browser's own fetch(), and inspect the real status code, response headers and body. The request goes directly from your browser to the URL you enter — this site's backend is never involved, which is the honest tradeoff of a client-side tool like this: it also means the request is subject to the target server's CORS policy exactly like any other browser-based request, and there is no way around a genuine CORS block from client-side code, here or anywhere else. Response headers can also be incomplete for cross-origin requests: browsers only expose a small safelisted set of response headers via fetch unless the server explicitly opts in with Access-Control-Expose-Headers, so a response might carry more headers than you can actually see here. Nothing about the request or response is sent to or stored by this site's own servers; recent requests are kept only in this browser tab's memory so you can reload them, and disappear on refresh."
            howToSteps={[
                { name: 'Set the method and URL', text: 'Choose GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS and enter the full URL, including https://.' },
                { name: 'Add headers and a body if needed', text: 'Add key/value header rows as needed. For POST/PUT/PATCH, a body field appears — use "Format as JSON" to pretty-print it if it is JSON.' },
                { name: 'Send and read the response', text: 'Click Send to fire the real request. The status code, timing, response headers and body appear below, or a clear error if the request failed or was blocked.' },
            ]}
            faq={[
                { question: 'Does this go through your servers?', answer: "No. The request is sent directly from your browser to the URL you typed via the fetch() API — this site's backend is never in the path. That is also exactly why it is subject to the target server's CORS policy, the same as any other browser-based request." },
                { question: 'Why did my request fail with a vague error instead of a real response?', answer: "Most commonly this is a CORS block: the target server didn't send an Access-Control-Allow-Origin header permitting this site's origin, so the browser refuses to hand the response to this page's JavaScript — even if the server actually processed the request successfully. Browsers throw the same generic network-error exception for a genuine connectivity failure and for a CORS block, deliberately, for security reasons, so there is no way to tell which one happened from here, and no client-side workaround for a real CORS restriction. This is expected browser behavior, not a bug in this tool." },
                { question: 'Why don\'t I see all the response headers?', answer: 'For a cross-origin request, browsers only expose a small safelisted set of response headers to page JavaScript (things like Content-Type and Cache-Control) unless the server explicitly lists additional ones in an Access-Control-Expose-Headers response header. A response can genuinely carry more headers than fetch() will let this page read.' },
                { question: 'Can I set any header I want?', answer: 'Most, but not all. The Fetch spec forbids scripts from setting certain headers directly — things like Host, Origin, Cookie and Content-Length — for security reasons; the browser controls those itself regardless of what you enter here.' },
                { question: 'What happens if the request hangs?', answer: `It is automatically aborted after ${TIMEOUT_MS / 1000} seconds and shown as a timeout error, so an unreachable host cannot leave the page stuck on "loading" indefinitely.` },
            ]}
        >
            <Stack spacing={2}>
                <Card>
                    <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <Api sx={{ fontSize: 18, color: primary }} />
                            <Typography variant="caption" color="text.secondary">
                                Requests go straight from your browser to the URL below — our servers are never involved.
                            </Typography>
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
                            <Select
                                value={method}
                                onChange={(e: SelectChangeEvent) => setMethod(e.target.value as HttpMethod)}
                                size="small"
                                sx={{ minWidth: 120, fontWeight: 700 }}
                            >
                                {METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                            </Select>
                            <TextField
                                fullWidth
                                size="small"
                                label="URL"
                                placeholder="https://api.example.com/resource"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                spellCheck={false}
                                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                            />
                            <Button
                                variant="contained"
                                onClick={handleSend}
                                disabled={loading || !url.trim()}
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Send />}
                                sx={{ minWidth: 120, flexShrink: 0 }}
                            >
                                {loading ? 'Sending…' : 'Send'}
                            </Button>
                        </Stack>

                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Headers</Typography>
                        <Stack spacing={1} sx={{ mb: 1 }}>
                            {headerRows.map((row, i) => (
                                <Stack key={i} direction="row" spacing={1} alignItems="center">
                                    <TextField
                                        size="small"
                                        placeholder="Header name"
                                        value={row.key}
                                        onChange={e => updateHeaderRow(i, 'key', e.target.value)}
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        size="small"
                                        placeholder="Value"
                                        value={row.value}
                                        onChange={e => updateHeaderRow(i, 'value', e.target.value)}
                                        sx={{ flex: 1 }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => removeHeaderRow(i)}
                                        disabled={headerRows.length === 1 && !row.key && !row.value}
                                        aria-label="Remove header"
                                    >
                                        <DeleteOutline fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                        </Stack>
                        <Button size="small" startIcon={<AddCircleOutline />} onClick={addHeaderRow} sx={{ mb: supportsBody ? 2.5 : 0 }}>
                            Add header
                        </Button>

                        {supportsBody && (
                            <>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={800}>Body</Typography>
                                    <Button size="small" startIcon={<DataObject />} onClick={handleFormatJson}>
                                        Format as JSON
                                    </Button>
                                </Stack>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={4}
                                    maxRows={12}
                                    placeholder='{"key": "value"}'
                                    value={body}
                                    onChange={e => { setBody(e.target.value); setBodyFormatError(null); }}
                                    spellCheck={false}
                                    inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                                />
                                {bodyFormatError && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                        {bodyFormatError}
                                    </Typography>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {error && <Alert severity="error">{error}</Alert>}

                {response && (
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                                <Chip
                                    label={`${response.status} ${response.statusText}`}
                                    color={statusColor(response.status) === 'default' ? undefined : statusColor(response.status)}
                                    sx={{ fontWeight: 700 }}
                                />
                                <Chip label={`${response.durationMs} ms`} variant="outlined" size="small" />
                                <Chip label={response.bodyIsJson ? 'JSON' : 'Text'} variant="outlined" size="small" />
                            </Stack>

                            {response.headers.length > 0 && (
                                <Box sx={{ mb: 2.5 }}>
                                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                                        Response headers
                                    </Typography>
                                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {response.headers.map(([k, v]) => (
                                                    <TableRow key={k}>
                                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary' }}>{k}</TableCell>
                                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>{v}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </Box>
                            )}

                            <Divider sx={{ mb: 2 }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight={800}>Body</Typography>
                                <Button size="small" startIcon={<ContentCopy />} onClick={handleCopyBody} disabled={!response.bodyText}>
                                    Copy
                                </Button>
                            </Stack>
                            <Box
                                component="pre"
                                sx={{
                                    m: 0, p: 2, borderRadius: 2, bgcolor: alpha(primary, 0.05),
                                    border: `1px solid ${alpha(primary, 0.15)}`, fontFamily: 'monospace',
                                    fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                    maxHeight: 320, overflow: 'auto', userSelect: 'text',
                                }}
                            >
                                {response.bodyText || '(empty body)'}
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {history.length > 0 && (
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                <History sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" fontWeight={800}>Recent requests (this session)</Typography>
                            </Stack>
                            <Stack spacing={1}>
                                {history.map(entry => (
                                    <Box
                                        key={entry.id}
                                        onClick={() => loadFromHistory(entry)}
                                        sx={{
                                            p: 1.25, borderRadius: 1.5, cursor: 'pointer',
                                            border: `1px solid ${alpha(primary, 0.12)}`,
                                            display: 'flex', alignItems: 'center', gap: 1.25,
                                            '&:hover': { bgcolor: alpha(primary, 0.06) },
                                        }}
                                    >
                                        <Chip
                                            label={entry.method}
                                            size="small"
                                            sx={{ fontWeight: 700, minWidth: 62 }}
                                        />
                                        <Typography
                                            variant="body2"
                                            sx={{ fontFamily: 'monospace', fontSize: '0.78rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        >
                                            {entry.url}
                                        </Typography>
                                        <Chip
                                            label={entry.status !== null ? entry.status : 'failed'}
                                            size="small"
                                            color={entry.status !== null ? (statusColor(entry.status) === 'default' ? undefined : statusColor(entry.status)) : 'error'}
                                            variant="outlined"
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                )}
            </Stack>

            <Snackbar
                open={snackbar}
                autoHideDuration={2000}
                onClose={() => setSnackbar(false)}
                message="Copied to clipboard"
            />
        </ServicePageShell>
    );
};

export default ApiRequestTester;
