import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Paper,
    Grid,
    Card,
    CardContent,
    IconButton,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Switch,
    LinearProgress,
    Alert,
    TextField,
    InputAdornment,
    Tooltip,
    Avatar,
    Skeleton,
    useTheme,
    useMediaQuery,
    alpha,
    Divider,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    Dashboard,
    People,
    Article,
    Download,
    Terminal,
    Memory,
    Storage,
    Speed,
    Refresh,
    Delete,
    Search,
    AdminPanelSettings,
    CheckCircle,
    Cancel,
    PlayArrow,
    Stop,
    CloudDownload,
    Dns,
    NetworkCheck,
    Psychology,
    Settings,
    Edit,
    Add,
    Lock,
    LockOpen,
    Email,
    Forum,
    Reply,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

import Seo from '../../components/seo/Seo';

// ============ Types ============
interface SystemMetrics {
    timestamp: string;
    cpu: { usage: number; cores: number; per_core: number[]; load_avg: number[] };
    memory: { total_gb: number; used_gb: number; percent: number };
    disk: { total_gb: number; used_gb: number; percent: number };
    network: { sent_mb: number; recv_mb: number };
    gpu: { available: boolean; device?: string; utilization_pct?: number; allocated_mb?: number; total_memory_mb?: number; reason?: string };
    runtime: { uptime_seconds: number; environment: string };
    celery?: {
        workers: { name: string; status: string; active_tasks: number }[];
        queues: Record<string, number>;
        error: string | null;
    };
}

interface MongoStatus {
    connected: boolean;
    message?: string;
    collections: Record<string, { count: number | null; recent: Record<string, any>[]; error?: string }>;
}

interface AdminUser {
    id: number;
    email: string;
    username: string;
    is_staff: boolean;
    is_active: boolean;
    date_joined: string;
    last_login: string | null;
}

interface AdminBlog {
    id: number;
    title: string;
    slug: string;
    author: string;
    created_at: string;
    likes_count: number;
}

interface AdminDownload {
    id: number;
    name: string;
    category: string;
    size: string;
    downloads: number;
    version: string;
    created_at: string;
}

interface OllamaModel {
    name: string;
    id: string;
    size: string;
    modified: string;
}

interface ToolService {
    id: number;
    title: string;
    path: string;
    category: string;
    requires_login: boolean;
    is_active: boolean;
}

interface AdminInquiry {
    id: number;
    name: string;
    email: string;
    inquiry_type: string;
    subject: string;
    message: string;
    project_type: string;
    budget: string;
    status: 'new' | 'read' | 'replied' | 'closed';
    admin_notes: string;
    source_page: string;
    created_at: string;
}

interface AdminThread {
    id: number;
    title: string;
    slug: string;
    author: { username?: string; email?: string } | string;
    is_pinned: boolean;
    is_closed: boolean;
    is_solved: boolean;
    reply_count: number;
    vote_count: number;
    created_at: string;
}

// ============ Tab Panel Component ============
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index} style={{ width: '100%' }}>
        {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
);

