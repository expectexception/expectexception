import React, { useState, useCallback, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Button, Stack, ToggleButton,
    ToggleButtonGroup, IconButton, Tooltip, Alert, useTheme, alpha,
} from '@mui/material';
import { Storage, ContentCopy, ClearAll, Done } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * A small SQL pretty-printer.
 *
 * Tokenise first, then lay out. Doing this with regex replacements over
 * the raw string is the obvious shortcut and it breaks the moment a
 * keyword appears inside a string literal ('SELECT' as a value) or a
 * comment — so string/comment runs are captured as single atomic tokens
 * and never inspected for keywords afterwards.
 * ------------------------------------------------------------------ */

/** Keywords that begin a new line at the current indent level. */
const NEWLINE_KEYWORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET',
    'VALUES', 'SET', 'UNION', 'INTERSECT', 'EXCEPT', 'RETURNING', 'WINDOW',
]);

/** Multi-word constructs that must stay on one line ("LEFT OUTER JOIN"). */
const JOIN_STARTERS = new Set(['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'NATURAL']);

const KEYWORDS = new Set([
    ...Array.from(NEWLINE_KEYWORDS), ...Array.from(JOIN_STARTERS),
    'INSERT', 'INTO', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE',
    'VIEW', 'INDEX', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
    'ILIKE', 'IS', 'NULL', 'AS', 'ON', 'BY', 'ASC', 'DESC', 'DISTINCT', 'ALL',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'OUTER', 'WITH', 'RECURSIVE',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'DEFAULT', 'UNIQUE', 'CHECK',
    'CONSTRAINT', 'CASCADE', 'ADD', 'COLUMN', 'RENAME', 'TO', 'IF', 'REPLACE',
    'INT', 'INTEGER', 'BIGINT', 'SERIAL', 'TEXT', 'VARCHAR', 'CHAR', 'BOOLEAN',
    'DATE', 'TIMESTAMP', 'NUMERIC', 'DECIMAL', 'FLOAT', 'DOUBLE', 'JSON', 'JSONB',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'CAST', 'OVER', 'PARTITION',
]);

type TokenKind = 'word' | 'string' | 'comment' | 'punct' | 'number';
interface Token { kind: TokenKind; value: string; }

function tokenize(sql: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < sql.length) {
        const ch = sql[i];

        // Whitespace is structural only; the layout pass re-creates it.
        if (/\s/.test(ch)) { i++; continue; }

        // Line comment
        if (ch === '-' && sql[i + 1] === '-') {
            let end = sql.indexOf('\n', i);
            if (end === -1) end = sql.length;
            tokens.push({ kind: 'comment', value: sql.slice(i, end) });
            i = end;
            continue;
        }

        // Block comment
        if (ch === '/' && sql[i + 1] === '*') {
            let end = sql.indexOf('*/', i + 2);
            end = end === -1 ? sql.length : end + 2;
            tokens.push({ kind: 'comment', value: sql.slice(i, end) });
            i = end;
            continue;
        }

        // Quoted runs: single-quoted literals, double-quoted and backtick
        // identifiers. Captured whole so their contents are never treated as
        // keywords or punctuation.
        if (ch === "'" || ch === '"' || ch === '`') {
            let j = i + 1;
            while (j < sql.length) {
                if (sql[j] === '\\') { j += 2; continue; }
                // Doubled quote is an escaped quote inside the literal.
                if (sql[j] === ch && sql[j + 1] === ch) { j += 2; continue; }
                if (sql[j] === ch) { j++; break; }
                j++;
            }
            tokens.push({ kind: 'string', value: sql.slice(i, j) });
            i = j;
            continue;
        }

        if (/[0-9]/.test(ch)) {
            let j = i;
            while (j < sql.length && /[0-9.]/.test(sql[j])) j++;
            tokens.push({ kind: 'number', value: sql.slice(i, j) });
            i = j;
            continue;
        }

        if (/[A-Za-z_@#$]/.test(ch)) {
            let j = i;
            while (j < sql.length && /[A-Za-z0-9_@#$.]/.test(sql[j])) j++;
            tokens.push({ kind: 'word', value: sql.slice(i, j) });
            i = j;
            continue;
        }

        tokens.push({ kind: 'punct', value: ch });
        i++;
    }

    return tokens;
}

interface FormatOptions {
    uppercase: boolean;
    indent: string;
}

function formatSql(sql: string, { uppercase, indent }: FormatOptions): string {
    const tokens = tokenize(sql);
    if (tokens.length === 0) return '';

    const lines: string[] = [];
    let current = '';
    let depth = 0;

    const flush = () => {
        const trimmed = current.trimEnd();
        if (trimmed) lines.push(trimmed);
        current = '';
    };
    const startLine = (extraDepth = 0) => {
        flush();
        current = indent.repeat(Math.max(0, depth + extraDepth));
    };
    const append = (text: string, spaceBefore = true) => {
        if (current.trim() === '') current += text;
        else current += (spaceBefore ? ' ' : '') + text;
    };

    for (let idx = 0; idx < tokens.length; idx++) {
        const token = tokens[idx];
        const upper = token.value.toUpperCase();
        const isKeyword = token.kind === 'word' && KEYWORDS.has(upper);
        const rendered = isKeyword && uppercase ? upper
            : isKeyword && !uppercase ? token.value.toLowerCase()
            : token.value;

        if (token.kind === 'comment') {
            startLine();
            append(token.value, false);
            flush();
            continue;
        }

        if (token.kind === 'punct') {
            if (token.value === '(') {
                append('(');
                depth++;
                continue;
            }
            if (token.value === ')') {
                depth = Math.max(0, depth - 1);
                append(')', false);
                continue;
            }
            if (token.value === ',') {
                // Comma binds to the preceding token, then breaks the line so
                // each selected column / value sits on its own row.
                append(',', false);
                startLine(1);
                continue;
            }
            if (token.value === ';') {
                append(';', false);
                flush();
                lines.push('');
                depth = 0;
                continue;
            }
            append(token.value, !'.'.includes(token.value));
            continue;
        }

        if (isKeyword) {
            // GROUP/ORDER only start a clause when followed by BY; otherwise
            // they are an ordinary identifier ("order" as a column name).
            const next = tokens[idx + 1];
            const isClause = NEWLINE_KEYWORDS.has(upper)
                && !((upper === 'GROUP' || upper === 'ORDER') && next?.value.toUpperCase() !== 'BY');

            if (isClause) {
                startLine();
                append(rendered, false);
                continue;
            }
            if (JOIN_STARTERS.has(upper)) {
                // Only break for the token that opens the join phrase, so
                // "LEFT OUTER JOIN" stays intact on one line.
                const prevUpper = idx > 0 ? tokens[idx - 1].value.toUpperCase() : '';
                if (!JOIN_STARTERS.has(prevUpper) && prevUpper !== 'OUTER') {
                    startLine();
                    append(rendered, false);
                    continue;
                }
            }
            if (upper === 'AND' || upper === 'OR') {
                startLine(1);
                append(rendered, false);
                continue;
            }
            append(rendered);
            continue;
        }

        // Identifiers, numbers, strings.
        const prev = tokens[idx - 1];
        const noSpace = prev?.kind === 'punct' && (prev.value === '(' || prev.value === '.');
        append(rendered, !noSpace);
    }

    flush();
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const SAMPLE = `select u.id, u.email, count(o.id) as order_count from users u left outer join orders o on o.user_id = u.id where u.is_active = true and u.created_at >= '2024-01-01' group by u.id, u.email having count(o.id) > 3 order by order_count desc limit 20;`;

const SqlFormatter: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [input, setInput] = useState(SAMPLE);
    const [uppercase, setUppercase] = useState(true);
    const [indentSize, setIndentSize] = useState(2);
    const [copied, setCopied] = useState(false);

    const output = useMemo(() => {
        try {
            return formatSql(input, { uppercase, indent: ' '.repeat(indentSize) });
        } catch {
            return '';
        }
    }, [input, uppercase, indentSize]);

    const handleCopy = useCallback(async () => {
        if (!output) return;
        await navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    }, [output]);

    return (
        <ServicePageShell
            icon={Storage}
            title="SQL Formatter"
            subtitle="Turn a one-line query into readable, indented SQL"
            maxWidth="lg"
            seoTitle="SQL Formatter & Beautifier | Format SQL Queries Online Free"
            seoDescription="Paste a cramped SQL query and get clean, indented, readable SQL back. Handles joins, subqueries, CASE expressions, string literals and comments. Runs entirely in your browser."
            toolId={63}
            keywords={['sql formatter', 'sql beautifier', 'format sql online', 'sql pretty print', 'sql query formatter', 'beautify sql', 'sql indent tool', 'clean up sql query']}
            about="Queries that arrive from logs, ORMs or a colleague's message are usually one long line, which makes them hard to read and harder to review. This formatter breaks the query at its clause boundaries, puts each selected column and each join on its own line, indents subqueries by nesting depth, and optionally normalises keyword casing. It parses the query into tokens first, so keywords that appear inside string literals or comments are left exactly as written rather than being reformatted. Everything runs in your browser — the query, which often contains table names and business logic, is never sent anywhere."
            howToSteps={[
                { name: 'Paste your SQL', text: 'Drop a query of any length into the input box. It can be minified, single-line, or already partly formatted.' },
                { name: 'Pick your style', text: 'Choose uppercase or lowercase keywords and an indent width of 2 or 4 spaces.' },
                { name: 'Copy the result', text: 'The formatted query updates as you type. Click the copy button to put it on your clipboard.' },
            ]}
            faq={[
                { question: 'Is my query sent to a server?', answer: 'No. The formatter is plain JavaScript running in your browser, so the query never leaves your machine — which matters, since SQL usually reveals your schema and business logic.' },
                { question: 'Which SQL dialects are supported?', answer: 'The formatter is dialect-agnostic. It recognises the keywords common to PostgreSQL, MySQL, SQL Server, SQLite and Oracle, and anything it does not recognise is treated as an identifier and passed through untouched.' },
                { question: 'Will it change what my query does?', answer: 'No. Only whitespace and, if you enable it, the casing of recognised keywords are changed. String literals, quoted identifiers and comments are preserved byte-for-byte.' },
            ]}
        >
            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 3, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={uppercase ? 'upper' : 'lower'}
                            onChange={(_, v) => { if (v) setUppercase(v === 'upper'); }}
                        >
                            <ToggleButton value="upper">UPPERCASE</ToggleButton>
                            <ToggleButton value="lower">lowercase</ToggleButton>
                        </ToggleButtonGroup>

                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={indentSize}
                            onChange={(_, v) => { if (v) setIndentSize(v); }}
                        >
                            <ToggleButton value={2}>2 spaces</ToggleButton>
                            <ToggleButton value={4}>4 spaces</ToggleButton>
                        </ToggleButtonGroup>

                        <Stack direction="row" spacing={1}>
                            <Tooltip title="Clear">
                                <IconButton size="small" onClick={() => setInput('')}><ClearAll /></IconButton>
                            </Tooltip>
                            <Button size="small" onClick={() => setInput(SAMPLE)}>Load sample</Button>
                        </Stack>
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, flex: 1, minHeight: 0 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5 }}>
                                INPUT
                            </Typography>
                            <TextField
                                multiline
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="select * from users where id = 1;"
                                sx={{ flex: 1, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' } }}
                                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem', height: '100%' } }}
                                minRows={12}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    FORMATTED
                                </Typography>
                                <Tooltip title={copied ? 'Copied' : 'Copy'}>
                                    <span>
                                        <IconButton size="small" onClick={handleCopy} disabled={!output}>
                                            {copied ? <Done fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Stack>
                            <Box
                                component="pre"
                                sx={{
                                    flex: 1, m: 0, p: 2, overflow: 'auto', minHeight: 240,
                                    borderRadius: 1,
                                    bgcolor: alpha(primary, 0.04),
                                    border: `1px solid ${alpha(primary, 0.15)}`,
                                    fontFamily: 'monospace', fontSize: '0.85rem',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                }}
                            >
                                {output || <Typography component="span" variant="body2" color="text.disabled">Formatted SQL appears here</Typography>}
                            </Box>
                        </Box>
                    </Box>

                    <Alert severity="info" sx={{ py: 0.5 }}>
                        Only whitespace and keyword casing change — string literals, quoted identifiers and comments are preserved exactly.
                    </Alert>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default SqlFormatter;
