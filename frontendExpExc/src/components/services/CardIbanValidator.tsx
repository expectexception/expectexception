import React, { useMemo, useState } from 'react';
import {
    Alert, Box, Card, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { CreditCard, CheckCircle, Cancel } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type Mode = 'card' | 'iban';

// ── Card ─────────────────────────────────────────────────────────────

interface CardNetwork {
    name: string;
    /** Each pattern is tested against the digit-only number. */
    test: (digits: string) => boolean;
    /** Grouping used when formatting for display, in digit counts. */
    grouping: number[];
}

const CARD_NETWORKS: CardNetwork[] = [
    {
        name: 'Visa',
        test: (d) => /^4/.test(d) && (d.length === 13 || d.length === 16 || d.length === 19),
        grouping: [4, 4, 4, 4],
    },
    {
        name: 'Mastercard',
        test: (d) => d.length === 16 && (/^5[1-5]/.test(d) || (() => {
            const n = parseInt(d.slice(0, 4), 10);
            return n >= 2221 && n <= 2720;
        })()),
        grouping: [4, 4, 4, 4],
    },
    {
        name: 'American Express',
        test: (d) => d.length === 15 && /^3[47]/.test(d),
        grouping: [4, 6, 5],
    },
    {
        name: 'Diners Club',
        test: (d) => d.length === 14 && /^(30[0-5]|36|38)/.test(d),
        grouping: [4, 6, 4],
    },
    {
        name: 'Discover',
        test: (d) => (d.length === 16 || d.length === 19) && /^(6011|65|64[4-9])/.test(d),
        grouping: [4, 4, 4, 4],
    },
    {
        name: 'JCB',
        test: (d) => (d.length === 15 || d.length === 16) && /^35(2[89]|[3-8]\d)/.test(d),
        grouping: [4, 4, 4, 4],
    },
];

function luhnValid(digits: string): boolean {
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let d = digits.charCodeAt(i) - 48;
        if (double) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        double = !double;
    }
    return digits.length > 0 && sum % 10 === 0;
}

function formatGrouped(digits: string, grouping: number[]): string {
    const groups: string[] = [];
    let pos = 0;
    for (const size of grouping) {
        if (pos >= digits.length) break;
        groups.push(digits.slice(pos, pos + size));
        pos += size;
    }
    if (pos < digits.length) groups.push(digits.slice(pos));
    return groups.join(' ');
}

interface CardResult {
    digits: string;
    luhn: boolean;
    network: CardNetwork | null;
    formatted: string;
}

function analyzeCard(raw: string): CardResult {
    const digits = raw.replace(/[^0-9]/g, '');
    const network = CARD_NETWORKS.find((n) => n.test(digits)) || null;
    return {
        digits,
        luhn: luhnValid(digits),
        network,
        formatted: formatGrouped(digits, network ? network.grouping : [4, 4, 4, 4]),
    };
}

// ── IBAN ─────────────────────────────────────────────────────────────

/** Official total IBAN length per ISO 13616 country code. Not exhaustive of
 * every territory that has ever registered one, but covers the countries
 * that actually issue IBANs today. */
