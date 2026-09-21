import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, TextField, Grid, Chip, Alert, useTheme,
} from '@mui/material';
import { Rule, CheckCircle, Cancel, HelpOutline } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* A from-scratch implementation of semver precedence and npm range matching.
 * The precedence rules are semver.org clauses 9 to 11 and the range grammar is
 * the one documented for node-semver, including the prerelease exclusion that
 * catches people out. No dependency is involved. */

type Identifier = string | number;

interface SemVer {
    major: number;
    minor: number;
    patch: number;
    prerelease: Identifier[];
    build: string[];
    raw: string;
}

type Op = '<' | '<=' | '>' | '>=' | '=' | 'none';

interface Comparator {
    op: Op;
    version: SemVer;
    text: string;
}

/** One space-separated group of comparators, all of which must hold. An empty
 * list is the `*` case and holds for every release. */
interface ComparatorSet {
    comparators: Comparator[];
}

const FULL_VERSION = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/** major, then optionally minor, then optionally patch, any of which may be a
 * wildcard, with a prerelease allowed only once all three are given. */
const PARTIAL_VERSION = /^v?(?:(\d+|[xX*])(?:\.(\d+|[xX*])(?:\.(\d+|[xX*])(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+(?:[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?)?)?)?$/;

function toIdentifier(part: string): Identifier {
    return /^\d+$/.test(part) ? Number(part) : part;
}

function parseVersion(input: string): SemVer | null {
    const raw = input.trim();
    const match = FULL_VERSION.exec(raw);
    if (match === null) return null;
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] === undefined ? [] : match[4].split('.').map(toIdentifier),
        build: match[5] === undefined ? [] : match[5].split('.'),
        raw,
    };
}

/** Semver clause 11.4.1 to 11.4.3: numeric identifiers compare numerically,
 * alphanumeric ones compare in ASCII order, and a numeric identifier always
 * ranks below an alphanumeric one. */
function compareIdentifiers(a: Identifier, b: Identifier): number {
    if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
    if (typeof a === 'number') return -1;
    if (typeof b === 'number') return 1;
    return a < b ? -1 : a > b ? 1 : 0;
}

function comparePrerelease(a: Identifier[], b: Identifier[]): number {
    // Clause 11.3: a version with a prerelease ranks below the same version
    // without one, so 1.0.0-alpha < 1.0.0.
    if (a.length === 0 && b.length === 0) return 0;
    if (a.length === 0) return 1;
    if (b.length === 0) return -1;

    const shared = Math.min(a.length, b.length);
    for (let i = 0; i < shared; i++) {
        const result = compareIdentifiers(a[i], b[i]);
        if (result !== 0) return result;
    }
    // Clause 11.4.4: with every shared field equal, more fields wins.
    if (a.length === b.length) return 0;
    return a.length < b.length ? -1 : 1;
}

/** Build metadata is never consulted here. Clause 10 says it is ignored when
 * determining precedence, so 1.0.0+build1 and 1.0.0+build2 are equal. */
function compareVersions(a: SemVer, b: SemVer): number {
    if (a.major !== b.major) return a.major < b.major ? -1 : 1;
    if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
    if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
    return comparePrerelease(a.prerelease, b.prerelease);
}

function formatVersion(major: number, minor: number, patch: number, prerelease: Identifier[]): string {
    const base = `${major}.${minor}.${patch}`;
    return prerelease.length === 0 ? base : `${base}-${prerelease.join('.')}`;
}

function makeVersion(major: number, minor: number, patch: number, prerelease: Identifier[] = []): SemVer {
    return { major, minor, patch, prerelease, build: [], raw: formatVersion(major, minor, patch, prerelease) };
}

function makeComparator(op: Op, version: SemVer): Comparator {
    return { op, version, text: op === 'none' ? '<0.0.0-0' : `${op}${version.raw}` };
}

interface PartialVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease: Identifier[];
    /** How many of major, minor and patch were pinned before a wildcard or the
     * end of the string. 0 means the whole thing was `*`, `x` or empty. */
    specified: 0 | 1 | 2 | 3;
}

function isWildcard(part: string | undefined): boolean {
    return part === undefined || part === '' || part === 'x' || part === 'X' || part === '*';
}

