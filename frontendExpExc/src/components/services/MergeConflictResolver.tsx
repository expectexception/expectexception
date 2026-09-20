import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, Chip, Divider, Snackbar, Stack, TextField,
    ToggleButton, ToggleButtonGroup, Typography, alpha, useTheme,
} from '@mui/material';
import { CallMerge, ContentCopy, RestartAlt } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type Choice = 'ours' | 'base' | 'theirs' | 'both';

interface Conflict {
    id: number;
    /** 1-based line of the `<<<<<<<` marker, used in the UI and in errors. */
    startLine: number;
    oursLabel: string;
    theirsLabel: string;
    baseLabel: string | null;
    ours: string[];
    theirs: string[];
    /** Present only for diff3-style conflicts. */
    base: string[] | null;
    /** The block exactly as pasted, markers included, so an unresolved
     * conflict can be written back out untouched. */
    original: string[];
}

type Segment =
    | { kind: 'text'; lines: string[] }
    | { kind: 'conflict'; conflict: Conflict };

interface ParseResult {
    segments: Segment[];
    conflicts: Conflict[];
    error: string | null;
}

const START_MARKER = /^<{7}(?:[ \t](.*))?$/;
const BASE_MARKER = /^\|{7}(?:[ \t](.*))?$/;
const SEPARATOR_MARKER = /^={7}[ \t]*$/;
const END_MARKER = /^>{7}(?:[ \t](.*))?$/;

/** Walks the file once as a small state machine. A `=======` or `>>>>>>>`
 * line only counts as a marker while we are actually inside a conflict, so a
 * row of equals signs underlining a heading in ordinary prose does not start
 * splitting the document in half. */
function parseConflicts(input: string): ParseResult {
    if (input === '') return { segments: [], conflicts: [], error: null };

    const lines = input.split('\n');
    const segments: Segment[] = [];
    const conflicts: Conflict[] = [];

    let state: 'text' | 'ours' | 'base' | 'theirs' = 'text';
    let text: string[] = [];
    let ours: string[] = [];
    let base: string[] | null = null;
    let theirs: string[] = [];
    let original: string[] = [];
    let oursLabel = '';
    let theirsLabel = '';
    let baseLabel: string | null = null;
    let startLine = 0;
    let nextId = 1;

    const fail = (message: string): ParseResult => ({ segments: [], conflicts: [], error: message });

    for (let i = 0; i < lines.length; i += 1) {
        const raw = lines[i];
        const line = raw.replace(/\r$/, '');
        const lineNo = i + 1;

        const start = START_MARKER.exec(line);
        if (start) {
            if (state !== 'text') {
                return fail(`Line ${lineNo}: a new <<<<<<< marker starts here, but the conflict opened on line ${startLine} was never closed.`);
            }
            if (text.length > 0) {
                segments.push({ kind: 'text', lines: text });
                text = [];
            }
            state = 'ours';
            startLine = lineNo;
            oursLabel = (start[1] || '').trim();
            theirsLabel = '';
            baseLabel = null;
            ours = [];
            theirs = [];
            base = null;
            original = [raw];
            continue;
        }

        const baseMark = BASE_MARKER.exec(line);
        if (baseMark && (state === 'ours' || state === 'base' || state === 'theirs')) {
            if (state !== 'ours') {
                return fail(`Line ${lineNo}: a ||||||| base marker can only follow the "ours" side, but this one comes after the ======= of the conflict on line ${startLine}.`);
            }
            state = 'base';
            baseLabel = (baseMark[1] || '').trim();
            base = [];
            original.push(raw);
            continue;
        }

        if (SEPARATOR_MARKER.test(line) && (state === 'ours' || state === 'base' || state === 'theirs')) {
            if (state === 'theirs') {
                return fail(`Line ${lineNo}: a second ======= turned up inside the conflict that opened on line ${startLine}.`);
            }
            state = 'theirs';
            original.push(raw);
            continue;
        }

        const end = END_MARKER.exec(line);
        if (end && state !== 'text') {
            if (state !== 'theirs') {
                return fail(`Line ${lineNo}: this >>>>>>> closes the conflict from line ${startLine} before its ======= separator appeared.`);
            }
            theirsLabel = (end[1] || '').trim();
            original.push(raw);
            const conflict: Conflict = {
                id: nextId,
                startLine,
                oursLabel: oursLabel || 'ours',
                theirsLabel: theirsLabel || 'theirs',
                baseLabel: base ? (baseLabel || 'base') : null,
                ours,
                theirs,
                base,
                original,
            };
            nextId += 1;
            conflicts.push(conflict);
            segments.push({ kind: 'conflict', conflict });
            state = 'text';
            continue;
        }
        if (end && state === 'text') {
            return fail(`Line ${lineNo}: a >>>>>>> end marker appears here with no <<<<<<< opening it.`);
        }

        if (state === 'text') text.push(raw);
        else if (state === 'ours') { ours.push(raw); original.push(raw); }
        else if (state === 'base' && base) { base.push(raw); original.push(raw); }
        else { theirs.push(raw); original.push(raw); }
    }

    if (state !== 'text') {
        return fail(`The conflict that opens on line ${startLine} is never closed. Add the missing >>>>>>> marker, or check that nothing was lost when the text was copied.`);
    }
    if (text.length > 0) segments.push({ kind: 'text', lines: text });

    return { segments, conflicts, error: null };
}

