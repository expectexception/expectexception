import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Container, Typography, Grid, Card, CardContent, Button,
    TextField, InputAdornment, Chip, Stack, Avatar, Divider,
    Tab, Tabs, Badge, Skeleton, Paper, IconButton, Tooltip,
} from '@mui/material';
import Seo from '../components/seo/Seo';
import {
    Search, Add, Forum, ThumbUp, ChatBubble, Visibility,
    CheckCircle, PushPin, Lock, TrendingUp, AccessTime,
    QuestionAnswer, LocalOffer, EmojiEvents,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

interface Thread {
    id: number;
    title: string;
    slug: string;
    author: { id: number; email: string; first_name: string; last_name: string };
    category: { id: number; name: string; slug: string; color: string; icon: string } | null;
    tags: string;
    is_pinned: boolean;
    is_closed: boolean;
    is_solved: boolean;
    view_count: number;
    vote_count: number;
    reply_count: number;
    created_at: string;
    last_activity: string;
}

interface Category {
    id: number;
    name: string;
    slug: string;
    description: string;
    color: string;
    thread_count: number;
}

const SORT_OPTIONS = [
    { label: 'Latest', value: 'latest', icon: <AccessTime fontSize="small" /> },
    { label: 'Popular', value: 'popular', icon: <TrendingUp fontSize="small" /> },
    { label: 'Unanswered', value: 'unanswered', icon: <QuestionAnswer fontSize="small" /> },
    { label: 'Solved', value: 'solved', icon: <CheckCircle fontSize="small" /> },
];

const authorName = (author: Thread['author']) => {
    if (author.first_name) return `${author.first_name} ${author.last_name}`.trim();
    return author.email.split('@')[0];
};

const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

const ThreadCard: React.FC<{ thread: Thread }> = ({ thread }) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const tagList = thread.tags ? thread.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card
                component={Link}
                to={`/community/thread/${thread.id}/${thread.slug}`}
                sx={{
                    mb: 1.5,
                    display: 'block',
                    textDecoration: 'none',
                    border: `1px solid ${alpha('#fff', 0.05)}`,
                    '&:hover': {
                        borderColor: alpha(primary, 0.35),
                        boxShadow: `0 4px 20px ${alpha(primary, 0.1)}`,
                    },
                    transition: 'all 0.2s ease',
                    transform: 'none',
                }}
            >
                <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        {/* Vote count */}
                        <Box sx={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            minWidth: 48, gap: 0.5,
                        }}>
                            <Box sx={{
                                px: 1.5, py: 0.5, borderRadius: 1,
                                border: `1px solid ${thread.is_solved ? alpha(primary, 0.4) : alpha('#fff', 0.08)}`,
                                bgcolor: thread.is_solved ? alpha(primary, 0.1) : 'transparent',
                            }}>
                                <Typography variant="body2" fontWeight="700" color={thread.is_solved ? primary : 'text.secondary'} align="center">
                                    {thread.reply_count}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" align="center" display="block">
                                    {thread.reply_count === 1 ? 'reply' : 'replies'}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                {thread.is_pinned && <PushPin sx={{ fontSize: 14, color: '#f59e0b' }} />}
                                {thread.is_closed && <Lock sx={{ fontSize: 14, color: 'text.disabled' }} />}
                                {thread.is_solved && <CheckCircle sx={{ fontSize: 14, color: primary }} />}
                                <Typography variant="subtitle1" fontWeight="700" color="text.primary" sx={{
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    maxWidth: '100%',
                                }}>
                                    {thread.title}
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                                {thread.category && (
                                    <Chip
                                        label={thread.category.name}
                                        size="small"
                                        sx={{
                                            height: 20, fontSize: '0.68rem',
                                            bgcolor: alpha(thread.category.color || primary, 0.12),
                                            color: thread.category.color || primary,
                                            border: `1px solid ${alpha(thread.category.color || primary, 0.25)}`,
                                        }}
                                    />
                                )}
                                {tagList.slice(0, 3).map(tag => (
                                    <Chip key={tag} label={tag} size="small" sx={{
                                        height: 20, fontSize: '0.68rem',
                                        bgcolor: alpha('#fff', 0.04),
                                        color: 'text.secondary',
                                    }} />
                                ))}
                            </Stack>

                            <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="caption" color="text.disabled">
                                    <b style={{ color: alpha('#fff', 0.5) }}>{authorName(thread.author)}</b>
                                    {' · '}
                                    {timeAgo(thread.created_at)}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                        <ThumbUp sx={{ fontSize: 13, color: 'text.disabled' }} />
                                        <Typography variant="caption" color="text.disabled">{thread.vote_count}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                        <Visibility sx={{ fontSize: 13, color: 'text.disabled' }} />
                                        <Typography variant="caption" color="text.disabled">{thread.view_count}</Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const CommunityPage: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const [threads, setThreads] = useState<Thread[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('latest');
    const [activeCategory, setActiveCategory] = useState('');

    const fetchThreads = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { sort };
            if (search) params.search = search;
            if (activeCategory) params.category = activeCategory;
            const res = await apiClient.get(endpoints.community.threads, { params });
            setThreads(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch {
            setThreads([]);
        } finally {
            setLoading(false);
        }
    }, [sort, search, activeCategory]);

    useEffect(() => {
        apiClient.get(endpoints.community.categories).then(res => {
            setCategories(Array.isArray(res.data) ? res.data : res.data.results || []);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        const delay = setTimeout(fetchThreads, 300);
        return () => clearTimeout(delay);
    }, [fetchThreads]);

    const pinnedThreads = threads.filter(t => t.is_pinned);
    const normalThreads = threads.filter(t => !t.is_pinned);

    return (
        <Box sx={{ minHeight: '100vh', py: { xs: 4, md: 6 } }}>
            <Seo
                title="Community Forum - Ask Questions & Share Knowledge"
                description="Join the ExpectException community forum. Ask programming questions, share solutions, and connect with other developers. StackOverflow-style Q&A platform."
                keywords={['developer forum', 'programming community', 'ask question', 'tech discussion', 'developer Q&A']}
                type="website"
                structuredData={{
                    "@context": "https://schema.org",
                    "@type": "DiscussionForumPosting",
                    "name": "ExpectException Community Forum",
                    "description": "Developer Q&A and discussion forum"
                }}
            />
            <Container maxWidth="xl">
                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Box sx={{
                            width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2,
                            background: `radial-gradient(circle, ${alpha(primary, 0.25)}, transparent)`,
                            border: `1.5px solid ${alpha(primary, 0.4)}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Forum sx={{ color: primary, fontSize: 32 }} />
                        </Box>
                        <Typography variant="h2" fontWeight="800" sx={{
                            background: `linear-gradient(135deg, ${primary}, ${theme.palette.secondary.main})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            Community Forum
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ mt: 1, maxWidth: 560, mx: 'auto' }}>
                            Ask questions, share knowledge, and help each other build great things.
                        </Typography>
                        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                size="large"
                                onClick={() => isAuthenticated ? navigate('/community/new') : navigate('/login')}
                                sx={{ borderRadius: 2 }}
                            >
                                New Thread
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<EmojiEvents />}
                                size="large"
                                component={Link}
                                to="/community/stats"
                                sx={{ borderRadius: 2 }}
                            >
                                Leaderboard
                            </Button>
                        </Box>
                    </Box>
                </motion.div>

                <Grid container spacing={3}>
                    {/* Sidebar */}
                    <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                                Categories
                            </Typography>
                            <Stack spacing={0.5}>
                                <Box
                                    onClick={() => setActiveCategory('')}
                                    sx={{
                                        px: 1.5, py: 1, borderRadius: 1.5, cursor: 'pointer',
                                        bgcolor: activeCategory === '' ? alpha(primary, 0.12) : 'transparent',
                                        border: `1px solid ${activeCategory === '' ? alpha(primary, 0.3) : 'transparent'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        '&:hover': { bgcolor: alpha(primary, 0.06) },
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={activeCategory === '' ? 700 : 400} color={activeCategory === '' ? primary : 'text.primary'}>
                                        All Topics
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">{threads.length}</Typography>
                                </Box>
                                {categories.map(cat => (
                                    <Box
                                        key={cat.id}
                                        onClick={() => setActiveCategory(activeCategory === cat.slug ? '' : cat.slug)}
                                        sx={{
                                            px: 1.5, py: 1, borderRadius: 1.5, cursor: 'pointer',
                                            bgcolor: activeCategory === cat.slug ? alpha(cat.color || primary, 0.12) : 'transparent',
                                            border: `1px solid ${activeCategory === cat.slug ? alpha(cat.color || primary, 0.3) : 'transparent'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            '&:hover': { bgcolor: alpha(cat.color || primary, 0.06) },
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={activeCategory === cat.slug ? 700 : 400} color={activeCategory === cat.slug ? (cat.color || primary) : 'text.primary'}>
                                            {cat.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">{cat.thread_count}</Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Paper>

                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                                Quick Stats
                            </Typography>
                            <Stack spacing={1.5}>
                                {[
                                    { label: 'Threads', value: threads.length, icon: <Forum fontSize="small" /> },
                                    { label: 'Solved', value: threads.filter(t => t.is_solved).length, icon: <CheckCircle fontSize="small" /> },
                                ].map(stat => (
                                    <Box key={stat.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ color: primary }}>{stat.icon}</Box>
                                        <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                                        <Typography variant="body2" fontWeight="700" color="text.primary" sx={{ ml: 'auto' }}>{stat.value}</Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* Main Content */}
                    <Grid item xs={12} md={9}>
                        {/* Search + Sort */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                            <TextField
                                placeholder="Search threads..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                size="small"
                                sx={{ flex: 1, minWidth: 200 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search sx={{ color: 'text.disabled', fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Stack direction="row" spacing={0.5}>
                                {SORT_OPTIONS.map(opt => (
                                    <Button
                                        key={opt.value}
                                        size="small"
                                        variant={sort === opt.value ? 'contained' : 'outlined'}
                                        onClick={() => setSort(opt.value)}
                                        startIcon={opt.icon}
                                        sx={{ fontSize: '0.75rem', py: 0.75, px: 1.5, borderRadius: 2 }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Stack>
                        </Box>

                        {/* Pinned threads */}
                        {pinnedThreads.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.disabled" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                                    PINNED
                                </Typography>
                                {pinnedThreads.map(t => <ThreadCard key={t.id} thread={t} />)}
                                <Divider sx={{ my: 2 }} />
                            </Box>
                        )}

                        {/* Thread list */}
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} variant="rounded" height={90} sx={{ mb: 1.5, borderRadius: 2 }} />
                            ))
                        ) : normalThreads.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 10 }}>
                                <Forum sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">No threads found</Typography>
                                <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                                    Be the first to start a discussion!
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    sx={{ mt: 3, borderRadius: 2 }}
                                    onClick={() => isAuthenticated ? navigate('/community/new') : navigate('/login')}
                                >
                                    Start a Thread
                                </Button>
                            </Box>
                        ) : (
                            normalThreads.map(t => <ThreadCard key={t.id} thread={t} />)
                        )}
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default CommunityPage;
