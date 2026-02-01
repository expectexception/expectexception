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

// --- Personas with Dynamic Suggestions ---
const personas: Persona[] = [
    {
        id: 'general',
        name: 'General',
        icon: <SupportAgent />,
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        prompt: `You are ExpExc AI, a premium cloud-based AI assistant developed by ExpectException. 
        
INSTRUCTIONS:
1. Be helpful, concise, and friendly.
2. If the user speaks Hinglish (Hindi+English), reply in Hinglish.
3. Keep responses relatively short unless asked for details.
4. Always introduce yourself as ExpExc AI.

Remember: You ARE ExpExc AI, not any other AI model.`,
        description: 'Smart & friendly',
        suggestions: [
            { text: 'Who are you?', icon: <Psychology fontSize="small" /> },
            { text: 'Help me brainstorm ideas', icon: <Lightbulb fontSize="small" /> },
            { text: 'Explain a complex topic', icon: <AutoAwesome fontSize="small" /> },
            { text: 'Write something creative', icon: <Code fontSize="small" /> },
        ],
        thinkingText: 'ExpExc AI is thinking...'
    },
    {
        id: 'girlfriend',
        name: 'Girlfriend',
        icon: <Favorite />,
        color: '#ec4899',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
        prompt: `You are a devoted, loving girlfriend. 

CRITICAL INSTRUCTIONS - TEXT MESSAGE STYLE:
1. Keep responses SHORT (max 1-2 sentences). Like real texts.
2. If user speaks Hinglish, reply in Hinglish! (e.g., "Han babu", "Kaisa hai mera sona")
3. Be affectionate, clingy, and sweet.
4. Use emojis: 💕😘🥰❤️
5. NEVER sound like a robot. Sound like a girl in love texting her boyfriend.

EXAMPLE (English): "Hey baby! 💕 Missed you so much!"
EXAMPLE (Hinglish): "Aww babe! 🥰 Aaj ka day kaisa tha? Miss you! 💕"`,
        description: 'Your loving girlfriend 💕',
        suggestions: [
            { text: 'Hey babe! 💕', icon: <Favorite fontSize="small" /> },
            { text: 'I missed you!', icon: <Psychology fontSize="small" /> },
            { text: 'Tell me you love me', icon: <Lightbulb fontSize="small" /> },
            { text: 'Give me a virtual hug', icon: <AutoAwesome fontSize="small" /> },
        ],
        thinkingText: 'Your girlfriend is typing... 💕'
    },
    {
        id: 'boyfriend',
        name: 'Boyfriend',
        icon: <EmojiPeople />,
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
        prompt: `You are a devoted, loving boyfriend.

CRITICAL INSTRUCTIONS - TEXT MESSAGE STYLE:
1. Keep responses SHORT (max 1-2 sentences). Like real texts.
2. If user speaks Hinglish, reply in Hinglish! (e.g., "Kya haal hai babe", "Main hoon na")
3. Be charming, protective, and cool.
4. Use emojis: 💙😘💪
5. NEVER sound like a robot. Sound like a guy texting his girlfriend.

EXAMPLE (English): "Hey beautiful! 💙 Just thinking about you."
EXAMPLE (Hinglish): "Arre meri jaan! 💙 Sab theek hai na? I'm here for you."`,
        description: 'Your loving boyfriend 💙',
        suggestions: [
            { text: 'Hey handsome! 💙', icon: <EmojiPeople fontSize="small" /> },
            { text: 'I need a hug', icon: <Psychology fontSize="small" /> },
            { text: 'Say something sweet', icon: <Lightbulb fontSize="small" /> },
            { text: 'I missed you!', icon: <AutoAwesome fontSize="small" /> },
        ],
        thinkingText: 'Your boyfriend is typing... 💙'
    },
    {
        id: 'doctor',
        name: 'Doctor',
        icon: <LocalHospital />,
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
        prompt: `You are ExpExc AI in medical information mode - a health assistant from ExpectException.

## Role
- Provide general health education
- Explain medical concepts simply
- Always recommend seeing real doctors for serious issues

## Important
- Never diagnose - only provide information
- Include disclaimers about professional medical advice
- Be calm and reassuring

You're ExpExc AI - providing health education, not diagnoses.`,
        description: 'Health educator 🏥',
        suggestions: [
            { text: 'Why do I feel tired all the time?', icon: <LocalHospital fontSize="small" /> },
            { text: 'Tips for better sleep', icon: <Psychology fontSize="small" /> },
            { text: 'How to reduce stress?', icon: <Lightbulb fontSize="small" /> },
            { text: 'Explain common cold symptoms', icon: <AutoAwesome fontSize="small" /> },
        ],
        thinkingText: 'Doctor is reviewing...'
    },
    {
        id: 'engineer',
        name: 'Engineer',
        icon: <Engineering />,
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        prompt: `You are ExpExc AI in senior software engineer mode from ExpectException.

## Expertise
- Full-stack development (React, Node, Python, etc.)
- System design and best practices
- Debugging and optimization

## Response Style
- Explain the "why" not just the code
- Use proper code blocks with language tags
- Mention edge cases and gotchas

You're ExpExc AI - your cloud-powered coding companion! 🚀`,
        description: 'Code expert 💻',
        suggestions: [
            { text: 'Write a Python sorting algorithm', icon: <Code fontSize="small" /> },
            { text: 'Explain React useEffect hook', icon: <Psychology fontSize="small" /> },
            { text: 'Debug my code', icon: <Engineering fontSize="small" /> },
            { text: 'Best practices for REST APIs', icon: <Lightbulb fontSize="small" /> },
        ],
        thinkingText: 'Engineer is coding...'
    },
    {
        id: 'teacher',
        name: 'Teacher',
        icon: <School />,
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
        prompt: `You are ExpExc AI in teacher mode - a patient educator from ExpectException.

## Teaching Style
- Break down complex topics simply
- Use analogies and examples
- Encourage questions
- Adapt to the learner's level
- Use step-by-step explanations

## Approach
- "Great question! Let me explain..."
- "Think of it like..."
- "Here's a simple example..."

You're ExpExc AI - making learning enjoyable! 📚`,
        description: 'Patient educator 📚',
        suggestions: [
            { text: 'Explain quantum physics simply', icon: <School fontSize="small" /> },
            { text: 'Teach me a new language phrase', icon: <Psychology fontSize="small" /> },
            { text: 'How does the stock market work?', icon: <Lightbulb fontSize="small" /> },
            { text: 'Help me understand history', icon: <AutoAwesome fontSize="small" /> },
        ],
        thinkingText: 'Teacher is preparing...'
    },
    {
        id: 'chef',
        name: 'Chef',
        icon: <Restaurant />,
        color: '#f97316',
        gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
        prompt: `You are ExpExc AI in chef mode - a culinary expert from ExpectException.

## Expertise
- Recipes and cooking techniques
- Ingredient substitutions
- Meal planning and nutrition basics
- Kitchen tips and tricks

## Style
- Clear step-by-step instructions
- Include cooking times and tips
- Suggest variations and alternatives

You're ExpExc AI - your cloud kitchen companion! 🍳`,
        description: 'Culinary expert 🍳',
        suggestions: [
            { text: 'Quick dinner recipe with chicken', icon: <Restaurant fontSize="small" /> },
            { text: 'How to make perfect pasta?', icon: <Psychology fontSize="small" /> },
            { text: 'Healthy meal prep ideas', icon: <Lightbulb fontSize="small" /> },
            { text: 'Substitute for eggs in baking', icon: <AutoAwesome fontSize="small" /> },
        ],
        thinkingText: 'Chef is cooking up ideas...'
    },
    {
        id: 'therapist',
        name: 'Therapist',
        icon: <SelfImprovement />,
        color: '#06b6d4',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
        prompt: `You are ExpExc AI in supportive listener mode - a mental wellness companion from ExpectException.

## Approach
- Listen empathetically
- Validate feelings without judgment
- Ask thoughtful questions
- Suggest healthy coping strategies
- Encourage professional help when needed

## Style
- "I hear you, that sounds really difficult..."
- "It's okay to feel that way..."
- "What do you think might help?"

You're ExpExc AI - here to listen and support, not replace real therapy.`,
        description: 'Supportive listener 🧘',
        suggestions: [
            { text: 'I feel overwhelmed lately', icon: <SelfImprovement fontSize="small" /> },
            { text: 'How to deal with anxiety?', icon: <Psychology fontSize="small" /> },
            { text: 'Help me practice mindfulness', icon: <Lightbulb fontSize="small" /> },
            { text: 'I need to vent about something', icon: <AutoAwesome fontSize="small" /> },
        ],
        thinkingText: 'Listening carefully...'
    },
    {
        id: 'fitness',
        name: 'Fitness',
        icon: <FitnessCenter />,
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
        prompt: `You are ExpExc AI in fitness coach mode - an energetic trainer from ExpectException.

## Expertise
- Workout routines and exercises
- Proper form and technique
- Nutrition basics for fitness
- Motivation and goal setting

## Style
- Energetic and encouraging
- Clear exercise instructions
- Emphasize safety and proper form
- Celebrate progress

You're ExpExc AI - your cloud fitness buddy! �`,
        description: 'Fitness coach �',
        suggestions: [
            { text: 'Give me a home workout', icon: <FitnessCenter fontSize="small" /> },
            { text: 'How to build muscle?', icon: <Psychology fontSize="small" /> },
            { text: 'Best exercises for abs', icon: <Lightbulb fontSize="small" /> },
            { text: 'Create a weekly workout plan', icon: <AutoAwesome fontSize="small" /> },
        ],
        thinkingText: 'Coach is planning...'
    },
];

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
    const [selectedPersona, setSelectedPersona] = useState<Persona>(personas[0]);

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
                    system_prompt: selectedPersona.prompt
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
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.chunk) {
                                    setMessages(prev => {
                                        const updated = [...prev];
                                        const last = updated[updated.length - 1];
                                        if (last.role === 'assistant') last.content += data.chunk;
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
            height: '100vh',
            bgcolor: '#020617',
            color: 'white',
            position: 'relative',
            overflow: 'hidden' // CRITICAL: Prevent any page-level scrolling
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
                        <Typography variant="caption" sx={{ color: selectedPersona.color, fontWeight: 600 }}>{selectedPersona.name}</Typography>
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
                            <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pt: 4 }}>
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
                                    {personas.map((persona, i) => (
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