interface BuildResult {
    text: string;
    unresolved: number;
}

/** Rebuilds the file from the choices made so far. A conflict with no choice
 * yet is written back with its markers intact, so the output is always a
 * complete file rather than one with sections quietly missing. */
function buildResolved(segments: Segment[], choices: Record<number, Choice>): BuildResult {
    const out: string[] = [];
    let unresolved = 0;

    segments.forEach((segment) => {
        if (segment.kind === 'text') {
            segment.lines.forEach((l) => out.push(l));
            return;
        }
        const { conflict } = segment;
        const choice = choices[conflict.id];
        if (!choice) {
            unresolved += 1;
            conflict.original.forEach((l) => out.push(l));
            return;
        }
        if (choice === 'ours') conflict.ours.forEach((l) => out.push(l));
        else if (choice === 'theirs') conflict.theirs.forEach((l) => out.push(l));
        else if (choice === 'base' && conflict.base) conflict.base.forEach((l) => out.push(l));
        else if (choice === 'both') {
            conflict.ours.forEach((l) => out.push(l));
            conflict.theirs.forEach((l) => out.push(l));
        }
    });

    return { text: out.join('\n'), unresolved };
}

const SAMPLE = [
    'const config = {',
    '  retries: 3,',
    '<<<<<<< HEAD',
    '  timeout: 5000,',
    "  logLevel: 'debug',",
    '||||||| merged common ancestors',
    '  timeout: 3000,',
    '=======',
    '  timeout: 10000,',
    '>>>>>>> feature/slow-network',
    '};',
    '',
    'function greet(name) {',
    '<<<<<<< HEAD',
    "  return 'Hello, ' + name + '!';",
    '=======',
    "  return 'Hi there, ' + name + '.';",
    '>>>>>>> feature/slow-network',
    '}',
].join('\n');

interface SidePanelProps {
    label: string;
    caption: string;
    lines: string[];
    color: string;
}

const SidePanel: React.FC<SidePanelProps> = ({ label, caption, lines, color }) => (
    <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" fontWeight={800} sx={{ color }}>{label}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                {caption}
            </Typography>
        </Stack>
        <Box
            component="pre"
            sx={{
                m: 0,
                p: 1,
                minHeight: 44,
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowX: 'auto',
                borderRadius: '8px',
                borderLeft: `3px solid ${color}`,
                bgcolor: alpha(color, 0.07),
                color: lines.length === 0 ? 'text.secondary' : 'text.primary',
            }}
        >
            {lines.length === 0 ? '(this side is empty)' : lines.join('\n')}
        </Box>
    </Box>
);