// ============ Metric Card Component ============
interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    percent?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color, percent }) => (
    <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
        <Card
            sx={{
                bgcolor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'grey.500', letterSpacing: 1.5, fontWeight: 600 }}>
                            {title}
                        </Typography>
                        <Typography variant="h3" sx={{ color: 'white', fontWeight: 700, lineHeight: 1 }}>
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" sx={{ color: 'grey.600' }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(color, 0.15), color: color, width: 48, height: 48 }}>
                        {icon}
                    </Avatar>
                </Box>
                {percent !== undefined && (
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress
                            variant="determinate"
                            value={percent}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.05)',
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: color,
                                    borderRadius: 3,
                                },
                            }}
                        />
                    </Box>
                )}
            </CardContent>
            {/* Glow effect */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 100,
                    height: 100,
                    background: `radial-gradient(circle, ${alpha(color, 0.15)} 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }}
            />
        </Card>
    </motion.div>
);

// ============ Main Component ============
const AdminDashboardPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // State
    const [activeTab, setActiveTab] = useState(0);
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [mongoStatus, setMongoStatus] = useState<MongoStatus | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [blogs, setBlogs] = useState<AdminBlog[]>([]);
    const [downloads, setDownloads] = useState<AdminDownload[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
    const [ollamaStatus, setOllamaStatus] = useState<{ running: boolean; active_models: any[] }>({ running: false, active_models: [] });
    const [toolServices, setToolServices] = useState<ToolService[]>([]);
    const [toolAccessLoading, setToolAccessLoading] = useState<Record<number, boolean>>({});
    const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);
    const [threads, setThreads] = useState<AdminThread[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: number; name: string }>({ open: false, type: '', id: 0, name: '' });
    const [userDialog, setUserDialog] = useState<{ open: boolean; type: 'create' | 'edit'; data: Partial<AdminUser> }>({ open: false, type: 'create', data: {} });
    const [downloadDialog, setDownloadDialog] = useState<{ open: boolean; data: Partial<AdminDownload> }>({ open: false, data: {} });
    const [blogDialog, setBlogDialog] = useState<{ open: boolean; data: Partial<AdminBlog> }>({ open: false, data: {} });
    const [inquiryDialog, setInquiryDialog] = useState<{ open: boolean; data: AdminInquiry | null }>({ open: false, data: null });
    const [replyMessage, setReplyMessage] = useState('');

    const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);
    const [selectedModel, setSelectedModel] = useState('');

    const logsEndRef = useRef<HTMLDivElement>(null);
    const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const logsIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // ============ Data Fetching ============
    const fetchMetrics = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/server-status-api/');
            setMetrics(response.data);
        } catch (e) {
            console.error('Failed to fetch metrics:', e);
        }
    }, []);

    const fetchMongoStatus = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/mongo-status/');
            setMongoStatus(response.data);
        } catch (e) {
            console.error('Failed to fetch Mongo status:', e);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/users/');
            setUsers(response.data.users || []);
        } catch (e) {
            console.error('Failed to fetch users:', e);
        }
    }, []);

    const fetchBlogs = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/blogs/');
            setBlogs(response.data.posts || []);
        } catch (e) {
            console.error('Failed to fetch blogs:', e);
        }
    }, []);

    const fetchDownloads = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/downloads/');
            setDownloads(response.data.resources || []);
        } catch (e) {
            console.error('Failed to fetch downloads:', e);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/logs/?lines=100');
            setLogs(response.data.logs || []);
        } catch (e) {
            console.error('Failed to fetch logs:', e);
        }
    }, []);

    const fetchOllamaModels = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/ollama/models/');
            setOllamaModels(response.data.models || []);
        } catch (e) {
            console.error('Failed to fetch Ollama models:', e);
        }
    }, []);

    const fetchOllamaStatus = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/ollama/status/');
            setOllamaStatus(response.data);
        } catch (e) {
            console.error('Failed to fetch Ollama status:', e);
        }
    }, []);

    const fetchToolServices = useCallback(async () => {
        try {
            const response = await apiClient.get(endpoints.services.tools);
            const list = response.data?.results ?? response.data ?? [];
            setToolServices(list);
        } catch (e) {
            console.error('Failed to fetch tool services:', e);
        }
    }, []);

    const fetchInquiries = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/inquiries/');
            setInquiries(response.data.inquiries || []);
        } catch (e) {
            console.error('Failed to fetch inquiries:', e);
        }
    }, []);

    const fetchThreads = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/community/threads/');
            setThreads(response.data?.results ?? response.data ?? []);
        } catch (e) {
            console.error('Failed to fetch threads:', e);
        }
    }, []);

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchMetrics(),
                fetchMongoStatus(),
                fetchUsers(),
                fetchBlogs(),
                fetchDownloads(),
                fetchOllamaModels(),
                fetchOllamaStatus(),
                fetchToolServices(),
                fetchInquiries(),
                fetchThreads(),
            ]);
            setLoading(false);
        };
        loadData();
    }, [fetchMetrics, fetchMongoStatus, fetchUsers, fetchBlogs, fetchDownloads, fetchOllamaModels, fetchOllamaStatus, fetchToolServices, fetchInquiries, fetchThreads]);

    // Real-time metrics polling
    useEffect(() => {
        if (activeTab === 0) {
            fetchMetrics();
            metricsIntervalRef.current = setInterval(fetchMetrics, 3000);
        }
        return () => {
            if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current);
        };
    }, [activeTab, fetchMetrics]);

    // Real-time logs polling
    useEffect(() => {
        if (activeTab === 4 && autoRefreshLogs) {
            fetchLogs();
            logsIntervalRef.current = setInterval(fetchLogs, 2000);
        }
        return () => {
            if (logsIntervalRef.current) clearInterval(logsIntervalRef.current);
        };
    }, [activeTab, autoRefreshLogs, fetchLogs]);

    // Auto-scroll logs
    // Auto-scroll logs
    useEffect(() => {
        // Find the scrollable container and set scrollTop to max
        const container = logsEndRef.current?.parentElement;
        if (container && autoRefreshLogs) {
            container.scrollTop = container.scrollHeight;
        }
    }, [logs, autoRefreshLogs]);

    // ============ Actions ============
    const handleDelete = async () => {
        const { type, id } = deleteDialog;
        try {
            if (type === 'user') {
                await apiClient.delete(`/api/services/admin/users/${id}/`);
                setUsers(users.filter(u => u.id !== id));
            } else if (type === 'blog') {
                await apiClient.delete(`/api/services/admin/blogs/${id}/`);
                setBlogs(blogs.filter(b => b.id !== id));
            } else if (type === 'download') {
                await apiClient.delete(`/api/services/admin/downloads/${id}/`);
                setDownloads(downloads.filter(d => d.id !== id));
            } else if (type === 'thread') {
                await apiClient.delete(`/api/community/threads/${id}/`);
                setThreads(threads.filter(t => t.id !== id));
            }
        } catch (e) {
            setError('Failed to delete item');
        }
        setDeleteDialog({ open: false, type: '', id: 0, name: '' });
    };

    const handleToggleUserStatus = async (userId: number, field: 'is_active' | 'is_staff', value: boolean) => {
        try {
            await apiClient.patch(`/api/services/admin/users/${userId}/`, { [field]: value });
            setUsers(users.map(u => u.id === userId ? { ...u, [field]: value } : u));
        } catch (e) {
            setError('Failed to update user');
        }
    };

    const handleOllamaAction = async (action: string, model?: string) => {
        try {
            await apiClient.post('/api/services/admin/ollama/control/', { action, model });
            // Refresh status and models
            await fetchOllamaStatus();
            await fetchOllamaModels();
        } catch (e) {
            setError(`Failed to ${action} model`);
        }
    };

    const handleToolAccessToggle = async (serviceId: number, currentValue: boolean) => {
        setToolAccessLoading(prev => ({ ...prev, [serviceId]: true }));
        try {
            await apiClient.post(endpoints.services.toolAccessToggle, {
                service_id: serviceId,
                requires_login: !currentValue,
            });
            setToolServices(prev =>
                prev.map(s => s.id === serviceId ? { ...s, requires_login: !currentValue } : s)
            );
        } catch (e) {
            setError('Failed to update tool access');
        } finally {
            setToolAccessLoading(prev => ({ ...prev, [serviceId]: false }));
        }
    };

    const handleUserSubmit = async () => {
        try {
            if (userDialog.type === 'create') {
                const res = await apiClient.post(endpoints.admin.users, userDialog.data);
                setUsers([res.data, ...users]);
            } else {
                if (!userDialog.data.id) return;
                const res = await apiClient.patch(endpoints.admin.userDetail(userDialog.data.id), userDialog.data);
                setUsers(users.map(u => u.id === userDialog.data.id ? { ...u, ...res.data } : u));
            }
            setUserDialog({ open: false, type: 'create', data: {} });
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to save user');
        }
    };

    const handleDownloadSubmit = async () => {
        try {
            if (!downloadDialog.data.id) return;
            // Endpoint for updating download details
            await apiClient.patch(endpoints.admin.downloadDetail(downloadDialog.data.id), downloadDialog.data);
            setDownloads(downloads.map(d => d.id === downloadDialog.data.id ? { ...d, ...downloadDialog.data } as AdminDownload : d));
            setDownloadDialog({ open: false, data: {} });
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to update resource');
        }
    };

    const handleBlogSubmit = async () => {
        try {
            if (!blogDialog.data.id) return;
            await apiClient.patch(endpoints.admin.blogDetail(blogDialog.data.id), blogDialog.data);
            setBlogs(blogs.map(b => b.id === blogDialog.data.id ? { ...b, ...blogDialog.data } as AdminBlog : b));
            setBlogDialog({ open: false, data: {} });
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to update blog');
        }
    };

    const handleInquiryStatusChange = async (id: number, newStatus: AdminInquiry['status']) => {
        try {
            await apiClient.patch(`/api/services/admin/inquiries/${id}/`, { status: newStatus });
            setInquiries(inquiries.map(i => i.id === id ? { ...i, status: newStatus } : i));
        } catch (e) {
            setError('Failed to update inquiry status');
        }
    };

    const handleReplySubmit = async () => {
        if (!inquiryDialog.data || !replyMessage.trim()) return;
        try {
            await apiClient.post(`/api/services/admin/inquiries/${inquiryDialog.data.id}/reply/`, {
                message: replyMessage,
            });
            setInquiries(inquiries.map(i => i.id === inquiryDialog.data!.id ? { ...i, status: 'replied' } : i));
            setInquiryDialog({ open: false, data: null });
            setReplyMessage('');
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to send reply');
        }
    };

    const handleThreadPin = async (id: number, currentValue: boolean) => {
        try {
            const res = await apiClient.post(`/api/community/threads/${id}/pin/`);
            setThreads(threads.map(t => t.id === id ? { ...t, is_pinned: res.data.is_pinned } : t));
        } catch (e) {
            setError('Failed to update thread');
        }
    };

    const handleThreadLock = async (id: number, currentValue: boolean) => {
        try {
            const res = await apiClient.post(`/api/community/threads/${id}/lock/`);
            setThreads(threads.map(t => t.id === id ? { ...t, is_closed: res.data.is_closed } : t));
        } catch (e) {
            setError('Failed to update thread');
        }
    };

    // ============ Filter Functions ============
    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredBlogs = blogs.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredInquiries = inquiries.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredThreads = threads.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ============ Format Helpers ============
    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${mins}m`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // ============ Tab Configuration ============
    const tabs = [
        { label: 'Server Health', icon: <Dashboard /> },
        { label: 'Users', icon: <People /> },
        { label: 'Blogs', icon: <Article /> },
        { label: 'Downloads', icon: <Download /> },
        { label: 'Logs', icon: <Terminal /> },
        { label: 'Ollama', icon: <Psychology /> },
        { label: 'Tool Access', icon: <Lock /> },
        { label: 'Inquiries', icon: <Email /> },
        { label: 'Threads', icon: <Forum /> },
        { label: 'Mongo', icon: <Storage /> },
    ];

    // ============ Render ============
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0f', position: 'relative' }}>
            <Seo title="Admin Dashboard" description="System administration and monitoring" />

            <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Avatar sx={{ bgcolor: '#6366f1', width: 48, height: 48 }}>
                            <AdminPanelSettings />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, letterSpacing: -0.5 }}>
                                Admin Dashboard
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.500' }}>
                                System monitoring and management • {metrics?.runtime?.environment || 'Loading...'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {error && (
                    <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
                        {error}
                    </Alert>
                )}

                {/* Tabs */}
                <Paper
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 3,
                        mb: 3,
                        overflow: 'hidden',
                    }}
                >
                    <Tabs
                        value={activeTab}
                        onChange={(_, v) => setActiveTab(v)}
                        variant={isMobile ? 'scrollable' : 'fullWidth'}
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTab-root': {
                                color: 'grey.500',
                                textTransform: 'none',
                                fontWeight: 600,
                                py: 2,
                                minHeight: 64,
                                '&.Mui-selected': { color: '#6366f1' },
                            },
                            '& .MuiTabs-indicator': { bgcolor: '#6366f1', height: 3 },
                        }}
                    >
                        {tabs.map((tab, i) => (
                            <Tab key={i} label={tab.label} icon={tab.icon} iconPosition="start" />
                        ))}
                    </Tabs>
                </Paper>

                {/* Loading State */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress sx={{ color: '#6366f1' }} />
                    </Box>
                )}

                {/* Tab Panels */}
                {!loading && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* ============ SERVER HEALTH TAB ============ */}
                            <TabPanel value={activeTab} index={0}>
                                {metrics && (
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} sm={6} lg={3}>
                                            <MetricCard
                                                title="CPU Usage"
                                                value={`${metrics.cpu.usage}%`}
                                                subtitle={`${metrics.cpu.cores} Cores`}
                                                icon={<Speed />}
                                                color="#3b82f6"
                                                percent={metrics.cpu.usage}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} lg={3}>
                                            <MetricCard
                                                title="Memory"
                                                value={`${metrics.memory.used_gb} GB`}
                                                subtitle={`of ${metrics.memory.total_gb} GB`}
                                                icon={<Memory />}
                                                color="#8b5cf6"
                                                percent={metrics.memory.percent}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} lg={3}>
                                            <MetricCard
                                                title="Disk"
                                                value={`${metrics.disk.percent}%`}
                                                subtitle={`${metrics.disk.used_gb} / ${metrics.disk.total_gb} GB`}
                                                icon={<Storage />}
                                                color="#f59e0b"
                                                percent={metrics.disk.percent}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} lg={3}>
                                            <MetricCard
                                                title="GPU"
                                                value={metrics.gpu.available ? `${metrics.gpu.utilization_pct}%` : 'N/A'}
                                                subtitle={metrics.gpu.available ? metrics.gpu.device : metrics.gpu.reason}
                                                icon={<Dns />}
                                                color="#10b981"
                                                percent={metrics.gpu.available ? metrics.gpu.utilization_pct : 0}
                                            />
                                        </Grid>

                                        {/* Additional Info Cards */}
                                        <Grid item xs={12} md={6}>
                                            <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                                <CardContent>
                                                    <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                                                        Network Traffic
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 4 }}>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: 'grey.500' }}>Sent</Typography>
                                                            <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 700 }}>
                                                                {metrics.network.sent_mb} MB
                                                            </Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: 'grey.500' }}>Received</Typography>
                                                            <Typography variant="h5" sx={{ color: '#8b5cf6', fontWeight: 700 }}>
                                                                {metrics.network.recv_mb} MB
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                                <CardContent>
                                                    <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                                                        System Info
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 4 }}>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: 'grey.500' }}>Uptime</Typography>
                                                            <Typography variant="h5" sx={{ color: '#10b981', fontWeight: 700 }}>
                                                                {formatUptime(metrics.runtime.uptime_seconds)}
                                                            </Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: 'grey.500' }}>Load Avg</Typography>
                                                            <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                                                                {metrics.cpu.load_avg.join(' / ')}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {metrics.celery && (
                                            <Grid item xs={12}>
                                                <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                                    <CardContent>
                                                        <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                                                            Celery Workers &amp; Queues
                                                        </Typography>
                                                        {metrics.celery.error && (
                                                            <Alert severity="warning" sx={{ mb: 2 }}>{metrics.celery.error}</Alert>
                                                        )}
                                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                                            {metrics.celery.workers.length === 0 ? (
                                                                <Chip label="No workers online" color="error" size="small" />
                                                            ) : (
                                                                metrics.celery.workers.map((w) => (
                                                                    <Chip
                                                                        key={w.name}
                                                                        label={`${w.name} · ${w.active_tasks} active`}
                                                                        color="success"
                                                                        size="small"
                                                                    />
                                                                ))
                                                            )}
                                                        </Box>
                                                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                                            {Object.entries(metrics.celery.queues).map(([queue, depth]) => (
                                                                <Box key={queue}>
                                                                    <Typography variant="caption" sx={{ color: 'grey.500' }}>{queue}</Typography>
                                                                    <Typography variant="h6" sx={{ color: depth > 0 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                                                                        {depth}
                                                                    </Typography>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        )}
                                    </Grid>
                                )}
                            </TabPanel>

                            {/* ============ USERS TAB ============ */}
                            <TabPanel value={activeTab} index={1}>
                                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                    <TextField
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        size="small"
                                        sx={{
                                            width: { xs: '100%', sm: 300 },
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.02)',
                                                color: 'white',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            },
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search sx={{ color: 'grey.500' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        startIcon={<Add />}
                                        onClick={() => setUserDialog({ open: true, type: 'create', data: {} })}
                                        sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, textTransform: 'none', fontWeight: 600 }}
                                    >
                                        Create User
                                    </Button>
                                </Box>

                                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>User</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Joined</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Active</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Staff</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredUsers.map((user) => (
                                                <TableRow key={user.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1', fontSize: 14 }}>
                                                                {user.email[0].toUpperCase()}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography sx={{ color: 'white', fontWeight: 500 }}>{user.email}</Typography>
                                                                <Typography variant="caption" sx={{ color: 'grey.500' }}>@{user.username}</Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        {formatDate(user.date_joined)}
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Switch
                                                            checked={user.is_active}
                                                            onChange={(e) => handleToggleUserStatus(user.id, 'is_active', e.target.checked)}
                                                            size="small"
                                                            sx={{ '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Switch
                                                            checked={user.is_staff}
                                                            onChange={(e) => handleToggleUserStatus(user.id, 'is_staff', e.target.checked)}
                                                            size="small"
                                                            sx={{ '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Tooltip title="Edit user">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setUserDialog({ open: true, type: 'edit', data: user })}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#6366f1' }, mr: 1 }}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete user">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDeleteDialog({ open: true, type: 'user', id: user.id, name: user.email })}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#ef4444' } }}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Typography variant="caption" sx={{ color: 'grey.600', mt: 2, display: 'block' }}>
                                    Showing {filteredUsers.length} of {users.length} users
                                </Typography>
                            </TabPanel>

                            {/* ============ BLOGS TAB ============ */}
                            <TabPanel value={activeTab} index={2}>
                                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                    <TextField
                                        placeholder="Search blogs..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        size="small"
                                        sx={{
                                            width: { xs: '100%', sm: 300 },
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.02)',
                                                color: 'white',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            },
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search sx={{ color: 'grey.500' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        href="/admin/create-blog"
                                        sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, textTransform: 'none', fontWeight: 600 }}
                                    >
                                        + New Post
                                    </Button>
                                </Box>

                                <Grid container spacing={3}>
                                    {filteredBlogs.map((blog) => (
                                        <Grid item xs={12} sm={6} lg={4} key={blog.id}>
                                            <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                                <CardContent>
                                                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1, lineHeight: 1.3 }} noWrap>
                                                        {blog.title}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mb: 2 }}>
                                                        By {blog.author} • {formatDate(blog.created_at)}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Chip
                                                            label={`${blog.likes_count} likes`}
                                                            size="small"
                                                            sx={{ bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}
                                                        />
                                                        <Box>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setBlogDialog({ open: true, data: blog })}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#6366f1' }, mr: 1 }}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDeleteDialog({ open: true, type: 'blog', id: blog.id, name: blog.title })}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#ef4444' } }}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </TabPanel>

                            {/* ============ DOWNLOADS TAB ============ */}
                            <TabPanel value={activeTab} index={3}>
                                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                        Downloadable Resources ({downloads.length})
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        href="/admin/upload-resource"
                                        sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, textTransform: 'none', fontWeight: 600 }}
                                    >
                                        + Upload Resource
                                    </Button>
                                </Box>

                                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Name</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Category</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Size</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Downloads</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {downloads.map((dl) => (
                                                <TableRow key={dl.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                    <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.06)' }}>{dl.name}</TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Chip label={dl.category} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'grey.300' }} />
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)' }}>{dl.size}</TableCell>
                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)' }}>{dl.downloads}</TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Tooltip title="Edit resource">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDownloadDialog({ open: true, data: dl })}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#6366f1' }, mr: 1 }}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete resource">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDeleteDialog({ open: true, type: 'download', id: dl.id, name: dl.name })}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#ef4444' } }}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </TabPanel>

                            {/* ============ LOGS TAB ============ */}
                            <TabPanel value={activeTab} index={4}>
                                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                            Live Logs
                                        </Typography>
                                        <Chip
                                            label={autoRefreshLogs ? 'Auto-refresh ON' : 'Paused'}
                                            size="small"
                                            color={autoRefreshLogs ? 'success' : 'default'}
                                            onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    </Box>
                                    <Button
                                        startIcon={<Refresh />}
                                        onClick={fetchLogs}
                                        sx={{ color: 'grey.400', textTransform: 'none' }}
                                    >
                                        Refresh
                                    </Button>
                                </Box>

                                <Paper
                                    sx={{
                                        bgcolor: '#0d0d0d',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: 2,
                                        p: 2,
                                        height: 500,
                                        overflowY: 'auto',
                                        fontFamily: 'JetBrains Mono, monospace',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    {logs.map((line, i) => (
                                        <Box
                                            key={i}
                                            sx={{
                                                color: line.includes('ERROR') ? '#ef4444' : line.includes('WARNING') ? '#f59e0b' : '#9ca3af',
                                                py: 0.25,
                                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            {line}
                                        </Box>
                                    ))}
                                    <div ref={logsEndRef} />
                                </Paper>
                            </TabPanel>

                            {/* ============ OLLAMA TAB ============ */}
                            <TabPanel value={activeTab} index={5}>
                                <Grid container spacing={3}>
                                    {/* Status Card */}
                                    <Grid item xs={12} md={4}>
                                        <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, height: '100%' }}>
                                            <CardContent>
                                                <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Settings /> Ollama Status
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                                    <Box
                                                        sx={{
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: '50%',
                                                            bgcolor: ollamaStatus.running ? '#10b981' : '#ef4444',
                                                            boxShadow: ollamaStatus.running ? '0 0 10px #10b981' : 'none',
                                                        }}
                                                    />
                                                    <Typography sx={{ color: ollamaStatus.running ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                        {ollamaStatus.running ? 'Running' : 'Stopped'}
                                                    </Typography>
                                                </Box>

                                                {ollamaStatus.active_models.length > 0 && (
                                                    <Box sx={{ mb: 3 }}>
                                                        <Typography variant="caption" sx={{ color: 'grey.500' }}>Active Models:</Typography>
                                                        {ollamaStatus.active_models.map((m, i) => (
                                                            <Chip key={i} label={m.name} size="small" sx={{ m: 0.5, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }} />
                                                        ))}
                                                    </Box>
                                                )}

                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    onClick={() => handleOllamaAction('restart')}
                                                    startIcon={<Refresh />}
                                                    sx={{
                                                        borderColor: 'rgba(255,255,255,0.1)',
                                                        color: 'grey.400',
                                                        textTransform: 'none',
                                                        '&:hover': { borderColor: '#6366f1', color: '#6366f1' },
                                                    }}
                                                >
                                                    Restart Ollama Service
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    {/* Models List */}
                                    <Grid item xs={12} md={8}>
                                        <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                                        Available Models ({ollamaModels.length})
                                                    </Typography>
                                                    <Button
                                                        startIcon={<Refresh />}
                                                        onClick={fetchOllamaModels}
                                                        sx={{ color: 'grey.400', textTransform: 'none' }}
                                                    >
                                                        Refresh
                                                    </Button>
                                                </Box>

                                                <TableContainer>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Model</TableCell>
                                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Size</TableCell>
                                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Modified</TableCell>
                                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Actions</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {ollamaModels.map((model) => (
                                                                <TableRow key={model.name} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                                    <TableCell sx={{ color: 'white', fontWeight: 500, borderColor: 'rgba(255,255,255,0.06)' }}>
                                                                        {model.name}
                                                                    </TableCell>
                                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)' }}>{model.size}</TableCell>
                                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)' }}>{model.modified}</TableCell>
                                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                                        <Tooltip title="Set as default">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleOllamaAction('set_default', model.name)}
                                                                                sx={{ color: 'grey.500', '&:hover': { color: '#10b981' } }}
                                                                            >
                                                                                <CheckCircle fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                        <Tooltip title="Delete model">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleOllamaAction('delete', model.name)}
                                                                                sx={{ color: 'grey.500', '&:hover': { color: '#ef4444' } }}
                                                                            >
                                                                                <Delete fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>

                                                {/* Pull new model */}
                                                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.06)' }} />
                                                <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 2 }}>
                                                    Pull New Model
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    <TextField
                                                        placeholder="e.g., llama2, mistral, qwen2"
                                                        value={selectedModel}
                                                        onChange={(e) => setSelectedModel(e.target.value)}
                                                        size="small"
                                                        sx={{
                                                            flex: 1,
                                                            '& .MuiOutlinedInput-root': {
                                                                bgcolor: 'rgba(255,255,255,0.02)',
                                                                color: 'white',
                                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                                            },
                                                        }}
                                                    />
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<CloudDownload />}
                                                        onClick={() => {
                                                            if (selectedModel) {
                                                                handleOllamaAction('pull', selectedModel);
                                                                setSelectedModel('');
                                                            }
                                                        }}
                                                        disabled={!selectedModel}
                                                        sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, textTransform: 'none', fontWeight: 600 }}
                                                    >
                                                        Pull Model
                                                    </Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </TabPanel>

                            {/* ============ TOOL ACCESS TAB ============ */}
                            <TabPanel value={activeTab} index={6}>
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                                        Tool Access Control
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'grey.400' }}>
                                        Toggle which tools require users to be logged in. Changes take effect immediately.
                                    </Typography>
                                </Box>

                                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Tool</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Category</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Path</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }} align="center">Login Required</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {toolServices.map((tool) => (
                                                <TableRow key={tool.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            {tool.requires_login ? (
                                                                <Lock sx={{ fontSize: 18, color: '#f59e0b' }} />
                                                            ) : (
                                                                <LockOpen sx={{ fontSize: 18, color: '#10b981' }} />
                                                            )}
                                                            <Typography sx={{ color: 'white', fontWeight: 500 }}>
                                                                {tool.title}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Chip
                                                            label={tool.category}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: 'rgba(99, 102, 241, 0.15)',
                                                                color: '#a5b4fc',
                                                                textTransform: 'capitalize',
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'grey.500', borderColor: 'rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                        {tool.path}
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        {toolAccessLoading[tool.id] ? (
                                                            <CircularProgress size={20} sx={{ color: '#6366f1' }} />
                                                        ) : (
                                                            <Switch
                                                                checked={tool.requires_login}
                                                                onChange={() => handleToolAccessToggle(tool.id, tool.requires_login)}
                                                                size="small"
                                                                sx={{
                                                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#f59e0b' },
                                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#f59e0b' },
                                                                    '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.1)' },
                                                                }}
                                                            />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'grey.600' }}>
                                        {toolServices.filter(t => t.requires_login).length} of {toolServices.length} tools require login
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<Refresh />}
                                        onClick={fetchToolServices}
                                        sx={{ color: 'grey.400', textTransform: 'none' }}
                                    >
                                        Refresh
                                    </Button>
                                </Box>
                            </TabPanel>

                            {/* ============ INQUIRIES TAB ============ */}
                            <TabPanel value={activeTab} index={7}>
                                <Box sx={{ mb: 3 }}>
                                    <TextField
                                        placeholder="Search inquiries..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        size="small"
                                        sx={{
                                            width: { xs: '100%', sm: 300 },
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.02)',
                                                color: 'white',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            },
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search sx={{ color: 'grey.500' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Box>
                                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>From</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Subject</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Type</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Status</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Received</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredInquiries.map((inq) => (
                                                <TableRow key={inq.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Typography sx={{ color: 'white', fontWeight: 500 }}>{inq.name}</Typography>
                                                        <Typography variant="caption" sx={{ color: 'grey.500' }}>{inq.email}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'grey.300', borderColor: 'rgba(255,255,255,0.06)', maxWidth: 260 }}>
                                                        <Typography noWrap sx={{ color: 'grey.300' }}>{inq.subject || inq.message}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Chip label={inq.inquiry_type} size="small" sx={{ bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }} />
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Chip
                                                            label={inq.status}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: inq.status === 'new' ? 'rgba(239, 68, 68, 0.15)'
                                                                    : inq.status === 'replied' ? 'rgba(34, 197, 94, 0.15)'
                                                                    : 'rgba(255,255,255,0.08)',
                                                                color: inq.status === 'new' ? '#fca5a5'
                                                                    : inq.status === 'replied' ? '#86efac'
                                                                    : 'grey.400',
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        {formatDate(inq.created_at)}
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Tooltip title="View & reply">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setInquiryDialog({ open: true, data: inq });
                                                                    setReplyMessage('');
                                                                    if (inq.status === 'new') handleInquiryStatusChange(inq.id, 'read');
                                                                }}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#6366f1' } }}
                                                            >
                                                                <Reply fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Typography variant="caption" sx={{ color: 'grey.600', mt: 2, display: 'block' }}>
                                    Showing {filteredInquiries.length} of {inquiries.length} inquiries
                                </Typography>
                            </TabPanel>

                            {/* ============ THREADS TAB (community moderation) ============ */}
                            <TabPanel value={activeTab} index={8}>
                                <Box sx={{ mb: 3 }}>
                                    <TextField
                                        placeholder="Search threads..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        size="small"
                                        sx={{
                                            width: { xs: '100%', sm: 300 },
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.02)',
                                                color: 'white',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            },
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search sx={{ color: 'grey.500' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Box>
                                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Thread</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Author</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Replies</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Pinned</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Locked</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredThreads.map((thread) => (
                                                <TableRow key={thread.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)', maxWidth: 300 }}>
                                                        <Typography sx={{ color: 'white', fontWeight: 500 }} noWrap>{thread.title}</Typography>
                                                        {thread.is_solved && (
                                                            <Chip label="Solved" size="small" sx={{ mt: 0.5, bgcolor: 'rgba(34, 197, 94, 0.15)', color: '#86efac' }} />
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        {typeof thread.author === 'string' ? thread.author : (thread.author?.username || thread.author?.email || 'Unknown')}
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        {thread.reply_count}
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Switch
                                                            checked={thread.is_pinned}
                                                            onChange={() => handleThreadPin(thread.id, thread.is_pinned)}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Switch
                                                            checked={thread.is_closed}
                                                            onChange={() => handleThreadLock(thread.id, thread.is_closed)}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Tooltip title="Delete thread">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDeleteDialog({ open: true, type: 'thread', id: thread.id, name: thread.title })}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#ef4444' } }}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Typography variant="caption" sx={{ color: 'grey.600', mt: 2, display: 'block' }}>
                                    Showing {filteredThreads.length} of {threads.length} threads
                                </Typography>
                            </TabPanel>

                            <TabPanel value={activeTab} index={9}>
                                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>MongoDB Atlas — Cross-Instance Mirror</Typography>
                                <Typography variant="body2" sx={{ color: 'grey.500', mb: 2 }}>
                                    Read-only view of the failover mirror (not the primary datastore). Atlas encrypts everything here at rest and in transit by default.
                                </Typography>
                                {!mongoStatus ? (
                                    <Typography sx={{ color: 'grey.500' }}>Loading…</Typography>
                                ) : !mongoStatus.connected ? (
                                    <Alert severity="warning">{mongoStatus.message || 'MongoDB Atlas is not reachable.'}</Alert>
                                ) : (
                                    <Grid container spacing={2}>
                                        {Object.entries(mongoStatus.collections).map(([name, data]) => (
                                            <Grid item xs={12} md={6} key={name}>
                                                <Card sx={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <CardContent>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700 }}>{name}</Typography>
                                                            <Chip label={`${data.count ?? '—'} docs`} size="small" color={data.count ? 'success' : 'default'} />
                                                        </Box>
                                                        {data.error && <Alert severity="error" sx={{ mb: 1 }}>{data.error}</Alert>}
                                                        {data.recent.length === 0 ? (
                                                            <Typography variant="caption" sx={{ color: 'grey.600' }}>No documents mirrored yet.</Typography>
                                                        ) : (
                                                            <Table size="small">
                                                                <TableBody>
                                                                    {data.recent.map((doc, i) => (
                                                                        <TableRow key={i}>
                                                                            <TableCell sx={{ color: 'grey.400', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.06)' }}>
                                                                                {doc.email || doc.title || doc._id}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                            </TabPanel>
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={deleteDialog.open}
                    onClose={() => setDeleteDialog({ open: false, type: '', id: 0, name: '' })}
                    PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white', borderRadius: 3 } }}
                >
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{ color: 'grey.400' }}>
                            Are you sure you want to delete <strong style={{ color: 'white' }}>{deleteDialog.name}</strong>?
                            This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setDeleteDialog({ open: false, type: '', id: 0, name: '' })} sx={{ color: 'grey.400' }}>
                            Cancel
                        </Button>
                        <Button onClick={handleDelete} variant="contained" color="error">
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* User Dialog */}
                <Dialog open={userDialog.open} onClose={() => setUserDialog({ ...userDialog, open: false })} PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white' } }}>
                    <DialogTitle>{userDialog.type === 'create' ? 'Create User' : 'Edit User'}</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Email Address"
                            type="email"
                            fullWidth
                            value={userDialog.data.email || ''}
                            onChange={(e) => setUserDialog({ ...userDialog, data: { ...userDialog.data, email: e.target.value } })}
                            sx={{ mt: 2, input: { color: 'white' }, label: { color: 'grey.500' } }}
                        />
                        <TextField
                            margin="dense"
                            label="Username"
                            fullWidth
                            value={userDialog.data.username || ''}
                            onChange={(e) => setUserDialog({ ...userDialog, data: { ...userDialog.data, username: e.target.value } })}
                            sx={{ mt: 2, input: { color: 'white' }, label: { color: 'grey.500' } }}
                        />
                        {(userDialog.type === 'create' || userDialog.type === 'edit') && (
                            <TextField
                                margin="dense"
                                label={userDialog.type === 'create' ? "Password" : "New Password (leave blank to keep)"}
                                type="password"
                                fullWidth
                                onChange={(e) => setUserDialog({ ...userDialog, data: { ...userDialog.data, password: e.target.value } as any })} // Pass any for custom password field
                                sx={{ mt: 2, input: { color: 'white' }, label: { color: 'grey.500' } }}
                            />
                        )}
                        <Grid container spacing={2} sx={{ mt: 2 }}>
                            <Grid item xs={6}>
                                <Typography component="div">Active</Typography>
                                <Switch
                                    checked={userDialog.data.is_active ?? true}
                                    onChange={(e) => setUserDialog({ ...userDialog, data: { ...userDialog.data, is_active: e.target.checked } })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <Typography component="div">Admin (Staff)</Typography>
                                <Switch
                                    checked={userDialog.data.is_staff ?? false}
                                    onChange={(e) => setUserDialog({ ...userDialog, data: { ...userDialog.data, is_staff: e.target.checked } })}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setUserDialog({ ...userDialog, open: false })} sx={{ color: 'grey.500' }}>Cancel</Button>
                        <Button onClick={handleUserSubmit} variant="contained" sx={{ bgcolor: '#6366f1' }}>Save</Button>
                    </DialogActions>
                </Dialog>

                {/* Blog Edit Dialog */}
                <Dialog open={blogDialog.open} onClose={() => setBlogDialog({ ...blogDialog, open: false })} PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white' } }}>
                    <DialogTitle>Edit Blog Post Metadata</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Title"
                            fullWidth
                            value={blogDialog.data.title || ''}
                            onChange={(e) => setBlogDialog({ ...blogDialog, data: { ...blogDialog.data, title: e.target.value } })}
                            sx={{ mt: 2, input: { color: 'white' }, label: { color: 'grey.500' } }}
                        />
                        <TextField
                            margin="dense"
                            label="Slug"
                            fullWidth
                            value={blogDialog.data.slug || ''}
                            onChange={(e) => setBlogDialog({ ...blogDialog, data: { ...blogDialog.data, slug: e.target.value } })}
                            sx={{ mt: 2, input: { color: 'white' }, label: { color: 'grey.500' } }}
                        />
                        <Typography variant="caption" sx={{ color: 'grey.500', mt: 2, display: 'block' }}>
                            To edit the full content, please delete and recreate the post, or use the main blog editor (coming soon).
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setBlogDialog({ ...blogDialog, open: false })} sx={{ color: 'grey.500' }}>Cancel</Button>
                        <Button onClick={handleBlogSubmit} variant="contained" sx={{ bgcolor: '#6366f1' }}>Save</Button>
                    </DialogActions>
                </Dialog>

                {/* Download Edit Dialog */}
                <Dialog open={downloadDialog.open} onClose={() => setDownloadDialog({ ...downloadDialog, open: false })} PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white' } }}>
                    <DialogTitle>Edit Resource</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Name"
                            fullWidth
                            value={downloadDialog.data.name || ''}
                            onChange={(e) => setDownloadDialog({ ...downloadDialog, data: { ...downloadDialog.data, name: e.target.value } })}
                            sx={{ mt: 2, input: { color: 'white' }, label: { color: 'grey.500' } }}
                        />
                        <TextField
                            margin="dense"
                            label="Category"
                            fullWidth
                            value={downloadDialog.data.category || ''}
                            onChange={(e) => setDownloadDialog({ ...downloadDialog, data: { ...downloadDialog.data, category: e.target.value } })}
                            sx={{ mt: 2, input: { color: 'white' }, label: { color: 'grey.500' } }}
                        />
                        <TextField
                            margin="dense"
                            label="Version"
                            fullWidth
                            value={downloadDialog.data.version || ''}
                            onChange={(e) => setDownloadDialog({ ...downloadDialog, data: { ...downloadDialog.data, version: e.target.value } })}
                            sx={{ mt: 2, input: { color: 'white' }, label: { color: 'grey.500' } }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDownloadDialog({ ...downloadDialog, open: false })} sx={{ color: 'grey.500' }}>Cancel</Button>
                        <Button onClick={handleDownloadSubmit} variant="contained" sx={{ bgcolor: '#6366f1' }}>Save</Button>
                    </DialogActions>
                </Dialog>

                {/* Inquiry Detail / Reply Dialog — replying is always an explicit
                    action taken here; nothing is ever emailed to the requester
                    automatically on submission. */}
                <Dialog
                    open={inquiryDialog.open}
                    onClose={() => setInquiryDialog({ open: false, data: null })}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white' } }}
                >
                    <DialogTitle>Inquiry from {inquiryDialog.data?.name}</DialogTitle>
                    <DialogContent>
                        {inquiryDialog.data && (
                            <>
                                <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                    {inquiryDialog.data.email} • {inquiryDialog.data.inquiry_type}
                                    {inquiryDialog.data.project_type && ` • ${inquiryDialog.data.project_type}`}
                                    {inquiryDialog.data.budget && ` • Budget: ${inquiryDialog.data.budget}`}
                                </Typography>
                                {inquiryDialog.data.subject && (
                                    <Typography sx={{ color: 'white', fontWeight: 600, mt: 2 }}>
                                        {inquiryDialog.data.subject}
                                    </Typography>
                                )}
                                <Typography sx={{ color: 'grey.300', mt: 1, whiteSpace: 'pre-wrap' }}>
                                    {inquiryDialog.data.message}
                                </Typography>
                                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
                                <TextField
                                    label="Reply message"
                                    fullWidth
                                    multiline
                                    minRows={4}
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Write your reply — this will be emailed directly to the requester."
                                    sx={{ mt: 1, textarea: { color: 'white' }, label: { color: 'grey.500' } }}
                                />
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => inquiryDialog.data && handleInquiryStatusChange(inquiryDialog.data.id, 'closed')}
                            sx={{ color: 'grey.500' }}
                        >
                            Mark closed
                        </Button>
                        <Button onClick={() => setInquiryDialog({ open: false, data: null })} sx={{ color: 'grey.500' }}>Cancel</Button>
                        <Button
                            onClick={handleReplySubmit}
                            variant="contained"
                            disabled={!replyMessage.trim()}
                            startIcon={<Reply />}
                            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
                        >
                            Send Reply
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
};

export default AdminDashboardPage;
