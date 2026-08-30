import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, TextField, Button, Snackbar,
    ToggleButton, ToggleButtonGroup, FormControlLabel, Checkbox, Chip,
} from '@mui/material';
import { Sort, ContentCopy, Shuffle } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type SortMode = 'none' | 'alpha-asc' | 'alpha-desc' | 'length-asc' | 'length-desc' | 'shuffle';

function processLines(
    input: string,
    opts: { sortMode: SortMode; dedupe: boolean; caseSensitiveDedupe: boolean; trimLines: boolean; removeEmpty: boolean; shuffleSeed: number },
): string[] {
    let lines = input.split('\n');

    if (opts.trimLines) lines = lines.map(l => l.trim());
    if (opts.removeEmpty) lines = lines.filter(l => l.trim() !== '');

    if (opts.dedupe) {
        const seen = new Set<string>();
        lines = lines.filter(l => {
            const key = opts.caseSensitiveDedupe ? l : l.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    switch (opts.sortMode) {
        case 'alpha-asc':
            lines = [...lines].sort((a, b) => a.localeCompare(b));
            break;
        case 'alpha-desc':
            lines = [...lines].sort((a, b) => b.localeCompare(a));
            break;
        case 'length-asc':
            lines = [...lines].sort((a, b) => a.length - b.length);
            break;
        case 'length-desc':
            lines = [...lines].sort((a, b) => b.length - a.length);
            break;
        case 'shuffle': {
            // Deterministic per-click shuffle: a mulberry32 PRNG seeded from
            // opts.shuffleSeed, so the result changes only when Shuffle is
            // clicked again, not on every keystroke while typing the list.
            let seed = opts.shuffleSeed;
            const rand = () => {
                seed |= 0;
                seed = (seed + 0x6d2b79f5) | 0;
                let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
            lines = [...lines];
            for (let i = lines.length - 1; i > 0; i--) {
                const j = Math.floor(rand() * (i + 1));
                [lines[i], lines[j]] = [lines[j], lines[i]];
            }
            break;
        }
        default:
            break;
    }

    return lines;
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: 'none', label: 'Original order' },
    { value: 'alpha-asc', label: 'A → Z' },
    { value: 'alpha-desc', label: 'Z → A' },
    { value: 'length-asc', label: 'Shortest first' },
    { value: 'length-desc', label: 'Longest first' },
];

const ListSorterDeduplicator: React.FC = () => {
    const [input, setInput] = useState('banana\napple\ncherry\napple\nBanana\ndate');
    const [sortMode, setSortMode] = useState<SortMode>('alpha-asc');
    const [dedupe, setDedupe] = useState(true);
    const [caseSensitiveDedupe, setCaseSensitiveDedupe] = useState(false);
    const [trimLines, setTrimLines] = useState(true);
    const [removeEmpty, setRemoveEmpty] = useState(true);
    const [shuffleSeed, setShuffleSeed] = useState(1);
    const [snackbar, setSnackbar] = useState(false);

    const inputLineCount = input.split('\n').length;

    const result = useMemo(
        () => processLines(input, { sortMode, dedupe, caseSensitiveDedupe, trimLines, removeEmpty, shuffleSeed }),
        [input, sortMode, dedupe, caseSensitiveDedupe, trimLines, removeEmpty, shuffleSeed],
    );

    const output = result.join('\n');
    const removedCount = inputLineCount - result.length;

    const handleShuffle = () => {
        setSortMode('shuffle');
        setShuffleSeed(Date.now() & 0x7fffffff);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(output);
        setSnackbar(true);
    };

    return (
        <ServicePageShell
            icon={Sort}
            title="List Sorter & Deduplicator"
            subtitle="Sort, deduplicate, trim and clean up a list of lines, all live as you type"
            maxWidth="md"
            toolId={86}
            seoTitle="List Sorter & Deduplicator | Sort, Dedupe & Clean a List Online"
            seoDescription="Paste a list of lines and sort alphabetically or by length, remove duplicates, trim whitespace, and drop empty lines, all instantly in your browser."
            keywords={['list sorter online', 'remove duplicate lines', 'sort list alphabetically', 'text list deduplicator', 'dedupe list online', 'shuffle list online']}
            about="Takes a list of lines, one item per line, and cleans it up: sort alphabetically or by length in either direction, remove duplicate lines (with a choice of case-sensitive or case-insensitive matching), trim leading and trailing whitespace from every line, drop empty lines, or shuffle the whole list into a random order. Every option updates the result live as you type or toggle it."
            howToSteps={[
                { name: 'Paste your list', text: 'One item per line. Blank lines and extra spacing are fine, the cleanup options below handle them.' },
                { name: 'Pick a sort order', text: 'Choose alphabetical, reverse alphabetical, by length, or leave it in its original order.' },
                { name: 'Toggle deduplication and cleanup', text: 'Turn on duplicate removal, whitespace trimming, and empty-line removal as needed.' },
                { name: 'Copy the result', text: 'The cleaned-up list updates live. Click Copy to grab it.' },
            ]}
            faq={[
                {
                    question: 'What does case-sensitive deduplication actually change?',
                    answer: 'With it off, "Apple" and "apple" are treated as the same line and only the first one is kept. With it on, they\'re treated as distinct lines and both survive. Which one you want depends on whether the list is something like a set of usernames, where case might genuinely matter, or plain words, where it usually doesn\'t.',
                },
                {
                    question: 'Does shuffle change the result every time I type?',
                    answer: "No, only when you click Shuffle. The shuffle uses a seed set at the moment you click, not the current time on every render, so the order stays stable while you keep editing the list or other options, and only changes when you deliberately click Shuffle again for a fresh random order.",
                },
                {
                    question: 'What order do the cleanup steps run in?',
                    answer: 'Trimming happens first, then empty-line removal, then deduplication, then sorting last. That order matters: trimming before deduplication means "apple" and " apple " with trailing whitespace count as the same line if trimming is on, and sorting happens after everything else so the final order reflects the already-cleaned list.',
                },
                {
                    question: 'Is my list sent anywhere?',
                    answer: 'No. Every operation here runs in JavaScript in your browser using built-in string methods. Nothing you paste is transmitted to a server.',
                },
            ]}
        >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Card sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: 3,
                }}>
                    <CardContent sx={{ p: 1 }}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={10}
                            maxRows={16}
                            label="Input (one item per line)"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            sx={{ mb: 2 }}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
                        />

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Sort order</Typography>
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={sortMode === 'shuffle' ? null : sortMode}
                            onChange={(_, v) => { if (v !== null) setSortMode(v); }}
                            sx={{ mb: 2, flexWrap: 'wrap' }}
                        >
                            {SORT_OPTIONS.map(opt => (
                                <ToggleButton key={opt.value} value={opt.value} sx={{ fontSize: '0.75rem' }}>{opt.label}</ToggleButton>
                            ))}
                        </ToggleButtonGroup>

                        <Box sx={{ mb: 1 }}>
                            <Button size="small" startIcon={<Shuffle />} variant={sortMode === 'shuffle' ? 'contained' : 'outlined'} onClick={handleShuffle}>
                                Shuffle
                            </Button>
                        </Box>

                        <FormControlLabel
                            control={<Checkbox checked={dedupe} onChange={e => setDedupe(e.target.checked)} />}
                            label="Remove duplicate lines"
                        />
                        {dedupe && (
                            <FormControlLabel
                                sx={{ ml: 2, display: 'block' }}
                                control={<Checkbox checked={caseSensitiveDedupe} onChange={e => setCaseSensitiveDedupe(e.target.checked)} />}
                                label="Case-sensitive"
                            />
                        )}
                        <FormControlLabel
                            control={<Checkbox checked={trimLines} onChange={e => setTrimLines(e.target.checked)} />}
                            label="Trim whitespace from each line"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={removeEmpty} onChange={e => setRemoveEmpty(e.target.checked)} />}
                            label="Remove empty lines"
                        />
                    </CardContent>
                </Card>

                <Card sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: 3,
                    height: 'fit-content',
                }}>
                    <CardContent sx={{ p: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">Result</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip size="small" label={`${result.length} lines`} />
                                {removedCount > 0 && <Chip size="small" color="warning" label={`${removedCount} removed`} />}
                            </Box>
                        </Box>
                        <Box sx={{
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: 'rgba(0,0,0,0.4)',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            border: '1px solid rgba(255,255,255,0.08)',
                            mb: 2,
                            minHeight: 260,
                            maxHeight: 400,
                            overflowY: 'auto',
                        }}>
                            {output || <Typography color="text.disabled">result will appear here</Typography>}
                        </Box>
                        <Button fullWidth variant="contained" startIcon={<ContentCopy />} onClick={handleCopy} disabled={!output}>
                            Copy result
                        </Button>
                    </CardContent>
                </Card>
            </Box>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="Copied to clipboard!" />
        </ServicePageShell>
    );
};

export default ListSorterDeduplicator;
