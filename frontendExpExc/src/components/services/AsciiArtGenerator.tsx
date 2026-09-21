import React, { useCallback, useMemo, useState } from 'react';
import {
    Box, Button, Card, IconButton, MenuItem, Select, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { TextFormat, ContentCopy, Check, Download } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import ServicePageShell from './ServicePageShell';

/* Each font maps a character to a fixed-height block of rows, '#' marking an
 * "on" cell and ' ' marking "off". Every glyph in a font shares the same row
 * count (its glyph height) so lines interleave correctly regardless of which
 * characters appear in the input; column width may vary per-glyph (used as
 * each character's natural width, with a blank column gap between letters). */
type Font = { height: number; glyphs: Record<string, string[]> };

const BLOCK_FONT: Font = {
    height: 5,
    glyphs: {
        A: ['.##.', '#..#', '####', '#..#', '#..#'],
        B: ['###.', '#..#', '###.', '#..#', '###.'],
        C: ['.###', '#...', '#...', '#...', '.###'],
        D: ['###.', '#..#', '#..#', '#..#', '###.'],
        E: ['####', '#...', '###.', '#...', '####'],
        F: ['####', '#...', '###.', '#...', '#...'],
        G: ['.###', '#...', '#.##', '#..#', '.###'],
        H: ['#..#', '#..#', '####', '#..#', '#..#'],
        I: ['###', '.#.', '.#.', '.#.', '###'],
        J: ['..##', '...#', '...#', '#..#', '.##.'],
        K: ['#..#', '#.#.', '##..', '#.#.', '#..#'],
        L: ['#...', '#...', '#...', '#...', '####'],
        M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
        N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
        O: ['.##.', '#..#', '#..#', '#..#', '.##.'],
        P: ['###.', '#..#', '###.', '#...', '#...'],
        Q: ['.##.', '#..#', '#..#', '.##.', '...#'],
        R: ['###.', '#..#', '###.', '#.#.', '#..#'],
        S: ['.###', '#...', '.##.', '...#', '###.'],
        T: ['###', '.#.', '.#.', '.#.', '.#.'],
        U: ['#..#', '#..#', '#..#', '#..#', '.##.'],
        V: ['#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
        W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
        X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
        Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
        Z: ['####', '..#.', '.#..', '#...', '####'],
        '0': ['.##.', '#..#', '#.##', '##.#', '.##.'],
        '1': ['.#.', '##.', '.#.', '.#.', '###'],
        '2': ['###.', '...#', '.##.', '#...', '####'],
        '3': ['###.', '...#', '.##.', '...#', '###.'],
        '4': ['#..#', '#..#', '####', '...#', '...#'],
        '5': ['####', '#...', '###.', '...#', '###.'],
        '6': ['.##.', '#...', '###.', '#..#', '.##.'],
        '7': ['####', '...#', '..#.', '.#..', '.#..'],
        '8': ['.##.', '#..#', '.##.', '#..#', '.##.'],
        '9': ['.##.', '#..#', '.###', '...#', '.##.'],
        '.': [' ', ' ', ' ', ' ', '#'],
        ',': [' ', ' ', ' ', '#', '#'],
        '!': ['#', '#', '#', ' ', '#'],
        '?': ['.##.', '#..#', '..#.', '....', '.#.'],
        '-': ['   ', '   ', '###', '   ', '   '],
        "'": ['#', '#', ' ', ' ', ' '],
        ':': [' ', '#', ' ', '#', ' '],
        ' ': ['  ', '  ', '  ', '  ', '  '],
    },
};

const SLIM_FONT: Font = {
    height: 3,
    glyphs: {
        A: ['.#.', '###', '#.#'],
        B: ['##.', '##.', '##.'],
        C: ['.##', '#..', '.##'],
        D: ['##.', '#.#', '##.'],
        E: ['###', '##.', '###'],
        F: ['###', '##.', '#..'],
        G: ['.##', '#.#', '.##'],
        H: ['#.#', '###', '#.#'],
        I: ['###', '.#.', '###'],
        J: ['..#', '..#', '##.'],
        K: ['#.#', '##.', '#.#'],
        L: ['#..', '#..', '###'],
        M: ['###', '###', '#.#'],
        N: ['##.', '#.#', '.##'],
        O: ['.#.', '#.#', '.#.'],
        P: ['##.', '##.', '#..'],
        Q: ['.#.', '#.#', '.##'],
        R: ['##.', '##.', '#.#'],
        S: ['.##', '.#.', '##.'],
        T: ['###', '.#.', '.#.'],
        U: ['#.#', '#.#', '.#.'],
        V: ['#.#', '#.#', '.#.'],
        W: ['#.#', '###', '###'],
        X: ['#.#', '.#.', '#.#'],
        Y: ['#.#', '.#.', '.#.'],
        Z: ['###', '.#.', '###'],
        '0': ['.#.', '#.#', '.#.'],
        '1': ['#.', '#.', '#.'],
        '2': ['##.', '.#.', '.##'],
        '3': ['##.', '.#.', '##.'],
        '4': ['#.#', '###', '..#'],
        '5': ['###', '##.', '.##'],
        '6': ['.##', '##.', '.##'],
        '7': ['###', '..#', '..#'],
        '8': ['.#.', '.#.', '.#.'],
        '9': ['##.', '.##', '##.'],
        '.': [' ', ' ', '#'],
        ',': [' ', ' ', '#'],
        '!': ['#', '#', '#'],
        '?': ['##.', '.#.', '.#.'],
        '-': ['  ', '##', '  '],
        "'": ['#', ' ', ' '],
        ':': [' ', '#', ' '],
        ' ': [' ', ' ', ' '],
    },
};

const FONTS: Record<string, Font> = {
    block: BLOCK_FONT,
    slim: SLIM_FONT,
};

const FONT_LABELS: Record<string, string> = {
    block: 'Block (5 rows)',
    slim: 'Slim (3 rows)',
};

const FILL_CHARS = ['#', '*', '█', '@', '+'];

/** Characters this tool can render — anything else is dropped with a note
 * rather than silently mangling alignment. */
function supportedChars(font: Font): Set<string> {
    return new Set(Object.keys(font.glyphs));
}

function render(text: string, font: Font, fill: string): { art: string; unsupported: string[] } {
    const upper = text.toUpperCase();
    const supported = supportedChars(font);
    const unsupported: string[] = [];
    const glyphs: string[][] = [];

    for (const ch of upper) {
        if (supported.has(ch)) {
            glyphs.push(font.glyphs[ch]);
        } else if (!unsupported.includes(ch) && ch.trim() !== '') {
            unsupported.push(ch);
        }
    }

    if (glyphs.length === 0) return { art: '', unsupported };

    const rows: string[] = Array.from({ length: font.height }, () => '');
    glyphs.forEach((glyph, gi) => {
        for (let r = 0; r < font.height; r++) {
            const cells = glyph[r] ?? '';
            rows[r] += cells.replace(/#/g, fill);
            if (gi < glyphs.length - 1) rows[r] += ' ';
        }
    });

    return { art: rows.join('\n'), unsupported };
}

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const AsciiArtGenerator: React.FC = () => {
    const [text, setText] = useState('HELLO');
    const [fontKey, setFontKey] = useState('block');
    const [fill, setFill] = useState('#');
    const [copied, setCopied] = useState(false);

    const font = FONTS[fontKey];
    const { art, unsupported } = useMemo(() => render(text, font, fill), [text, font, fill]);

    const copyArt = useCallback(() => {
        navigator.clipboard.writeText(art);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    }, [art]);

    const downloadArt = useCallback(() => {
        const blob = new Blob([art], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'ascii-art.txt');
    }, [art]);

    const about = "This turns plain text into large banner-style letters built out of a fixed character, the same technique behind classic README splash text, CLI tool startup banners, and figlet output. Each font is a hand-built bitmap: every letter, digit and a handful of punctuation marks is a small grid of on/off cells, and generating the art is just stamping those grids side by side in the fill character of your choice. Everything runs in your browser and the result is plain monospace text, so it pastes cleanly into a terminal, a code comment, or a README's code fence.";

    const howToSteps = [
        { name: 'Type your text', text: 'Letters A-Z, digits 0-9 and a small set of punctuation are supported. Anything else is skipped and listed below the output.' },
        { name: 'Pick a font', text: 'Block is taller and bolder; Slim is more compact for longer text or narrow terminals.' },
        { name: 'Choose a fill character', text: 'Swap between #, *, a solid block, @ or + to match the style you want.' },
        { name: 'Copy or download', text: 'Copy the plain text straight into a README or terminal, or download it as a .txt file.' },
    ];

    const faq = [
        {
            question: 'What is this kind of text actually used for?',
            answer: "Large block letters made of plain characters show up anywhere a splash of visual weight has to survive as plain text: a project name at the top of a README, a startup banner a CLI tool prints before its first prompt, ASCII signatures in code comments, or a terminal welcome screen. Because it is just text, not an image, it renders identically in a raw file, a terminal, an email, or a code block, which is exactly why the format has stuck around since long before anyone could just embed a picture.",
        },
        {
            question: 'Which characters are supported?',
            answer: "A-Z (case-insensitive, everything is rendered uppercase), 0-9, and a small set of punctuation: period, comma, exclamation mark, question mark, hyphen, apostrophe and colon. Anything outside that set, accented letters, symbols, emoji, is skipped rather than guessed at, and listed under the output so you know exactly what was dropped.",
        },
        {
            question: 'Why does this only look right in a monospace font?',
            answer: "The letters are built from a fixed grid of characters lined up in columns, and that alignment only holds if every character occupies the same width, which is what a monospace (fixed-width) font guarantees and a proportional font does not. Pasting the output into a proportional-font context, some rich text editors, most word processors, will visibly warp the shapes. Terminals, code blocks and most code editors default to monospace, which is why this style of text lives almost exclusively in those places.",
        },
        {
            question: 'Why are there two fonts instead of one bigger one?',
            answer: "Block is five rows tall and reads clearly even at a distance, which suits a short title. Slim is three rows and roughly half the width per letter, which keeps longer phrases from wrapping awkwardly in a narrow terminal or a code comment. There is a real trade-off between visual weight and how much text fits on a line, so both are offered rather than picking one for you.",
        },
        {
            question: 'Does this work the same as the figlet command-line tool?',
            answer: "The idea is the same, characters rendered as a grid of blocks, but the fonts here are original and much smaller than figlet's font library, which ships dozens of typefaces built up over decades. This tool trades that breadth for something that needs no installation and runs instantly in a browser tab.",
        },
    ];

    return (
        <ServicePageShell
            icon={TextFormat}
            title="ASCII Art Text Generator"
            subtitle="Turn text into large banner-style letters for READMEs, CLI banners and terminal splash screens"
            maxWidth="md"
            toolId={113}
            seoTitle="ASCII Art Generator - Free Text to ASCII Banner Text"
            seoDescription="Convert text into large ASCII-art banner letters. Two block fonts, five fill characters, copy or download as .txt. Runs entirely in your browser, like a lightweight figlet."
            keywords={['ascii art generator', 'text to ascii art', 'ascii banner text generator', 'figlet online']}
            about={about}
            howToSteps={howToSteps}
            faq={faq}
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
                <Stack spacing={2}>
                    <TextField
                        label="Text"
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, 40))}
                        fullWidth
                        size="small"
                        inputProps={{ spellCheck: false }}
                        helperText={`${text.length}/40 characters`}
                    />

                    <Stack direction="row" spacing={2}>
                        <Select size="small" value={fontKey} onChange={(e) => setFontKey(e.target.value)} sx={{ flex: 1 }}>
                            {Object.keys(FONTS).map((key) => (
                                <MenuItem key={key} value={key}>{FONT_LABELS[key]}</MenuItem>
                            ))}
                        </Select>
                        <Select size="small" value={fill} onChange={(e) => setFill(e.target.value)} sx={{ width: 100 }}>
                            {FILL_CHARS.map((c) => (
                                <MenuItem key={c} value={c} sx={{ fontFamily: 'monospace' }}>{c}</MenuItem>
                            ))}
                        </Select>
                    </Stack>

                    <Box sx={{ ...boxSx, overflowX: 'auto', minHeight: 100 }}>
                        {art ? (
                            <Typography
                                component="pre"
                                sx={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.2, m: 0, color: 'primary.main' }}
                            >
                                {art}
                            </Typography>
                        ) : (
                            <Typography variant="body2" color="text.secondary">Type something above to see the art</Typography>
                        )}
                    </Box>

                    {unsupported.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            Skipped unsupported character{unsupported.length > 1 ? 's' : ''}: {unsupported.join(' ')}
                        </Typography>
                    )}

                    <Stack direction="row" spacing={1.5} justifyContent="center">
                        <Button size="small" variant="outlined" startIcon={copied ? <Check /> : <ContentCopy />} onClick={copyArt} disabled={!art}>
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                        <Tooltip title="Download as .txt">
                            <span>
                                <IconButton size="small" onClick={downloadArt} disabled={!art} sx={{ color: 'text.secondary' }}>
                                    <Download fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Card>
        </ServicePageShell>
    );
};

export default AsciiArtGenerator;
