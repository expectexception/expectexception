import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    TextField, Chip, alpha
} from '@mui/material';
import { PictureAsPdf, CloudUpload, Download, ContentCut } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const PdfSplitter: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ file_url: string; total_pages: number; extracted_pages: number } | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleSplit = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('pages', pages);

        try {
            const response = await apiClient.post(endpoints.services.pdfSplit, formData);
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Split failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Seo
                title="Split PDF Online - Extract Pages Free"
                description="Extract specific pages or a range of pages from your PDF file. High-performance PDF splitter that keeps your data secure."
                keywords={['pdf splitter', 'split pdf online', 'extract pages from pdf', 'separate pdf pages', 'free pdf tool', 'split pdf pages', 'pdf page cutter', 'pdf splitter free', 'extract pages from pdf online']}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                PDF Splitter
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Extract pages from PDF files
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
            {result && (
                <Alert severity="success" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                        Download ZIP
                    </Button>
                }>Extracted {result.extracted_pages} of {result.total_pages} pages!</Alert>
            )}

            <Card>
                <CardContent sx={{ p: 4 }}>
                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 3,
                            p: 6,
                            textAlign: 'center',
                            bgcolor: file ? alpha('#10b981', 0.05) : 'transparent',
                        }}
                    >
                        <input accept=".pdf" style={{ display: 'none' }} id="pdf-upload" type="file" onChange={handleFileSelect} />
                        <label htmlFor="pdf-upload" style={{ cursor: 'pointer', display: 'block' }}>
                            {file ? (
                                <>
                                    <PictureAsPdf sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                                    <Typography variant="h6">{file.name}</Typography>
                                </>
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="h6">Drop your PDF here</Typography>
                                </>
                            )}
                        </label>
                    </Box>

                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>Pages to extract:</Typography>
                        <TextField
                            fullWidth
                            value={pages}
                            onChange={(e) => setPages(e.target.value)}
                            placeholder="all, 1-5, 1,3,5"
                            helperText="Enter 'all' for all pages, '1-5' for range, or '1,3,5' for specific pages"
                        />
                    </Box>

                    {loading && <LinearProgress sx={{ mt: 3 }} />}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleSplit}
                        disabled={!file || loading}
                        startIcon={<ContentCut />}
                        sx={{ mt: 3, py: 1.5 }}
                    >
                        {loading ? 'Splitting...' : 'Split PDF'}
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default PdfSplitter;
