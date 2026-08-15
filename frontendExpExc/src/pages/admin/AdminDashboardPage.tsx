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
    Block,
    QueryStats,
    Visibility,
    Insights,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    LabelList,
} from 'recharts';
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

interface BackupSnapshot {
    name: string;
    has_db: boolean;
    has_media: boolean;
    size_mb: number;
}

interface AdminUser {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
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

interface ToolRestriction {
    id: number;
    user_id: number;
    user_email: string;
    service_id: number;
    service_title: string;
    reason: string;
    restricted_by_email: string;
    created_at: string;
}

interface ToolUsageEntry {
    tool_name: string;
    total_calls: number;
    success_calls: number;
    failed_calls: number;
    last_used: string | null;
}

interface UserToolUsage {
    user_id: number;
    user_email: string;
    tool_usage: ToolUsageEntry[];
    restrictions: { service_id: number; service_title: string }[];
}

interface UsageAnalytics {
    window_days: number;
    total_calls: number;
    unique_tools_used: number;
    top_tools: { tool_name: string; total_calls: number }[];
    daily_trend: { date: string; total_calls: number }[];
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
    const [backups, setBackups] = useState<BackupSnapshot[]>([]);
    const [backupRunning, setBackupRunning] = useState(false);
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
    const [restrictions, setRestrictions] = useState<ToolRestriction[]>([]);
    const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: number; name: string }>({ open: false, type: '', id: 0, name: '' });
    const [userDialog, setUserDialog] = useState<{ open: boolean; type: 'create' | 'edit'; data: Partial<AdminUser> }>({ open: false, type: 'create', data: {} });
    const [downloadDialog, setDownloadDialog] = useState<{ open: boolean; data: Partial<AdminDownload> }>({ open: false, data: {} });
    const [blogDialog, setBlogDialog] = useState<{ open: boolean; data: Partial<AdminBlog> }>({ open: false, data: {} });
    const [inquiryDialog, setInquiryDialog] = useState<{ open: boolean; data: AdminInquiry | null }>({ open: false, data: null });
    const [replyMessage, setReplyMessage] = useState('');
    const [restrictionDialog, setRestrictionDialog] = useState<{ open: boolean; user_id: number | ''; service_id: number | ''; reason: string; error: string | null; submitting: boolean }>({
        open: false, user_id: '', service_id: '', reason: '', error: null, submitting: false,
    });
    const [userUsageDialog, setUserUsageDialog] = useState<{ open: boolean; loading: boolean; data: UserToolUsage | null }>({
        open: false, loading: false, data: null,
    });

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

