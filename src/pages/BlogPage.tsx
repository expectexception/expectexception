import React, { useState, useEffect } from 'react';
import Seo from '../components/seo/Seo';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    TextField,
    InputAdornment,
    Chip,
    Stack,
    Pagination,
    Avatar,
    IconButton,
    CircularProgress,
    Alert,
    ToggleButtonGroup,
    ToggleButton,
    Snackbar,
} from '@mui/material';
import {
    Search,
    Bookmark,
    BookmarkBorder,
    Share,
    ThumbUp,
    Add,
    ThumbUpOutlined,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { User } from '../types';
import { isReactSnap } from '../utils/isReactSnap';
import { excerptFromHtml, stripHtmlToText } from '../utils/text';
import { useTheme, alpha } from '@mui/material/styles';

interface Tag {
    id: number;
    name: string;
}

interface Post {
    id: number;
    title: string;
    slug: string;
    content: string;
    author: User;
    tags: Tag[];
    created_at: string;
    likes_count: number;
    bookmarked: boolean;
    liked: boolean;
}

const BorderBeam: React.FC<{ activeColor?: string }> = ({ activeColor }) => {
  const theme = useTheme();
  const color = activeColor || theme.palette.primary.main;
  
  return (
    <Box
      className="border-beam-overlay"
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        border: '1.5px solid transparent',
        background: `linear-gradient(90deg, ${color}, ${theme.palette.secondary.main}) border-box`,
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        opacity: 0,
        pointerEvents: 'none',
        transition: 'opacity 0.4s ease',
        zIndex: 10,
        backgroundSize: '200% 200%',
        '@keyframes rotateGradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        animation: 'rotateGradient 4s linear infinite',
      }}
    />
  );
};

