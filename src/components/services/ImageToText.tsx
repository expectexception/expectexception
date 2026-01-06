import React, { useEffect, useState } from 'react';
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
    const [warning, setWarning] = useState<string | null>(null);
    const [result, setResult] = useState<{
        text: string;
        characters: number;
        language?: string;
        requested_language?: string;
        warning?: string;
    } | null>(null);

    const [availableLanguages, setAvailableLanguages] = useState<Array<{ code: string; name: string }>>([
        { code: 'eng', name: 'English' },
    ]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
            setError(null);
            setWarning(null);
            setResult(null);
        }
    };

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const resp = await apiClient.get(endpoints.services.imageToText);
                const langs: string[] = resp?.data?.languages;
                if (!mounted || !Array.isArray(langs) || langs.length === 0) return;

                // Map some common codes to nicer names; fallback to code.
                const nameMap: Record<string, string> = {
                    eng: 'English',
                    osd: 'Orientation / Script Detection (OSD)',
                    spa: 'Spanish',
                    fra: 'French',
                    deu: 'German',
                    ita: 'Italian',
                    por: 'Portuguese',
                    rus: 'Russian',
                    jpn: 'Japanese',
                    kor: 'Korean',
                    chi_sim: 'Chinese (Simplified)',
                    hin: 'Hindi',
                    ara: 'Arabic',
                };

                const options = langs
                    .filter((c) => typeof c === 'string' && c.trim().length > 0)
                    .map((code) => ({ code, name: nameMap[code] || code }));

                setAvailableLanguages(options);

                // Keep current selection if still valid; else reset to eng.
                if (!options.some((o) => o.code === language)) {
                    setLanguage(options.some((o) => o.code === 'eng') ? 'eng' : options[0].code);
                }
            } catch {
                // Ignore: fallback to default list.
            }
        })();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleExtract = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setWarning(null);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('language', language);

        try {
            const response = await apiClient.post(endpoints.services.imageToText, formData);
            const data = response.data;
            setResult({
                text: data?.text || '',
                characters: Number(data?.characters || 0),
                language: data?.language,
                requested_language: data?.requested_language,
                warning: data?.warning,
            });
            if (data?.warning) setWarning(String(data.warning));
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
            {warning && <Alert severity="warning" sx={{ mb: 3 }}>{warning}</Alert>}

            <Box
                sx={{
                    display: 'flex',
                    gap: { xs: 2, sm: 3 },
                    flexDirection: { xs: 'column', md: 'row' },
                }}
            >
                {/* Left: Upload */}
                <Card sx={{ flex: 1, minWidth: { xs: '100%', md: 300 } }}>
                    <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                        <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: { xs: 2, sm: 4 }, textAlign: 'center', mb: 3 }}>
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
                                {availableLanguages.map(lang => (
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
                <Card sx={{ flex: 1, minWidth: { xs: '100%', md: 300 } }}>
                    <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
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
