import React, { useState, useMemo } from 'react';
import {
    Box, Typography, TextField, Chip, Stack, Grid, Paper, InputAdornment,
} from '@mui/material';
import { Search, Info as InfoIcon } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const STATUS_CODES = [
    // 1xx
    { code: 100, name: 'Continue', category: '1xx', desc: 'Server has received the request headers and the client should proceed to send the body.' },
    { code: 101, name: 'Switching Protocols', category: '1xx', desc: 'Server is switching to the protocol requested by the client (e.g. WebSocket upgrade).' },
    { code: 102, name: 'Processing', category: '1xx', desc: 'Server has received and is processing the request but no response is available yet (WebDAV).' },
    { code: 103, name: 'Early Hints', category: '1xx', desc: 'Used to return some response headers before final HTTP message (performance optimization).' },
    // 2xx
    { code: 200, name: 'OK', category: '2xx', desc: 'Standard response for successful HTTP requests.' },
    { code: 201, name: 'Created', category: '2xx', desc: 'Request succeeded and a new resource was created. Typical for POST/PUT.' },
    { code: 202, name: 'Accepted', category: '2xx', desc: 'Request accepted for processing but processing is not complete.' },
    { code: 204, name: 'No Content', category: '2xx', desc: 'Request succeeded but no content to return. Common for DELETE.' },
    { code: 206, name: 'Partial Content', category: '2xx', desc: 'Partial content is delivered due to a range header sent by the client.' },
    // 3xx
    { code: 301, name: 'Moved Permanently', category: '3xx', desc: 'URL has been permanently moved. Update your links.' },
    { code: 302, name: 'Found', category: '3xx', desc: 'Temporary redirect — original URI should be used in future requests.' },
    { code: 303, name: 'See Other', category: '3xx', desc: 'Response to the request can be found at another URI using GET.' },
    { code: 304, name: 'Not Modified', category: '3xx', desc: 'Resource has not been modified since last requested. Use cached version.' },
    { code: 307, name: 'Temporary Redirect', category: '3xx', desc: 'Request should be repeated with the same method at another URI.' },
    { code: 308, name: 'Permanent Redirect', category: '3xx', desc: 'Permanent redirect, must use same HTTP method as original request.' },
    // 4xx
    { code: 400, name: 'Bad Request', category: '4xx', desc: 'Server cannot process the request due to client error (malformed syntax, invalid framing, etc).' },
    { code: 401, name: 'Unauthorized', category: '4xx', desc: 'Authentication is required and has failed or not been provided.' },
    { code: 403, name: 'Forbidden', category: '4xx', desc: 'Server understood the request but refuses to authorize it.' },
    { code: 404, name: 'Not Found', category: '4xx', desc: 'Requested resource could not be found on the server.' },
    { code: 405, name: 'Method Not Allowed', category: '4xx', desc: 'HTTP method is not allowed for this resource.' },
    { code: 408, name: 'Request Timeout', category: '4xx', desc: 'Server timed out waiting for the request.' },
    { code: 409, name: 'Conflict', category: '4xx', desc: 'Request conflicts with the current state of the server.' },
    { code: 410, name: 'Gone', category: '4xx', desc: 'Resource requested is no longer available and will not be available again.' },
    { code: 413, name: 'Content Too Large', category: '4xx', desc: 'Request entity is larger than server is willing to process.' },
    { code: 415, name: 'Unsupported Media Type', category: '4xx', desc: 'Media format of the requested data is not supported by the server.' },
    { code: 422, name: 'Unprocessable Content', category: '4xx', desc: 'Request was well-formed but unable to be followed due to semantic errors (common in REST APIs).' },
    { code: 429, name: 'Too Many Requests', category: '4xx', desc: 'User has sent too many requests in a given amount of time (rate limiting).' },
    // 5xx
    { code: 500, name: 'Internal Server Error', category: '5xx', desc: 'Generic error when server encounters an unexpected condition.' },
    { code: 501, name: 'Not Implemented', category: '5xx', desc: 'Server does not recognize the request method or lacks the ability to fulfill it.' },
    { code: 502, name: 'Bad Gateway', category: '5xx', desc: 'Server acting as gateway received an invalid response from upstream server.' },
    { code: 503, name: 'Service Unavailable', category: '5xx', desc: 'Server is temporarily unavailable (overloaded or down for maintenance).' },
    { code: 504, name: 'Gateway Timeout', category: '5xx', desc: 'Server acting as gateway did not receive a timely response from upstream server.' },
    { code: 507, name: 'Insufficient Storage', category: '5xx', desc: 'Server is unable to store the representation needed to complete the request (WebDAV).' },
];

const CATEGORY_COLORS: Record<string, string> = {
    '1xx': '#64748b', '2xx': '#22c55e', '3xx': '#3b82f6', '4xx': '#f59e0b', '5xx': '#ef4444',
};

const HttpStatusCodes: React.FC = () => {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    const filtered = useMemo(() => {
        return STATUS_CODES.filter(s => {
            const matchesCat = activeCategory === 'all' || s.category === activeCategory;
            const q = search.toLowerCase();
            const matchesSearch = !q || String(s.code).includes(q) || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
            return matchesCat && matchesSearch;
        });
    }, [search, activeCategory]);

    return (
        <ServicePageShell
            title="HTTP Status Code Reference"
            subtitle="Complete searchable reference for all HTTP status codes with descriptions and use cases."
            icon={InfoIcon}
            seoDescription="Searchable HTTP status code reference. All 1xx-5xx codes explained with use cases."
            howToSteps={[
                { name: 'Search or filter', text: 'Type a code number, name, or keyword, or click a category chip.' },
                { name: 'Read description', text: 'Each card shows what the status code means and when it occurs.' },
            ]}
        >
            <Stack spacing={2} sx={{ mb: 3 }}>
                <TextField
                    placeholder="Search by code, name, or description…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                    size="small"
                    fullWidth
                />
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {['all', '1xx', '2xx', '3xx', '4xx', '5xx'].map(cat => (
                        <Chip
                            key={cat}
                            label={cat === 'all' ? 'All' : cat}
                            onClick={() => setActiveCategory(cat)}
                            sx={{
                                fontWeight: 700,
                                bgcolor: activeCategory === cat ? (CATEGORY_COLORS[cat] || 'primary.main') : 'transparent',
                                border: `1px solid ${CATEGORY_COLORS[cat] || '#64748b'}`,
                                color: activeCategory === cat ? '#000' : CATEGORY_COLORS[cat] || '#64748b',
                            }}
                        />
                    ))}
                </Stack>
            </Stack>

            <Grid container spacing={2}>
                {filtered.map(s => (
                    <Grid item xs={12} sm={6} md={4} key={s.code}>
                        <Paper sx={{ p: 2, height: '100%', borderLeft: `4px solid ${CATEGORY_COLORS[s.category]}`, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1.5 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="h5" fontWeight={800} sx={{ color: CATEGORY_COLORS[s.category], fontFamily: 'monospace' }}>{s.code}</Typography>
                                <Typography variant="body2" fontWeight={700}>{s.name}</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
                        </Paper>
                    </Grid>
                ))}
                {filtered.length === 0 && (
                    <Grid item xs={12}>
                        <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>No status codes match your search.</Typography>
                    </Grid>
                )}
            </Grid>
        </ServicePageShell>
    );
};

export default HttpStatusCodes;
