import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Typography, Chip, Alert, Stack, Paper, useTheme, alpha, Divider } from '@mui/material';
import { VpnKey, CheckCircle, Warning } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const base64UrlDecode = (str: string): string => {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    try { return decodeURIComponent(atob(padded).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')); }
    catch { return atob(padded); }
};

interface DecodedJwt { header: any; payload: any; signature: string; isExpired: boolean | null }

const decodeJwt = (token: string): DecodedJwt | null => {
    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;
    try {
        const header = JSON.parse(base64UrlDecode(parts[0]));
        const payload = JSON.parse(base64UrlDecode(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        const isExpired = payload.exp ? payload.exp < now : null;
        return { header, payload, signature: parts[2], isExpired };
    } catch { return null; }
};

const JsonDisplay: React.FC<{ data: any; label: string; color: string }> = ({ data, label, color }) => {
    const theme = useTheme();
    return (
        <Paper sx={{ p: 2, bgcolor: alpha(color, 0.04), border: `1px solid ${alpha(color, 0.15)}`, borderRadius: 2 }}>
            <Typography variant="caption" fontWeight="700" color={color} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>{label}</Typography>
            <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: '0.82rem', color: 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(data, null, 2)}
            </Box>
        </Paper>
    );
};

const JwtDecoder: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;
    const [token, setToken] = useState('');
    const decoded = token.trim() ? decodeJwt(token.trim()) : null;
    const invalid = token.trim() && !decoded;

    const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString();

    return (
        <ServicePageShell
            icon={VpnKey}
            title="JWT Decoder"
            subtitle="Decode JSON Web Tokens in your browser — your token never leaves your device"
            maxWidth="lg"
            howToSteps={[
                { name: 'Paste your JWT', text: 'Copy your JWT token from your app, API response, or cookie and paste it into the input field.' },
                { name: 'Inspect decoded claims', text: 'The tool instantly decodes the header and payload showing algorithm, subject, issuer, and custom claims.' },
                { name: 'Check expiry status', text: 'The expiry chip tells you if the token is valid, expired, or has no expiry set — no server round-trip needed.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <TextField
                        fullWidth multiline rows={4}
                        label="Paste JWT token"
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' } }}
                        sx={{ mb: 2.5 }}
                    />

                    {invalid && <Alert severity="error" sx={{ mb: 2 }}>Invalid JWT format. A JWT must have 3 dot-separated parts.</Alert>}

                    {decoded && (
                        <Box>
                            {/* Status */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                                <Chip
                                    icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
                                    label="Valid Structure"
                                    size="small"
                                    sx={{ bgcolor: alpha(primary, 0.12), color: primary, fontWeight: 700 }}
                                />
                                {decoded.isExpired === true && (
                                    <Chip icon={<Warning sx={{ fontSize: '14px !important' }} />} label="Token Expired" size="small" sx={{ bgcolor: alpha('#ef4444', 0.12), color: '#ef4444', fontWeight: 700 }} />
                                )}
                                {decoded.isExpired === false && (
                                    <Chip icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} label="Token Valid" size="small" sx={{ bgcolor: alpha(primary, 0.12), color: primary, fontWeight: 700 }} />
                                )}
                                {decoded.header?.alg && (
                                    <Chip label={`Algorithm: ${decoded.header.alg}`} size="small" sx={{ bgcolor: alpha(secondary, 0.1), color: secondary }} />
                                )}
                            </Box>

                            <Stack spacing={2}>
                                <JsonDisplay data={decoded.header} label="Header" color={secondary} />
                                <JsonDisplay data={decoded.payload} label="Payload" color={primary} />

                                {decoded.payload && (
                                    <Paper sx={{ p: 2, bgcolor: alpha('#fff', 0.02), border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                        <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1.5 }}>
                                            Parsed Claims
                                        </Typography>
                                        <Stack spacing={1}>
                                            {decoded.payload.iat && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="caption" color="text.disabled">Issued At</Typography><Typography variant="caption" fontFamily="monospace">{formatTime(decoded.payload.iat)}</Typography></Box>}
                                            {decoded.payload.exp && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="caption" color="text.disabled">Expires At</Typography><Typography variant="caption" fontFamily="monospace" color={decoded.isExpired ? 'error.main' : primary}>{formatTime(decoded.payload.exp)}</Typography></Box>}
                                            {decoded.payload.nbf && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="caption" color="text.disabled">Not Before</Typography><Typography variant="caption" fontFamily="monospace">{formatTime(decoded.payload.nbf)}</Typography></Box>}
                                            {decoded.payload.sub && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="caption" color="text.disabled">Subject</Typography><Typography variant="caption" fontFamily="monospace">{decoded.payload.sub}</Typography></Box>}
                                            {decoded.payload.iss && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="caption" color="text.disabled">Issuer</Typography><Typography variant="caption" fontFamily="monospace">{decoded.payload.iss}</Typography></Box>}
                                        </Stack>
                                    </Paper>
                                )}

                                <Paper sx={{ p: 2, bgcolor: alpha('#fff', 0.02), border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                    <Typography variant="caption" fontWeight="700" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>Signature</Typography>
                                    <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.disabled', wordBreak: 'break-all' }}>{decoded.signature}</Box>
                                </Paper>

                                <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                                    ⚠️ This decoder only decodes — it does NOT verify the signature. Never trust a JWT's claims without server-side signature verification.
                                </Alert>
                            </Stack>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default JwtDecoder;