const MergeConflictResolver: React.FC = () => {
    const theme = useTheme();
    const [input, setInput] = useState(SAMPLE);
    const [choices, setChoices] = useState<Record<number, Choice>>({});
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const parsed = useMemo(() => parseConflicts(input), [input]);
    const built = useMemo(() => buildResolved(parsed.segments, choices), [parsed.segments, choices]);

    const oursColor = theme.palette.success.main;
    const theirsColor = theme.palette.info.main;
    const baseColor = theme.palette.warning.main;

    const handleInput = useCallback((value: string) => {
        setInput(value);
        // Conflict ids are positional, so previous picks stop meaning
        // anything the moment the text changes.
        setChoices({});
    }, []);

    const setChoice = useCallback((id: number, choice: Choice | null) => {
        setChoices((prev) => {
            const next = { ...prev };
            if (choice === null) delete next[id];
            else next[id] = choice;
            return next;
        });
    }, []);

    const applyToAll = useCallback((choice: Choice) => {
        setChoices(() => {
            const next: Record<number, Choice> = {};
            parsed.conflicts.forEach((c) => { next[c.id] = choice; });
            return next;
        });
    }, [parsed.conflicts]);

    const copyOutput = useCallback(() => {
        navigator.clipboard.writeText(built.text).then(
            () => setSnackbar('Resolved file copied to clipboard'),
            () => setSnackbar('Could not copy to clipboard'),
        );
    }, [built.text]);

    const about = "Paste a file that Git left full of conflict markers and this tool breaks it into individual conflicts you can decide one at a time. Each block shows the side from your current branch, the side coming in from the branch you are merging, and, if the file was written in diff3 style, the common ancestor both sides started from. Picking an option rewrites the file live underneath, keeping every untouched line exactly as it was, and any conflict you have not decided yet stays in the output with its markers so nothing quietly disappears. It reads pasted text in your browser and has no connection to your repository.";

    const howToSteps = [
        { name: 'Paste the conflicted file', text: 'Copy the whole file, markers and all, out of your editor and drop it into the input box.' },
        { name: 'Read both sides', text: 'Each conflict shows ours and theirs side by side, labelled with the branch names Git wrote into the marker lines, plus the base when diff3 style is on.' },
        { name: 'Choose per conflict', text: 'Keep ours, keep theirs, keep the base, or keep both in order. The counter at the top tracks how many conflicts are still undecided.' },
        { name: 'Copy the result back', text: 'Copy the resolved text, paste it over the file in your editor, then run git add and continue the merge.' },
    ];

    const faq = [
        {
            question: 'Which side is "ours" and which is "theirs"?',
            answer: 'During a merge, ours is the branch you are sitting on, the one you ran git merge from, and theirs is the branch whose changes are arriving. Git writes ours between <<<<<<< and =======, and theirs between ======= and >>>>>>>. The part people get backwards is a rebase: rebasing replays your commits on top of another branch, so the branch being replayed onto becomes ours and your own commits become theirs. If the labels ever look reversed, check whether you are in a rebase rather than a merge.',
        },
        {
            question: 'What does the ||||||| section add?',
            answer: "That is the diff3 conflict style, switched on with git config merge.conflictstyle diff3 or zdiff3. It inserts the common ancestor, meaning the version of those lines before either branch touched them. Seeing the starting point tells you what each side was actually trying to change, which is often the difference between an obvious resolution and a guess. A line present in the base but missing from one side was deliberately deleted; a line in neither the base nor one side was added by the other.",
        },
        {
            question: 'Does this touch my repository?',
            answer: 'No. It edits text you pasted, in this browser tab. There is no repository access, no upload, and no Git operation of any kind. You still have to paste the result back into your file and finish the merge yourself.',
        },
        {
            question: 'What does Keep Both do?',
            answer: 'It writes the ours lines followed by the theirs lines, with the marker lines removed. That is the right answer surprisingly often, for instance when two branches each added an import or a list entry and neither one is wrong.',
        },
        {
            question: 'What if the markers are broken?',
            answer: 'The parser reports the line number and what it found instead of guessing. An end marker with no start, a second separator inside one conflict, or a conflict that runs off the end of the file all stop the parse and print the problem rather than producing a mangled file.',
        },
        {
            question: 'Can I leave some conflicts undecided?',
            answer: 'Yes. Anything you have not chosen is written back into the output with its original markers intact, so you can resolve the easy ones here and handle the rest by hand.',
        },
    ];

    const total = parsed.conflicts.length;
    const hasInput = input.trim() !== '';

    return (
        <ServicePageShell
            icon={CallMerge}
            title="Git Merge Conflict Resolver"
            subtitle="Paste a conflicted file and resolve each block, including diff3 style, side by side."
            maxWidth="md"
            toolId={105}
            seoTitle="Git Merge Conflict Resolver - Free Online Tool"
            seoDescription="Paste a file with Git merge conflict markers and resolve each conflict block visually. Supports diff3 style with the common ancestor, multiple conflicts per file, and keep ours, theirs, base or both. Runs entirely in your browser."
            keywords={['git merge conflict resolver', 'resolve merge conflicts online', 'diff3 conflict style', 'git conflict markers explained', 'merge conflict tool', 'ours vs theirs git']}
            about={about}
            howToSteps={howToSteps}
            faq={faq}
        >
            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
            }}>
                <TextField
                    label="Conflicted file"
                    value={input}
                    onChange={(e) => handleInput(e.target.value)}
                    fullWidth
                    multiline
                    minRows={6}
                    maxRows={12}
                    placeholder="Paste the whole file, conflict markers included."
                    InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                    sx={{ mb: 2 }}
                />

                {parsed.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{parsed.error}</Alert>
                )}

                {!parsed.error && hasInput && total === 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        No conflict markers were found in that text. A conflicted file contains lines
                        beginning with &lt;&lt;&lt;&lt;&lt;&lt;&lt;, ======= and &gt;&gt;&gt;&gt;&gt;&gt;&gt;. If your editor
                        already resolved the file, there is nothing left here to fix.
                    </Alert>
                )}

                {!parsed.error && total > 0 && (
                    <>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            justifyContent="space-between"
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="subtitle2" color="text.secondary">
                                {total} conflict{total === 1 ? '' : 's'} found,{' '}
                                {built.unresolved === 0
                                    ? 'all resolved'
                                    : `${built.unresolved} still undecided`}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Button size="small" onClick={() => applyToAll('ours')}>All ours</Button>
                                <Button size="small" onClick={() => applyToAll('theirs')}>All theirs</Button>
                                <Button size="small" startIcon={<RestartAlt />} onClick={() => setChoices({})}>
                                    Reset
                                </Button>
                            </Stack>
                        </Stack>

                        <Stack spacing={2} sx={{ mb: 3 }}>
                            {parsed.conflicts.map((conflict, index) => (
                                <Box
                                    key={conflict.id}
                                    sx={{
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px',
                                        p: 1.5,
                                    }}
                                >
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={800}>
                                            Conflict {index + 1}
                                        </Typography>
                                        <Chip size="small" label={`line ${conflict.startLine}`} variant="outlined" />
                                        {conflict.base && <Chip size="small" label="diff3" color="warning" variant="outlined" />}
                                        {!choices[conflict.id] && (
                                            <Chip size="small" label="undecided" color="error" variant="outlined" />
                                        )}
                                    </Stack>

                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
                                        <SidePanel
                                            label="OURS"
                                            caption={conflict.oursLabel}
                                            lines={conflict.ours}
                                            color={oursColor}
                                        />
                                        {conflict.base && (
                                            <SidePanel
                                                label="BASE"
                                                caption={conflict.baseLabel || 'common ancestor'}
                                                lines={conflict.base}
                                                color={baseColor}
                                            />
                                        )}
                                        <SidePanel
                                            label="THEIRS"
                                            caption={conflict.theirsLabel}
                                            lines={conflict.theirs}
                                            color={theirsColor}
                                        />
                                    </Stack>

                                    <ToggleButtonGroup
                                        exclusive
                                        size="small"
                                        value={choices[conflict.id] || null}
                                        onChange={(_, value) => setChoice(conflict.id, value as Choice | null)}
                                        sx={{ flexWrap: 'wrap' }}
                                    >
                                        <ToggleButton value="ours">Keep ours</ToggleButton>
                                        <ToggleButton value="theirs">Keep theirs</ToggleButton>
                                        <ToggleButton value="both">Keep both</ToggleButton>
                                        {conflict.base && <ToggleButton value="base">Keep base</ToggleButton>}
                                    </ToggleButtonGroup>
                                </Box>
                            ))}
                        </Stack>

                        <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Resolved output
                            </Typography>
                            <Button size="small" startIcon={<ContentCopy />} onClick={copyOutput}>Copy</Button>
                        </Stack>
                        <TextField
                            value={built.text}
                            fullWidth
                            multiline
                            minRows={6}
                            maxRows={14}
                            InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                        />
                        {built.unresolved > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                Undecided conflicts are still in the output with their markers, so the file stays complete.
                            </Typography>
                        )}
                    </>
                )}
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default MergeConflictResolver;
