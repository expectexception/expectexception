import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    List, ListItem, ListItemIcon, ListItemText, IconButton, alpha
} from '@mui/material';
import { Image, CloudUpload, Download, Delete, PictureAsPdf } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

const ImageToPdf: React.FC = () => {
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
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Seo
                title="Convert Images to PDF - Combine Photos Online"
                description="Easily convert JPG, PNG, and BMP images into a single professional PDF document. Fast, free, and no installation required."
                keywords={['image to pdf', 'convert jpg to pdf', 'png to pdf', 'combine images to pdf', 'online photo to pdf converter', 'combine images pdf', 'photo collage pdf', 'batch image to pdf', 'convert images to pdf online']}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Image to PDF Converter
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Combine multiple images into a single PDF
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {result && (
                <Alert severity="success" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                        Download PDF
                    </Button>
                }>Created PDF with {result.images_count} images!</Alert>
            )}

            <Card>
                <CardContent sx={{ p: 4 }}>
                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 3,
                            p: 4,
                            textAlign: 'center',
                            bgcolor: files.length > 0 ? alpha('#3b82f6', 0.05) : 'transparent',
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
                            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h6">Add images</Typography>
                            <Typography variant="body2" color="text.secondary">JPG, PNG, GIF, WEBP</Typography>
                        </label>
                    </Box>

                    {files.length > 0 && (
                        <List sx={{ mt: 2 }}>
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
                        sx={{ mt: 3, py: 1.5 }}
                    >
                        {loading ? 'Converting...' : `Convert ${files.length} Images to PDF`}
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default ImageToPdf;
