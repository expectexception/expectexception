import React, { useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, Grid, Chip, Alert, Button, useTheme, alpha } from '@mui/material';
import { AccountTree, ContentCopy } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type DiffType = 'added' | 'removed' | 'changed';

interface DiffEntry {
    path: string;
    type: DiffType;
    oldValue?: unknown;
    newValue?: unknown;
}

const SAMPLE_LEFT = `{
  "user": {
    "name": "Alice",
    "address": { "city": "NYC" },
    "oldField": "foo"
  },
  "active": true
}`;

const SAMPLE_RIGHT = `{
  "user": {
    "name": "Alice",
    "address": { "city": "LA" },
    "email": "alice@example.com"
  },
  "active": false
}`;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

const formatValue = (v: unknown): string => {
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return JSON.stringify(v);
    if (isPlainObject(v) || Array.isArray(v)) return JSON.stringify(v);
    return String(v);
};

/** Recursively walks two parsed JSON trees and records every key/path that
 * was added, removed, or changed at any nesting depth. Structural rather
 * than textual: key order and whitespace never matter, only actual value
 * differences do. */
const collectDiff = (path: string, a: unknown, b: unknown, out: DiffEntry[]): void => {
    const aDefined = a !== undefined;
    const bDefined = b !== undefined;

    if (!aDefined && bDefined) {
        out.push({ path: path || '(root)', type: 'added', newValue: b });
        return;
    }
    if (aDefined && !bDefined) {
        out.push({ path: path || '(root)', type: 'removed', oldValue: a });
        return;
    }
    if (!aDefined && !bDefined) return;

    if (isPlainObject(a) && isPlainObject(b)) {
        const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
        keys.forEach(key => collectDiff(path ? `${path}.${key}` : key, a[key], b[key], out));
        return;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        const len = Math.max(a.length, b.length);
        for (let i = 0; i < len; i++) {
            collectDiff(`${path}[${i}]`, a[i], b[i], out);
        }
        return;
    }

    // Primitives, or a type mismatch (e.g. object vs. string) - either way,
    // if the serialized forms differ it's a change at this path.
    if (JSON.stringify(a) !== JSON.stringify(b)) {
        out.push({ path: path || '(root)', type: 'changed', oldValue: a, newValue: b });
    }
};

const tryParse = (text: string): { value?: unknown; error?: string } => {
    if (!text.trim()) return { error: 'Enter some JSON' };
    try {
        return { value: JSON.parse(text) };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Invalid JSON' };
    }
};

