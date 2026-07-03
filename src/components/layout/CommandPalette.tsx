import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog, TextField, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Typography, Box, Chip, InputAdornment, alpha,
} from '@mui/material';
import { Search, Terminal, Forum, Article, ArrowForwardIos } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import apiClient from '../../api/config';
import toolsConfig from '../../data/tools.json';

interface CmdItem {
    id: string;
    label: string;
    sublabel?: string;
    path: string;
    type: 'tool' | 'community' | 'blog' | 'nav';
    score?: number;
}

const NAV_ITEMS: CmdItem[] = [
    { id: 'nav-home', label: 'Home', path: '/', type: 'nav' },
    { id: 'nav-services', label: 'All Tools', path: '/services', type: 'nav' },
    { id: 'nav-community', label: 'Community', path: '/community', type: 'nav' },
    { id: 'nav-blog', label: 'Blog', path: '/blog', type: 'nav' },
    { id: 'nav-sandbox', label: 'Sandbox', path: '/sandbox', type: 'nav' },
    { id: 'nav-chatbot', label: 'Daemon AI Chat', path: '/chatbot', type: 'nav' },
];

const TOOL_ITEMS: CmdItem[] = toolsConfig.map(t => ({
    id: `tool-${t.id}`,
    label: t.title,
    sublabel: t.description,
    path: t.path,
    type: 'tool',
}));

function score(item: CmdItem, q: string): number {
    const ql = q.toLowerCase();
    const ll = item.label.toLowerCase();
    if (ll === ql) return 100;
    if (ll.startsWith(ql)) return 80;
    if (ll.includes(ql)) return 60;
    if (item.sublabel?.toLowerCase().includes(ql)) return 30;
    return 0;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
    tool: <Terminal fontSize="small" />,
    community: <Forum fontSize="small" />,
    blog: <Article fontSize="small" />,
    nav: <ArrowForwardIos fontSize="small" />,
};
const TYPE_LABEL: Record<string, string> = { tool: 'Tool', community: 'Thread', blog: 'Blog', nav: 'Nav' };
const TYPE_COLOR: Record<string, string> = { tool: '#3dfc55', community: '#60a5fa', blog: '#f59e0b', nav: '#94a3b8' };

interface Props { open: boolean; onClose: () => void }

const CommandPalette: React.FC<Props> = ({ open, onClose }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [remoteItems, setRemoteItems] = useState<CmdItem[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (open) { setQuery(''); setActiveIdx(0); setTimeout(() => inputRef.current?.focus(), 60); }
    }, [open]);

    useEffect(() => {
        if (!query || query.length < 2) { setRemoteItems([]); return; }
        const ctrl = new AbortController();
        const t = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/api/community/threads/?search=${encodeURIComponent(query)}&limit=4`, { signal: ctrl.signal });
                const threads: any[] = res.data?.results || res.data || [];
                setRemoteItems(threads.map((th: any) => ({
                    id: `thread-${th.id}`,
                    label: th.title,
                    sublabel: th.category_name || 'Community',
                    path: `/community/thread/${th.slug || th.id}`,
                    type: 'community',
                })));
            } catch {}
        }, 250);
        return () => { clearTimeout(t); ctrl.abort(); };
    }, [query]);

    const results = useMemo<CmdItem[]>(() => {
        if (!query) return [...NAV_ITEMS, ...TOOL_ITEMS.slice(0, 8)];
        const local = [...NAV_ITEMS, ...TOOL_ITEMS]
            .map(item => ({ ...item, score: score(item, query) }))
            .filter(i => i.score! > 0)
            .sort((a, b) => b.score! - a.score!)
            .slice(0, 8);
        return [...local, ...remoteItems].slice(0, 12);
    }, [query, remoteItems]);

    const go = (item: CmdItem) => { navigate(item.path); onClose(); };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && results[activeIdx]) go(results[activeIdx]);
        if (e.key === 'Escape') onClose();
    };

    useEffect(() => {
        const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#0d0e12',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    mt: '10vh',
                    verticalAlign: 'top',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                }
            }}
            sx={{ '& .MuiBackdrop-root': { backdropFilter: 'blur(4px)' } }}
        >
            <TextField
                inputRef={inputRef}
                placeholder="Search tools, threads, pages…"
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                onKeyDown={handleKey}
                fullWidth
                variant="standard"
                InputProps={{
                    startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary', ml: 1 }} /></InputAdornment>,
                    disableUnderline: true,
                    sx: { px: 1, py: 1.5, fontSize: '1.05rem' },
                }}
            />

            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.07)', maxHeight: 420, overflow: 'auto' }}>
                {results.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{ py: 4, fontSize: '0.9rem' }}>No results for "{query}"</Typography>
                ) : (
                    <List ref={listRef} dense disablePadding>
                        {results.map((item, idx) => (
                            <ListItem key={item.id} disablePadding>
                                <ListItemButton
                                    selected={activeIdx === idx}
                                    onClick={() => go(item)}
                                    onMouseEnter={() => setActiveIdx(idx)}
                                    sx={{
                                        py: 1.2, px: 2,
                                        '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 32, color: TYPE_COLOR[item.type] }}>
                                        {TYPE_ICON[item.type]}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={<Typography variant="body2" fontWeight={600}>{item.label}</Typography>}
                                        secondary={item.sublabel && <Typography variant="caption" color="text.secondary" noWrap>{item.sublabel}</Typography>}
                                    />
                                    <Chip label={TYPE_LABEL[item.type]} size="small" sx={{ fontSize: '0.65rem', height: 18, color: TYPE_COLOR[item.type], borderColor: TYPE_COLOR[item.type], ml: 1 }} variant="outlined" />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', px: 2, py: 0.75, display: 'flex', gap: 2 }}>
                {[['↑↓', 'navigate'], ['↵', 'select'], ['Esc', 'close']].map(([key, label]) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label={key} size="small" sx={{ fontSize: '0.65rem', height: 18, fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.06)' }} />
                        <Typography variant="caption" color="text.disabled">{label}</Typography>
                    </Box>
                ))}
            </Box>
        </Dialog>
    );
};

export default CommandPalette;
