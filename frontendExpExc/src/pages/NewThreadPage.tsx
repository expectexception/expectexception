import React, { useState, useEffect } from 'react';
import {
    Box, Container, Typography, TextField, Button, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress, Chip, Stack,
} from '@mui/material';
import { Edit, Send, ArrowBack } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

interface Category {
    id: number;
    name: string;
    slug: string;
    color: string;
}

const NewThreadPage: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState<number | ''>('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) { navigate('/login'); return; }
        apiClient.get(endpoints.community.categories).then(res => {
            setCategories(Array.isArray(res.data) ? res.data : res.data.results || []);
        }).catch(() => { });
    }, [isAuthenticated, navigate]);

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
            if (t && !tags.includes(t) && tags.length < 5) {
                setTags(prev => [...prev, t]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) { setError('Title and body are required.'); return; }
        setLoading(true);
        setError(null);
        try {
            const payload: any = { title: title.trim(), body: body.trim(), tags: tags.join(',') };
            if (category) payload.category = category;
            const res = await apiClient.post(endpoints.community.threads, payload);
            navigate(`/community/thread/${res.data.id}/${res.data.slug}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create thread.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <Button
                    component={Link}
                    to="/community"
                    startIcon={<ArrowBack />}
                    variant="text"
                    sx={{ mb: 3, color: 'text.secondary' }}
                >
                    Back to Community
                </Button>

                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Box sx={{
                        width: 60, height: 60, borderRadius: '50%', mx: 'auto', mb: 2,
                        background: `radial-gradient(circle, ${alpha(primary, 0.2)}, transparent)`,
                        border: `1.5px solid ${alpha(primary, 0.4)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Edit sx={{ color: primary, fontSize: 26 }} />
                    </Box>
                    <Typography variant="h3" fontWeight="800" sx={{
                        background: `linear-gradient(135deg, ${primary}, ${theme.palette.secondary.main})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        New Thread
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                        Share a question or start a discussion with the community
                    </Typography>
                </Box>

                <Card sx={{ border: `1px solid ${alpha(primary, 0.12)}`, boxShadow: `0 0 40px ${alpha(primary, 0.05)}` }}>
                    <CardContent sx={{ p: 4 }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>
                        )}
                        <Box component="form" onSubmit={handleSubmit}>
                            <TextField
                                label="Thread Title"
                                fullWidth
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="What's your question or topic?"
                                sx={{ mb: 3 }}
                                inputProps={{ maxLength: 300 }}
                                helperText={`${title.length}/300`}
                            />

                            <FormControl fullWidth sx={{ mb: 3 }}>
                                <InputLabel>Category (optional)</InputLabel>
                                <Select
                                    value={category}
                                    onChange={e => setCategory(e.target.value as number | '')}
                                    label="Category (optional)"
                                >
                                    <MenuItem value="">No Category</MenuItem>
                                    {categories.map(cat => (
                                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                label="Body"
                                fullWidth
                                required
                                multiline
                                rows={10}
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder="Describe your question in detail. Include any relevant code, error messages, or context..."
                                sx={{ mb: 3 }}
                            />

                            {/* Tags */}
                            <Box sx={{ mb: 3 }}>
                                <TextField
                                    label="Add Tags (press Enter or comma)"
                                    fullWidth
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={addTag}
                                    disabled={tags.length >= 5}
                                    helperText="Up to 5 tags — helps others find your thread"
                                    InputProps={{ startAdornment: tags.length > 0 ? undefined : undefined }}
                                />
                                {tags.length > 0 && (
                                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                        {tags.map(tag => (
                                            <Chip
                                                key={tag}
                                                label={tag}
                                                size="small"
                                                onDelete={() => removeTag(tag)}
                                                sx={{ bgcolor: alpha(primary, 0.1), color: primary, border: `1px solid ${alpha(primary, 0.25)}` }}
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Box>

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                fullWidth
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
                                sx={{ py: 1.5, borderRadius: 2 }}
                            >
                                {loading ? 'Posting...' : 'Post Thread'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </motion.div>
        </Container>
    );
};

export default NewThreadPage;
