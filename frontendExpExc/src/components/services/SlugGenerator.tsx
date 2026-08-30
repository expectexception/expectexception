import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, TextField, Button, Snackbar,
    ToggleButton, ToggleButtonGroup, FormControlLabel, Checkbox,
} from '@mui/material';
import { Link as LinkIcon, ContentCopy } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type SeparatorChoice = '-' | '_';

const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

function slugify(text: string, separator: SeparatorChoice, lowercase: boolean): string {
    let result = text
        .normalize('NFKD')
        .replace(COMBINING_DIACRITICS, ''); // strip combining accent marks left behind by NFKD decomposition

    if (lowercase) result = result.toLowerCase();

    result = result
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // drop anything that isn't alphanumeric, whitespace, - or _
        .trim()
        .replace(/[\s_-]+/g, separator);

    // Trim leading/trailing separators left over from punctuation at the edges
    const escaped = separator === '-' ? '\\-' : '_';
    return result.replace(new RegExp(`^${escaped}+|${escaped}+$`, 'g'), '');
}

const SlugGenerator: React.FC = () => {
    const [input, setInput] = useState('10 Best Practices for Writing Clean Code (2026 Guide)!');
    const [separator, setSeparator] = useState<SeparatorChoice>('-');
    const [lowercase, setLowercase] = useState(true);
    const [snackbar, setSnackbar] = useState(false);

    const slug = useMemo(() => slugify(input, separator, lowercase), [input, separator, lowercase]);

    const handleCopy = () => {
        navigator.clipboard.writeText(slug);
        setSnackbar(true);
    };

    return (
        <ServicePageShell
            icon={LinkIcon}
            title="Slug Generator"
            subtitle="Turn a title into a clean, URL-safe slug: lowercase, accents stripped, punctuation removed"
            maxWidth="sm"
            toolId={83}
            seoTitle="Slug Generator | Convert Text to a URL-Friendly Slug"
            seoDescription="Free online slug generator. Paste a title or sentence and instantly get a clean, URL-safe slug with accents stripped, punctuation removed and your choice of hyphen or underscore separator."
            keywords={['slug generator', 'url slug generator', 'text to slug', 'slugify text online', 'seo url generator', 'permalink generator']}
            about="Converts any title or sentence into a slug: the lowercase, hyphen-separated form used in URLs, like the part after the last slash in a blog post link. It normalizes accented characters to their closest plain-ASCII equivalent (é becomes e, ü becomes u), strips punctuation that is not safe in a URL, and collapses runs of whitespace or separators down to one, all live as you type."
            howToSteps={[
                { name: 'Paste or type your title', text: 'Enter the title, heading or sentence you want turned into a slug.' },
                { name: 'Choose a separator', text: 'Pick a hyphen (the common choice for URLs and most SEO guidance) or an underscore.' },
                { name: 'Copy the slug', text: 'The slug updates as you type. Click Copy to copy it to your clipboard.' },
            ]}
            faq={[
                {
                    question: 'Why do accented characters get replaced instead of removed?',
                    answer: 'Simply deleting an accented letter would turn "café" into "caf", losing a real letter. Instead, this tool normalizes the text with Unicode NFKD decomposition, which splits each accented character into its base letter plus a separate combining accent mark, then strips only the accent marks. That turns "café" into "cafe", keeping every letter and dropping only the diacritic.',
                },
                {
                    question: 'Why hyphens instead of underscores?',
                    answer: 'Google has stated that it treats a hyphen as a word separator in URLs but treats an underscore as joining two words into one token, which can make search engines read "clean-code" as two words but "clean_code" as a single word "cleancode". That is why hyphens are the standard recommendation for SEO-facing URLs, though underscores remain a valid choice for internal identifiers, filenames or systems where that distinction does not matter.',
                },
                {
                    question: 'What happens to numbers, apostrophes and other punctuation?',
                    answer: "Numbers are kept as-is. Apostrophes, quotation marks, colons, parentheses and other punctuation are removed outright rather than converted to a separator, so \"Baker's Dozen\" becomes \"bakers-dozen\", not \"baker-s-dozen\". Whitespace, hyphens and underscores already in the text are all treated as word breaks and collapsed into a single instance of whichever separator you picked.",
                },
                {
                    question: 'Is my text sent anywhere?',
                    answer: 'No. The conversion runs entirely in JavaScript in your browser using built-in string normalization; nothing you type is transmitted to a server.',
                },
            ]}
        >
            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                overflowY: 'auto',
            }}>
                <CardContent sx={{ p: 1 }}>
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={5}
                        label="Title or text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    <Box sx={{
                        p: 2.5,
                        borderRadius: '12px',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        fontFamily: 'monospace',
                        fontSize: '1rem',
                        textAlign: 'center',
                        mb: 2,
                        wordBreak: 'break-all',
                        border: '1px solid rgba(255,255,255,0.08)',
                        minHeight: '3em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {slug || <Typography color="text.disabled">slug will appear here</Typography>}
                    </Box>

                    <Button fullWidth variant="contained" startIcon={<ContentCopy />} onClick={handleCopy} disabled={!slug} sx={{ mb: 3 }}>
                        Copy slug
                    </Button>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Separator</Typography>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={separator}
                        onChange={(_, v) => { if (v !== null) setSeparator(v); }}
                        sx={{ mb: 2 }}
                    >
                        <ToggleButton value="-">hyphen (-)</ToggleButton>
                        <ToggleButton value="_">underscore (_)</ToggleButton>
                    </ToggleButtonGroup>

                    <FormControlLabel
                        control={<Checkbox checked={lowercase} onChange={e => setLowercase(e.target.checked)} />}
                        label="Force lowercase"
                    />
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="Slug copied to clipboard!" />
        </ServicePageShell>
    );
};

export default SlugGenerator;
