import React, { useState, useEffect, useRef } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Alert,
    LinearProgress,
    TextField,
    Stack,
    MenuItem,
    Grid,
    Paper,
    Chip,
    Divider,
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
} from '@mui/material';
import {
    NetworkCheck,
    Timer,
    Security,
    Language,
    Search,
    Dns,
    Sensors,
    Code,
    ContentCopy,
    CheckCircle,
    PlayArrow,
    Pause,
    Delete,
    Refresh,
    Add,
    Info,
    GraphicEq,
    Warning,
    AccessAlarm,
    Bolt,
    FiberManualRecord,
    PowerSettingsNew,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

type MonitorType = 'http' | 'https' | 'keyword' | 'ping' | 'port' | 'ssl' | 'heartbeat';

interface LocalMonitor {
    id: string;
    name: string;
    target: string;
    type: MonitorType;
    keyword?: string;
    port?: string;
    status: 'up' | 'down' | 'paused' | 'checking';
    lastChecked: string;
    latencyHistory: number[];
    statusHistory: ('up' | 'down')[];
    logs: string[];
    details: any;
    regions?: any[];
}

interface ServerTrigger {
    id: string;
    name: string;
    target: string;
    interval_minutes: number;
    status: 'active' | 'paused';
    last_run: string | null;
    last_status: string;
    last_latency: number;
    logs: string[];
}

// Injected premium glassmorphism styling tokens
const glassStyle = {
    background: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

const hoverGlassStyle = {
    ...glassStyle,
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.45)',
    transform: 'translateY(-2px)'
};

const innerGlassStyle = {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    p: 2
};

const UptimeRobot: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // 0 = Live Diagnostics, 1 = Auto-Trigger Scheduler
    const [activeMainTab, setActiveMainTab] = useState(0);

    // Diagnostics State
    const [monitors, setMonitors] = useState<LocalMonitor[]>(() => {
        const saved = localStorage.getItem('uptime_monitors');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {}
        }
        return [
            {
                id: 'seed-google-http',
                name: 'Google Homepage (HTTP)',
                target: 'google.com',
                type: 'http',
                status: 'up',
                lastChecked: new Date().toLocaleTimeString(),
                latencyHistory: [45, 52, 49, 41, 44, 48, 50, 47, 43, 46],
                statusHistory: Array(24).fill('up'),
                logs: ['[System Initialization] Default seed monitor registered successfully.'],
                details: { status_code: 200 }
            },
            {
                id: 'seed-cloudflare-port',
                name: 'Cloudflare Port Check (Port 80)',
                target: '1.1.1.1',
                type: 'port',
                port: '80',
                status: 'up',
                lastChecked: new Date().toLocaleTimeString(),
                latencyHistory: [15, 18, 12, 14, 16, 15, 19, 13, 15, 17],
                statusHistory: Array(24).fill('up'),
                logs: ['[System Initialization] Default seed monitor registered successfully.'],
                details: {}
            },
            {
                id: 'seed-google-dns',
                name: 'Google Public DNS (Ping)',
                target: '8.8.8.8',
                type: 'ping',
                status: 'up',
                lastChecked: new Date().toLocaleTimeString(),
                latencyHistory: [22, 25, 21, 24, 20, 26, 23, 21, 25, 22],
                statusHistory: Array(24).fill('up'),
                logs: ['[System Initialization] Default seed monitor registered successfully.'],
                details: {}
            }
        ];
    });

    useEffect(() => {
        localStorage.setItem('uptime_monitors', JSON.stringify(monitors));
    }, [monitors]);

    // Triggers (Server-Side Scheduler) State
    const [triggers, setTriggers] = useState<ServerTrigger[]>([]);
    const [selectedTrigger, setSelectedTrigger] = useState<ServerTrigger | null>(null);
    const [openAddTriggerDialog, setOpenAddTriggerDialog] = useState(false);
    const [newTriggerName, setNewTriggerName] = useState('');
    const [newTriggerTarget, setNewTriggerTarget] = useState('');
    const [newTriggerInterval, setNewTriggerInterval] = useState(5);

    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [newName, setNewName] = useState('');
    const [newTarget, setNewTarget] = useState('');
    const [newType, setNewType] = useState<MonitorType>('http');
    const [newKeyword, setNewKeyword] = useState('');
    const [newPort, setNewPort] = useState('80');

    const [selectedMonitor, setSelectedMonitor] = useState<LocalMonitor | null>(monitors[0] || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snippetTab, setSnippetTab] = useState(0);
    const [copied, setCopied] = useState(false);

    const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
    const triggerTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Auto-Triggers from Django Server
    const fetchTriggers = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const response = await apiClient.get(endpoints.services.uptimeTriggers);
            setTriggers(response.data);
            if (response.data.length > 0) {
                setSelectedTrigger(prev => {
                    if (!prev) return response.data[0];
                    const found = response.data.find((t: any) => t.id === prev.id);
                    return found || response.data[0];
                });
            } else {
                setSelectedTrigger(null);
            }
        } catch (e) {
            console.error("Failed to load background triggers", e);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Load triggers on boot and poll periodically
    useEffect(() => {
        fetchTriggers();
        triggerTimerRef.current = setInterval(() => {
            fetchTriggers(true);
        }, 10000); // Poll server every 10s for log updates

        return () => {
            if (triggerTimerRef.current) clearInterval(triggerTimerRef.current);
        };
    }, []);

    // Add Trigger Background Schedule
    const handleAddTrigger = async () => {
        if (!newTriggerName.trim() || !newTriggerTarget.trim()) return;
        setLoading(true);
        try {
            const payload = {
                name: newTriggerName,
                target: newTriggerTarget,
                interval_minutes: newTriggerInterval
            };
            const response = await apiClient.post(endpoints.services.uptimeTriggers, payload);
            setTriggers(prev => [...prev, response.data]);
            setSelectedTrigger(response.data);
            setOpenAddTriggerDialog(false);
            setNewTriggerName('');
            setNewTriggerTarget('');
            setNewTriggerInterval(5);
        } catch (e) {
            console.error("Failed to schedule keep alive", e);
        } finally {
            setLoading(false);
        }
    };

    // Toggle Trigger Status
    const handleToggleTrigger = async (id: string) => {
        try {
            const response = await apiClient.post(endpoints.services.uptimeTriggerDetail(id), { action: 'toggle' });
            setTriggers(response.data);
            const updated = response.data.find((t: any) => t.id === id);
            if (updated && selectedTrigger?.id === id) {
                setSelectedTrigger(updated);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Force Trigger run now
    const handleForceTriggerNow = async (id: string) => {
        setLoading(true);
        try {
            const response = await apiClient.post(endpoints.services.uptimeTriggerDetail(id), { action: 'run_now' });
            setTriggers(response.data);
            const updated = response.data.find((t: any) => t.id === id);
            if (updated && selectedTrigger?.id === id) {
                setSelectedTrigger(updated);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Delete Trigger
    const handleDeleteTrigger = async (id: string) => {
        try {
            const response = await apiClient.delete(endpoints.services.uptimeTriggerDetail(id));
            setTriggers(response.data);
            if (selectedTrigger?.id === id) {
                setSelectedTrigger(response.data[0] || null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Single Monitor Check execution
    const executeMonitorCheck = async (monitor: LocalMonitor): Promise<LocalMonitor> => {
        if (monitor.status === 'paused') return monitor;
        try {
            const payload: Record<string, any> = {
                target: monitor.target,
                type: monitor.type,
            };
            if (monitor.type === 'keyword') {
                payload.keyword = monitor.keyword;
            } else if (monitor.type === 'port') {
                payload.port = monitor.port;
            }

            const response = await apiClient.post(endpoints.services.uptimeRobot, payload);
            const data = response.data;

            const updatedLogs = [
                `[${new Date().toLocaleTimeString()}] Live check completed. Status: ${data.status.toUpperCase()} (${data.response_time_ms}ms)`,
                ...data.logs,
                ...monitor.logs
            ].slice(0, 50);

            const updatedLatency = [...monitor.latencyHistory, data.response_time_ms].slice(-10);
            const updatedStatus = [...monitor.statusHistory, data.status as 'up' | 'down'].slice(-24);

            return {
                ...monitor,
                status: data.status,
                lastChecked: new Date().toLocaleTimeString(),
                latencyHistory: updatedLatency,
                statusHistory: updatedStatus,
                logs: updatedLogs,
                details: data.details || {},
                regions: data.regions || []
            };
        } catch (e: any) {
            const errMsg = e?.response?.data?.error || 'Target unresolvable or DNS connection timed out.';
            const updatedLogs = [
                `[${new Date().toLocaleTimeString()}] Live check failed: ${errMsg}`,
                ...monitor.logs
            ].slice(0, 50);

            const updatedLatency = [...monitor.latencyHistory, 0].slice(-10);
            const updatedStatus = [...monitor.statusHistory, 'down' as 'down'].slice(-24);

            return {
                ...monitor,
                status: 'down',
                lastChecked: new Date().toLocaleTimeString(),
                latencyHistory: updatedLatency,
                statusHistory: updatedStatus,
                logs: updatedLogs,
                details: { error: errMsg }
            };
        }
    };

    // Run background loop daemon
    const runBackgroundDaemon = async () => {
        setMonitors(prev => prev.map(m => m.status !== 'paused' ? { ...m, status: 'checking' } : m));
        const updatedList: LocalMonitor[] = [];
        for (const mon of monitors) {
            if (mon.status === 'paused') {
                updatedList.push(mon);
            } else {
                const checked = await executeMonitorCheck(mon);
                updatedList.push(checked);
            }
        }
        setMonitors(updatedList);
        setSelectedMonitor(prev => {
            if (!prev) return null;
            const live = updatedList.find(m => m.id === prev.id);
            return live || prev;
        });
    };

    useEffect(() => {
        runBackgroundDaemon();
        checkTimerRef.current = setInterval(() => {
            runBackgroundDaemon();
        }, 30000);

        return () => {
            if (checkTimerRef.current) clearInterval(checkTimerRef.current);
        };
    }, []);

    // Manual instant check
    const handleCheckNow = async (id: string) => {
        setLoading(true);
        setError(null);
        const targetMon = monitors.find(m => m.id === id);
        if (!targetMon) return;

        setMonitors(prev => prev.map(m => m.id === id ? { ...m, status: 'checking' } : m));
        const updated = await executeMonitorCheck(targetMon);
        setMonitors(prev => prev.map(m => m.id === id ? updated : m));
        if (selectedMonitor?.id === id) {
            setSelectedMonitor(updated);
        }
        setLoading(false);
    };

    // Add Monitor
    const handleAddMonitor = () => {
        if (!newName.trim()) return;
        if (!newTarget.trim() && newType !== 'heartbeat') return;

        const id = 'mon-' + Math.random().toString(36).substr(2, 9);
        const newMon: LocalMonitor = {
            id,
            name: newName,
            target: newTarget || 'Heartbeat Webhook Listener',
            type: newType,
            keyword: newType === 'keyword' ? newKeyword : undefined,
            port: newType === 'port' ? newPort : undefined,
            status: 'up',
            lastChecked: 'Never',
            latencyHistory: [0],
            statusHistory: Array(24).fill('up'),
            logs: [`[System] Monitor created successfully at ${new Date().toLocaleTimeString()}.`],
            details: {}
        };

        setMonitors(prev => [...prev, newMon]);
        setSelectedMonitor(newMon);
        setOpenAddDialog(false);

        setNewName('');
        setNewTarget('');
        setNewKeyword('');
        setNewPort('80');
        setNewType('http');

        setTimeout(() => handleCheckNow(id), 200);
    };

    // Delete Monitor
    const handleDeleteMonitor = (id: string) => {
        const remaining = monitors.filter(m => m.id !== id);
        setMonitors(remaining);
        if (selectedMonitor?.id === id) {
            setSelectedMonitor(remaining[0] || null);
        }
    };

    // Toggle Monitor Pause
    const handleTogglePause = (id: string) => {
        setMonitors(prev => prev.map(m => {
            if (m.id === id) {
                const nextStatus = m.status === 'paused' ? 'up' : 'paused';
                const actionText = nextStatus === 'paused' ? 'PAUSED' : 'RESUMED';
                const updatedLogs = [
                    `[${new Date().toLocaleTimeString()}] Monitor ${actionText} by user.`,
                    ...m.logs
                ];
                return {
                    ...m,
                    status: nextStatus,
                    logs: updatedLogs
                };
            }
            return m;
        }));
    };

    const handleSimulateHeartbeatPing = async (id: string) => {
        setLoading(true);
        const targetMon = monitors.find(m => m.id === id);
        if (!targetMon) return;

        const duration = Math.floor(Math.random() * 15) + 5;
        setMonitors(prev => prev.map(m => {
            if (m.id === id) {
                const hb_id = m.details?.heartbeat_id || m.id.slice(-5);
                const updatedLogs = [
                    `[${new Date().toLocaleTimeString()}] RECEIVED incoming heartbeat webhook ping. Latency: ${duration}ms`,
                    `[${new Date().toLocaleTimeString()}] Heartbeat verification healthy. Status: UP. Next scheduled window: 5 minutes.`,
                    ...m.logs
                ].slice(0, 50);
                const updatedLatency = [...m.latencyHistory, duration].slice(-10);
                const updatedStatus = [...m.statusHistory, 'up' as 'up'].slice(-24);

                const updatedMon: LocalMonitor = {
                    ...m,
                    status: 'up',
                    lastChecked: new Date().toLocaleTimeString(),
                    latencyHistory: updatedLatency,
                    statusHistory: updatedStatus,
                    logs: updatedLogs,
                    details: {
                        heartbeat_id: hb_id,
                        heartbeat_url: `https://expectexception.com/api/services/uptime-robot/heartbeat/${hb_id}/`,
                        interval_minutes: 5
                    }
                };
                if (selectedMonitor?.id === id) {
                    setSelectedMonitor(updatedMon);
                }
                return updatedMon;
            }
            return m;
        }));
        setLoading(false);
    };

    const totalMonitors = monitors.length;
    const activeMonitors = monitors.filter(m => m.status === 'up').length;
    const downMonitors = monitors.filter(m => m.status === 'down').length;
    const pausedMonitors = monitors.filter(m => m.status === 'paused').length;

    const overallUptimePercentage = totalMonitors > 0 
        ? ((activeMonitors / (totalMonitors - pausedMonitors || 1)) * 100).toFixed(2)
        : '100.00';

    const getMonitorTypeLabel = (type: MonitorType) => {
        switch (type) {
            case 'http': return 'HTTP Server';
            case 'https': return 'HTTPS Secure';
            case 'keyword': return 'Keyword Check';
            case 'ping': return 'Ping Check';
            case 'port': return 'TCP Port';
            case 'ssl': return 'SSL/TLS Expiry';
            case 'heartbeat': return 'Cron Heartbeat';
            default: return type;
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getHeartbeatSnippets = (url: string) => [
        {
            label: 'Bash (curl)',
            code: `curl -m 10 --retry 3 "${url}"`
        },
        {
            label: 'Crontab',
            code: `*/5 * * * * curl -m 10 -fsS --retry 3 "${url}" > /dev/null`
        },
        {
            label: 'Python',
            code: `import urllib.request\ntry:\n    urllib.request.urlopen("${url}", timeout=10)\nexcept Exception as e:\n    print(f"Ping failed: {e}")`
        },
        {
            label: 'Node.js',
            code: `const https = require('https');\nhttps.get("${url}", (res) => {\n  console.log('Heartbeat sent successfully');\n}).on('error', (err) => {\n  console.error('Ping failed:', err.message);\n});`
        },
        {
            label: 'PowerShell',
            code: `Invoke-RestMethod -Uri "${url}" -Method Get -TimeoutSec 10`
        }
    ];

    const snippets = selectedMonitor?.type === 'heartbeat' 
        ? getHeartbeatSnippets(selectedMonitor.details?.heartbeat_url || `https://expectexception.com/api/services/uptime-robot/heartbeat/${selectedMonitor.id.slice(-5)}/`)
        : [];

    return (
        <Box sx={{ 
            minHeight: '100vh', 
            background: 'radial-gradient(circle at 50% 0%, #0d1527 0%, #030712 100%)',
            color: '#f8fafc',
            py: 5,
            px: { xs: 2, md: 4 }
        }}>
            {/* Inject dynamic premium visual styles for glassmorphism, glowing waves, and scanning sweeps */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes activePulse {
                    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); transform: scale(1); }
                    70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); transform: scale(1.02); }
                    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); transform: scale(1); }
                }
                @keyframes heartbeatPulse {
                    0% { transform: scale(0.9); opacity: 0.6; }
                    50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 8px #10b981); }
                    100% { transform: scale(0.9); opacity: 0.6; }
                }
                @keyframes errorPulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                @keyframes scanningWave {
                    0% { background-position: 0% 0%; }
                    100% { background-position: 0% 100%; }
                }
                .glass-card {
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .glass-card:hover {
                    background: rgba(30, 41, 59, 0.45) !important;
                    border-color: rgba(255, 255, 255, 0.16) !important;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
                    transform: translateY(-4px);
                }
                .glow-border-success {
                    border: 1px solid rgba(16, 185, 129, 0.3) !important;
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.08);
                }
                .glow-border-error {
                    border: 1px solid rgba(239, 68, 68, 0.3) !important;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.08);
                }
                /* Custom styled terminal scrollbar */
                .terminal-log::-webkit-scrollbar {
                    width: 6px;
                }
                .terminal-log::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.2);
                }
                .terminal-log::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                }
                .terminal-log::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.25);
                }
            ` }} />

            <Container maxWidth="xl">
                <Seo
                    title="Uptime Robot - Professional SaaS Monitoring Workspace"
                    toolId={28}
                />

                {/* Cyberpunk Glossy Header bar */}
                <Box sx={{ 
                    ...glassStyle, 
                    p: 4, 
                    mb: 4, 
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: 3,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'linear-gradient(90deg, #3b82f6, #10b981, #f59e0b, #ec4899)'
                    }} />

                    <Box>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{
                                width: 50,
                                height: 50,
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(16, 185, 129, 0.45)',
                                animation: 'heartbeatPulse 2s infinite ease-in-out'
                            }}>
                                <NetworkCheck sx={{ color: '#fff', fontSize: 30 }} />
                            </Box>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                                    Uptime Robot Command Center
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FiberManualRecord sx={{ color: '#10b981', fontSize: 10, animation: 'activePulse 1.5s infinite' }} />
                                    Advanced Multi-Protocol Keep-Alive & Active Diagnostics Hub
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    {/* Overall Global Service state */}
                    <Box sx={{ 
                        background: 'rgba(0, 0, 0, 0.3)', 
                        border: '1px solid rgba(255, 255, 255, 0.05)', 
                        borderRadius: '12px', 
                        px: 3, 
                        py: 1.5,
                        textAlign: 'right'
                    }}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            Platform Heartbeat Watchdog
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#10b981', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end', mt: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                            DAEMON ONLINE
                        </Typography>
                    </Box>
                </Box>

                {/* Glossy Tab Switcher panel */}
                <Box sx={{ 
                    ...glassStyle, 
                    p: 1.5, 
                    mb: 4, 
                    background: 'rgba(15, 23, 42, 0.5)'
                }}>
                    <Tabs 
                        value={activeMainTab} 
                        onChange={(_, v) => setActiveMainTab(v)}
                        TabIndicatorProps={{ style: { background: 'linear-gradient(90deg, #10b981, #3b82f6)', height: 3, borderRadius: '2px' } }}
                        sx={{
                            '& .MuiTab-root': {
                                color: '#64748b',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                transition: 'all 0.25s',
                                '&.Mui-selected': {
                                    color: '#f8fafc',
                                    textShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
                                }
                            }
                        }}
                    >
                        <Tab icon={<Bolt />} iconPosition="start" label="Instant Diagnostics Workspace" />
                        <Tab icon={<AccessAlarm />} iconPosition="start" label="Keep-Alive Auto-Triggers (Server-Side)" />
                    </Tabs>
                </Box>

                {/* TAB 0: INSTANT DIAGNOSTICS WORKSPACE */}
                {activeMainTab === 0 && (
                    <>
                        {/* Dynamic Action header */}
                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>
                                LIVE DIAGNOSTIC AGENTS
                            </Typography>
                            <Stack direction="row" spacing={2}>
                                <Button
                                    variant="outlined"
                                    startIcon={<Refresh />}
                                    onClick={runBackgroundDaemon}
                                    disabled={loading}
                                    sx={{
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                        color: '#cbd5e1',
                                        '&:hover': {
                                            borderColor: 'rgba(255, 255, 255, 0.25)',
                                            background: 'rgba(255,255,255,0.03)'
                                        },
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: '10px'
                                    }}
                                >
                                    Force Sync All Checkers
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={() => setOpenAddDialog(true)}
                                    sx={{
                                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
                                        },
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: '10px',
                                        px: 3
                                    }}
                                >
                                    Add Diagnoser
                                </Button>
                            </Stack>
                        </Box>

                        {/* Interactive Stats Panel */}
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ ...glassStyle, p: 1 }} className="glass-card">
                                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                        <GraphicEq sx={{ color: '#a78bfa', fontSize: 32, mb: 1, filter: 'drop-shadow(0 0 5px rgba(167,139,250,0.4))' }} />
                                        <Typography variant="h3" sx={{ fontWeight: 900, color: '#f8fafc', letterSpacing: '-1px' }}>
                                            {overallUptimePercentage}%
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, mt: 0.5 }}>
                                            Workspace Health Grade
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ ...glassStyle, p: 1 }} className="glass-card">
                                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                        <Box sx={{ display: 'inline-flex', p: 1, borderRadius: '50%', bgcolor: 'rgba(16, 185, 129, 0.1)', mb: 0.5 }}>
                                            <CheckCircle sx={{ color: '#10b981', fontSize: 24 }} />
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#10b981' }}>
                                            {activeMonitors} <Typography component="span" variant="body1" sx={{ color: '#64748b' }}>/ {totalMonitors}</Typography>
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, mt: 0.5 }}>
                                            Active & Up
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ ...glassStyle, p: 1 }} className="glass-card">
                                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                        <Box sx={{ display: 'inline-flex', p: 1, borderRadius: '50%', bgcolor: 'rgba(239, 68, 68, 0.1)', mb: 0.5 }}>
                                            <Warning sx={{ color: '#ef4444', fontSize: 24 }} />
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#ef4444' }}>
                                            {downMonitors}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, mt: 0.5 }}>
                                            Active Outages
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ ...glassStyle, p: 1 }} className="glass-card">
                                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                        <Box sx={{ display: 'inline-flex', p: 1, borderRadius: '50%', bgcolor: 'rgba(148, 163, 184, 0.1)', mb: 0.5 }}>
                                            <Pause sx={{ color: '#94a3b8', fontSize: 24 }} />
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#94a3b8' }}>
                                            {pausedMonitors}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, mt: 0.5 }}>
                                            Sleep Monitors
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Split Workstation Pane */}
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <Card sx={{ ...glassStyle, minHeight: 520, display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                            Registered Monitors ({monitors.length})
                                        </Typography>
                                        <Chip 
                                            label="Dynamic Loop Active" 
                                            color="success" 
                                            size="small" 
                                            sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20 }} 
                                        />
                                    </Box>

                                    {monitors.length === 0 ? (
                                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, textAlign: 'center' }}>
                                            <Sensors sx={{ fontSize: 50, color: '#475569', mb: 2 }} />
                                            <Typography variant="h6" sx={{ color: '#cbd5e1' }} gutterBottom>No Active Monitors</Typography>
                                            <Button variant="contained" onClick={() => setOpenAddDialog(true)}>Add your first Monitor</Button>
                                        </Box>
                                    ) : isMobile ? (
                                        <Box sx={{ maxHeight: 460, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {monitors.map((mon) => (
                                                <Box
                                                    key={mon.id}
                                                    onClick={() => setSelectedMonitor(mon)}
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: '12px',
                                                        background: selectedMonitor?.id === mon.id ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                                        border: selectedMonitor?.id === mon.id ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.04)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        '&:hover': {
                                                            background: 'rgba(255, 255, 255, 0.04)',
                                                            borderColor: 'rgba(255, 255, 255, 0.08)',
                                                        }
                                                    }}
                                                >
                                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                                                        <Box sx={{ maxWidth: '65%' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#f1f5f9' }}>{mon.name}</Typography>
                                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {mon.target}
                                                            </Typography>
                                                        </Box>
                                                        <Chip 
                                                            label={getMonitorTypeLabel(mon.type)} 
                                                            size="small" 
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.6rem', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.06)' }}
                                                        />
                                                    </Stack>

                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        {mon.status === 'up' ? (
                                                            <Chip label="UP" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800, fontSize: '0.65rem' }} />
                                                        ) : mon.status === 'down' ? (
                                                            <Chip label="DOWN" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 800, fontSize: '0.65rem', animation: 'errorPulse 1.5s infinite' }} />
                                                        ) : mon.status === 'checking' ? (
                                                            <Chip label="PENDING" size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 800, fontSize: '0.65rem' }} />
                                                        ) : (
                                                            <Chip label="SLEEP" size="small" sx={{ bgcolor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', fontWeight: 800, fontSize: '0.65rem' }} />
                                                        )}

                                                        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                                                            <IconButton size="small" onClick={() => handleTogglePause(mon.id)} sx={{ color: '#cbd5e1' }}>
                                                                {mon.status === 'paused' ? <PlayArrow sx={{ color: '#10b981', fontSize: 18 }} /> : <Pause sx={{ fontSize: 18 }} />}
                                                            </IconButton>
                                                            <IconButton size="small" onClick={() => handleCheckNow(mon.id)} disabled={mon.status === 'paused'} sx={{ color: '#60a5fa' }}>
                                                                <Refresh sx={{ fontSize: 18 }} />
                                                            </IconButton>
                                                            <IconButton size="small" onClick={() => handleDeleteMonitor(mon.id)} sx={{ color: '#f87171' }}>
                                                                <Delete sx={{ fontSize: 18 }} />
                                                            </IconButton>
                                                        </Stack>
                                                    </Stack>
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : (
                                        <TableContainer sx={{ maxHeight: 460 }}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow sx={{ '& th': { bgcolor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 800 } }}>
                                                        <TableCell>Endpoint Name</TableCell>
                                                        <TableCell align="center">Type</TableCell>
                                                        <TableCell align="center">Status</TableCell>
                                                        <TableCell align="right">Controls</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {monitors.map((mon) => (
                                                        <TableRow 
                                                            key={mon.id}
                                                            hover
                                                            selected={selectedMonitor?.id === mon.id}
                                                            onClick={() => setSelectedMonitor(mon)}
                                                            sx={{ 
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.2s',
                                                                bgcolor: selectedMonitor?.id === mon.id ? 'rgba(255,255,255,0.04) !important' : 'inherit',
                                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02) !important' },
                                                                '& td': { borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#f1f5f9' }
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{mon.name}</Typography>
                                                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {mon.target}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Chip 
                                                                    label={getMonitorTypeLabel(mon.type)} 
                                                                    size="small" 
                                                                    variant="outlined"
                                                                    sx={{ fontSize: '0.7rem', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.08)' }}
                                                                />
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                {mon.status === 'up' ? (
                                                                    <Chip label="UP" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800, fontSize: '0.65rem' }} />
                                                                ) : mon.status === 'down' ? (
                                                                    <Chip label="DOWN" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 800, fontSize: '0.65rem', animation: 'errorPulse 1.5s infinite' }} />
                                                                ) : mon.status === 'checking' ? (
                                                                    <Chip label="PINGING" size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 800, fontSize: '0.65rem' }} />
                                                                ) : (
                                                                    <Chip label="SLEEP" size="small" sx={{ bgcolor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', fontWeight: 800, fontSize: '0.65rem' }} />
                                                                )}
                                                            </TableCell>
                                                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                                    <Tooltip title={mon.status === 'paused' ? 'Resume Checking' : 'Pause Checking'}>
                                                                        <IconButton size="small" onClick={() => handleTogglePause(mon.id)} sx={{ color: '#cbd5e1' }}>
                                                                            {mon.status === 'paused' ? <PlayArrow sx={{ color: '#10b981' }} /> : <Pause />}
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Run Check Now">
                                                                        <IconButton size="small" onClick={() => handleCheckNow(mon.id)} disabled={mon.status === 'paused'} sx={{ color: '#60a5fa' }}>
                                                                            <Refresh />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Delete">
                                                                        <IconButton size="small" onClick={() => handleDeleteMonitor(mon.id)} sx={{ color: '#f87171' }}>
                                                                            <Delete />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Stack>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </Card>
                            </Grid>

                            {/* Detail Agent workspace */}
                            <Grid item xs={12} md={6}>
                                {selectedMonitor ? (
                                    <Stack spacing={3}>
                                        <Paper sx={{ 
                                            ...glassStyle, 
                                            p: 3, 
                                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)',
                                        }} className={selectedMonitor.status === 'up' ? 'glow-border-success' : selectedMonitor.status === 'down' ? 'glow-border-error' : ''}>
                                            <Stack direction="row" spacing={2.5} alignItems="center">
                                                <Box sx={{
                                                    width: 50,
                                                    height: 50,
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: selectedMonitor.status === 'up' ? 'rgba(16, 185, 129, 0.15)' : selectedMonitor.status === 'down' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148,163,184,0.15)',
                                                    border: '1px solid',
                                                    borderColor: selectedMonitor.status === 'up' ? '#10b981' : selectedMonitor.status === 'down' ? '#ef4444' : '#64748b',
                                                    boxShadow: selectedMonitor.status === 'up' ? '0 0 15px rgba(16,185,129,0.3)' : '0 0 15px rgba(239,68,68,0.3)',
                                                }}>
                                                    <Language sx={{ color: selectedMonitor.status === 'up' ? '#34d399' : selectedMonitor.status === 'down' ? '#f87171' : '#94a3b8', fontSize: 26 }} />
                                                </Box>
                                                <Box sx={{ flexGrow: 1 }}>
                                                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                                                        {selectedMonitor.name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', gap: 1, mt: 0.5 }}>
                                                        <span>Endpoint: <strong>{selectedMonitor.target}</strong></span>
                                                        <span>|</span>
                                                        <span>Checked: <strong>{selectedMonitor.lastChecked}</strong></span>
                                                    </Typography>
                                                </Box>
                                                {selectedMonitor.type === 'heartbeat' && (
                                                    <Button
                                                        variant="contained"
                                                        color="success"
                                                        size="small"
                                                        onClick={() => handleSimulateHeartbeatPing(selectedMonitor.id)}
                                                        disabled={loading || selectedMonitor.status === 'paused'}
                                                        sx={{ textTransform: 'none', fontWeight: 700 }}
                                                    >
                                                        Simulate Ping
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Paper>

                                        {/* Status blocks and statistics */}
                                        <Card sx={{ ...glassStyle, p: 3 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#94a3b8' }}>
                                                <AccessAlarm sx={{ color: '#a78bfa' }} />
                                                24-HOUR STABILITY RUNNER
                                            </Typography>
                                            <Stack direction="row" spacing={0.5} sx={{ width: '100%', pb: 1, overflowX: 'auto' }}>
                                                {selectedMonitor.statusHistory.map((st, idx) => (
                                                    <Box
                                                        key={idx}
                                                        sx={{
                                                            flexGrow: 1,
                                                            height: 38,
                                                            borderRadius: '5px',
                                                            backgroundColor: selectedMonitor.status === 'paused' 
                                                                ? '#334155' 
                                                                : st === 'up' ? '#10b981' : '#ef4444',
                                                            opacity: st === 'up' ? (0.65 + (idx % 6) * 0.05) : 0.9,
                                                            minWidth: 8,
                                                            transition: 'all 0.2s',
                                                            '&:hover': {
                                                                transform: 'scaleY(1.1)',
                                                                opacity: 1
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Card>

                                        {/* Performance metrics split cards */}
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} sm={6}>
                                                <Card sx={{ ...glassStyle, p: 1.5, background: 'rgba(15, 23, 42, 0.4)' }}>
                                                    <CardContent>
                                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                            <Timer sx={{ color: '#00b4d8' }} />
                                                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 700 }}>LAST LATENCY</Typography>
                                                        </Stack>
                                                        <Typography variant="h3" sx={{ fontWeight: 900, color: '#00b4d8' }}>
                                                            {selectedMonitor.latencyHistory[selectedMonitor.latencyHistory.length - 1] || 0} <Typography component="span" variant="h5" sx={{ color: '#64748b' }}>ms</Typography>
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>

                                            <Grid item xs={12} sm={6}>
                                                <Card sx={{ ...glassStyle, p: 1.5, background: 'rgba(15, 23, 42, 0.4)' }}>
                                                    <CardContent>
                                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                            <Dns sx={{ color: '#34d399' }} />
                                                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 700 }}>NETWORK CODE</Typography>
                                                        </Stack>
                                                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#34d399' }}>
                                                            {selectedMonitor.details?.status_code ? `HTTP ${selectedMonitor.details.status_code}` : 'ACTIVE OK'}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </Grid>

                                        {/* Multi region check summary if present */}
                                        {selectedMonitor.regions && selectedMonitor.regions.length > 0 && (
                                            <Card sx={{ ...glassStyle, p: 3 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: '#94a3b8', letterSpacing: '0.5px' }}>
                                                    DISTRIBUTED EDGE INSPECTIONS
                                                </Typography>
                                                <Stack spacing={1.5}>
                                                    {selectedMonitor.regions.map((reg) => (
                                                        <Stack key={reg.id} direction="row" justifyContent="space-between" alignItems="center">
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Typography sx={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.4))' }}>{reg.icon}</Typography>
                                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#e2e8f0' }}>{reg.name}</Typography>
                                                            </Stack>
                                                            <Stack direction="row" spacing={2.5} alignItems="center">
                                                                <Chip 
                                                                    label={reg.status.toUpperCase()} 
                                                                    size="small" 
                                                                    sx={{ 
                                                                        height: 18, 
                                                                        fontSize: '0.6rem', 
                                                                        bgcolor: reg.status === 'up' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                                        color: reg.status === 'up' ? '#34d399' : '#f87171',
                                                                        fontWeight: 800
                                                                    }} 
                                                                />
                                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#00b4d8' }}>
                                                                    {reg.status === 'up' ? `${reg.latency_ms}ms` : 'Offline'}
                                                                </Typography>
                                                            </Stack>
                                                        </Stack>
                                                    ))}
                                                </Stack>
                                            </Card>
                                        )}

                                        {/* Retro Glow terminal log */}
                                        <Paper sx={{
                                            ...glassStyle,
                                            p: 3,
                                            background: '#040711',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            color: '#a6e22e',
                                            boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.8)'
                                        }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', pb: 0.5, fontWeight: 700 }}>
                                                [DIAGNOSTICS_AGENT_STREAM]
                                            </Typography>
                                            <Box className="terminal-log" sx={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {selectedMonitor.logs.map((logLine, idx) => (
                                                    <Typography 
                                                        key={idx} 
                                                        variant="body2" 
                                                        sx={{ 
                                                            fontFamily: 'Consolas, Monaco, monospace',
                                                            fontSize: '0.85rem',
                                                            color: logLine.includes('failed') || logLine.includes('ERROR') ? '#f43f5e' : '#10b981'
                                                        }}
                                                    >
                                                        {`$ ${logLine}`}
                                                    </Typography>
                                                ))}
                                            </Box>
                                        </Paper>
                                    </Stack>
                                ) : (
                                    <Paper sx={{ ...glassStyle, minHeight: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                                            Select a live diagnoser from the panel list.
                                        </Typography>
                                    </Paper>
                                )}
                            </Grid>
                        </Grid>
                    </>
                )}

                {/* TAB 1: AUTO-TRIGGER KEEP-ALIVE SCHEDULER */}
                {activeMainTab === 1 && (
                    <>
                        {/* Interactive Keep-Alive workspace */}
                        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                                    Keep-Alive Background Daemon Schedules
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                                    Persistent background loops executing directly on our high-performance Celery clusters. Prevents server hibernation 24/7.
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => setOpenAddTriggerDialog(true)}
                                sx={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                                    },
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    px: 3
                                }}
                            >
                                Schedule Keep-Alive Trigger
                            </Button>
                        </Box>

                        {/* Interactive triggers workspace split pane */}
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <Card sx={{ ...glassStyle, minHeight: 520, display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                            Scheduled Server Tasks ({triggers.length})
                                        </Typography>
                                        <Chip 
                                            label="Watchdog Watchers OK" 
                                            size="small" 
                                            sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800, fontSize: '0.7rem' }} 
                                        />
                                    </Box>

                                    {triggers.length === 0 ? (
                                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, textAlign: 'center' }}>
                                            <AccessAlarm sx={{ fontSize: 50, color: '#475569', mb: 2 }} />
                                            <Typography variant="h6" sx={{ color: '#cbd5e1' }} gutterBottom>No Scheduled Keep-Alives</Typography>
                                            <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 350, mb: 3 }}>
                                                Set up a persistent, automated task run on our backend clusters to continuous ping and keep waking up sleeping dynos.
                                            </Typography>
                                            <Button variant="contained" color="success" onClick={() => setOpenAddTriggerDialog(true)}>
                                                Schedule Trigger Now
                                            </Button>
                                        </Box>
                                    ) : isMobile ? (
                                        <Box sx={{ maxHeight: 460, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {triggers.map((trg) => (
                                                <Box
                                                    key={trg.id}
                                                    onClick={() => setSelectedTrigger(trg)}
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: '12px',
                                                        background: selectedTrigger?.id === trg.id ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                                        border: selectedTrigger?.id === trg.id ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.04)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        '&:hover': {
                                                            background: 'rgba(255, 255, 255, 0.04)',
                                                            borderColor: 'rgba(255, 255, 255, 0.08)',
                                                        }
                                                    }}
                                                >
                                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                                                        <Box sx={{ maxWidth: '65%' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#f1f5f9' }}>{trg.name}</Typography>
                                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {trg.target}
                                                            </Typography>
                                                        </Box>
                                                        <Chip 
                                                            label={`Every ${trg.interval_minutes}m`} 
                                                            size="small" 
                                                            sx={{ fontSize: '0.65rem', color: '#00b4d8', borderColor: 'rgba(0,180,216,0.2)', bgcolor: 'rgba(0,180,216,0.05)' }} 
                                                            variant="outlined" 
                                                        />
                                                    </Stack>

                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        {trg.status === 'active' ? (
                                                            <Chip label="ACTIVE" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800, fontSize: '0.65rem' }} />
                                                        ) : (
                                                            <Chip label="PAUSED" size="small" sx={{ bgcolor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', fontWeight: 800, fontSize: '0.65rem' }} />
                                                        )}

                                                        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                                                            <IconButton size="small" onClick={() => handleToggleTrigger(trg.id)} sx={{ color: '#cbd5e1' }}>
                                                                {trg.status === 'paused' ? <PlayArrow sx={{ color: '#10b981', fontSize: 18 }} /> : <Pause sx={{ fontSize: 18 }} />}
                                                            </IconButton>
                                                            <IconButton size="small" onClick={() => handleForceTriggerNow(trg.id)} disabled={trg.status === 'paused'} sx={{ color: '#60a5fa' }}>
                                                                <Refresh sx={{ fontSize: 18 }} />
                                                            </IconButton>
                                                            <IconButton size="small" onClick={() => handleDeleteTrigger(trg.id)} sx={{ color: '#f87171' }}>
                                                                <Delete sx={{ fontSize: 18 }} />
                                                            </IconButton>
                                                        </Stack>
                                                    </Stack>
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : (
                                        <TableContainer sx={{ maxHeight: 460 }}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow sx={{ '& th': { bgcolor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 800 } }}>
                                                        <TableCell>Server Name / Target</TableCell>
                                                        <TableCell align="center">Interval</TableCell>
                                                        <TableCell align="center">Status</TableCell>
                                                        <TableCell align="right">Controls</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {triggers.map((trg) => (
                                                        <TableRow
                                                            key={trg.id}
                                                            hover
                                                            selected={selectedTrigger?.id === trg.id}
                                                            onClick={() => setSelectedTrigger(trg)}
                                                            sx={{
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.2s',
                                                                bgcolor: selectedTrigger?.id === trg.id ? 'rgba(255,255,255,0.04) !important' : 'inherit',
                                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02) !important' },
                                                                '& td': { borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#f1f5f9' }
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{trg.name}</Typography>
                                                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {trg.target}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Chip 
                                                                    label={`Every ${trg.interval_minutes}m`} 
                                                                    size="small" 
                                                                    sx={{ color: '#00b4d8', borderColor: 'rgba(0,180,216,0.2)', bgcolor: 'rgba(0,180,216,0.05)' }} 
                                                                    variant="outlined" 
                                                                />
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                {trg.status === 'active' ? (
                                                                    <Chip label="ACTIVE" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800, fontSize: '0.65rem' }} />
                                                                ) : (
                                                                    <Chip label="PAUSED" size="small" sx={{ bgcolor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', fontWeight: 800, fontSize: '0.65rem' }} />
                                                                )}
                                                            </TableCell>
                                                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                                    <Tooltip title={trg.status === 'paused' ? 'Activate Schedule' : 'Pause Schedule'}>
                                                                        <IconButton size="small" onClick={() => handleToggleTrigger(trg.id)} sx={{ color: '#cbd5e1' }}>
                                                                            {trg.status === 'paused' ? <PlayArrow sx={{ color: '#10b981' }} /> : <Pause />}
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Force Wakeup Now">
                                                                        <IconButton size="small" onClick={() => handleForceTriggerNow(trg.id)} disabled={trg.status === 'paused'} sx={{ color: '#60a5fa' }}>
                                                                            <Refresh />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Delete Task">
                                                                        <IconButton size="small" onClick={() => handleDeleteTrigger(trg.id)} sx={{ color: '#f87171' }}>
                                                                            <Delete />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Stack>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </Card>
                            </Grid>

                            {/* Server Trigger details workstation */}
                            <Grid item xs={12} md={6}>
                                {selectedTrigger ? (
                                    <Stack spacing={3}>
                                        <Paper sx={{ 
                                            ...glassStyle, 
                                            p: 3, 
                                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)',
                                        }} className={selectedTrigger.status === 'active' ? 'glow-border-success' : ''}>
                                            <Stack direction="row" spacing={2.5} alignItems="center">
                                                <Box sx={{
                                                    width: 50,
                                                    height: 50,
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                                    boxShadow: '0 0 15px rgba(16,185,129,0.15)',
                                                    animation: selectedTrigger.status === 'active' ? 'activePulse 2s infinite ease-in-out' : 'none'
                                                }}>
                                                    <AccessAlarm sx={{ color: '#34d399', fontSize: 28 }} />
                                                </Box>
                                                <Box sx={{ flexGrow: 1 }}>
                                                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                                                        {selectedTrigger.name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', gap: 1, mt: 0.5 }}>
                                                        <span>Server URL: <strong>{selectedTrigger.target}</strong></span>
                                                        <span>|</span>
                                                        <span>Interval: <strong>every {selectedTrigger.interval_minutes}m</strong></span>
                                                    </Typography>
                                                </Box>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<Refresh />}
                                                    onClick={() => handleForceTriggerNow(selectedTrigger.id)}
                                                    disabled={selectedTrigger.status === 'paused' || loading}
                                                    sx={{
                                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        borderRadius: '8px'
                                                    }}
                                                >
                                                    Force Ping
                                                </Button>
                                            </Stack>
                                        </Paper>

                                        {/* Status grids */}
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} sm={6}>
                                                <Card sx={{ ...glassStyle, p: 1.5, background: 'rgba(15, 23, 42, 0.4)' }}>
                                                    <CardContent>
                                                        <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 800, mb: 1 }}>LAST BACKGROUND RUN</Typography>
                                                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#f1f5f9' }}>
                                                            {selectedTrigger.last_run || 'No runs yet'}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>

                                            <Grid item xs={12} sm={6}>
                                                <Card sx={{ ...glassStyle, p: 1.5, background: 'rgba(15, 23, 42, 0.4)' }}>
                                                    <CardContent>
                                                        <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 800, mb: 1 }}>LAST RESPONSE TIME</Typography>
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <Chip 
                                                                label={(selectedTrigger.last_status || 'NEVER').toUpperCase()} 
                                                                sx={{ 
                                                                    fontWeight: 800, 
                                                                    bgcolor: selectedTrigger.last_status === 'up' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                                    color: selectedTrigger.last_status === 'up' ? '#34d399' : '#f87171'
                                                                }}
                                                                size="small"
                                                            />
                                                            <Typography variant="h5" sx={{ fontWeight: 900, color: '#00b4d8' }}>
                                                                {selectedTrigger.last_latency ? `${selectedTrigger.last_latency}ms` : '-'}
                                                            </Typography>
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </Grid>

                                        {/* Server log terminal stream */}
                                        <Paper sx={{
                                            ...glassStyle,
                                            p: 3,
                                            background: '#030712',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            color: '#34d399',
                                            boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.8)'
                                        }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', pb: 0.5, fontWeight: 700 }}>
                                                [SERVER_KEEPALIVE_DECODE_LOGGER]
                                            </Typography>
                                            <Box className="terminal-log" sx={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {selectedTrigger.logs && selectedTrigger.logs.length > 0 ? (
                                                    selectedTrigger.logs.map((logLine, idx) => (
                                                        <Typography 
                                                            key={idx} 
                                                            variant="body2" 
                                                            sx={{ 
                                                                fontFamily: 'Consolas, Monaco, monospace',
                                                                fontSize: '0.85rem',
                                                                color: logLine.includes('failed') || logLine.includes('connection') ? '#f43f5e' : '#10b981'
                                                            }}
                                                        >
                                                            {`$ ${logLine}`}
                                                        </Typography>
                                                    ))
                                                ) : (
                                                    <Typography variant="body2" sx={{ color: '#475569', fontFamily: 'monospace' }}>
                                                        &gt; No server-side auto trigger executions logged yet.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Paper>
                                    </Stack>
                                ) : (
                                    <Paper sx={{ ...glassStyle, minHeight: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                                            Select an auto-trigger task from the panel list.
                                        </Typography>
                                    </Paper>
                                )}
                            </Grid>
                        </Grid>
                    </>
                )}

                {/* Dialog Form: Add Auto-Trigger */}
                <Dialog 
                    open={openAddTriggerDialog} 
                    onClose={() => setOpenAddTriggerDialog(false)} 
                    maxWidth="sm" 
                    fullWidth
                    PaperProps={{
                        style: {
                            background: '#0d1527',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                            color: '#f8fafc'
                        }
                    }}
                >
                    <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.06)', pb: 2 }}>Schedule Keep-Alive Task</DialogTitle>
                    <DialogContent sx={{ py: 3 }}>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                fullWidth
                                label="Endpoint Identifier Name"
                                placeholder="My sleeping portfolio page..."
                                value={newTriggerName}
                                onChange={(e) => setNewTriggerName(e.target.value)}
                                InputLabelProps={{ style: { color: '#64748b' } }}
                                inputProps={{ style: { color: '#f8fafc' } }}
                                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                            />

                            <TextField
                                fullWidth
                                label="Target Sleeping App URL"
                                placeholder="https://my-service.onrender.com"
                                value={newTriggerTarget}
                                onChange={(e) => setNewTriggerTarget(e.target.value)}
                                helperText="Secure public HTTPS/HTTP link that requires constant keep-awake requests."
                                FormHelperTextProps={{ style: { color: '#475569' } }}
                                InputLabelProps={{ style: { color: '#64748b' } }}
                                inputProps={{ style: { color: '#f8fafc' } }}
                                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                            />

                            <TextField
                                select
                                fullWidth
                                label="Keep-Awake Frequency"
                                value={newTriggerInterval}
                                onChange={(e) => setNewTriggerInterval(Number(e.target.value))}
                                InputLabelProps={{ style: { color: '#64748b' } }}
                                SelectProps={{ style: { color: '#f8fafc' } }}
                                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                            >
                                <MenuItem value={1}>Every 1 Minute (High Frequency Sleep Preventer)</MenuItem>
                                <MenuItem value={5}>Every 5 Minutes (Standard Render dynos)</MenuItem>
                                <MenuItem value={10}>Every 10 Minutes (Standard Heroku dynos)</MenuItem>
                                <MenuItem value={15}>Every 15 Minutes</MenuItem>
                                <MenuItem value={30}>Every 30 Minutes</MenuItem>
                                <MenuItem value={60}>Every 1 Hour (Standard Health Monitoring)</MenuItem>
                            </TextField>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid rgba(255,255,255,0.06)', pt: 2 }}>
                        <Button onClick={() => setOpenAddTriggerDialog(false)} sx={{ color: '#94a3b8', fontWeight: 700 }}>Cancel</Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleAddTrigger}
                            disabled={!newTriggerName.trim() || !newTriggerTarget.trim()}
                            sx={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                textTransform: 'none',
                                fontWeight: 800,
                                px: 3
                            }}
                        >
                            Schedule & Wake Up
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog Form: Create Diagnoser */}
                <Dialog 
                    open={openAddDialog} 
                    onClose={() => setOpenAddDialog(false)} 
                    maxWidth="sm" 
                    fullWidth
                    PaperProps={{
                        style: {
                            background: '#0d1527',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                            color: '#f8fafc'
                        }
                    }}
                >
                    <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.06)', pb: 2 }}>Add Live Diagnoser Agent</DialogTitle>
                    <DialogContent sx={{ py: 3 }}>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                fullWidth
                                label="Diagnoser Name"
                                placeholder="My primary database, API checker..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                InputLabelProps={{ style: { color: '#64748b' } }}
                                inputProps={{ style: { color: '#f8fafc' } }}
                                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                            />

                            <TextField
                                select
                                fullWidth
                                label="Inspection Type"
                                value={newType}
                                onChange={(e) => setNewType(e.target.value as MonitorType)}
                                InputLabelProps={{ style: { color: '#64748b' } }}
                                SelectProps={{ style: { color: '#f8fafc' } }}
                                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                            >
                                <MenuItem value="http">HTTP Endpoint Check</MenuItem>
                                <MenuItem value="https">HTTPS Secure Webpage Check</MenuItem>
                                <MenuItem value="keyword">On-page Keyword Match</MenuItem>
                                <MenuItem value="ping">Ping Check (ICMP Echo)</MenuItem>
                                <MenuItem value="port">TCP Port Listener Check</MenuItem>
                                <MenuItem value="ssl">SSL/TLS Certificate Validity Expiry</MenuItem>
                                <MenuItem value="heartbeat">Inbound Cron Heartbeat Webhook</MenuItem>
                            </TextField>

                            {newType !== 'heartbeat' && (
                                <TextField
                                    fullWidth
                                    label="Target IP/Domain Address"
                                    placeholder="example.com or 8.8.8.8"
                                    value={newTarget}
                                    onChange={(e) => setNewTarget(e.target.value)}
                                    InputLabelProps={{ style: { color: '#64748b' } }}
                                    inputProps={{ style: { color: '#f8fafc' } }}
                                    sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                                />
                            )}

                            {newType === 'keyword' && (
                                <TextField
                                    fullWidth
                                    label="Required page keyword"
                                    value={newKeyword}
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    InputLabelProps={{ style: { color: '#64748b' } }}
                                    inputProps={{ style: { color: '#f8fafc' } }}
                                    sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                                />
                            )}

                            {newType === 'port' && (
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Port Number"
                                    value={newPort}
                                    onChange={(e) => setNewPort(e.target.value)}
                                    InputLabelProps={{ style: { color: '#64748b' } }}
                                    inputProps={{ style: { color: '#f8fafc' } }}
                                    sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                                />
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid rgba(255,255,255,0.06)', pt: 2 }}>
                        <Button onClick={() => setOpenAddDialog(false)} sx={{ color: '#94a3b8', fontWeight: 700 }}>Cancel</Button>
                        <Button 
                            variant="contained" 
                            onClick={handleAddMonitor}
                            disabled={!newName.trim() || (newType !== 'heartbeat' && !newTarget.trim())}
                            sx={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                textTransform: 'none',
                                fontWeight: 800,
                                px: 3
                            }}
                        >
                            Deploy Checker
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
};

export default UptimeRobot;
