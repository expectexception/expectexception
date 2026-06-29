import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Typography,
    TextField,
    IconButton,
    Paper,
    Avatar,
    alpha,
    useTheme,
    useMediaQuery,
    Tooltip,
    Alert,
    Stack,
    Button,
} from '@mui/material';
import {
    Send,
    Close,
    ContentCopy,
    AccessTime,
    HourglassEmpty,
    Memory,
    CheckCircle,
    Cancel,
    DeleteOutline,
    ChatBubbleOutline
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient, { API_BASE_URL } from '../../api/config';

const apiBaseUrl = API_BASE_URL;

// --- Types ---
type Mood = 'neutral' | 'thinking' | 'happy' | 'excited' | 'sleeping' | 'idea' | 'error';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
    isWidget?: boolean;
    widgetType?: 'clock' | 'idea';
}

interface AgentStep {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'failed';
}

// --- Custom Animated SVG Face Component ---
const ChatbotFace: React.FC<{ mood: Mood }> = ({ mood }) => {
    const colorMap = {
        neutral: '#00eeff', // Cyan
        thinking: '#00eeff', // Cyan
        happy: '#3dfc55', // Neon Green
        excited: '#3dfc55', // Neon Green
        sleeping: '#8b5cf6', // Purple
        idea: '#f59e0b', // Amber
        error: '#ef4444', // Red
    };

    const activeColor = colorMap[mood] || '#00eeff';

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
            <motion.div
                animate={mood === 'sleeping' ? {
                    scale: [1, 0.97, 1],
                    y: [0, 3, 0]
                } : {
                    y: [0, -4, 0],
                }}
                transition={{
                    duration: mood === 'sleeping' ? 4 : 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                style={{ position: 'relative', width: 70, height: 70 }}
            >
                <svg width="70" height="70" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
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

                    {/* Antennas */}
                    <motion.path
                        d="M 15 60 L 5 60 M 105 60 L 115 60"
                        stroke={activeColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <circle cx="5" cy="60" r="3" fill={activeColor} />
                    <circle cx="115" cy="60" r="3" fill={activeColor} />

                    {/* Head Chassis */}
                    <motion.rect
                        x="20"
                        y="25"
                        width="80"
                        height="70"
                        rx="20"
                        stroke={activeColor}
                        strokeWidth="3"
                        fill="rgba(13, 14, 18, 0.9)"
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

                    {/* Zzz for sleeping */}
                    {mood === 'sleeping' && (
                        <motion.g>
                            <motion.text
                                x="95" y="25"
                                fill="#8b5cf6"
                                fontSize="12"
                                fontWeight="bold"
                                animate={{ opacity: [0, 1, 0], y: [25, 10] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                Z
                            </motion.text>
                        </motion.g>
                    )}

                    {/* Eyes */}
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
                            <circle cx="42" cy="53" r="8" fill={activeColor} />
                        )}
                        {mood === 'sleeping' && (
                            <path d="M 35 55 L 47 55" stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
                        )}
                        {mood === 'idea' && (
                            <circle cx="42" cy="53" r="8" fill={activeColor} />
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
                            <circle cx="78" cy="53" r="8" fill={activeColor} />
                        )}
                        {mood === 'sleeping' && (
                            <path d="M 71 55 L 83 55" stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
                        )}
                        {mood === 'idea' && (
                            <circle cx="78" cy="53" r="8" fill={activeColor} />
                        )}
                        {mood === 'error' && (
                            <path d="M 73 48 L 83 58 M 83 48 L 73 58" stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
                        )}
                    </g>

                    {/* Mouth */}
                    {mood === 'neutral' && (
                        <path d="M 45 78 Q 60 76 75 78" stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
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
                        <path d="M 50 78 Q 60 81 70 78" stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" />
                    )}
                    {mood === 'idea' && (
                        <circle cx="60" cy="78" r="3" fill={activeColor} />
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
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Box sx={{
            p: 2,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(13,14,18,0.85) 0%, rgba(5,5,5,0.95) 100%)',
            border: '1px solid rgba(61, 252, 85, 0.2)',
            boxShadow: '0 4px 20px rgba(61, 252, 85, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            my: 1.5,
            maxWidth: 260,
            mx: 'auto'
        }}>
            <AccessTime sx={{ fontSize: 24, color: '#3dfc55', mb: 0.5 }} />
            <Typography variant="h5" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#3dfc55' }}>
                {time.toLocaleTimeString()}
            </Typography>
            <Typography variant="caption" color="grey.400" sx={{ mt: 0.5 }}>
                {time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Typography>
        </Box>
    );
};

// --- Agent Steps UI ---
const AgentStepsIndicator: React.FC<{ steps: AgentStep[] }> = ({ steps }) => {
    return (
        <Box sx={{
            mb: 1.5,
            p: 1.5,
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)',
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            maxWidth: '100%'
        }}>
            <Typography variant="caption" sx={{ color: '#00eeff', fontWeight: 800, letterSpacing: 1, display: 'block', mb: 1, textTransform: 'uppercase' }}>
                Agent Log
            </Typography>
            <Stack spacing={0.75}>
                {steps.map((step) => (
                    <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {step.status === 'running' && (
                            <HourglassEmpty sx={{ fontSize: 13, color: '#00eeff', animation: 'spin 2s linear infinite' }} />
                        )}
                        {step.status === 'done' && (
                            <CheckCircle sx={{ fontSize: 13, color: '#3dfc55' }} />
                        )}
                        {step.status === 'pending' && (
                            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'grey.700', mx: 0.5 }} />
                        )}
                        {step.status === 'failed' && (
                            <Cancel sx={{ fontSize: 13, color: '#ef4444' }} />
                        )}
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                color: step.status === 'done' ? 'grey.350' : step.status === 'running' ? '#00eeff' : 'grey.600',
                            }}
                        >
                            {step.label}
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

// --- Main ChatbotWidget Component ---
interface ChatbotWidgetProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ isOpen, setIsOpen }) => {
    const themed = useTheme();
    const isMobile = useMediaQuery(themed.breakpoints.down('sm'));

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mood, setMood] = useState<Mood>('neutral');
    const [activeSteps, setActiveSteps] = useState<AgentStep[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastRenderTimeRef = useRef<number>(0);
    const accumulatedContentRef = useRef<string>('');

    // Restore history from localStorage on load
    useEffect(() => {
        const saved = localStorage.getItem('global_chatbot_history');
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) { /* ignore */ }
        } else {
            // Initial greeting
            setMessages([
                {
                    role: 'assistant',
                    content: 'Hello! I am **A.E.G.I.S.**, your global portfolio assistant. How can I help you design, build, or automate today?'
                }
            ]);
        }
    }, []);

    // Save history to localStorage
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('global_chatbot_history', JSON.stringify(messages));
        }
    }, [messages]);

    // Check Ollama status
    useEffect(() => {
        let isMounted = true;
        const checkStatus = async () => {
            try {
                const response = await apiClient.get('/api/chatbot/status/');
                if (isMounted) {
                    setIsAvailable(response.data.available);
                }
            } catch (err) {
                if (isMounted) setIsAvailable(false);
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isLoading, activeSteps, isOpen, scrollToBottom]);

    const handleClearChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: 'Chat session reset. I am ready for your next request.'
            }
        ]);
        localStorage.removeItem('global_chatbot_history');
        setMood('neutral');
    };

    const handleTextKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // --- Core Agentic Command Handler ---
    const executeAgentAction = async (prompt: string): Promise<boolean> => {
        const cleanPrompt = prompt.toLowerCase().trim();

        // 1. Time / Clock Command
        if (cleanPrompt.includes('time') || cleanPrompt.includes('clock') || cleanPrompt.includes('date') || cleanPrompt.includes('today')) {
            setMood('thinking');
            setActiveSteps([
                { id: '1', label: 'Parsing temporal request...', status: 'running' },
                { id: '2', label: 'Fetching system clock...', status: 'pending' },
                { id: '3', label: 'Loading Clock Widget...', status: 'pending' }
            ]);

            await new Promise(r => setTimeout(r, 600));
            setActiveSteps(prev => [
                { ...prev[0], status: 'done' },
                { ...prev[1], status: 'running' },
                prev[2]
            ]);

            await new Promise(r => setTimeout(r, 500));
            setActiveSteps(prev => [
                prev[0],
                { ...prev[1], status: 'done' },
                { ...prev[2], status: 'running' }
            ]);

            await new Promise(r => setTimeout(r, 400));
            setActiveSteps([]);
            setMood('idea');

            const assistantMsg: Message = {
                role: 'assistant',
                content: `Here is the current system local time:`,
                timestamp: new Date().toISOString(),
                isWidget: true,
                widgetType: 'clock'
            };
            setMessages(prev => [...prev, assistantMsg]);
            setMood('happy');
            return true;
        }

        // 2. Project Idea Elaborator
        if (cleanPrompt.includes('elaborate') || cleanPrompt.includes('project') || cleanPrompt.includes('idea') || cleanPrompt.includes('saas') || cleanPrompt.includes('build')) {
            setMood('thinking');
            setActiveSteps([
                { id: '1', label: 'Analyzing project concept...', status: 'running' },
                { id: '2', label: 'Formulating modular architecture...', status: 'pending' },
                { id: '3', label: 'Drafting 3-week MVP roadmap...', status: 'pending' }
            ]);

            await new Promise(r => setTimeout(r, 800));
            setActiveSteps(prev => [
                { ...prev[0], status: 'done' },
                { ...prev[1], status: 'running' },
                prev[2]
            ]);

            await new Promise(r => setTimeout(r, 700));
            setActiveSteps(prev => [
                prev[0],
                { ...prev[1], status: 'done' },
                { ...prev[2], status: 'running' }
            ]);

            await new Promise(r => setTimeout(r, 500));
            setActiveSteps([]);
            setMood('idea');

            const elaborationText = `### 🚀 A.E.G.I.S. Project Blueprint

I have synthesized an MVP roadmap for your idea:
- **Core Architecture**: React (Frontend) + Django REST Framework (Backend) containerized in Docker.
- **Milestones**:
  - **Week 1**: Setup database schemas & authentication.
  - **Week 2**: Build glassmorphic dashboard & connect REST APIs.
  - **Week 3**: Integrate LLM/Ollama workflows & deploy on Render.`;

            const assistantMsg: Message = {
                role: 'assistant',
                content: elaborationText,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMsg]);
            setMood('excited');
            return true;
        }

        return false;
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

        const agentHandled = await executeAgentAction(text);
        if (agentHandled) {
            setIsLoading(false);
            return;
        }

        // Query LLM
        setMood('thinking');
        setActiveSteps([
            { id: '1', label: 'Analyzing context...', status: 'running' },
            { id: '2', label: 'Synthesizing response...', status: 'pending' }
        ]);

        await new Promise(r => setTimeout(r, 500));
        setActiveSteps(prev => [
            { ...prev[0], status: 'done' },
            { ...prev[1], status: 'running' }
        ]);

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
                    model: 'qwen3:4b',
                    system_prompt: 'You are A.E.G.I.S., a premium agentic portfolio chatbot. Keep your responses technical, helpful, and concise. You can simulate agent actions like system diagnostics and project elaboration.'
                })
            });

            if (!response.ok) throw new Error('Failed to reach AI service');

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
                            }
                        } catch { /* ignore */ }
                    }
                }
            }
        } catch (err: any) {
            // Local fallback
            setActiveSteps([]);
            setIsLoading(false);

            let fallbackResponse = `I am **A.E.G.I.S.**, your agentic AI companion. 

I am currently running in local fallback mode. Try:
- "what is the time" to open the Clock utility.
- "elaborate on a SaaS idea" to generate an MVP blueprint.
- "list developer skills" to review core expertise.`;

            const cleanText = text.toLowerCase();
            if (cleanText.includes('hello') || cleanText.includes('hi') || cleanText.includes('hey')) {
                fallbackResponse = `Hello! How can I assist you with your software development, automation, or agentic workflow questions today?`;
                setMood('happy');
            } else if (cleanText.includes('skill') || cleanText.includes('experience') || cleanText.includes('stack')) {
                fallbackResponse = `### 🛠️ Developer Core Stack
- **Frontend**: React, TypeScript, Next.js, Framer Motion, Material-UI.
- **Backend**: Python (Django, FastAPI), Docker, Redis, PostgreSQL.
- **AI**: LangChain, Ollama, custom multi-agent orchestration.`;
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

    const formatMessage = (content: string) => {
        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map((part, i) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const code = part.slice(3, -3);
                const firstLine = code.split('\n')[0];
                const language = firstLine.match(/^[a-z0-9]+$/i) ? firstLine : '';
                const codeContent = language ? code.slice(language.length + 1) : code;
                return (
                    <Paper key={i} elevation={0} sx={{ my: 1, borderRadius: '8px', overflow: 'hidden', bgcolor: '#0d0e12', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'grey.500', fontFamily: 'monospace', fontSize: '0.7rem' }}>{language || 'text'}</Typography>
                        </Box>
                        <Box sx={{ p: 1.5, overflow: 'auto' }}>
                            <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: '#e6edf3' }}><code>{codeContent.trim()}</code></pre>
                        </Box>
                    </Paper>
                );
            }

            return (
                <span key={i} style={{ whiteSpace: 'pre-wrap', display: 'block', wordBreak: 'break-word' }}>
                    {part.split('\n').map((line, lineIndex) => {
                        let renderLine: React.ReactNode = line;

                        if (line.includes('**')) {
                            const boldParts = line.split(/(\*\*.*?\*\*)/g);
                            renderLine = boldParts.map((bp, bpi) =>
                                bp.startsWith('**') && bp.endsWith('**')
                                    ? <strong key={`b-${bpi}`} style={{ color: '#ffffff', fontWeight: 700 }}>{bp.slice(2, -2)}</strong>
                                    : bp
                            );
                        }

                        if (line.startsWith('### ')) {
                            return <Typography key={`h3-${lineIndex}`} variant="body2" sx={{ color: '#3dfc55', fontWeight: 800, mt: 1, mb: 0.5 }}>{line.slice(4)}</Typography>;
                        }

                        if (line.trim().startsWith('- ')) {
                            return (
                                <Box key={`l-${lineIndex}`} sx={{ display: 'flex', pl: 1, mb: 0.25 }}>
                                    <Box sx={{ mr: 0.75, color: '#3dfc55' }}>•</Box>
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

    return (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
            <AnimatePresence>
                {/* 1. Closed State: Floating Action Button (FAB) */}
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                        <IconButton
                            onClick={() => setIsOpen(true)}
                            sx={{
                                width: 60,
                                height: 60,
                                bgcolor: '#0d0e12',
                                color: '#3dfc55',
                                border: '2px solid rgba(61, 252, 85, 0.3)',
                                boxShadow: '0 8px 32px rgba(61, 252, 85, 0.25)',
                                '&:hover': {
                                    bgcolor: 'rgba(61, 252, 85, 0.05)',
                                    borderColor: '#3dfc55',
                                    boxShadow: '0 8px 32px rgba(61, 252, 85, 0.45)',
                                    transform: 'scale(1.05)'
                                },
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        >
                            <ChatBubbleOutline sx={{ fontSize: 28 }} />
                        </IconButton>
                    </motion.div>
                )}

                {/* 2. Open State: Expanding Chat Window */}
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 50, x: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 50, x: 20 }}
                        transition={{ type: 'spring', damping: 22 }}
                    >
                        <Paper
                            sx={{
                                width: isMobile ? 'calc(100vw - 48px)' : 380,
                                height: isMobile ? 'calc(100dvh - 140px)' : 540,
                                maxHeight: 'calc(100dvh - 120px)',
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: 'rgba(13, 14, 18, 0.85)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '20px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 0 30px rgba(255,255,255,0.02)',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {/* Header */}
                            <Box sx={{
                                p: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                bgcolor: 'rgba(5, 5, 5, 0.2)'
                            }}>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(61, 252, 85, 0.1)', border: '1px solid #3dfc55' }}>
                                        <Memory sx={{ color: '#3dfc55', fontSize: 15 }} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#ffffff', lineHeight: 1.1 }}>
                                            A.E.G.I.S.
                                        </Typography>
                                        <Typography variant="caption" color={isAvailable ? '#3dfc55' : 'grey.500'} sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                                            {isAvailable ? 'AI Core Live' : 'Local Fallback'}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Stack direction="row" spacing={0.5}>
                                    <Tooltip title="Reset Conversation">
                                        <IconButton onClick={handleClearChat} size="small" sx={{ color: 'grey.500', '&:hover': { color: '#ef4444' } }}>
                                            <DeleteOutline fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <IconButton onClick={() => setIsOpen(false)} size="small" sx={{ color: 'grey.500', '&:hover': { color: '#ffffff' } }}>
                                        <Close fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Box>

                            {/* Messages Container */}
                            <Box
                                ref={messagesContainerRef}
                                sx={{
                                    flex: 1,
                                    p: 2,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    bgcolor: 'rgba(0, 0, 0, 0.15)'
                                }}
                            >
                                <ChatbotFace mood={mood} />
                                {messages.map((msg, idx) => (
                                    <Box key={idx} sx={{ display: 'flex', gap: 1, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                        <Box sx={{ maxWidth: '85%' }}>
                                            <Paper sx={{
                                                p: 1.5,
                                                bgcolor: msg.role === 'user' ? 'rgba(61, 252, 85, 0.04)' : 'rgba(13, 14, 18, 0.6)',
                                                border: '1px solid',
                                                borderColor: msg.role === 'user' ? 'rgba(61, 252, 85, 0.15)' : 'rgba(255,255,255,0.05)',
                                                borderRadius: '14px',
                                                borderTopRightRadius: msg.role === 'user' ? 0 : '14px',
                                                borderTopLeftRadius: msg.role === 'assistant' ? 0 : '14px',
                                                color: 'grey.200',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}>
                                                {msg.isWidget && msg.widgetType === 'clock' && <ClockWidget />}
                                                <Typography component="div" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                                                    {formatMessage(msg.content)}
                                                </Typography>
                                            </Paper>
                                        </Box>
                                    </Box>
                                ))}

                                {activeSteps.length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <AgentStepsIndicator steps={activeSteps} />
                                        </Box>
                                    </Box>
                                )}
                                <div ref={messagesEndRef} />
                            </Box>

                            {/* Input Area */}
                            <Box sx={{
                                p: 1.5,
                                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                bgcolor: 'rgba(13, 14, 18, 0.95)'
                            }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: '4px 8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: '10px',
                                        bgcolor: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                        '&:focus-within': {
                                            borderColor: '#3dfc55',
                                            bgcolor: 'rgba(255, 255, 255, 0.04)'
                                        }
                                    }}
                                >
                                    <TextField
                                        inputRef={inputRef}
                                        fullWidth
                                        multiline
                                        maxRows={3}
                                        placeholder="Ask A.E.G.I.S..."
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
                                        sx={{ ml: 1, flex: 1, '& .MuiInputBase-root': { color: 'white', fontSize: '0.875rem' } }}
                                        variant="standard"
                                        InputProps={{ disableUnderline: true }}
                                    />
                                    <IconButton
                                        onClick={() => sendMessage()}
                                        disabled={!inputValue.trim() || isLoading}
                                        sx={{
                                            p: 1,
                                            color: inputValue.trim() ? '#3dfc55' : 'grey.600',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                                        }}
                                    >
                                        <Send sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Paper>
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
};

export default ChatbotWidget;