    const fetchBackups = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/backups/');
            setBackups(response.data.snapshots || []);
        } catch (e) {
            console.error('Failed to fetch backups:', e);
        }
    }, []);

    const triggerBackup = useCallback(async () => {
        setBackupRunning(true);
        try {
            await apiClient.post('/api/services/admin/backups/');
            // The task runs async in the worker — poll once after a delay
            // rather than expecting it to already be done.
            setTimeout(() => { fetchBackups(); setBackupRunning(false); }, 5000);
        } catch (e) {
            console.error('Failed to trigger backup:', e);
            setBackupRunning(false);
        }
    }, [fetchBackups]);

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

    const fetchRestrictions = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/tool-restrictions/');
            setRestrictions(response.data.restrictions || []);
        } catch (e) {
            console.error('Failed to fetch tool restrictions:', e);
        }
    }, []);

    const fetchUsageAnalytics = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/services/admin/usage-analytics/');
            setUsageAnalytics(response.data);
        } catch (e) {
            console.error('Failed to fetch usage analytics:', e);
        }
    }, []);

    const fetchUserToolUsage = useCallback(async (userId: number) => {
        setUserUsageDialog({ open: true, loading: true, data: null });
        try {
            const response = await apiClient.get(`/api/services/admin/users/${userId}/tool-usage/`);
            setUserUsageDialog({ open: true, loading: false, data: response.data });
        } catch (e) {
            console.error('Failed to fetch user tool usage:', e);
            setUserUsageDialog({ open: true, loading: false, data: null });
            setError('Failed to load tool usage for this user');
        }
    }, []);

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchMetrics(),
                fetchMongoStatus(),
                fetchBackups(),
                fetchUsers(),
                fetchBlogs(),
                fetchDownloads(),
                fetchOllamaModels(),
                fetchOllamaStatus(),
                fetchToolServices(),
                fetchInquiries(),
                fetchThreads(),
                fetchRestrictions(),
                fetchUsageAnalytics(),
            ]);
            setLoading(false);
        };
        loadData();
    }, [fetchMetrics, fetchMongoStatus, fetchBackups, fetchUsers, fetchBlogs, fetchDownloads, fetchOllamaModels, fetchOllamaStatus, fetchToolServices, fetchInquiries, fetchThreads, fetchRestrictions, fetchUsageAnalytics]);

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
            } else if (type === 'restriction') {
                await apiClient.delete(`/api/services/admin/tool-restrictions/${id}/`);
                setRestrictions(restrictions.filter(r => r.id !== id));
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

    const handleCreateRestriction = async () => {
        if (!restrictionDialog.user_id || !restrictionDialog.service_id) {
            setRestrictionDialog(prev => ({ ...prev, error: 'Pick a user and a tool.' }));
            return;
        }
        setRestrictionDialog(prev => ({ ...prev, submitting: true, error: null }));
        try {
            const res = await apiClient.post('/api/services/admin/tool-restrictions/', {
                user_id: restrictionDialog.user_id,
                service_id: restrictionDialog.service_id,
                reason: restrictionDialog.reason || undefined,
            });
            setRestrictions(prev => [res.data, ...prev]);
            setRestrictionDialog({ open: false, user_id: '', service_id: '', reason: '', error: null, submitting: false });
        } catch (e: any) {
            setRestrictionDialog(prev => ({
                ...prev,
                submitting: false,
                error: e.response?.data?.error || 'Failed to create restriction',
            }));
        }
    };

    // Cross-reference a restriction shown inline in the per-user usage dialog
    // (which only carries service_id/service_title) against the full
    // restrictions list (which carries the id the DELETE endpoint needs).
    const findRestrictionId = (userId: number, serviceId: number): number | null => {
        const match = restrictions.find(r => r.user_id === userId && r.service_id === serviceId);
        return match ? match.id : null;
    };

    // ============ Filter Functions ============
    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.last_name || '').toLowerCase().includes(searchQuery.toLowerCase())
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
        { label: 'User Restrictions', icon: <Block /> },
        { label: 'Analytics', icon: <QueryStats /> },
        { label: 'Inquiries', icon: <Email /> },
        { label: 'Threads', icon: <Forum /> },
        { label: 'Mongo', icon: <Storage /> },
        { label: 'Backups', icon: <CloudDownload /> },
    ];

    // ============ Render ============
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0f', position: 'relative' }}>
            <Seo title="Admin Dashboard" description="System administration and monitoring" />

            {/* pb reserves clearance so table rows/action switches in the last
                visible row aren't covered by the fixed chat widget launcher
                (bottom:24/right:24, ~84px footprint) when this page's tables
                scroll near the bottom of the viewport. */}
            <Container maxWidth="xl" sx={{ py: 4, pb: 14, position: 'relative', zIndex: 1 }}>
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
                                                                {(user.first_name || user.last_name) && (
                                                                    <Typography variant="caption" sx={{ color: 'grey.500' }}>{`${user.first_name || ''} ${user.last_name || ''}`.trim()}</Typography>
                                                                )}
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
                                                        <Tooltip title="View tool usage">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => fetchUserToolUsage(user.id)}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#8b5cf6' }, mr: 1 }}
                                                            >
                                                                <Visibility fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
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
                                                                                onClick={() => handleOllamaAction('load', model.name)}
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

                            {/* ============ USER RESTRICTIONS TAB ============ */}
                            <TabPanel value={activeTab} index={7}>
                                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                                            User Tool Restrictions
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'grey.400' }}>
                                            Ban a specific user from a specific tool. Restricted users keep access to everything else.
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        startIcon={<Block />}
                                        onClick={() => setRestrictionDialog({ open: true, user_id: '', service_id: '', reason: '', error: null, submitting: false })}
                                        sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, textTransform: 'none', fontWeight: 600 }}
                                    >
                                        Add Restriction
                                    </Button>
                                </Box>

                                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>User</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Tool</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Reason</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Restricted By</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Date</TableCell>
                                                <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {restrictions.map((r) => (
                                                <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                    <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.06)' }}>{r.user_email}</TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Chip
                                                            icon={<Block sx={{ fontSize: 16 }} />}
                                                            label={r.service_title}
                                                            size="small"
                                                            sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)', maxWidth: 240 }}>
                                                        <Typography noWrap variant="body2" sx={{ color: 'grey.400' }}>{r.reason || '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'grey.500', borderColor: 'rgba(255,255,255,0.06)' }}>{r.restricted_by_email}</TableCell>
                                                    <TableCell sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.06)' }}>{formatDate(r.created_at)}</TableCell>
                                                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <Tooltip title="Lift restriction">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDeleteDialog({ open: true, type: 'restriction', id: r.id, name: `${r.user_email} → ${r.service_title}` })}
                                                                sx={{ color: 'grey.500', '&:hover': { color: '#10b981' } }}
                                                            >
                                                                <LockOpen fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {restrictions.length === 0 && (
                                    <Typography variant="body2" sx={{ color: 'grey.600', textAlign: 'center', py: 4 }}>
                                        No active restrictions. Every user has access to every tool they're otherwise entitled to.
                                    </Typography>
                                )}
                                <Typography variant="caption" sx={{ color: 'grey.600', mt: 2, display: 'block' }}>
                                    {restrictions.length} active restriction{restrictions.length === 1 ? '' : 's'}
                                </Typography>
                            </TabPanel>

                            {/* ============ USAGE ANALYTICS TAB ============ */}
                            <TabPanel value={activeTab} index={8}>
                                {!usageAnalytics ? (
                                    <Typography sx={{ color: 'grey.500' }}>Loading usage analytics…</Typography>
                                ) : (
                                    <>
                                        <Typography variant="body2" sx={{ color: 'grey.400', mb: 3 }}>
                                            Site-wide tool usage over the last {usageAnalytics.window_days} days.
                                        </Typography>

                                        <Grid container spacing={3} sx={{ mb: 3 }}>
                                            <Grid item xs={12} sm={6} md={3}>
                                                <MetricCard
                                                    title="Total Calls"
                                                    value={usageAnalytics.total_calls.toLocaleString()}
                                                    subtitle={`Last ${usageAnalytics.window_days} days`}
                                                    icon={<QueryStats />}
                                                    color="#6366f1"
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6} md={3}>
                                                <MetricCard
                                                    title="Unique Tools Used"
                                                    value={usageAnalytics.unique_tools_used}
                                                    subtitle={`Last ${usageAnalytics.window_days} days`}
                                                    icon={<Insights />}
                                                    color="#8b5cf6"
                                                />
                                            </Grid>
                                        </Grid>

                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={6}>
                                                <Paper sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, p: 3 }}>
                                                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
                                                        Top Tools by Usage
                                                    </Typography>
                                                    {usageAnalytics.top_tools.length === 0 ? (
                                                        <Typography variant="body2" sx={{ color: 'grey.600', py: 4, textAlign: 'center' }}>
                                                            No tool usage recorded yet.
                                                        </Typography>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height={Math.max(280, usageAnalytics.top_tools.length * 38)}>
                                                            <BarChart
                                                                data={usageAnalytics.top_tools}
                                                                layout="vertical"
                                                                margin={{ top: 4, right: 36, left: 8, bottom: 4 }}
                                                            >
                                                                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.08)" />
                                                                <XAxis
                                                                    type="number"
                                                                    allowDecimals={false}
                                                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                                    tickLine={false}
                                                                />
                                                                <YAxis
                                                                    type="category"
                                                                    dataKey="tool_name"
                                                                    width={140}
                                                                    tick={{ fill: '#d1d5db', fontSize: 12 }}
                                                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                                    tickLine={false}
                                                                />
                                                                <RechartsTooltip
                                                                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }}
                                                                    labelStyle={{ color: 'white', fontWeight: 600 }}
                                                                    formatter={(value: number) => [value.toLocaleString(), 'Calls']}
                                                                />
                                                                <Bar dataKey="total_calls" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={22}>
                                                                    <LabelList
                                                                        dataKey="total_calls"
                                                                        position="right"
                                                                        style={{ fill: '#d1d5db', fontSize: 12 }}
                                                                        formatter={(value: number) => value.toLocaleString()}
                                                                    />
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </Paper>
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <Paper sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, p: 3 }}>
                                                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
                                                        Daily Usage Trend
                                                    </Typography>
                                                    {usageAnalytics.daily_trend.length === 0 ? (
                                                        <Typography variant="body2" sx={{ color: 'grey.600', py: 4, textAlign: 'center' }}>
                                                            No usage recorded yet.
                                                        </Typography>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height={320}>
                                                            <AreaChart
                                                                data={usageAnalytics.daily_trend}
                                                                margin={{ top: 8, right: 16, left: -8, bottom: 4 }}
                                                            >
                                                                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                                                                <XAxis
                                                                    dataKey="date"
                                                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                                    tickLine={false}
                                                                    tickFormatter={(d: string) => d.slice(5)}
                                                                    minTickGap={24}
                                                                />
                                                                <YAxis
                                                                    allowDecimals={false}
                                                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                                    tickLine={false}
                                                                    width={40}
                                                                />
                                                                <RechartsTooltip
                                                                    cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }}
                                                                    labelStyle={{ color: 'white', fontWeight: 600 }}
                                                                    formatter={(value: number) => [value.toLocaleString(), 'Calls']}
                                                                />
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey="total_calls"
                                                                    stroke="#6366f1"
                                                                    strokeWidth={2}
                                                                    fill="#6366f1"
                                                                    fillOpacity={0.12}
                                                                    activeDot={{ r: 4, fill: '#6366f1', stroke: '#0a0a0f', strokeWidth: 2 }}
                                                                />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </Paper>
                                            </Grid>
                                        </Grid>
                                    </>
                                )}
                            </TabPanel>

                            {/* ============ INQUIRIES TAB ============ */}
                            <TabPanel value={activeTab} index={9}>
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
                            <TabPanel value={activeTab} index={10}>
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

                            <TabPanel value={activeTab} index={11}>
                                <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>MongoDB Atlas | Cross-Instance Mirror</Typography>
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
                                                            <Chip label={`${data.count ?? 'N/A'} docs`} size="small" color={data.count ? 'success' : 'default'} />
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

                            <TabPanel value={activeTab} index={12}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ color: 'white' }}>Local Backups</Typography>
                                        <Typography variant="body2" sx={{ color: 'grey.500' }}>
                                            Daily snapshot of db.sqlite3 + media at 3:30am, last 14 kept. Render (Postgres) and MongoDB Atlas manage their own backups separately.
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        startIcon={backupRunning ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <CloudDownload />}
                                        onClick={triggerBackup}
                                        disabled={backupRunning}
                                    >
                                        {backupRunning ? 'Backing up…' : 'Back Up Now'}
                                    </Button>
                                </Box>
                                {backups.length === 0 ? (
                                    <Typography sx={{ color: 'grey.500' }}>No backups yet.</Typography>
                                ) : (
                                    <TableContainer sx={{ bgcolor: '#1e293b', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ color: 'grey.400' }}>Snapshot</TableCell>
                                                    <TableCell sx={{ color: 'grey.400' }}>Database</TableCell>
                                                    <TableCell sx={{ color: 'grey.400' }}>Media</TableCell>
                                                    <TableCell sx={{ color: 'grey.400' }}>Size</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {backups.map((b) => (
                                                    <TableRow key={b.name}>
                                                        <TableCell sx={{ color: 'white', fontFamily: 'monospace', fontSize: '0.8rem' }}>{b.name}</TableCell>
                                                        <TableCell>
                                                            <Chip label={b.has_db ? 'yes' : 'missing'} size="small" color={b.has_db ? 'success' : 'error'} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={b.has_media ? 'yes' : 'missing'} size="small" color={b.has_media ? 'success' : 'default'} />
                                                        </TableCell>
                                                        <TableCell sx={{ color: 'grey.300' }}>{b.size_mb} MB</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
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
                            label="First Name"
                            fullWidth
                            value={userDialog.data.first_name || ''}
                            onChange={(e) => setUserDialog({ ...userDialog, data: { ...userDialog.data, first_name: e.target.value } })}
                            sx={{ mt: 2, input: { color: 'white' }, label: { color: 'grey.500' } }}
                        />
                        <TextField
                            margin="dense"
                            label="Last Name"
                            fullWidth
                            value={userDialog.data.last_name || ''}
                            onChange={(e) => setUserDialog({ ...userDialog, data: { ...userDialog.data, last_name: e.target.value } })}
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

                {/* Inquiry Detail / Reply Dialog, replying is always an explicit
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
                                    placeholder="Write your reply. This will be emailed directly to the requester."
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

                {/* Restriction Dialog — ban a specific user from a specific tool
                    (User Restrictions tab, and reachable from the per-user usage
                    drill-in below) */}
                <Dialog
                    open={restrictionDialog.open}
                    onClose={() => setRestrictionDialog({ open: false, user_id: '', service_id: '', reason: '', error: null, submitting: false })}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white' } }}
                >
                    <DialogTitle>Restrict User from a Tool</DialogTitle>
                    <DialogContent>
                        {restrictionDialog.error && (
                            <Alert severity="error" sx={{ mt: 1, mb: 1, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
                                {restrictionDialog.error}
                            </Alert>
                        )}
                        <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                            <InputLabel sx={{ color: 'grey.500' }}>User</InputLabel>
                            <Select
                                value={restrictionDialog.user_id}
                                label="User"
                                onChange={(e) => setRestrictionDialog({ ...restrictionDialog, user_id: Number(e.target.value), error: null })}
                                sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' } }}
                            >
                                {users.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>{u.email}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                            <InputLabel sx={{ color: 'grey.500' }}>Tool</InputLabel>
                            <Select
                                value={restrictionDialog.service_id}
                                label="Tool"
                                onChange={(e) => setRestrictionDialog({ ...restrictionDialog, service_id: Number(e.target.value), error: null })}
                                sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' } }}
                            >
                                {toolServices.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Reason (optional)"
                            fullWidth
                            multiline
                            minRows={2}
                            value={restrictionDialog.reason}
                            onChange={(e) => setRestrictionDialog({ ...restrictionDialog, reason: e.target.value })}
                            sx={{ mt: 2, textarea: { color: 'white' }, label: { color: 'grey.500' } }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRestrictionDialog({ open: false, user_id: '', service_id: '', reason: '', error: null, submitting: false })} sx={{ color: 'grey.500' }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateRestriction}
                            variant="contained"
                            disabled={restrictionDialog.submitting}
                            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
                        >
                            {restrictionDialog.submitting ? 'Restricting…' : 'Restrict'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Per-user tool usage drill-in, opened from the "View tool usage"
                    action in the Users tab. */}
                <Dialog
                    open={userUsageDialog.open}
                    onClose={() => setUserUsageDialog({ open: false, loading: false, data: null })}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white' } }}
                >
                    <DialogTitle>
                        Tool Usage{userUsageDialog.data ? ` — ${userUsageDialog.data.user_email}` : ''}
                    </DialogTitle>
                    <DialogContent>
                        {userUsageDialog.loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress sx={{ color: '#6366f1' }} />
                            </Box>
                        ) : !userUsageDialog.data ? (
                            <Typography sx={{ color: 'grey.500' }}>Failed to load usage.</Typography>
                        ) : (
                            <>
                                {userUsageDialog.data.restrictions.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mb: 1 }}>
                                            Currently restricted from
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {userUsageDialog.data.restrictions.map((r) => {
                                                const usageData = userUsageDialog.data!;
                                                const restrictionId = findRestrictionId(usageData.user_id, r.service_id);
                                                return (
                                                    <Chip
                                                        key={r.service_id}
                                                        icon={<Block sx={{ fontSize: 16 }} />}
                                                        label={r.service_title}
                                                        size="small"
                                                        onDelete={restrictionId ? () => setDeleteDialog({ open: true, type: 'restriction', id: restrictionId, name: `${usageData.user_email} → ${r.service_title}` }) : undefined}
                                                        sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
                                                    />
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                )}

                                <Button
                                    size="small"
                                    startIcon={<Block />}
                                    onClick={() => setRestrictionDialog({ open: true, user_id: userUsageDialog.data!.user_id, service_id: '', reason: '', error: null, submitting: false })}
                                    sx={{ color: '#fca5a5', textTransform: 'none', mb: 2 }}
                                >
                                    Restrict from a tool
                                </Button>

                                {userUsageDialog.data.tool_usage.length === 0 ? (
                                    <Typography variant="body2" sx={{ color: 'grey.600', textAlign: 'center', py: 3 }}>
                                        This user hasn't used any tools yet.
                                    </Typography>
                                ) : (
                                    <TableContainer sx={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Tool</TableCell>
                                                    <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }} align="right">Calls</TableCell>
                                                    <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }} align="right">OK / Fail</TableCell>
                                                    <TableCell sx={{ color: 'grey.400', fontWeight: 600, borderColor: 'rgba(255,255,255,0.06)' }}>Last Used</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {userUsageDialog.data.tool_usage.map((t) => (
                                                    <TableRow key={t.tool_name}>
                                                        <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.06)' }}>{t.tool_name}</TableCell>
                                                        <TableCell sx={{ color: 'grey.300', borderColor: 'rgba(255,255,255,0.06)' }} align="right">{t.total_calls.toLocaleString()}</TableCell>
                                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)' }} align="right">
                                                            <Typography component="span" variant="body2" sx={{ color: '#86efac' }}>{t.success_calls}</Typography>
                                                            {' / '}
                                                            <Typography component="span" variant="body2" sx={{ color: '#fca5a5' }}>{t.failed_calls}</Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ color: 'grey.500', borderColor: 'rgba(255,255,255,0.06)' }}>
                                                            {t.last_used ? formatDate(t.last_used) : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setUserUsageDialog({ open: false, loading: false, data: null })} sx={{ color: 'grey.500' }}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
};

export default AdminDashboardPage;
