import React, { useState } from 'react';
import {
    Box,
    Typography,
    Avatar,
    TextField,
    Button,
    Stack,
    Divider,
    Paper
} from '@mui/material';
import { Reply } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Comment } from '../../types';



interface CommentSectionProps {
    comments: Comment[];
    postId: number;
    onAddComment: (content: string, parentId?: number) => Promise<void>;
}

const CommentItem: React.FC<{
    comment: Comment;
    postId: number;
    onReply: (content: string, parentId: number) => Promise<void>;
}> = ({ comment, postId, onReply }) => {
    const { user } = useAuth();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitReply = async () => {
        if (!replyContent.trim()) return;
        setSubmitting(true);
        await onReply(replyContent, comment.id);
        setSubmitting(false);
        setReplyContent('');
        setShowReplyForm(false);
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2}>
                <Avatar src={comment.author.profile_image} alt={comment.author.username}>
                    {comment.author.username?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                    <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }} elevation={0}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight="bold">
                                {comment.author.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date(comment.created_at).toLocaleDateString()}
                            </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            {comment.content}
                        </Typography>
                    </Paper>

                    <Box sx={{ mt: 1 }}>
                        <Button
                            size="small"
                            startIcon={<Reply />}
                            onClick={() => setShowReplyForm(!showReplyForm)}
                            sx={{ color: 'text.secondary' }}
                        >
                            Reply
                        </Button>

                        {showReplyForm && (
                            <Box sx={{ mt: 2, ml: 2 }}>
                                {user ? (
                                    <>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Write a reply..."
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            multiline
                                            rows={2}
                                        />
                                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                            <Button size="small" onClick={() => setShowReplyForm(false)}>Cancel</Button>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                disabled={!replyContent.trim() || submitting}
                                                onClick={handleSubmitReply}
                                            >
                                                {submitting ? 'Posting...' : 'Post Reply'}
                                            </Button>
                                        </Box>
                                    </>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Please <Link to="/login">login</Link> to reply.
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <Box sx={{ ml: 4, mt: 2, borderLeft: '2px solid', borderColor: 'divider', pl: 2 }}>
                            {comment.replies.map((reply) => (
                                <CommentItem key={reply.id} comment={reply} postId={postId} onReply={onReply} />
                            ))}
                        </Box>
                    )}
                </Box>
            </Stack>
        </Box>
    );
};

const CommentSection: React.FC<CommentSectionProps> = ({ comments, postId, onAddComment }) => {
    const { user } = useAuth();
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        setSubmitting(true);
        await onAddComment(newComment);
        setSubmitting(false);
        setNewComment('');
    };

    return (
        <Box sx={{ mt: 6 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                Comments ({comments.length})
            </Typography>
            <Divider sx={{ mb: 4 }} />

            {/* New Comment Form */}
            <Box sx={{ mb: 6 }}>
                {user ? (
                    <Stack direction="row" spacing={2}>
                        <Avatar src={user.profile_image} alt={user.username}>
                            {user.username?.[0]?.toUpperCase()}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <TextField
                                fullWidth
                                placeholder="Shared your thoughts..."
                                multiline
                                rows={3}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                variant="contained"
                                disabled={!newComment.trim() || submitting}
                                onClick={handleSubmit}
                            >
                                {submitting ? 'Posting...' : 'Post Comment'}
                            </Button>
                        </Box>
                    </Stack>
                ) : (
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover' }}>
                        <Typography gutterBottom>
                            Join the discussion
                        </Typography>
                        <Button variant="outlined" component={Link} to="/login">
                            Log in to comment
                        </Button>
                    </Paper>
                )}
            </Box>

            {/* Comment List */}
            <Box>
                {comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} postId={postId} onReply={onAddComment} />
                ))}
                {comments.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No comments yet. Be the first to start the conversation!
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default CommentSection;
