import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    LinearProgress,
    Stack,
    TextField,
    Typography,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
} from '@mui/material';
import {
    ExpandMore,
    Speed,
    Security,
    Dns,
    Http,
    Language,
    Warning,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

// Types matching Backend Response
type CheckResult = {
    redirects?: any;
    dns?: any;
    tls?: any;
    headers?: any;
    performance?: any;
    ports?: any;
};

type FullDiagnosticsResult = {
    url: string;
    domain: string;
    scan_time: string;
    score: number;
    critical_issues: string[];
    checks: CheckResult;
};

const WebsiteDiagnostics: React.FC = () => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<FullDiagnosticsResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleScan = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const resp = await apiClient.post(endpoints.services.websiteDiagnostics, { url: input });
            setResult(resp.data);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Diagnostics failed. Please check the URL.');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'success.main';
        if (score >= 70) return 'warning.main';
        return 'error.main';
    };

    return (
        <ServicePageShell
            icon={Speed}
            title="Website Health Scanner"
            subtitle="Comprehensive analysis of Security, Performance, DNS, and Server Configuration."
            maxWidth="md"
            about="Runs six checks against a URL in parallel from our server - TLS certificate validity, DNS records, security headers, redirect chain, page performance (time-to-first-byte and page size), and a scan of seven common ports (80, 443, 21, 22, 25, 53, 8080) - and rolls them into a single 0-100 score. The score starts at 100 and is docked for an invalid or missing TLS certificate, missing security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy), a slow time-to-first-byte, or a missing A/AAAA record, so it's meant as a fast triage view rather than an exhaustive security or performance audit."
            howToSteps={[
                { name: 'Enter the site URL', text: 'Type the full URL, including https://, into the Enter Website URL field.' },
                { name: 'Click Diagnose', text: 'The server runs all six checks in parallel - this usually takes a few seconds since DNS, TLS, and HTTP headers are fetched at the same time.' },
                { name: 'Read the score and critical issues', text: 'The large score at the top summarizes overall health; anything driving a major deduction, like an invalid TLS certificate, is called out under Critical Issues.' },
                { name: 'Drill into each card', text: 'Security Headers, SSL/TLS, DNS Configuration, and Performance Snapshot each get their own card; expand Redirect Chain & Raw Headers or Port Scan for the full detail.' },
            ]}
            faq={[
                { question: 'What does the score actually measure?', answer: "It's a deduction-based score starting at 100: -30 for an invalid or missing TLS certificate, -5 for each missing recommended security header, -10 for a time-to-first-byte over 1 second, and -20 for no A/AAAA record. It's a quick health signal, not a full security or performance audit." },
                { question: 'Which ports does the port scan check?', answer: 'A fixed set of seven commonly relevant ports - 80, 443, 21 (FTP), 22 (SSH), 25 (SMTP), 53 (DNS), and 8080 - each with a short connect timeout. It is not a full port-range scan.' },
                { question: "Why does my site show missing security headers even though it 'feels' secure?", answer: 'Headers like Content-Security-Policy or X-Frame-Options are opt-in - a site can serve perfectly functional pages over HTTPS without ever setting them. They guard against specific attack classes (clickjacking, certain injection vectors) rather than being required for the page to work.' },
                { question: 'Does a low score mean the site is broken?', answer: 'Not necessarily. A site can score low here for missing optional security headers while working fine for visitors - check the Critical Issues list first, since that highlights what actually needs fixing (like an expired certificate) rather than optional hardening.' },
            ]}
        >
            <Seo title="Website Diagnostics - Full Health Scan" toolId={28} />

            <Card sx={{ mb: 2, p: 2, flexShrink: 0 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        label="Enter Website URL"
                        placeholder="https://example.com"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<Speed />}
                        onClick={handleScan}
                        disabled={loading || !input.trim()}
                        sx={{ minWidth: 150, borderRadius: 2 }}
                    >
                        {loading ? 'Scanning...' : 'Diagnose'}
                    </Button>
                </Stack>
                {loading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Card>

            {result && (
                <Stack spacing={3} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
                    {/* Score Overview */}
                    <Card sx={{ p: 3, textAlign: 'center', position: 'relative', overflow: 'visible' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                <Typography variant="h1" sx={{ fontWeight: 900, color: getScoreColor(result.score) }}>
                                    {result.score}
                                </Typography>
                                <Typography variant="h6" sx={{ position: 'absolute', top: 10, right: -20, color: 'text.secondary' }}>
                                    /100
                                </Typography>
                            </Box>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        {result.critical_issues.length > 0 ? (
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="h6" color="error" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Warning /> Critical Issues Found
                                </Typography>
                                <Stack spacing={1}>
                                    {result.critical_issues.map((issue, idx) => (
                                        <Alert key={idx} severity="error" variant="outlined">{issue}</Alert>
                                    ))}
                                </Stack>
                            </Box>
                        ) : (
                            <Alert severity="success" variant="filled">Excellent! No critical issues found.</Alert>
                        )}
                    </Card>

                    <Grid container spacing={3}>
                        {/* Security Section */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Security color="primary" /> Security Headers
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    {result.checks.headers?.missing_security_headers?.length > 0 ? (
                                        <Alert severity="warning">
                                            Missing: {result.checks.headers.missing_security_headers.join(', ')}
                                        </Alert>
                                    ) : (
                                        <Alert severity="success">All key security headers present.</Alert>
                                    )}
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Server: {result.checks.headers?.headers?.Server || 'Unknown'}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* TLS/SSL Section */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Security color="primary" /> SSL/TLS
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    {result.checks.tls?.valid ? (
                                        <Box>
                                            <Alert severity="success" sx={{ mb: 1 }}>Certificate Valid</Alert>
                                            <Typography variant="body2">Issuer: {result.checks.tls.issuer?.CN || 'Unknown'}</Typography>
                                            <Typography variant="body2">Expires: {result.checks.tls.notAfter}</Typography>
                                        </Box>
                                    ) : (
                                        <Alert severity="error">Invalid Certificate: {result.checks.tls?.error}</Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* DNS Section */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Dns color="primary" /> DNS Configuration
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Stack spacing={1}>
                                        <Box>
                                            <Typography variant="subtitle2">A Records</Typography>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {result.checks.dns?.A?.join(', ') || 'None'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2">MX Records</Typography>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {result.checks.dns?.MX?.join(', ') || 'None'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Performance Section */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Speed color="primary" /> Performance Snapshot
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Stack direction="row" spacing={3}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">TTFB</Typography>
                                            <Typography variant="h5">{result.checks.performance?.ttfb_ms} ms</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Page Size</Typography>
                                            <Typography variant="h5">{(result.checks.performance?.size_bytes / 1024).toFixed(1)} KB</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Status</Typography>
                                            <Typography variant="h5">{result.checks.performance?.status}</Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Detailed Accordions */}
                    <Box>
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Http /> Redirect Chain & Raw Headers
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="subtitle2" gutterBottom>Redirect Chain:</Typography>
                                {result.checks.redirects?.hops?.map((hop: any, i: number) => (
                                    <Box key={i} sx={{ mb: 1, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                            {hop.status} {hop.url}
                                        </Typography>
                                    </Box>
                                ))}
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle2" gutterBottom>Raw Headers:</Typography>
                                <Box sx={{ backgroundColor: 'grey.900', p: 2, borderRadius: 1, maxHeight: 300, overflow: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', m: 0, color: '#00ff00' }}>
                                        {JSON.stringify(result.checks.headers?.headers, null, 2)}
                                    </Typography>
                                </Box>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Language /> Port Scan
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body1">
                                    Open Ports: {result.checks.ports?.open_ports?.join(', ') || 'None found (safe)'}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    </Box>

                </Stack>
            )}
        </ServicePageShell>
    );
};

export default WebsiteDiagnostics;
