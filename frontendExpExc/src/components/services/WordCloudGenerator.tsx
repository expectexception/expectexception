import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Grid, Stack, Chip,
    Button, FormControlLabel, Checkbox, Divider, useTheme, alpha,
} from '@mui/material';
import { Cloud, Refresh, Download } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Word frequency + a real (if simple) spiral placement algorithm on a
 * single <canvas>. Words are sorted by frequency, then each one is
 * walked outward from the canvas center along an Archimedean spiral,
 * testing its measured bounding box against every word already placed
 * until a free spot is found. There is no external layout library
 * involved — just canvas.measureText() and axis-aligned rectangle
 * overlap tests.
 * ------------------------------------------------------------------ */

const SAMPLE_TEXT = `Good design starts with understanding the people who will use a product. A design that ignores real user needs quickly becomes a design nobody wants to use, no matter how polished it looks. Designers who spend time watching how people actually work tend to build better products, because usability problems that are invisible on paper become obvious the moment a real person tries to complete a real task. Simplicity is not about removing features for their own sake, it is about removing friction so the important features stay easy to find and easy to use. The best products feel almost invisible, quietly doing their job while the person using them focuses on their actual goal instead of fighting the interface. That is the real measure of good design: not how it looks in a screenshot, but how little it gets in the way.`;

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'been',
    'being', 'in', 'on', 'at', 'to', 'of', 'for', 'with', 'this', 'that',
    'these', 'those', 'it', 'its', 'as', 'be', 'by', 'from', 'has', 'have',
    'had', 'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very', 'can',
    'will', 'would', 'should', 'could', 'may', 'might', 'must', 'shall',
    'do', 'does', 'did', 'doing', 'i', 'you', 'he', 'she', 'we', 'they',
    'them', 'his', 'her', 'our', 'your', 'their', 'what', 'which', 'who',
    'whom', 'there', 'here', 'when', 'where', 'why', 'how', 'all', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
    'just', 'about', 'into', 'over', 'after', 'before', 'between', 'out',
    'up', 'down', 'off', 'again', 'further', 'once', 'also', 'nobody',
]);

const PALETTE = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#fb923c'];

const MIN_FONT = 14;
const MAX_FONT = 64;
const MAX_CLOUD_WORDS = 60;
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 560;

interface WordCount {
    word: string;
    count: number;
}

interface Analysis {
    totalWords: number;
    uniqueWords: number;
    topWords: WordCount[];
    layoutWords: WordCount[];
}

