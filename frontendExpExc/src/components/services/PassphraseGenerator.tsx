import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, Button, Slider,
    FormControlLabel, Checkbox, Snackbar, Divider,
    ToggleButton, ToggleButtonGroup, useTheme,
} from '@mui/material';
import { Casino, ContentCopy, Refresh } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Wordlist.
 *
 * A real, deduplicated, lowercase list of common English nouns, verbs
 * and adjectives, grouped below by theme only to keep it readable in
 * source. It is not the EFF's 7776-word Diceware list, it is smaller,
 * and the entropy math further down is honest about exactly how much
 * smaller: every "bits of entropy" figure in this file is computed
 * from WORDLIST.length itself, never a hardcoded number, so the UI
 * can never drift out of sync with the actual list below.
 * ------------------------------------------------------------------ */

const ANIMALS = [
    'tiger', 'lion', 'bear', 'wolf', 'fox', 'deer', 'moose', 'otter', 'beaver', 'rabbit',
    'squirrel', 'raccoon', 'badger', 'hedgehog', 'mole', 'shrew', 'bat', 'owl', 'hawk', 'eagle',
    'falcon', 'raven', 'crow', 'sparrow', 'robin', 'finch', 'swan', 'goose', 'duck', 'heron',
    'crane', 'stork', 'pelican', 'penguin', 'puffin', 'gull', 'tern', 'dove', 'pigeon', 'parrot',
    'toucan', 'flamingo', 'peacock', 'turkey', 'chicken', 'rooster', 'goat', 'sheep', 'lamb', 'cow',
    'bull', 'horse', 'pony', 'donkey', 'mule', 'camel', 'llama', 'alpaca', 'zebra', 'giraffe',
    'elephant', 'rhino', 'hippo', 'leopard', 'cheetah', 'jaguar', 'panther', 'lynx', 'cougar', 'puma',
    'bobcat', 'coyote', 'jackal', 'hyena', 'gorilla', 'chimp', 'monkey', 'baboon', 'lemur', 'koala',
    'kangaroo', 'wombat', 'platypus', 'dolphin', 'whale', 'shark', 'seal', 'walrus', 'turtle', 'tortoise',
    'lizard', 'gecko', 'iguana', 'chameleon', 'snake', 'python', 'cobra', 'viper', 'frog', 'toad',
    'newt', 'salamander', 'crab', 'lobster', 'shrimp', 'octopus', 'squid', 'jellyfish', 'starfish', 'oyster',
    'clam', 'mussel', 'snail', 'slug', 'worm', 'ant', 'bee', 'wasp', 'hornet', 'beetle',
    'moth', 'butterfly', 'dragonfly', 'cricket', 'grasshopper', 'mantis', 'spider', 'scorpion', 'centipede',
];

const COLORS = [
    'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'violet', 'indigo', 'pink', 'magenta',
    'cyan', 'teal', 'turquoise', 'maroon', 'crimson', 'scarlet', 'amber', 'gold', 'silver', 'bronze',
    'copper', 'brown', 'tan', 'beige', 'cream', 'ivory', 'white', 'black', 'gray', 'navy',
    'olive', 'lime', 'mint', 'coral', 'salmon', 'peach', 'lavender', 'plum', 'mauve', 'rust',
    'charcoal', 'slate', 'khaki', 'emerald', 'sapphire', 'ruby', 'jade', 'pearl', 'onyx',
];

const FOOD = [
    'apple', 'banana', 'cherry', 'grape', 'lemon', 'lime', 'peach', 'pear', 'plum', 'melon',
    'mango', 'papaya', 'pineapple', 'coconut', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cranberry', 'apricot',
    'fig', 'date', 'kiwi', 'avocado', 'tomato', 'potato', 'carrot', 'onion', 'garlic', 'pepper',
    'cucumber', 'lettuce', 'spinach', 'cabbage', 'broccoli', 'cauliflower', 'celery', 'radish', 'beet', 'pumpkin',
    'squash', 'corn', 'lentil', 'rice', 'wheat', 'oat', 'barley', 'bread', 'butter', 'cheese',
    'milk', 'cream', 'yogurt', 'honey', 'sugar', 'salt', 'basil', 'mint', 'thyme', 'sage',
    'parsley', 'cinnamon', 'vanilla', 'chocolate', 'coffee', 'juice', 'soup', 'salad', 'pasta', 'pizza',
    'burger', 'sandwich', 'taco', 'sushi', 'noodle', 'pancake', 'waffle', 'cookie', 'muffin', 'donut',
];