function parsePartial(input: string): PartialVersion | null {
    const match = PARTIAL_VERSION.exec(input.trim());
    if (match === null) return null;
    if (isWildcard(match[1])) return { major: 0, minor: 0, patch: 0, prerelease: [], specified: 0 };
    if (isWildcard(match[2])) return { major: Number(match[1]), minor: 0, patch: 0, prerelease: [], specified: 1 };
    if (isWildcard(match[3])) return { major: Number(match[1]), minor: Number(match[2]), patch: 0, prerelease: [], specified: 2 };
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] === undefined ? [] : match[4].split('.').map(toIdentifier),
        specified: 3,
    };
}

/** `^` allows anything that does not change the leftmost non-zero component,
 * which is why ^1.2.3 reaches to <2.0.0 but ^0.2.3 stops at <0.3.0 and ^0.0.3
 * at <0.0.4. */
function caretComparators(partial: PartialVersion): Comparator[] {
    if (partial.specified === 0) return [];
    const lower = makeComparator('>=', makeVersion(partial.major, partial.minor, partial.patch, partial.prerelease));
    if (partial.specified === 1) {
        return [lower, makeComparator('<', makeVersion(partial.major + 1, 0, 0))];
    }
    if (partial.specified === 2) {
        return partial.major === 0
            ? [lower, makeComparator('<', makeVersion(0, partial.minor + 1, 0))]
            : [lower, makeComparator('<', makeVersion(partial.major + 1, 0, 0))];
    }
    if (partial.major !== 0) return [lower, makeComparator('<', makeVersion(partial.major + 1, 0, 0))];
    if (partial.minor !== 0) return [lower, makeComparator('<', makeVersion(0, partial.minor + 1, 0))];
    return [lower, makeComparator('<', makeVersion(0, 0, partial.patch + 1))];
}

/** `~` allows patch-level changes when a minor version is given, and
 * minor-level changes when only a major version is given. */
function tildeComparators(partial: PartialVersion): Comparator[] {
    if (partial.specified === 0) return [];
    const lower = makeComparator('>=', makeVersion(partial.major, partial.minor, partial.patch, partial.prerelease));
    if (partial.specified === 1) return [lower, makeComparator('<', makeVersion(partial.major + 1, 0, 0))];
    return [lower, makeComparator('<', makeVersion(partial.major, partial.minor + 1, 0))];
}

function exactComparators(partial: PartialVersion): Comparator[] {
    if (partial.specified === 0) return [];
    if (partial.specified === 1) {
        return [
            makeComparator('>=', makeVersion(partial.major, 0, 0)),
            makeComparator('<', makeVersion(partial.major + 1, 0, 0)),
        ];
    }
    if (partial.specified === 2) {
        return [
            makeComparator('>=', makeVersion(partial.major, partial.minor, 0)),
            makeComparator('<', makeVersion(partial.major, partial.minor + 1, 0)),
        ];
    }
    return [makeComparator('=', makeVersion(partial.major, partial.minor, partial.patch, partial.prerelease))];
}

/** A comparator against a partial version widens to the whole range that
 * partial covers: >1.2 becomes >=1.3.0, <=1.2 becomes <1.3.0, and so on. */
function boundComparators(op: '<' | '<=' | '>' | '>=', partial: PartialVersion): Comparator[] {
    if (partial.specified === 0) {
        // Nothing is above or below "any version", so > and < can never hold,
        // while >= and <= hold for everything.
        return op === '>' || op === '<' ? [makeComparator('none', makeVersion(0, 0, 0))] : [];
    }
    if (partial.specified === 3) {
        return [makeComparator(op, makeVersion(partial.major, partial.minor, partial.patch, partial.prerelease))];
    }
    const floor = partial.specified === 1
        ? makeVersion(partial.major, 0, 0)
        : makeVersion(partial.major, partial.minor, 0);
    const ceiling = partial.specified === 1
        ? makeVersion(partial.major + 1, 0, 0)
        : makeVersion(partial.major, partial.minor + 1, 0);

    if (op === '>') return [makeComparator('>=', ceiling)];
    if (op === '<=') return [makeComparator('<', ceiling)];
    if (op === '>=') return [makeComparator('>=', floor)];
    return [makeComparator('<', floor)];
}

function parseComparatorToken(token: string): Comparator[] | null {
    const match = /^(\^|~>?|>=|<=|>|<|=)?([\s\S]*)$/.exec(token);
    if (match === null) return null;
    const rawOp = match[1] === undefined ? '' : match[1];
    const operator = rawOp === '~>' ? '~' : rawOp;
    const partial = parsePartial(match[2]);
    if (partial === null) return null;

    if (operator === '^') return caretComparators(partial);
    if (operator === '~') return tildeComparators(partial);
    if (operator === '' || operator === '=') return exactComparators(partial);
    return boundComparators(operator as '<' | '<=' | '>' | '>=', partial);
}

