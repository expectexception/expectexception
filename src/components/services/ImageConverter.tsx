import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    FormControl, InputLabel, Select, MenuItem, useTheme
} from '@mui/material';
import { CloudUpload, Download, Transform } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';
import ServicePageShell from './ServicePageShell';

const ImageConverter: React.FC = () => {
    const theme = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [outputFormat, setOutputFormat] = useState('png');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ file_url: string; format: string } | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
            setError(null);
            setResult(null);
        }
    };

    const handleConvert = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('format', outputFormat);

        try {
            const response = await apiClient.post(endpoints.services.imageConvert, formData);
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

    const formats = [
        { value: 'png', label: 'PNG', desc: 'Lossless, transparent' },
        { value: 'jpg', label: 'JPG', desc: 'Small size, web' },
        { value: 'webp', label: 'WebP', desc: 'Modern, smallest' },
        { value: 'gif', label: 'GIF', desc: 'Animation support' },
        { value: 'bmp', label: 'BMP', desc: 'Uncompressed' },
        { value: 'tiff', label: 'TIFF', desc: 'Print quality' },
        { value: 'ico', label: 'ICO', desc: 'Favicon' },
    ];

    return (
        <ServicePageShell
            icon={Transform}
            title="Image Format Converter"
            subtitle="Convert images between PNG, JPG, WebP, GIF, and more"
            maxWidth="md"
            about="Image Format Converter re-encodes an uploaded image into a different file format — PNG, JPG, WebP, GIF, BMP, TIFF, or ICO — using Pillow on the server, not in your browser. Converting to JPG (which has no alpha channel) automatically flattens any transparency onto a white background first, and every output is saved at quality 95 for near-lossless results. It's useful when a site or tool needs a specific format your image isn't already in — for example ICO for a favicon, or WebP for a smaller web asset."
            howToSteps={[
                { name: 'Upload an image', text: 'Click the upload box and choose an image file from your device.' },
                { name: 'Pick the output format', text: 'Open the Output Format dropdown and select PNG, JPG, WebP, GIF, BMP, TIFF, or ICO.' },
                { name: 'Convert', text: 'Click Convert to <format> to send the image to the server for re-encoding.' },
                { name: 'Download', text: 'Use the Download button in the success message to save the converted file.' },
            ]}
            faq={[
                { question: 'Which formats can I convert to?', answer: 'PNG, JPG, WebP, GIF, BMP, TIFF, and ICO are all supported as output formats; you can upload pretty much any common image format as the source.' },
                { question: 'What happens to transparency when converting to JPG?', answer: "JPG doesn't support an alpha channel, so any transparent areas are filled with a white background before the image is saved." },
                { question: 'Does conversion reduce image quality?', answer: 'Output is saved at quality 95, which is close to lossless for JPG/WebP; PNG, BMP, and TIFF outputs are effectively unaffected since those formats are lossless anyway.' },
                { question: 'Are uploaded images stored?', answer: "Your image is sent to our server to be re-encoded, and the converted file is kept temporarily so you can download it — it isn't used for anything beyond generating that download." },
            ]}
        >
            <Seo title="Online Image Converter - JPG, PNG, WebP, SVG, GIF" toolId={19} />

            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {result && (
                        <Alert severity="success" sx={{ mb: 2 }} action={
                            <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                                Download {result.format}
                            </Button>
                        }>Converted to {result.format} successfully!</Alert>
                    )}

                    <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 2.5, textAlign: 'center', mb: 2.5 }}>
                        <input accept="image/*" style={{ display: 'none' }} id="image-convert-upload" type="file" onChange={handleFileSelect} />
                        <label htmlFor="image-convert-upload" style={{ cursor: 'pointer' }}>
                            {preview ? (
                                <Box component="img" src={preview} sx={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 2 }} />
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                                    <Typography variant="h6">Upload image</Typography>
                                </>
                            )}
                        </label>
                    </Box>

                    <FormControl fullWidth sx={{ mb: 2.5 }}>
                        <InputLabel>Output Format</InputLabel>
                        <Select value={outputFormat} label="Output Format" onChange={(e) => setOutputFormat(e.target.value)}>
                            {formats.map(f => (
                                <MenuItem key={f.value} value={f.value}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                        <span>{f.label}</span>
                                        <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {loading && <LinearProgress sx={{ mb: 2 }} />}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleConvert}
                        disabled={!file || loading}
                        startIcon={<Transform />}
                        sx={{ py: 1.25 }}
                    >
                        {loading ? 'Converting...' : `Convert to ${outputFormat.toUpperCase()}`}
                    </Button>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ImageConverter;
