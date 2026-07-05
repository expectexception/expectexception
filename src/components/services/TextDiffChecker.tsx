import React, { useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, Grid, Chip, useTheme, alpha } from '@mui/material';
import { Difference } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

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
    const theme = useTheme();
    const addedColor = theme.palette.primary.main;
    const removedColor = theme.palette.error.main;
    const [left, setLeft] = useState('');
    const [right, setRight] = useState('');

    const diff = useMemo(() => diffLines(left.split('\n'), right.split('\n')), [left, right]);
    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;

    return (
        <ServicePageShell
            icon={Difference}
            title="Text Diff Checker"
            subtitle="Compare two blocks of text line-by-line - computed entirely in your browser, nothing uploaded."
            maxWidth="md"
            about="Compares two blocks of text line by line and highlights which lines were added, removed, or left unchanged, using a longest-common-subsequence (LCS) algorithm implemented directly in the component rather than pulling in a diff library. Paste the original version on the left and the changed version on the right, and the comparison recomputes on every keystroke. Useful for spotting exactly what changed between two versions of a config file, an email draft, or a paragraph of copy. Runs entirely client-side — nothing is uploaded."
            howToSteps={[
                { name: 'Paste the original text', text: 'Add the first version into the "Original" box on the left.' },
                { name: 'Paste the changed version', text: 'Add the second version into the "Changed" box on the right.' },
                { name: 'Read the highlighted diff', text: 'Removed lines are highlighted in red with a "-" prefix, added lines in the accent color with a "+" prefix; unchanged lines show no highlight.' },
                { name: 'Check the summary chips', text: 'The "+N added" / "-N removed" chips above the diff give a quick count without reading every line.' },
            ]}
            faq={[
                { question: 'Does this compare word-by-word or line-by-line?', answer: 'Line-by-line — it splits both inputs on newlines and diffs whole lines, so even a single-character edit on a line marks that entire line as removed and its replacement as added, rather than highlighting just the changed word.' },
                { question: 'Is there a size limit on how much text I can compare?', answer: "The underlying algorithm is O(n×m) in the number of lines in each input, so very large documents (thousands of lines) can feel slower since the diff recomputes in your browser on every keystroke." },
                { question: 'Is my text uploaded to compare it?', answer: 'No, the comparison runs entirely in your browser; neither text box is sent anywhere.' },
                { question: 'Why does a moved paragraph sometimes show up as both a removal and an addition?', answer: "The algorithm aligns identical lines wherever they best match between the two inputs, but a paragraph that moved to a very different position — especially alongside edited neighboring lines — can show up as a removal at the old spot and an addition at the new one rather than being recognized as a pure move." },
            ]}
        >
            <Seo title="Text Diff Checker - Compare Two Texts Online" toolId={34} />

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
                    <Grid container spacing={3} sx={{ mb: 3, flexShrink: 0 }}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Original</Typography>
                            <TextField fullWidth multiline minRows={4} maxRows={6} value={left} onChange={(e) => setLeft(e.target.value)} placeholder="Paste original text..." />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Changed</Typography>
                            <TextField fullWidth multiline minRows={4} maxRows={6} value={right} onChange={(e) => setRight(e.target.value)} placeholder="Paste changed text..." />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexShrink: 0 }}>
                        <Chip size="small" label={`+${added} added`} sx={{ bgcolor: alpha(addedColor, 0.15), color: addedColor, fontWeight: 700 }} />
                        <Chip size="small" label={`-${removed} removed`} sx={{ bgcolor: alpha(removedColor, 0.15), color: removedColor, fontWeight: 700 }} />
                    </Box>

                    <Box sx={{
                        borderRadius: '12px',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        flex: 1,
                        minHeight: 0,
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
                                    bgcolor: line.type === 'added' ? alpha(addedColor, 0.08) : line.type === 'removed' ? alpha(removedColor, 0.08) : 'transparent',
                                    color: line.type === 'added' ? addedColor : line.type === 'removed' ? removedColor : 'text.primary',
                                    borderLeft: line.type === 'added' ? `3px solid ${addedColor}` : line.type === 'removed' ? `3px solid ${removedColor}` : '3px solid transparent',
                                }}
                            >
                                {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.text || ' '}
                            </Box>
                        ))}
                    </Box>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default TextDiffChecker;
