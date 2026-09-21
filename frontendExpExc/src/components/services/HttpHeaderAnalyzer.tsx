import React, { useMemo, useState } from 'react';
import {
    Box, Card, Chip, Stack, TextField, Typography,
} from '@mui/material';
import { Http, CheckCircle, Cancel } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

interface ParsedHeader {
    name: string;
    value: string;
}

interface ParseResult {
    status: string | null;
    headers: ParsedHeader[];
}

/** Accepts either a full raw response (status line + headers) or just the
 * header block on its own. A first line that looks like "HTTP/1.1 200 OK"
 * is treated as the status line and excluded from the header list; every
 * other non-empty line is read as "Name: value". Duplicate header names
 * (e.g. repeated Set-Cookie lines) are kept as separate entries, since that
 * is legal HTTP and collapsing them would lose information. */
function parseHeaders(source: string): ParseResult {
    const lines = source.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
    let status: string | null = null;
    let start = 0;
    if (lines.length > 0 && /^HTTP\/\d(\.\d)?\s+\d{3}/.test(lines[0])) {
        status = lines[0];
        start = 1;
    }

    const headers: ParsedHeader[] = [];
    for (let i = start; i < lines.length; i += 1) {
        const line = lines[i];
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const name = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).trim();
        if (name === '') continue;
        headers.push({ name, value });
    }
    return { status, headers };
}

const HEADER_EXPLANATIONS: Record<string, string> = {
    'cache-control': 'Directives controlling whether and how long a response may be cached, by whom (browser vs. shared proxy/CDN), and whether it must be revalidated before reuse.',
    expires: 'A fixed date/time after which a cached response is considered stale. Largely superseded by cache-control: max-age, which wins when both are present.',
    etag: 'An opaque identifier for this exact response body. A client can send it back in If-None-Match on the next request, and the server replies 304 Not Modified if nothing changed, saving the response body from being sent again.',
    'last-modified': 'The date the resource was last changed. Used the same way as ETag for revalidation (If-Modified-Since), but at second-level granularity, so it is a weaker signal.',
    'content-type': 'The MIME type and, for text, the character encoding of the body, telling the client how to parse and render it.',
    'content-length': 'The size of the response body in bytes. Missing when the response uses chunked transfer-encoding instead.',
    'content-encoding': 'How the body is compressed on the wire (gzip, br, deflate). The client decompresses it before handing it to whatever reads content-type.',
    'transfer-encoding': 'How the body is framed for streaming, most commonly chunked, used when the total length is not known up front. Mutually exclusive with content-length in practice.',
    connection: 'Controls whether the underlying TCP connection is kept alive for reuse (keep-alive) or closed after this response (close). Ignored on HTTP/2 and later, where connection reuse works differently.',
    'set-cookie': 'Sets a cookie in the client. Its own attributes (Secure, HttpOnly, SameSite, Domain, Path, Max-Age) determine how it is sent back and how exposed it is to scripts and cross-site requests.',
    cookie: 'A request header, not a response header, carrying cookies back to the server. Seeing it in response headers usually means a request was pasted in alongside the response.',
    'access-control-allow-origin': 'The CORS header that says which origins may read this response from a cross-origin fetch/XHR. A missing or mismatched value is the most common reason a browser blocks a cross-origin request that the server actually returned successfully.',
    'access-control-allow-methods': 'CORS: which HTTP methods a cross-origin caller is permitted to use, returned in response to a preflight OPTIONS request.',
    'access-control-allow-headers': 'CORS: which request headers a cross-origin caller is permitted to send, returned in response to a preflight OPTIONS request.',
    'access-control-allow-credentials': 'CORS: whether the browser should expose the response to script when the request was made with credentials (cookies, HTTP auth). Must be exactly "true", and cannot be paired with a wildcard Access-Control-Allow-Origin.',
    'access-control-expose-headers': 'CORS: which response headers, beyond the small always-allowed set, cross-origin JavaScript is permitted to read.',
    'access-control-max-age': 'CORS: how long, in seconds, a browser may cache the result of a preflight OPTIONS request before sending another one.',
    'strict-transport-security': 'HSTS. Tells the browser to only ever contact this host over HTTPS for a given duration, even if the user types or clicks an http:// link, which closes the window for a downgrade/stripping attack on future visits.',
    'content-security-policy': 'CSP. A allowlist of where scripts, styles, images, frames and other resources may be loaded from, and the single most effective header against injected-script XSS when configured well.',
    'x-frame-options': 'Restricts whether this page may be embedded in an iframe on another site (DENY or SAMEORIGIN), which is what stops clickjacking. Mostly superseded by CSP\'s frame-ancestors, but still widely sent for older-browser compatibility.',
    'x-content-type-options': 'Set to "nosniff", this stops the browser from guessing a different content type than what content-type declares, which closes a class of attack where a file is served as, say, text/plain but sniffed and executed as HTML or script.',
    'referrer-policy': 'Controls how much of the current page\'s URL is sent in the Referer header on outgoing requests and navigations, e.g. stripping query strings or the whole URL when leaving the site.',
    'permissions-policy': 'Allowlists which browser features and APIs (camera, microphone, geolocation, and dozens more) this page, and any iframes it embeds, are permitted to use.',
    'x-xss-protection': 'A legacy header that toggled an old browser-side reflected-XSS filter. Modern browsers have removed that filter entirely, so this header now does nothing and is safe to drop in favor of CSP.',
    server: 'Identifies the web server software, sometimes with a version. Often trimmed or replaced deliberately, since it hands an attacker a starting point for known-vulnerability lookups.',
    'x-powered-by': 'Identifies the application framework (e.g. Express, PHP). Like Server, it is pure fingerprinting information with no benefit to the client, and most guidance recommends removing it.',
    location: 'Used on redirect responses (3xx) to tell the client where to go next, and on 201 Created to point at the newly created resource.',
    vary: 'Lists which request headers affect the response body (commonly Accept-Encoding, Accept-Language, or Origin for CORS), which tells caches they need a separate cached copy per distinct value of those headers instead of one shared copy.',
    date: 'The date and time the server generated the response, per the server\'s own clock.',
    age: 'How many seconds a cached response has been sitting in a proxy or CDN since it was originally fetched from the origin. Only meaningful on responses that passed through a cache.',
    'www-authenticate': 'Sent with a 401 response to tell the client which authentication scheme (Basic, Bearer, Digest) is required and how to supply it.',
    'retry-after': 'Sent with a 429 or 503 response to tell the client how long to wait, in seconds or as a date, before trying again.',
};

