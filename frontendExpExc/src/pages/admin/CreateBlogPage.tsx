import React, { useState } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';
import RichTextEditor from '../../components/blog/RichTextEditor';

const CreateBlogPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        status: 'published',
        seo_title: '',
        seo_description: '',
        keywords: '',
    });
    const [tags, setTags] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await apiClient.post(endpoints.blog.posts, {
                ...formData,
                tags: tags.split(',').map(t => t.trim()).filter(t => t !== ''),
            });
            navigate('/blogs');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to create blog post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: { xs: 2, sm: 8 }, px: { xs: 1, sm: 2 } }}>
            <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
                <Typography variant="h4" gutterBottom fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    Write New Blog Post
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                    <Stack spacing={3}>
                        <TextField
                            label="Title"
                            fullWidth
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />

                        <Typography variant="subtitle1" fontWeight={600}>
                            Content (Rich Text)
                        </Typography>
                        <RichTextEditor
                            value={formData.content}
                            onChange={(content) => setFormData({ ...formData, content })}
                        />

                        <TextField
                            label="Tags (comma separated)"
                            fullWidth
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            helperText="e.g. react, typescript, tutorial"
                        />

                        <FormControl fullWidth>
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

                        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom>SEO Settings</Typography>
                            <Stack spacing={2}>
                                <TextField
                                    label="SEO Title (Meta Title)"
                                    fullWidth
                                    value={formData.seo_title}
                                    onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                                    helperText={`${formData.seo_title.length}/70 characters`}
                                />
                                <TextField
                                    label="Meta Description"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={formData.seo_description}
                                    onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                                    helperText={`${formData.seo_description.length}/160 characters`}
                                />
                                <TextField
                                    label="Keywords (comma separated)"
                                    fullWidth
                                    value={formData.keywords}
                                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                />
                            </Stack>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pb: 2 }}>
                            <Button onClick={() => navigate(-1)}>Cancel</Button>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={loading}
                                sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                            >
                                {loading ? 'Publishing...' : 'Publish Post'}
                            </Button>
                        </Box>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
};

export default CreateBlogPage;
