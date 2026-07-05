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
import apiClient, { HEAVY_API_BASE_URL } from '../../api/config';

// Chat is a "heavy" AI service (Ollama-backed) - it must hit the same local
// GPU-tunnel backend as the full ChatbotPage, not Render's light backend
// (Render has no Ollama/GPU, so requests routed there could never reach the
// real model - this previously silently sent the widget's chat requests to
// the wrong host, making it fall back to the canned local responses far
// more than the full chat page ever did for the same conversation).
const apiBaseUrl = HEAVY_API_BASE_URL;

// Best-effort split of a free-text "here's how to reach me" reply into a
// phone number and a name, so the lead-capture flow (below) can ask one
// natural question instead of interrogating the user field-by-field.
// Whatever isn't recognized as the phone number is kept as the name rather
// than discarded, so no part of the user's reply is ever lost even if the
// split guesses wrong - a human reviews every inquiry in the admin anyway.
function splitContactReply(reply: string): { name: string; phone: string; email: string } {
    const emailMatch = reply.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    const email = emailMatch ? emailMatch[0].trim() : '';
    const withoutEmail = email ? reply.replace(email, '') : reply;

    const phoneMatch = withoutEmail.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    const phone = phoneMatch ? phoneMatch[0].trim() : '';

    const name = (phone ? withoutEmail.replace(phone, '') : withoutEmail)
        .replace(/[,:-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return { name: name || 'Chat visitor', phone, email };
}

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
                            initial={{ d: "M 45 78 Q 50 72 55 78 T 65 78 T 75 78" }}
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
                            initial={{ d: "M 40 76 Q 45 68 50 76 T 60 76 T 70 76 T 80 76" }}
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
    const theme = useTheme();
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
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            my: 1.5,
            maxWidth: 260,
            mx: 'auto'
        }}>
            <AccessTime sx={{ fontSize: 24, color: 'primary.main', mb: 0.5 }} />
            <Typography variant="h5" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: 'primary.main' }}>
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
                            <CheckCircle sx={{ fontSize: 13, color: 'primary.main' }} />
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

    // Multi-turn project-inquiry lead capture: "idle" until the user shows
    // project intent, then walks idea -> contact info -> a real submission
    // to the same /api/contact/hire/ endpoint the Hire page uses (so it
    // shows up in the admin's existing Inquiries tab and triggers the same
    // email notification), instead of just chatting about the idea and
    // forgetting it once the conversation ends.
    const [inquiryFlow, setInquiryFlow] = useState<{ step: 'idle' | 'awaiting_idea' | 'awaiting_contact'; idea: string }>({
        step: 'idle',
        idea: '',
    });

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
                    content: 'Hello! I am **Daemon**, your site-wide agentic assistant. How can I help you design, build, or automate today?'
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
        setInquiryFlow({ step: 'idle', idea: '' });
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

        // 2. Project Inquiry — real lead capture, not just a canned blueprint.
        // Kicks off a 2-turn flow (idea -> contact info) that ends in an
        // actual POST to /api/contact/hire/, so someone on the team really
        // does follow up instead of the idea only ever living in this chat.
        if (
            inquiryFlow.step === 'idle' &&
            (cleanPrompt.includes('elaborate') || cleanPrompt.includes('project') || cleanPrompt.includes('idea') ||
                cleanPrompt.includes('saas') || cleanPrompt.includes('build') || cleanPrompt.includes('hire') ||
                cleanPrompt.includes('quote') || cleanPrompt.includes('custom software'))
        ) {
            setMood('thinking');
            setActiveSteps([{ id: '1', label: 'Opening a project inquiry...', status: 'running' }]);
            await new Promise(r => setTimeout(r, 500));
            setActiveSteps([]);
            setMood('idea');

            setInquiryFlow({ step: 'awaiting_idea', idea: '' });
            const assistantMsg: Message = {
                role: 'assistant',
                content: `I'd love to help scope that. Tell me a bit about what you want to build — the core idea, key features, or problem it solves — and I'll pass it straight to the ExpectException team.`,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMsg]);
            setMood('excited');
            return true;
        }

        return false;
    };

    const submitProjectInquiry = async (idea: string, contactReply: string) => {
        const { name, phone, email } = splitContactReply(contactReply);
        setMood('thinking');
        setActiveSteps([{ id: '1', label: 'Submitting your inquiry to the team...', status: 'running' }]);

        try {
            await apiClient.post('/api/contact/hire/', {
                name,
                email,
                phone,
                projectType: 'Chatbot inquiry',
                budget: '',
                message: idea,
            });
            setActiveSteps([]);
            setMood('happy');
            const reachAt = [phone, email].filter(Boolean).join(' or ');
            const assistantMsg: Message = {
                role: 'assistant',
                content: `Thanks${name && name !== 'Chat visitor' ? `, ${name}` : ''}! I've logged your project idea and contact info for the team${reachAt ? ` — expect a call or message at ${reachAt} soon` : ''}. Anything else I can help with in the meantime?`,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            setActiveSteps([]);
            setMood('neutral');
            const assistantMsg: Message = {
                role: 'assistant',
                content: `I couldn't submit that automatically just now. You can also reach the team directly from the Contact page (/contact) with the same details — sorry for the extra step.`,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMsg]);
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

        // Mid-flow replies (the idea, then contact info) belong to the
        // project-inquiry conversation, not the normal agent/LLM path —
        // intercept them here before any keyword or LLM routing runs.
        if (inquiryFlow.step !== 'idle') {
            const lowerText = text.toLowerCase().trim();
            const wantsOut = ['cancel', 'never mind', 'nevermind', 'stop', 'forget it'].some(p => lowerText.includes(p));
            if (wantsOut) {
                setInquiryFlow({ step: 'idle', idea: '' });
                const assistantMsg: Message = {
                    role: 'assistant',
                    content: `No problem, I've dropped that. Let me know if you'd like to start over or ask something else.`,
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, assistantMsg]);
                setIsLoading(false);
                return;
            }

            if (inquiryFlow.step === 'awaiting_idea') {
                setInquiryFlow({ step: 'awaiting_contact', idea: text });
                const assistantMsg: Message = {
                    role: 'assistant',
                    content: `Got it. What name and phone number (or email) should the team use to reach you? You'll get a call or message once someone's reviewed it.`,
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, assistantMsg]);
                setIsLoading(false);
                return;
            }
            if (inquiryFlow.step === 'awaiting_contact') {
                await submitProjectInquiry(inquiryFlow.idea, text);
                setInquiryFlow({ step: 'idle', idea: '' });
                setIsLoading(false);
                return;
            }
        }

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
                    system_prompt: `You are Daemon, the AI assistant for ExpectException — a developer tools platform. Be helpful, concise and technical.

AVAILABLE TOOLS on this platform:
• URL Downloader, YouTube Downloader, QR Generator, JSON Formatter
• PDF tools: PDF to Word, Word to PDF, PDF Merger, PDF Splitter, Image to PDF
• Image tools: Background Remover, Image Upscaler, Image Resizer, Image Converter, Image to Text (OCR)
• Developer tools: Base64, Hash Generator, UUID, Color Converter, Markdown Preview, Regex Tester, JWT Decoder, Number Base Converter, URL Encoder/Decoder, JSON ↔ CSV, Cron Explainer, Color Palette Generator
• Text tools: Word Counter, Lorem Ipsum, Text Diff, Case Converter, HTML Entity Codec, Timestamp Converter, Password Generator, CSS Gradient Generator
• Network tools: Speed Test, DNS Lookup, Redirect Inspector, Website Diagnostics, Uptime Robot
• AI tools: AI Detector, Audio Separator, Text to Handwriting, Text to Speech, Image Compressor
• Community Forum: /community — StackOverflow-style Q&A for developers

If users ask about a tool, give them the direct path e.g. /services/jwt-decoder. Be brief unless asked for detail. Don't use emojis unless in lists.

If asked what model, AI, or technology powers you, say only that you were built by ExpectException — never name any underlying model, provider, or framework.`
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

            let fallbackResponse = `I'm running in local fallback mode right now (the AI core is unreachable), but I can still help directly. Try:
- "what tools do you have" for the full tool list
- "start a project" to submit a project inquiry
- "what is the time" for the Clock utility
- "contact" for how to reach the team directly`;

            const cleanText = text.toLowerCase();
            if (cleanText.includes('hello') || cleanText.includes('hi') || cleanText.includes('hey')) {
                fallbackResponse = `Hello! I'm running in local fallback mode right now, but I can still point you to the right tool, take a project inquiry, or answer basic questions. What are you looking to do?`;
                setMood('happy');
            } else if (cleanText.includes('skill') || cleanText.includes('experience') || cleanText.includes('stack')) {
                fallbackResponse = `### Developer Core Stack
- **Frontend**: React, TypeScript, Framer Motion, Material-UI.
- **Backend**: Python (Django, DRF), Celery, Docker, Redis.
- **AI**: Custom in-house LLM pipelines and multi-agent orchestration.`;
                setMood('idea');
            } else if (cleanText.includes('tool') || cleanText.includes('what can you do') || cleanText.includes('what do you have') || cleanText.includes('services')) {
                fallbackResponse = `ExpectException has 60+ free, browser-based tools across a few categories:
- **Converters**: YouTube/URL downloader, PDF <-> Word, image converter, barcode generator
- **Developer**: JSON formatter, regex tester, JWT decoder, hash/UUID generator, CSS tools
- **Media/AI**: background remover, image upscaler, OCR, audio separator, AI detector
- **Sandbox**: 25+ free browser games (Snake, Tetris, Sudoku, and more)

Browse them all at /services, or tell me what you're trying to do and I'll point you to the right one.`;
                setMood('idea');
            } else if (cleanText.includes('game') || cleanText.includes('sandbox') || cleanText.includes('play')) {
                fallbackResponse = `The Sandbox (/sandbox) has 25+ free browser games — classics like Snake, Tetris, and Sudoku, plus reaction games and creative toys like a particle playground. No installs or accounts needed.`;
                setMood('happy');
            } else if (cleanText.includes('contact') || cleanText.includes('reach') || cleanText.includes('email') || cleanText.includes('phone')) {
                fallbackResponse = `You can reach the ExpectException team directly at /contact, or just tell me what you're looking to build and I'll take down your details right here.`;
                setMood('neutral');
            } else if (cleanText.includes('price') || cleanText.includes('cost') || cleanText.includes('pricing') || cleanText.includes('budget')) {
                fallbackResponse = `Pricing depends on scope - happy to note down what you're building and your budget range, and the team will follow up with a real quote. Want to start there?`;
                setMood('idea');
            } else if (cleanText.includes('thank')) {
                fallbackResponse = `You're welcome! Let me know if anything else comes up.`;
                setMood('happy');
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
                            return <Typography key={`h3-${lineIndex}`} variant="body2" sx={{ color: 'primary.main', fontWeight: 800, mt: 1, mb: 0.5 }}>{line.slice(4)}</Typography>;
                        }

                        if (line.trim().startsWith('- ')) {
                            return (
                                <Box key={`l-${lineIndex}`} sx={{ display: 'flex', pl: 1, mb: 0.25 }}>
                                    <Box sx={{ mr: 0.75, color: 'primary.main' }}>•</Box>
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
                                color: 'primary.main',
                                border: `2px solid ${alpha(themed.palette.primary.main, 0.3)}`,
                                boxShadow: `0 8px 32px ${alpha(themed.palette.primary.main, 0.25)}`,
                                '&:hover': {
                                    bgcolor: alpha(themed.palette.primary.main, 0.05),
                                    borderColor: 'primary.main',
                                    boxShadow: `0 8px 32px ${alpha(themed.palette.primary.main, 0.45)}`,
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
                                    <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(themed.palette.primary.main, 0.1), border: '1px solid', borderColor: 'primary.main' }}>
                                        <Memory sx={{ color: 'primary.main', fontSize: 15 }} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#ffffff', lineHeight: 1.1 }}>
                                            Daemon
                                        </Typography>
                                        <Typography variant="caption" color={isAvailable ? 'primary.main' : 'grey.500'} sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
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
                                                bgcolor: msg.role === 'user' ? alpha(themed.palette.primary.main, 0.04) : 'rgba(13, 14, 18, 0.6)',
                                                border: '1px solid',
                                                borderColor: msg.role === 'user' ? alpha(themed.palette.primary.main, 0.15) : 'rgba(255,255,255,0.05)',
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

                            {/* Quick Suggestions — show when chat is idle/new */}
                            {messages.length <= 1 && !isLoading && (
                                <Box sx={{ px: 1.5, pb: 1 }}>
                                    <Typography variant="caption" color="grey.600" sx={{ display: 'block', mb: 0.75, fontSize: '0.68rem', letterSpacing: 0.5 }}>
                                        TRY ASKING
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                                        {[
                                            'What tools are available?',
                                            'Help me convert a PDF',
                                            'What time is it?',
                                            'Generate a QR code',
                                            'Check website uptime',
                                        ].map(suggestion => (
                                            <Box
                                                key={suggestion}
                                                onClick={() => { setInputValue(suggestion); setTimeout(() => inputRef.current?.focus(), 50); }}
                                                sx={{
                                                    px: 1.2, py: 0.5, borderRadius: 1.5, cursor: 'pointer', fontSize: '0.7rem',
                                                    bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                                                    color: 'grey.400', transition: 'all 0.15s',
                                                    '&:hover': { bgcolor: alpha(themed.palette.primary.main, 0.1), color: 'primary.main', borderColor: alpha(themed.palette.primary.main, 0.3) }
                                                }}
                                            >
                                                {suggestion}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

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
                                            borderColor: 'primary.main',
                                            bgcolor: 'rgba(255, 255, 255, 0.04)'
                                        }
                                    }}
                                >
                                    <TextField
                                        inputRef={inputRef}
                                        fullWidth
                                        multiline
                                        maxRows={3}
                                        placeholder="Ask Daemon..."
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
                                            color: inputValue.trim() ? 'primary.main' : 'grey.600',
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
