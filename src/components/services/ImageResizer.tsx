import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, Alert, LinearProgress,
    TextField, FormControlLabel, Switch, Grid, alpha
} from '@mui/material';
import { Image, CloudUpload, Download, AspectRatio } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const ImageResizer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [maintainAspect, setMaintainAspect] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ file_url: string; original_size: string; new_size: string } | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
            setError(null);
            setResult(null);
        }
    };

    const handleResize = async () => {
        if (!file || (!width && !height)) {
            setError('Please provide width or height');
            return;
        }
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);
        if (width) formData.append('width', width);
        if (height) formData.append('height', height);
        formData.append('maintain_aspect', maintainAspect.toString());

        try {
            const response = await apiClient.post(endpoints.services.imageResize, formData);
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Resize failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Seo
                title="Resize Images Online - Pixel & Percentage Scaler"
                description="Resize your images by pixels or percentage while maintaining aspect ratio. Fast, free, and simple online tool for photo scaling."
                keywords={[
                    'resize image',
                    'photo resizer',
                    'image scaler online',
                    'change image dimensions',
                    'free image resizer',
                    'online image resizer',
                    'free image scaling',
                    'web image editor',
                    'developer image tool',
                    'batch photo resizer free'
                ]}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Image Resizer
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Resize images to custom dimensions
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {result && (
                <Alert severity="success" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" href={result.file_url} target="_blank" startIcon={<Download />}>
                        Download
                    </Button>
                }>Resized from {result.original_size} to {result.new_size}</Alert>
            )}

            <Card>
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

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField fullWidth label="Width (px)" type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth label="Height (px)" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                        </Grid>
                    </Grid>

                    <FormControlLabel
                        control={<Switch checked={maintainAspect} onChange={(e) => setMaintainAspect(e.target.checked)} />}
                        label="Maintain aspect ratio"
                        sx={{ mt: 2 }}
                    />

                    {loading && <LinearProgress sx={{ mt: 2 }} />}

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleResize}
                        disabled={!file || loading}
                        startIcon={<AspectRatio />}
                        sx={{ mt: 3, py: 1.5 }}
                    >
                        {loading ? 'Resizing...' : 'Resize Image'}
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default ImageResizer;