const NATURE = [
    'mountain', 'valley', 'river', 'lake', 'ocean', 'island', 'beach', 'shore', 'coast', 'cliff',
    'canyon', 'desert', 'forest', 'jungle', 'meadow', 'prairie', 'field', 'hill', 'peak', 'summit',
    'glacier', 'volcano', 'cave', 'waterfall', 'stream', 'pond', 'marsh', 'swamp', 'wetland', 'reef',
    'dune', 'plateau', 'ridge', 'boulder', 'stone', 'rock', 'pebble', 'sand', 'soil', 'clay',
    'cloud', 'storm', 'thunder', 'lightning', 'rain', 'snow', 'hail', 'sleet', 'frost', 'fog',
    'mist', 'wind', 'breeze', 'gale', 'sunshine', 'sunrise', 'sunset', 'dawn', 'dusk', 'twilight',
    'moonlight', 'starlight', 'rainbow', 'aurora', 'comet', 'meteor', 'planet', 'galaxy', 'horizon',
];

const HOUSEHOLD = [
    'table', 'chair', 'sofa', 'couch', 'pillow', 'blanket', 'sheet', 'curtain', 'carpet', 'rug',
    'lamp', 'candle', 'mirror', 'window', 'door', 'wall', 'floor', 'ceiling', 'roof', 'stair',
    'shelf', 'drawer', 'cabinet', 'closet', 'cupboard', 'counter', 'sink', 'faucet', 'shower', 'bathtub',
    'oven', 'stove', 'fridge', 'freezer', 'microwave', 'kettle', 'toaster', 'blender', 'mixer', 'pan',
    'pot', 'plate', 'bowl', 'cup', 'mug', 'glass', 'fork', 'spoon', 'knife', 'napkin',
    'towel', 'soap', 'broom', 'mop', 'bucket', 'vacuum', 'iron', 'hanger', 'basket', 'bin',
    'box', 'jar', 'bottle', 'clock', 'calendar', 'picture', 'frame', 'vase', 'plant', 'key', 'lock',
];

const VERBS = [
    'run', 'walk', 'jump', 'skip', 'hop', 'swim', 'dive', 'climb', 'crawl', 'jog',
    'sprint', 'dash', 'march', 'stroll', 'wander', 'roam', 'travel', 'journey', 'explore', 'discover',
    'search', 'seek', 'find', 'catch', 'grab', 'hold', 'carry', 'lift', 'push', 'pull',
    'throw', 'toss', 'kick', 'strike', 'punch', 'swing', 'spin', 'twist', 'turn', 'bend',
    'stretch', 'reach', 'touch', 'feel', 'watch', 'glance', 'stare', 'notice', 'observe', 'listen',
    'hear', 'speak', 'talk', 'say', 'tell', 'ask', 'answer', 'reply', 'shout', 'whisper',
    'sing', 'hum', 'laugh', 'smile', 'weep', 'sigh', 'breathe', 'sleep', 'wake', 'dream',
    'think', 'know', 'learn', 'teach', 'study', 'read', 'write', 'draw', 'paint', 'build',
    'create', 'craft', 'design', 'plan', 'solve', 'fix', 'repair', 'clean', 'wash', 'cook',
    'bake', 'grow', 'plant', 'harvest', 'gather', 'collect', 'share', 'give', 'buy', 'sell',
    'trade', 'save', 'spend', 'earn', 'win', 'lose', 'play', 'dance', 'rest', 'relax',
];

const ADJECTIVES = [
    'big', 'small', 'tall', 'short', 'long', 'wide', 'narrow', 'deep', 'shallow', 'high',
    'low', 'heavy', 'light', 'strong', 'weak', 'fast', 'slow', 'quick', 'swift', 'early',
    'late', 'young', 'old', 'ancient', 'modern', 'fresh', 'stale', 'clean', 'dirty', 'bright',
    'dark', 'shiny', 'dull', 'loud', 'quiet', 'soft', 'hard', 'smooth', 'rough', 'sharp',
    'blunt', 'warm', 'cool', 'hot', 'cold', 'wet', 'dry', 'calm', 'wild', 'gentle',
    'fierce', 'brave', 'shy', 'bold', 'timid', 'happy', 'sad', 'angry', 'proud', 'humble',
    'kind', 'cruel', 'honest', 'loyal', 'curious', 'clever', 'wise', 'foolish', 'careful', 'careless',
    'patient', 'eager', 'lazy', 'busy', 'free', 'open', 'closed', 'full', 'empty', 'simple',
    'complex', 'rare', 'common', 'distant', 'nearby', 'vast', 'tiny', 'giant', 'mighty', 'tender',
    'sturdy', 'fragile', 'solid', 'hollow', 'round', 'square', 'flat', 'steep',
];

