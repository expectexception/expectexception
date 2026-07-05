import React, { useEffect, useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    TextField, FormControl, InputLabel, Select, MenuItem, useTheme
} from '@mui/material';
import { CloudUpload, TextFields, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';
import ServicePageShell from './ServicePageShell';
import { useScrollToResult } from '../../hooks/useScrollToResult';

const ImageToText: React.FC = () => {
    const theme = useTheme();
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
    const resultRef = useScrollToResult<HTMLDivElement>(result?.text ?? false);

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
        <ServicePageShell
            icon={TextFields}
            title="Image to Text (OCR)"
            subtitle="Extract text from images using AI-powered OCR"
            maxWidth="md"
            about="Image to Text (OCR) extracts machine-readable text from a photo or screenshot using Tesseract OCR running on our server — the image is sent to the backend, read directly in memory, and the extracted text is returned; the image itself is never written to disk. The Language dropdown is populated dynamically from whatever Tesseract language packs are actually installed on the server, so the exact list can vary between deployments; if you pick a language that isn't installed, the backend automatically falls back to English and shows a warning."
            howToSteps={[
                { name: 'Upload an image', text: 'Click the upload box on the left and choose a photo or screenshot containing text.' },
                { name: 'Pick a language', text: "Choose the text's language from the Language dropdown (defaults to English)." },
                { name: 'Extract', text: 'Click Extract Text to run OCR on the server.' },
                { name: 'Copy the result', text: 'Use the Copy button above the result box to copy the extracted text to your clipboard.' },
            ]}
            faq={[
                { question: 'Which languages are supported?', answer: "It depends on which Tesseract language packs are installed on the server — the dropdown only lists what's actually available. If you request a language that isn't installed, the tool falls back to English and shows a warning." },
                { question: 'How accurate is the text extraction?', answer: 'Accuracy depends heavily on image quality — sharp, high-contrast, horizontally-aligned text extracts best. Blurry photos, stylized fonts, or low-resolution screenshots produce more errors.' },
                { question: 'Are my uploaded images stored?', answer: 'No — the image is read directly in memory to run OCR and is never saved to disk; only the extracted text is returned to you.' },
                { question: 'Does it preserve formatting like tables or columns?', answer: "No, it returns plain text in reading order — layout, tables, and multi-column formatting aren't preserved." },
            ]}
        >
            <Seo title="Image to Text (OCR) - Extract Text from Photos Free" toolId={14} />

            {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>}
            {warning && <Alert severity="warning" sx={{ mb: 2, flexShrink: 0 }}>{warning}</Alert>}

            <Box
                sx={{
                    display: 'flex',
                    gap: { xs: 2, sm: 2.5 },
                    flexDirection: { xs: 'column', md: 'row' },
                    flex: 1,
                    minHeight: 0,
                }}
            >
                {/* Left: Upload */}
                <Card sx={{ flex: 1, minWidth: { xs: '100%', md: 280 }, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <Box sx={{
                            border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 2,
                            textAlign: 'center', mb: 2, flex: 1, minHeight: 140, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <input accept="image/*" style={{ display: 'none' }} id="image-to-text-upload" type="file" onChange={handleFileSelect} />
                            <label htmlFor="image-to-text-upload" style={{ cursor: 'pointer' }}>
                                {preview ? (
                                    <Box component="img" src={preview} sx={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 2 }} />
                                ) : (
                                    <>
                                        <CloudUpload sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                                        <Typography variant="h6">Upload image</Typography>
                                    </>
                                )}
                            </label>
                        </Box>

                        <FormControl fullWidth sx={{ mb: 2, flexShrink: 0 }}>
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
                            sx={{ py: 1.25, flexShrink: 0 }}
                        >
                            {loading ? 'Extracting...' : 'Extract Text'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Right: Result */}
                <Card ref={resultRef} sx={{ flex: 1, minWidth: { xs: '100%', md: 280 }, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexShrink: 0 }}>
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
                            value={result?.text || ''}
                            placeholder="Extracted text will appear here..."
                            InputProps={{ readOnly: true }}
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                                '& .MuiInputBase-input': { fontFamily: 'monospace', height: '100% !important', overflow: 'auto !important' },
                            }}
                        />
                        {result && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, flexShrink: 0 }}>
                                {result.characters} characters extracted
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </ServicePageShell>
    );
};

export default ImageToText;
