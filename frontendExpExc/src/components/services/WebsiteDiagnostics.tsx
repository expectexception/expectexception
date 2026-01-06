import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    LinearProgress,
    Stack,
    TextField,
    Typography,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider
} from '@mui/material';
import {
    ExpandMore,
    Speed,
    Security,
    Dns,
    Http,
    Language,
    CheckCircle,
    Warning,
    Error as ErrorIcon
} from '@mui/icons-material';
import Seo from '../seo/Seo';
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
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Seo title="Website Diagnostics - Full Health Scan" toolId={28} />

            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>
                    Website Health Scanner
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Comprehensive analysis of Security, Performance, DNS, and Server Configuration.
                </Typography>
            </Box>

            <Card sx={{ mb: 4, p: 2 }}>
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
                <Stack spacing={4}>
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
                                    <Box key={i} sx={{ mb: 1, pl: 2, borderLeft: '2px solid #ccc' }}>
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
        </Container>
    );
};

export default WebsiteDiagnostics;
