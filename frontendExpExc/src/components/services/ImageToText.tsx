import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    TextField, FormControl, InputLabel, Select, MenuItem, alpha
} from '@mui/material';
import { Image, CloudUpload, TextFields, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const ImageToText: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [language, setLanguage] = useState('eng');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ text: string; characters: number } | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
            setError(null);
            setResult(null);
        }
    };

    const handleExtract = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('language', language);

        try {
            const response = await apiClient.post(endpoints.services.imageToText, formData);
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Text extraction failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (result?.text) {
            navigator.clipboard.writeText(result.text);
        }
    };

    const languages = [
        { code: 'eng', name: 'English' },
        { code: 'spa', name: 'Spanish' },
        { code: 'fra', name: 'French' },
        { code: 'deu', name: 'German' },
        { code: 'ita', name: 'Italian' },
        { code: 'por', name: 'Portuguese' },
        { code: 'rus', name: 'Russian' },
        { code: 'jpn', name: 'Japanese' },
        { code: 'kor', name: 'Korean' },
        { code: 'chi_sim', name: 'Chinese (Simplified)' },
        { code: 'hin', name: 'Hindi' },
        { code: 'ara', name: 'Arabic' },
    ];

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Seo
                title="Image to Text (OCR) - Extract Text from Photos Free"
                toolId={14}
            />

            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Image to Text (OCR)
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Extract text from images using AI-powered OCR
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Left: Upload */}
                <Card sx={{ flex: 1, minWidth: 300 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 4, textAlign: 'center', mb: 3 }}>
                            <input accept="image/*" style={{ display: 'none' }} id="image-upload" type="file" onChange={handleFileSelect} />
                            <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                                {preview ? (
                                    <Box component="img" src={preview} sx={{ maxWidth: '100%', maxHeight: 300, borderRadius: 2 }} />
                                ) : (
                                    <>
                                        <CloudUpload sx={{ fontSize: 48, color: 'primary.main' }} />
                                        <Typography variant="h6">Upload image</Typography>
                                    </>
                                )}
                            </label>
                        </Box>

                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Language</InputLabel>
                            <Select value={language} label="Language" onChange={(e) => setLanguage(e.target.value)}>
                                {languages.map(lang => (
                                    <MenuItem key={lang.code} value={lang.code}>{lang.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {loading && <LinearProgress sx={{ mb: 2 }} />}

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleExtract}
                            disabled={!file || loading}
                            startIcon={<TextFields />}
                            sx={{ py: 1.5 }}
                        >
                            {loading ? 'Extracting...' : 'Extract Text'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Right: Result */}
                <Card sx={{ flex: 1, minWidth: 300 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Extracted Text</Typography>
                            {result && (
                                <Button size="small" startIcon={<ContentCopy />} onClick={handleCopy}>
                                    Copy
                                </Button>
                            )}
                        </Box>
                        <TextField
                            fullWidth
                            multiline
                            rows={15}
                            value={result?.text || ''}
                            placeholder="Extracted text will appear here..."
                            InputProps={{ readOnly: true }}
                            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                        />
                        {result && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {result.characters} characters extracted
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default ImageToText;
