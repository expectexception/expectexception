import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, Box, Button, Card, IconButton, Slider, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { SettingsInputAntenna, ContentCopy, Check, PlayArrow, Stop, SwapVert } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const TEXT_TO_MORSE: Record<string, string> = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
    I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
    Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
    '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
    ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
    '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
};

const MORSE_TO_TEXT: Record<string, string> = Object.fromEntries(
    Object.entries(TEXT_TO_MORSE).map(([ch, code]) => [code, ch]),
);

/** True when the string looks like Morse (only dots, dashes, spaces and
 * slashes) rather than plain text, used to guess the conversion direction. */
function looksLikeMorse(input: string): boolean {
    const trimmed = input.trim();
    if (trimmed === '') return false;
    return /^[.\-/ ]+$/.test(trimmed);
}

function textToMorse(text: string): { morse: string; unsupported: string[] } {
    const words = text.toUpperCase().split(/\s+/).filter((w) => w !== '');
    const unsupported: string[] = [];
    const morseWords = words.map((word) =>
        Array.from(word)
            .map((ch) => {
                const code = TEXT_TO_MORSE[ch];
                if (code === undefined) {
                    if (!unsupported.includes(ch)) unsupported.push(ch);
                    return null;
                }
                return code;
            })
            .filter((c): c is string => c !== null)
            .join(' '),
    );
    return { morse: morseWords.join(' / '), unsupported };
}

function morseToText(morse: string): { text: string; unsupported: string[] } {
    const words = morse.trim().split('/');
    const unsupported: string[] = [];
    const textWords = words.map((word) =>
        word
            .trim()
            .split(/\s+/)
            .filter((c) => c !== '')
            .map((code) => {
                const ch = MORSE_TO_TEXT[code];
                if (ch === undefined) {
                    if (!unsupported.includes(code)) unsupported.push(code);
                    return '';
                }
                return ch;
            })
            .join(''),
    );
    return { text: textWords.join(' '), unsupported };
}

/* Standard Morse timing, in units: dot = 1, dash = 3, gap between symbols in
 * a letter = 1, gap between letters = 3, gap between words = 7. */
const UNIT_MS_DEFAULT = 90;

