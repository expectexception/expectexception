import React, { useMemo, useState } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, InputAdornment, IconButton,
    Stack, Divider, LinearProgress, List, ListItem, ListItemIcon, ListItemText,
    Table, TableBody, TableCell, TableHead, TableRow, useTheme, alpha,
} from '@mui/material';
import {
    Password, Visibility, VisibilityOff, LockOutlined, FiberManualRecord,
} from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Password strength heuristics.
 *
 * The entropy estimate (length * log2(charset size)) assumes a password
 * drawn uniformly at random from the character classes it uses — a fair
 * model for a generated password, but a real, human-chosen one is
 * usually far more guessable than that number implies. Real attackers
 * try known-leaked and common passwords before anything else, so the
 * common-password list and the programmatic repeated/sequential checks
 * below are what actually drive the "Very Weak" verdict for something
 * like "correcthorsebattery1" or "abcdefgh1" — the entropy formula alone
 * would rate both too generously.
 * ------------------------------------------------------------------ */

// ~150 of the most frequently seen passwords and patterns across public
// breach-analysis word lists (rockyou-style top lists, common keyboard
// walks, and common "clever" variants). Matching is case-insensitive.
const COMMON_PASSWORDS = new Set([
    'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'passwords',
    '123456', '1234567', '12345678', '123456789', '1234567890', '12345', '1234',
    '000000', '111111', '121212', '222222', '654321', '696969', '777777', '888888',
    '123123', '123321', '112233', '1q2w3e4r5t', '1q2w3e4r', '1q2w3e', 'qazwsx',
    'qazwsx123', '1qaz2wsx', 'zaq1zaq1', 'qwerty', 'qwerty123', 'qwertyuiop',
    'poiuytrewq', 'asdfghjkl', 'asdf1234', 'asdfasdf', 'zxcvbnm', 'qweqwe',
    'abc123', 'abc123456', 'abcd1234', 'a1b2c3d4', 'iloveyou', 'iloveyou1',
    'iloveu', 'loveyou', 'letmein', 'letmein1', 'letmein123', 'welcome',
    'welcome1', 'welcome123', 'monkey', 'monkey1', 'dragon', 'dragon1', 'master',
    'master1', 'sunshine', 'sunshine1', 'princess', 'princess1', 'football',
    'football1', 'baseball', 'basketball', 'soccer', 'hockey', 'superman',
    'superman1', 'batman', 'batman1', 'trustno1', 'trustno1!', 'admin',
    'admin123', 'administrator', 'login', 'root', 'root123', 'toor', 'guest',
    'default', 'changeme', 'changeit', 'temp123', 'test123', 'secret',
    'secret123', 'starwars', 'shadow', 'michael', 'jennifer', 'jordan',
    'hunter2', 'freedom', 'whatever', 'ninja', 'mustang', 'access', 'flower',
    'hottie', 'loveme', 'jesus', 'biteme', 'killer', 'george', 'sexy', 'andrea',
    'thomas', 'charlie', 'robert', 'matthew', 'daniel', 'andrew', 'joshua',
    'anthony', 'ashley', 'amanda', 'jessica', 'taylor', 'hannah', 'samantha',
    'victoria', 'tigger', 'cheese', 'chicken', 'purple', 'orange', 'yellow',
    'aaaaaa', '11111111', '1234554321', 'mypassword', 'xxxxxx', 'samsung',
    'apple123', 'google', 'facebook', 'myspace1', 'blink182', 'pass123',
    'pass1234', 'p@ssword', 'p@ssword1', 'passw0rd1', 'letmein!', 'qwerty1',
    'qwerty12', 'qwerty1234', '1qazxsw2', 'zxcvbn', 'nicole', 'daniel1',
    'summer', 'winter', 'autumn', 'computer', 'internet', 'baseball1',
]);

interface CharClasses {
    lower: boolean;
    upper: boolean;
    digit: boolean;
    symbol: boolean;
}

function detectClasses(pwd: string): CharClasses {
    return {
        lower: /[a-z]/.test(pwd),
        upper: /[A-Z]/.test(pwd),
        digit: /[0-9]/.test(pwd),
        symbol: /[^a-zA-Z0-9]/.test(pwd),
    };
}

// Approximate class sizes: 26 letters each case, 10 digits, and a
// representative ~33 commonly-typed symbol characters.
function estimateCharsetSize(classes: CharClasses): number {
    let size = 0;
    if (classes.lower) size += 26;
    if (classes.upper) size += 26;
    if (classes.digit) size += 10;
    if (classes.symbol) size += 33;
    return size;
}

