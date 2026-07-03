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
    Grid,
    useMediaQuery,
    useTheme,
    alpha,
} from '@mui/material';
import {
    CalendarToday,
    ThumbUp,
    Comment as CommentIcon,
    ArrowBack,
    Bookmark,
    BookmarkBorder,
    AccessTime,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { Post, Comment } from '../types';
import CommentSection from '../components/blog/CommentSection';
import TableOfContents from '../components/blog/TableOfContents';
import CodeBlock from '../components/blog/CodeBlock';
import ShareButtons from '../components/blog/ShareButtons';
import ReadingProgressBar from '../components/blog/ReadingProgressBar';
import { useAuth } from '../context/AuthContext';
import Seo from '../components/seo/Seo';

const BlogDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Interaction state
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    // Calculate reading time from content
    const calculateReadingTime = (content: string): number => {
        const wordsPerMinute = 200;
        const text = content.replace(/<[^>]*>/g, ''); // Strip HTML tags
        const words = text.split(/\s+/).length;
        return Math.ceil(words / wordsPerMinute);
    };

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

    // Enhanced content renderer with code highlighting
    const renderEnhancedContent = (htmlContent: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Find all code blocks
        const codeBlocks = doc.querySelectorAll('pre code');
        const codeBlocksData: { index: number; code: string; language: string }[] = [];

        codeBlocks.forEach((block, index) => {
            const code = block.textContent || '';
            const className = block.className || '';
            const languageMatch = className.match(/language-(\w+)/);
            const language = languageMatch ? languageMatch[1] : 'text';

            codeBlocksData.push({ index, code, language });

            // Replace with placeholder
            const pre = block.parentElement;
            if (pre) {
                pre.setAttribute('data-code-block', index.toString());
            }
        });

        return (
            <Box
                sx={{
                    // Enhanced typography styles
                    '& img': {
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: 2,
                        my: 3,
                        boxShadow: 2,
                    },
                    '& h2': {
                        mt: 5,
                        mb: 2.5,
                        fontWeight: 700,
                        fontSize: { xs: '1.5rem', md: '2rem' },
                        color: 'text.primary',
                        scrollMarginTop: '100px', // For smooth scroll offset
                    },
                    '& h3': {
                        mt: 4,
                        mb: 2,
                        fontWeight: 600,
                        fontSize: { xs: '1.25rem', md: '1.5rem' },
                        color: 'text.primary',
                        scrollMarginTop: '100px',
                    },
                    '& p': {
                        lineHeight: 1.8,
                        fontSize: { xs: '1rem', md: '1.1rem' },
                        mb: 2.5,
                        color: 'text.primary',
                    },
                    '& ul, & ol': {
                        mb: 3,
                        pl: { xs: 3, md: 4 },
                        '& li': {
                            mb: 1.5,
                            lineHeight: 1.8,
                        },
                    },
                    '& a': {
                        color: 'primary.main',
                        fontWeight: 500,
                        textDecoration: 'none',
                        '&:hover': {
                            textDecoration: 'underline',
                        },
                    },
                    '& blockquote': {
                        borderLeft: '4px solid',
                        borderColor: 'primary.main',
                        pl: 3,
                        py: 1,
                        my: 3,
                        fontStyle: 'italic',
                        color: 'text.secondary',
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                    },
                    '& pre[data-code-block]': {
                        display: 'none', // Hide original pre tags
                    },
                    '& code:not(pre code)': {
                        bgcolor: 'action.hover',
                        color: 'error.main',
                        px: 1,
                        py: 0.5,
                        borderRadius: 0.5,
                        fontSize: '0.9em',
                        fontFamily: 'monospace',
                    },
                }}
            >
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(doc.body.innerHTML) }} />
                {/* Render code blocks with syntax highlighting */}
                {codeBlocksData.map((data) => (
                    <CodeBlock
                        key={data.index}
                        code={data.code}
                        language={data.language}
                        showLineNumbers={true}
                    />
                ))}
            </Box>
        );
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
            <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
                <Alert severity="error">{error || 'Post not found'}</Alert>
                <Button component={Link} to="/blogs" startIcon={<ArrowBack />} sx={{ mt: 2 }}>
                    Back to Blogs
                </Button>
            </Container>
        );
    }

    const readingTime = calculateReadingTime(post.content);

    return (
        <>
            <ReadingProgressBar />
            <Container maxWidth="xl" sx={{ py: { xs: 3, md: 6 } }}>
                <Seo
                    title={post.seo_title || post.title}
                    description={post.seo_description || post.content.replace(/<[^>]*>/g, '').substring(0, 160)}
                    keywords={post.keywords ? post.keywords.split(',').map((k: string) => k.trim()) : post.tags.map((t: any) => t.name)}
                    type="article"
                    date={post.created_at}
                    author={post.author?.email || 'ExpectException'}
                    image={post.cover_image || undefined}
                    structuredData={{
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: post.seo_title || post.title,
                        description: post.seo_description || post.content.replace(/<[^>]*>/g, '').substring(0, 160),
                        author: { '@type': 'Person', name: post.author?.email || 'ExpectException' },
                        datePublished: post.created_at,
                        dateModified: (post as any).updated_at || post.created_at,
                        publisher: { '@type': 'Organization', name: 'ExpectException', logo: 'https://expectexception.com/logo512.png' },
                        image: post.cover_image || 'https://expectexception.com/logo512.png',
                        keywords: post.tags.map((t: any) => t.name).join(', '),
                    }}
                />

                <Button 
                    component={Link} 
                    to="/blogs" 
                    startIcon={<ArrowBack />} 
                    variant="outlined"
                    sx={{ 
                        mb: { xs: 3, md: 5 },
                        borderRadius: '10px',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        color: 'grey.300',
                        '&:hover': {
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                        }
                    }}
                >
                    Back to Blogs
                </Button>

                <Grid container spacing={{ xs: 0, md: 4 }}>
                    {/* Main Content Column */}
                    <Grid item xs={12} md={8}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            {/* Header */}
                            <Box sx={{ mb: { xs: 3, md: 4 } }}>
                                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                                    {post.tags.map((tag) => (
                                        <Chip 
                                            key={tag.id} 
                                            label={tag.name} 
                                            size="small" 
                                            sx={{
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                color: theme.palette.primary.main,
                                                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                                fontWeight: 600,
                                            }}
                                        />
                                    ))}
                                </Stack>
                                <Typography
                                    variant="h3"
                                    component="h1"
                                    gutterBottom
                                    sx={{
                                        fontWeight: 900,
                                        fontSize: { xs: '2.25rem', sm: '2.75rem', md: '3.25rem' },
                                        lineHeight: 1.25,
                                        letterSpacing: '-0.02em',
                                        background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    {post.title}
                                </Typography>

                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    spacing={{ xs: 1, sm: 3 }}
                                    sx={{ mt: 3, color: 'text.secondary' }}
                                >
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
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <AccessTime fontSize="small" />
                                        <Typography variant="body2">
                                            {readingTime} min read
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Box>

                            {/* Content with Enhanced Rendering */}
                            <Card sx={{ p: { xs: 2, sm: 3, md: 4 }, mb: { xs: 3, md: 4 }, bgcolor: 'background.paper' }}>
                                {renderEnhancedContent(post.content)}
                            </Card>

                            {/* Interaction Buttons */}
                            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 3, mb: 4 }}>
                                <Stack direction="row" spacing={2} flexWrap="wrap">
                                    <Button
                                        startIcon={<ThumbUp />}
                                        variant={isLiked ? "contained" : "outlined"}
                                        onClick={handleLike}
                                        sx={{ 
                                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                            borderRadius: '10px',
                                            bgcolor: isLiked ? theme.palette.primary.main : 'transparent',
                                            color: isLiked ? '#000000' : 'white',
                                            borderColor: isLiked ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                                            fontWeight: 700,
                                            '&:hover': {
                                                bgcolor: isLiked ? alpha(theme.palette.primary.main, 0.8) : 'rgba(255,255,255,0.05)',
                                                borderColor: isLiked ? 'transparent' : theme.palette.primary.main,
                                                color: isLiked ? '#000000' : theme.palette.primary.main,
                                            }
                                        }}
                                    >
                                        Like ({likesCount})
                                    </Button>
                                    <Button
                                        startIcon={<CommentIcon />}
                                        variant="text"
                                        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                                    >
                                        Comments ({post.comments?.length || 0})
                                    </Button>

                                    <IconButton onClick={handleBookmark} color={isBookmarked ? "primary" : "default"}>
                                        {isBookmarked ? <Bookmark /> : <BookmarkBorder />}
                                    </IconButton>
                                    <ShareButtons
                                        title={post.title}
                                        description={post.seo_description || post.content.substring(0, 160)}
                                    />
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
                    </Grid>

                    {/* Table of Contents Sidebar - Desktop */}
                    {!isMobile && (
                        <Grid item md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
                            <TableOfContents content={post.content} />
                        </Grid>
                    )}
                </Grid>

                {/* Mobile TOC Drawer */}
                {isMobile && (
                    <TableOfContents content={post.content} />
                )}
            </Container>
        </>
    );
};

export default BlogDetailPage;
