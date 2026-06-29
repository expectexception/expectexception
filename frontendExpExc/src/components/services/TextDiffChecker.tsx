import React, { useMemo, useState } from 'react';
import { Container, Card, CardContent, Box, Typography, TextField, Grid, Chip } from '@mui/material';
import { Difference } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from './ServicePageHero';

interface DiffLine {
    type: 'same' | 'removed' | 'added';
    text: string;
}

/** Simple line-based LCS diff - good enough for text comparison without pulling in a diff library. */
const diffLines = (a: string[], b: string[]): DiffLine[] => {
    const n = a.length;
    const m = b.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }

    const result: DiffLine[] = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            result.push({ type: 'same', text: a[i] });
            i++; j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            result.push({ type: 'removed', text: a[i] });
            i++;
        } else {
            result.push({ type: 'added', text: b[j] });
            j++;
        }
    }
    while (i < n) { result.push({ type: 'removed', text: a[i] }); i++; }
    while (j < m) { result.push({ type: 'added', text: b[j] }); j++; }
    return result;
};

const TextDiffChecker: React.FC = () => {
    const [left, setLeft] = useState('');
    const [right, setRight] = useState('');

    const diff = useMemo(() => diffLines(left.split('\n'), right.split('\n')), [left, right]);
    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Seo title="Text Diff Checker - Compare Two Texts Online" toolId={34} />
            <ServicePageHero
                icon={Difference}
                title="Text Diff Checker"
                subtitle="Compare two blocks of text line-by-line - computed entirely in your browser, nothing uploaded."
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
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Original</Typography>
                            <TextField fullWidth multiline minRows={8} value={left} onChange={(e) => setLeft(e.target.value)} placeholder="Paste original text..." />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Changed</Typography>
                            <TextField fullWidth multiline minRows={8} value={right} onChange={(e) => setRight(e.target.value)} placeholder="Paste changed text..." />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                        <Chip size="small" label={`+${added} added`} sx={{ bgcolor: 'rgba(61,252,85,0.15)', color: '#3dfc55', fontWeight: 700 }} />
                        <Chip size="small" label={`-${removed} removed`} sx={{ bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700 }} />
                    </Box>

                    <Box sx={{
                        borderRadius: '12px',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        maxHeight: 420,
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                    }}>
                        {diff.length === 0 && (
                            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>Enter text in both boxes to see the diff.</Box>
                        )}
                        {diff.map((line, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    px: 2,
                                    py: 0.5,
                                    whiteSpace: 'pre-wrap',
                                    bgcolor: line.type === 'added' ? 'rgba(61,252,85,0.08)' : line.type === 'removed' ? 'rgba(239,68,68,0.08)' : 'transparent',
                                    color: line.type === 'added' ? '#3dfc55' : line.type === 'removed' ? '#ef4444' : 'text.primary',
                                    borderLeft: line.type === 'added' ? '3px solid #3dfc55' : line.type === 'removed' ? '3px solid #ef4444' : '3px solid transparent',
                                }}
                            >
                                {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.text || ' '}
                            </Box>
                        ))}
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default TextDiffChecker;
