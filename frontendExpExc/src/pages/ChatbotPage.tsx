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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Chip,
    Fade,
    Zoom,
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
    Favorite,
    LocalHospital,
    Engineering,
    SupportAgent,
    EmojiPeople,
    School,
    Restaurant,
    SelfImprovement,
    FitnessCenter,
    Home,
    Edit,
    KeyboardArrowDown,
    Refresh,
    DeleteSweep,
    AccessTime,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/seo/Seo';
import apiClient, { API_BASE_URL } from '../api/config';
import CleanStarBackground from '../components/CleanStarBackground';

const apiBaseUrl = API_BASE_URL;

// --- Types ---
interface Message {
    id?: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
}

interface Conversation {
    id: number;
    title: string;
    model: string;
    created_at: string;
    updated_at: string;
    message_count: number;
}

interface Suggestion {
    text: string;
    icon: React.ReactNode;
}

interface Persona {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    gradient: string;
    prompt: string;
    description: string;
    suggestions: Suggestion[];
    thinkingText: string;
}

interface GroupedConversations {
    today: Conversation[];
    yesterday: Conversation[];
    lastWeek: Conversation[];
    older: Conversation[];
}

// --- Persona UI Configuration (Icons & Colors) ---
const personaUIConfig: Record<string, { icon: React.ReactNode; color: string; gradient: string }> = {
    general: {
        icon: <SupportAgent />,
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    },
    girlfriend: {
        icon: <Favorite />,
        color: '#ec4899',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)'
    },
    boyfriend: {
        icon: <EmojiPeople />,
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
    },
    doctor: {
        icon: <LocalHospital />,
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)'
    },
    engineer: {
        icon: <Engineering />,
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
    },
    teacher: {
        icon: <School />,
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'
    },
    chef: {
        icon: <Restaurant />,
        color: '#f97316',
        gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
    },
    therapist: {
        icon: <SelfImprovement />,
        color: '#06b6d4',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)'
    },
    fitness: {
        icon: <FitnessCenter />,
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'
    }
};

