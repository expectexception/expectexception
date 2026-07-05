import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Alert,
    LinearProgress,
    TextField,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Stack,
    Chip,
} from '@mui/material';
import { ContentCopy, AltRoute } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

type Hop = {
    url: string;
    status: number;
    time_ms: number;
    location?: string | null;
    headers: Record<string, string>;
};

type Result = {
    input_url: string;
    hops: Hop[];
    final_url: string;
    final_status: number | null;
    final_headers: Record<string, string>;
};

const RedirectInspector: React.FC = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Result | null>(null);

    const handleInspect = async () => {
        const trimmed = url.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const resp = await apiClient.post(endpoints.services.redirectInspector, { url: trimmed, max_hops: 10 });
            setResult(resp.data);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to inspect URL');
        } finally {
            setLoading(false);
        }
    };

    const copyFinalHeaders = async () => {
        if (!result) return;
        const text = JSON.stringify(result.final_headers || {}, null, 2);
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // ignore
        }
    };

    return (
        <ServicePageShell
            icon={AltRoute}
            title="Redirect Chain + Header Inspector"
            subtitle="Paste a URL to see every 301/302 hop and the final security/cache headers (CSP, CORS, HSTS)."
            maxWidth="lg"
            about="Follows a URL's redirect chain (301/302/303/307/308) one hop at a time from our server, up to 10 hops, reporting the status code, timing, and Location header at each step, plus the security and caching headers - CSP, HSTS, CORS, Cache-Control, ETag - returned by the final destination. Because it runs server-side, it sees the full chain even in cases where a browser would silently follow redirects and hide the intermediate hops - useful for debugging redirect loops, verifying a domain migration's 301s land where expected, or checking whether a CDN is stripping headers you rely on."
            howToSteps={[
                { name: 'Paste the starting URL', text: 'Enter the URL you want to trace into the URL field, including the https:// scheme.' },
                { name: 'Click Inspect', text: 'The server follows every redirect from that URL, one hop at a time, up to a 10-hop limit.' },
                { name: 'Read the redirect chain table', text: 'Each row shows the hop number, status code, URL, Location header, and response time in milliseconds, ending at the final destination.' },
                { name: 'Check the final headers', text: 'The Final Headers panel lists the last response\'s security and caching headers - use Copy JSON to grab them for a report or ticket.' },
            ]}
            faq={[
                { question: 'What counts as a redirect hop?', answer: 'Any response with a 301, 302, 303, 307, or 308 status code and a Location header. The tool follows each one with a fresh request until it reaches a non-redirect response or hits the 10-hop limit.' },
                { question: 'Why cap it at 10 hops?', answer: 'A long or looping redirect chain - a real and fairly common misconfiguration - would otherwise run indefinitely. 10 hops is enough to diagnose a normal chain while catching loops quickly.' },
                { question: 'Why do headers like HSTS or CSP on the final response matter?', answer: 'These control whether browsers enforce HTTPS (Strict-Transport-Security), what content sources are allowed to load (Content-Security-Policy), and which cross-origin requests are permitted (Access-Control-Allow-Origin) - missing or misconfigured ones are a common source of browser security warnings or broken embeds.' },
                { question: 'Does it work on internal or localhost URLs?', answer: "No - the tool only fetches public, internet-reachable HTTP(S) URLs and rejects localhost, private, and internal IP ranges as a safety measure." },
            ]}
        >
            <Seo
                title="Redirect Chain + Header Inspector"
                toolId={26}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 2 }}>
                {error && <Alert severity="error" sx={{ flexShrink: 0 }}>{error}</Alert>}

                <Card sx={{ flexShrink: 0 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                                fullWidth
                                label="URL"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                            <Button
                                variant="contained"
                                onClick={handleInspect}
                                startIcon={<AltRoute />}
                                disabled={loading || !url.trim()}
                                sx={{ minWidth: { xs: '100%', md: 220 } }}
                            >
                                Inspect
                            </Button>
                        </Stack>

                        {loading && <LinearProgress sx={{ mt: 2 }} />}
                    </CardContent>
                </Card>

                {result && (
                    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Card>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">Redirect Chain</Typography>
                                    <Chip
                                        size="small"
                                        color="primary"
                                        label={result.final_status ? `Final: ${result.final_status}` : 'Final'}
                                    />
                                </Box>

                                <Box sx={{ overflowX: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Hop</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>URL</TableCell>
                                                <TableCell>Location</TableCell>
                                                <TableCell align="right">Time (ms)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {result.hops.map((h, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{idx + 1}</TableCell>
                                                    <TableCell>{h.status}</TableCell>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>{h.url}</TableCell>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>{h.location || ''}</TableCell>
                                                    <TableCell align="right">{h.time_ms}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">Final Headers</Typography>
                                    <Button size="small" startIcon={<ContentCopy />} onClick={copyFinalHeaders}>
                                        Copy JSON
                                    </Button>
                                </Box>

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Final URL: <Box component="span" sx={{ fontFamily: 'monospace' }}>{result.final_url}</Box>
                                </Typography>

                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={6}
                                    maxRows={14}
                                    value={JSON.stringify(result.final_headers || {}, null, 2)}
                                    InputProps={{ readOnly: true }}
                                    sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                                />
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </Box>
        </ServicePageShell>
    );
};

export default RedirectInspector;