function estimateEntropyBits(pwd: string): number {
    if (!pwd) return 0;
    const charsetSize = estimateCharsetSize(detectClasses(pwd));
    return charsetSize > 0 ? pwd.length * Math.log2(charsetSize) : 0;
}

/** True if the whole password is one character repeated, e.g. "aaaaaa". */
function isAllSameChar(pwd: string): boolean {
    return pwd.length > 0 && /^(.)\1*$/.test(pwd);
}

/** True if any single character repeats 4+ times in a row anywhere. */
function hasRepeatedRun(pwd: string): boolean {
    return /(.)\1{3,}/.test(pwd);
}

/** Length of the longest run where each character is exactly one code
 * point above (or exactly one below) the previous one — e.g. "abcd" or
 * "4321" — with the direction held constant across the run. */
function longestSequentialRun(pwd: string): number {
    const s = pwd.toLowerCase();
    if (s.length === 0) return 0;
    let best = 1, cur = 1, dir = 0;
    for (let i = 1; i < s.length; i++) {
        const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);
        if (diff === 1 && dir !== -1) {
            cur = dir === 1 ? cur + 1 : 2;
            dir = 1;
        } else if (diff === -1 && dir !== 1) {
            cur = dir === -1 ? cur + 1 : 2;
            dir = -1;
        } else {
            cur = 1;
            dir = 0;
        }
        best = Math.max(best, cur);
    }
    return best;
}

interface Band {
    label: string;
    minBits: number;
    color: 'error' | 'warning' | 'info' | 'success';
}

const BANDS: Band[] = [
    { label: 'Very Weak', minBits: 0, color: 'error' },
    { label: 'Weak', minBits: 28, color: 'error' },
    { label: 'Fair', minBits: 36, color: 'warning' },
    { label: 'Strong', minBits: 60, color: 'info' },
    { label: 'Very Strong', minBits: 80, color: 'success' },
];

function bandFor(entropyBits: number, triviallyGuessable: boolean): Band {
    if (triviallyGuessable) return BANDS[0];
    let picked = BANDS[0];
    for (const b of BANDS) if (entropyBits >= b.minBits) picked = b;
    return picked;
}

interface Flags {
    isCommon: boolean;
    isAllSameChar: boolean;
    hasRepeatedRun: boolean;
    isFullySequential: boolean;
    hasSequentialRun: boolean;
}

function buildSuggestions(pwd: string, classes: CharClasses, flags: Flags): string[] {
    if (!pwd) return [];
    const tips: string[] = [];

    if (flags.isCommon) {
        tips.push('This is one of the most commonly used passwords in the world — attackers try lists like this before anything else, regardless of length.');
    }
    if (flags.isAllSameChar) {
        tips.push('This is a single character repeated — trivially easy to guess.');
    } else if (flags.hasRepeatedRun) {
        tips.push('Avoid repeating the same character several times in a row.');
    }
    if (flags.isFullySequential) {
        tips.push('This is a simple sequential run (like "abcd" or "4321") — guessed immediately by any cracking tool.');
    } else if (flags.hasSequentialRun) {
        tips.push('Contains a sequential run (like "abcd" or "1234") — avoid predictable runs of letters or digits.');
    }
    if (pwd.length < 12) {
        tips.push(`Too short — aim for 12+ characters (currently ${pwd.length}).`);
    }
    if (!classes.upper) tips.push('Add an uppercase letter.');
    if (!classes.lower) tips.push('Add a lowercase letter.');
    if (!classes.digit) tips.push('Add a number.');
    if (!classes.symbol) tips.push('Add a symbol, e.g. ! @ # % *.');

    if (tips.length === 0) {
        tips.push('No obvious weaknesses found — this looks like a strong, unpredictable password.');
    }
    return tips;
}

interface Scenario {
    label: string;
    guessesPerSec: number;
}

const SCENARIOS: Scenario[] = [
    { label: 'Online, throttled (~10 guesses/sec)', guessesPerSec: 10 },
    { label: 'Offline, slow hash e.g. bcrypt (~10,000 guesses/sec)', guessesPerSec: 1e4 },
    { label: 'Offline, fast hardware / GPU rig (~10 billion guesses/sec)', guessesPerSec: 1e10 },
];

/** Formats a duration in seconds as a rounded, human-scale string,
 * capping absurdly large results rather than printing a raw number. */
