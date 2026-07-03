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
    Stack,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
} from '@mui/material';
import { ExpandMore, Dns } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

type ResolverDnsResult = {
    A: string[];
    AAAA: string[];
    CNAME: string[];
    MX: Array<{ preference: number; exchange: string }>;
    TXT: string[];
};

type DnsResults = {
    [resolverName: string]: ResolverDnsResult;
};

type Result = {
    domain: string;
    results: DnsResults;
    diagnosis?: string[];
    meta?: {
        errors?: Record<string, Record<string, string>>;
    };
};

const DnsLookup: React.FC = () => {
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Result | null>(null);

    const handleLookup = async () => {
        const trimmed = domain.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const resp = await apiClient.post(endpoints.services.dnsLookup, { domain: trimmed });
            setResult(resp.data);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'DNS lookup failed');
        } finally {
            setLoading(false);
        }
    };

    const renderList = (items: any[]) => {
        if (!items || items.length === 0) {
            return (
                <Typography variant="body2" color="text.secondary">None</Typography>
            );
        }
        return (
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {items.map((v, idx) => (
                    <Box component="li" key={idx} sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.9rem' }}>
                        {typeof v === 'string' ? v : JSON.stringify(v)}
                    </Box>
                ))}
            </Box>
        );
    };

    return (
        <ServicePageShell
            icon={Dns}
            title="DNS Lookup + Propagation Check"
            subtitle="Check A/AAAA/CNAME/MX/TXT records across multiple resolvers to debug DNS issues."
            maxWidth="lg"
        >
            <Seo
                title="DNS Lookup + Propagation Check"
                toolId={27}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 2 }}>
                {error && <Alert severity="error" sx={{ flexShrink: 0 }}>{error}</Alert>}

                <Card sx={{ flexShrink: 0 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                                fullWidth
                                label="Domain or URL"
                                placeholder="example.com"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                            />
                            <Button
                                variant="contained"
                                onClick={handleLookup}
                                startIcon={<Dns />}
                                disabled={loading || !domain.trim()}
                                sx={{ minWidth: { xs: '100%', md: 220 } }}
                            >
                                Lookup
                            </Button>
                        </Stack>

                        {loading && <LinearProgress sx={{ mt: 2 }} />}
                    </CardContent>
                </Card>

                {result && (
                    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                        {Array.isArray(result.diagnosis) && result.diagnosis.length > 0 && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {result.diagnosis.map((d, i) => (
                                        <Chip key={i} label={d} size="small" />
                                    ))}
                                </Box>
                            </Alert>
                        )}

                        <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                            Results for <Box component="span" sx={{ fontFamily: 'monospace' }}>{result.domain}</Box>
                        </Typography>

                        {Object.entries(result.results || {}).map(([resolverName, data]) => {
                            const resolverErrors = result.meta?.errors?.[resolverName] || {};
                            const hasErrors = Object.keys(resolverErrors).length > 0;

                            return (
                            <Accordion key={resolverName} defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography sx={{ fontWeight: 700 }}>{resolverName}</Typography>
                                        {hasErrors && <Chip size="small" color="warning" label="partial errors" />}
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {hasErrors && (
                                        <Alert severity="warning" sx={{ mb: 2 }}>
                                            {Object.entries(resolverErrors).map(([rt, err]) => (
                                                <Box key={rt} sx={{ fontFamily: 'monospace' }}>
                                                    {rt}: {err}
                                                </Box>
                                            ))}
                                        </Alert>
                                    )}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                        <Box>
                                            <Typography variant="subtitle2">A</Typography>
                                            {renderList(data.A || [])}
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2">AAAA</Typography>
                                            {renderList(data.AAAA || [])}
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2">CNAME</Typography>
                                            {renderList(data.CNAME || [])}
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2">MX</Typography>
                                            {renderList((data.MX || []).map((m) => `${m.preference} ${m.exchange}`))}
                                        </Box>
                                        <Box sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }}>
                                            <Typography variant="subtitle2">TXT</Typography>
                                            {renderList(data.TXT || [])}
                                        </Box>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                            );
                        })}
                    </Box>
                )}
            </Box>
        </ServicePageShell>
    );
};

export default DnsLookup;
