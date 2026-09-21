import React, { useMemo, useState } from 'react';
import { Box, Card, Chip, Stack, TextField, Typography } from '@mui/material';
import { Calculate } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type Spec = [id: number, cls: number, type: number];

const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter']);
const ZERO_SPECIFICITY_PSEUDOS = new Set(['where']);
const SELECTOR_LIST_PSEUDOS = new Set(['not', 'is', 'has']);

function isIdentChar(ch: string): boolean {
    return /[A-Za-z0-9_\-\\]/.test(ch) || ch.charCodeAt(0) > 127;
}

function compareSpec(a: Spec, b: Spec): number {
    if (a[0] !== b[0]) return a[0] - b[0];
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[2] - b[2];
}

/** Splits on commas that are not nested inside (), [] or {}. */
function splitTopLevel(str: string, separator: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === '(' || ch === '[' || ch === '{') depth++;
        else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
        else if (ch === separator && depth === 0) {
            parts.push(str.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(str.slice(start));
    return parts.map((p) => p.trim()).filter((p) => p !== '');
}

function findMatchingParen(s: string, openIdx: number): number {
    let depth = 0;
    for (let j = openIdx; j < s.length; j++) {
        if (s[j] === '(') depth++;
        else if (s[j] === ')') {
            depth--;
            if (depth === 0) return j;
        }
    }
    return s.length - 1;
}

/** Computes (id, class, type) specificity for one complex selector, per the
 * CSS Selectors spec: :not()/:is()/:has() contribute the specificity of
 * their single most specific argument (not their own count), :where()
 * always contributes zero including its contents, and pseudo-elements
 * (double-colon, plus the four legacy single-colon names) count as a type
 * selector rather than a class. */
function computeSpecificity(selector: string): Spec {
    const s = selector.trim();
    let id = 0, cls = 0, type = 0;
    let i = 0;

    const readIdent = (): string => {
        const start = i;
        while (i < s.length && isIdentChar(s[i])) i++;
        return s.slice(start, i);
    };

    while (i < s.length) {
        const ch = s[i];

        if (ch === '#') {
            i++; readIdent(); id++;
        } else if (ch === '.') {
            i++; readIdent(); cls++;
        } else if (ch === '[') {
            const close = s.indexOf(']', i);
            i = close === -1 ? s.length : close + 1;
            cls++;
        } else if (ch === ':') {
            let j = i + 1;
            let isPseudoElement = false;
            if (s[j] === ':') { isPseudoElement = true; j++; }
            const nameStart = j;
            while (j < s.length && /[A-Za-z0-9-]/.test(s[j])) j++;
            const name = s.slice(nameStart, j).toLowerCase();
            i = j;
            if (!isPseudoElement && LEGACY_PSEUDO_ELEMENTS.has(name)) isPseudoElement = true;

            if (i < s.length && s[i] === '(') {
                const closeIdx = findMatchingParen(s, i);
                const argContent = s.slice(i + 1, closeIdx);
                i = closeIdx + 1;

                if (isPseudoElement) {
                    type++;
                } else if (ZERO_SPECIFICITY_PSEUDOS.has(name)) {
                    // :where() and its contents always contribute zero.
                } else if (SELECTOR_LIST_PSEUDOS.has(name)) {
                    const args = splitTopLevel(argContent, ',');
                    let best: Spec | null = null;
                    for (const arg of args) {
                        const spec = computeSpecificity(arg);
                        if (best === null || compareSpec(spec, best) > 0) best = spec;
                    }
                    if (best) { id += best[0]; cls += best[1]; type += best[2]; }
                } else {
                    // Functional pseudo-class whose argument isn't a selector
                    // list (nth-child(2n+1), lang(en), ...): counts once,
                    // argument isn't inspected further.
                    cls++;
                }
            } else if (isPseudoElement) {
                type++;
            } else {
                cls++;
            }
        } else if (ch === '*') {
            i++;
        } else if (ch === '&') {
            i++; // nesting selector - specificity is context-dependent, not counted here
        } else if (/[>+~,\s|]/.test(ch)) {
            i++;
        } else if (/[A-Za-z_-]/.test(ch) || ch.charCodeAt(0) > 127) {
            readIdent();
            type++;
        } else {
            i++;
        }
    }

    return [id, cls, type];
}

function weight([id, cls, type]: Spec): number {
    return id * 10000 + cls * 100 + type;
}

/** Splits pasted input into raw selector-list chunks: if it looks like a
 * stylesheet (has braces), pulls the text before each top-level `{`,
 * skipping at-rule preludes (@media, @font-face, ...) and rule bodies.
 * Otherwise treats each non-empty line as one chunk. */
function extractSelectorChunks(input: string): string[] {
    const noComments = input.replace(/\/\*[\s\S]*?\*\//g, '');
    if (!noComments.includes('{')) {
        return noComments.split('\n').map((l) => l.trim()).filter((l) => l !== '');
    }

    const chunks: string[] = [];
    let depth = 0;
    let buffer = '';
    for (const ch of noComments) {
        if (ch === '{') {
            if (depth === 0) {
                const trimmed = buffer.trim();
                if (trimmed !== '' && !trimmed.startsWith('@')) chunks.push(trimmed);
            }
            depth++;
            buffer = '';
        } else if (ch === '}') {
            depth = Math.max(0, depth - 1);
            buffer = '';
        } else if (depth === 0) {
            buffer += ch;
        }
    }
    return chunks;
}

interface Row {
    selector: string;
    spec: Spec;
}

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const DEFAULT_INPUT = `#nav a.active
.nav-menu li a
nav a:hover
div#main .content p
*
a:not(.disabled)
:where(.card, .panel) h2`;

const CssSpecificityCalculator: React.FC = () => {
    const [input, setInput] = useState(DEFAULT_INPUT);

    const rows: Row[] = useMemo(() => {
        const chunks = extractSelectorChunks(input);
        const selectors = chunks.flatMap((chunk) => splitTopLevel(chunk, ','));
        return selectors.map((selector) => ({ selector, spec: computeSpecificity(selector) }));
    }, [input]);

    const maxWeight = rows.length > 0 ? Math.max(...rows.map((r) => weight(r.spec))) : -1;

    const about = "Specificity is how the browser decides which of several conflicting CSS rules wins, and it is calculated as a tuple, not a single number: a count of ID selectors, then a count of classes/attribute selectors/pseudo-classes, then a count of type selectors/pseudo-elements, compared left to right. This calculates that tuple correctly for each selector you paste, including the parts most calculators get wrong: :not(), :is() and :has() take on the specificity of their most specific argument rather than counting as a plain pseudo-class, and :where() always contributes exactly zero, argument included.";

    const howToSteps = [
        { name: 'Paste selectors', text: 'One per line, or paste a whole stylesheet and the selector before each { is picked out automatically (at-rule preludes like @media are skipped).' },
        { name: 'Read the tuple', text: 'Each selector shows its (IDs, classes, types) specificity, highest first.' },
        { name: 'Spot the winner', text: 'The highest-specificity selector is highlighted. Equal specificity elsewhere in a real stylesheet is broken by source order: the later rule wins.' },
    ];

    const faq = [
        {
            question: 'How exactly do specificity conflicts get resolved?',
            answer: 'When two rules target the same element and set the same property, the browser compares their specificity tuples left to right: whichever has more ID selectors wins outright, regardless of anything else. If IDs are tied, whichever has more classes/attributes/pseudo-classes wins. If that is tied too, more type selectors/pseudo-elements wins. If the full tuple is identical, the rule that appears later in the stylesheet (or later in the cascade order for equal-origin rules) wins, source order only ever gets consulted as the final tiebreaker.',
        },
        {
            question: 'Where does !important fit into this?',
            answer: 'It sits above specificity entirely rather than inside it: a declaration marked !important beats every non-!important declaration regardless of how much lower its specificity is, and only loses to another !important declaration with higher specificity (or one that comes later, if tied). It is not part of the specificity calculation shown here, it is a separate, higher-priority layer that overrides the whole mechanism.',
        },
        {
            question: 'Why is an ID worth so much more than a class?',
            answer: 'Because the categories are compared as separate tuple positions, not summed into one number, no number of classes can ever outweigh a single ID: one #id beats .a.b.c.d.e.f.g.h.i.j, ten classes, because the comparison never even reaches the class column once the ID column differs. This is deliberate: IDs are meant to be unique per page, so a rule targeting one is assumed to be more intentionally specific than one targeting a reusable class.',
        },
        {
            question: "Why don't :not(), :is() and :has() just count as one pseudo-class each?",
            answer: "Because that would make them trivially game-able to dodge specificity: wrapping any selector in :not() would otherwise let you write, say, a selector with three IDs but have it only count as one class. The spec instead defines their contributed specificity as equal to the single most specific complex selector inside their argument list, so :not(#a, .b) contributes an ID's worth of specificity (from #a), not a class's worth, while :is(.a, .b, .c) contributes a class's worth, matching whichever of its arguments is highest.",
        },
        {
            question: 'What is a common specificity anti-pattern, and how do you fix it?',
            answer: 'The classic failure mode is a "specificity war": a rule does not apply, so a more specific selector gets bolted on (nesting more classes, or adding an ID), which works until the next override needs to be even more specific, and the codebase ends up full of selectors like #app .page .card.card--featured .title. The real fix is almost never more specificity, it is flattening: give the element a single, purpose-built class and target that alone, or restructure the CSS so later rules do not need to fight earlier ones by brute force.',
        },
    ];

    return (
        <ServicePageShell
            icon={Calculate}
            title="CSS Specificity Calculator"
            subtitle="Paste CSS selectors and see exactly which one wins, with correct :not/:is/:has/:where handling"
            maxWidth="md"
            toolId={117}
            seoTitle="CSS Specificity Calculator - Free Selector Specificity Checker"
            seoDescription="Calculate CSS selector specificity correctly, including :not(), :is(), :has() and :where(). Paste selectors or a full stylesheet and see which rule wins a conflict."
            keywords={['css specificity calculator', 'css specificity checker online', 'calculate css selector specificity', 'css specificity explained']}
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
                        label="CSS selectors (one per line, or a full stylesheet)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        fullWidth
                        multiline
                        minRows={5}
                        maxRows={10}
                        inputProps={{ spellCheck: false, style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                    />

                    <Stack spacing={1}>
                        {rows.length === 0 && (
                            <Typography variant="body2" color="text.secondary">Paste one or more selectors above.</Typography>
                        )}
                        {rows.map(({ selector, spec }, idx) => {
                            const isWinner = weight(spec) === maxWeight;
                            return (
                                <Box
                                    key={`${selector}-${idx}`}
                                    sx={{
                                        ...boxSx,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1.5,
                                        flexWrap: 'wrap',
                                        border: isWinner ? '1px solid' : boxSx.border,
                                        borderColor: isWinner ? 'primary.main' : undefined,
                                    }}
                                >
                                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                        {selector}
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip size="small" label={`(${spec[0]}, ${spec[1]}, ${spec[2]})`} sx={{ fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.08)' }} />
                                        {isWinner && <Chip size="small" color="primary" label="Wins" />}
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Stack>

                    <Typography variant="caption" color="text.secondary">
                        Tuple order is (IDs, classes/attributes/pseudo-classes, types/pseudo-elements), compared left to right.
                    </Typography>
                </Stack>
            </Card>
        </ServicePageShell>
    );
};

export default CssSpecificityCalculator;
