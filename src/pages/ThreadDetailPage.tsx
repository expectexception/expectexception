import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Container, Typography, Button, Card, CardContent, TextField,
    Chip, Stack, Avatar, Divider, Alert, CircularProgress, Tooltip,
    IconButton, Paper, Grid,
} from '@mui/material';
import {
    ThumbUp, ThumbDown, CheckCircle, Send, ArrowBack, PushPin,
    Lock, ChatBubble, Visibility, AccessTime, Person,
    BookmarkBorder, Bookmark,
} from '@mui/icons-material';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import MarkdownRenderer from '../components/community/MarkdownRenderer';
import { CheckBadgeSvg, LockBadgeSvg, OpenDotBadgeSvg } from '../components/layout/AnimatedSvgs';

interface Author { id: number; email: string; first_name: string; last_name: string }
interface Reply {
    id: number; thread: number; author: Author; body: string; parent: number | null;
    is_accepted_answer: boolean; vote_count: number; created_at: string;
    children: Reply[]; user_vote: number | null;
}
interface Thread {
    id: number; title: string; slug: string; body: string; author: Author;
    category: { name: string; color: string } | null; tags: string;
    is_pinned: boolean; is_closed: boolean; is_solved: boolean;
    view_count: number; vote_count: number; reply_count: number;
    created_at: string; user_vote: number | null; replies: Reply[];
}

const authorName = (author: Author) => {
    if (author.first_name) return `${author.first_name} ${author.last_name}`.trim();
    return author.email.split('@')[0];
};

const authorInitial = (author: Author) => {
    if (author.first_name) return author.first_name[0].toUpperCase();
    return author.email[0].toUpperCase();
};

