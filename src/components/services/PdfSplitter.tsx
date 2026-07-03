import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    TextField, useTheme, alpha
} from '@mui/material';
import { PictureAsPdf, CloudUpload, Download, ContentCut } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

const PdfSplitter: React.FC = () => {
    const theme = useTheme();
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
            const data = response.data;
            if (data.file_url && !data.file_url.startsWith('http')) {
                data.file_url = `${API_BASE_URL}${data.file_url}`;
            }
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Split failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ServicePageShell
            icon={ContentCut}
            title="PDF Splitter"
            subtitle="Extract pages from PDF files"
        >
            <Seo
                title="Split PDF Online - Extract Pages Free"
                toolId={15}
            />

            {error && <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setError(null)}>{error}</Alert>}
            {result && (
                <Alert severity="success" sx={{ mb: 1.5, flexShrink: 0 }} action={
                    <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                        Download ZIP
                    </Button>
                }>Extracted {result.extracted_pages} of {result.total_pages} pages!</Alert>
            )}

            <Card sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 3,
                            p: { xs: 3, sm: 4 },
                            textAlign: 'center',
                            bgcolor: file ? alpha(theme.palette.secondary.main, 0.05) : 'transparent',
                        }}
                    >
                        <input accept=".pdf" style={{ display: 'none' }} id="pdf-upload" type="file" onChange={handleFileSelect} />
                        <label htmlFor="pdf-upload" style={{ cursor: 'pointer', display: 'block' }}>
                            {file ? (
                                <>
                                    <PictureAsPdf sx={{ fontSize: 56, color: 'error.main', mb: 1.5 }} />
                                    <Typography variant="h6">{file.name}</Typography>
                                </>
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 56, color: 'primary.main', mb: 1.5 }} />
                                    <Typography variant="h6">Drop your PDF here</Typography>
                                </>
                            )}
                        </label>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Pages to extract:</Typography>
                        <TextField
                            fullWidth
                            size="small"
                            value={pages}
                            onChange={(e) => setPages(e.target.value)}
                            placeholder="all, 1-5, 1,3,5"
                            helperText="Enter 'all' for all pages, '1-5' for range, or '1,3,5' for specific pages"
                        />
                    </Box>

                    {loading && <LinearProgress sx={{ mt: 2 }} />}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleSplit}
                        disabled={!file || loading}
                        startIcon={<ContentCut />}
                        sx={{ mt: 2, py: 1.25 }}
                    >
                        {loading ? 'Splitting...' : 'Split PDF'}
                    </Button>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default PdfSplitter;