const IBAN_LENGTHS: Record<string, number> = {
    AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22,
    BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28,
    EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23,
    GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26,
    IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20,
    LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30,
    NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22,
    SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23,
    TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

const COUNTRY_NAMES: Record<string, string> = {
    AD: 'Andorra', AE: 'United Arab Emirates', AL: 'Albania', AT: 'Austria', AZ: 'Azerbaijan',
    BA: 'Bosnia and Herzegovina', BE: 'Belgium', BG: 'Bulgaria', BH: 'Bahrain', BR: 'Brazil',
    BY: 'Belarus', CH: 'Switzerland', CR: 'Costa Rica', CY: 'Cyprus', CZ: 'Czechia', DE: 'Germany',
    DK: 'Denmark', DO: 'Dominican Republic', EE: 'Estonia', EG: 'Egypt', ES: 'Spain', FI: 'Finland',
    FO: 'Faroe Islands', FR: 'France', GB: 'United Kingdom', GE: 'Georgia', GI: 'Gibraltar',
    GL: 'Greenland', GR: 'Greece', GT: 'Guatemala', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland',
    IL: 'Israel', IQ: 'Iraq', IS: 'Iceland', IT: 'Italy', JO: 'Jordan', KW: 'Kuwait',
    KZ: 'Kazakhstan', LB: 'Lebanon', LC: 'Saint Lucia', LI: 'Liechtenstein', LT: 'Lithuania',
    LU: 'Luxembourg', LV: 'Latvia', LY: 'Libya', MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro',
    MK: 'North Macedonia', MR: 'Mauritania', MT: 'Malta', MU: 'Mauritius', NL: 'Netherlands',
    NO: 'Norway', PK: 'Pakistan', PL: 'Poland', PS: 'Palestine', PT: 'Portugal', QA: 'Qatar',
    RO: 'Romania', RS: 'Serbia', SA: 'Saudi Arabia', SC: 'Seychelles', SE: 'Sweden',
    SI: 'Slovenia', SK: 'Slovakia', SM: 'San Marino', ST: 'Sao Tome and Principe',
    SV: 'El Salvador', TL: 'Timor-Leste', TN: 'Tunisia', TR: 'Turkey', UA: 'Ukraine',
    VA: 'Vatican City', VG: 'British Virgin Islands', XK: 'Kosovo',
};

/** mod 97 over an arbitrary-length numeric string, computed digit by digit
 * (equivalent to processing the number in chunks) since the full value is
 * far larger than JS's safe integer range and a naive Number() conversion
 * would silently lose precision. */
function mod97(numeric: string): number {
    let remainder = 0;
    for (let i = 0; i < numeric.length; i += 1) {
        remainder = (remainder * 10 + (numeric.charCodeAt(i) - 48)) % 97;
    }
    return remainder;
}

interface IbanResult {
    compact: string;
    country: string;
    countryName: string | null;
    expectedLength: number | null;
    structureOk: boolean;
    checksumOk: boolean;
    formatted: string;
}

function analyzeIban(raw: string): IbanResult {
    const compact = raw.replace(/\s+/g, '').toUpperCase();
    const country = compact.slice(0, 2);
    const expectedLength = IBAN_LENGTHS[country] ?? null;

    const structureOk = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(compact)
        && expectedLength !== null
        && compact.length === expectedLength;

    let checksumOk = false;
    if (structureOk) {
        const rearranged = compact.slice(4) + compact.slice(0, 4);
        const numeric = rearranged.split('').map((ch) => {
            const code = ch.charCodeAt(0);
            return code >= 65 && code <= 90 ? String(code - 55) : ch;
        }).join('');
        checksumOk = mod97(numeric) === 1;
    }

    return {
        compact,
        country,
        countryName: COUNTRY_NAMES[country] || null,
        expectedLength,
        structureOk,
        checksumOk,
        formatted: compact.replace(/(.{4})/g, '$1 ').trim(),
    };
}

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

function ResultRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
    return (
        <Stack direction="row" spacing={1} alignItems="flex-start">
            {ok ? <CheckCircle fontSize="small" color="success" sx={{ mt: '2px' }} /> : <Cancel fontSize="small" color="error" sx={{ mt: '2px' }} />}
            <Box>
                <Typography variant="body2" fontWeight={700}>{label}</Typography>
                <Typography variant="body2" color="text.secondary">{detail}</Typography>
            </Box>
        </Stack>
    );
}