function playMorse(morse: string, unitMs: number, ctx: AudioContext, onDone: () => void): () => void {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 0;
    const oscillators: OscillatorNode[] = [];

    const beep = (durationUnits: number) => {
        const start = t / 1000;
        const duration = (durationUnits * unitMs) / 1000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.value = 0.2;
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
        oscillators.push(osc);
        t += durationUnits * unitMs;
    };

    const words = morse.trim().split('/');
    words.forEach((word, wi) => {
        const letters = word.trim().split(/\s+/).filter((l) => l !== '');
        letters.forEach((letter, li) => {
            const symbols = Array.from(letter);
            symbols.forEach((symbol, si) => {
                if (symbol === '.') beep(1);
                else if (symbol === '-') beep(3);
                if (si < symbols.length - 1) t += 1 * unitMs; // gap between symbols within a letter
            });
            if (li < letters.length - 1) t += 3 * unitMs; // gap between letters
        });
        if (wi < words.length - 1) t += 7 * unitMs; // gap between words
    });

    const doneTimer = setTimeout(onDone, t + 50);
    timers.push(doneTimer);

    return () => {
        oscillators.forEach((osc) => {
            try { osc.stop(); } catch { /* already stopped */ }
        });
        timers.forEach(clearTimeout);
    };
}

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const MorseCodeTranslator: React.FC = () => {
    const [direction, setDirection] = useState<'toMorse' | 'toText'>('toMorse');
    const [input, setInput] = useState('SOS HELLO WORLD');
    const [copied, setCopied] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [unitMs, setUnitMs] = useState(UNIT_MS_DEFAULT);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const stopPlaybackRef = useRef<(() => void) | null>(null);

    useEffect(() => () => stopPlaybackRef.current?.(), []);

    const { output, unsupported } = useMemo(() => {
        if (direction === 'toMorse') {
            const { morse, unsupported: u } = textToMorse(input);
            return { output: morse, unsupported: u };
        }
        const { text, unsupported: u } = morseToText(input);
        return { output: text, unsupported: u };
    }, [input, direction]);

    const swapDirection = useCallback(() => {
        setDirection((d) => {
            const next = d === 'toMorse' ? 'toText' : 'toMorse';
            setInput(output || input);
            return next;
        });
    }, [output, input]);

    const copyOutput = useCallback(() => {
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    }, [output]);

    const stopPlayback = useCallback(() => {
        stopPlaybackRef.current?.();
        stopPlaybackRef.current = null;
        setPlaying(false);
    }, []);

    const play = useCallback(() => {
        if (playing) {
            stopPlayback();
            return;
        }
        const morse = direction === 'toMorse' ? output : input;
        if (!morse.trim()) return;

        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        setPlaying(true);
        stopPlaybackRef.current = playMorse(morse, unitMs, ctx, () => {
            setPlaying(false);
            stopPlaybackRef.current = null;
        });
    }, [playing, direction, output, input, unitMs, stopPlayback]);

    // Best-effort auto direction hint when the user pastes something obviously
    // Morse-shaped while still in "text to Morse" mode.
    const suggestSwitch = direction === 'toMorse' && looksLikeMorse(input) && input.trim().length > 3;

    const about = 'Morse code represents every letter, digit and common punctuation mark as a sequence of dots and dashes, and this converts between plain text and that code in both directions. It also plays the result as real audio beeps, timed to the standard ratios telegraph operators actually use: a dash lasts three times as long as a dot, the gap between symbols in a letter is one unit, between letters three units, and between words seven, so what you hear matches how it would sound on the air rather than an arbitrary beep pattern. Everything, translation and audio, runs entirely in your browser.';

    const howToSteps = [
        { name: 'Pick a direction', text: 'Use the swap button to switch between text-to-Morse and Morse-to-text.' },
        { name: 'Type or paste', text: 'In Morse mode, separate letters with a space and words with a slash (/), which is the conventional way to write it as plain text.' },
        { name: 'Copy the result', text: 'The converted output updates as you type, ready to copy.' },
        { name: 'Play it as audio', text: 'Press play to hear the current Morse code as timed beeps. Adjust the speed slider to change the unit duration.' },
    ];

    const faq = [
        {
            question: 'What is Morse code actually used for today?',
            answer: 'Its heyday as the backbone of long-distance communication, telegraph lines and early radio, ended decades ago, but it survives in a few real niches: amateur radio operators still use it because a Morse signal cuts through noise and needs far less bandwidth than voice, aviation navigation beacons identify themselves with a short Morse ID, and it remains a popular subject for puzzles, hidden messages in media, and learning exercises precisely because it maps cleanly onto simple on/off signals of any kind, light, sound, taps.',
        },
        {
            question: 'What do the dot and dash timings actually mean?',
            answer: 'Morse timing is defined entirely in relative units, not fixed seconds, which is what lets an operator send faster or slower without changing the code itself: a dot is one unit long, a dash is three units, the gap between symbols within a letter is one unit, the gap between complete letters is three units, and the gap between words is seven units. This tool uses those exact ratios for its audio playback, so the speed slider changes how long one unit lasts, but the pattern always sounds correct.',
        },
        {
            question: 'Why is SOS the most famous example?',
            answer: "SOS (···---···, three dots, three dashes, three dots) was adopted as an international distress signal in 1906 specifically because it is simple, unmistakable, and easy to send and recognize even under stress or through heavy interference, not because it stands for any particular words (\"Save Our Souls\" is a later backronym). Its rhythm is distinctive enough that it remains recognizable even to people who know no other Morse code at all.",
        },
        {
            question: 'Does this handle lowercase, accents or symbols outside the standard set?',
            answer: 'Input is treated case-insensitively, since Morse code itself has no concept of case. Accented letters and symbols outside the standard International Morse alphabet (covering A-Z, 0-9 and common punctuation) are not recognized; any character that has no mapping is skipped and listed below the output so nothing is silently dropped without you knowing.',
        },
        {
            question: 'Why does playback sometimes not start on the first click?',
            answer: "Browsers block audio from starting until a real user interaction, like a click, creates or resumes the audio context, which is a deliberate anti-autoplay-spam protection. The play button here creates the audio context on that first click specifically to satisfy that rule, so playback should start immediately from then on for the rest of the session.",
        },
    ];

    return (
        <ServicePageShell
            icon={SettingsInputAntenna}
            title="Morse Code Translator"
            subtitle="Convert text to and from Morse code, with real audio playback timed to the standard ratios"
            maxWidth="sm"
            toolId={114}
            seoTitle="Morse Code Translator - Free Text to Morse Converter with Audio"
            seoDescription="Translate text to Morse code and back, and play it as timed audio beeps using the standard dot/dash ratios. Runs entirely in your browser, no signup."
            keywords={['morse code translator', 'text to morse code', 'morse code audio player', 'morse code decoder online']}
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
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                        <Typography variant="body2" color={direction === 'toMorse' ? 'primary.main' : 'text.secondary'}>Text</Typography>
                        <IconButton size="small" onClick={swapDirection} sx={{ color: 'text.secondary' }}>
                            <SwapVert fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" color={direction === 'toText' ? 'primary.main' : 'text.secondary'}>Morse</Typography>
                    </Stack>

                    <TextField
                        label={direction === 'toMorse' ? 'Text' : 'Morse code (letters space-separated, / between words)'}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        inputProps={{ spellCheck: false, style: { fontFamily: direction === 'toText' ? 'monospace' : undefined } }}
                    />

                    {suggestSwitch && (
                        <Alert severity="info" sx={{ py: 0 }}>
                            This looks like Morse code. Swap direction to decode it.
                        </Alert>
                    )}

                    <Box sx={{ ...boxSx, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.95rem', wordBreak: 'break-all' }}>
                            {output || 'Output appears here'}
                        </Typography>
                        <Tooltip title={copied ? 'Copied' : 'Copy'}>
                            <IconButton size="small" onClick={copyOutput} disabled={!output} sx={{ color: copied ? 'success.main' : 'text.secondary', flexShrink: 0 }}>
                                {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {unsupported.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            Skipped unrecognized token{unsupported.length > 1 ? 's' : ''}: {unsupported.join(', ')}
                        </Typography>
                    )}

                    <Box>
                        <Typography variant="caption" color="text.secondary">Playback speed</Typography>
                        <Slider
                            size="small"
                            min={40}
                            max={200}
                            value={unitMs}
                            onChange={(_, v) => setUnitMs(v as number)}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(v) => `${v} ms/unit`}
                        />
                    </Box>

                    <Stack direction="row" justifyContent="center">
                        <Button
                            variant="contained"
                            startIcon={playing ? <Stop /> : <PlayArrow />}
                            onClick={play}
                            disabled={!(direction === 'toMorse' ? output : input).trim()}
                        >
                            {playing ? 'Stop' : 'Play as audio'}
                        </Button>
                    </Stack>
                </Stack>
            </Card>
        </ServicePageShell>
    );
};

export default MorseCodeTranslator;
