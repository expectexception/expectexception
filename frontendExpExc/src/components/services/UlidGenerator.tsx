import React, { useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, Button, Snackbar, IconButton, List, ListItem } from '@mui/material';
import { Tag, ContentCopy, Refresh } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * ULID: a 128-bit identifier, 48 bits of millisecond timestamp
 * followed by 80 bits of randomness, the whole thing encoded in
 * Crockford's Base32 (no I, L, O or U, to avoid transcription errors)
 * as a fixed 26-character string. Two ULIDs generated a millisecond
 * apart sort correctly as plain strings, which a UUID does not
 * guarantee. Spec: https://github.com/ulid/spec
 * ------------------------------------------------------------------ */

const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_LEN = 10; // 48 bits -> 10 base32 chars
const RANDOM_LEN = 16; // 80 bits -> 16 base32 chars

function encodeTime(timeMs: number): string {
    let str = '';
    let n = timeMs;
    for (let i = TIME_LEN - 1; i >= 0; i--) {
        str = CROCKFORD_ALPHABET[n % 32] + str;
        n = Math.floor(n / 32);
    }
    return str;
}

function encodeRandom(): string {
    const bytes = new Uint8Array(10); // 80 bits
    crypto.getRandomValues(bytes);
    // Pack 10 bytes (80 bits) into 16 base32 characters, 5 bits at a time.
    let bits = '';
    for (let i = 0; i < bytes.length; i++) bits += bytes[i].toString(2).padStart(8, '0');
    let str = '';
    for (let i = 0; i < RANDOM_LEN; i++) {
        const chunk = bits.slice(i * 5, i * 5 + 5);
        str += CROCKFORD_ALPHABET[parseInt(chunk, 2)];
    }
    return str;
}

function generateUlid(timeMs: number = Date.now()): string {
    return encodeTime(timeMs) + encodeRandom();
}

function decodeUlidTime(ulid: string): Date | null {
    if (ulid.length !== TIME_LEN + RANDOM_LEN) return null;
    const timePart = ulid.slice(0, TIME_LEN).toUpperCase();
    let ms = 0;
    for (const ch of timePart) {
        const idx = CROCKFORD_ALPHABET.indexOf(ch);
        if (idx === -1) return null;
        ms = ms * 32 + idx;
    }
    return new Date(ms);
}

