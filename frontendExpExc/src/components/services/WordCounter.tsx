import React, { useMemo, useState } from 'react';
import { Card, CardContent, TextField, Grid, Box, Typography } from '@mui/material';
import { TextFields } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

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
        <ServicePageShell
            icon={TextFields}
            title="Word & Character Counter"
            subtitle="Count words, characters, sentences, and paragraphs instantly - runs entirely in your browser."
            maxWidth="md"
            about="Counts words, characters (with and without spaces), sentences, and paragraphs in real time as you type or paste text, and estimates reading time at 200 words per minute — a commonly cited average adult silent-reading speed. Sentences are estimated by counting runs of text ending in ., ! or ?, and paragraphs by splitting on line breaks, so unusual punctuation or formatting can shift the numbers slightly. All counting is computed locally in your browser as you type; nothing is saved or uploaded."
            howToSteps={[
                { name: 'Paste or type your text', text: 'Add your text into the main box.' },
                { name: 'Watch the stats update', text: 'Word, character, sentence, and paragraph counts and reading time all recalculate instantly as you type.' },
                { name: 'Use the numbers as needed', text: 'For example, checking a character limit or making sure a draft meets a word-count requirement.' },
            ]}
            faq={[
                { question: 'How is reading time calculated?', answer: 'It divides the word count by 200 (a commonly cited average reading speed) and rounds up, with a minimum of 1 minute shown.' },
                { question: 'How does it count sentences?', answer: 'It counts runs of characters ending in a period, exclamation mark, or question mark — abbreviations like "Dr." or decimal numbers can occasionally be miscounted as sentence breaks.' },
                { question: 'Does the "Characters" count include spaces?', answer: 'There are two separate stats: "Characters" includes every character including whitespace, and "Characters (no spaces)" strips whitespace first before counting.' },
                { question: 'Is my text stored or sent anywhere?', answer: 'No, all counting happens locally in your browser as you type; nothing is saved or uploaded.' },
            ]}
        >
            <Seo title="Word & Character Counter - Free Online Tool" toolId={29} />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
            }}>
                <CardContent sx={{ p: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <TextField
                        fullWidth
                        multiline
                        minRows={6}
                        placeholder="Paste or type your text here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        sx={{ mb: 3, flex: 1 }}
                    />
                    <Grid container spacing={2} sx={{ flexShrink: 0 }}>
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
        </ServicePageShell>
    );
};

export default WordCounter;