const JsonDiffChecker: React.FC = () => {
    const theme = useTheme();
    const addedColor = theme.palette.success.main;
    const removedColor = theme.palette.error.main;
    const changedColor = theme.palette.warning.main;

    const [left, setLeft] = useState(SAMPLE_LEFT);
    const [right, setRight] = useState(SAMPLE_RIGHT);

    const leftParsed = useMemo(() => tryParse(left), [left]);
    const rightParsed = useMemo(() => tryParse(right), [right]);

    const diff = useMemo<DiffEntry[]>(() => {
        if (leftParsed.error || rightParsed.error) return [];
        const out: DiffEntry[] = [];
        collectDiff('', leftParsed.value, rightParsed.value, out);
        return out;
    }, [leftParsed, rightParsed]);

    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;
    const changed = diff.filter(d => d.type === 'changed').length;
    const bothValid = !leftParsed.error && !rightParsed.error;

    const copyDiff = () => {
        const lines = diff.map(d => {
            if (d.type === 'added') return `+ ${d.path}: ${formatValue(d.newValue)}`;
            if (d.type === 'removed') return `- ${d.path}: ${formatValue(d.oldValue)}`;
            return `${d.path}: ${formatValue(d.oldValue)} → ${formatValue(d.newValue)}`;
        });
        navigator.clipboard.writeText(lines.join('\n'));
    };

    return (
        <ServicePageShell
            toolId={59}
            icon={AccountTree}
            title="JSON Diff Checker"
            subtitle="Compare two JSON documents structurally and see every key added, removed, or changed - computed entirely in your browser."
            maxWidth="md"
            seoTitle="JSON Diff Checker - Compare Two JSON Objects Online"
            keywords={['json diff', 'json compare', 'compare two json objects', 'json structural diff', 'json tree diff', 'diff json online']}
            about="Compares two JSON documents by parsing them into real JavaScript object trees - not by diffing raw text lines - then recursively walks both trees to find every key that was added, removed, or had its value changed, no matter how deeply nested. Because the comparison is structural, reformatting whitespace or reordering an object's keys never shows up as a false difference the way a plain text diff would. Results are listed as flat, readable paths like user.address.city so you can see exactly what changed at any depth, color-coded by whether it was added, removed, or changed. Both inputs are parsed and compared locally with JSON.parse; nothing is uploaded."
            howToSteps={[
                { name: 'Paste the original JSON', text: 'Add the first JSON document into the left box.' },
                { name: 'Paste the changed JSON', text: 'Add the second JSON document into the right box.' },
                { name: 'Read the diff list', text: 'Added keys appear in green with a "+" prefix, removed keys in red with a "-" prefix, and changed values in orange showing the old value, an arrow, and the new value.' },
                { name: 'Copy the diff', text: 'Click Copy Diff to copy the full list of differences to your clipboard as plain text.' },
            ]}
            faq={[
                { question: 'Does this diff JSON as text or as structured data?', answer: 'As structured data - both sides are parsed with JSON.parse into object trees and compared key by key at every depth, so whitespace, formatting, and key order never affect the result, only actual differences in keys or values do.' },
                { question: 'What happens if my JSON is invalid?', answer: "Each box is validated independently and shows its own parse error message (e.g. \"Unexpected token\") right under the input instead of crashing the page, so you can tell exactly which side needs fixing." },
                { question: 'How are arrays compared?', answer: "Element by element, by index. If the arrays differ in length, the extra trailing elements show up as added or removed at that index (e.g. tags[2]) rather than the whole array being flagged as changed." },
                { question: 'Is my JSON uploaded anywhere to compare it?', answer: 'No - parsing and comparison both happen locally in your browser using JSON.parse; neither input is sent to a server.' },
            ]}
        >
            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <Grid container spacing={3} sx={{ mb: 2, flexShrink: 0 }}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Original JSON</Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={8}
                                maxRows={12}
                                value={left}
                                onChange={e => setLeft(e.target.value)}
                                placeholder='{"key": "value"}'
                                error={!!leftParsed.error}
                                helperText={leftParsed.error}
                                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>Changed JSON</Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={8}
                                maxRows={12}
                                value={right}
                                onChange={e => setRight(e.target.value)}
                                placeholder='{"key": "new value"}'
                                error={!!rightParsed.error}
                                helperText={rightParsed.error}
                                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                            />
                        </Grid>
                    </Grid>

                    {bothValid && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexShrink: 0, flexWrap: 'wrap' }}>
                            <Chip size="small" label={`+${added} added`} sx={{ bgcolor: alpha(addedColor, 0.15), color: addedColor, fontWeight: 700 }} />
                            <Chip size="small" label={`-${removed} removed`} sx={{ bgcolor: alpha(removedColor, 0.15), color: removedColor, fontWeight: 700 }} />
                            <Chip size="small" label={`${changed} changed`} sx={{ bgcolor: alpha(changedColor, 0.15), color: changedColor, fontWeight: 700 }} />
                            {diff.length > 0 && (
                                <Button size="small" startIcon={<ContentCopy />} onClick={copyDiff} sx={{ ml: 'auto' }}>
                                    Copy Diff
                                </Button>
                            )}
                        </Box>
                    )}

                    {!bothValid && (
                        <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                            Fix the invalid JSON above to see the diff.
                        </Alert>
                    )}

                    {bothValid && diff.length === 0 && (
                        <Alert severity="success" sx={{ flexShrink: 0 }}>
                            No differences - both JSON structures are identical.
                        </Alert>
                    )}

                    {bothValid && diff.length > 0 && (
                        <Box sx={{
                            borderRadius: '12px',
                            bgcolor: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            flex: 1,
                            minHeight: 0,
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                        }}>
                            {diff.map((d, idx) => {
                                const color = d.type === 'added' ? addedColor : d.type === 'removed' ? removedColor : changedColor;
                                const text = d.type === 'added'
                                    ? `+ ${d.path}: ${formatValue(d.newValue)}`
                                    : d.type === 'removed'
                                        ? `- ${d.path}: ${formatValue(d.oldValue)}`
                                        : `${d.path}: ${formatValue(d.oldValue)} → ${formatValue(d.newValue)}`;
                                return (
                                    <Box
                                        key={idx}
                                        sx={{
                                            px: 2,
                                            py: 0.75,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            bgcolor: alpha(color, 0.08),
                                            color,
                                            borderLeft: `3px solid ${color}`,
                                        }}
                                    >
                                        {text}
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default JsonDiffChecker;
