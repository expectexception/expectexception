import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, Alert, LinearProgress, Chip, alpha
} from '@mui/material';
import { PictureAsPdf, CloudUpload, Download, Description } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

const DocToPdf: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ file_url: string; filename: string } | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            setFile(e.dataTransfer.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleConvert = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('document', file);

        try {
            const response = await apiClient.post(endpoints.services.docToPdf, formData);
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
                title="Convert Word to PDF Online - Fast & Free"
                description="High fidelity Word (DOC/DOCX) to PDF conversion. Keep your layout and fonts perfectly. No file size limits. Quick and easy."
                keywords={['word to pdf', 'doc to pdf', 'docx to pdf converter', 'online document converter', 'free word to pdf', 'convert docx', 'online doc to pdf', 'docx to pdf converter free', 'microsoft word to pdf']}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Word to PDF Converter
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Convert DOC, DOCX, ODT, RTF files to PDF
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
            {result && (
                <Alert severity="success" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                        Download
                    </Button>
                }>Conversion successful!</Alert>
            )}

            <Card>
                <CardContent sx={{ p: 4 }}>
                    <Box
                        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        sx={{
                            border: '2px dashed',
                            borderColor: dragActive ? 'primary.main' : 'divider',
                            borderRadius: 3,
                            p: 6,
                            textAlign: 'center',
                            bgcolor: file ? alpha('#10b981', 0.05) : 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        <input
                            accept=".doc,.docx,.odt,.rtf,.txt"
                            style={{ display: 'none' }}
                            id="doc-upload"
                            type="file"
                            onChange={handleFileSelect}
                        />
                        <label htmlFor="doc-upload" style={{ cursor: 'pointer', display: 'block' }}>
                            {file ? (
                                <>
                                    <Description sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="h6">{file.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </Typography>
                                </>
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.8 }} />
                                    <Typography variant="h6">Drop your document here</Typography>
                                    <Typography variant="body2" color="text.secondary">or click to browse</Typography>
                                    <Chip label="Max 50MB" size="small" variant="outlined" sx={{ mt: 2 }} />
                                </>
                            )}
                        </label>
                    </Box>

                    {loading && <LinearProgress sx={{ mt: 3 }} />}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleConvert}
                        disabled={!file || loading}
                        startIcon={<PictureAsPdf />}
                        sx={{ mt: 3, py: 1.5 }}
                    >
                        {loading ? 'Converting...' : 'Convert to PDF'}
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default DocToPdf;
