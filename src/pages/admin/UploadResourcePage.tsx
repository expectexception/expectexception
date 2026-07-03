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
import { CloudUpload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const UploadResourcePage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        category: 'other',
        version: 'v1.0.0',
        size: '',
        description: '',
        keywords: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            // Auto-set size string
            const sizeMB = (f.size / (1024 * 1024)).toFixed(2);
            setFormData(prev => ({
                ...prev,
                size: `${sizeMB} MB`,
                name: prev.name || f.name
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file');
            return;
        }
        setLoading(true);
        setError(null);

        const uploadData = new FormData();
        uploadData.append('name', formData.name);
        uploadData.append('category', formData.category);
        uploadData.append('version', formData.version);
        uploadData.append('size', formData.size);
        uploadData.append('description', formData.description);
        uploadData.append('keywords', formData.keywords);
        uploadData.append('file', file);

        try {
            await apiClient.post(endpoints.services.downloads, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
            navigate('/downloads');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to upload resource');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Upload Downloadable Resource
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                    <Stack spacing={3}>
                        <Box sx={{ border: '2px dashed #ccc', p: 4, textAlign: 'center', borderRadius: 2 }}>
                            <input
                                accept="*/*"
                                style={{ display: 'none' }}
                                id="raised-button-file"
                                type="file"
                                onChange={handleFileChange}
                            />
                            <label htmlFor="raised-button-file">
                                <Button variant="outlined" component="span" startIcon={<CloudUpload />}>
                                    Choose File
                                </Button>
                            </label>
                            {file && <Typography sx={{ mt: 2 }}>Selected: {file.name} ({formData.size})</Typography>}
                        </Box>

                        <TextField
                            label="Resource Name"
                            fullWidth
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />

                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={formData.category}
                                label="Category"
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as string })}
                            >
                                <MenuItem value="doc">Document</MenuItem>
                                <MenuItem value="img">Image</MenuItem>
                                <MenuItem value="video">Video</MenuItem>
                                <MenuItem value="audio">Audio</MenuItem>
                                <MenuItem value="archive">Archive</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Version"
                            fullWidth
                            value={formData.version}
                            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                        />

                        <TextField
                            label="Size Label (Auto)"
                            fullWidth
                            value={formData.size}
                            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                            helperText="Auto-calculated, but you can override"
                        />

                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={4}
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            helperText="Detailed description of the resource for the specialized download page."
                        />

                        <TextField
                            label="Keywords"
                            fullWidth
                            value={formData.keywords}
                            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                            helperText="Comma-separated keywords for SEO (e.g. 'pdf, tool, converter')"
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button onClick={() => navigate(-1)}>Cancel</Button>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={loading}
                            >
                                {loading ? 'Uploading...' : 'Upload Resource'}
                            </Button>
                        </Box>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
};

export default UploadResourcePage;
