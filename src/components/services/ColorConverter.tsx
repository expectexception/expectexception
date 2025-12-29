import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, TextField, Grid, Stack, Chip
} from '@mui/material';
import { Palette, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';
import { isReactSnap } from '../../utils/isReactSnap';

const ColorConverter: React.FC = () => {
    const [color, setColor] = useState('#3b82f6');
    const [result, setResult] = useState<{ hex: string; rgb: string; hsl: string; r: number; g: number; b: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleConvert = async () => {
        setLoading(true);
        try {
            const response = await apiClient.post(endpoints.services.colorConverter, {
                color: color,
                from: 'hex',
            });
            setResult(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (value: string) => {
        navigator.clipboard.writeText(value);
    };

    // Convert on input change after debounce
    React.useEffect(() => {
        if (isReactSnap()) {
            return;
        }
        if (color.match(/^#[0-9A-Fa-f]{6}$/)) {
            handleConvert();
        }
    }, [color]);

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Seo
                title="Color Converter & Code Generator - HEX, RGB, HSL, CMYK"
                toolId={22}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Color Converter
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Convert colors between HEX, RGB, and HSL formats
            </Typography>

            <Card>
                <CardContent sx={{ p: 4 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Pick a Color</Typography>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    style={{ width: 60, height: 60, cursor: 'pointer', border: 'none', borderRadius: 8 }}
                                />
                                <TextField
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    label="HEX"
                                    placeholder="#3b82f6"
                                    sx={{ flex: 1 }}
                                />
                            </Box>

                            {/* Color Preview */}
                            <Box
                                sx={{
                                    mt: 3,
                                    height: 150,
                                    borderRadius: 2,
                                    bgcolor: color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Typography
                                    sx={{
                                        color: result && (result.r * 0.299 + result.g * 0.587 + result.b * 0.114) > 186 ? '#000' : '#fff',
                                        fontWeight: 600,
                                    }}
                                >
                                    {color}
                                </Typography>
                            </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Color Values</Typography>
                            {result && (
                                <Stack spacing={2}>
                                    {[
                                        { label: 'HEX', value: result.hex },
                                        { label: 'RGB', value: result.rgb },
                                        { label: 'HSL', value: result.hsl },
                                    ].map((item) => (
                                        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Chip label={item.label} size="small" sx={{ minWidth: 50 }} />
                                            <TextField
                                                fullWidth
                                                size="small"
                                                value={item.value}
                                                InputProps={{ readOnly: true }}
                                                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                                            />
                                            <Button
                                                size="small"
                                                onClick={() => handleCopy(item.value)}
                                                startIcon={<ContentCopy />}
                                            >
                                                Copy
                                            </Button>
                                        </Box>
                                    ))}

                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>RGB Components</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Chip label={`R: ${result.r}`} color="error" />
                                            <Chip label={`G: ${result.g}`} color="success" />
                                            <Chip label={`B: ${result.b}`} color="primary" />
                                        </Stack>
                                    </Box>
                                </Stack>
                            )}
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Container>
    );
};

export default ColorConverter;