const ABSTRACT = [
    'freedom', 'justice', 'honor', 'courage', 'wisdom', 'truth', 'faith', 'hope', 'peace', 'joy',
    'love', 'trust', 'loyalty', 'honesty', 'patience', 'kindness', 'mercy', 'grace', 'glory', 'victory',
    'triumph', 'destiny', 'fortune', 'luck', 'chance', 'fate', 'dream', 'vision', 'memory', 'thought',
    'idea', 'notion', 'concept', 'theory', 'logic', 'reason', 'purpose', 'meaning', 'value', 'worth',
    'pride', 'shame', 'fear', 'doubt', 'wonder', 'curiosity', 'passion', 'desire', 'ambition', 'goal',
    'mission', 'quest', 'adventure', 'challenge', 'struggle', 'effort', 'progress', 'success', 'failure',
    'change', 'growth', 'balance', 'harmony', 'order', 'chaos', 'silence', 'sound', 'rhythm', 'melody',
];

const PLACES = [
    'city', 'town', 'village', 'county', 'country', 'nation', 'state', 'region', 'district', 'province',
    'capital', 'harbor', 'port', 'airport', 'station', 'bridge', 'tunnel', 'highway', 'road', 'street',
    'avenue', 'boulevard', 'alley', 'path', 'trail', 'park', 'garden', 'plaza', 'square', 'market',
    'temple', 'church', 'castle', 'palace', 'tower', 'fortress', 'museum', 'library', 'school', 'university',
    'hospital', 'stadium', 'theater', 'cinema', 'hotel', 'restaurant', 'cafe', 'farm', 'ranch', 'orchard',
    'vineyard',
];

const BODY = [
    'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'lip', 'chin', 'cheek', 'jaw',
    'neck', 'shoulder', 'arm', 'elbow', 'wrist', 'hand', 'finger', 'thumb', 'palm', 'chest',
    'back', 'waist', 'hip', 'leg', 'knee', 'ankle', 'foot', 'toe', 'heart', 'brain',
    'muscle', 'bone', 'skin', 'hair',
];

const PROFESSIONS = [
    'doctor', 'nurse', 'teacher', 'engineer', 'lawyer', 'farmer', 'baker', 'chef', 'cook', 'waiter',
    'pilot', 'sailor', 'captain', 'soldier', 'officer', 'guard', 'artist', 'painter', 'sculptor', 'musician',
    'singer', 'dancer', 'actor', 'writer', 'author', 'poet', 'editor', 'reporter', 'journalist', 'scientist',
    'researcher', 'professor', 'student', 'builder', 'carpenter', 'plumber', 'electrician', 'mechanic', 'driver',
    'architect', 'designer', 'programmer', 'analyst', 'manager', 'director', 'mayor', 'judge', 'banker', 'merchant',
    'trader', 'vendor',
];

const SPORTS = [
    'soccer', 'football', 'baseball', 'basketball', 'tennis', 'golf', 'hockey', 'rugby', 'cricket', 'volleyball',
    'badminton', 'boxing', 'wrestling', 'fencing', 'archery', 'cycling', 'swimming', 'diving', 'rowing', 'sailing',
    'skiing', 'skating', 'surfing', 'climbing', 'hiking', 'running', 'marathon', 'triathlon', 'gymnastics', 'yoga',
];