const SECURITY_HEADERS: { key: string; label: string; note: string }[] = [
    { key: 'strict-transport-security', label: 'Strict-Transport-Security', note: 'Forces HTTPS on future visits, closing off downgrade attacks.' },
    { key: 'content-security-policy', label: 'Content-Security-Policy', note: 'Restricts where scripts, styles and other resources may load from, the primary defense against injected-script XSS.' },
    { key: 'x-frame-options', label: 'X-Frame-Options', note: 'Blocks this page from being embedded in another site\'s iframe, preventing clickjacking.' },
    { key: 'x-content-type-options', label: 'X-Content-Type-Options', note: 'Stops the browser from guessing a different content type than declared.' },
    { key: 'referrer-policy', label: 'Referrer-Policy', note: 'Limits how much of this page\'s URL leaks to other sites via the Referer header.' },
    { key: 'permissions-policy', label: 'Permissions-Policy', note: 'Restricts which browser features this page and its iframes may use.' },
];

const SAMPLE = [
    'HTTP/1.1 200 OK',
    'Date: Tue, 01 Jul 2025 10:00:00 GMT',
    'Content-Type: text/html; charset=utf-8',
    'Content-Length: 5231',
    'Cache-Control: public, max-age=3600, must-revalidate',
    'ETag: "a1b2c3d4"',
    'Strict-Transport-Security: max-age=63072000; includeSubDomains',
    'X-Content-Type-Options: nosniff',
    'Set-Cookie: session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax',
    'Server: nginx',
    'Vary: Accept-Encoding',
].join('\n');

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const HttpHeaderAnalyzer: React.FC = () => {
    const [input, setInput] = useState(SAMPLE);
    const { status, headers } = useMemo(() => parseHeaders(input), [input]);

    const presentSecurity = useMemo(() => {
        const names = new Set(headers.map((h) => h.name.toLowerCase()));
        return new Set(SECURITY_HEADERS.filter((s) => names.has(s.key)).map((s) => s.key));
    }, [headers]);

    const about = "Paste any raw HTTP response, either the full thing (status line included) or just the header block, and get every header explained in plain English, from caching and content negotiation to CORS and the security headers that actually matter. There is also a quick present/missing checklist for the six security headers that come up most often in a review: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy. Nothing here makes a network request; it only parses whatever text you paste in.";

    const howToSteps = [
        { name: 'Get the raw headers', text: "In a browser, open DevTools, go to the Network tab, click a request and copy the Response Headers. From a terminal, curl -I <url> or curl -sI <url> prints them directly." },
        { name: 'Paste them in', text: 'Paste the status line and headers, or just the headers on their own, into the box. Parsing happens as you type.' },
        { name: 'Read the explanations', text: 'Each recognized header gets a one-line plain-English explanation of what it does.' },
        { name: 'Check the security checklist', text: 'Scroll to the security headers section to see at a glance which of the common protective headers this response is sending and which are missing.' },
    ];

    const faq = [
        {
            question: 'How do I get raw response headers to paste in here?',
            answer: 'From a browser: open DevTools (F12), switch to the Network tab, reload the page, click the request you care about, and look for the Headers panel, most browsers offer a "raw" or copy-as-text view of the response headers there. From a terminal, curl -I <url> sends a HEAD request and prints only the headers, or curl -sI <url> for a quieter version; use curl -sD - -o /dev/null <url> if you need headers from a real GET rather than a HEAD.',
        },
        {
            question: 'What do the CORS headers actually control?',
            answer: "They decide whether a script running on one origin is allowed to read a response fetched from a different origin. Access-Control-Allow-Origin is the main gate: it must list the calling origin (or a wildcard, with restrictions) or the browser hides the response from the calling script even though the HTTP request itself succeeded, the response body did arrive, the browser just refuses to hand it to JavaScript. Access-Control-Allow-Methods and -Headers apply only to the preflight OPTIONS request browsers send ahead of certain cross-origin requests, and -Allow-Credentials controls whether cookies and HTTP auth are included and exposed.",
        },
        {
            question: 'What is the actual difference between no-store, no-cache and max-age?',
            answer: 'no-store means never cache this at all, refetch every time. no-cache is more permissive than it sounds: a cache may store the response, but must revalidate it with the origin (typically via ETag/If-None-Match) before reusing it on every single request. max-age=N means a cache may reuse the stored response for N seconds with no revalidation at all. They are frequently combined, for example Cache-Control: no-cache, max-age=0 forces revalidation on every use, while max-age=3600 alone allows silent reuse for an hour.',
        },
        {
            question: 'Does adding these security headers happen here?',
            answer: 'No, this tool only reads and explains headers you paste in, it has no way to change what your server sends. The security headers are normally set in your web server config (nginx, Apache, IIS), a reverse proxy or CDN, or application middleware (helmet.js for Express, django-security for Django, and equivalents in most frameworks).',
        },
        {
            question: 'Why does Set-Cookie sometimes appear more than once?',
            answer: 'A response can set several independent cookies in the same reply, and each one needs its own Set-Cookie line, they cannot be combined onto one line the way most headers can. This tool lists every occurrence separately rather than merging them, since merging would make the individual cookie attributes (HttpOnly, Secure, SameSite, expiry) impossible to read correctly.',
        },
    ];

    return (
        <ServicePageShell
            icon={Http}
            title="HTTP Header Analyzer"
            subtitle="Paste raw HTTP response headers and get each one explained, with a security header checklist"
            maxWidth="md"
            toolId={111}
            seoTitle="HTTP Header Analyzer - Explain & Check Response Headers Free"
            seoDescription="Paste raw HTTP response headers to get each one explained in plain English, plus a present/missing checklist for HSTS, CSP, X-Frame-Options and the other headers that actually protect a site. Runs entirely in your browser."
            keywords={['http header analyzer', 'http headers checker', 'security headers checker online', 'explain http headers', 'cors header checker', 'cache control checker']}
            about={about}
            howToSteps={howToSteps}
            faq={faq}
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
                <TextField
                    label="Raw response headers"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    fullWidth
                    multiline
                    minRows={8}
                    maxRows={14}
                    placeholder={'HTTP/1.1 200 OK\nContent-Type: text/html\n...'}
                    InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                    sx={{ mb: 2.5 }}
                />

                {status && (
                    <Chip label={status} color="primary" size="small" sx={{ mb: 2, fontFamily: 'monospace' }} />
                )}

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Security headers
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2.5 }}>
                    {SECURITY_HEADERS.map((s) => {
                        const present = presentSecurity.has(s.key);
                        return (
                            <Chip
                                key={s.key}
                                size="small"
                                icon={present ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
                                label={s.label}
                                color={present ? 'success' : 'default'}
                                variant={present ? 'filled' : 'outlined'}
                                title={s.note}
                            />
                        );
                    })}
                </Stack>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Headers ({headers.length})
                </Typography>
                {headers.length === 0 ? (
                    <Box sx={boxSx}>
                        <Typography variant="body2" color="text.secondary">
                            No headers parsed yet. Paste "Name: value" lines above, one per line.
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={1}>
                        {headers.map((h, i) => {
                            const explanation = HEADER_EXPLANATIONS[h.name.toLowerCase()];
                            return (
                                <Box key={`${h.name}-${i}`} sx={boxSx}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'baseline' }}>
                                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main', flexShrink: 0 }}>
                                            {h.name}
                                        </Typography>
                                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                            {h.value}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {explanation || 'No description on file for this header.'}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Stack>
                )}
            </Card>
        </ServicePageShell>
    );
};

export default HttpHeaderAnalyzer;