const CardIbanValidator: React.FC = () => {
    const [mode, setMode] = useState<Mode>('card');
    const [cardInput, setCardInput] = useState('4111 1111 1111 1111');
    const [ibanInput, setIbanInput] = useState('DE89 3704 0044 0532 0130 00');

    const cardResult = useMemo(() => analyzeCard(cardInput), [cardInput]);
    const ibanResult = useMemo(() => analyzeIban(ibanInput), [ibanInput]);

    const about = "Two checksum validators in one tool: a card number checker that runs the Luhn algorithm and detects the card network from its number range, and an IBAN checker that validates the structure and the real mod-97 checksum every valid IBAN must satisfy. Both run purely as arithmetic on the digits you type, entirely in this browser tab, nothing is transmitted or logged anywhere.";

    const howToSteps = [
        { name: 'Choose card or IBAN', text: 'Switch modes at the top depending on what you are checking.' },
        { name: 'Type or paste the number', text: 'Spaces and dashes are fine, they are stripped before checking, and the tool reformats the number into standard groups as you type.' },
        { name: 'Read the checks', text: 'Card mode shows the Luhn checksum result and the detected network. IBAN mode shows structure validity, country, and the mod-97 checksum result.' },
    ];

    const faq = [
        {
            question: 'What does a passing Luhn check actually prove?',
            answer: "Only that the digits form an internally consistent number under the Luhn formula, the same simple checksum used to catch typos and single mistyped or transposed digits when a card number is entered by hand. It says nothing about whether the number belongs to a real, open, or funded account, whether the card has expired, or whether it has been reported stolen, none of which can be determined from the number alone without contacting the issuing bank or a payment processor.",
        },
        {
            question: 'Why does network detection sometimes come back "unknown"?',
            answer: "Network detection here works off publicly documented prefix and length ranges (Visa starting with 4, Mastercard's 51-55 and 2221-2720 ranges, and so on). Real card numbers occasionally fall outside the ranges published for a given brand, especially newly issued ranges, co-branded cards, or numbers that are simply invalid or made up, in which case the honest answer is that the network cannot be determined from the digits alone.",
        },
        {
            question: 'What do the two IBAN check digits protect against?',
            answer: "They are a mod-97 checksum (defined in ISO 7064) computed over the rest of the IBAN, so a single mistyped digit, or two digits swapped, changes the checksum and gets caught immediately rather than silently routing a payment to the wrong account. It is a data-entry safeguard, not proof that the account is open or belongs to a particular person, that is confirmed by the bank at the time of transfer.",
        },
        {
            question: 'Is it safe to type a real card or account number into this?',
            answer: "Yes, as far as this tool is concerned: everything runs as plain JavaScript in your browser tab, there is no network request anywhere in this component, so nothing is sent to a server, logged, or stored. That said, the general advice to be careful where you paste sensitive numbers still applies, this page just happens to genuinely honor it.",
        },
        {
            question: 'Why do some countries not appear in the IBAN list?',
            answer: "This tool covers the countries and territories that actually issue IBANs under the current registry. A number from a country outside that list, or one whose length does not match the expected length for its country code, is reported as a structural failure rather than guessed at.",
        },
    ];

    return (
        <ServicePageShell
            icon={CreditCard}
            title="Credit Card / IBAN Validator"
            subtitle="Check a card number's Luhn checksum and network, or an IBAN's structure and checksum"
            maxWidth="sm"
            toolId={112}
            seoTitle="Credit Card & IBAN Validator - Luhn Checksum & IBAN Checker"
            seoDescription="Validate a credit card number against the Luhn checksum and detect its network, or check an IBAN's structure and mod-97 checksum. Runs entirely client-side, nothing is sent anywhere."
            keywords={['credit card validator', 'luhn algorithm checker', 'iban validator online', 'card number checksum', 'validate iban number']}
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
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={mode}
                    onChange={(_, v: Mode | null) => v && setMode(v)}
                    sx={{ mb: 2.5 }}
                >
                    <ToggleButton value="card">Card number</ToggleButton>
                    <ToggleButton value="iban">IBAN</ToggleButton>
                </ToggleButtonGroup>

                {mode === 'card' ? (
                    <Stack spacing={2}>
                        <TextField
                            label="Card number"
                            value={cardInput}
                            onChange={(e) => setCardInput(e.target.value)}
                            fullWidth
                            size="small"
                            inputProps={{ spellCheck: false, style: { fontFamily: 'monospace' } }}
                        />
                        {cardResult.digits.length > 0 && (
                            <Box sx={boxSx}>
                                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, mb: 1.5, wordBreak: 'break-all' }}>
                                    {cardResult.formatted}
                                </Typography>
                                <Stack spacing={1.5}>
                                    <ResultRow
                                        label="Luhn checksum"
                                        ok={cardResult.luhn}
                                        detail={cardResult.luhn ? 'Valid — the digits satisfy the Luhn formula.' : 'Invalid — this is not a Luhn-valid number.'}
                                    />
                                    <ResultRow
                                        label="Network"
                                        ok={cardResult.network !== null}
                                        detail={cardResult.network ? `Detected as ${cardResult.network.name} (${cardResult.digits.length} digits).` : 'No known network prefix/length combination matched.'}
                                    />
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        <TextField
                            label="IBAN"
                            value={ibanInput}
                            onChange={(e) => setIbanInput(e.target.value)}
                            fullWidth
                            size="small"
                            inputProps={{ spellCheck: false, style: { fontFamily: 'monospace' } }}
                        />
                        {ibanResult.compact.length > 0 && (
                            <Box sx={boxSx}>
                                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, mb: 1.5, wordBreak: 'break-all' }}>
                                    {ibanResult.formatted}
                                </Typography>
                                <Stack spacing={1.5}>
                                    <ResultRow
                                        label="Country"
                                        ok={ibanResult.countryName !== null}
                                        detail={ibanResult.countryName
                                            ? `${ibanResult.country} — ${ibanResult.countryName}${ibanResult.expectedLength ? ` (expects ${ibanResult.expectedLength} characters)` : ''}`
                                            : `${ibanResult.country || '??'} is not a recognized IBAN country code.`}
                                    />
                                    <ResultRow
                                        label="Structure"
                                        ok={ibanResult.structureOk}
                                        detail={ibanResult.structureOk
                                            ? 'Valid — matches the country code, check digit and length pattern.'
                                            : `Invalid — ${ibanResult.expectedLength ? `expected ${ibanResult.expectedLength} characters for ${ibanResult.country}, got ${ibanResult.compact.length}.` : 'unrecognized country code or format.'}`}
                                    />
                                    <ResultRow
                                        label="Mod-97 checksum"
                                        ok={ibanResult.checksumOk}
                                        detail={ibanResult.checksumOk ? 'Valid — the check digits are consistent with the rest of the IBAN.' : 'Invalid, or not checked because the structure failed first.'}
                                    />
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                )}

                <Alert severity="info" sx={{ mt: 2.5 }}>
                    This only checks mathematical structure and checksums. It cannot and does not verify that a number belongs to a real, open or funded account. Everything above runs locally in your browser; nothing you type is sent anywhere or stored.
                </Alert>
            </Card>
        </ServicePageShell>
    );
};

export default CardIbanValidator;
