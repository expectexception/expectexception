import React, { useState, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Grid, Paper, Chip,
    LinearProgress, Stack, Divider, useTheme, alpha,
} from '@mui/material';
import { Article } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Readability scoring.
 *
 * Flesch Reading Ease and Flesch-Kincaid Grade both need a syllable
 * count, which English does not make easy. The heuristic below counts
 * vowel groups and applies the usual corrections (silent trailing 'e',
 * '-le' endings); it is approximate by nature, so scores are presented
 * as a band rather than a precise figure.
 * ------------------------------------------------------------------ */

function countSyllables(word: string): number {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0;
    if (w.length <= 3) return 1;

    // Trailing silent 'e' ("make"), but not "-le" after a consonant ("table"),
    // which keeps its own syllable.
    let trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    trimmed = trimmed.replace(/^y/, '');

    const groups = trimmed.match(/[aeiouy]{1,2}/g);
    return Math.max(1, groups ? groups.length : 1);
}

interface Stats {
    characters: number;
    charactersNoSpaces: number;
    words: number;
    sentences: number;
    paragraphs: number;
    syllables: number;
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
    readingEase: number;
    gradeLevel: number;
    readingMinutes: number;
    speakingMinutes: number;
    longWords: number;
    topWords: { word: string; count: number }[];
}

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for',
    'with', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this',
    'that', 'these', 'those', 'as', 'by', 'from', 'has', 'have', 'had', 'not',
    'you', 'your', 'we', 'our', 'they', 'their', 'i', 'he', 'she', 'his', 'her',
]);

