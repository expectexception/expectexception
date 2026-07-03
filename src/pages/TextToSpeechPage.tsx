import React, { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    MenuItem,
    Alert,
    CircularProgress,
} from '@mui/material';
import Seo from '../components/seo/Seo';
import ServicePageHero from '../components/services/ServicePageHero';
import { VolumeUp, Download } from '@mui/icons-material';
import apiClient, { API_BASE_URL } from '../api/config';
import { endpoints } from '../api/endpoints';
import { saveAs } from 'file-saver';

const TextToSpeechPage: React.FC = () => {
    const [text, setText] = useState('');
    const [lang, setLang] = useState('en');
    const [gender, setGender] = useState('Female'); // Male or Female
    const [loading, setLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'hi', name: 'Hindi' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh-CN', name: 'Chinese (Simplified)' },
        { code: 'ru', name: 'Russian' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
    ];

    // Voices handled by backend now mapping Lang + Gender to Neural Voice

    const handleConvert = async () => {
        if (!text) {
            setError('Please enter some text');
            return;
        }

        setLoading(true);
        setError(null);
        setAudioUrl(null);

        try {
            const response = await apiClient.post(endpoints.services.tts, { text, lang, gender });
            // Should get full URL from backend, but if relative, prepend BASE_URL
            const url = response.data.audio_url.startsWith('http')
                ? response.data.audio_url
                : `${API_BASE_URL}${response.data.audio_url}`;
            setAudioUrl(url);
        } catch (err: any) {
            console.error('TTS Error:', err);
            setError(err.response?.data?.error || 'Failed to convert text to speech');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo
                title="AI Text to Speech (TTS) - Natural Voice Generator"
                toolId={16}
            />

            <ServicePageHero
                icon={VolumeUp}
                title="Text to Speech"
                subtitle="Convert any written text into natural-sounding speech using advanced neural AI voices."
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3
            }}>
                <CardContent sx={{ p: 1 }}>
                    {error && (
                        <Alert severity="error" variant="filled" sx={{ mb: 4, borderRadius: '12px' }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        placeholder="Enter text to convert..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        sx={{
                            mb: 4,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                            }
                        }}
                    />

                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                        <TextField
                            select
                            label="Language"
                            value={lang}
                            onChange={(e) => setLang(e.target.value)}
                            sx={{
                                minWidth: 160,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                }
                            }}
                            size="small"
                        >
                            {languages.map((l) => (
                                <MenuItem key={l.code} value={l.code}>
                                    {l.name}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Voice Gender"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            sx={{
                                minWidth: 160,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                }
                            }}
                            size="small"
                        >
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                        </TextField>

                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleConvert}
                            disabled={loading || !text}
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <VolumeUp />}
                            sx={{
                                px: 4,
                                py: 1.2,
                                borderRadius: '10px',
                                fontWeight: 700,
                                ml: 'auto'
                            }}
                        >
                            {loading ? 'Converting...' : 'Convert to Audio'}
                        </Button>
                    </Box>

                    {audioUrl && (
                        <Box sx={{
                            mt: 5,
                            p: 3,
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px',
                            textAlign: 'center'
                        }}>
                            <audio controls src={audioUrl} style={{ width: '100%', marginBottom: '20px' }}>
                                Your browser does not support the audio element.
                            </audio>
                            <Button
                                onClick={() => {
                                    if (audioUrl) {
                                        saveAs(audioUrl, 'speech.mp3');
                                    }
                                }}
                                variant="outlined"
                                startIcon={<Download />}
                                sx={{
                                    py: 1,
                                    px: 4,
                                    borderRadius: '10px'
                                }}
                            >
                                Download MP3
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default TextToSpeechPage;
