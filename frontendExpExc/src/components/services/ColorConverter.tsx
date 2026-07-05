import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box, TextField, Grid, Stack, Chip,
} from '@mui/material';
import { Palette, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [color]);

    return (
        <ServicePageShell
            icon={Palette}
            title="Color Converter"
            subtitle="Convert colors between HEX, RGB, and HSL formats"
            about="Color Converter takes a hex color and returns its equivalent RGB and HSL values. Somewhat unusually for a conversion this simple, the calculation actually runs on our backend — every time you enter a complete 6-digit hex code, the app posts it to our color-converter API, which does the HEX-to-RGB-to-HSL math in Python and sends the values back. There's no separate 'Convert' button: values update automatically as soon as you type or pick a valid color."
            howToSteps={[
                { name: 'Pick a color', text: 'Use the color swatch to pick a color, or type a 6-digit hex code directly into the HEX field.' },
                { name: 'Read the values', text: 'Once a valid hex code is entered, the HEX, RGB, and HSL rows fill in automatically.' },
                { name: 'Copy a value', text: 'Click Copy next to any row to copy that specific value to your clipboard.' },
                { name: 'Check the components', text: 'Look at the R / G / B chips below the values for the individual 0-255 color channel numbers.' },
            ]}
            faq={[
                { question: 'Do I need to type the # symbol?', answer: 'No — a plain 6-digit code like 3b82f6 or a code with the # prefix both work, as long as it\'s exactly 6 hex characters.' },
                { question: 'Does it support 3-digit hex shortcuts like #fff?', answer: 'No — conversion only triggers automatically for a full 6-digit hex code.' },
                { question: 'Can I convert from RGB or HSL instead of hex?', answer: 'Not in this UI — input is always a hex color; the tool outputs the matching RGB and HSL values alongside it.' },
                { question: 'Is my color data stored anywhere?', answer: "The hex value is sent to our server just to compute the conversion and isn't saved or logged against your account." },
            ]}
        >
            <Seo
                title="Color Converter & Code Generator - HEX, RGB, HSL, CMYK"
                toolId={22}
            />

            <Card sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Pick a Color</Typography>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    style={{ width: 56, height: 56, cursor: 'pointer', border: 'none', borderRadius: 8 }}
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
                                    mt: 2.5,
                                    height: 110,
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
                                <Stack spacing={1.5}>
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

                                    <Box sx={{ mt: 1 }}>
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
        </ServicePageShell>
    );
};

export default ColorConverter;