/** `1.2.3 - 2.3.4` is inclusive at both ends, but a partial upper bound widens
 * to the end of what it names, so `1.2.3 - 2.3` reaches up to <2.4.0. */
function hyphenComparators(lowText: string, highText: string): Comparator[] | null {
    const low = parsePartial(lowText);
    const high = parsePartial(highText);
    if (low === null || high === null) return null;

    const out: Comparator[] = [];
    if (low.specified !== 0) {
        out.push(makeComparator('>=', makeVersion(low.major, low.minor, low.patch, low.prerelease)));
    }
    if (high.specified === 3) {
        out.push(makeComparator('<=', makeVersion(high.major, high.minor, high.patch, high.prerelease)));
    } else if (high.specified === 2) {
        out.push(makeComparator('<', makeVersion(high.major, high.minor + 1, 0)));
    } else if (high.specified === 1) {
        out.push(makeComparator('<', makeVersion(high.major + 1, 0, 0)));
    }
    return out;
}

function parseComparatorSet(input: string): ComparatorSet | null {
    const normalised = input.trim().replace(/(\^|~>?|>=|<=|>|<|=)\s+/g, '$1');
    if (normalised === '') return { comparators: [] };

    const tokens = normalised.split(/\s+/).filter(token => token !== '');
    const comparators: Comparator[] = [];
    let i = 0;
    while (i < tokens.length) {
        if (tokens[i + 1] === '-' && i + 2 < tokens.length) {
            const hyphen = hyphenComparators(tokens[i], tokens[i + 2]);
            if (hyphen === null) return null;
            comparators.push(...hyphen);
            i += 3;
            continue;
        }
        const parsed = parseComparatorToken(tokens[i]);
        if (parsed === null) return null;
        comparators.push(...parsed);
        i += 1;
    }
    return { comparators };
}

function parseRange(input: string): ComparatorSet[] | null {
    const sets: ComparatorSet[] = [];
    for (const part of input.split('||')) {
        const set = parseComparatorSet(part);
        if (set === null) return null;
        sets.push(set);
    }
    return sets;
}

function testComparator(version: SemVer, comparator: Comparator): boolean {
    if (comparator.op === 'none') return false;
    const result = compareVersions(version, comparator.version);
    if (comparator.op === '<') return result < 0;
    if (comparator.op === '<=') return result <= 0;
    if (comparator.op === '>') return result > 0;
    if (comparator.op === '>=') return result >= 0;
    return result === 0;
}

/** npm's rule: a prerelease version satisfies a comparator set only when some
 * comparator in that set names a prerelease at the very same major.minor.patch
 * tuple. Otherwise ^1.2.3 would quietly pull in 2.0.0-beta.1. */
function mentionsPrereleaseAt(version: SemVer, set: ComparatorSet): boolean {
    for (const comparator of set.comparators) {
        if (comparator.op === 'none') continue;
        const bound = comparator.version;
        if (bound.prerelease.length > 0
            && bound.major === version.major
            && bound.minor === version.minor
            && bound.patch === version.patch) {
            return true;
        }
    }
    return false;
}

function satisfiesSet(version: SemVer, set: ComparatorSet): boolean {
    for (const comparator of set.comparators) {
        if (!testComparator(version, comparator)) return false;
    }
    if (version.prerelease.length > 0) return mentionsPrereleaseAt(version, set);
    return true;
}

function setText(set: ComparatorSet): string {
    return set.comparators.length === 0 ? '*' : set.comparators.map(c => c.text).join(' ');
}

function expandRange(sets: ComparatorSet[]): string {
    return sets.map(setText).join(' || ');
}

function setFailureReason(version: SemVer, set: ComparatorSet): string {
    for (const comparator of set.comparators) {
        if (!testComparator(version, comparator)) {
            return comparator.op === 'none' ? 'no version can satisfy it' : `fails ${comparator.text}`;
        }
    }
    return `it is a prerelease and no bound names a prerelease at ${version.major}.${version.minor}.${version.patch}`;
}

interface VersionResult {
    input: string;
    valid: boolean;
    satisfies: boolean;
    reason: string;
}