const TIME = [
    'minute', 'hour', 'day', 'week', 'month', 'year', 'decade', 'century', 'moment', 'instant',
    'morning', 'noon', 'afternoon', 'evening', 'night', 'midnight', 'today', 'tomorrow', 'yesterday', 'season',
    'spring', 'summer', 'autumn', 'winter', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const TOOLS_VEHICLES = [
    'hammer', 'wrench', 'screwdriver', 'drill', 'saw', 'axe', 'shovel', 'rake', 'ladder', 'rope',
    'chain', 'nail', 'screw', 'bolt', 'wire', 'pipe', 'wheel', 'engine', 'motor', 'gear',
    'pump', 'valve', 'battery', 'bicycle', 'motorcycle', 'car', 'truck', 'bus', 'train', 'plane',
    'boat', 'ship', 'canoe', 'kayak', 'wagon', 'cart', 'sled', 'rocket', 'submarine',
];

const MUSIC_ART = [
    'guitar', 'piano', 'violin', 'drum', 'flute', 'trumpet', 'saxophone', 'cello', 'harp', 'banjo',
    'song', 'tune', 'note', 'chord', 'beat', 'rhythm', 'melody', 'harmony', 'symphony', 'opera',
    'concert', 'album', 'canvas', 'brush', 'palette', 'sketch', 'portrait', 'sculpture', 'pottery', 'mosaic',
];

const CLOTHING = [
    'shirt', 'pants', 'trousers', 'jacket', 'coat', 'sweater', 'hoodie', 'vest', 'dress', 'skirt',
    'blouse', 'suit', 'tie', 'scarf', 'glove', 'mitten', 'hat', 'cap', 'helmet', 'boot',
    'shoe', 'sandal', 'sock', 'belt', 'button', 'zipper', 'pocket', 'collar', 'sleeve',
];

const SCIENCE = [
    'atom', 'molecule', 'element', 'energy', 'force', 'gravity', 'mass', 'matter', 'light', 'sound',
    'heat', 'electron', 'proton', 'neutron', 'cell', 'gene', 'virus', 'bacteria', 'organism', 'species',
    'evolution', 'ecosystem', 'climate', 'orbit', 'galaxy', 'nebula', 'asteroid', 'satellite', 'telescope', 'microscope',
];

const RAW_WORDLIST = [
    ...ANIMALS, ...COLORS, ...FOOD, ...NATURE, ...HOUSEHOLD, ...VERBS, ...ADJECTIVES, ...ABSTRACT,
    ...PLACES, ...BODY, ...PROFESSIONS, ...SPORTS, ...TIME, ...TOOLS_VEHICLES, ...MUSIC_ART, ...CLOTHING, ...SCIENCE,
];

// Deduplicated and sorted so the true, exact word count used in the
// entropy math (and shown throughout the UI below) always matches
// what is actually here, even though a few words above appear in more
// than one themed group (e.g. "pilot" as both a profession and a
// vehicle operator).
const WORDLIST: readonly string[] = Array.from(new Set(RAW_WORDLIST)).sort();

const BITS_PER_WORD = Math.log2(WORDLIST.length);
const EFF_DICEWARE_SIZE = 7776; // the well-known full Diceware wordlist, for comparison in the FAQ
const EFF_BITS_PER_WORD = Math.log2(EFF_DICEWARE_SIZE);

/* ------------------------------------------------------------------ *
 * Randomness.
 *
 * crypto.getRandomValues() gives uniformly random 32-bit integers, but
 * turning one into an index in [0, range) with a plain `value % range`
 * is biased whenever range does not evenly divide 2^32 (true for
 * almost every wordlist size, including this one). Values in the
 * leftover "short" region at the top of the 32-bit space map to a
 * smaller slice of indices than everything below it, so low indices
 * come up very slightly more often than they should.
 *
 * The fix is rejection sampling: only accept draws that land below the
 * largest multiple of `range` that still fits in 32 bits, and redraw
 * anything at or above that cutoff. What is left is exactly uniform,
 * with no measurable bias.
 * ------------------------------------------------------------------ */

function secureRandomIndex(range: number): number {
    if (range <= 0) return 0;
    const totalValues = 0x100000000; // 2^32 possible Uint32 outputs
    const cutoff = Math.floor(totalValues / range) * range;
    const buf = new Uint32Array(1);
    let value: number;
    do {
        crypto.getRandomValues(buf);
        value = buf[0];
    } while (value >= cutoff);
    return value % range;
}

interface PassphraseOptions {
    numWords: number;
    capitalize: boolean;
    includeNumber: boolean;
    separator: string;
}

function generatePassphrase(opts: PassphraseOptions): string {
    const words: string[] = [];
    for (let i = 0; i < opts.numWords; i++) {
        const word = WORDLIST[secureRandomIndex(WORDLIST.length)];
        words.push(opts.capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word);
    }
    const parts = [...words];
    if (opts.includeNumber) {
        parts.push(String(secureRandomIndex(100)));
    }
    return parts.join(opts.separator);
}

function calcEntropyBits(numWords: number, includeNumber: boolean): number {
    const wordBits = numWords * BITS_PER_WORD;
    const numberBits = includeNumber ? Math.log2(100) : 0;
    return wordBits + numberBits;
}

const SEPARATOR_OPTIONS: { value: string; label: string }[] = [
    { value: '-', label: '-' },
    { value: '_', label: '_' },
    { value: '.', label: '.' },
    { value: ' ', label: 'space' },
];

const PassphraseGenerator: React.FC = () => {
    const theme = useTheme();

    const [numWords, setNumWords] = useState(4);
    const [capitalize, setCapitalize] = useState(false);
    const [includeNumber, setIncludeNumber] = useState(false);
    const [separator, setSeparator] = useState('-');
    const [passphrase, setPassphrase] = useState(() =>
        generatePassphrase({ numWords: 4, capitalize: false, includeNumber: false, separator: '-' }),
    );
    const [snackbar, setSnackbar] = useState(false);

    // Every control below regenerates the passphrase immediately, using
    // the new settings, rather than only updating on the next manual
    // Regenerate click. That keeps the entropy figure shown on screen
    // always describing the exact passphrase shown next to it, instead
    // of momentarily describing a word count or option the phrase does
    // not actually reflect yet.
    const applyAndRegenerate = (patch: Partial<PassphraseOptions>) => {
        const next: PassphraseOptions = { numWords, capitalize, includeNumber, separator, ...patch };
        setNumWords(next.numWords);
        setCapitalize(next.capitalize);
        setIncludeNumber(next.includeNumber);
        setSeparator(next.separator);
        setPassphrase(generatePassphrase(next));
    };

    const regenerate = () => setPassphrase(generatePassphrase({ numWords, capitalize, includeNumber, separator }));

    const entropyBits = useMemo(() => calcEntropyBits(numWords, includeNumber), [numWords, includeNumber]);
    const equivalentRandomChars = Math.ceil(entropyBits / Math.log2(94)); // 94 printable ASCII chars excluding space

    const handleCopy = () => {
        navigator.clipboard.writeText(passphrase);
        setSnackbar(true);
    };

    return (
        <ServicePageShell
            icon={Casino}
            title="Passphrase Generator"
            subtitle="Diceware-style passphrases built from real random words, generated locally with the Web Crypto API"
            maxWidth="sm"
            toolId={80}
            seoTitle="Passphrase Generator | Diceware-Style Random Word Passphrases"
            seoDescription="Generate memorable, random passphrases from a real wordlist using crypto.getRandomValues, with an honest bits-of-entropy figure computed from the exact wordlist size. Runs entirely in your browser."
            keywords={['passphrase generator', 'diceware generator', 'random word password', 'memorable password generator', 'passphrase entropy calculator', 'word based password generator', 'secure passphrase generator']}
            about={`Generates a passphrase by picking ${WORDLIST.length} common English words entirely at random, in the style of Diceware, instead of a short string of random characters. Each word is chosen with crypto.getRandomValues(), the Web Crypto API's cryptographically secure random source, using rejection sampling to pick a uniformly random index into the wordlist so no word is even slightly more likely than any other. The result is usually easier to remember and type correctly than a dense mix of symbols, while still carrying a real, calculable amount of entropy. Nothing generated here is sent anywhere; it only exists in your browser tab.`}
            howToSteps={[
                { name: 'Set the number of words', text: 'Choose how many random words to include, from 3 up to 8. More words means more entropy.' },
                { name: 'Choose optional extras', text: 'Turn on capitalization and a trailing random number if the site you are registering for requires them.' },
                { name: 'Pick a separator', text: 'Choose the character placed between words: a hyphen, underscore, period, or a plain space.' },
                { name: 'Copy the passphrase', text: 'Click Copy to copy it to your clipboard, or Regenerate for a fresh one with the same settings.' },
            ]}
            faq={[
                {
                    question: 'Why would random words be better than a short complex password?',
                    answer: `Entropy depends on how many possibilities an attacker has to search, not on how the string looks. A single word out of a ${WORDLIST.length}-word list already has about ${BITS_PER_WORD.toFixed(2)} bits of entropy, so four of them chosen independently multiply out to roughly ${(4 * BITS_PER_WORD).toFixed(1)} bits, comparable to or better than many short passwords people can actually remember. A sequence of real words is also much easier to type correctly and recall later than an arbitrary string like "xK9#mQ2!".`,
                },
                {
                    question: `How big is this wordlist, exactly, and does the size matter?`,
                    answer: `This list contains exactly ${WORDLIST.length} words, giving about ${BITS_PER_WORD.toFixed(2)} bits of entropy per word. That is honestly smaller than the well-known EFF Diceware list of 7776 words, which gives about ${EFF_BITS_PER_WORD.toFixed(2)} bits per word. A bigger list means more entropy per word, so the same phrase length is stronger with a bigger list. If you need the maximum entropy per word, a full 7776-word Diceware list is the better choice; this tool trades some of that for a smaller, easier-to-read wordlist and an on-page entropy figure that is calculated openly rather than assumed.`,
                },
                {
                    question: 'How exactly is the randomness generated?',
                    answer: "Each word is picked using crypto.getRandomValues(), the browser's cryptographically secure random number generator, never Math.random(). Converting a random 32-bit value into a wordlist index naively with a modulo operation is subtly biased for almost any list size, so this tool uses rejection sampling instead: it discards any draw that would produce that bias and tries again, which keeps every word in the list exactly equally likely to be chosen.",
                },
                {
                    question: 'What does the entropy figure actually assume?',
                    answer: `The entropy number assumes the standard, conservative case in password security: that an attacker already knows exactly which wordlist and method this tool uses, and is only uncertain about which specific words and, if enabled, which number were picked. That is the same assumption used for the EFF's own Diceware entropy figures, and it is the honest way to measure it, since relying on an attacker never finding out how a passphrase was generated is not a safe assumption to build security on. If an attacker genuinely has no idea this specific wordlist exists, the real difficulty is higher than the number shown, but that should be treated as a bonus, never as the basis for how secure the passphrase actually is.`,
                },
                {
                    question: 'Is this passphrase sent anywhere or stored?',
                    answer: 'No. Generation happens entirely in JavaScript in your browser tab. It is never transmitted to a server, logged, or saved anywhere, and closing or refreshing the page discards it for good.',
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
                    <Box sx={{
                        p: 2.5,
                        borderRadius: '12px',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        fontFamily: 'monospace',
                        fontSize: '1.1rem',
                        textAlign: 'center',
                        mb: 2,
                        wordBreak: 'break-all',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        {passphrase}
                    </Box>

                    <Typography variant="caption" sx={{ color: theme.palette.primary.main, fontWeight: 700, display: 'block', textAlign: 'center', mb: 3 }}>
                        ~{entropyBits.toFixed(1)} bits of entropy (about as hard to guess as {equivalentRandomChars} fully random characters)
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                        <Button fullWidth variant="contained" startIcon={<Refresh />} onClick={regenerate}>
                            Regenerate
                        </Button>
                        <Button fullWidth variant="outlined" startIcon={<ContentCopy />} onClick={handleCopy}>
                            Copy
                        </Button>
                    </Box>

                    <Typography gutterBottom>Number of words: {numWords}</Typography>
                    <Slider
                        value={numWords}
                        onChange={(_, v) => applyAndRegenerate({ numWords: v as number })}
                        min={3}
                        max={8}
                        step={1}
                        marks
                        sx={{ mb: 2 }}
                    />

                    <FormControlLabel
                        control={<Checkbox checked={capitalize} onChange={e => applyAndRegenerate({ capitalize: e.target.checked })} />}
                        label="Capitalize the first letter of each word"
                    />
                    <FormControlLabel
                        control={<Checkbox checked={includeNumber} onChange={e => applyAndRegenerate({ includeNumber: e.target.checked })} />}
                        label="Add a random number (0-99) at the end"
                    />

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Separator
                    </Typography>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={separator}
                        onChange={(_, v) => { if (v !== null) applyAndRegenerate({ separator: v }); }}
                    >
                        {SEPARATOR_OPTIONS.map(opt => (
                            <ToggleButton key={opt.value} value={opt.value} sx={{ px: 1.5, fontSize: '0.75rem' }}>
                                {opt.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>

                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 3 }}>
                        Drawn uniformly from a {WORDLIST.length}-word list using crypto.getRandomValues(). Nothing here is sent anywhere.
                    </Typography>
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="Passphrase copied to clipboard!" />
        </ServicePageShell>
    );
};

export default PassphraseGenerator;
