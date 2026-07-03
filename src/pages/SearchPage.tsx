import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Box, TextField, InputAdornment, Grid, Card,
    CardContent, Chip, CircularProgress, Stack, Tabs, Tab,
} from '@mui/material';
import { Search, Article, Build, Forum } from '@mui/icons-material';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTheme, alpha } from '@mui/material/styles';
import apiClient from '../api/config';
import toolsConfig from '../data/tools.json';
import { motion } from 'framer-motion';
import Seo from '../components/seo/Seo';

interface AnyResult {
    id: string; type: 'tool' | 'thread' | 'blog';
    title: string; description: string; url: string; meta?: string;
}

function searchTools(q: string): AnyResult[] {
    const ql = q.toLowerCase();
    return toolsConfig
        .filter(t => t.title.toLowerCase().includes(ql) || t.description.toLowerCase().includes(ql) || t.tags?.some((tag: string) => tag.includes(ql)))
        .map(t => ({ id: `tool-${t.id}`, type: 'tool', title: t.title, description: t.description, url: t.path, meta: t.category }));
}

const TYPE_COLOR = { tool: '#3dfc55', thread: '#60a5fa', blog: '#f59e0b' };
const TYPE_ICON = { tool: <Build fontSize="small" />, thread: <Forum fontSize="small" />, blog: <Article fontSize="small" /> };

const SearchPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState(0);
    const [toolResults, setToolResults] = useState<AnyResult[]>([]);
    const [threadResults, setThreadResults] = useState<AnyResult[]>([]);
    const [blogResults, setBlogResults] = useState<AnyResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q') || '';
        setQuery(q);
        if (q) doSearch(q);
    }, [location.search]);

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) return;
        setLoading(true);
        setToolResults(searchTools(q));
        try {
            const [threadRes, blogRes] = await Promise.allSettled([
                apiClient.get(`/api/community/threads/?search=${encodeURIComponent(q)}&limit=12`),
                apiClient.get(`/api/blog/posts/?search=${encodeURIComponent(q)}&limit=12`),
            ]);
            if (threadRes.status === 'fulfilled') {
                const items = threadRes.value.data?.results || threadRes.value.data || [];
                setThreadResults(items.map((t: any) => ({
                    id: `thread-${t.id}`, type: 'thread',
                    title: t.title, description: t.body?.slice(0, 120) || '',
                    url: `/community/thread/${t.slug || t.id}`, meta: t.category_name,
                })));
            }
            if (blogRes.status === 'fulfilled') {
                const items = blogRes.value.data?.results || blogRes.value.data || [];
                setBlogResults(items.map((b: any) => ({
                    id: `blog-${b.id}`, type: 'blog',
                    title: b.title, description: b.excerpt || b.content?.slice(0, 120) || '',
                    url: `/blog/${b.slug}`, meta: b.category,
                })));
            }
        } catch {}
        setLoading(false);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    };

    const tabResults = [
        [...toolResults, ...threadResults, ...blogResults],
        toolResults,
        threadResults,
        blogResults,
    ][tab];

    const totalCounts = [
        toolResults.length + threadResults.length + blogResults.length,
        toolResults.length, threadResults.length, blogResults.length,
    ];

    return (
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Seo title={`Search${query ? ` — "${query}"` : ''} | ExpectException`} description="Search tools, community threads, and blog posts." />

            <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
                {query ? <>Results for <span style={{ color: theme.palette.primary.main }}>"{query}"</span></> : 'Search ExpectException'}
            </Typography>

            <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
                <TextField
                    fullWidth
                    placeholder="Search tools, threads, blog posts…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                    autoFocus
                />
            </Box>

            {query && (
                <>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['All', 'Tools', 'Threads', 'Blog'].map((label, i) => (
                            <Tab key={label} label={`${label} (${totalCounts[i]})`} sx={{ fontWeight: 700, fontSize: '0.85rem' }} />
                        ))}
                    </Tabs>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                    ) : tabResults.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>No results found for "{query}"</Typography>
                    ) : (
                        <Grid container spacing={2}>
                            {tabResults.map((r, i) => (
                                <Grid item xs={12} key={r.id} component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                    <Card
                                        component={Link}
                                        to={r.url}
                                        sx={{
                                            textDecoration: 'none',
                                            display: 'block',
                                            bgcolor: 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${alpha(TYPE_COLOR[r.type], 0.2)}`,
                                            borderLeft: `4px solid ${TYPE_COLOR[r.type]}`,
                                            '&:hover': { bgcolor: alpha(TYPE_COLOR[r.type], 0.06), borderColor: alpha(TYPE_COLOR[r.type], 0.4) },
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                                <Box sx={{ color: TYPE_COLOR[r.type], mt: 0.3, flexShrink: 0 }}>{TYPE_ICON[r.type]}</Box>
                                                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                        <Typography variant="body1" fontWeight={700} noWrap>{r.title}</Typography>
                                                        {r.meta && <Chip label={r.meta} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                                                    </Stack>
                                                    {r.description && <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</Typography>}
                                                </Box>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </>
            )}
        </Container>
    );
};

export default SearchPage;