function analyzeText(text: string, filterStopWords: boolean, minLength: number, excludeRaw: string): Analysis {
    // Annotated: `match() || []` otherwise infers RegExpMatchArray | never[],
    // which collapses the element type to never for the array below.
    const rawWords: string[] = text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
    const excluded = new Set(
        excludeRaw.split(',').map(w => w.trim().toLowerCase()).filter(Boolean),
    );

    const frequency = new Map<string, number>();
    rawWords.forEach((word) => {
        if (word.length < minLength) return;
        if (filterStopWords && STOP_WORDS.has(word)) return;
        if (excluded.has(word)) return;
        frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    const sorted = Array.from(frequency.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));

    return {
        totalWords: rawWords.length,
        uniqueWords: sorted.length,
        topWords: sorted.slice(0, 5),
        layoutWords: sorted.slice(0, MAX_CLOUD_WORDS),
    };
}

interface PlacedWord extends WordCount {
    x: number;
    y: number;
    fontSize: number;
    color: string;
    rotated: boolean;
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** Deterministic small PRNG so a given seed always lays the same words out
 * the same way, while a new seed (the Regenerate button) shuffles the
 * starting spiral angle and rotation choices into a visibly different
 * arrangement. */
function makeRandom(seed: number) {
    let state = seed % 2147483647;
    if (state <= 0) state += 2147483646;
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

function layoutWordCloud(ctx: CanvasRenderingContext2D, words: WordCount[], seed: number): PlacedWord[] {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const maxRadius = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);
    const random = makeRandom(seed);

    const counts = words.map(w => w.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    const placed: PlacedWord[] = [];

    words.forEach((entry, index) => {
        const t = maxCount === minCount ? 0.5 : (entry.count - minCount) / (maxCount - minCount);
        const fontSize = Math.round(MIN_FONT + t * (MAX_FONT - MIN_FONT));
        const rotated = random() < 0.2;
        const color = PALETTE[index % PALETTE.length];

        ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
        const textWidth = ctx.measureText(entry.word).width;
        const textHeight = fontSize * 1.15;
        const padding = 6;
        const boxWidth = (rotated ? textHeight : textWidth) + padding;
        const boxHeight = (rotated ? textWidth : textHeight) + padding;

        const startAngle = random() * Math.PI * 2;
        let x = centerX;
        let y = centerY;
        let placedOk = false;

        for (let step = 0; step < 4000 && !placedOk; step++) {
            const radius = 2.4 * Math.sqrt(step);
            if (radius > maxRadius) break;
            const angle = startAngle + step * 0.32;
            x = centerX + radius * Math.cos(angle);
            y = centerY + radius * Math.sin(angle) * 0.72; // flatten slightly for a wide canvas

            const left = x - boxWidth / 2;
            const top = y - boxHeight / 2;
            const right = left + boxWidth;
            const bottom = top + boxHeight;

            if (left < 4 || top < 4 || right > CANVAS_WIDTH - 4 || bottom > CANVAS_HEIGHT - 4) continue;

            const collides = placed.some(p => left < p.right && right > p.left && top < p.bottom && bottom > p.top);
            if (!collides) {
                placed.push({ ...entry, x, y, fontSize, color, rotated, left, top, right, bottom });
                placedOk = true;
            }
        }
        // If no free spot was found before the spiral ran off the canvas,
        // the word is simply left out — the cloud stays legible instead of
        // stacking text on top of itself.
    });

    return placed;
}

const WordCloudGenerator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [text, setText] = useState(SAMPLE_TEXT);
    const [filterStopWords, setFilterStopWords] = useState(true);
    const [minLength, setMinLength] = useState(3);
    const [excludeRaw, setExcludeRaw] = useState('');
    const [seed, setSeed] = useState(1);

    const analysis = useMemo(
        () => analyzeText(text, filterStopWords, minLength, excludeRaw),
        [text, filterStopWords, minLength, excludeRaw],
    );

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        ctx.fillStyle = theme.palette.background.default;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (analysis.layoutWords.length === 0) return;

        const placed = layoutWordCloud(ctx, analysis.layoutWords, seed);
        placed.forEach((word) => {
            ctx.save();
            ctx.translate(word.x, word.y);
            if (word.rotated) ctx.rotate(-Math.PI / 2);
            ctx.font = `700 ${word.fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = word.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(word.word, 0, 0);
            ctx.restore();
        });
    }, [analysis.layoutWords, seed, theme.palette.background.default]);

    useEffect(() => {
        draw();
    }, [draw]);

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'word-cloud.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <ServicePageShell
            icon={Cloud}
            title="Word Cloud Generator"
            subtitle="Turn any text into a word-frequency cloud, sized and laid out entirely in your browser"
            maxWidth="lg"
            toolId={77}
            seoTitle="Word Cloud Generator | Free Text-to-Word-Cloud Tool Online"
            seoDescription="Paste text and generate a word cloud sized by word frequency, with stopword filtering, a minimum word length, custom exclusions and a PNG download. Runs entirely in your browser."
            keywords={['word cloud generator', 'text to word cloud', 'word frequency visualizer', 'tag cloud maker', 'word cloud maker online', 'text frequency analyzer', 'free word cloud generator']}
            about={'Paste any block of text and this tool counts how often each word appears, then draws the more frequent words larger on a canvas. Common words like "the" and "and" are filtered out by default, since they show up in almost every sentence and would otherwise dominate the cloud without saying much about the content. The layout works by placing the most frequent word first near the center, then walking outward in a spiral for each remaining word until it finds a spot that does not overlap anything already placed. It is not a professional typesetting engine, so on dense text a handful of lower-frequency words can get skipped if the canvas runs out of room. Everything runs in your browser: nothing you type is uploaded anywhere, and the finished cloud can be saved as a PNG.'}
            howToSteps={[
                { name: 'Paste your text', text: 'Drop in an article, transcript or set of notes. A sample paragraph is loaded by default so you can see how the tool behaves right away.' },
                { name: 'Adjust the filters', text: 'Toggle stopword filtering, change the minimum word length, or list extra words to exclude. The cloud updates as soon as you change anything.' },
                { name: 'Regenerate or download', text: 'Click Regenerate for a different layout of the same words, or Download PNG to save the image.' },
            ]}
            faq={[
                { question: 'What counts as a "word"?', answer: 'Any run of letters and numbers, treated case-insensitively and stripped of surrounding punctuation. Contractions such as "don\'t" are kept together as one word.' },
                { question: 'Why are some common words missing?', answer: 'By default the tool filters out a list of roughly 90 common English function words, things like "the", "of" and "is", since they would otherwise dominate the layout without telling you much about the content. Turn stopword filtering off if you want to see them anyway.' },
                { question: 'Why did a word from my text not appear in the cloud?', answer: 'A few possible reasons. It may have been removed by the minimum word length, the stopword list or your own exclude list. If your text is long and varied, the layout can also run out of room: the cloud is capped at the 60 most frequent words so the canvas stays readable.' },
                { question: 'Is my text uploaded anywhere?', answer: 'No. Word counting and the canvas layout both run in your browser\'s JavaScript. Nothing you paste is sent to a server.' },
            ]}
        >
            <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Text</Typography>
                            <TextField
                                multiline
                                minRows={8}
                                fullWidth
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Paste or type your text here…"
                                sx={{ mb: 2.5 }}
                            />

                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Filters</Typography>
                            <FormControlLabel
                                control={<Checkbox size="small" checked={filterStopWords} onChange={e => setFilterStopWords(e.target.checked)} />}
                                label={<Typography variant="body2">Filter common stopwords ("the", "and", "is"…)</Typography>}
                                sx={{ mb: 1 }}
                            />
                            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                <TextField
                                    label="Min word length"
                                    type="number"
                                    size="small"
                                    value={minLength}
                                    onChange={e => setMinLength(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                                    inputProps={{ min: 1, max: 20 }}
                                    sx={{ width: 150 }}
                                />
                            </Stack>
                            <TextField
                                fullWidth
                                size="small"
                                label="Also exclude (comma-separated)"
                                placeholder="e.g. product, design"
                                value={excludeRaw}
                                onChange={e => setExcludeRaw(e.target.value)}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="subtitle2" fontWeight={800}>Cloud</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {analysis.layoutWords.length} word{analysis.layoutWords.length === 1 ? '' : 's'} shown
                                </Typography>
                            </Stack>

                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 220,
                                    maxHeight: 420,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 2,
                                    p: 1.5,
                                    mb: 2,
                                    bgcolor: alpha(primary, 0.03),
                                    border: `1px dashed ${alpha(primary, 0.3)}`,
                                }}
                            >
                                {analysis.layoutWords.length === 0 ? (
                                    <Typography variant="body2" color="text.disabled" textAlign="center">
                                        Not enough words left after filtering. Try a shorter minimum length or turn off stopword filtering.
                                    </Typography>
                                ) : (
                                    <canvas
                                        ref={canvasRef}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            width: 'auto',
                                            height: 'auto',
                                            objectFit: 'contain',
                                            borderRadius: 8,
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                                        }}
                                    />
                                )}
                            </Box>

                            <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Refresh />}
                                    onClick={() => setSeed(s => s + 1)}
                                    disabled={analysis.layoutWords.length === 0}
                                >
                                    Regenerate
                                </Button>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<Download />}
                                    onClick={handleDownload}
                                    disabled={analysis.layoutWords.length === 0}
                                >
                                    Download PNG
                                </Button>
                            </Stack>

                            <Divider sx={{ mb: 1.5 }} />
                            <Typography variant="caption" color="text.secondary">
                                {analysis.totalWords.toLocaleString()} words analyzed · {analysis.uniqueWords.toLocaleString()} unique after filtering
                            </Typography>
                            {analysis.topWords.length > 0 && (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                    {analysis.topWords.map(({ word, count }) => (
                                        <Chip
                                            key={word}
                                            label={`${word} · ${count}`}
                                            size="small"
                                            sx={{ bgcolor: alpha(primary, 0.1), color: primary, fontWeight: 600 }}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default WordCloudGenerator;
