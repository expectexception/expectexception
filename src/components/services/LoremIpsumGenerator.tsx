import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, Button, Slider,
    ToggleButtonGroup, ToggleButton, Snackbar,
} from '@mui/material';
import { Article, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore ' +
    'et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea ' +
    'commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum dolore eu fugiat nulla ' +
    'pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est').split(' ');

const randomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];

const generateSentence = (minWords = 6, maxWords = 16): string => {
    const len = minWords + Math.floor(Math.random() * (maxWords - minWords));
    const words = Array.from({ length: len }, randomWord);
    const sentence = words.join(' ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
};

const generateParagraph = (sentenceCount = 5): string =>
    Array.from({ length: sentenceCount }, () => generateSentence()).join(' ');

type Mode = 'paragraphs' | 'sentences' | 'words';

const LoremIpsumGenerator: React.FC = () => {
    const [mode, setMode] = useState<Mode>('paragraphs');
    const [count, setCount] = useState(3);
    const [startWithLorem, setStartWithLorem] = useState(true);
    const [snackbar, setSnackbar] = useState(false);

    const output = useMemo(() => {
        let result: string[];
        if (mode === 'paragraphs') {
            result = Array.from({ length: count }, () => generateParagraph());
        } else if (mode === 'sentences') {
            result = Array.from({ length: count }, () => generateSentence());
        } else {
            result = [Array.from({ length: count }, randomWord).join(' ')];
        }
        if (startWithLorem && result.length > 0) {
            result[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + result[0];
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, count, startWithLorem]);

    const handleCopy = () => {
        navigator.clipboard.writeText(output.join('\n\n'));
        setSnackbar(true);
    };

    return (
        <ServicePageShell
            icon={Article}
            title="Lorem Ipsum Generator"
            subtitle="Generate placeholder text for mockups and layouts - entirely client-side, no server round-trip."
            maxWidth="md"
            about="Generates classic-style Lorem Ipsum placeholder text for mockups, wireframes, and layout testing. Choose whether to generate paragraphs, sentences, or individual words, pick a count with the slider, and optionally force the output to begin with the traditional 'Lorem ipsum dolor sit amet...' opener. Every sentence is assembled by randomly sampling from the same ~70-word pool used in the standard Lorem Ipsum passage, so the output looks familiar but is different on every generation. Runs entirely client-side — no server round-trip."
            howToSteps={[
                { name: 'Pick a mode', text: 'Choose "Paragraphs", "Sentences", or "Words" from the toggle buttons.' },
                { name: 'Set the count', text: 'Drag the slider to choose how many — up to 20 for paragraphs or sentences, up to 200 for words.' },
                { name: 'Choose the opener', text: 'Toggle "Start with \'Lorem ipsum...\'" on for the classic opening line, or off for fully random text.' },
                { name: 'Copy the result', text: 'Click "Copy to Clipboard" to grab the generated text — a confirmation snackbar appears at the bottom.' },
            ]}
            faq={[
                { question: 'Is the output the same passage every time?', answer: 'No — every sentence is built by randomly picking words from the traditional Lorem Ipsum word pool, so regenerating (or reloading the page) produces different text each time rather than one fixed block.' },
                { question: 'What is the maximum amount I can generate?', answer: 'Up to 20 paragraphs or sentences, or up to 200 words, set with the slider.' },
                { question: "Why does my output start with the same sentence every time?", answer: 'That\'s the "Start with \'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\'" option — turn it off to get fully randomized text with no fixed opener.' },
                { question: 'Is it real Latin?', answer: "No — like traditional Lorem Ipsum, it's scrambled pseudo-Latin word fragments meant to look like running text without being legible or meaningful, so it doesn't distract from a layout preview." },
            ]}
        >
            <Seo title="Lorem Ipsum Generator - Free Placeholder Text" toolId={30} />

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
                    <Box sx={{ mb: 3 }}>
                        <Typography gutterBottom>Generate</Typography>
                        <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} color="primary">
                            <ToggleButton value="paragraphs">Paragraphs</ToggleButton>
                            <ToggleButton value="sentences">Sentences</ToggleButton>
                            <ToggleButton value="words">Words</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography gutterBottom>Count: {count}</Typography>
                        <Slider value={count} onChange={(_, v) => setCount(v as number)} min={1} max={mode === 'words' ? 200 : 20} />
                    </Box>

                    <ToggleButtonGroup
                        value={startWithLorem ? 'on' : 'off'}
                        exclusive
                        onChange={(_, v) => v && setStartWithLorem(v === 'on')}
                        sx={{ mb: 3 }}
                        color="primary"
                    >
                        <ToggleButton value="on">Start with "Lorem ipsum..."</ToggleButton>
                        <ToggleButton value="off">Fully random</ToggleButton>
                    </ToggleButtonGroup>

                    <Box sx={{
                        p: 3,
                        borderRadius: '12px',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        mb: 3,
                        maxHeight: 400,
                        overflow: 'auto',
                    }}>
                        {output.map((p, i) => (
                            <Typography key={i} paragraph sx={{ '&:last-child': { mb: 0 } }}>{p}</Typography>
                        ))}
                    </Box>

                    <Button variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
                        Copy to Clipboard
                    </Button>
                </CardContent>
            </Card>

            <Snackbar
                open={snackbar}
                autoHideDuration={2000}
                onClose={() => setSnackbar(false)}
                message="Copied to clipboard!"
            />
        </ServicePageShell>
    );
};

export default LoremIpsumGenerator;
