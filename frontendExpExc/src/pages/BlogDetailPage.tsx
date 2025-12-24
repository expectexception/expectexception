import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Chip,
    Avatar,
    Stack,
    CircularProgress,
    Alert,
    Button,
    Card,
    Snackbar,
    IconButton,
} from '@mui/material';
import {
    CalendarToday,
    ThumbUp,
    Comment as CommentIcon,

    ArrowBack,
    Bookmark,
    BookmarkBorder,
    Share,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { Post, Comment } from '../types';
import CommentSection from '../components/blog/CommentSection';
import { useAuth } from '../context/AuthContext';

const BlogDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Interaction state
    const [isLiked, setIsLiked] = useState(false);

    const [likesCount, setLikesCount] = useState(0);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    useEffect(() => {
        if (id) {
            fetchPost(parseInt(id, 10));
        }
    }, [id]);

    const fetchPost = async (postId: number) => {
        try {
            setLoading(true);
            const response = await apiClient.get(endpoints.blog.postDetail(postId));
            setPost(response.data);
            setIsLiked(response.data.liked);

            setLikesCount(response.data.likes_count);
            setIsBookmarked(response.data.bookmarked);
        } catch (err) {
            console.error('Error fetching post:', err);
            setError('Failed to load article.');
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!post) return;

        // Optimistic update
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLikesCount(prev => newStatus ? prev + 1 : prev - 1);

        try {
            if (newStatus) {
                await apiClient.post(endpoints.blog.postLike(post.id));
            } else {
                await apiClient.delete(endpoints.blog.postLike(post.id));
            }
        } catch (err) {
            console.error('Like failed:', err);
            // Revert
            setIsLiked(!newStatus);
            setLikesCount(prev => !newStatus ? prev + 1 : prev - 1);
        }
    };

    const handleBookmark = async () => {
        if (!post) return;
        if (!user) {
            setSnackbar({ open: true, message: 'Please login to bookmark' });
            return;
        }

        const newStatus = !isBookmarked;
        setIsBookmarked(newStatus); // Optimistic

        try {
            if (newStatus) {
                await apiClient.post(endpoints.blog.postBookmark(post.id));
            } else {
                await apiClient.delete(endpoints.blog.postBookmark(post.id));
            }
        } catch (err) {
            console.error('Bookmark failed', err);
            setIsBookmarked(!newStatus);
            setSnackbar({ open: true, message: 'Failed to update bookmark' });
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setSnackbar({ open: true, message: 'Link copied to clipboard!' });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleAddComment = async (content: string, parentId?: number) => {
        if (!post) return;
        try {
            await apiClient.post(endpoints.blog.comments, {
                post: post.id,
                content,
                parent: parentId
            });
            // Refresh post to get updated comments tree
            fetchPost(post.id);
        } catch (err) {
            console.error('Failed to post comment:', err);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !post) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="error">{error || 'Post not found'}</Alert>
                <Button component={Link} to="/blogs" startIcon={<ArrowBack />} sx={{ mt: 2 }}>
                    Back to Blogs
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Helmet>
                <title>{post.seo_title || post.title} | ExpectException</title>
                <meta name="description" content={post.seo_description || post.content.substring(0, 160)} />
                <meta name="keywords" content={post.keywords || post.tags.map(t => t.name).join(', ')} />
            </Helmet>

            <Button component={Link} to="/blogs" startIcon={<ArrowBack />} sx={{ mb: 4 }}>
                Back to Blogs
            </Button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        {post.tags.map((tag) => (
                            <Chip key={tag.id} label={tag.name} color="primary" size="small" />
                        ))}
                    </Stack>
                    <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
                        {post.title}
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={3} sx={{ mt: 3, color: 'text.secondary' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ width: 32, height: 32 }}>
                                {post.author.email.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                                {post.author.email}
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarToday fontSize="small" />
                            <Typography variant="body2">
                                {new Date(post.created_at).toLocaleDateString()}
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>

                {/* Content - HTML rendering */}
                <Card sx={{ p: 4, mb: 4, bgcolor: 'background.paper' }}>
                    <Box
                        sx={{
                            // Basic styling for HTML content
                            '& img': { maxWidth: '100%', height: 'auto', borderRadius: 2, my: 2 },
                            '& h2': { mt: 4, mb: 2, fontWeight: 700 },
                            '& p': { lineHeight: 1.8, fontSize: '1.1rem', mb: 2 },
                            '& ul, & ol': { mb: 2, pl: 4 },
                            '& li': { mb: 1 },
                            '& a': { color: 'primary.main' }
                        }}
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                </Card>

                {/* Interaction */}
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 3 }}>
                    <Stack direction="row" spacing={2}>
                        <Button
                            startIcon={<ThumbUp />}
                            variant={isLiked ? "contained" : "outlined"}
                            onClick={handleLike}
                            color={isLiked ? "primary" : "inherit"}
                        >
                            Like ({likesCount})
                        </Button>
                        <Button startIcon={<CommentIcon />} variant="text">
                            Comments ({post.comments?.length || 0})
                        </Button>

                        <IconButton onClick={handleBookmark} color={isBookmarked ? "primary" : "default"}>
                            {isBookmarked ? <Bookmark /> : <BookmarkBorder />}
                        </IconButton>
                        <IconButton onClick={handleShare}>
                            <Share />
                        </IconButton>
                    </Stack>
                </Box>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000}
                    onClose={handleCloseSnackbar}
                    message={snackbar.message}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                />

                {/* Comments Section */}
                <Box sx={{ mt: 4 }}>
                    <CommentSection
                        comments={post.comments?.filter((c: any) => !c.parent) || []}
                        postId={post.id}
                        onAddComment={handleAddComment}
                    />
                </Box>
            </motion.div>
        </Container>
    );
};

export default BlogDetailPage;
