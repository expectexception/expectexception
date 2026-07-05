import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    List, ListItem, ListItemIcon, ListItemText, IconButton, useTheme, alpha
} from '@mui/material';
import { PictureAsPdf, CloudUpload, Download, Delete, MergeType } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

const PdfMerger: React.FC = () => {
    const theme = useTheme();
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
            const data = response.data;
            if (data.file_url && !data.file_url.startsWith('http')) {
                data.file_url = `${API_BASE_URL}${data.file_url}`;
            }
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Merge failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ServicePageShell
            icon={MergeType}
            title="PDF Merger"
            subtitle="Combine multiple PDF files into a single document"
            about="Combines up to 20 separate PDF files into one merged document, in the order you add them. Each file you select joins a list; when you click Merge, all files are uploaded together to our server, stitched into a single PDF, and returned as one downloadable file. Handy for combining scanned pages, invoices, or chapters that exist as separate PDFs into a single file to send or archive."
            howToSteps={[
                { name: 'Add PDF files', text: 'Click Add PDF files and select two or more PDFs — non-PDF files are filtered out automatically.' },
                { name: 'Review the file list', text: 'Check the list of added files; each shows its name and size.' },
                { name: "Remove any you don't want", text: 'Click the trash icon next to a file to remove it from the merge before combining.' },
                { name: 'Merge the files', text: 'Click Merge N PDFs — the button shows the current file count and merges them in the order listed.' },
                { name: 'Download the combined PDF', text: 'Once merging finishes, click Download to save the single combined PDF.' },
            ]}
            faq={[
                { question: 'In what order are the PDFs merged?', answer: 'Files are merged in the order you add them, which is the order they appear in the list — remove and re-add a file if you need to change its position.' },
                { question: 'How many PDFs can I merge at once?', answer: 'Up to 20 files per merge; anything beyond that is simply not added to the list.' },
                { question: 'Do I need at least 2 files?', answer: 'Yes — the Merge button stays disabled until at least 2 PDF files are added.' },
                { question: 'Are my PDFs kept on the server afterward?', answer: "Files are uploaded only to perform the merge and generate the combined download link; they aren't meant to be stored long-term, so download your merged file right away." },
            ]}
        >
            <Seo
                title="Merge PDF Files Online - Combine Documents Free"
                toolId={13}
            />

            {error && <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setError(null)}>{error}</Alert>}
            {result && (
                <Alert severity="success" sx={{ mb: 1.5, flexShrink: 0 }} action={
                    <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                        Download
                    </Button>
                }>PDFs merged successfully!</Alert>
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
                            accept=".pdf"
                            style={{ display: 'none' }}
                            id="pdf-upload"
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                        />
                        <label htmlFor="pdf-upload" style={{ cursor: 'pointer' }}>
                            <CloudUpload sx={{ fontSize: 44, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h6">Add PDF files</Typography>
                            <Typography variant="body2" color="text.secondary">Max 20 files</Typography>
                        </label>
                    </Box>

                    {files.length > 0 && (
                        <List sx={{ mt: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
                        sx={{ mt: 2, py: 1.25, flexShrink: 0 }}
                    >
                        {loading ? 'Merging...' : `Merge ${files.length} PDFs`}
                    </Button>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default PdfMerger;
