import React, { useEffect, useState } from 'react';
import {
    Container, Typography, Box, Grid, Paper, Stack, Chip, Avatar, CircularProgress,
} from '@mui/material';
import { EmojiEvents, Forum, CheckCircle, People, TrendingUp } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useTheme, alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import apiClient from '../api/config';
import Seo from '../components/seo/Seo';

const BADGE_COLORS: Record<string, string> = {
    newcomer: '#22c55e', contributor: '#3b82f6', trusted: '#8b5cf6', expert: '#f59e0b', legend: '#ef4444',
};

const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: alpha(color, 0.06), border: `1px solid ${alpha(color, 0.2)}`, borderRadius: 2 }}>
        <Box sx={{ color, mb: 1 }}>{icon}</Box>
        <Typography variant="h4" fontWeight={800} sx={{ color }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Paper>
);

const CommunityStatsPage: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/api/community/stats/').then(res => setStats(res.data)).catch(() => {}).finally(() => setLoading(false));
    }, []);

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            <Seo title="Community Stats & Leaderboard | ExpectException" description="See top contributors, most voted threads, and community activity on ExpectException." />

            <Box sx={{ mb: 5, textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={900} sx={{ mb: 1 }}>
                    Community <span style={{ color: primary }}>Stats</span>
                </Typography>
                <Typography color="text.secondary">Celebrating our top contributors and most valuable threads</Typography>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : stats ? (
                <>
                    {/* Overview stats */}
                    <Grid container spacing={3} sx={{ mb: 6 }}>
                        {[
                            { label: 'Total Threads', value: stats.total_threads, icon: <Forum />, color: primary },
                            { label: 'Total Replies', value: stats.total_replies, icon: <TrendingUp />, color: '#60a5fa' },
                            { label: 'Solved', value: stats.solved_threads, icon: <CheckCircle />, color: '#22c55e' },
                            { label: 'Members', value: stats.total_members, icon: <People />, color: '#f59e0b' },
                        ].map((s, i) => (
                            <Grid item xs={6} md={3} key={i}>
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                                    <StatCard {...s} />
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>

                    <Grid container spacing={4}>
                        {/* Leaderboard */}
                        <Grid item xs={12} md={7}>
                            <Paper sx={{ p: 3, borderRadius: 2 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                                    <EmojiEvents sx={{ color: '#f59e0b' }} />
                                    <Typography variant="h6" fontWeight={800}>Top Contributors</Typography>
                                </Stack>
                                <Stack spacing={2}>
                                    {stats.leaderboard?.map((u: any, i: number) => (
                                        <Box key={u.email} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 1.5, bgcolor: i < 3 ? alpha(primary, 0.05) : 'transparent', border: i === 0 ? `1px solid ${alpha('#f59e0b', 0.3)}` : '1px solid transparent' }}>
                                            <Typography fontWeight={800} sx={{ width: 24, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'text.disabled', textAlign: 'center' }}>
                                                {i + 1}
                                            </Typography>
                                            <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(primary, 0.15), color: primary, fontSize: '0.95rem', fontWeight: 700 }}>
                                                {u.display.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} noWrap>{u.display}</Typography>
                                                <Typography variant="caption" color="text.secondary">{u.thread_count} threads · {u.reply_count} replies</Typography>
                                            </Box>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end">
                                                {u.badges?.map((b: string) => (
                                                    <Chip key={b} label={b} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(BADGE_COLORS[b] || '#64748b', 0.15), color: BADGE_COLORS[b] || '#64748b', fontWeight: 700 }} />
                                                ))}
                                            </Stack>
                                            {u.reputation > 0 && <Chip label={`${u.reputation} rep`} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha(primary, 0.1), color: primary, fontWeight: 700 }} />}
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>
                        </Grid>

                        {/* Top threads */}
                        <Grid item xs={12} md={5}>
                            <Paper sx={{ p: 3, borderRadius: 2 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                                    <TrendingUp sx={{ color: primary }} />
                                    <Typography variant="h6" fontWeight={800}>Most Voted Threads</Typography>
                                </Stack>
                                <Stack spacing={2}>
                                    {stats.top_threads?.map((t: any, i: number) => (
                                        <Box
                                            key={t.id}
                                            component={Link}
                                            to={`/community/thread/${t.slug || t.id}`}
                                            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, textDecoration: 'none', p: 1, borderRadius: 1, '&:hover': { bgcolor: alpha(primary, 0.05) } }}
                                        >
                                            <Box sx={{ textAlign: 'center', minWidth: 36 }}>
                                                <Typography variant="body2" fontWeight={800} sx={{ color: primary }}>{t.vote_count}</Typography>
                                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>votes</Typography>
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary', lineHeight: 1.3 }}>{t.title}</Typography>
                                                <Typography variant="caption" color="text.secondary">{t.reply_count} replies</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>
                </>
            ) : (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>Failed to load community stats.</Typography>
            )}
        </Container>
    );
};

export default CommunityStatsPage;
