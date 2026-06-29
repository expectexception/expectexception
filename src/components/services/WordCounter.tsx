import React, { useMemo, useState } from 'react';
import { Container, Card, CardContent, TextField, Grid, Box, Typography } from '@mui/material';
import { TextFields } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from './ServicePageHero';

const STAT_DEFS: { label: string; compute: (text: string) => number }[] = [
    { label: 'Words', compute: (t) => (t.trim() ? t.trim().split(/\s+/).length : 0) },
    { label: 'Characters', compute: (t) => t.length },
    { label: 'Characters (no spaces)', compute: (t) => t.replace(/\s/g, '').length },
    { label: 'Sentences', compute: (t) => (t.trim() ? (t.match(/[^.!?]+[.!?]+/g) || [t.trim()]).length : 0) },
    { label: 'Paragraphs', compute: (t) => (t.trim() ? t.split(/\n+/).filter(Boolean).length : 0) },
    { label: 'Reading time (min)', compute: (t) => Math.max(1, Math.ceil((t.trim() ? t.trim().split(/\s+/).length : 0) / 200)) },
];

const WordCounter: React.FC = () => {
    const [text, setText] = useState('');
    const stats = useMemo(() => STAT_DEFS.map(s => ({ label: s.label, value: s.compute(text) })), [text]);

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Word & Character Counter - Free Online Tool" toolId={29} />
            <ServicePageHero
                icon={TextFields}
                title="Word & Character Counter"
                subtitle="Count words, characters, sentences, and paragraphs instantly - runs entirely in your browser."
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
                    <TextField
                        fullWidth
                        multiline
                        minRows={10}
                        placeholder="Paste or type your text here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        sx={{ mb: 4 }}
                    />
                    <Grid container spacing={2}>
                        {stats.map((s) => (
                            <Grid item xs={6} sm={4} key={s.label}>
                                <Box sx={{
                                    textAlign: 'center',
                                    p: 2,
                                    borderRadius: '12px',
                                    bgcolor: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}>
                                    <Typography variant="h4" fontWeight={900} color="primary.main">{s.value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>
        </Container>
    );
};

export default WordCounter;
