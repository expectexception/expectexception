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
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Seo
                title="AI Text to Speech (TTS) - Natural Voice Generator"
                description="Convert text to natural-sounding speech instantly with our free AI Text to Speech (TTS) tool. Supports multiple languages and lifelike voices."
                keywords={[
                    'text to speech',
                    'tts',
                    'ai voice generator',
                    'online text reader',
                    'speech synthesis',
                    'mp3 generator',
                    'natural voice synthesis',
                    'free tts online',
                    'ai speech generator',
                    'convert text to audio',
                    'neural text to speech',
                    'google tts online',
                    'high quality ai voices',
                    'text to audio converter free',
                    'voiceover generator ai',
                    'read my text aloud',
                    'automated voice generator'
                ]}
            />

            <Typography variant="h3" gutterBottom sx={{ fontWeight: 800, textAlign: 'center', mb: 4 }}>
                Text to Speech
            </Typography>

            <Card sx={{ bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 4 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
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
                        sx={{ mb: 3 }}
                    />

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 4, flexWrap: 'wrap' }}>
                        <TextField
                            select
                            label="Language"
                            value={lang}
                            onChange={(e) => setLang(e.target.value)}
                            sx={{ minWidth: 150 }}
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
                            sx={{ minWidth: 150 }}
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
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <VolumeUp />}
                            sx={{ px: 4 }}
                        >
                            {loading ? 'Converting...' : 'Convert to Audio'}
                        </Button>
                    </Box>

                    {audioUrl && (
                        <Box sx={{ mt: 4, p: 3, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                            <audio controls src={audioUrl} style={{ width: '100%', marginBottom: '16px' }}>
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
