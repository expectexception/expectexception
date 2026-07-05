import React, { useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, Button, Grid, Divider } from '@mui/material';
import { Schedule, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

const TimestampConverter: React.FC = () => {
    const [epoch, setEpoch] = useState(Math.floor(Date.now() / 1000).toString());
    const [isoInput, setIsoInput] = useState(new Date().toISOString().slice(0, 19));

    const epochDate = (() => {
        const n = Number(epoch);
        if (!epoch || Number.isNaN(n)) return null;
        // Accept both seconds and milliseconds epochs
        const ms = epoch.length > 10 ? n : n * 1000;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d;
    })();

    const isoDate = (() => {
        const d = new Date(isoInput);
        return Number.isNaN(d.getTime()) ? null : d;
    })();

    const useNow = () => {
        const now = new Date();
        setEpoch(Math.floor(now.getTime() / 1000).toString());
        setIsoInput(now.toISOString().slice(0, 19));
    };

    const copy = (text: string) => navigator.clipboard.writeText(text);

    return (
        <ServicePageShell
            icon={Schedule}
            title="Timestamp Converter"
            subtitle="Convert between Unix epoch time and human-readable dates - computed locally in your browser."
            maxWidth="md"
            about="Converts between Unix epoch time and human-readable dates in both directions. Enter an epoch value and it detects whether you meant seconds or milliseconds based on the number of digits, then shows the equivalent ISO 8601 string, UTC string, and your local time. Enter a date/time instead and it shows the equivalent epoch in both seconds and milliseconds. All conversion happens locally using the browser's native Date object and Intl API; nothing is sent to a server."
            howToSteps={[
                { name: 'Start from now (optional)', text: 'Click Use Current Time to fill both fields with the current moment.' },
                { name: 'Convert an epoch to a date', text: 'Type a Unix timestamp into the Unix Epoch (seconds or ms) field — the ISO, UTC, and local time equivalents appear below it immediately.' },
                { name: 'Convert a date to an epoch', text: 'Or pick a date/time in the Date / Time field — the equivalent epoch in seconds and milliseconds appears below it.' },
                { name: 'Copy the result', text: 'Click Copy ISO or Copy Epoch to copy the converted value to your clipboard.' },
            ]}
            faq={[
                { question: 'How does it know if my epoch is in seconds or milliseconds?', answer: 'By digit count: a value longer than 10 digits is treated as milliseconds, 10 digits or fewer is treated as seconds. This covers virtually all real timestamps (10-digit second-based epochs run until the year 2286).' },
                { question: 'What timezone does it show?', answer: "Both — the epoch conversion shows the UTC time (via toUTCString) and your browser's local time (via toLocaleString), and the footer shows your resolved IANA timezone (e.g. America/New_York) using the Intl API." },
                { question: 'Is this computed locally or sent to a server?', answer: "Entirely locally — it's just JavaScript's native Date object doing the math in your browser; nothing is transmitted anywhere." },
                { question: 'What date formats can I enter on the date side?', answer: "The Date / Time field is a native datetime-local input, so it accepts whatever your browser's date/time picker produces — you don't need to type a specific string format." },
            ]}
        >
            <Seo title="Unix Timestamp / Epoch Converter - Free Online Tool" toolId={32} />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
            }}>
                <CardContent sx={{ p: 1 }}>
                    <Button variant="outlined" onClick={useNow} sx={{ mb: 3 }}>Use Current Time</Button>

                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Unix Epoch (seconds or ms)</Typography>
                            <TextField fullWidth value={epoch} onChange={(e) => setEpoch(e.target.value)} placeholder="1700000000" sx={{ mb: 2 }} />
                            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.02)', minHeight: 90 }}>
                                {epochDate ? (
                                    <>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{epochDate.toISOString()}</Typography>
                                        <Typography variant="body2" color="text.secondary">{epochDate.toUTCString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">{epochDate.toLocaleString()} (local)</Typography>
                                    </>
                                ) : (
                                    <Typography variant="body2" color="error">Invalid epoch value</Typography>
                                )}
                            </Box>
                            {epochDate && (
                                <Button size="small" startIcon={<ContentCopy />} onClick={() => copy(epochDate.toISOString())} sx={{ mt: 1 }}>
                                    Copy ISO
                                </Button>
                            )}
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Date / Time</Typography>
                            <TextField
                                fullWidth
                                type="datetime-local"
                                value={isoInput}
                                onChange={(e) => setIsoInput(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.02)', minHeight: 90 }}>
                                {isoDate ? (
                                    <>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{Math.floor(isoDate.getTime() / 1000)} (seconds)</Typography>
                                        <Typography variant="body2" color="text.secondary">{isoDate.getTime()} (milliseconds)</Typography>
                                    </>
                                ) : (
                                    <Typography variant="body2" color="error">Invalid date</Typography>
                                )}
                            </Box>
                            {isoDate && (
                                <Button size="small" startIcon={<ContentCopy />} onClick={() => copy(String(Math.floor(isoDate.getTime() / 1000)))} sx={{ mt: 1 }}>
                                    Copy Epoch
                                </Button>
                            )}
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />
                    <Typography variant="caption" color="text.secondary">
                        Your browser timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </Typography>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default TimestampConverter;