const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const VoteButtons: React.FC<{
    count: number; userVote: number | null;
    onVote: (v: 1 | -1) => void; vertical?: boolean;
}> = ({ count, userVote, onVote, vertical = true }) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    return (
        <Box sx={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Upvote">
                <IconButton size="small" onClick={() => onVote(1)} sx={{ color: userVote === 1 ? primary : 'text.disabled', '&:hover': { color: primary } }}>
                    <ThumbUp fontSize="small" />
                </IconButton>
            </Tooltip>
            <Typography variant="body2" fontWeight="700" color={count > 0 ? primary : count < 0 ? 'error.main' : 'text.secondary'}>
                {count}
            </Typography>
            <Tooltip title="Downvote">
                <IconButton size="small" onClick={() => onVote(-1)} sx={{ color: userVote === -1 ? 'error.main' : 'text.disabled', '&:hover': { color: 'error.main' } }}>
                    <ThumbDown fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

const ReplyCard: React.FC<{
    reply: Reply; thread: Thread; isOwner: boolean;
    onVote: (id: number, v: 1 | -1) => void;
    onAccept: (id: number) => void;
    depth?: number;
}> = ({ reply, thread, isOwner, onVote, onAccept, depth = 0 }) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [replying, setReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const { isAuthenticated } = useAuth();

    const handleNestedReply = async () => {
        if (!replyText.trim()) return;
        try {
            await apiClient.post(endpoints.community.replies, { thread: thread.id, body: replyText, parent: reply.id });
            setReplyText('');
            setReplying(false);
            window.location.reload();
        } catch { }
    };

    return (
        <Box sx={{ ml: depth > 0 ? 4 : 0, mt: 1.5 }}>
            <Card sx={{
                border: `1px solid ${reply.is_accepted_answer ? alpha(primary, 0.35) : alpha('#fff', 0.05)}`,
                bgcolor: reply.is_accepted_answer ? alpha(primary, 0.04) : 'transparent',
                boxShadow: reply.is_accepted_answer ? `0 0 16px ${alpha(primary, 0.12)}` : 'none',
                transform: 'none',
                '&:hover': { transform: 'none', borderColor: alpha('#fff', 0.1) },
            }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, minWidth: 40 }}>
                            <VoteButtons
                                count={reply.vote_count}
                                userVote={reply.user_vote}
                                onVote={(v) => onVote(reply.id, v)}
                            />
                            {isOwner && (
                                <Tooltip title={reply.is_accepted_answer ? 'Unmark answer' : 'Mark as accepted'}>
                                    <IconButton
                                        size="small"
                                        onClick={() => onAccept(reply.id)}
                                        sx={{ color: reply.is_accepted_answer ? primary : 'text.disabled', mt: 0.5 }}
                                    >
                                        <CheckCircle fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            {reply.is_accepted_answer && (
                                <Chip
                                    label="Accepted Answer"
                                    size="small"
                                    icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
                                    sx={{ mb: 1.5, bgcolor: alpha(primary, 0.12), color: primary, fontWeight: 700, border: `1px solid ${alpha(primary, 0.3)}` }}
                                />
                            )}
                            <MarkdownRenderer content={reply.body} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
                                <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: alpha(primary, 0.2), color: primary }}>
                                    {authorInitial(reply.author)}
                                </Avatar>
                                <Typography variant="caption" color="text.secondary">
                                    <b>{authorName(reply.author)}</b>{' · '}{timeAgo(reply.created_at)}
                                </Typography>
                                {isAuthenticated && !thread.is_closed && depth < 2 && (
                                    <Button size="small" onClick={() => setReplying(!replying)} sx={{ ml: 'auto', fontSize: '0.72rem', color: 'text.secondary' }}>
                                        Reply
                                    </Button>
                                )}
                            </Box>
                            {replying && (
                                <Box sx={{ mt: 2 }}>
                                    <TextField
                                        fullWidth multiline rows={3} size="small"
                                        placeholder="Write your reply..."
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        sx={{ mb: 1 }}
                                    />
                                    <Stack direction="row" spacing={1}>
                                        <Button size="small" variant="contained" onClick={handleNestedReply}>Post</Button>
                                        <Button size="small" variant="text" onClick={() => setReplying(false)}>Cancel</Button>
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </CardContent>
            </Card>
            {reply.children?.map(child => (
                <ReplyCard key={child.id} reply={child} thread={thread} isOwner={isOwner} onVote={onVote} onAccept={onAccept} depth={depth + 1} />
            ))}
        </Box>
    );
};

const ThreadDetailPage: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const { id } = useParams<{ id: string; slug: string }>();
    const { isAuthenticated, user, token } = useAuth();

    const [thread, setThread] = useState<Thread | null>(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);

    const fetchThread = useCallback(async () => {
        if (!id) return;
        try {
            const res = await apiClient.get(endpoints.community.threadDetail(Number(id)));
            setThread(res.data);
        } catch {
            setThread(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchThread(); }, [fetchThread]);

    const handleVoteThread = async (value: 1 | -1) => {
        if (!thread || !isAuthenticated) return;
        const res = await apiClient.post(endpoints.community.threadVote(thread.id), { value }).catch(() => null);
        if (res) setThread(prev => prev ? { ...prev, vote_count: res.data.vote_count, user_vote: res.data.user_vote } : prev);
    };

    const handleVoteReply = async (replyId: number, value: 1 | -1) => {
        if (!isAuthenticated) return;
        const res = await apiClient.post(endpoints.community.replyVote(replyId), { value }).catch(() => null);
        if (res && thread) {
            const updateVote = (replies: Reply[]): Reply[] =>
                replies.map(r => r.id === replyId
                    ? { ...r, vote_count: res.data.vote_count, user_vote: res.data.user_vote }
                    : { ...r, children: updateVote(r.children || []) }
                );
            setThread(prev => prev ? { ...prev, replies: updateVote(prev.replies) } : prev);
        }
    };

    const handleAcceptReply = async (replyId: number) => {
        if (!isAuthenticated || !thread) return;
        const res = await apiClient.post(endpoints.community.replyAccept(replyId)).catch(() => null);
        if (res && thread) {
            const updateAccept = (replies: Reply[]): Reply[] =>
                replies.map(r => ({
                    ...r,
                    is_accepted_answer: r.id === replyId ? res.data.is_accepted_answer : false,
                    children: updateAccept(r.children || []),
                }));
            setThread(prev => prev ? { ...prev, replies: updateAccept(prev.replies), is_solved: res.data.is_accepted_answer || prev.is_solved } : prev);
        }
    };

    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !thread) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiClient.post(endpoints.community.replies, { thread: thread.id, body: replyText });
            setReplyText('');
            fetchThread();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to post reply.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress />
        </Box>
    );
    if (!thread) return (
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="h5" color="text.secondary">Thread not found.</Typography>
            <Button component={Link} to="/community" startIcon={<ArrowBack />} sx={{ mt: 2 }}>Back to Community</Button>
        </Container>
    );

    const isOwner = isAuthenticated && user?.email === thread.author.email;
    const tagList = thread.tags ? thread.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
            <Button component={Link} to="/community" startIcon={<ArrowBack />} variant="text" sx={{ mb: 3, color: 'text.secondary' }}>
                Back to Community
            </Button>

            <Grid container spacing={3}>
                {/* Main */}
                <Grid item xs={12} md={9}>
                    {/* Thread header */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        <Paper sx={{ p: 3.5, mb: 3, border: `1px solid ${alpha(primary, 0.1)}` }}>
                            <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
                                <VoteButtons count={thread.vote_count} userVote={thread.user_vote} onVote={handleVoteThread} />
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                                        {thread.is_pinned && <PushPin sx={{ fontSize: 16, color: '#f59e0b' }} />}
                                        {thread.is_closed && <Chip label="Closed" size="small" sx={{ bgcolor: alpha('#fff', 0.06), color: 'text.disabled' }} />}
                                        {thread.is_solved && <Chip label="Solved" size="small" icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} sx={{ bgcolor: alpha(primary, 0.12), color: primary, fontWeight: 700 }} />}
                                        {thread.category && (
                                            <Chip label={thread.category.name} size="small" sx={{ bgcolor: alpha(thread.category.color, 0.12), color: thread.category.color, border: `1px solid ${alpha(thread.category.color, 0.25)}` }} />
                                        )}
                                    </Box>
                                    <Typography variant="h4" fontWeight="800" sx={{ mb: 2, lineHeight: 1.3 }}>
                                        {thread.title}
                                    </Typography>
                                    <Box sx={{ mb: 3 }}>
                                        <MarkdownRenderer content={thread.body} />
                                    </Box>
                                    {tagList.length > 0 && (
                                        <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                                            {tagList.map(tag => <Chip key={tag} label={tag} size="small" sx={{ bgcolor: alpha('#fff', 0.04), color: 'text.secondary' }} />)}
                                        </Stack>
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: alpha(primary, 0.2), color: primary }}>
                                                {authorInitial(thread.author)}
                                            </Avatar>
                                            <Typography variant="body2" fontWeight="600">{authorName(thread.author)}</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.disabled">
                                            <AccessTime sx={{ fontSize: 12, mr: 0.4, verticalAlign: 'middle' }} />
                                            {timeAgo(thread.created_at)}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">
                                            <Visibility sx={{ fontSize: 12, mr: 0.4, verticalAlign: 'middle' }} />
                                            {thread.view_count} views
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">
                                            <ChatBubble sx={{ fontSize: 12, mr: 0.4, verticalAlign: 'middle' }} />
                                            {thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}
                                        </Typography>
                                        {token && (
                                            <Tooltip title={isBookmarked ? 'Remove bookmark' : 'Bookmark thread'}>
                                                <IconButton size="small" onClick={async () => {
                                                    try {
                                                        await apiClient.post(endpoints.community.bookmarkToggle(thread.id));
                                                        setIsBookmarked(b => !b);
                                                    } catch {}
                                                }} sx={{ color: isBookmarked ? 'warning.main' : 'text.disabled', ml: 'auto' }}>
                                                    {isBookmarked ? <Bookmark fontSize="small" /> : <BookmarkBorder fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>
                    </motion.div>

                    {/* Replies */}
                    <Typography variant="h6" fontWeight="700" sx={{ mb: 2 }}>
                        {thread.reply_count} {thread.reply_count === 1 ? 'Reply' : 'Replies'}
                    </Typography>

                    {thread.replies.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <ChatBubble sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">No replies yet</Typography>
                            <Typography variant="body2" color="text.disabled">Be the first to answer this question!</Typography>
                        </Box>
                    ) : (
                        thread.replies.map(reply => (
                            <ReplyCard
                                key={reply.id}
                                reply={reply}
                                thread={thread}
                                isOwner={isOwner}
                                onVote={handleVoteReply}
                                onAccept={handleAcceptReply}
                            />
                        ))
                    )}

                    {/* Reply form */}
                    {isAuthenticated && !thread.is_closed ? (
                        <Box sx={{ mt: 4 }}>
                            <Divider sx={{ mb: 3 }} />
                            <Typography variant="h6" fontWeight="700" sx={{ mb: 2 }}>Your Answer</Typography>
                            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                            <Box component="form" onSubmit={handleSubmitReply}>
                                <TextField
                                    fullWidth multiline rows={8}
                                    placeholder="Write your answer here. Be specific and detailed..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    sx={{ mb: 2 }}
                                    disabled={submitting}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={submitting || !replyText.trim()}
                                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Send />}
                                    sx={{ borderRadius: 2 }}
                                >
                                    {submitting ? 'Posting...' : 'Post Answer'}
                                </Button>
                            </Box>
                        </Box>
                    ) : !isAuthenticated ? (
                        <Box sx={{ mt: 4, textAlign: 'center', p: 4, bgcolor: alpha('#fff', 0.02), borderRadius: 2, border: `1px solid ${alpha('#fff', 0.06)}` }}>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>Sign in to post an answer</Typography>
                            <Button component={Link} to="/login" variant="contained">Sign In</Button>
                        </Box>
                    ) : (
                        <Box sx={{ mt: 3, p: 2.5, bgcolor: alpha('#fff', 0.02), borderRadius: 2, border: `1px solid ${alpha('#fff', 0.06)}` }}>
                            <Typography variant="body2" color="text.disabled"><Lock sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />This thread is closed.</Typography>
                        </Box>
                    )}
                </Grid>

                {/* Sidebar */}
                <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                        <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                            Thread Info
                        </Typography>
                        <Stack spacing={1.5}>
                            {[
                                { label: 'Asked by', value: authorName(thread.author) },
                                { label: 'Views', value: thread.view_count },
                                { label: 'Votes', value: thread.vote_count },
                                { label: 'Replies', value: thread.reply_count },
                                {
                                    label: 'Status',
                                    value: thread.is_solved ? 'Solved' : thread.is_closed ? 'Closed' : 'Open',
                                    icon: thread.is_solved ? <CheckBadgeSvg /> : thread.is_closed ? <LockBadgeSvg /> : <OpenDotBadgeSvg />,
                                },
                            ].map(item => (
                                <Box key={item.label}>
                                    <Typography variant="caption" color="text.disabled">{item.label}</Typography>
                                    <Typography variant="body2" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        {item.icon}{item.value}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default ThreadDetailPage;
