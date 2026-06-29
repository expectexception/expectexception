import React, { useState } from 'react';
import Seo from '../components/seo/Seo';
import {
    Container,
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Grid,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Fade,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Create,
    Download,
    Refresh,
    FormatColorText,
    Description,
    Settings,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ServicePageHero from '../components/services/ServicePageHero';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

const TextToHandwritingPage: React.FC = () => {
    const [text, setText] = useState('');
    const [font, setFont] = useState('caveat');
    const [paper, setPaper] = useState('plain');
    const [ink, setInk] = useState('blue');
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!text.trim()) {
            setError('Please enter some text');
            return;
        }

        setLoading(true);
        setError('');
        setImageUrl(null);

        try {
            const response = await apiClient.post(endpoints.services.textToHandwriting, {
                text,
                font,
                paper,
                ink,
            }, {
                responseType: 'blob'
            });

            const url = URL.createObjectURL(response.data);
            setImageUrl(url);
        } catch (err) {
            console.error(err);
            setError('Failed to generate handwriting. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (imageUrl) {
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = 'handwriting.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Seo
                title="AI Text to Handwriting | Human-like Handwriting Generator"
                toolId={2}
            />

            <ServicePageHero
                icon={Create}
                title="Text to Handwriting"
                subtitle="Transform digital text into realistic, organic handwriting with just one click."
            />

            <Grid container spacing={4}>
                {/* Controls Area */}
                <Grid item xs={12} md={5}>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        style={{ height: '100%' }}
                    >
                        <Card sx={{
                            height: '100%',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(13, 14, 18, 0.4)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                            p: 2
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                    <Create sx={{ mr: 1, color: 'primary.main' }} />
                                    <Typography variant="h6" fontWeight={800}>Input Text</Typography>
                                </Box>

                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={6}
                                    maxRows={12}
                                    placeholder="Type your text here..."
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    sx={{
                                        mb: 4,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.01)',
                                        }
                                    }}
                                />

                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                    <Settings sx={{ mr: 1, color: 'primary.main' }} />
                                    <Typography variant="h6" fontWeight={800}>Customization</Typography>
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Handwriting Style</InputLabel>
                                            <Select
                                                value={font}
                                                label="Handwriting Style"
                                                onChange={(e) => setFont(e.target.value)}
                                                sx={{ borderRadius: '10px' }}
                                            >
                                                <MenuItem value="caveat">Caveat (Playful)</MenuItem>
                                                <MenuItem value="indie_flower">Indie Flower (Casual)</MenuItem>
                                                <MenuItem value="shadows">Shadows (Neat)</MenuItem>
                                                <MenuItem value="dancing">Dancing Script (Cursive)</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Paper Type</InputLabel>
                                            <Select
                                                value={paper}
                                                label="Paper Type"
                                                onChange={(e) => setPaper(e.target.value)}
                                                sx={{ borderRadius: '10px' }}
                                            >
                                                <MenuItem value="plain">Plain White</MenuItem>
                                                <MenuItem value="lined">Lined Paper</MenuItem>
                                                <MenuItem value="dark">Dark Mode</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Ink Color</InputLabel>
                                            <Select
                                                value={ink}
                                                label="Ink Color"
                                                onChange={(e) => setInk(e.target.value)}
                                                sx={{ borderRadius: '10px' }}
                                            >
                                                <MenuItem value="blue">Blue Ink</MenuItem>
                                                <MenuItem value="black">Black Ink</MenuItem>
                                                <MenuItem value="red">Red Ink</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>

                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    onClick={handleGenerate}
                                    disabled={loading || !text}
                                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Description />}
                                    sx={{
                                        mt: 4,
                                        py: 1.5,
                                        borderRadius: '10px',
                                        fontWeight: 700
                                    }}
                                >
                                    {loading ? 'Generating...' : 'Generate Handwriting'}
                                </Button>
                                {error && (
                                    <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center', fontWeight: 600 }}>
                                        {error}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                {/* Preview Area */}
                <Grid item xs={12} md={7}>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        style={{ height: '100%' }}
                    >
                        <Card sx={{
                            height: '100%',
                            minHeight: 500,
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(13, 14, 18, 0.4)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <CardContent sx={{
                                flexGrow: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                p: 0,
                                bgcolor: 'rgba(0, 0, 0, 0.2)'
                            }}>
                                {imageUrl ? (
                                    <Box sx={{
                                        width: '100%',
                                        height: '100%',
                                        overflow: 'auto',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        p: 3
                                    }}>
                                        <Fade in={true}>
                                            <img
                                                src={imageUrl}
                                                alt="Generated Handwriting"
                                                style={{
                                                    maxWidth: '100%',
                                                    height: 'auto',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                                    border: '1px solid rgba(255,255,255,0.05)'
                                                }}
                                            />
                                        </Fade>
                                    </Box>
                                ) : (
                                    <Box sx={{ textAlign: 'center', p: 4, opacity: 0.5 }}>
                                        <FormatColorText sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary" fontWeight="600">
                                            Preview will appear here
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                            <Box sx={{
                                p: 2.5,
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                bgcolor: 'rgba(0, 0, 0, 0.1)'
                            }}>
                                <Tooltip title="Download Image">
                                    <span>
                                        <Button
                                            variant="outlined"
                                            onClick={handleDownload}
                                            disabled={!imageUrl}
                                            startIcon={<Download />}
                                            sx={{ borderRadius: '10px' }}
                                        >
                                            Download Image
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Box>
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>
        </Container>
    );
};

export default TextToHandwritingPage;