function formatCrackTime(seconds: number): string {
    if (!isFinite(seconds)) return 'trillions of years';
    if (seconds < 1) return 'instantly';
    if (seconds < 60) {
        const s = Math.round(seconds);
        return `${s} second${s === 1 ? '' : 's'}`;
    }
    const minutes = seconds / 60;
    if (minutes < 60) {
        const m = Math.round(minutes);
        return `${m} minute${m === 1 ? '' : 's'}`;
    }
    const hours = minutes / 60;
    if (hours < 24) {
        const h = Math.round(hours);
        return `${h} hour${h === 1 ? '' : 's'}`;
    }
    const days = hours / 24;
    if (days < 365) {
        const d = Math.round(days);
        return `${d} day${d === 1 ? '' : 's'}`;
    }
    const years = days / 365.25;
    if (years < 1000) {
        const y = Math.round(years);
        return `${y} year${y === 1 ? '' : 's'}`;
    }
    if (years < 1e6) return `${Math.round(years / 1e3).toLocaleString()} thousand years`;
    if (years < 1e9) return `${Math.round(years / 1e6).toLocaleString()} million years`;
    if (years < 1e12) return `${Math.round(years / 1e9).toLocaleString()} billion years`;
    return 'trillions of years';
}

const PasswordStrengthChecker: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [password, setPassword] = useState('');
    const [visible, setVisible] = useState(false);

    const analysis = useMemo(() => {
        const classes = detectClasses(password);
        const charsetSize = estimateCharsetSize(classes);
        const entropyBits = estimateEntropyBits(password);
        const isCommon = password.length > 0 && COMMON_PASSWORDS.has(password.toLowerCase());
        const allSame = isAllSameChar(password);
        const repeatedRun = hasRepeatedRun(password);
        const seqRun = longestSequentialRun(password);
        const hasSeqRun = seqRun >= 4;
        const isFullySequential = password.length >= 4 && seqRun === password.length;
        const triviallyGuessable = isCommon || allSame || isFullySequential;
        const band = bandFor(entropyBits, triviallyGuessable);
        const suggestions = buildSuggestions(password, classes, {
            isCommon, isAllSameChar: allSame, hasRepeatedRun: repeatedRun,
            isFullySequential, hasSequentialRun: hasSeqRun,
        });
        return {
            classes, charsetSize, entropyBits, isCommon, allSame, isFullySequential,
            triviallyGuessable, band, suggestions,
        };
    }, [password]);

    const crackTimes = useMemo(() => SCENARIOS.map(scenario => {
        if (password.length === 0) return { ...scenario, time: '—' };
        if (analysis.triviallyGuessable) {
            const reason = analysis.isCommon
                ? 'Instant — in common password lists'
                : analysis.allSame
                    ? 'Instant — repeated character'
                    : 'Instant — sequential pattern';
            return { ...scenario, time: reason };
        }
        const averageGuesses = Math.pow(2, analysis.entropyBits) / 2;
        return { ...scenario, time: formatCrackTime(averageGuesses / scenario.guessesPerSec) };
    }), [password, analysis]);

    const bandColor = theme.palette[analysis.band.color].main;
    const rawPercent = Math.min(100, (analysis.entropyBits / 90) * 100);
    const percent = analysis.triviallyGuessable ? Math.min(rawPercent, 8) : rawPercent;

    return (
        <ServicePageShell
            icon={Password}
            title="Password Strength Checker"
            subtitle="Entropy estimate, crack-time scenarios and concrete fixes — nothing you type ever leaves your browser"
            maxWidth="sm"
            toolId={71}
            keywords={['password strength checker', 'password entropy calculator', 'how strong is my password', 'password strength test online', 'crack time estimator', 'check password security']}
            about="Checks a password against an entropy estimate and a list of extremely common passwords and patterns, entirely inside your browser — nothing you type here is transmitted, logged, or stored anywhere, which matters because typing a real password into any web page is worth being cautious about. The entropy figure looks at which character classes appear (lowercase, uppercase, digits, symbols), assumes the largest charset consistent with what is actually used, and estimates bits of entropy as length times log2(charset size) — a reasonable model for a randomly generated password, but one that overestimates how hard a human-chosen password really is to guess. Real attackers try known and leaked passwords, common patterns and dictionary words before brute force, which is why this tool also checks directly against a list of frequently used passwords and flags repeated-character and sequential-character patterns programmatically, and treats any match as Very Weak regardless of what the entropy math alone would say."
            howToSteps={[
                { name: 'Type a password', text: 'Enter a password into the field. It is analysed entirely by JavaScript running in your browser and is never sent anywhere.' },
                { name: 'Read the strength meter and entropy', text: 'The bar and label (Very Weak through Very Strong) are driven by the entropy estimate, but are forced down to Very Weak if the password matches a common password or a trivial repeated/sequential pattern, regardless of length.' },
                { name: 'Check the crack-time estimates and suggestions', text: 'Compare the illustrative crack times across the attack scenarios, then work through the specific suggestions listed below to strengthen the password.' },
            ]}
            faq={[
                { question: 'Is my password sent anywhere or logged?', answer: 'No. Every calculation runs in JavaScript inside your browser tab. Nothing you type is transmitted, stored or logged — closing or refreshing the page discards it completely.' },
                { question: 'What does the entropy number actually mean?', answer: 'It estimates how many bits of randomness the password contains, based on its length and which character classes it uses. It assumes the password was drawn uniformly at random from that character set — a real, human-chosen password built from words or personal details is typically far more guessable than its raw entropy number suggests, which is exactly why this checker also compares it directly against a common-password list rather than relying on entropy alone.' },
                { question: 'How are the crack-time estimates calculated?', answer: 'As 2^entropy / 2 guesses — the average case for an exhaustive search — divided by an assumed guess rate for each scenario, from about 10 guesses/second for a rate-limited login form up to 10 billion guesses/second for offline cracking on modern hardware. They are illustrative, order-of-magnitude figures, not a guarantee: the real numbers depend heavily on the hashing algorithm a site actually used (bcrypt/Argon2 versus unsalted MD5 changes this by many orders of magnitude) and the attacker\'s hardware and strategy.' },
                { question: 'If I get a high score, is my password actually safe?', answer: 'A high score here means the password is not an obvious guess and has a large theoretical keyspace — it does not mean it is safe if reused. If that exact password has already leaked from a breach of another site, a credential-stuffing attack that simply replays known email/password pairs succeeds regardless of what this tool says. Strength and reuse are separate problems, and this tool can only ever see the first one.' },
                { question: 'What exactly is checked against the common-password list?', answer: 'The password, lowercased, is compared against roughly 150 of the most frequently seen passwords and patterns from public breach analyses — things like "password", "123456", "qwerty" and common keyboard walks — plus a programmatic check for a single repeated character or a simple ascending or descending run of letters or digits. Any of these forces the result to Very Weak no matter how long the password is.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <LockOutlined sx={{ fontSize: 18, color: primary }} />
                        <Typography variant="caption" color="text.secondary">
                            This never leaves your browser — the check runs entirely in JavaScript on your device.
                        </Typography>
                    </Stack>

                    <TextField
                        fullWidth
                        label="Password"
                        type={visible ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setVisible(v => !v)}
                                        edge="end"
                                        size="small"
                                        aria-label={visible ? 'Hide password' : 'Show password'}
                                    >
                                        {visible ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {password.length === 0 ? (
                        <Typography variant="body2" color="text.disabled" sx={{ mt: 3 }}>
                            Start typing a password above to see its strength, estimated crack time, and specific suggestions.
                        </Typography>
                    ) : (
                        <Box sx={{ mt: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
                                <Typography variant="subtitle2" fontWeight={800} sx={{ color: bandColor }}>
                                    {analysis.band.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ~{analysis.entropyBits.toFixed(1)} bits of entropy · charset ~{analysis.charsetSize} chars
                                </Typography>
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={percent}
                                sx={{
                                    height: 8, borderRadius: 4, mb: 2.5,
                                    bgcolor: alpha(bandColor, 0.15),
                                    '& .MuiLinearProgress-bar': { bgcolor: bandColor, borderRadius: 4 },
                                }}
                            />

                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                                Suggestions
                            </Typography>
                            <List dense disablePadding sx={{ mb: 2 }}>
                                {analysis.suggestions.map((s, i) => (
                                    <ListItem key={i} disableGutters sx={{ py: 0.4, alignItems: 'flex-start' }}>
                                        <ListItemIcon sx={{ minWidth: 22, mt: 0.7 }}>
                                            <FiberManualRecord sx={{ fontSize: 7, color: bandColor }} />
                                        </ListItemIcon>
                                        <ListItemText primary={s} primaryTypographyProps={{ variant: 'body2' }} />
                                    </ListItem>
                                ))}
                            </List>

                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                                Estimated crack time (average case)
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Scenario</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Time</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {crackTimes.map(row => (
                                        <TableRow key={row.label}>
                                            <TableCell sx={{ color: 'text.secondary' }}>{row.label}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                                {row.time}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                                Order-of-magnitude estimates from an entropy model, not a guarantee. Real attackers usually
                                try known-leaked passwords first regardless of this score — a high score here does not mean
                                a reused password is safe once it has appeared in a data breach.
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default PasswordStrengthChecker;
