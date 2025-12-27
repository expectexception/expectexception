import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Switch,
    FormControlLabel,
    InputAdornment,
    IconButton,
    Collapse,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';
import RichTextEditor from '../../components/blog/RichTextEditor';
import { CloudUpload, ExpandMore, ExpandLess, Image as ImageIcon } from '@mui/icons-material';

const CreateBlogPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        status: 'published',
        seo_title: '',
        seo_description: '',
        keywords: '',
        excerpt: '',
        featured: false,
    });
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [tags, setTags] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Auto-generate slug from title
    useEffect(() => {
        if (!formData.slug && formData.title) {
            const autoSlug = formData.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            setFormData(prev => ({ ...prev, slug: autoSlug }));
        }
    }, [formData.title]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCoverImage(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('slug', formData.slug);
            data.append('content', formData.content);
            data.append('status', formData.status);
            data.append('seo_title', formData.seo_title);
            data.append('seo_description', formData.seo_description);
            data.append('keywords', formData.keywords);
            data.append('excerpt', formData.excerpt);
            data.append('featured', String(formData.featured));

            if (coverImage) {
                data.append('cover_image', coverImage);
            }

            // Handle tags
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            tagList.forEach((tag) => {
                data.append('tag_names', tag);
            });

            await apiClient.post(endpoints.blog.posts, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            navigate('/blogs');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create blog post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 6 }, px: { xs: 1, sm: 2 } }}>
            <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Typography variant="h4" gutterBottom fontWeight={800} sx={{ mb: 4, background: 'linear-gradient(45deg, #2563eb, #7c3aed)', webkitBackgroundClip: 'text', webkitTextFillColor: 'transparent' }}>
                    Create New Post
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                    <Stack spacing={4}>
                        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                            <Box sx={{ flex: 2 }}>
                                <Stack spacing={3}>
                                    <TextField
                                        label="Post Title"
                                        fullWidth
                                        required
                                        variant="outlined"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        sx={{ '& .MuiOutlinedInput-root': { fontSize: '1.25rem' } }}
                                    />

                                    <TextField
                                        label="URL Slug"
                                        fullWidth
                                        size="small"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        helperText="Auto-generated from title, can be edited"
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">/blogs/</InputAdornment>,
                                        }}
                                    />

                                    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>
                                        Content
                                    </Typography>
                                    <RichTextEditor
                                        value={formData.content}
                                        onChange={(content) => setFormData({ ...formData, content })}
                                    />
                                </Stack>
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                <Stack spacing={3}>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                                        <Typography variant="subtitle2" gutterBottom fontWeight={600}>Publishing</Typography>
                                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                            <InputLabel>Status</InputLabel>
                                            <Select
                                                value={formData.status}
                                                label="Status"
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value as string })}
                                            >
                                                <MenuItem value="draft">Draft</MenuItem>
                                                <MenuItem value="published">Published</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <FormControlLabel
                                            control={<Switch checked={formData.featured} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} />}
                                            label="Featured Post"
                                        />
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            fullWidth
                                            size="large"
                                            disabled={loading}
                                            sx={{ mt: 2 }}
                                        >
                                            {loading ? 'Publishing...' : 'Publish Now'}
                                        </Button>
                                    </Paper>

                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                                        <Typography variant="subtitle2" gutterBottom fontWeight={600}>Cover Image</Typography>
                                        <Box
                                            sx={{
                                                border: '2px dashed #cbd5e1',
                                                borderRadius: 2,
                                                p: 2,
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                bgcolor: 'white',
                                                minHeight: 150,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            onClick={() => document.getElementById('cover-upload')?.click()}
                                        >
                                            {coverPreview ? (
                                                <img
                                                    src={coverPreview}
                                                    alt="Cover"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }}
                                                />
                                            ) : (
                                                <>
                                                    <CloudUpload sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                                                    <Typography variant="caption" color="text.secondary">
                                                        Click to upload cover image
                                                    </Typography>
                                                </>
                                            )}
                                        </Box>
                                        <input
                                            type="file"
                                            id="cover-upload"
                                            hidden
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                        {coverPreview && (
                                            <Button size="small" color="error" fullWidth onClick={(e) => { e.stopPropagation(); setCoverImage(null); setCoverPreview(null); }}>
                                                Remove Image
                                            </Button>
                                        )}
                                    </Paper>

                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowAdvanced(!showAdvanced)}>
                                            <Typography variant="subtitle2" fontWeight={600}>Advanced & SEO</Typography>
                                            <IconButton size="small">
                                                {showAdvanced ? <ExpandLess /> : <ExpandMore />}
                                            </IconButton>
                                        </Box>
                                        <Collapse in={showAdvanced}>
                                            <Stack spacing={2} sx={{ mt: 2 }}>
                                                <TextField
                                                    label="Excerpt"
                                                    multiline
                                                    rows={3}
                                                    fullWidth
                                                    size="small"
                                                    value={formData.excerpt}
                                                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                                    helperText="Short summary for cards"
                                                />
                                                <TextField
                                                    label="SEO Title"
                                                    fullWidth
                                                    size="small"
                                                    value={formData.seo_title}
                                                    onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                                                />
                                                <TextField
                                                    label="Meta Description"
                                                    fullWidth
                                                    multiline
                                                    rows={2}
                                                    size="small"
                                                    value={formData.seo_description}
                                                    onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                                                />
                                                <TextField
                                                    label="Keywords"
                                                    fullWidth
                                                    size="small"
                                                    value={formData.keywords}
                                                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                                />
                                                <TextField
                                                    label="Tags"
                                                    fullWidth
                                                    size="small"
                                                    value={tags}
                                                    onChange={(e) => setTags(e.target.value)}
                                                    helperText="Comma separated"
                                                />
                                            </Stack>
                                        </Collapse>
                                    </Paper>
                                </Stack>
                            </Box>
                        </Box>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
};

export default CreateBlogPage;
