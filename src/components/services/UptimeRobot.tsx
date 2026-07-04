import React, { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    TextField,
    Stack,
    MenuItem,
    Grid,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    useTheme,
    useMediaQuery,
    alpha,
    LinearProgress,
} from '@mui/material';
import {
    PlayArrow,
    Pause,
    Delete,
    Refresh,
    Add,
    ContentCopy,
    CheckCircle,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { getMonitorTypeSvgIcon } from '../layout/AnimatedSvgs';
import UptimeRobotLanding from './UptimeRobotLanding';

type MonitorType = 'http' | 'https' | 'keyword' | 'ping' | 'port' | 'ssl' | 'heartbeat';

interface LogEntry {
    at: string;
    message: string;
    status: 'up' | 'down' | 'info';
}

interface Monitor {
    id: number;
    name: string;
    monitor_type: MonitorType;
    monitor_type_display: string;
    target: string;
    keyword: string;
    port: number | null;
    interval_minutes: number;
    status: 'active' | 'paused';
    heartbeat_id: string;
    heartbeat_url: string | null;
    last_run_at: string | null;
    last_status: 'up' | 'down' | 'never';
    last_latency_ms: number;
    logs: LogEntry[];
    created_at: string;
}

const TYPE_LABELS: Record<MonitorType, string> = {
    http: 'HTTP(S)',
    https: 'HTTP(S)',
    keyword: 'Keyword Match',
    ping: 'Ping',
    port: 'Port Check',
    ssl: 'SSL Certificate',
    heartbeat: 'Heartbeat',
};

const TYPE_HELP: Record<MonitorType, string> = {
    http: 'Checks the target returns a 2xx/3xx HTTP status.',
    https: 'Checks the target returns a 2xx/3xx HTTP status.',
    keyword: 'Checks a specific string still appears in the page response.',
    ping: 'A lightweight TCP connect check — good for hosts with no web server.',
    port: 'Confirms a specific port on the host accepts connections.',
    ssl: 'Confirms the SSL handshake succeeds (certificate expiry warnings coming soon).',
    heartbeat: "A dead-man's-switch — your own script pings the given URL; if it goes quiet longer than the interval, this flips to down.",
};

const getHeartbeatSnippets = (url: string) => ({
    curl: `curl -fsS --retry 3 "${url}"`,
    crontab: `*/5 * * * * curl -fsS "${url}" >/dev/null 2>&1`,
    python: `import requests\nrequests.get("${url}", timeout=10)`,
    node: `fetch("${url}").catch(() => {});`,
});

const STATUS_COLOR = (theme: any, s: string) =>
    s === 'up' ? theme.palette.primary.main : s === 'down' ? theme.palette.error.main : theme.palette.text.secondary;

const UptimeRobotCommandCenter: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const primaryColor = theme.palette.primary.main;

    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [limit, setLimit] = useState(10);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState<MonitorType>('http');
    const [formTarget, setFormTarget] = useState('');
    const [formKeyword, setFormKeyword] = useState('');
    const [formPort, setFormPort] = useState('');
    const [formInterval, setFormInterval] = useState(5);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [snippetTab, setSnippetTab] = useState(0);
    const [copied, setCopied] = useState(false);

    const fetchMonitors = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await apiClient.get(endpoints.services.uptimeMonitors);
            setMonitors(res.data.monitors || []);
            setLimit(res.data.limit ?? 10);
            setError(null);
            setSelectedId((prev) => prev ?? (res.data.monitors?.[0]?.id ?? null));
        } catch (e) {
            setError('Could not load monitors. The local server may be unreachable.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMonitors();
        const interval = setInterval(() => fetchMonitors(true), 30000);
        return () => clearInterval(interval);
    }, [fetchMonitors]);

    const selectedMonitor = monitors.find((m) => m.id === selectedId) || null;

    const resetForm = () => {
        setFormName(''); setFormType('http'); setFormTarget(''); setFormKeyword('');
        setFormPort(''); setFormInterval(5); setFormError(null);
    };

    const handleAddMonitor = async () => {
        setFormError(null);
        if (!formName.trim()) { setFormError('Name is required'); return; }
        if (formType !== 'heartbeat' && !formTarget.trim()) { setFormError('Target is required'); return; }
        if (formType === 'keyword' && !formKeyword.trim()) { setFormError('Keyword is required'); return; }

        setSubmitting(true);
        try {
            const res = await apiClient.post(endpoints.services.uptimeMonitors, {
                name: formName.trim(),
                monitor_type: formType,
                target: formTarget.trim(),
                keyword: formKeyword.trim(),
                port: formType === 'port' ? formPort : undefined,
                interval_minutes: formInterval,
            });
            setMonitors((prev) => [res.data, ...prev]);
            setSelectedId(res.data.id);
            setOpenAddDialog(false);
            resetForm();
        } catch (e: any) {
            setFormError(e?.response?.data?.error || 'Failed to create monitor');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (id: number) => {
        try {
            const res = await apiClient.post(endpoints.services.uptimeMonitorDetail(id), { action: 'toggle' });
            setMonitors((prev) => prev.map((m) => (m.id === id ? res.data : m)));
        } catch (e) { /* keep prior state on failure */ }
    };

    const handleRunNow = async (id: number) => {
        try {
            const res = await apiClient.post(endpoints.services.uptimeMonitorDetail(id), { action: 'run_now' });
            setMonitors((prev) => prev.map((m) => (m.id === id ? res.data : m)));
        } catch (e) { /* keep prior state on failure */ }
    };

    const handleDelete = async (id: number) => {
        try {
            await apiClient.delete(endpoints.services.uptimeMonitorDetail(id));
            setMonitors((prev) => prev.filter((m) => m.id !== id));
            setSelectedId((prev) => (prev === id ? null : prev));
        } catch (e) { /* keep prior state on failure */ }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const activeCount = monitors.filter((m) => m.status === 'active').length;
    const upCount = monitors.filter((m) => m.status === 'active' && m.last_status === 'up').length;
    const downCount = monitors.filter((m) => m.status === 'active' && m.last_status === 'down').length;
    const pausedCount = monitors.filter((m) => m.status === 'paused').length;
    const healthGrade = activeCount > 0 ? ((upCount / activeCount) * 100).toFixed(1) : '0.0';

    const snippets = selectedMonitor?.heartbeat_url ? getHeartbeatSnippets(selectedMonitor.heartbeat_url) : null;
    const snippetKeys = snippets ? (Object.keys(snippets) as (keyof typeof snippets)[]) : [];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
            <Seo title="Uptime Robot Command Center - Private Uptime Monitoring" />

            {/* Header */}
            <Card sx={{
                mb: 4, p: 3, position: 'relative', overflow: 'hidden',
                background: 'rgba(13, 14, 18, 0.4)', border: '1px solid rgba(255,255,255,0.05)',
                '&::before': {
                    content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                    background: `linear-gradient(90deg, ${primaryColor}, ${theme.palette.secondary.main})`,
                },
            }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{
                            width: 52, height: 52, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: alpha(primaryColor, 0.1), color: primaryColor,
                        }}>
                            {getMonitorTypeSvgIcon('http')}
                        </Box>
                        <Box>
                            <Typography variant="h5" fontWeight={900}>Uptime Robot Command Center</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {monitors.length} / {limit} monitors used — private to your account
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={() => fetchMonitors()}>Refresh</Button>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            disabled={monitors.length >= limit}
                            onClick={() => setOpenAddDialog(true)}
                            sx={{ bgcolor: primaryColor, color: '#000', '&:hover': { bgcolor: alpha(primaryColor, 0.85) } }}
                        >
                            Add Monitor
                        </Button>
                    </Stack>
                </Stack>
            </Card>

            {error && (
                <Card sx={{ mb: 3, p: 2, bgcolor: alpha(theme.palette.error.main, 0.08), border: `1px solid ${alpha(theme.palette.error.main, 0.3)}` }}>
                    <Typography color="error.main" variant="body2">{error}</Typography>
                </Card>
            )}

            {/* Stat cards */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                {[
                    { label: 'Workspace Health', value: `${healthGrade}%` },
                    { label: 'Active & Up', value: `${upCount} / ${activeCount}` },
                    { label: 'Active Outages', value: downCount, color: downCount > 0 ? theme.palette.error.main : undefined },
                    { label: 'Paused Monitors', value: pausedCount },
                ].map((stat) => (
                    <Grid item xs={6} sm={3} key={stat.label}>
                        <Card sx={{ p: 2.5, textAlign: 'center', background: 'rgba(13, 14, 18, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Typography variant="h4" fontWeight={900} sx={{ color: stat.color || 'primary.main' }}>{stat.value}</Typography>
                            <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {loading ? (
                <LinearProgress sx={{ mb: 4 }} />
            ) : monitors.length === 0 ? (
                <Card sx={{ p: 6, textAlign: 'center', background: 'rgba(13, 14, 18, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>No monitors yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Add your first monitor — pick a type, set a target and an interval.
                    </Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAddDialog(true)}
                        sx={{ bgcolor: primaryColor, color: '#000' }}>
                        Add Monitor
                    </Button>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {/* List */}
                    <Grid item xs={12} md={5}>
                        <Card sx={{ background: 'rgba(13, 14, 18, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {isMobile ? (
                                <Stack divider={<Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} />}>
                                    {monitors.map((m) => (
                                        <Box key={m.id} onClick={() => setSelectedId(m.id)} sx={{
                                            p: 2, cursor: 'pointer',
                                            bgcolor: selectedId === m.id ? alpha(primaryColor, 0.06) : 'transparent',
                                        }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" fontWeight={700}>{m.name}</Typography>
                                                <Chip size="small" label={m.status === 'paused' ? 'Paused' : m.last_status} sx={{
                                                    bgcolor: alpha(STATUS_COLOR(theme, m.status === 'paused' ? 'info' : m.last_status), 0.15),
                                                    color: STATUS_COLOR(theme, m.status === 'paused' ? 'info' : m.last_status),
                                                    textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem',
                                                }} />
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary">{TYPE_LABELS[m.monitor_type]}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Monitor</TableCell>
                                                <TableCell>Type</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell align="right">Controls</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {monitors.map((m) => (
                                                <TableRow
                                                    key={m.id}
                                                    hover
                                                    selected={selectedId === m.id}
                                                    onClick={() => setSelectedId(m.id)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}>{m.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{m.target || '(heartbeat)'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip size="small" variant="outlined" label={TYPE_LABELS[m.monitor_type]} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip size="small" label={m.status === 'paused' ? 'PAUSED' : m.last_status.toUpperCase()} sx={{
                                                            bgcolor: alpha(STATUS_COLOR(theme, m.status === 'paused' ? 'info' : m.last_status), 0.15),
                                                            color: STATUS_COLOR(theme, m.status === 'paused' ? 'info' : m.last_status),
                                                            fontWeight: 700, fontSize: '0.65rem',
                                                        }} />
                                                    </TableCell>
                                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                        <Tooltip title={m.status === 'active' ? 'Pause' : 'Resume'}>
                                                            <IconButton size="small" onClick={() => handleToggle(m.id)}>
                                                                {m.status === 'active' ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Check now">
                                                            <IconButton size="small" onClick={() => handleRunNow(m.id)}><Refresh fontSize="small" /></IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton size="small" onClick={() => handleDelete(m.id)}><Delete fontSize="small" color="error" /></IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Card>
                    </Grid>

                    {/* Detail */}
                    <Grid item xs={12} md={7}>
                        {selectedMonitor ? (
                            <Card sx={{ p: 3, background: 'rgba(13, 14, 18, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                    <Box sx={{
                                        width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        bgcolor: alpha(STATUS_COLOR(theme, selectedMonitor.last_status), 0.1), color: STATUS_COLOR(theme, selectedMonitor.last_status),
                                    }}>
                                        {getMonitorTypeSvgIcon(selectedMonitor.monitor_type)}
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="h6" fontWeight={800}>{selectedMonitor.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {selectedMonitor.target || 'Heartbeat listener'} · Checked every {selectedMonitor.interval_minutes} min
                                        </Typography>
                                    </Box>
                                    {selectedMonitor.monitor_type !== 'heartbeat' && (
                                        <Tooltip title="Check now">
                                            <IconButton onClick={() => handleRunNow(selectedMonitor.id)}><Refresh /></IconButton>
                                        </Tooltip>
                                    )}
                                </Stack>

                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6} sm={4}>
                                        <Card sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                                            <Typography variant="h6" fontWeight={800}>{selectedMonitor.last_latency_ms}ms</Typography>
                                            <Typography variant="caption" color="text.secondary">Last Latency</Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} sm={4}>
                                        <Card sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                                            <Typography variant="h6" fontWeight={800} sx={{ color: STATUS_COLOR(theme, selectedMonitor.last_status) }}>
                                                {selectedMonitor.last_status.toUpperCase()}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">Last Status</Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Card sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                                            <Typography variant="body2" fontWeight={700}>
                                                {selectedMonitor.last_run_at ? new Date(selectedMonitor.last_run_at).toLocaleTimeString() : 'Never'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">Last Checked</Typography>
                                        </Card>
                                    </Grid>
                                </Grid>

                                {/* Recent check history strip — real data from logs, most recent first reversed to read left-to-right oldest->newest */}
                                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Recent Check History</Typography>
                                <Stack direction="row" spacing={0.5} sx={{ mb: 3 }}>
                                    {[...selectedMonitor.logs].reverse().filter((l) => l.status !== 'info').slice(-24).map((l, i) => (
                                        <Tooltip title={`${l.at} — ${l.message}`} key={i}>
                                            <Box sx={{ flex: 1, height: 28, borderRadius: 0.5, bgcolor: alpha(STATUS_COLOR(theme, l.status), 0.7) }} />
                                        </Tooltip>
                                    ))}
                                    {selectedMonitor.logs.filter((l) => l.status !== 'info').length === 0 && (
                                        <Typography variant="caption" color="text.secondary">No checks recorded yet.</Typography>
                                    )}
                                </Stack>

                                {/* Heartbeat snippet UI */}
                                {selectedMonitor.monitor_type === 'heartbeat' && snippets && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            Ping This URL From Your Job
                                        </Typography>
                                        <Tabs value={snippetTab} onChange={(_, v) => setSnippetTab(v)} sx={{ mb: 1, minHeight: 32 }}>
                                            {snippetKeys.map((k) => <Tab key={k} label={k} sx={{ minHeight: 32, textTransform: 'none' }} />)}
                                        </Tabs>
                                        <Box sx={{ position: 'relative' }}>
                                            <Box component="pre" sx={{
                                                p: 2, borderRadius: 1, bgcolor: '#050608', fontFamily: 'monospace', fontSize: '0.8rem',
                                                overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', m: 0,
                                            }}>
                                                {snippets[snippetKeys[snippetTab]]}
                                            </Box>
                                            <IconButton size="small" onClick={() => copyToClipboard(snippets[snippetKeys[snippetTab]])}
                                                sx={{ position: 'absolute', top: 6, right: 6 }}>
                                                {copied ? <CheckCircle fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
                                            </IconButton>
                                        </Box>
                                    </Box>
                                )}

                                {/* Terminal log viewer */}
                                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Log Stream</Typography>
                                <Box sx={{
                                    bgcolor: '#050608', borderRadius: 1, p: 2, fontFamily: 'monospace', fontSize: '0.78rem',
                                    maxHeight: 220, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)',
                                }}>
                                    {selectedMonitor.logs.length === 0 && <Typography variant="caption" color="text.secondary">No log entries yet.</Typography>}
                                    {selectedMonitor.logs.map((l, i) => (
                                        <Box key={i} sx={{ color: STATUS_COLOR(theme, l.status), mb: 0.5 }}>
                                            [{l.at}] {l.message}
                                        </Box>
                                    ))}
                                </Box>
                            </Card>
                        ) : (
                            <Card sx={{ p: 6, textAlign: 'center', background: 'rgba(13, 14, 18, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Typography color="text.secondary">Select a monitor to see details.</Typography>
                            </Card>
                        )}
                    </Grid>
                </Grid>
            )}

            {/* Add Monitor Dialog */}
            <Dialog open={openAddDialog} onClose={() => { setOpenAddDialog(false); resetForm(); }} maxWidth="xs" fullWidth>
                <DialogTitle>Add Monitor</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField label="Name" value={formName} onChange={(e) => setFormName(e.target.value)} fullWidth autoFocus />
                        <TextField select label="Type" value={formType} onChange={(e) => setFormType(e.target.value as MonitorType)} fullWidth
                            helperText={TYPE_HELP[formType]}>
                            {(Object.keys(TYPE_LABELS) as MonitorType[]).filter((t) => t !== 'https').map((t) => (
                                <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>
                            ))}
                        </TextField>
                        {formType !== 'heartbeat' && (
                            <TextField label="Target (URL or host)" value={formTarget} onChange={(e) => setFormTarget(e.target.value)}
                                placeholder="example.com" fullWidth />
                        )}
                        {formType === 'keyword' && (
                            <TextField label="Keyword to look for" value={formKeyword} onChange={(e) => setFormKeyword(e.target.value)} fullWidth />
                        )}
                        {formType === 'port' && (
                            <TextField label="Port" type="number" value={formPort} onChange={(e) => setFormPort(e.target.value)} fullWidth />
                        )}
                        <TextField select label="Check interval" value={formInterval} onChange={(e) => setFormInterval(Number(e.target.value))} fullWidth>
                            {[1, 5, 10, 15, 30, 60].map((n) => <MenuItem key={n} value={n}>{n} minute{n > 1 ? 's' : ''}</MenuItem>)}
                        </TextField>
                        {formError && <Typography color="error.main" variant="body2">{formError}</Typography>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setOpenAddDialog(false); resetForm(); }}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddMonitor} disabled={submitting}
                        sx={{ bgcolor: primaryColor, color: '#000' }}>
                        {submitting ? 'Creating...' : 'Create Monitor'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

const UptimeRobot: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated || !user) {
        return <UptimeRobotLanding />;
    }
    return <UptimeRobotCommandCenter />;
};

export default UptimeRobot;
