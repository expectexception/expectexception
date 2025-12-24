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
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { User } from '../types';

// Define interfaces matching backend
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
    // comments: any[]; // Assuming list of comments or count
    bookmarked: boolean;
    liked: boolean;
}

const BlogPage: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('latest');
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    useEffect(() => {
        fetchPosts();
    }, [page, filter]);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(endpoints.blog.posts);
            // Assuming response.data is pagination object or list
            // If Django Rest Framework PageNumberPagination is used: response.data.results
            // If list: response.data
            const data = Array.isArray(response.data) ? response.data : response.data.results || [];
            setPosts(data);
        } catch (err) {
            console.error('Error fetching posts:', err);
            setError('Failed to load blog posts. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to extract text from content (simple strip html if needed)
    const getExcerpt = (content: string, length = 100) => {
        return content.length > length ? content.substring(0, length) + '...' : content;
    };

    // Helper to format date
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

        // Optimistic update
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
            // Revert
            setPosts(posts); // Use previous state if available, but for now just error
            setSnackbar({ open: true, message: 'Failed to update bookmark' });
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
    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.content.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Seo
                title="Developer Blog & Tech Insights - ExpectException"
                description="Read our latest articles on software development, AI, web performance, and developer productivity tools."
                keywords={['developer blog', 'tech news', 'programming tutorials', 'ai insights', 'web development tips', 'software engineering blog', 'coding best practices', 'ai technology updates', 'productivity tool reviews']}
            />
            {/* Header */}
            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography
                    variant="h2"
                    gutterBottom
                    sx={{
                        fontWeight: 800,
                        background: 'linear-gradient(45deg, #60a5fa, #a78bfa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Our Blog
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
                    Insights, tutorials, and latest updates from ExpectException
                </Typography>
                {user?.is_staff && (
                    <Button
                        component={Link}
                        to="/admin/create-blog"
                        variant="contained"
                        startIcon={<Add />}
                        sx={{ mt: 3 }}
                    >
                        New Post
                    </Button>
                )}
            </Box>

            {/* Search and Filters */}
            <Grid container spacing={3} sx={{ mb: 6 }}>
                <Grid item xs={12} md={8}>
                    <TextField
                        fullWidth
                        placeholder="Search articles..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search color="action" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={2} sx={{ height: '100%' }}>
                        <ToggleButtonGroup
                            value={filter}
                            exclusive
                            onChange={(_, value) => value && setFilter(value)}
                            size="medium"
                            sx={{ bgcolor: 'background.paper' }}
                        >
                            <ToggleButton value="latest">Latest</ToggleButton>
                            <ToggleButton value="popular">Popular</ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                </Grid>
            </Grid>

            {/* Content */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : filteredPosts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <Typography variant="h6" color="text.secondary">
                        No articles found matching your search.
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={4}>
                    {filteredPosts.map((post, index) => (
                        <Grid item xs={12} md={4} key={post.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                        <Box sx={{ mb: 2 }}>
                                            {post.tags.map(tag => (
                                                <Chip
                                                    key={tag.id}
                                                    label={tag.name}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ mr: 1, mb: 1 }}
                                                />
                                            ))}
                                        </Box>

                                        <Typography variant="h5" component={Link} to={`/blogs/${post.id}`} sx={{
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            fontWeight: 700,
                                            display: 'block',
                                            mb: 1,
                                            '&:hover': { color: 'primary.main' }
                                        }}>
                                            {post.title}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            {getExcerpt(post.content)}
                                        </Typography>

                                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 2 }}>
                                            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                                                {post.author.email.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2">
                                                    {post.author.email}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatDate(post.created_at)}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>

                                    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                                        <Button startIcon={<ThumbUp />} size="small" color="inherit">
                                            {post.likes_count}
                                        </Button>
                                        <Stack direction="row">
                                            <IconButton size="small" onClick={() => handleBookmark(post)}>
                                                {post.bookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleShare(post)}>
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
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
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