const UlidGenerator: React.FC = () => {
    const [ulids, setUlids] = useState<string[]>(() => [generateUlid()]);
    const [snackbar, setSnackbar] = useState(false);

    const generateOne = () => setUlids(prev => [generateUlid(), ...prev].slice(0, 20));
    const generateBatch = () => {
        const now = Date.now();
        const batch = Array.from({ length: 10 }, () => generateUlid(now));
        setUlids(prev => [...batch, ...prev].slice(0, 20));
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setSnackbar(true);
    };
    const handleCopyAll = () => {
        navigator.clipboard.writeText(ulids.join('\n'));
        setSnackbar(true);
    };

    const latestTime = useMemo(() => decodeUlidTime(ulids[0]), [ulids]);

    return (
        <ServicePageShell
            icon={Tag}
            title="ULID Generator"
            subtitle="Generate sortable, timestamp-prefixed unique identifiers as fixed 26-character Crockford Base32 strings"
            maxWidth="sm"
            toolId={84}
            seoTitle="ULID Generator | Sortable Unique IDs (Crockford Base32)"
            seoDescription="Generate ULIDs: 128-bit identifiers combining a millisecond timestamp with cryptographically random bits, encoded as a 26-character, lexicographically sortable string. Runs entirely in your browser."
            keywords={['ulid generator', 'sortable unique id', 'ulid vs uuid', 'crockford base32 id', 'timestamp based id generator', 'universally unique lexicographically sortable identifier']}
            about="A ULID packs a 48-bit millisecond timestamp and 80 bits of cryptographically secure randomness into a single 128-bit value, then encodes the whole thing as a fixed 26-character string using Crockford's Base32 alphabet, which drops the letters I, L, O and U specifically so a handwritten or misheard ULID is harder to transcribe wrong. Because the timestamp comes first, two ULIDs generated even a millisecond apart sort into the same order as plain strings that they were created in, which a standard random UUID does not guarantee."
            howToSteps={[
                { name: 'Generate a ULID', text: 'Click Generate for a single new ULID, timestamped to the current moment.' },
                { name: 'Generate a batch', text: 'Click Generate 10 to produce ten ULIDs sharing the same millisecond timestamp, useful for seeing how the random suffix varies while the prefix stays fixed.' },
                { name: 'Copy what you need', text: 'Click any individual ULID to copy it, or use Copy all to grab the whole visible list at once.' },
            ]}
            faq={[
                {
                    question: 'How is a ULID different from a UUID?',
                    answer: 'A standard random UUID (version 4) is 122 bits of pure randomness with no inherent order, so two UUIDs generated seconds apart sort no differently than two generated years apart. A ULID spends its first 48 bits on a millisecond timestamp instead, so ULIDs sort chronologically as plain strings, which makes them noticeably friendlier as primary keys or file names where insertion order matters, such as in a database index.',
                },
                {
                    question: 'Why Base32 instead of the usual hyphenated hex format?',
                    answer: "Crockford's Base32 packs more information per character than hexadecimal, so a ULID fits into 26 characters instead of the 36 a hyphenated UUID needs, while staying URL-safe and case-insensitive. The alphabet specifically excludes I, L, O and U to avoid confusion with 1, 0 and V when a ULID is read aloud or copied by hand.",
                },
                {
                    question: 'Is the random portion actually secure?',
                    answer: "Yes. The 80 bits of randomness in each ULID come from crypto.getRandomValues(), the browser's cryptographically secure random source, not Math.random(). Within the same millisecond, that's still 80 bits of entropy, roughly the same collision resistance as a full UUID's randomness, just spent on the last 16 characters instead of all 26.",
                },
                {
                    question: 'Can anyone tell when a ULID was created?',
                    answer: "Yes, and that's a deliberate tradeoff, not a flaw: the first 10 characters directly decode back to the exact millisecond timestamp, which is what makes ULIDs sortable in the first place. If you specifically need an identifier that reveals nothing about when it was issued, a random UUID or a ULID-like format with the timestamp portion also randomized is the better choice.",
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
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                        <Button fullWidth variant="contained" startIcon={<Refresh />} onClick={generateOne}>
                            Generate
                        </Button>
                        <Button fullWidth variant="outlined" onClick={generateBatch}>
                            Generate 10
                        </Button>
                    </Box>

                    <List dense sx={{ mb: 1, maxHeight: 420, overflowY: 'auto' }}>
                        {ulids.map((id, i) => (
                            <ListItem
                                key={`${id}-${i}`}
                                onClick={() => handleCopy(id)}
                                sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    bgcolor: 'rgba(0,0,0,0.3)',
                                    borderRadius: '10px',
                                    mb: 0.75,
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    cursor: 'pointer',
                                    justifyContent: 'space-between',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                                }}
                                secondaryAction={
                                    <IconButton size="small" edge="end" onClick={() => handleCopy(id)} aria-label="Copy ULID">
                                        <ContentCopy fontSize="small" />
                                    </IconButton>
                                }
                            >
                                {id}
                            </ListItem>
                        ))}
                    </List>

                    <Button fullWidth variant="text" onClick={handleCopyAll} sx={{ mb: 2 }}>
                        Copy all
                    </Button>

                    {latestTime && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                            Newest ULID timestamp decodes to: {latestTime.toISOString()}
                        </Typography>
                    )}
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="Copied to clipboard!" />
        </ServicePageShell>
    );
};

export default UlidGenerator;