function analyze(text: string): Stats | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Annotated: `match() || []` otherwise infers RegExpMatchArray | never[],
    // which collapses the element type to never in the reduce below.
    const words: string[] = trimmed.match(/[A-Za-z0-9'’-]+/g) || [];
    // Split on terminal punctuation; a trailing fragment with no punctuation
    // still counts as a sentence so short inputs are not scored as zero.
    const sentences = trimmed.split(/[.!?]+(?:\s|$)/).filter(s => s.trim().length > 0);
    const paragraphs = trimmed.split(/\n{2,}/).filter(p => p.trim().length > 0);

    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = wordCount ? syllables / wordCount : 0;

    const readingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    const frequency = new Map<string, number>();
    for (const raw of words) {
        const w = raw.toLowerCase();
        if (w.length < 3 || STOP_WORDS.has(w)) continue;
        frequency.set(w, (frequency.get(w) || 0) + 1);
    }
    const topWords = Array.from(frequency.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
        .slice(0, 8);

    return {
        characters: text.length,
        charactersNoSpaces: text.replace(/\s/g, '').length,
        words: wordCount,
        sentences: sentenceCount,
        paragraphs: Math.max(1, paragraphs.length),
        syllables,
        avgWordsPerSentence,
        avgSyllablesPerWord,
        readingEase: Math.max(0, Math.min(100, readingEase)),
        gradeLevel: Math.max(0, gradeLevel),
        readingMinutes: wordCount / 238,   // silent reading, Brysbaert 2019
        speakingMinutes: wordCount / 150,  // typical presentation pace
        longWords: words.filter(w => countSyllables(w) >= 3).length,
        topWords,
    };
}

function easeBand(score: number): { label: string; detail: string; color: string } {
    if (score >= 80) return { label: 'Very easy', detail: 'Around a 6th-grade reading level', color: '#10b981' };
    if (score >= 60) return { label: 'Plain English', detail: 'Around an 8th–9th-grade level — a good target for most writing', color: '#22c55e' };
    if (score >= 50) return { label: 'Fairly difficult', detail: 'Around a 10th–12th-grade level', color: '#f59e0b' };
    if (score >= 30) return { label: 'Difficult', detail: 'College-level reading', color: '#f97316' };
    return { label: 'Very difficult', detail: 'Postgraduate level — consider shorter sentences', color: '#ef4444' };
}

function formatMinutes(minutes: number): string {
    if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} sec`;
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return s ? `${m} min ${s} sec` : `${m} min`;
}

const StatTile: React.FC<{ label: string; value: string | number; hint?: string }> = ({ label, value, hint }) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    return (
        <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha(primary, 0.03), border: `1px solid ${alpha(primary, 0.12)}`, height: '100%' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>{label.toUpperCase()}</Typography>
            <Typography variant="h5" fontWeight={900} sx={{ color: primary, lineHeight: 1.3 }}>{value}</Typography>
            {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
        </Paper>
    );
};

const ReadabilityAnalyzer: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [text, setText] = useState('');

    const stats = useMemo(() => analyze(text), [text]);
    const band = stats ? easeBand(stats.readingEase) : null;

    return (
        <ServicePageShell
            icon={Article}
            title="Readability & Text Analyzer"
            subtitle="Word counts, reading time, and how hard your writing is to read"
            maxWidth="lg"
            seoTitle="Readability Checker & Word Counter | Flesch Reading Ease Online"
            seoDescription="Paste your writing to get word and sentence counts, estimated reading and speaking time, Flesch Reading Ease, Flesch-Kincaid grade level and your most-repeated words. Runs entirely in your browser."
            toolId={65}
            keywords={['readability checker', 'flesch reading ease calculator', 'word counter', 'reading time calculator', 'flesch kincaid grade level', 'text analyzer online', 'writing readability score', 'speech time calculator']}
            about="Two pieces of writing with the same word count can be wildly different to read. This analyzer reports the plain counts — characters, words, sentences, paragraphs — alongside the two Flesch measures, which score difficulty from average sentence length and average syllables per word. Long sentences packed with long words score badly, and that is usually the fix: break the sentence up. You also get estimated silent-reading and spoken-aloud times, useful for sizing an article or a talk, plus the words you lean on most often. Everything is computed in your browser as you type, so unpublished drafts are not sent anywhere."
            howToSteps={[
                { name: 'Paste your text', text: 'Drop in an article, email, essay or script. Statistics update live as you type.' },
                { name: 'Check the reading ease band', text: 'Aim for 60 or above for general audiences. Lower scores mean longer sentences and more complex words.' },
                { name: 'Act on the detail', text: 'If the grade level is high, shorten your longest sentences first — average sentence length moves the score most.' },
            ]}
            faq={[
                { question: 'What is a good Flesch Reading Ease score?', answer: 'For a general audience, 60 to 70 is a good target — that is plain English at roughly an 8th to 9th grade level. Technical writing for specialists often sits between 30 and 50, which is fine when the readers are experts.' },
                { question: 'How is reading time calculated?', answer: 'Silent reading uses 238 words per minute, the mean for adults reading English non-fiction in Brysbaert\'s 2019 meta-analysis. Speaking time uses 150 words per minute, a typical presentation pace.' },
                { question: 'How accurate is the syllable count?', answer: 'It is a heuristic. English spelling makes exact syllable counting hard without a dictionary, so the counter uses vowel groups with corrections for common patterns like silent trailing "e". It is accurate enough for a readability band, but treat the exact number as an estimate.' },
                { question: 'Is my text sent anywhere?', answer: 'No. All analysis runs in JavaScript in your browser, so drafts and unpublished writing stay on your machine.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <TextField
                        multiline
                        minRows={7}
                        fullWidth
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Paste or type your text here…"
                        sx={{ mb: 3 }}
                    />

                    {!stats && (
                        <Typography variant="body2" color="text.disabled" textAlign="center" sx={{ py: 3 }}>
                            Statistics will appear here as you type.
                        </Typography>
                    )}

                    {stats && band && (
                        <>
                            <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, border: `1px solid ${alpha(band.color, 0.4)}`, bgcolor: alpha(band.color, 0.06) }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                            FLESCH READING EASE
                                        </Typography>
                                        <Stack direction="row" alignItems="baseline" spacing={1}>
                                            <Typography variant="h3" fontWeight={900} sx={{ color: band.color }}>
                                                {stats.readingEase.toFixed(0)}
                                            </Typography>
                                            <Chip label={band.label} size="small" sx={{ bgcolor: alpha(band.color, 0.18), color: band.color, fontWeight: 700 }} />
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary">{band.detail}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                            GRADE LEVEL
                                        </Typography>
                                        <Typography variant="h4" fontWeight={900} sx={{ color: primary }}>
                                            {stats.gradeLevel.toFixed(1)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">Flesch–Kincaid</Typography>
                                    </Box>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={stats.readingEase}
                                    sx={{
                                        mt: 2, height: 8, borderRadius: 4,
                                        bgcolor: alpha(band.color, 0.15),
                                        '& .MuiLinearProgress-bar': { bgcolor: band.color, borderRadius: 4 },
                                    }}
                                />
                            </Paper>

                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={4} md={3}><StatTile label="Words" value={stats.words.toLocaleString()} /></Grid>
                                <Grid item xs={6} sm={4} md={3}><StatTile label="Characters" value={stats.characters.toLocaleString()} hint={`${stats.charactersNoSpaces.toLocaleString()} without spaces`} /></Grid>
                                <Grid item xs={6} sm={4} md={3}><StatTile label="Sentences" value={stats.sentences.toLocaleString()} hint={`${stats.avgWordsPerSentence.toFixed(1)} words avg`} /></Grid>
                                <Grid item xs={6} sm={4} md={3}><StatTile label="Paragraphs" value={stats.paragraphs.toLocaleString()} /></Grid>
                                <Grid item xs={6} sm={4} md={3}><StatTile label="Reading time" value={formatMinutes(stats.readingMinutes)} hint="silent, 238 wpm" /></Grid>
                                <Grid item xs={6} sm={4} md={3}><StatTile label="Speaking time" value={formatMinutes(stats.speakingMinutes)} hint="aloud, 150 wpm" /></Grid>
                                <Grid item xs={6} sm={4} md={3}><StatTile label="Syllables" value={stats.syllables.toLocaleString()} hint={`${stats.avgSyllablesPerWord.toFixed(2)} per word`} /></Grid>
                                <Grid item xs={6} sm={4} md={3}><StatTile label="Complex words" value={stats.longWords.toLocaleString()} hint="3+ syllables" /></Grid>
                            </Grid>

                            {stats.topWords.length > 0 && (
                                <>
                                    <Divider sx={{ my: 3 }} />
                                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                                        Most repeated words
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {stats.topWords.map(({ word, count }) => (
                                            <Chip
                                                key={word}
                                                label={`${word} · ${count}`}
                                                size="small"
                                                sx={{ bgcolor: alpha(primary, 0.1), color: primary, fontWeight: 600 }}
                                            />
                                        ))}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        Common filler words are excluded. Heavy repetition of one term is often worth varying.
                                    </Typography>
                                </>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ReadabilityAnalyzer;
