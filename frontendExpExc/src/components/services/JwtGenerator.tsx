import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, IconButton, InputAdornment,
    Button, Stack, Divider, Alert, Snackbar, useTheme, alpha,
} from '@mui/material';
import {
    Key, ContentCopy, Visibility, VisibilityOff, LockOutlined,
} from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * JWT encoding (the inverse of JwtDecoder.tsx).
 *
 * A JWT is base64url(header) + "." + base64url(payload) + "." +
 * base64url(signature), where the signature is computed over the first
 * two dot-joined segments. HS256 signing needs an HMAC-SHA256 over that
 * string, which the Web Crypto API does natively (crypto.subtle) — no
 * signing library required. "none" skips the signature entirely (the
 * trailing dot with nothing after it), which is only ever useful for
 * testing that a backend correctly rejects unsigned tokens.
 * ------------------------------------------------------------------ */

/** base64url-encodes a UTF-8 string: standard base64, then "+"→"-",
 * "/"→"_", and strips the "=" padding, per RFC 7515. */
function base64UrlEncodeUtf8(input: string): string {
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    // Avoid spreading a Uint8Array so this stays safe under an ES5 target.
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBuffer(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** HMAC-SHA256 over `signingInput` using `secret` as the raw key,
 * entirely via crypto.subtle — the secret never leaves this function. */
async function signHs256(signingInput: string, secret: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signingInput));
    return base64UrlEncodeBuffer(sig);
}

interface JwtHeaderLike { alg?: string; [key: string]: unknown }

interface ParsedJson<T> { value: T | null; error: string | null }

function parseJson<T>(text: string, label: string): ParsedJson<T> {
    try {
        return { value: JSON.parse(text) as T, error: null };
    } catch {
        return { value: null, error: `${label} is not valid JSON.` };
    }
}

const DEFAULT_HEADER = JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2);
const DEFAULT_PAYLOAD = JSON.stringify(
    { sub: '1234567890', name: 'Test User', iat: Math.floor(Date.now() / 1000) },
    null,
    2,
);