const BlogPage: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('latest');
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;

    useEffect(() => {
        if (isReactSnap()) {
            setLoading(false);
            return;
        }
        fetchPosts();
    }, [page]);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(endpoints.blog.posts);
            const data = Array.isArray(response.data) ? response.data : response.data.results || [];
            setPosts(data);
        } catch (err) {
            if (!isReactSnap()) {
                console.error('Error fetching posts:', err);
            }
            setError('Failed to load blog posts. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const getExcerpt = (content: string) => excerptFromHtml(content, 140);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleBookmark = async (post: Post) => {
        if (!user) {
            setSnackbar({ open: true, message: 'Please login to bookmark' });
            return;
        }

        const updatedPosts = posts.map(p =>
            p.id === post.id ? { ...p, bookmarked: !p.bookmarked } : p
        );
        setPosts(updatedPosts);

        try {
            if (!post.bookmarked) {
                await apiClient.post(endpoints.blog.postBookmark(post.id));
            } else {
                await apiClient.delete(endpoints.blog.postBookmark(post.id));
            }
        } catch (err) {
            console.error('Bookmark failed', err);
            setPosts(posts);
            setSnackbar({ open: true, message: 'Failed to update bookmark' });
        }
    };

    const handleLike = async (post: Post) => {
        if (!user) {
            setSnackbar({ open: true, message: 'Please login to like posts' });
            return;
        }

        const updatedPosts = posts.map(p =>
            p.id === post.id ? { 
                ...p, 
                liked: !p.liked,
                likes_count: p.liked ? p.likes_count - 1 : p.likes_count + 1 
            } : p
        );
        setPosts(updatedPosts);

        try {
            if (!post.liked) {
                await apiClient.post(endpoints.blog.postLike(post.id));
            } else {
                await apiClient.delete(endpoints.blog.postLike(post.id));
            }
        } catch (err) {
            console.error('Like failed', err);
            setPosts(posts);
            setSnackbar({ open: true, message: 'Failed to update like status' });
        }
    };

    const handleShare = (post: Post) => {
        const url = `${window.location.origin}/blogs/${post.id}`;
        navigator.clipboard.writeText(url);
        setSnackbar({ open: true, message: 'Link copied to clipboard!' });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const filteredPosts = posts
        .filter(post => {
            const q = search.toLowerCase();
            return (
                post.title.toLowerCase().includes(q) ||
                stripHtmlToText(post.content).toLowerCase().includes(q)
            );
        })
        .sort((a, b) => {
            if (filter === 'popular') {
                return b.likes_count - a.likes_count;
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
            <Seo
                title="Developer Blog & Tech Insights - ExpectException"
                description="Read our latest articles on software development, AI, web performance, and developer productivity tools."
                keywords={['developer blog', 'tech news', 'programming tutorials', 'ai insights', 'web development tips', 'software engineering blog', 'coding best practices', 'ai technology updates', 'productivity tool reviews']}
            />
            {/* Header */}
            <Box sx={{ mb: { xs: 4, sm: 6, md: 8 }, textAlign: 'center' }}>
                <Typography
                    variant="h2"
                    gutterBottom
                    sx={{
                        fontWeight: 900,
                        fontSize: { xs: '2.25rem', sm: '3rem', md: '4rem' },
                        background: `linear-gradient(45deg, ${primaryColor}, ${theme.palette.secondary.main})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em',
                    }}
                >
                    Technical Insights
                </Typography>
                <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{
                        maxWidth: 700,
                        mx: 'auto',
                        fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                        px: { xs: 2, sm: 0 },
                        fontWeight: 400,
                        lineHeight: 1.6,
                    }}
                >
                    Tutorials, engineering deep-dives, and product updates from the ExpectException team.
                </Typography>
                {user?.is_staff && (
                    <Button
                        component={Link}
                        to="/admin/create-blog"
                        variant="contained"
                        startIcon={<Add />}
                        sx={{ mt: 4, px: 4, borderRadius: '30px', fontWeight: 750 }}
                    >
                        New Post
                    </Button>
                )}
            </Box>

            {/* Search and Filters */}
            <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 4, md: 8 } }} alignItems="center">
                <Grid item xs={12} md={8}>
                    <TextField
                        fullWidth
                        placeholder="Search articles..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search sx={{ color: 'grey.500' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                bgcolor: 'rgba(13, 14, 18, 0.4)',
                                backdropFilter: 'blur(10px)',
                                '&:hover fieldset': {
                                    borderColor: alpha(primaryColor, 0.3),
                                },
                            }
                        }}
                        size="medium"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent={{ xs: 'center', md: 'flex-end' }}
                        spacing={2}
                        sx={{ height: '100%' }}
                    >
                        <ToggleButtonGroup
                            value={filter}
                            exclusive
                            onChange={(_, value) => value && setFilter(value)}
                            size="medium"
                            sx={{
                                bgcolor: 'rgba(13, 14, 18, 0.4)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                p: '3px',
                                width: { xs: '100%', sm: 'auto' },
                                '& .MuiToggleButtonGroup-grouped': {
                                    border: 0,
                                    borderRadius: '8px',
                                    mx: '2px',
                                    color: 'grey.400',
                                    px: 3,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    '&.Mui-selected': {
                                        bgcolor: alpha(primaryColor, 0.15),
                                        color: primaryColor,
                                        '&:hover': {
                                            bgcolor: alpha(primaryColor, 0.2),
                                        }
                                    },
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                                        color: '#ffffff',
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="latest" sx={{ flex: { xs: 1, sm: 'initial' } }}>Latest</ToggleButton>
                            <ToggleButton value="popular" sx={{ flex: { xs: 1, sm: 'initial' } }}>Popular</ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                </Grid>
            </Grid>

            {/* Content */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 15 }}>
                    <CircularProgress color="primary" />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>
            ) : filteredPosts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 15, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '20px' }}>
                    <Typography variant="h6" color="text.secondary">
                        No articles found matching your search.
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={{ xs: 3, sm: 3, md: 4 }}>
                    {filteredPosts.map((post, index) => (
                        <Grid item xs={12} sm={6} md={4} key={post.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                style={{ height: '100%' }}
                            >
                                <Card 
                                    sx={{ 
                                        height: '100%', 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.6) 0%, rgba(13, 14, 18, 0.3) 100%)',
                                        '&:hover .border-beam-overlay': { opacity: 1 }
                                    }}
                                >
                                    <BorderBeam />
                                    <CardContent sx={{ flexGrow: 1, p: 3.5, display: 'flex', flexDirection: 'column' }}>
                                        <Box sx={{ mb: 2.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {post.tags.map(tag => (
                                                <Chip
                                                    key={tag.id}
                                                    label={tag.name}
                                                    size="small"
                                                    sx={{ 
                                                        bgcolor: alpha(primaryColor, 0.08), 
                                                        color: primaryColor, 
                                                        border: `1px solid ${alpha(primaryColor, 0.15)}`,
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem'
                                                    }}
                                                />
                                            ))}
                                        </Box>

                                        <Typography
                                            variant="h4"
                                            component={Link}
                                            to={`/blogs/${post.id}`}
                                            sx={{
                                                textDecoration: 'none',
                                                color: '#ffffff',
                                                fontWeight: 850,
                                                fontSize: '1.35rem',
                                                lineHeight: 1.4,
                                                display: 'block',
                                                mb: 2,
                                                transition: 'color 0.2s',
                                                '&:hover': { color: primaryColor }
                                            }}
                                        >
                                            {post.title}
                                        </Typography>

                                        <Typography 
                                            variant="body2" 
                                            color="text.secondary" 
                                            sx={{ 
                                                lineHeight: 1.6, 
                                                mb: 4,
                                                display: '-webkit-box',
                                                overflow: 'hidden',
                                                WebkitBoxOrient: 'vertical',
                                                WebkitLineClamp: 3,
                                            }}
                                        >
                                            {getExcerpt(post.content)}
                                        </Typography>

                                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 'auto' }}>
                                            <Avatar 
                                                sx={{ 
                                                    bgcolor: alpha(primaryColor, 0.1), 
                                                    color: primaryColor,
                                                    border: `1px solid ${alpha(primaryColor, 0.2)}`,
                                                    width: 36, 
                                                    height: 36 
                                                }}
                                            >
                                                {post.author.email.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: 600,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {post.author.email}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                    {formatDate(post.created_at)}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>

                                    <Box 
                                        sx={{ 
                                            px: 3.5, 
                                            py: 2, 
                                            borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            bgcolor: 'rgba(255,255,255,0.01)'
                                        }}
                                    >
                                        <Button
                                            startIcon={post.liked ? <ThumbUp sx={{ color: primaryColor }} /> : <ThumbUpOutlined />}
                                            size="small"
                                            onClick={() => handleLike(post)}
                                            sx={{ 
                                                color: post.liked ? primaryColor : 'grey.400', 
                                                fontWeight: 700,
                                                fontSize: '0.8rem',
                                                '&:hover': {
                                                    bgcolor: 'transparent',
                                                    color: primaryColor,
                                                }
                                            }}
                                        >
                                            {post.likes_count}
                                        </Button>
                                        <Stack direction="row" spacing={1}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleBookmark(post)}
                                                sx={{ 
                                                    color: post.bookmarked ? primaryColor : 'grey.400',
                                                    '&:hover': { color: primaryColor }
                                                }}
                                            >
                                                {post.bookmarked ? <Bookmark /> : <BookmarkBorder />}
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleShare(post)}
                                                sx={{ 
                                                    color: 'grey.400',
                                                    '&:hover': { color: primaryColor }
                                                }}
                                            >
                                                <Share />
                                            </IconButton>
                                        </Stack>
                                    </Box>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />

            {/* Pagination */}
            {!loading && filteredPosts.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 6, sm: 8, md: 10 } }}>
                    <Pagination
                        count={Math.ceil(posts.length / 9)}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                        size="large"
                    />
                </Box>
            )}
        </Container>
    );
};

export default BlogPage;