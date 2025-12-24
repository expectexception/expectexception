import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    List, ListItem, ListItemIcon, ListItemText, IconButton, alpha
} from '@mui/material';
import { PictureAsPdf, CloudUpload, Download, Delete, MergeType } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const PdfMerger: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ file_url: string; filename: string } | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
            setFiles(prev => [...prev, ...newFiles].slice(0, 20));
            setError(null);
            setResult(null);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            setError('Please select at least 2 PDF files');
            return;
        }
        setLoading(true);
        setError(null);

        const formData = new FormData();
        files.forEach(file => formData.append('pdfs', file));

        try {
            const response = await apiClient.post(endpoints.services.pdfMerge, formData);
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Merge failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Seo
                title="Merge PDF Files Online - Combine Documents Free"
                description="Combine multiple PDF documents into a single file easily. Secure, fast, and no file limits. Perfectly preserve your document quality."
                keywords={['pdf merger', 'combine pdf', 'join pdf files', 'free online pdf merger', 'merge documents', 'merge pdf files', 'combine pdf documents', 'pdf joiner', 'concatenate pdf files', 'pdf file merger cloud']}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                PDF Merger
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Combine multiple PDF files into a single document
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
            {result && (
                <Alert severity="success" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                        Download
                    </Button>
                }>PDFs merged successfully!</Alert>
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
                            accept=".pdf"
                            style={{ display: 'none' }}
                            id="pdf-upload"
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                        />
                        <label htmlFor="pdf-upload" style={{ cursor: 'pointer' }}>
                            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h6">Add PDF files</Typography>
                            <Typography variant="body2" color="text.secondary">Max 20 files</Typography>
                        </label>
                    </Box>

                    {files.length > 0 && (
                        <List sx={{ mt: 2 }}>
                            {files.map((file, index) => (
                                <ListItem key={index} secondaryAction={
                                    <IconButton edge="end" onClick={() => removeFile(index)}><Delete /></IconButton>
                                }>
                                    <ListItemIcon><PictureAsPdf color="error" /></ListItemIcon>
                                    <ListItemText primary={file.name} secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`} />
                                </ListItem>
                            ))}
                        </List>
                    )}

                    {loading && <LinearProgress sx={{ mt: 2 }} />}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleMerge}
                        disabled={files.length < 2 || loading}
                        startIcon={<MergeType />}
                        sx={{ mt: 3, py: 1.5 }}
                    >
                        {loading ? 'Merging...' : `Merge ${files.length} PDFs`}
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default PdfMerger;