function evaluateVersion(input: string, sets: ComparatorSet[]): VersionResult {
    const version = parseVersion(input);
    if (version === null) {
        return {
            input,
            valid: false,
            satisfies: false,
            reason: 'Not a valid semantic version. Expected MAJOR.MINOR.PATCH, optionally with -prerelease and +build.',
        };
    }

    for (const set of sets) {
        if (satisfiesSet(version, set)) {
            const text = setText(set);
            return {
                input,
                valid: true,
                satisfies: true,
                reason: text === '*' ? 'Inside the range, which accepts any release' : `Inside ${text}`,
            };
        }
    }

    if (sets.length === 1) {
        return { input, valid: true, satisfies: false, reason: `Rejected: ${setFailureReason(version, sets[0])}` };
    }
    const detail = sets.map(set => `${setText(set)} (${setFailureReason(version, set)})`).join(', ');
    return { input, valid: true, satisfies: false, reason: `Rejected by every branch: ${detail}` };
}

const PRESETS = ['^1.2.3', '~1.2.3', '^0.2.3', '^0.0.3', '1.x', '1.2.3 - 2.3.4', '>=1.0.0 <2.0.0 || >=3.0.0', '^1.0.0-rc.1', '*'];

const DEFAULT_VERSIONS = [
    '1.2.2',
    '1.2.3',
    '1.2.3+build.7',
    '1.4.0',
    '1.9.0',
    '2.0.0',
    '2.0.0-beta.1',
].join('\n');

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const SemverRangeTester: React.FC = () => {
    const theme = useTheme();
    const [rangeText, setRangeText] = useState('^1.2.3');
    const [versionsText, setVersionsText] = useState(DEFAULT_VERSIONS);

    const sets = useMemo(() => parseRange(rangeText), [rangeText]);

    const results = useMemo(() => {
        if (sets === null) return [];
        return versionsText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '')
            .map(line => evaluateVersion(line, sets));
    }, [sets, versionsText]);

    const matchCount = results.filter(r => r.satisfies).length;

    return (
        <ServicePageShell
            icon={Rule}
            title="SemVer Range Tester"
            subtitle="Check which versions an npm-style range accepts, with the expanded comparators and a reason for every pass and fail"
            maxWidth="md"
            toolId={103}
            seoTitle="SemVer Range Tester | Check Which Versions Match ^, ~ and x Ranges"
            seoDescription="Free semantic version range tester. Enter an npm-style range such as ^1.2.3, ~1.2, 1.x or >=1.0.0 <2.0.0 || >=3.0.0 and a list of versions, and see which ones satisfy it and why. Full prerelease precedence rules, in your browser."
            keywords={['semver range tester', 'semver calculator', 'npm version range checker', 'caret range meaning', 'tilde version range', 'semver satisfies', 'prerelease version matching', 'package.json version range']}
            about="Enter a version range in the syntax npm and yarn use, add the versions you care about, and see exactly which ones the range accepts. The range is expanded into its underlying comparators first, so you can read what ^0.2.3 or 1.x actually resolves to before you trust it. Comparison follows the semver specification to the letter: prereleases rank below the release they lead up to, prerelease identifiers compare field by field with numeric parts ranking below alphanumeric ones, and build metadata is ignored for ordering. The matching logic is written from scratch here rather than pulled from a package, and it runs in your browser."
            howToSteps={[
                { name: 'Enter a range', text: 'Type a range such as ^1.2.3, ~1.2, >=1.0.0 <2.0.0, 1.x or a || union, or click one of the presets to load it.' },
                { name: 'List your versions', text: 'Put one version per line in the versions box. Prerelease and build metadata suffixes are both accepted.' },
                { name: 'Read the verdict', text: 'Each version gets a pass or fail mark and a one-line reason naming the comparator that decided it.' },
            ]}
            faq={[
                {
                    question: 'What does the caret actually allow?',
                    answer: 'A caret allows any change that leaves the leftmost non-zero component alone. For 1.2.3 that component is the major, so ^1.2.3 covers everything from 1.2.3 up to but not including 2.0.0. Below 1.0.0 the rule shifts, because in a 0.x release the minor is doing the job of the major: ^0.2.3 stops at 0.3.0, and ^0.0.3 is narrower still, allowing only 0.0.3 itself since the next patch 0.0.4 is already outside. That last case surprises almost everybody, and it is the reason a caret on a 0.0.x dependency gives you no room at all. Load the presets above and watch the expanded comparators change to see it directly.',
                },
                {
                    question: 'Why does 2.0.0-beta.1 fail a range like >=1.0.0 or *?',
                    answer: 'By design. A prerelease is an unfinished version, and npm will not hand you one unless you asked for a prerelease at that exact major.minor.patch. So a version carrying a prerelease tag satisfies a comparator set only when some comparator in the same set names a prerelease at the identical version tuple. >=1.0.0 <3.0.0 excludes 2.0.0-beta.1, while >=1.0.0 <3.0.0-0 or ^2.0.0-beta.1 lets it through. Without this rule every open-ended caret range would start pulling alpha builds into production installs.',
                },
                {
                    question: 'Does build metadata change anything?',
                    answer: 'Not for ordering. The specification says build metadata is ignored when determining precedence, so 1.0.0+build1, 1.0.0+build2 and plain 1.0.0 are all the same version as far as any comparison is concerned. Two builds that differ only after the plus sign cannot be ranked against each other, which is why publishing them as distinct releases does not work.',
                },
                {
                    question: 'How do prerelease tags order among themselves?',
                    answer: 'Field by field, splitting on dots. A field made only of digits compares as a number, so alpha.2 comes before alpha.11. A field with any letter compares as text in ASCII order. When one field is numeric and the other is not, the numeric one ranks lower. And when every shared field is equal, the tag with more fields wins, which puts 1.0.0-alpha below 1.0.0-alpha.1. Chained together those rules give the ordering from the spec: 1.0.0-alpha, then alpha.1, alpha.beta, beta, beta.2, beta.11, rc.1, and finally the plain 1.0.0.',
                },
                {
                    question: 'When should I use tilde instead of caret?',
                    answer: 'A tilde pins the minor and lets the patch move, so ~1.2.3 accepts 1.2.9 but never 1.3.0. Reach for it when you want bug fixes and nothing else, typically for a dependency whose minor releases have burned you before. A caret is the npm default and the right choice for a library you trust to respect semver. If you want no movement at all, drop the operator: a bare 1.2.3 matches only that version, and a lockfile then holds the whole tree steady.',
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
                    <TextField
                        fullWidth
                        label="Version range"
                        value={rangeText}
                        onChange={e => setRangeText(e.target.value)}
                        error={sets === null}
                        helperText={sets === null ? 'That range could not be parsed. Check the operators and version numbers.' : ' '}
                        inputProps={{ spellCheck: false, style: { fontFamily: 'monospace', fontSize: '1.05rem' } }}
                    />

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {PRESETS.map(preset => (
                            <Chip
                                key={preset}
                                label={preset}
                                size="small"
                                variant={preset === rangeText ? 'filled' : 'outlined'}
                                color={preset === rangeText ? 'primary' : 'default'}
                                onClick={() => setRangeText(preset)}
                                sx={{ fontFamily: 'monospace' }}
                            />
                        ))}
                    </Box>

                    {sets !== null && (
                        <Box sx={{ ...boxSx, mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Expands to
                            </Typography>
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: theme.palette.primary.main, wordBreak: 'break-word' }}>
                                {expandRange(sets)}
                            </Typography>
                        </Box>
                    )}

                    {sets === null && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            The range is not valid, so nothing can be tested against it yet.
                        </Alert>
                    )}

                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                Versions, one per line
                            </Typography>
                            <TextField
                                multiline
                                rows={12}
                                fullWidth
                                value={versionsText}
                                onChange={e => setVersionsText(e.target.value)}
                                inputProps={{ spellCheck: false, style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={8}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                {results.length === 0
                                    ? 'Results'
                                    : `${matchCount} of ${results.length} ${results.length === 1 ? 'version satisfies' : 'versions satisfy'} the range`}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {results.map((result, index) => (
                                    <Box key={`${result.input}-${index}`} sx={{ ...boxSx, display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                                        {!result.valid && <HelpOutline fontSize="small" sx={{ color: 'warning.main', mt: 0.25, flexShrink: 0 }} />}
                                        {result.valid && result.satisfies && <CheckCircle fontSize="small" sx={{ color: 'success.main', mt: 0.25, flexShrink: 0 }} />}
                                        {result.valid && !result.satisfies && <Cancel fontSize="small" sx={{ color: 'error.main', mt: 0.25, flexShrink: 0 }} />}
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, wordBreak: 'break-all' }}>
                                                {result.input}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                                                {result.reason}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                                {results.length === 0 && (
                                    <Typography variant="body2" color="text.disabled">
                                        Add some versions on the left to see how they fare.
                                    </Typography>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default SemverRangeTester;
