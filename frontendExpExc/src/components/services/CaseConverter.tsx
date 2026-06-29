import React, { useState } from 'react';
import { Container, Card, CardContent, Box, Typography, TextField, Button, Grid } from '@mui/material';
import { TextFormat, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from './ServicePageHero';

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
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Case Converter - camelCase, snake_case, Title Case & More" toolId={35} />
            <ServicePageHero
                icon={TextFormat}
                title="Case Converter"
                subtitle="Convert text between camelCase, snake_case, kebab-case, Title Case, and more - entirely in your browser."
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
        </Container>
    );
};

export default CaseConverter;
