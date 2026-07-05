import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    TextField,
    IconButton,
    Paper,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Drawer,
    Divider,
    Avatar,
    alpha,
    useTheme,
    useMediaQuery,
    Tooltip,
    Alert,
    Stack,
    Button,
    Collapse,
    Zoom,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import {
    Send,
    Add,
    Menu as MenuIcon,
    Person,
    Delete,
    Close,
    ContentCopy,
    Check,
    ViewSidebar,
    Refresh,
    DeleteSweep,
    AccessTime,
    Home,
    HourglassEmpty,
    Speed,
    Memory,
    CheckCircle,
    Cancel,
    ArrowBack,
    Lightbulb,
    HelpOutline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/seo/Seo';
import apiClient, { API_BASE_URL, HEAVY_API_BASE_URL } from '../api/config';
import CleanStarBackground from '../components/CleanStarBackground';

const apiBaseUrl = HEAVY_API_BASE_URL;

// --- Types ---
type Mood = 'neutral' | 'thinking' | 'happy' | 'excited' | 'sleeping' | 'idea' | 'error';

interface Message {
    id?: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
    isWidget?: boolean;
    widgetType?: 'clock' | 'idea' | 'qr';
    widgetData?: any;
    agentSteps?: AgentStep[];
}

interface Conversation {
    id: number;
    title: string;
    model: string;
    created_at: string;
    updated_at: string;
    message_count: number;
}

interface AgentStep {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'failed';
}

interface GroupedConversations {
    today: Conversation[];
    yesterday: Conversation[];
    lastWeek: Conversation[];
    older: Conversation[];
}

// --- Custom Animated SVG Face Component ---
const ChatbotFace: React.FC<{ mood: Mood }> = ({ mood }) => {
    const theme = useTheme();
    const colorMap = {
        neutral: '#00eeff', // Cyan
        thinking: '#00eeff', // Cyan
        happy: theme.palette.primary.main, // Neon Green
        excited: theme.palette.primary.main, // Neon Green
        sleeping: '#8b5cf6', // Purple
        idea: '#f59e0b', // Amber
        error: '#ef4444', // Red
    };

    const activeColor = colorMap[mood] || '#00eeff';

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
            <motion.div
                animate={mood === 'sleeping' ? {
                    scale: [1, 0.97, 1],
                    y: [0, 4, 0]
                } : {
                    y: [0, -6, 0],
                }}
                transition={{
                    duration: mood === 'sleeping' ? 4 : 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                style={{ position: 'relative', width: 120, height: 120 }}
            >
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <filter id="eye-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Antennas / Side Ears */}
                    <motion.path
                        d="M 15 60 L 5 60 M 105 60 L 115 60"
                        stroke={activeColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                        animate={mood === 'excited' ? { strokeWidth: [3, 5, 3] } : {}}
                        transition={{ duration: 0.5, repeat: Infinity }}
                    />
                    <motion.circle
                        cx="5" cy="60" r="3"
                        fill={activeColor}
                        animate={mood === 'excited' ? { scale: [1, 1.5, 1] } : {}}
                        transition={{ duration: 0.5, repeat: Infinity }}
                    />
                    <motion.circle
                        cx="115" cy="60" r="3"
                        fill={activeColor}
                        animate={mood === 'excited' ? { scale: [1, 1.5, 1] } : {}}
                        transition={{ duration: 0.5, repeat: Infinity }}
                    />

                    {/* Head Chassis */}
                    <motion.rect
                        x="20"
                        y="25"
                        width="80"
                        height="70"
                        rx="20"
                        stroke={activeColor}
                        strokeWidth="3"
                        fill="rgba(13, 14, 18, 0.8)"
                        style={{ filter: 'url(#glow)' }}
                        animate={
                            mood === 'thinking'
                                ? { strokeDasharray: ["8, 4", "4, 8", "8, 4"], strokeDashoffset: [0, 12] }
                                : mood === 'error'
                                ? { x: [20, 22, 18, 20], y: [25, 24, 26, 25] }
                                : {}
                        }
                        transition={
                            mood === 'thinking'
                                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                                : mood === 'error'
                                ? { duration: 0.15, repeat: Infinity }
                                : {}
                        }
                    />

                    {/* Golden Lightbulb / Spark for Idea Mood */}
                    {mood === 'idea' && (
                        <motion.g
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <path d="M 60 5 L 60 18" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 48 10 L 53 15" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 72 10 L 67 15" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="60" cy="18" r="4" fill="#f59e0b" />
                        </motion.g>
                    )}

                    {/* Floating Zzz for Sleeping Mood */}
                    {mood === 'sleeping' && (
                        <motion.g>
                            <motion.text
                                x="95" y="25"
                                fill="#8b5cf6"
                                fontSize="10"
                                fontWeight="bold"
                                animate={{ opacity: [0, 1, 0], y: [25, 10], x: [95, 100] }}
                                transition={{ duration: 3, repeat: Infinity, delay: 0 }}
                            >
                                Z
                            </motion.text>
                            <motion.text
                                x="90" y="35"
                                fill="#8b5cf6"
                                fontSize="14"
                                fontWeight="bold"
                                animate={{ opacity: [0, 1, 0], y: [35, 15], x: [90, 98] }}
                                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                            >
                                Z
                            </motion.text>
                        </motion.g>
                    )}

                    {/* Eyes Group */}
                    <g style={{ filter: 'url(#eye-glow)' }}>
                        {/* Left Eye */}
                        {mood === 'neutral' && (
                            <motion.ellipse
                                cx="42" cy="53" rx="6" ry="8"
                                fill={activeColor}
                                animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                            />
                        )}
                        {mood === 'thinking' && (
                            <motion.path
                                d="M 36 53 A 6 6 0 1 1 48 53"
                                stroke={activeColor}
                                strokeWidth="3"
                                strokeLinecap="round"
                                animate={{ rotate: 360 }}
                                style={{ originX: '42px', originY: '53px' }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                        )}
                        {mood === 'happy' && (
                            <path d="M 35 56 Q 42 48 49 56" stroke={activeColor} strokeWidth="3.5" strokeLinecap="round" />
                        )}
                        {mood === 'excited' && (
                            <motion.circle
                                cx="42" cy="53" r="8"
                                fill={activeColor}
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.6, repeat: Infinity }}
                            />
                        )}
                        {mood === 'sleeping' && (
                            <path d="M 35 55 L 47 55" stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
                        )}
                        {mood === 'idea' && (
                            <g>
                                <circle cx="42" cy="53" r="8" fill={activeColor} />
                                <circle cx="42" cy="53" r="3" fill="#000" />
                            </g>
                        )}
                        {mood === 'error' && (
                            <path d="M 37 48 L 47 58 M 47 48 L 37 58" stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
                        )}

                        {/* Right Eye */}
                        {mood === 'neutral' && (
                            <motion.ellipse
                                cx="78" cy="53" rx="6" ry="8"
                                fill={activeColor}
                                animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2.2 }}
                            />
                        )}
                        {mood === 'thinking' && (
                            <motion.path
                                d="M 72 53 A 6 6 0 1 1 84 53"
                                stroke={activeColor}
                                strokeWidth="3"
                                strokeLinecap="round"
                                animate={{ rotate: -360 }}
                                style={{ originX: '78px', originY: '53px' }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                        )}
                        {mood === 'happy' && (
                            <path d="M 71 56 Q 78 48 85 56" stroke={activeColor} strokeWidth="3.5" strokeLinecap="round" />
                        )}
                        {mood === 'excited' && (
                            <motion.circle
                                cx="78" cy="53" r="8"
                                fill={activeColor}
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                            />
                        )}
                        {mood === 'sleeping' && (
                            <path d="M 71 55 L 83 55" stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
                        )}
                        {mood === 'idea' && (
                            <g>
                                <circle cx="78" cy="53" r="8" fill={activeColor} />
                                <circle cx="78" cy="53" r="3" fill="#000" />
                            </g>
                        )}
                        {mood === 'error' && (
                            <path d="M 73 48 L 83 58 M 83 48 L 73 58" stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
                        )}
                    </g>

                    {/* Mouth / Waveform */}
                    {mood === 'neutral' && (
                        <motion.path
                            d="M 45 78 Q 60 76 75 78"
                            stroke={activeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                            animate={{ d: ["M 45 78 Q 60 76 75 78", "M 45 78 Q 60 80 75 78", "M 45 78 Q 60 76 75 78"] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    )}
                    {mood === 'thinking' && (
                        <motion.path
                            d="M 45 78 Q 50 72 55 78 T 65 78 T 75 78"
                            stroke={activeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                            animate={{ d: [
                                "M 45 78 Q 50 72 55 78 T 65 78 T 75 78",
                                "M 45 78 Q 50 84 55 78 T 65 78 T 75 78",
                                "M 45 78 Q 50 72 55 78 T 65 78 T 75 78"
                            ] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        />
                    )}
                    {mood === 'happy' && (
                        <path d="M 45 75 Q 60 88 75 75" stroke={activeColor} strokeWidth="3.5" strokeLinecap="round" />
                    )}
                    {mood === 'excited' && (
                        <motion.path
                            d="M 40 76 Q 45 68 50 76 T 60 76 T 70 76 T 80 76"
                            stroke={activeColor}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            animate={{ d: [
                                "M 40 76 Q 45 66 50 76 T 60 76 T 70 76 T 80 76",
                                "M 40 76 Q 45 86 50 76 T 60 76 T 70 76 T 80 76",
                                "M 40 76 Q 45 66 50 76 T 60 76 T 70 76 T 80 76"
                              ] }}
                            transition={{ duration: 0.4, repeat: Infinity }}
                        />
                    )}
                    {mood === 'sleeping' && (
                        <motion.path
                            d="M 50 78 Q 60 81 70 78"
                            stroke={activeColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            animate={{ d: ["M 50 78 Q 60 81 70 78", "M 50 78 Q 60 76 70 78", "M 50 78 Q 60 81 70 78"] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        />
                    )}
                    {mood === 'idea' && (
                        <motion.circle
                            cx="60" cy="78" r="3"
                            fill={activeColor}
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                        />
                    )}
                    {mood === 'error' && (
                        <path d="M 45 80 L 50 76 L 55 80 L 60 76 L 65 80 L 70 76 L 75 80" stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
                    )}
                </svg>
            </motion.div>
        </Box>
    );
};

// --- Glowing Clock Widget ---
const ClockWidget: React.FC = () => {
    const theme = useTheme();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Box sx={{
            p: 3,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(13,14,18,0.8) 0%, rgba(5,5,5,0.9) 100%)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}, inset 0 0 15px ${alpha(theme.palette.primary.main, 0.05)}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 320,
            mx: 'auto',
            my: 2
        }}>
            <AccessTime sx={{ fontSize: 40, color: 'primary.main', mb: 1.5 }} />
            <Typography variant="h3" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: 'primary.main', letterSpacing: 1 }}>
                {time.toLocaleTimeString()}
            </Typography>
            <Typography variant="body2" color="grey.400" sx={{ mt: 1, fontWeight: 600 }}>
                {time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
            <Typography variant="caption" color="grey.650" sx={{ mt: 0.5 }}>
                Local Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </Typography>
        </Box>
    );
};

// --- Agent Steps UI Indicator ---
const AgentStepsIndicator: React.FC<{ steps: AgentStep[] }> = ({ steps }) => {
    return (
        <Box sx={{
            mb: 2,
            p: 2,
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
            bgcolor: 'rgba(0, 0, 0, 0.2)',
            maxWidth: 400
        }}>
            <Typography variant="caption" sx={{ color: '#00eeff', fontWeight: 800, letterSpacing: 1.5, display: 'block', mb: 1.5, textTransform: 'uppercase' }}>
                Agent Execution Log
            </Typography>
            <Stack spacing={1}>
                {steps.map((step) => (
                    <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        {step.status === 'running' && (
                            <HourglassEmpty sx={{ fontSize: 16, color: '#00eeff', animation: 'spin 2s linear infinite', flexShrink: 0 }} />
                        )}
                        {step.status === 'done' && (
                            <CheckCircle sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                        )}
                        {step.status === 'pending' && (
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'grey.700', ml: 0.75, mr: 0.75, flexShrink: 0 }} />
                        )}
                        {step.status === 'failed' && (
                            <Cancel sx={{ fontSize: 16, color: '#ef4444', flexShrink: 0 }} />
                        )}
                        <Tooltip title={step.label}>
                            <Typography
                                variant="body2"
                                noWrap
                                sx={{
                                    fontWeight: 600,
                                    color: step.status === 'done' ? 'grey.300' : step.status === 'running' ? '#00eeff' : 'grey.550',
                                    fontSize: '0.85rem',
                                    minWidth: 0,
                                }}
                            >
                                {step.label}
                            </Typography>
                        </Tooltip>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

// --- QR Code Widget (rendered when the chatbot's qr_generator tool runs) ---
const QrWidget: React.FC<{ url: string; encoded?: string }> = ({ url, encoded }) => {
    const theme = useTheme();
    const apiBaseUrlForMedia = API_BASE_URL;
    const fullUrl = url.startsWith('http') ? url : `${apiBaseUrlForMedia}${url}`;
    return (
        <Box sx={{
            p: 3,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(13,14,18,0.8) 0%, rgba(5,5,5,0.9) 100%)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}, inset 0 0 15px ${alpha(theme.palette.primary.main, 0.05)}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 280,
            mx: 'auto',
            my: 2
        }}>
            <Box component="img" src={fullUrl} alt="Generated QR code" sx={{ width: 200, height: 200, borderRadius: 1, bgcolor: '#fff', p: 1 }} />
            {encoded && (
                <Typography variant="caption" color="grey.500" sx={{ mt: 1.5, wordBreak: 'break-all', textAlign: 'center' }}>
                    {encoded}
                </Typography>
            )}
            <Button
                size="small"
                href={fullUrl}
                download
                sx={{ mt: 1.5 }}
            >
                Download
            </Button>
        </Box>
    );
};

// --- Helper Functions ---
const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const groupConversationsByDate = (conversations: Conversation[]): GroupedConversations => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const lastWeek = new Date(today.getTime() - 7 * 86400000);

    return conversations.reduce<GroupedConversations>(
        (groups, conv) => {
            const convDate = new Date(conv.updated_at);
            if (convDate >= today) {
                groups.today.push(conv);
            } else if (convDate >= yesterday) {
                groups.yesterday.push(conv);
            } else if (convDate >= lastWeek) {
                groups.lastWeek.push(conv);
            } else {
                groups.older.push(conv);
            }
            return groups;
        },
        { today: [], yesterday: [], lastWeek: [], older: [] }
    );
};

const ChatbotPage: React.FC = () => {
    const themed = useTheme();
    const isMobile = useMediaQuery(themed.breakpoints.down('md'));
    const navigate = useNavigate();

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Dialog states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

    // Chatbot mood
    const [mood, setMood] = useState<Mood>('neutral');

    // Agent Steps state
    const [activeSteps, setActiveSteps] = useState<AgentStep[]>([]);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastRenderTimeRef = useRef<number>(0);
    const accumulatedContentRef = useRef<string>('');

    // Check Ollama status
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const checkStatus = async () => {
            try {
                const response = await apiClient.get('/api/chatbot/status/', {
                    signal: controller.signal
                });
                if (isMounted) {
                    setIsAvailable(response.data.available);
                }
            } catch (err: any) {
                if (err.name !== 'CanceledError' && isMounted) {
                    setIsAvailable(false);
                }
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000);

        return () => {
            isMounted = false;
            controller.abort();
            clearInterval(interval);
        };
    }, []);

    // Load Conversations
    useEffect(() => {
        const loadConversations = async () => {
            try {
                const response = await apiClient.get('/api/chatbot/conversations/');
                setConversations(response.data);
                localStorage.setItem('chat_conversations', JSON.stringify(response.data));
            } catch (err) {
                const saved = localStorage.getItem('chat_conversations');
                if (saved) setConversations(JSON.parse(saved));
            }
        };
        loadConversations();
    }, [currentConversationId]);

    // Save/Restore messages
    useEffect(() => {
        if (currentConversationId) {
            localStorage.setItem(`chat_messages_${currentConversationId}`, JSON.stringify(messages));
        }
    }, [messages, currentConversationId]);

    const restoreMessagesFromLocalStorage = useCallback((id: number) => {
        const saved = localStorage.getItem(`chat_messages_${id}`);
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }, []);

    // Scroll handling
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, activeSteps, scrollToBottom]);

    // Group conversations
    const groupedConversations = useMemo(() =>
        groupConversationsByDate(conversations),
        [conversations]
    );

    const loadConversation = async (id: number) => {
        restoreMessagesFromLocalStorage(id);
        try {
            const response = await apiClient.get(`/api/chatbot/conversations/${id}/`);
            setMessages(response.data.messages || []);
            setCurrentConversationId(id);
            setMobileDrawerOpen(false);
            localStorage.setItem(`chat_messages_${id}`, JSON.stringify(response.data.messages || []));
            setMood('neutral');
        } catch {
            setError('Failed to load conversation');
        }
    };

    const startNewConversation = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setMessages([]);
        setCurrentConversationId(null);
        setError(null);
        setMobileDrawerOpen(false);
        setMood('neutral');
        inputRef.current?.focus();
    };

    const handleDeleteClick = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setConversationToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!conversationToDelete) return;
        try {
            await apiClient.delete(`/api/chatbot/conversations/${conversationToDelete}/`);
            setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
            if (currentConversationId === conversationToDelete) startNewConversation();
        } catch {
            console.error('Failed to delete');
        }
        setDeleteDialogOpen(false);
        setConversationToDelete(null);
    };

    const handleClearAllClick = () => {
        setClearAllDialogOpen(true);
    };

    const confirmClearAll = async () => {
        try {
            await apiClient.delete('/api/chatbot/conversations/clear/');
            setConversations([]);
            startNewConversation();
        } catch {
            console.error('Failed to clear all');
        }
        setClearAllDialogOpen(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleTextKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // --- Send Message ---
    const sendMessage = async (messageText?: string) => {
        const text = messageText || inputValue.trim();
        if (!text || isLoading || isStreaming) return;

        const userMessage: Message = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);
        accumulatedContentRef.current = '';

        // Real agent steps (if any) arrive as SSE 'step' events from the backend
        // tool registry below - no fabricated delays here.
        setMood('thinking');
        setActiveSteps([]);

        const updateAssistantMessageContent = (content: string, forceUpdate = false) => {
            const now = Date.now();
            if (!forceUpdate && now - lastRenderTimeRef.current <= 16) return;
            setMessages(prev => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                    updated[lastIndex] = {
                        ...updated[lastIndex],
                        content
                    };
                }
                return updated;
            });
            lastRenderTimeRef.current = now;
        };

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(`${apiBaseUrl}/api/chatbot/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                credentials: 'include',
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({
                    message: text,
                    conversation_id: currentConversationId,
                    system_prompt: 'You are Daemon, a premium agentic assistant running inside ExpectException. Keep your tone highly technical, professional, and helpful. You have access to real backend tools (blog search, service listing, QR generation, system health checks, contact handoff) that run automatically when relevant.'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to reach AI service');
            }

            setIsLoading(false);
            setIsStreaming(true);
            setActiveSteps([]);
            setMood('excited');

            const assistantMessage: Message = {
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMessage]);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine.startsWith('data: ')) continue;

                        try {
                            const data = JSON.parse(trimmedLine.slice(6));
                            if (data.type === 'step') {
                                setMood('thinking');
                                setActiveSteps(prev => {
                                    const idx = prev.findIndex(s => s.id === data.id);
                                    const next: AgentStep = { id: data.id, label: data.label, status: data.status };
                                    if (idx === -1) return [...prev, next];
                                    const copy = [...prev];
                                    copy[idx] = next;
                                    return copy;
                                });
                            }
                            if (data.chunk) {
                                accumulatedContentRef.current += data.chunk;
                                updateAssistantMessageContent(accumulatedContentRef.current);
                            }
                            if (data.final) {
                                accumulatedContentRef.current = data.final;
                                updateAssistantMessageContent(accumulatedContentRef.current, true);
                            }
                            if (data.done) {
                                const finalContent = data.final ?? accumulatedContentRef.current;
                                accumulatedContentRef.current = finalContent;
                                setActiveSteps([]);
                                setCurrentConversationId(data.conversation_id);

                                if (data.tool_used === 'qr_generator' && data.tool_data?.qr_url) {
                                    setMessages(prev => {
                                        const updated = [...prev];
                                        const lastIndex = updated.length - 1;
                                        if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                                            updated[lastIndex] = {
                                                ...updated[lastIndex],
                                                content: finalContent,
                                                isWidget: true,
                                                widgetType: 'qr',
                                                widgetData: data.tool_data,
                                            };
                                        }
                                        return updated;
                                    });
                                } else {
                                    updateAssistantMessageContent(finalContent, true);
                                }
                            }
                        } catch { /* ignore parse errors */ }
                    }
                }
            }
        } catch (err: any) {
            // FALLBACK MODE: Trigger local fallback response if backend is offline/errored
            console.warn('Backend unavailable, switching to local agent synthesis.');
            await new Promise(r => setTimeout(r, 400));
            setActiveSteps([]);
            setIsLoading(false);

            // Synthesize local fallback response based on keywords
            let fallbackResponse = `Hello! I am **Daemon**, your agentic AI assistant.

The backend is currently unreachable, so I can't run live tools or generate a real answer right now. Please try again in a moment, or browse the site directly via /services and /blogs in the meantime.`;

            const cleanText = text.toLowerCase();
            if (cleanText.includes('hello') || cleanText.includes('hi') || cleanText.includes('hey')) {
                fallbackResponse = `Greetings! I am **Daemon**, running in the background here. How can I assist you with your projects, architectures, or technical queries today?`;
                setMood('happy');
            } else if (cleanText.includes('skill') || cleanText.includes('projects') || cleanText.includes('experience')) {
                fallbackResponse = `### Developer Expertise & Core Stack
The developer specializes in building high-performance, automated, and visually stunning web systems:
- **Frontend**: Expert-level React, TypeScript, Next.js, and complex interactive UI designs.
- **Backend & Automation**: Python (Django, FastAPI), Docker containerization, CI/CD, and server optimization.
- **AI & Agents**: Custom in-house LLM pipelines, multi-model ensemble architectures, and vector search systems.`;
                setMood('idea');
            } else {
                setMood('neutral');
            }

            const assistantMessage: Message = {
                role: 'assistant',
                content: fallbackResponse,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const renderConversationGroup = (title: string, items: Conversation[]) => {
        if (items.length === 0) return null;
        return (
            <Box key={title} sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ px: 2, py: 1, color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, display: 'block' }}>
                    {title}
                </Typography>
                {items.map((conv) => (
                    <ListItem
                        key={conv.id}
                        disablePadding
                        secondaryAction={
                            <IconButton
                                size="small"
                                onClick={(e) => handleDeleteClick(conv.id, e)}
                                sx={{ color: 'grey.600', '&:hover': { color: '#ef4444' } }}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        }
                    >
                        <ListItemButton
                            selected={currentConversationId === conv.id}
                            onClick={() => loadConversation(conv.id)}
                            sx={{
                                borderRadius: '8px',
                                mb: 0.5,
                                borderLeft: currentConversationId === conv.id ? `3px solid ${themed.palette.primary.main}` : '3px solid transparent',
                                '&.Mui-selected': {
                                    bgcolor: alpha(themed.palette.primary.main, 0.08),
                                    '&:hover': { bgcolor: alpha(themed.palette.primary.main, 0.12) }
                                },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                            }}
                        >
                            <ListItemText
                                primary={conv.title}
                                secondary={`${conv.message_count || 0} messages`}
                                primaryTypographyProps={{ noWrap: true, fontSize: '0.85rem', color: 'grey.300', fontWeight: currentConversationId === conv.id ? 700 : 500 }}
                                secondaryTypographyProps={{ fontSize: '0.7rem', color: 'grey.600' }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </Box>
        );
    };

    const formatMessage = (content: string) => {
        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map((part, i) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const code = part.slice(3, -3);
                const firstLine = code.split('\n')[0];
                const language = firstLine.match(/^[a-z0-9]+$/i) ? firstLine : '';
                const codeContent = language ? code.slice(language.length + 1) : code;
                return (
                    <Paper key={i} elevation={0} sx={{ my: 2, borderRadius: '12px', overflow: 'hidden', bgcolor: '#0d0e12', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Typography variant="caption" sx={{ color: 'grey.500', fontFamily: 'monospace' }}>{language || 'text'}</Typography>
                            <IconButton size="small" onClick={() => copyToClipboard(codeContent.trim())} sx={{ color: 'grey.500' }}>
                                <ContentCopy fontSize="small" />
                            </IconButton>
                        </Box>
                        <Box sx={{ p: 2, overflow: 'auto' }}>
                            <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#e6edf3' }}><code>{codeContent.trim()}</code></pre>
                        </Box>
                    </Paper>
                );
            }

            return (
                <span key={i} style={{ whiteSpace: 'pre-wrap', display: 'block', wordBreak: 'break-word' }}>
                    {part.split('\n').map((line, lineIndex) => {
                        let renderLine: React.ReactNode = line;

                        // Bold markdown parser
                        if (line.includes('**')) {
                            const boldParts = line.split(/(\*\*.*?\*\*)/g);
                            renderLine = boldParts.map((bp, bpi) =>
                                bp.startsWith('**') && bp.endsWith('**')
                                    ? <strong key={`b-${bpi}`} style={{ color: '#ffffff', fontWeight: 700 }}>{bp.slice(2, -2)}</strong>
                                    : bp
                            );
                        }

                        // Headers markdown parser
                        if (line.startsWith('### ')) {
                            return <Typography key={`h3-${lineIndex}`} variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 800, mt: 2, mb: 1 }}>{line.slice(4)}</Typography>;
                        }
                        if (line.startsWith('#### ')) {
                            return <Typography key={`h4-${lineIndex}`} variant="subtitle2" sx={{ color: '#00eeff', fontWeight: 700, mt: 1.5, mb: 0.5 }}>{line.slice(5)}</Typography>;
                        }

                        // Lists
                        if (line.trim().startsWith('- ')) {
                            return (
                                <Box key={`l-${lineIndex}`} sx={{ display: 'flex', pl: 2, mb: 0.5 }}>
                                    <Box sx={{ mr: 1, color: 'primary.main' }}>•</Box>
                                    <Box>{renderLine}</Box>
                                </Box>
                            );
                        }

                        return <React.Fragment key={`l-${lineIndex}`}>{renderLine}{lineIndex < part.split('\n').length - 1 && <br/>}</React.Fragment>;
                    })}
                </span>
            );
        });
    };

    const drawerWidth = 280;

    // Sidebar content
    const sidebarContent = (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'rgba(13, 14, 18, 0.65)',
            backdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
            {/* Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(themed.palette.primary.main, 0.1), border: '1px solid', borderColor: 'primary.main' }}>
                        <Memory sx={{ color: 'primary.main', fontSize: 18 }} />
                    </Avatar>
                    <Typography variant="h6" fontWeight={800} sx={{ background: `linear-gradient(to right, #fff, ${themed.palette.primary.main})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Daemon Log
                    </Typography>
                </Box>
                {isMobile && <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: 'grey.500' }}><Close /></IconButton>}
            </Box>

            {/* Buttons */}
            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Add />}
                    onClick={startNewConversation}
                    sx={{
                        bgcolor: 'primary.main',
                        color: '#000000',
                        '&:hover': { bgcolor: alpha(themed.palette.primary.main, 0.8) },
                        textTransform: 'none',
                        fontWeight: 800,
                        py: 1.2,
                        borderRadius: '10px',
                        boxShadow: `0 4px 14px ${alpha(themed.palette.primary.main, 0.25)}`
                    }}
                >
                    New Session
                </Button>
                <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Home />}
                    onClick={() => navigate('/')}
                    sx={{
                        borderColor: 'rgba(255,255,255,0.08)',
                        color: 'grey.300',
                        borderRadius: '10px',
                        '&:hover': {
                            borderColor: 'primary.main',
                            color: 'white',
                            bgcolor: alpha(themed.palette.primary.main, 0.05)
                        },
                        textTransform: 'none',
                        py: 1
                    }}
                >
                    Back to Home
                </Button>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            {/* History List */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 2 }}>
                {conversations.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                        <Typography variant="body2" color="grey.600" sx={{ fontWeight: 600 }}>No active logs</Typography>
                        <Typography variant="caption" color="grey.700">Start chatting to record history</Typography>
                    </Box>
                ) : (
                    <List sx={{ mt: 1 }}>
                        {renderConversationGroup('TODAY', groupedConversations.today)}
                        {renderConversationGroup('YESTERDAY', groupedConversations.yesterday)}
                        {renderConversationGroup('LAST 7 DAYS', groupedConversations.lastWeek)}
                        {renderConversationGroup('OLDER', groupedConversations.older)}
                    </List>
                )}
            </Box>

            {/* Clear All Button */}
            {conversations.length > 0 && (
                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Button
                        fullWidth
                        variant="text"
                        startIcon={<DeleteSweep />}
                        onClick={handleClearAllClick}
                        sx={{
                            color: 'grey.600',
                            textTransform: 'none',
                            fontWeight: 700,
                            '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' }
                        }}
                    >
                        Purge All Logs
                    </Button>
                </Box>
            )}

            {/* Status Footer */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(5, 5, 5, 0.2)' }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: isAvailable ? 'primary.main' : '#ef4444',
                        boxShadow: isAvailable ? `0 0 12px ${themed.palette.primary.main}` : '0 0 12px #ef4444',
                        animation: isAvailable ? 'pulseGreen 1.5s infinite alternate' : 'none',
                        '@keyframes pulseGreen': {
                            '0%': { opacity: 0.6 },
                            '100%': { opacity: 1 }
                        }
                    }} />
                    <Typography variant="caption" color="#94a3b8" fontWeight="700">
                        {isAvailable ? 'AI Core: Qwen3 Active' : 'AI Core: Local Fallback'}
                    </Typography>
                </Stack>
            </Box>
        </Box>
    );

    return (
        <Box sx={{
            display: 'flex',
            height: '100dvh',
            width: '100vw',
            bgcolor: '#050505',
            color: 'white',
            position: 'fixed',
            inset: 0,
            overflow: 'hidden',
        }}>
            <CleanStarBackground withNebula={true} />
            <Seo
                title="Daemon – Free AI Agentic Chatbot with Tool-Calling"
                description="Chat with Daemon, an agentic AI assistant built by ExpectException. Ask it to write code, search the web, analyze files, and call real backend tools. Completely free."
                keywords={[
                    'free ai chatbot',
                    'agentic ai assistant',
                    'ai with tool calling',
                    'free gpt alternative',
                    'ai assistant no signup',
                ]}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { bgcolor: '#0d0e12', border: '1px solid rgba(255,255,255,0.05)', color: 'white', borderRadius: '16px' } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Delete Conversation Log?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'grey.400', fontWeight: 500 }}>
                        This action cannot be undone. This conversation log will be permanently deleted.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'grey.400', fontWeight: 700 }}>Cancel</Button>
                    <Button onClick={confirmDelete} variant="contained" color="error" sx={{ fontWeight: 700, borderRadius: '8px' }}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Clear All Confirmation Dialog */}
            <Dialog
                open={clearAllDialogOpen}
                onClose={() => setClearAllDialogOpen(false)}
                PaperProps={{ sx: { bgcolor: '#0d0e12', border: '1px solid rgba(255,255,255,0.05)', color: 'white', borderRadius: '16px' } }}
            >
                <DialogTitle sx={{ color: '#ef4444', fontWeight: 800 }}>Purge All Logs?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'grey.400', fontWeight: 500 }}>
                        This will permanently delete all conversation history.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setClearAllDialogOpen(false)} sx={{ color: 'grey.400', fontWeight: 700 }}>Cancel</Button>
                    <Button onClick={confirmClearAll} variant="contained" color="error" sx={{ fontWeight: 700, borderRadius: '8px' }}>Purge Everything</Button>
                </DialogActions>
            </Dialog>

            {/* Mobile Drawer */}
            <Drawer variant="temporary" open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} PaperProps={{ sx: { width: drawerWidth, bgcolor: 'transparent', border: 'none' } }}>{sidebarContent}</Drawer>

            {/* Desktop Sidebar */}
            {!isMobile && (
                <Collapse orientation="horizontal" in={desktopSidebarOpen}>
                    <Box sx={{
                        width: drawerWidth,
                        height: '100%',
                        flexShrink: 0,
                        overflow: 'hidden'
                    }}>
                        {sidebarContent}
                    </Box>
                </Collapse>
            )}

            {/* Main Chat Area */}
            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 1,
                overflow: 'hidden',
                minWidth: 0
            }}>
                {/* Floating Menu Button (Top Left) */}
                <Box sx={{ position: 'absolute', top: { xs: 16, md: 24 }, left: { xs: 16, md: 24 }, zIndex: 50 }}>
                    {isMobile ? (
                        <IconButton
                            onClick={() => setMobileDrawerOpen(true)}
                            sx={{
                                color: 'rgba(255,255,255,0.7)',
                                bgcolor: 'rgba(255,255,255,0.05)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                    ) : (
                        <IconButton
                            onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
                            sx={{
                                color: 'rgba(255,255,255,0.7)',
                                bgcolor: 'rgba(255,255,255,0.05)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }
                            }}
                        >
                            {desktopSidebarOpen ? <ViewSidebar /> : <ViewSidebar sx={{ transform: 'rotate(180deg)' }} />}
                        </IconButton>
                    )}
                </Box>

                {/* Floating Info Indicator (Top Right) */}
                <Box sx={{
                    position: 'absolute',
                    top: { xs: 16, md: 24 },
                    right: { xs: 16, md: 24 },
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(8px)',
                    px: 2,
                    py: 0.75,
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        Agent: Daemon v3
                    </Typography>
                </Box>

                {/* Messages Area */}
                <Box
                    ref={messagesContainerRef}
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        p: { xs: 2, md: 4 },
                        pt: { xs: 10, md: 10 },
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>{error}</Alert>}

                    {/* Empty State / Welcome Screen */}
                    {messages.length === 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            <Box sx={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
                                <ChatbotFace mood={mood} />
                                <Typography variant="h3" sx={{
                                    fontWeight: 900,
                                    letterSpacing: '-0.03em',
                                    background: `linear-gradient(135deg, #ffffff 30%, ${themed.palette.primary.main} 100%)`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    mb: 1.5
                                }}>
                                    Daemon Agentic Assistant
                                </Typography>
                                <Typography variant="body1" color="grey.400" sx={{ maxWidth: 500, mb: 4, fontWeight: 500 }}>
                                    I am an autonomous agent designed to elaborate project ideas, execute diagnostic workflows, and assist you.
                                </Typography>

                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600 }}>
                                    {[
                                        { text: 'What is the current time?', desc: 'Launches local clock module' },
                                        { text: 'Elaborate on a SaaS idea', desc: 'Generates structured MVP blueprint' },
                                        { text: 'List developer skills', desc: 'Reviews tech stack capabilities' }
                                    ].map((suggestion, i) => (
                                        <Paper
                                            key={i}
                                            onClick={() => sendMessage(suggestion.text)}
                                            sx={{
                                                p: 2,
                                                width: 170,
                                                cursor: 'pointer',
                                                bgcolor: 'rgba(255, 255, 255, 0.02)',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                borderRadius: '12px',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    bgcolor: alpha(themed.palette.primary.main, 0.03),
                                                    transform: 'translateY(-2px)'
                                                }
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>{suggestion.text}</Typography>
                                            <Typography variant="caption" color="grey.500">{suggestion.desc}</Typography>
                                        </Paper>
                                    ))}
                                </Box>
                            </Box>
                        </motion.div>
                    )}

                    {/* Messages List */}
                    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                        <AnimatePresence>
                            {messages.map((msg, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                    <Box sx={{ display: 'flex', gap: { xs: 1.5, md: 2.5 }, mb: 4, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                        <Avatar sx={{
                                            width: 36,
                                            height: 36,
                                            bgcolor: msg.role === 'user' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                            mt: 0.5
                                        }}>
                                            {msg.role === 'user' ? (
                                                <Person sx={{ fontSize: 20, color: 'grey.300' }} />
                                            ) : (
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(themed.palette.primary.main, 0.1), border: '1px solid', borderColor: 'primary.main' }}>
                                                    <Memory sx={{ color: 'primary.main', fontSize: 18 }} />
                                                </Avatar>
                                            )}
                                        </Avatar>
                                        <Box sx={{ maxWidth: '80%' }}>
                                            <Paper elevation={0} sx={{
                                                py: 2,
                                                px: 2.5,
                                                bgcolor: msg.role === 'user' ? alpha(themed.palette.primary.main, 0.03) : 'rgba(13, 14, 18, 0.5)',
                                                backdropFilter: 'blur(20px)',
                                                borderRadius: '16px',
                                                border: '1px solid',
                                                borderColor: msg.role === 'user' ? alpha(themed.palette.primary.main, 0.15) : 'rgba(255,255,255,0.05)',
                                                borderTopRightRadius: msg.role === 'user' ? 0 : '16px',
                                                borderTopLeftRadius: msg.role === 'assistant' ? 0 : '16px',
                                                color: 'grey.100',
                                                boxShadow: msg.role === 'user' ? 'none' : '0 10px 30px rgba(0,0,0,0.3)',
                                                position: 'relative',
                                            }}>
                                                {/* Rendering Clock Widget if applicable */}
                                                {msg.isWidget && msg.widgetType === 'clock' && (
                                                    <ClockWidget />
                                                )}
                                                {msg.isWidget && msg.widgetType === 'qr' && msg.widgetData?.qr_url && (
                                                    <QrWidget url={msg.widgetData.qr_url} encoded={msg.widgetData.encoded} />
                                                )}
                                                <Typography component="div" sx={{ lineHeight: 1.7, fontSize: '0.95rem' }}>
                                                    {formatMessage(msg.content)}
                                                </Typography>
                                            </Paper>

                                            {/* Timestamp & actions */}
                                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, ml: 1, alignItems: 'center', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', opacity: 0.6 }}>
                                                {msg.timestamp && (
                                                    <Typography variant="caption" sx={{ color: 'grey.600', fontSize: '0.7rem' }}>
                                                        {formatTimestamp(new Date(msg.timestamp))}
                                                    </Typography>
                                                )}
                                                {msg.role === 'assistant' && (
                                                    <Tooltip title="Copy Content">
                                                        <IconButton size="small" onClick={() => copyToClipboard(msg.content)} sx={{ color: 'grey.600', p: 0.2 }}>
                                                            <ContentCopy fontSize="small" sx={{ fontSize: 13 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Agent Steps Indicator */}
                        {activeSteps.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Box sx={{ display: 'flex', gap: 2.5, mb: 4 }}>
                                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(0, 238, 255, 0.1)', border: '1px solid #00eeff' }}>
                                        <HourglassEmpty sx={{ color: '#00eeff', fontSize: 18, animation: 'spin 2s linear infinite' }} />
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <AgentStepsIndicator steps={activeSteps} />
                                    </Box>
                                </Box>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>
                </Box>

                {/* Input Area */}
                <Box sx={{
                    p: { xs: 2, md: 4 },
                    pt: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    background: 'linear-gradient(to top, #050505 80%, transparent)',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            maxWidth: 800,
                            borderRadius: '16px',
                            bgcolor: 'rgba(13, 14, 18, 0.65)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:focus-within': {
                                borderColor: 'primary.main',
                                bgcolor: 'rgba(13, 14, 18, 0.8)',
                                boxShadow: `0 20px 40px -15px rgba(0,0,0,0.9), 0 0 20px -3px ${alpha(themed.palette.primary.main, 0.2)}`,
                            }
                        }}
                    >
                        <TextField
                            inputRef={inputRef}
                            fullWidth
                            multiline
                            maxRows={4}
                            placeholder="Ask Daemon to elaborate an idea, check the time..."
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                if (e.target.value.trim() && mood === 'neutral') {
                                    setMood('excited');
                                } else if (!e.target.value.trim() && mood === 'excited') {
                                    setMood('neutral');
                                }
                            }}
                            onKeyDown={handleTextKeyDown}
                            sx={{ ml: 2, flex: 1, '& .MuiInputBase-root': { color: 'white', fontSize: '0.95rem' } }}
                            variant="standard"
                            InputProps={{ disableUnderline: true }}
                        />
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <IconButton
                                onClick={() => sendMessage()}
                                disabled={!inputValue.trim() || isLoading}
                                sx={{
                                    p: 1.5,
                                    m: 0.5,
                                    bgcolor: inputValue.trim() ? 'primary.main' : 'transparent',
                                    color: inputValue.trim() ? '#000000' : 'grey.600',
                                    '&:hover': { bgcolor: inputValue.trim() ? alpha(themed.palette.primary.main, 0.8) : 'rgba(255,255,255,0.05)' },
                                    transition: 'all 0.2s',
                                    borderRadius: '10px'
                                }}
                            >
                                <Send />
                            </IconButton>
                        </motion.div>
                    </Paper>
                </Box>
            </Box>
        </Box >
    );
};

export default ChatbotPage;