const JwtGenerator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;

    const [headerText, setHeaderText] = useState(DEFAULT_HEADER);
    const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
    const [secret, setSecret] = useState('your-256-bit-secret');
    const [secretVisible, setSecretVisible] = useState(false);

    const [token, setToken] = useState('');
    const [signError, setSignError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState(false);

    const parsedHeader = useMemo(() => parseJson<JwtHeaderLike>(headerText, 'Header'), [headerText]);
    const parsedPayload = useMemo(() => parseJson<Record<string, unknown>>(payloadText, 'Payload'), [payloadText]);

    const alg = parsedHeader.value?.alg;
    const algSupported = alg === 'HS256' || alg === 'none';
    const algIssue = !parsedHeader.error && !algSupported
        ? `"${String(alg)}" isn't supported here — this tool signs HS256 tokens, or "none" for unsigned test tokens.`
        : null;
    const secretIssue = !parsedHeader.error && alg === 'HS256' && secret.length === 0
        ? 'Enter a secret to sign with HS256.'
        : null;

    // Recompute (and re-sign) the token whenever the parsed header/payload or
    // secret changes. Signing is async, so a stale, in-flight signature must
    // never overwrite a newer one — `cancelled` guards every state update
    // after the `await`.
    useEffect(() => {
        let cancelled = false;
        setSignError(null);

        if (parsedHeader.error || parsedPayload.error || algIssue || secretIssue) {
            setToken('');
            return;
        }

        const header = parsedHeader.value as JwtHeaderLike;
        const payload = parsedPayload.value as Record<string, unknown>;
        const signingInput = `${base64UrlEncodeUtf8(JSON.stringify(header))}.${base64UrlEncodeUtf8(JSON.stringify(payload))}`;

        if (header.alg === 'none') {
            setToken(`${signingInput}.`);
            return;
        }

        signHs256(signingInput, secret)
            .then(sig => { if (!cancelled) setToken(`${signingInput}.${sig}`); })
            .catch(() => {
                if (!cancelled) {
                    setSignError('Signing failed unexpectedly — try a different secret.');
                    setToken('');
                }
            });

        return () => { cancelled = true; };
    }, [parsedHeader, parsedPayload, secret, algIssue, secretIssue]);

    const applyTimestampClaim = (claim: 'iat' | 'exp', offsetSeconds: number) => {
        if (parsedPayload.error || !parsedPayload.value) return;
        const updated = { ...parsedPayload.value, [claim]: Math.floor(Date.now() / 1000) + offsetSeconds };
        setPayloadText(JSON.stringify(updated, null, 2));
    };

    const handleCopy = () => {
        if (!token) return;
        navigator.clipboard.writeText(token);
        setSnackbar(true);
    };

    const blockingMessage = parsedHeader.error || parsedPayload.error || algIssue || secretIssue;
    const segments = token.split('.');

    return (
        <ServicePageShell
            icon={Key}
            title="JWT Generator"
            subtitle="Build and sign a JSON Web Token from a header, payload and secret — entirely in your browser"
            maxWidth="sm"
            toolId={72}
            keywords={['jwt generator', 'jwt encoder', 'create jwt token', 'sign jwt online', 'hs256 jwt generator', 'json web token generator', 'jwt builder', 'generate test jwt']}
            about="Builds a JSON Web Token from a header, a payload and a secret — the encode-side companion to this site's JWT Decoder. Edit the header and payload as raw JSON and the encoded token updates live below. HS256 (HMAC-SHA256) signing is done with the browser's native Web Crypto API (crypto.subtle.importKey + crypto.subtle.sign), and an alg of 'none' produces an unsigned token — base64url(header).base64url(payload) with an empty signature — useful for confirming a backend correctly rejects unsigned tokens rather than trusting them. Everything, JSON parsing, base64url encoding and HMAC signing, runs locally in this tab; nothing you type is transmitted anywhere. That said, treat this as a tool for test tokens with test secrets: pasting a real production signing key into any web page, even one that never sends it anywhere, is worth being cautious about, since you have no way to verify that from the page itself."
            howToSteps={[
                { name: 'Edit the header and payload', text: 'Both are raw, editable JSON. The header needs an "alg" of "HS256" or "none"; the payload can hold any claims you want to test with, e.g. sub, name, iat, exp.' },
                { name: 'Enter a secret (for HS256)', text: 'Type the HMAC secret to sign with. It is only ever used locally, inside crypto.subtle.sign — never sent anywhere. Not used at all if alg is "none".' },
                { name: 'Copy the generated token', text: 'The encoded, signed JWT updates live below as you type. Click Copy to put it on your clipboard.' },
            ]}
            faq={[
                { question: 'Is my secret sent anywhere?', answer: 'No. The secret is used only in-browser, passed straight into crypto.subtle.importKey / crypto.subtle.sign (the Web Crypto API\'s native HMAC implementation) to compute the signature. It never appears in a network request. Still, treat this as a tool for test secrets, not real production signing keys — there is no way for you to independently verify what a web page does with something you type into it, so caution with a real key is always warranted regardless of what any tool claims.' },
                { question: 'Which algorithms are supported?', answer: 'HS256 (HMAC-SHA256), which covers the common case of symmetric JWT signing, and "none" for generating deliberately unsigned tokens to test that a backend rejects them. Asymmetric algorithms like RS256 or ES256 are not supported — those need a private key rather than a shared secret, which is a meaningfully different (and riskier) thing to be pasting into a browser tab.' },
                { question: 'Why does the token disappear when I edit the JSON?', answer: 'The header and payload boxes are validated as you type. If either contains invalid JSON, or the header\'s "alg" is something other than HS256 or none, or HS256 is selected with no secret entered, the tool shows the specific problem instead of a stale or wrong token — it never silently re-signs old, unrelated JSON.' },
                { question: 'Does this verify tokens too?', answer: 'No, this tool only builds and signs new tokens. To decode and inspect an existing token, use the JWT Decoder — note that it decodes and displays claims but does not verify signatures either, since verification needs the same secret or key that this generator uses to sign.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <LockOutlined sx={{ fontSize: 18, color: primary }} />
                        <Typography variant="caption" color="text.secondary">
                            JSON parsing and HMAC signing happen entirely in your browser via the Web Crypto API.
                        </Typography>
                    </Stack>

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Header (JSON)"
                        value={headerText}
                        onChange={e => setHeaderText(e.target.value)}
                        error={!!parsedHeader.error}
                        helperText={parsedHeader.error || ' '}
                        spellCheck={false}
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                        sx={{ mb: 1.5 }}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Payload (JSON)"
                        value={payloadText}
                        onChange={e => setPayloadText(e.target.value)}
                        error={!!parsedPayload.error}
                        helperText={parsedPayload.error || ' '}
                        spellCheck={false}
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                        sx={{ mb: 1 }}
                    />

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={!!parsedPayload.error}
                            onClick={() => applyTimestampClaim('iat', 0)}
                        >
                            Set iat = now
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={!!parsedPayload.error}
                            onClick={() => applyTimestampClaim('exp', 3600)}
                        >
                            Set exp = now + 1h
                        </Button>
                    </Stack>

                    <TextField
                        fullWidth
                        label="Secret (HS256 signing key)"
                        type={secretVisible ? 'text' : 'password'}
                        value={secret}
                        onChange={e => setSecret(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={alg === 'none'}
                        helperText={alg === 'none' ? 'Not used — the header\'s alg is "none" (unsigned).' : 'Used only locally to compute the signature — never transmitted.'}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setSecretVisible(v => !v)}
                                        edge="end"
                                        size="small"
                                        aria-label={secretVisible ? 'Hide secret' : 'Show secret'}
                                    >
                                        {secretVisible ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        sx={{ mb: 2 }}
                    />

                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                        Encoded JWT
                    </Typography>

                    {blockingMessage && <Alert severity="warning">{blockingMessage}</Alert>}
                    {!blockingMessage && signError && <Alert severity="error">{signError}</Alert>}

                    {!blockingMessage && !signError && token && (
                        <>
                            <Box sx={{
                                p: 2, borderRadius: 2, bgcolor: alpha(primary, 0.05),
                                border: `1px solid ${alpha(primary, 0.2)}`, fontFamily: 'monospace',
                                fontSize: '0.82rem', wordBreak: 'break-all', userSelect: 'text', mb: 1.5,
                            }}>
                                <Box component="span" sx={{ color: secondary }}>{segments[0]}</Box>
                                <Box component="span" sx={{ color: 'text.disabled' }}>.</Box>
                                <Box component="span" sx={{ color: primary }}>{segments[1]}</Box>
                                <Box component="span" sx={{ color: 'text.disabled' }}>.</Box>
                                <Box component="span" sx={{ color: theme.palette.warning.main }}>{segments[2] || ''}</Box>
                            </Box>
                            <Button variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
                                Copy
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snackbar}
                autoHideDuration={2000}
                onClose={() => setSnackbar(false)}
                message="Copied to clipboard"
            />
        </ServicePageShell>
    );
};

export default JwtGenerator;
