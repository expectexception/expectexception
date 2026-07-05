import React, { useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, Button, Grid } from '@mui/material';
import { TextFormat, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

const toTitleCase = (s: string) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase());
const toSentenceCase = (s: string) => s.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
const toWords = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
const toCamelCase = (s: string) => {
    const words = toWords(s).map(w => w.toLowerCase());
    return words.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');
};
const toPascalCase = (s: string) => toWords(s).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
const toSnakeCase = (s: string) => toWords(s).map(w => w.toLowerCase()).join('_');
const toKebabCase = (s: string) => toWords(s).map(w => w.toLowerCase()).join('-');

const TRANSFORMS: { label: string; fn: (s: string) => string }[] = [
    { label: 'UPPERCASE', fn: (s) => s.toUpperCase() },
    { label: 'lowercase', fn: (s) => s.toLowerCase() },
    { label: 'Title Case', fn: toTitleCase },
    { label: 'Sentence case', fn: toSentenceCase },
    { label: 'camelCase', fn: toCamelCase },
    { label: 'PascalCase', fn: toPascalCase },
    { label: 'snake_case', fn: toSnakeCase },
    { label: 'kebab-case', fn: toKebabCase },
];

const CaseConverter: React.FC = () => {
    const [text, setText] = useState('');

    const copy = (value: string) => navigator.clipboard.writeText(value);

    return (
        <ServicePageShell
            icon={TextFormat}
            title="Case Converter"
            subtitle="Convert text between camelCase, snake_case, kebab-case, Title Case, and more - entirely in your browser."
            maxWidth="md"
            about="Paste or type text once and see it instantly transformed into eight naming conventions at the same time — UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, and kebab-case — instead of running the same string through a converter eight separate times. Word boundaries for the programming-style cases are detected from spaces, hyphens, underscores, and the lowercase-to-uppercase 'hump' inside an existing identifier, so pasting something like myVariableName or my-variable-name still splits into the correct words before recasing. Everything runs locally using plain JavaScript string methods — nothing is uploaded."
            howToSteps={[
                { name: 'Enter your text', text: 'Type or paste text into the box at the top of the tool.' },
                { name: 'Review all 8 conversions', text: 'Every casing style — UPPERCASE, camelCase, snake_case, and the rest — updates instantly below as you type.' },
                { name: 'Copy the one you need', text: 'Click "Copy" under the specific case format you want to use.' },
            ]}
            faq={[
                { question: 'How does it decide where one word ends and the next begins?', answer: 'It splits on spaces, hyphens (-), and underscores (_), and also on the boundary between a lowercase letter and the uppercase letter that follows it — so "myVariableName" and "my-variable-name" both resolve to the same set of words before being recased.' },
                { question: 'Does it change punctuation or numbers inside words?', answer: 'No — punctuation and digits are preserved as-is; only the casing convention and word separators change.' },
                { question: 'Is my text uploaded anywhere?', answer: "No, all conversions run entirely in your browser using JavaScript's built-in string methods; nothing is sent to a server." },
                { question: "What's the difference between Title Case and Sentence case?", answer: 'Title Case capitalizes the first letter of every word. Sentence case only capitalizes the very first letter of the text and the first letter after sentence-ending punctuation (., !, ?), lowercasing everything else.' },
            ]}
        >
            <Seo title="Case Converter - camelCase, snake_case, Title Case & More" toolId={35} />

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
                    <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        placeholder="Type or paste text here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        sx={{ mb: 4 }}
                    />

                    <Grid container spacing={2}>
                        {TRANSFORMS.map((t) => {
                            const value = text ? t.fn(text) : '';
                            return (
                                <Grid item xs={12} sm={6} key={t.label}>
                                    <Box sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="caption" color="primary.main" fontWeight={700}>{t.label}</Typography>
                                            <Button size="small" startIcon={<ContentCopy fontSize="small" />} onClick={() => copy(value)} disabled={!value}>
                                                Copy
                                            </Button>
                                        </Box>
                                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all', minHeight: 24 }}>
                                            {value || '—'}
                                        </Typography>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default CaseConverter;