// --- Custom Components ---
const ThinkingIndicator: React.FC<{ persona: Persona; isLoading: boolean }> = ({ persona, isLoading }) => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    const messages = useMemo(() => {
        if (persona.id === 'girlfriend' || persona.id === 'boyfriend') {
            const suffix = persona.id === 'girlfriend' ? ' 💕' : ' 💙';
            const subject = persona.id === 'girlfriend' ? 'Girlfriend' : 'Boyfriend';
            return [
                `Your ${subject} is thinking...${suffix}`,
                `Your ${subject} is typing...${suffix}`,
                `Your ${subject} is writing...${suffix}`,
                `Your ${subject} is hold on...${suffix}`
            ];
        }
        return [persona.thinkingText || 'Thinking...'];
    }, [persona]);

    useEffect(() => {
        if (!isLoading || messages.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentTextIndex(prev => (prev + 1) % messages.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [isLoading, messages]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Avatar sx={{ width: 36, height: 36, background: persona.gradient, flexShrink: 0 }}>
                    {persona.icon}
                </Avatar>
                <Box sx={{ py: 1.5, px: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {[0, 1, 2].map(i => (
                            <motion.div key={i} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: persona.color }} />
                            </motion.div>
                        ))}
                        <Typography variant="body2" color="grey.500" sx={{ ml: 1 }}>
                            {messages[currentTextIndex]}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </motion.div>
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
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastMessageContent, setLastMessageContent] = useState<string>('');

    // Dialog states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
    const [clearAllConfirmStep, setClearAllConfirmStep] = useState(0);

    // Persona state
    const [availablePersonas, setAvailablePersonas] = useState<Persona[]>([{
        id: 'general',
        name: 'General',
        ...personaUIConfig['general'],
        description: 'Loading...',
        prompt: '',
        suggestions: [],
        thinkingText: 'Thinking...'
    }]);
    const [selectedPersona, setSelectedPersona] = useState<Persona>(availablePersonas[0]);
    const [customNames, setCustomNames] = useState<Record<string, string>>({});

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastRenderTimeRef = useRef<number>(0);
    const accumulatedContentRef = useRef<string>('');

    // --- Effects ---

    // Load custom names from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('personaNames');
            if (saved) setCustomNames(JSON.parse(saved));
        } catch (e) { /* ignore */ }
    }, []);

    // Fetch personas from backend
    useEffect(() => {
        const fetchPersonas = async () => {
            try {
                const res = await apiClient.get('/api/chatbot/personas/');
                if (res.data && Array.isArray(res.data)) {
                    const merged = res.data.map((bp: any) => {
                        const uiConfig = personaUIConfig[bp.id] || personaUIConfig['general'];
                        return {
                            ...bp,
                            icon: uiConfig.icon,
                            color: uiConfig.color,
                            gradient: uiConfig.gradient,
                            suggestions: bp.suggestions || [],
                            thinkingText: bp.thinkingText || 'Thinking...'
                        } as Persona;
                    });
                    setAvailablePersonas(merged);
                    setSelectedPersona(prev => merged.find((p: Persona) => p.id === prev.id) || merged[0]);
                }
            } catch (err) { console.error('Failed to load backend personas', err); }
        };
        fetchPersonas();
    }, []);

    // Check Ollama status - with proper cleanup
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
                    if (response.data.models) {
                        setAvailableModels(response.data.models);
                        if (!selectedModel && response.data.current_model) {
                            setSelectedModel(response.data.current_model);
                        }
                    }
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
                // Sync to localStorage
                localStorage.setItem('chat_conversations', JSON.stringify(response.data));
            } catch (err) {
                console.error('Failed to load conversations from API, trying localStorage', err);
                const saved = localStorage.getItem('chat_conversations');
                if (saved) setConversations(JSON.parse(saved));
            }
        };
        loadConversations();
    }, [currentConversationId]);

    // Save/Restore messages to local storage for persistence
    useEffect(() => {
        if (currentConversationId) {
            localStorage.setItem(`chat_messages_${currentConversationId}`, JSON.stringify(messages));
        }
    }, [messages, currentConversationId]);

    // Load messages from localStorage if API fails or for quicker initial load
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

    // Scroll handling for showing scroll-to-bottom button
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            setShowScrollButton(distanceFromBottom > 200);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+N for new chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                startNewConversation();
            }
            // Escape to close mobile drawer
            if (e.key === 'Escape' && mobileDrawerOpen) {
                setMobileDrawerOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mobileDrawerOpen]);

    // Group conversations by date
    const groupedConversations = useMemo(() =>
        groupConversationsByDate(conversations),
        [conversations]
    );

    // --- Handlers ---

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    const handleRename = () => {
        const current = customNames[selectedPersona.id] || selectedPersona.name;
        const newName = window.prompt(`Name your ${selectedPersona.name}:`, current);
        if (newName && newName.trim()) {
            const updated = { ...customNames, [selectedPersona.id]: newName.trim() };
            setCustomNames(updated);
            localStorage.setItem('personaNames', JSON.stringify(updated));
        }
    };

    const loadConversation = async (id: number) => {
        // Try local storage first for speed
        restoreMessagesFromLocalStorage(id);

        try {
            const response = await apiClient.get(`/api/chatbot/conversations/${id}/`);
            setMessages(response.data.messages || []);
            setCurrentConversationId(id);
            setMobileDrawerOpen(false);
            // Update local storage with fresh data
            localStorage.setItem(`chat_messages_${id}`, JSON.stringify(response.data.messages || []));
        } catch {
            setError('Failed to load conversation from server');
            // If restoreMessagesFromLocalStorage failed too
            if (!localStorage.getItem(`chat_messages_${id}`)) {
                setError('Failed to load conversation');
            }
        }
    };

    const startNewConversation = () => {
        // Cancel any ongoing stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setMessages([]);
        setCurrentConversationId(null);
        setError(null);
        setMobileDrawerOpen(false);
        setLastMessageContent('');
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
        } catch { console.error('Failed to delete'); }
        setDeleteDialogOpen(false);
        setConversationToDelete(null);
    };

    const handleClearAllClick = () => {
        setClearAllConfirmStep(1);
        setClearAllDialogOpen(true);
    };

    const confirmClearAll = async () => {
        if (clearAllConfirmStep === 1) {
            setClearAllConfirmStep(2);
            return;
        }

        try {
            await apiClient.delete('/api/chatbot/conversations/clear/');
            setConversations([]);
            startNewConversation();
        } catch { console.error('Failed to clear all'); }

        setClearAllDialogOpen(false);
        setClearAllConfirmStep(0);
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const regenerateResponse = async () => {
        if (messages.length < 2 || isLoading || isStreaming) return;

        // Get the last user message
        const lastUserMsgIndex = messages.reduce((lastIdx, msg, idx) =>
            msg.role === 'user' ? idx : lastIdx, -1);

        if (lastUserMsgIndex === -1) return;

        const lastUserMessage = messages[lastUserMsgIndex].content;

        // Remove the last assistant message if present
        const newMessages = messages.slice(0, -1);
        if (newMessages[newMessages.length - 1]?.role === 'user') {
            // Remove the user message too, we'll resend it
            newMessages.pop();
        }

        setMessages(newMessages);
        await sendMessage(lastUserMessage);
    };

    const handleTextKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            sendMessage();
        }
    };

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
            const modelToUse = selectedModel || (availableModels.length > 0 ? availableModels[0] : 'qwen2:1.5b');

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
                    model: modelToUse,
                    conversation_id: currentConversationId,
                    system_prompt: selectedPersona.prompt.replace(/\{NAME\}/g, customNames[selectedPersona.id] || selectedPersona.name)
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to send message');
            }

            setIsLoading(false);
            setIsStreaming(true);

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
                                updateAssistantMessageContent(finalContent, true);
                                setCurrentConversationId(data.conversation_id);
                                setLastMessageContent(finalContent);
                            }

                            if (data.error) {
                                setError(data.error);
                                setMessages(prev => prev.slice(0, -1));
                            }
                        } catch { /* ignore parse errors */ }
                    }
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            let errorMessage = 'Failed to send message';
            if (err.message === 'Failed to fetch' || err.message.includes('network')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    // Render conversation group
    const renderConversationGroup = (title: string, items: Conversation[]) => {
        if (items.length === 0) return null;
        return (
            <Box key={title}>
                <Typography variant="caption" sx={{ px: 2, py: 1, color: 'grey.600', fontWeight: 600, letterSpacing: 1, display: 'block' }}>
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
                                sx={{ color: 'grey.700', '&:hover': { color: '#ef4444' } }}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        }
                    >
                        <ListItemButton
                            selected={currentConversationId === conv.id}
                            onClick={() => loadConversation(conv.id)}
                            sx={{
                                borderRadius: 2,
                                mb: 0.5,
                                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.08)' },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' }
                            }}
                        >
                            <ListItemText
                                primary={conv.title}
                                secondary={`${conv.message_count || 0} messages`}
                                primaryTypographyProps={{ noWrap: true, fontSize: '0.9rem', color: 'grey.300' }}
                                secondaryTypographyProps={{ fontSize: '0.7rem', color: 'grey.600' }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </Box>
        );
    };

    const formatMessage = (content: string) => {
        // Handle <think> blocks
        if (content.includes('<think>')) {
            const parts = content.split(/<think>([\s\S]*?)<\/think>/g);
            return parts.map((part, i) => {
                if (i % 2 === 1) { // This is the thinking content
                    return (
                        <Paper
                            key={`think-${i}`}
                            elevation={0}
                            sx={{
                                my: 1.5,
                                p: 2,
                                borderRadius: 2,
                                borderLeft: '3px solid #6366f1',
                                bgcolor: 'rgba(99, 102, 241, 0.05)',
                                fontStyle: 'italic',
                                color: 'grey.400',
                                fontSize: '0.9rem',
                            }}
                        >
                            <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600, mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Thought Process
                            </Typography>
                            {part.trim()}
                        </Paper>
                    );
                }
                // Regular content - recursively format code blocks
                if (!part.trim()) return null;
                return <Box key={i}>{formatMessage(part)}</Box>;
            });
        }

        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map((part, i) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const code = part.slice(3, -3);
                const firstLine = code.split('\n')[0];
                const language = firstLine.match(/^[a-z]+$/i) ? firstLine : '';
                const codeContent = language ? code.slice(language.length + 1) : code;
                return (
                    <Paper key={i} elevation={0} sx={{ my: 2, borderRadius: 2, overflow: 'hidden', bgcolor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Typography variant="caption" sx={{ color: 'grey.500', fontFamily: 'monospace' }}>{language || 'text'}</Typography>
                            <IconButton size="small" onClick={() => copyToClipboard(codeContent.trim(), -1)} sx={{ color: 'grey.500' }}><ContentCopy fontSize="small" /></IconButton>
                        </Box>
                        <Box sx={{ p: 2, overflow: 'auto' }}>
                            <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: '#e6edf3' }}><code>{codeContent.trim()}</code></pre>
                        </Box>
                    </Paper>
                );
            }
            return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
        });
    };

    const drawerWidth = 280;

    // Sidebar content
    const sidebarContent = (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
        }}>
            {/* Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, background: selectedPersona.gradient }}>
                        {selectedPersona.icon}
                    </Avatar>
                    <Typography variant="h6" fontWeight={700} sx={{ background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ExpectException - AI
                    </Typography>
                </Box>
                {isMobile && <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: 'grey.500' }}><Close /></IconButton>}
            </Box>

            {/* Buttons & Model Select (Mobile) */}
            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>

                <Button fullWidth variant="contained" startIcon={<Add />} onClick={startNewConversation} sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: 'grey.200' }, textTransform: 'none', fontWeight: 600, py: 1 }}>New Chat</Button>
                <Button fullWidth variant="outlined" startIcon={<Home />} onClick={() => navigate('/')} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'grey.400', '&:hover': { borderColor: 'white', color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }, textTransform: 'none' }}>Back to Website</Button>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            {/* History List */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 2 }}>
                {conversations.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                        <Typography variant="body2" color="grey.600">No conversations yet</Typography>
                        <Typography variant="caption" color="grey.700">Start a new chat to begin</Typography>
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
                            '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' }
                        }}
                    >
                        Clear All Chats
                    </Button>
                </Box>
            )}

            {/* Status Footer */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isAvailable ? '#10b981' : '#ef4444', boxShadow: isAvailable ? '0 0 10px #10b981' : 'none' }} />
                    <Typography variant="caption" color="grey.400">{isAvailable ? 'AI Online' : 'Connecting...'}</Typography>
                </Stack>
            </Box>
        </Box>
    );

    return (
        <Box sx={{
            display: 'flex',
            height: '100dvh',
            width: '100vw',
            bgcolor: '#020617',
            color: 'white',
            position: 'fixed',
            inset: 0,
            overflow: 'hidden',
        }}>
            <CleanStarBackground withNebula={true} />
            <Seo title="ExpExc AI Chat" description="Premium Cloud-Based AI Assistant" />

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white', borderRadius: 3 } }}
            >
                <DialogTitle>Delete Conversation?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'grey.400' }}>
                        This action cannot be undone. This conversation and all its messages will be permanently deleted.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'grey.400' }}>Cancel</Button>
                    <Button onClick={confirmDelete} variant="contained" color="error">Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Clear All Confirmation Dialog */}
            <Dialog
                open={clearAllDialogOpen}
                onClose={() => { setClearAllDialogOpen(false); setClearAllConfirmStep(0); }}
                PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white', borderRadius: 3 } }}
            >
                <DialogTitle sx={{ color: '#ef4444' }}>
                    {clearAllConfirmStep === 1 ? '⚠️ Clear All Chats?' : '⚠️ Are you absolutely sure?'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'grey.400' }}>
                        {clearAllConfirmStep === 1
                            ? `This will permanently delete all ${conversations.length} conversation(s).`
                            : 'This is your final warning. All chats will be gone forever!'
                        }
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => { setClearAllDialogOpen(false); setClearAllConfirmStep(0); }} sx={{ color: 'grey.400' }}>Cancel</Button>
                    <Button onClick={confirmClearAll} variant="contained" color="error">
                        {clearAllConfirmStep === 1 ? 'Continue' : 'Delete Everything'}
                    </Button>
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
                        borderRight: '1px solid rgba(255,255,255,0.08)',
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
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }
                            }}
                        >
                            {desktopSidebarOpen ? <ViewSidebar /> : <ViewSidebar sx={{ transform: 'rotate(180deg)' }} />}
                        </IconButton>
                    )}
                </Box>

                {/* Floating Persona Indicator (Top Right) */}
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
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' }
                }} onClick={handleRename}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'transparent', color: selectedPersona.color, border: `1px solid ${alpha(selectedPersona.color, 0.5)}` }}>
                        {selectedPersona.icon}
                    </Avatar>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, letterSpacing: 0.5 }}>
                        {customNames[selectedPersona.id] || selectedPersona.name}
                    </Typography>
                </Box>

                {/* Messages Area with Star Background */}
                <Box
                    ref={messagesContainerRef}
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        p: { xs: 2, md: 3 },
                        pt: { xs: 10, md: 10 },
                        position: 'relative',
                        zIndex: 1,
                    }}
                >

                    {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', position: 'relative', zIndex: 1 }}>{error}</Alert>}

                    {/* Empty State with Persona Selection */}
                    {messages.length === 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4, position: 'relative', zIndex: 1 }}>
                                <Box sx={{ my: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                    {/* Logo */}
                                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                                        <Avatar sx={{ width: 80, height: 80, mb: 3, background: selectedPersona.gradient, boxShadow: `0 0 60px ${alpha(selectedPersona.color, 0.5)}` }}>
                                            {React.cloneElement(selectedPersona.icon as React.ReactElement, { sx: { fontSize: 40 } })}
                                        </Avatar>
                                    </motion.div>

                                    <Typography variant="h4" fontWeight={700} gutterBottom sx={{ textAlign: 'center', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        {selectedPersona.id === 'general' ? 'How can I help you?' : `Chat with ${selectedPersona.name}`}
                                    </Typography>
                                    <Typography variant="body2" color="grey.500" sx={{ mb: 3 }}>
                                        Powered by ExpExc Cloud <span style={{ fontSize: '10px', opacity: 0.5 }}>(v3.0.1)</span>
                                    </Typography>

                                    {/* Persona Selection */}
                                    <Typography variant="body2" color="grey.400" sx={{ mb: 2 }}>Choose your assistant:</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800, mb: 4 }}>
                                        {availablePersonas.map((persona, i) => (
                                            <motion.div key={persona.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                <Paper
                                                    onClick={() => setSelectedPersona(persona)}
                                                    sx={{
                                                        p: 1.5, width: 90, cursor: 'pointer', textAlign: 'center',
                                                        background: selectedPersona.id === persona.id ? persona.gradient : 'rgba(255,255,255,0.03)',
                                                        border: `2px solid ${selectedPersona.id === persona.id ? persona.color : 'rgba(255,255,255,0.1)'}`,
                                                        borderRadius: 2, transition: 'all 0.2s',
                                                        '&:hover': { borderColor: persona.color, bgcolor: alpha(persona.color, 0.1) }
                                                    }}
                                                >
                                                    <Avatar sx={{ width: 36, height: 36, mx: 'auto', mb: 0.5, background: selectedPersona.id === persona.id ? 'rgba(255,255,255,0.2)' : persona.gradient, fontSize: 18 }}>
                                                        {persona.icon}
                                                    </Avatar>
                                                    <Typography variant="caption" fontWeight={600} color={selectedPersona.id === persona.id ? 'white' : 'grey.300'} sx={{ display: 'block' }}>{persona.name}</Typography>
                                                </Paper>
                                            </motion.div>
                                        ))}
                                    </Box>

                                    {!isAvailable && <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(30, 41, 59, 0.8)', color: '#93c5fd' }}>Connecting to cloud...</Alert>}

                                    {/* Dynamic Suggestions */}
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600 }}>
                                        {selectedPersona.suggestions.map((s, i) => (
                                            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }} whileHover={{ scale: 1.05 }}>
                                                <Paper onClick={() => sendMessage(s.text)} sx={{ px: 2, py: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, '&:hover': { bgcolor: alpha(selectedPersona.color, 0.1), borderColor: selectedPersona.color } }}>
                                                    <Box sx={{ color: selectedPersona.color }}>{s.icon}</Box>
                                                    <Typography variant="body2" color="grey.300">{s.text}</Typography>
                                                </Paper>
                                            </motion.div>
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        </motion.div>
                    )}

                    {/* Messages List */}
                    <Box sx={{ maxWidth: 800, mx: 'auto', position: 'relative', zIndex: 1 }}>
                        <AnimatePresence>
                            {messages.map((msg, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                    <Box sx={{ display: 'flex', gap: { xs: 1.5, md: 2.5 }, mb: { xs: 3, md: 4 }, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                        <Avatar sx={{
                                            width: { xs: 28, md: 36 },
                                            height: { xs: 28, md: 36 },
                                            bgcolor: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            background: msg.role === 'assistant' ? selectedPersona.gradient : undefined,
                                            flexShrink: 0,
                                            border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.15)' : 'none',
                                            mt: 0.5
                                        }}>
                                            {msg.role === 'user' ? <Person sx={{ fontSize: { xs: 16, md: 20 } }} /> : React.cloneElement(selectedPersona.icon as React.ReactElement, { sx: { fontSize: { xs: 16, md: 20 } } })}
                                        </Avatar>
                                        <Box sx={{ maxWidth: { xs: '85%', sm: '80%', md: '75%' } }}>
                                            <Paper elevation={0} sx={{
                                                py: { xs: 1.5, md: 2 },
                                                px: { xs: 2, md: 2.5 },
                                                bgcolor: msg.role === 'user' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                                borderRadius: 3,
                                                borderTopRightRadius: msg.role === 'user' ? 1 : 12,
                                                borderTopLeftRadius: msg.role === 'assistant' ? 1 : 12,
                                                color: 'grey.100',
                                            }}>
                                                <Typography component="div" sx={{
                                                    lineHeight: 1.7,
                                                    textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)',
                                                    fontSize: { xs: '0.925rem', md: '1rem' },
                                                }}>{formatMessage(msg.content)}</Typography>
                                            </Paper>
                                            {/* Message footer with timestamp and actions */}
                                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, ml: 1, alignItems: 'center', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', opacity: 0.7 }}>
                                                {msg.timestamp && (
                                                    <Tooltip title={new Date(msg.timestamp).toLocaleString()}>
                                                        <Typography variant="caption" sx={{ color: 'grey.500', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
                                                            {formatTimestamp(new Date(msg.timestamp))}
                                                        </Typography>
                                                    </Tooltip>
                                                )}
                                                {msg.role === 'assistant' && !isStreaming && (
                                                    <>
                                                        <Tooltip title={copiedIndex === idx ? 'Copied!' : 'Copy'}>
                                                            <IconButton size="small" onClick={() => copyToClipboard(msg.content, idx)} sx={{ color: 'grey.600', padding: 0.5 }}>
                                                                {copiedIndex === idx ? <Check fontSize="small" sx={{ fontSize: 14 }} color="success" /> : <ContentCopy fontSize="small" sx={{ fontSize: 14 }} />}
                                                            </IconButton>
                                                        </Tooltip>
                                                        {idx === messages.length - 1 && (
                                                            <Tooltip title="Regenerate response">
                                                                <IconButton size="small" onClick={regenerateResponse} sx={{ color: 'grey.600' }}>
                                                                    <Refresh fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Loading Animation */}
                        {isLoading && <ThinkingIndicator persona={selectedPersona} isLoading={isLoading} />}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Scroll to bottom button */}
                    <Zoom in={showScrollButton}>
                        <IconButton
                            onClick={scrollToBottom}
                            sx={{
                                position: 'fixed',
                                bottom: 100,
                                right: 24,
                                bgcolor: 'rgba(30, 41, 59, 0.9)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.1)',
                                '&:hover': { bgcolor: 'rgba(30, 41, 59, 1)' },
                                zIndex: 10,
                            }}
                        >
                            <KeyboardArrowDown />
                        </IconButton>
                    </Zoom>
                </Box>

                {/* Input Area */}
                <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'center', background: 'linear-gradient(to top, rgba(2, 6, 23, 1) 80%, transparent)' }}>
                    <Paper elevation={4} sx={{ p: '4px 8px', display: 'flex', alignItems: 'center', width: '100%', maxWidth: 800, borderRadius: 4, bgcolor: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s', '&:hover, &:focus-within': { bgcolor: 'rgba(30, 41, 59, 0.8)', borderColor: selectedPersona.color } }}>
                        <TextField
                            inputRef={inputRef}
                            fullWidth
                            multiline
                            maxRows={5}
                            placeholder={`Message ${selectedPersona.name}...`}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleTextKeyDown}
                            sx={{ ml: 2, flex: 1, '& .MuiInputBase-root': { color: 'white' } }}
                            variant="standard"
                            InputProps={{ disableUnderline: true }}
                        />
                        {/* Character count */}
                        {inputValue.length > 0 && (
                            <Typography variant="caption" sx={{ color: inputValue.length > 4000 ? 'error.main' : 'grey.600', mr: 1 }}>
                                {inputValue.length}
                            </Typography>
                        )}
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <IconButton
                                onClick={() => sendMessage()}
                                disabled={!inputValue.trim() || isLoading}
                                sx={{ p: 1.5, m: 0.5, bgcolor: inputValue.trim() ? selectedPersona.color : 'transparent', color: inputValue.trim() ? 'white' : 'grey.600', '&:hover': { bgcolor: inputValue.trim() ? alpha(selectedPersona.color, 0.8) : 'rgba(255,255,255,0.05)' }, transition: 'all 0.2s', borderRadius: 3 }}
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
