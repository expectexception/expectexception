import React, { useMemo, useState } from 'react';
import {
    Container, Card, CardContent, Box, Typography, Button, Slider,
    FormControlLabel, Checkbox, Snackbar, LinearProgress,
} from '@mui/material';
import { VpnKey, ContentCopy, Refresh } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from './ServicePageHero';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const generatePassword = (length: number, opts: { lower: boolean; upper: boolean; numbers: boolean; symbols: boolean }): string => {
    let charset = '';
    if (opts.lower) charset += LOWER;
    if (opts.upper) charset += UPPER;
    if (opts.numbers) charset += NUMBERS;
    if (opts.symbols) charset += SYMBOLS;
    if (!charset) return '';

    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues, (v) => charset[v % charset.length]).join('');
};

const scorePassword = (pwd: string): number => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    return Math.min(score, 6);
};

const PasswordGenerator: React.FC = () => {
    const [length, setLength] = useState(16);
    const [lower, setLower] = useState(true);
    const [upper, setUpper] = useState(true);
    const [numbers, setNumbers] = useState(true);
    const [symbols, setSymbols] = useState(true);
    const [password, setPassword] = useState(() => generatePassword(16, { lower: true, upper: true, numbers: true, symbols: true }));
    const [snackbar, setSnackbar] = useState(false);

    const regenerate = () => setPassword(generatePassword(length, { lower, upper, numbers, symbols }));

    const score = useMemo(() => scorePassword(password), [password]);
    const scoreLabel = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong', 'Excellent'][score];
    const scoreColor = score <= 1 ? '#ef4444' : score <= 3 ? '#f59e0b' : '#3dfc55';

    const handleCopy = () => {
        navigator.clipboard.writeText(password);
        setSnackbar(true);
    };

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo title="Secure Password Generator - Free Online Tool" toolId={33} />
            <ServicePageHero
                icon={VpnKey}
                title="Password Generator"
                subtitle="Generate cryptographically random passwords locally using your browser's Web Crypto API - never sent anywhere."
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
                    <Box sx={{
                        p: 2.5,
                        borderRadius: '12px',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        fontFamily: 'monospace',
                        fontSize: '1.15rem',
                        textAlign: 'center',
                        mb: 1,
                        wordBreak: 'break-all',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        {password || 'Select at least one character type'}
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={(score / 6) * 100}
                        sx={{ height: 6, borderRadius: 3, mb: 1, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: scoreColor } }}
                    />
                    <Typography variant="caption" sx={{ color: scoreColor, fontWeight: 700, display: 'block', mb: 3 }}>
                        {password ? scoreLabel : ''}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                        <Button fullWidth variant="contained" startIcon={<Refresh />} onClick={regenerate}>
                            Generate
                        </Button>
                        <Button fullWidth variant="outlined" startIcon={<ContentCopy />} onClick={handleCopy} disabled={!password}>
                            Copy
                        </Button>
                    </Box>

                    <Typography gutterBottom>Length: {length}</Typography>
                    <Slider value={length} onChange={(_, v) => setLength(v as number)} min={6} max={64} sx={{ mb: 2 }} />

                    <FormControlLabel control={<Checkbox checked={lower} onChange={(e) => setLower(e.target.checked)} />} label="Lowercase (a-z)" />
                    <FormControlLabel control={<Checkbox checked={upper} onChange={(e) => setUpper(e.target.checked)} />} label="Uppercase (A-Z)" />
                    <FormControlLabel control={<Checkbox checked={numbers} onChange={(e) => setNumbers(e.target.checked)} />} label="Numbers (0-9)" />
                    <FormControlLabel control={<Checkbox checked={symbols} onChange={(e) => setSymbols(e.target.checked)} />} label="Symbols (!@#$...)" />
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="Password copied to clipboard!" />
        </Container>
    );
};

export default PasswordGenerator;
