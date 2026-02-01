import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from '@mui/material';
import {
    Send,
    Add,
    Menu as MenuIcon,
    Person,
    Delete,
    Close,
    AutoAwesome,
    Code,
    Psychology,
    Lightbulb,
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/seo/Seo';
import apiClient from '../api/config';

// --- Types ---
interface Message {
    id?: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
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
    thinkingText: string; // Dynamic loading text per persona
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
    const [error, setError] = useState<string | null>(null);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Initial state needs at least one persona to avoid crashes before fetch
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

    useEffect(() => {
        try {
            const saved = localStorage.getItem('personaNames');
            if (saved) setCustomNames(JSON.parse(saved));
        } catch (e) { }
    }, []);

    const handleRename = () => {
        const current = customNames[selectedPersona.id] || selectedPersona.name;
        const newName = window.prompt(`Name your ${selectedPersona.name}:`, current);
        if (newName && newName.trim()) {
            const updated = { ...customNames, [selectedPersona.id]: newName.trim() };
            setCustomNames(updated);
            localStorage.setItem('personaNames', JSON.stringify(updated));
        }
    };

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
                    // Update current selected if it exists in new list (to get new prompt)
                    setSelectedPersona(prev => merged.find((p: Persona) => p.id === prev.id) || merged[0]);
                }
            } catch (err) { console.error('Failed to load backend personas', err); }
        };
        fetchPersonas();
    }, []);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    // Check Status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await apiClient.get('/api/chatbot/status/');
                setIsAvailable(response.data.available);
            } catch { setIsAvailable(false); }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    // Load Conversations
    useEffect(() => {
        const loadConversations = async () => {
            try {
                const response = await apiClient.get('/api/chatbot/conversations/');
                setConversations(response.data);
            } catch { console.error('Failed to load conversations'); }
        };
        loadConversations();
    }, [currentConversationId]);

    const loadConversation = async (id: number) => {
        try {
            const response = await apiClient.get(`/api/chatbot/conversations/${id}/`);
            setMessages(response.data.messages || []);
            setCurrentConversationId(id);
            setMobileDrawerOpen(false);
        } catch { setError('Failed to load conversation'); }
    };

    const startNewConversation = () => {
        setMessages([]);
        setCurrentConversationId(null);
        setError(null);
        setMobileDrawerOpen(false);
        inputRef.current?.focus();
    };

    const deleteConversation = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await apiClient.delete(`/api/chatbot/conversations/${id}/`);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentConversationId === id) startNewConversation();
        } catch { console.error('Failed to delete'); }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const sendMessage = async (messageText?: string) => {
        const text = messageText || inputValue.trim();
        if (!text || isLoading || isStreaming) return;

        const userMessage: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${apiClient.defaults.baseURL}/api/chatbot/chat/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: text,
                    conversation_id: currentConversationId,
                    system_prompt: selectedPersona.prompt.replace(/\{NAME\}/g, customNames[selectedPersona.id] || selectedPersona.name)
                })
            });

            if (!response.ok) throw new Error('Failed to send message');

            setIsLoading(false);
            setIsStreaming(true);

            const assistantMessage: Message = { role: 'assistant', content: '' };
            setMessages(prev => [...prev, assistantMessage]);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let accumulatedContent = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));

                                if (data.chunk) {
                                    // Direct DOM manipulation or buffered state update could go here
                                    // For now, valid React state update, just slightly batched impliictly by execution speed
                                    accumulatedContent += data.chunk;

                                    setMessages(prev => {
                                        const updated = [...prev];
                                        const last = updated[updated.length - 1];
                                        if (last.role === 'assistant') {
                                            // Append only the NEW content since last render 
                                            // Actually, simpler to just append the chunk to the last known state
                                            last.content += data.chunk;
                                        }
                                        return updated;
                                    });
                                }

                                if (data.done) setCurrentConversationId(data.conversation_id);
                                if (data.error) setError(data.error);
                            } catch { }
                        }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to send');
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    const formatMessage = (content: string) => {
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

    // Sidebar content - completely isolated from page scroll
    const sidebarContent = (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
        }}>
            {/* Header - Fixed */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, background: selectedPersona.gradient }}>
                        {selectedPersona.icon}
                    </Avatar>
                    <Typography variant="h6" fontWeight={700} sx={{ background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ExpExc AI
                    </Typography>
                </Box>
                {isMobile && <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: 'grey.500' }}><Close /></IconButton>}
            </Box>

            {/* New Chat Button & Back Home */}
            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="contained" startIcon={<Add />} onClick={startNewConversation} sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: 'grey.200' }, textTransform: 'none', fontWeight: 600, py: 1 }}>New Chat</Button>
                <Button fullWidth variant="outlined" startIcon={<Home />} onClick={() => navigate('/')} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'grey.400', '&:hover': { borderColor: 'white', color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }, textTransform: 'none' }}>Back to Website</Button>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            {/* History List - ONLY THIS SCROLLS */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 2 }}>
                <Typography variant="caption" sx={{ px: 2, color: 'grey.600', fontWeight: 600, letterSpacing: 1 }}>HISTORY</Typography>
                <List sx={{ mt: 1 }}>
                    {conversations.map((conv) => (
                        <ListItem key={conv.id} disablePadding secondaryAction={<IconButton size="small" onClick={(e) => deleteConversation(conv.id, e)} sx={{ color: 'grey.700', '&:hover': { color: '#ef4444' } }}><Delete fontSize="small" /></IconButton>}>
                            <ListItemButton selected={currentConversationId === conv.id} onClick={() => loadConversation(conv.id)} sx={{ borderRadius: 2, mb: 0.5, '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.08)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                                <ListItemText primary={conv.title} primaryTypographyProps={{ noWrap: true, fontSize: '0.9rem', color: 'grey.300' }} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>

            {/* Status Footer - Fixed */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isAvailable ? '#10b981' : '#ef4444', boxShadow: isAvailable ? '0 0 10px #10b981' : 'none' }} />
                    <Typography variant="caption" color="grey.400">{isAvailable ? 'Cloud Connected' : 'Connecting...'}</Typography>
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
            position: 'fixed', // Force fixed to viewport to prevent scrolling anomalies
            inset: 0,
            overflow: 'hidden',
        }}>
            <Seo title="ExpExc AI Chat" description="Premium Cloud-Based AI Assistant" />

            {/* Background Effects */}
            <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
                <Box sx={{ position: 'absolute', top: '20%', left: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
                <Box sx={{ position: 'absolute', bottom: '20%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
            </Box>

            {/* Mobile Drawer */}
            <Drawer variant="temporary" open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} PaperProps={{ sx: { width: drawerWidth, bgcolor: 'transparent', border: 'none' } }}>{sidebarContent}</Drawer>

            {/* Desktop Sidebar - Fixed position, no scroll */}
            {!isMobile && (
                <Collapse orientation="horizontal" in={desktopSidebarOpen}>
                    <Box sx={{
                        width: drawerWidth,
                        height: '100%',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        flexShrink: 0,
                        overflow: 'hidden' // Prevent sidebar container from scrolling
                    }}>
                        {sidebarContent}
                    </Box>
                </Collapse>
            )}

            {/* Main Chat Area - This is the ONLY scrollable area */}
            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 1,
                overflow: 'hidden',
                minWidth: 0 // Allow flex item to shrink
            }}>
                {/* Header - Fixed */}
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', bgcolor: 'rgba(2, 6, 23, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {isMobile ? <IconButton onClick={() => setMobileDrawerOpen(true)} color="inherit"><MenuIcon /></IconButton> : <IconButton onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)} color="inherit">{desktopSidebarOpen ? <ViewSidebar /> : <ViewSidebar sx={{ transform: 'rotate(180deg)' }} />}</IconButton>}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, bgcolor: alpha(selectedPersona.color, 0.15), borderRadius: 3, border: `1px solid ${alpha(selectedPersona.color, 0.3)}` }}>
                        <Box sx={{ color: selectedPersona.color, display: 'flex' }}>{selectedPersona.icon}</Box>
                        <Typography variant="caption" sx={{ color: selectedPersona.color, fontWeight: 600 }}>{customNames[selectedPersona.id] || selectedPersona.name}</Typography>
                        <IconButton size="small" onClick={handleRename} sx={{ ml: -0.5, p: 0.5, color: selectedPersona.color, opacity: 0.7, '&:hover': { opacity: 1 } }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                    </Box>
                </Box>

                {/* Messages Area - THE ONLY SCROLLABLE AREA */}
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    p: 3
                }}>
                    {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>{error}</Alert>}

                    {/* Empty State with Persona Selection */}
                    {messages.length === 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4 }}>
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
                                    <Typography variant="body2" color="grey.500" sx={{ mb: 3 }}>Powered by ExpExc Cloud</Typography>

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

                                    {/* Dynamic Suggestions based on selected persona */}
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
                    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                        <AnimatePresence>
                            {messages.map((msg, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 4, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                        <Avatar sx={{ width: 36, height: 36, bgcolor: msg.role === 'user' ? 'grey.800' : 'transparent', background: msg.role === 'assistant' ? selectedPersona.gradient : undefined, flexShrink: 0 }}>
                                            {msg.role === 'user' ? <Person fontSize="small" /> : selectedPersona.icon}
                                        </Avatar>
                                        <Box sx={{ maxWidth: '80%' }}>
                                            <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)', border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.05)' : 'none', color: 'grey.100' }}>
                                                <Typography component="div" sx={{ lineHeight: 1.7 }}>{formatMessage(msg.content)}</Typography>
                                            </Paper>
                                            {msg.role === 'assistant' && !isStreaming && (
                                                <Box sx={{ display: 'flex', gap: 1, mt: 1, ml: 1 }}>
                                                    <Tooltip title={copiedIndex === idx ? 'Copied!' : 'Copy'}>
                                                        <IconButton size="small" onClick={() => copyToClipboard(msg.content, idx)} sx={{ color: 'grey.600' }}>
                                                            {copiedIndex === idx ? <Check fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Loading Animation */}
                        {isLoading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Avatar sx={{ width: 36, height: 36, background: selectedPersona.gradient, flexShrink: 0 }}>{selectedPersona.icon}</Avatar>
                                    <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            {[0, 1, 2].map(i => (
                                                <motion.div key={i} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: selectedPersona.color }} />
                                                </motion.div>
                                            ))}
                                            <Typography variant="body2" color="grey.500" sx={{ ml: 1 }}>{selectedPersona.thinkingText}</Typography>
                                        </Box>
                                    </Paper>
                                </Box>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>
                </Box>

                {/* Input Area - Fixed at Bottom */}
                <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'center', background: 'linear-gradient(to top, #020617 80%, transparent)' }}>
                    <Paper elevation={4} sx={{ p: '4px 8px', display: 'flex', alignItems: 'center', width: '100%', maxWidth: 800, borderRadius: 4, bgcolor: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s', '&:hover, &:focus-within': { bgcolor: 'rgba(30, 41, 59, 0.8)', borderColor: selectedPersona.color } }}>
                        <TextField
                            inputRef={inputRef}
                            fullWidth
                            multiline
                            maxRows={5}
                            placeholder={`Message ${selectedPersona.name}...`}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            sx={{ ml: 2, flex: 1, '& .MuiInputBase-root': { color: 'white' } }}
                            variant="standard"
                            InputProps={{ disableUnderline: true }}
                        />
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
        </Box>
    );
};

export default ChatbotPage;
