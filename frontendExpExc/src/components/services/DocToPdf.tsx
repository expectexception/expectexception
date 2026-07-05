import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, Alert, LinearProgress, Chip, useTheme, alpha
} from '@mui/material';
import { PictureAsPdf, CloudUpload, Download, Description } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

const DocToPdf: React.FC = () => {
    const theme = useTheme();
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
        <ServicePageShell
            icon={PictureAsPdf}
            title="Word to PDF Converter"
            subtitle="Convert DOC, DOCX, ODT, RTF files to PDF"
            about="Converts Word-family documents — DOC, DOCX, ODT, RTF, and plain TXT — into PDF. Conversion happens on our server: the file you drop or select is uploaded, converted, and you get back a link to download the resulting PDF. Useful when you need a document to render identically everywhere (email attachments, printing, archiving) instead of relying on the recipient having the same word processor and fonts installed."
            howToSteps={[
                { name: 'Add your document', text: 'Drag a DOC, DOCX, ODT, RTF, or TXT file onto the upload area, or click it to browse and select one.' },
                { name: 'Check the file details', text: 'Confirm the filename and size shown match the document you intended to convert.' },
                { name: 'Start the conversion', text: 'Click Convert to PDF to upload the file and start the conversion.' },
                { name: 'Wait for processing', text: 'A progress bar shows while the file uploads and converts on the server.' },
                { name: 'Download the result', text: 'Once you see the success message, click Download to save the converted PDF.' },
            ]}
            faq={[
                { question: 'What file formats are supported?', answer: 'DOC, DOCX, ODT, RTF, and TXT can all be uploaded and converted to PDF.' },
                { question: 'What is the maximum file size?', answer: 'The upload dialog is set up for files up to about 50MB; larger files may be rejected.' },
                { question: 'Is my document stored after conversion?', answer: "The file is uploaded to our server to perform the conversion and produce a downloadable PDF; it isn't intended for long-term storage, so download your result promptly." },
                { question: 'Will formatting, images, and fonts be preserved?', answer: 'The converter aims to preserve layout, images, and text formatting from the source document, though very complex layouts — unusual fonts or embedded objects — can occasionally shift slightly in the PDF output.' },
            ]}
        >
            <Seo
                title="Convert Word to PDF Online - Fast & Free"
                toolId={9}
            />

            {error && <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setError(null)}>{error}</Alert>}
            {result && (
                <Alert severity="success" sx={{ mb: 1.5, flexShrink: 0 }} action={
                    <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                        Download
                    </Button>
                }>Conversion successful!</Alert>
            )}

            <Card sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box
                        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        sx={{
                            border: '2px dashed',
                            borderColor: dragActive ? 'primary.main' : 'divider',
                            borderRadius: 3,
                            p: { xs: 3, sm: 4 },
                            textAlign: 'center',
                            bgcolor: file ? alpha(theme.palette.secondary.main, 0.05) : 'transparent',
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
                                    <Description sx={{ fontSize: 56, color: 'primary.main', mb: 1.5 }} />
                                    <Typography variant="h6">{file.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </Typography>
                                </>
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 56, color: 'primary.main', mb: 1.5, opacity: 0.8 }} />
                                    <Typography variant="h6">Drop your document here</Typography>
                                    <Typography variant="body2" color="text.secondary">or click to browse</Typography>
                                    <Chip label="Max 50MB" size="small" variant="outlined" sx={{ mt: 1.5 }} />
                                </>
                            )}
                        </label>
                    </Box>

                    {loading && <LinearProgress sx={{ mt: 2 }} />}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleConvert}
                        disabled={!file || loading}
                        startIcon={<PictureAsPdf />}
                        sx={{ mt: 2, py: 1.25 }}
                    >
                        {loading ? 'Converting...' : 'Convert to PDF'}
                    </Button>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default DocToPdf;
