import React, { useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, Button, Stack } from '@mui/material';
import { Code, ContentCopy, SwapVert } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

const encodeEntities = (s: string): string => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
};

const decodeEntities = (s: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = s;
    return textarea.value;
};

const HtmlEntityCodec: React.FC = () => {
    const [mode, setMode] = useState<'encode' | 'decode'>('encode');
    const [input, setInput] = useState('');

    const output = input ? (mode === 'encode' ? encodeEntities(input) : decodeEntities(input)) : '';

    const swap = () => {
        setMode(mode === 'encode' ? 'decode' : 'encode');
        setInput(output);
    };

    const copy = () => navigator.clipboard.writeText(output);

    return (
        <ServicePageShell
            icon={Code}
            title="HTML Entity Encoder / Decoder"
            subtitle="Encode special characters to HTML entities, or decode them back - all processed locally."
            maxWidth="md"
            about="Converts characters that have special meaning in HTML — like <, >, &, and quotes — into their entity equivalents (e.g. &lt;, &amp;), or reverses the process to decode entities back into readable text. Useful when you need to safely embed user-generated text inside HTML markup, or when you're staring at a string that looks double-encoded and want to see what it actually says. Rather than a hand-rolled character map, the conversion hands the string to the browser's own DOM parser — creating a text node and reading its innerHTML to encode, or setting innerHTML on a hidden textarea and reading its value to decode — so results match exactly what the browser itself would produce."
            howToSteps={[
                { name: 'Pick Encode or Decode', text: 'Click the button above the input box to choose a direction.' },
                { name: 'Enter your text', text: 'Type or paste the plain text (or entity-encoded HTML) into the input box.' },
                { name: 'Read the result', text: 'The converted string appears immediately in the result panel below.' },
                { name: 'Swap or copy', text: 'Click "Swap & convert" to move the result back into the input and flip direction, or "Copy Result" to copy it.' },
            ]}
            faq={[
                { question: 'Does this cover every HTML entity, or just the common ones?', answer: "It relies on the browser's own HTML parser rather than a fixed lookup table, so it handles every named and numeric entity the browser itself recognizes, not just a hand-picked list of common ones." },
                { question: 'Is anything sent to a server?', answer: 'No — encoding and decoding happen locally by creating DOM elements in memory; nothing leaves your browser.' },
                { question: 'Does it convert accented letters or emoji into numeric entities?', answer: "No. Only the characters HTML treats as special (<, >, &, \", ') get converted; letters like é or emoji are left as literal Unicode characters, since browsers render UTF-8 text fine without entity-encoding it." },
                { question: 'Why would I need to decode entities?', answer: "Handy when you've copied HTML source or an API response where characters show up as &lt;div&gt; instead of <div>, and you want the readable text back." },
            ]}
        >
            <Seo title="HTML Entity Encoder / Decoder - Free Online Tool" toolId={36} />

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
                    <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                        <Button
                            variant={mode === 'encode' ? 'contained' : 'outlined'}
                            onClick={() => setMode('encode')}
                        >
                            Encode
                        </Button>
                        <Button
                            variant={mode === 'decode' ? 'contained' : 'outlined'}
                            onClick={() => setMode('decode')}
                        >
                            Decode
                        </Button>
                    </Stack>

                    <Typography variant="subtitle2" gutterBottom>
                        {mode === 'encode' ? 'Plain text' : 'HTML with entities'}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={5}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={mode === 'encode' ? 'Type text with <special> & "characters"...' : 'Type &lt;text&gt; with entities...'}
                        sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <Button startIcon={<SwapVert />} onClick={swap} size="small">
                            Swap & convert
                        </Button>
                    </Box>

                    <Typography variant="subtitle2" gutterBottom>Result</Typography>
                    <Box sx={{
                        p: 2,
                        borderRadius: '10px',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        minHeight: 80,
                        wordBreak: 'break-all',
                        whiteSpace: 'pre-wrap',
                        mb: 2,
                    }}>
                        {output || '—'}
                    </Box>
                    <Button variant="contained" startIcon={<ContentCopy />} onClick={copy} disabled={!output}>
                        Copy Result
                    </Button>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default HtmlEntityCodec;
