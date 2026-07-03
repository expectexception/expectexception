import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    List, ListItem, ListItemIcon, ListItemText, IconButton, useTheme, alpha
} from '@mui/material';
import { Image, CloudUpload, Download, Delete, PictureAsPdf } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

const ImageToPdf: React.FC = () => {
    const theme = useTheme();
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ file_url: string; images_count: number } | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).filter(f =>
                /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f.name)
            );
            setFiles(prev => [...prev, ...newFiles]);
            setError(null);
            setResult(null);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleConvert = async () => {
        if (files.length === 0) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        files.forEach(file => formData.append('images', file));

        try {
            const response = await apiClient.post(endpoints.services.imageToPdf, formData);
            const data = response.data;
            if (data.file_url && !data.file_url.startsWith('http')) {
                data.file_url = `${API_BASE_URL}${data.file_url}`;
            }
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Conversion failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ServicePageShell
            icon={PictureAsPdf}
            title="Image to PDF Converter"
            subtitle="Combine multiple images into a single PDF"
        >
            <Seo
                title="Convert Images to PDF - Combine Photos Online"
                toolId={17}
            />

            {error && <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setError(null)}>{error}</Alert>}
            {result && (
                <Alert severity="success" sx={{ mb: 1.5, flexShrink: 0 }} action={
                    <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                        Download PDF
                    </Button>
                }>Created PDF with {result.images_count} images!</Alert>
            )}

            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 3,
                            p: 3,
                            textAlign: 'center',
                            flexShrink: 0,
                            bgcolor: files.length > 0 ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        }}
                    >
                        <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="image-upload"
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                        />
                        <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                            <CloudUpload sx={{ fontSize: 44, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h6">Add images</Typography>
                            <Typography variant="body2" color="text.secondary">JPG, PNG, GIF, WEBP</Typography>
                        </label>
                    </Box>

                    {files.length > 0 && (
                        <List sx={{ mt: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            {files.map((file, index) => (
                                <ListItem key={index} secondaryAction={
                                    <IconButton edge="end" onClick={() => removeFile(index)}><Delete /></IconButton>
                                }>
                                    <ListItemIcon><Image color="primary" /></ListItemIcon>
                                    <ListItemText primary={file.name} />
                                </ListItem>
                            ))}
                        </List>
                    )}

                    {loading && <LinearProgress sx={{ mt: 2 }} />}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleConvert}
                        disabled={files.length === 0 || loading}
                        startIcon={<PictureAsPdf />}
                        sx={{ mt: 2, py: 1.25, flexShrink: 0 }}
                    >
                        {loading ? 'Converting...' : `Convert ${files.length} Images to PDF`}
                    </Button>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ImageToPdf;
