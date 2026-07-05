import React, { useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, Button, IconButton, Snackbar } from '@mui/material';
import { TableChart, ContentCopy, Add, Remove } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 3;

/** Builds a markdown table from an editable grid — no typing pipe characters
 * or alignment dashes by hand. Purely client-side string generation. */
const MarkdownTableGenerator: React.FC = () => {
    const [headers, setHeaders] = useState<string[]>(Array.from({ length: DEFAULT_COLS }, (_, i) => `Header ${i + 1}`));
    const [rows, setRows] = useState<string[][]>(
        Array.from({ length: DEFAULT_ROWS }, () => Array.from({ length: DEFAULT_COLS }, () => ''))
    );
    const [snackbar, setSnackbar] = useState(false);

    const addColumn = () => {
        setHeaders((h) => [...h, `Header ${h.length + 1}`]);
        setRows((r) => r.map((row) => [...row, '']));
    };
    const removeColumn = () => {
        if (headers.length <= 1) return;
        setHeaders((h) => h.slice(0, -1));
        setRows((r) => r.map((row) => row.slice(0, -1)));
    };
    const addRow = () => setRows((r) => [...r, Array.from({ length: headers.length }, () => '')]);
    const removeRow = () => setRows((r) => (r.length > 1 ? r.slice(0, -1) : r));

    const updateHeader = (idx: number, value: string) => {
        setHeaders((h) => h.map((cell, i) => (i === idx ? value : cell)));
    };
    const updateCell = (rowIdx: number, colIdx: number, value: string) => {
        setRows((r) => r.map((row, i) => (i === rowIdx ? row.map((cell, j) => (j === colIdx ? value : cell)) : row)));
    };

    const markdown = useMemo(() => {
        const escapeCell = (s: string) => s.replace(/\|/g, '\\|') || ' ';
        const headerLine = `| ${headers.map(escapeCell).join(' | ')} |`;
        const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`;
        const rowLines = rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`);
        return [headerLine, dividerLine, ...rowLines].join('\n');
    }, [headers, rows]);

    const handleCopy = () => {
        navigator.clipboard.writeText(markdown);
        setSnackbar(true);
    };

    const cellStyle = {
        border: '1px solid rgba(255,255,255,0.1)',
        p: 1,
        outline: 'none',
        minWidth: 100,
    };

    return (
        <ServicePageShell
            icon={TableChart}
            title="Markdown Table Generator"
            subtitle="Edit a grid and get valid GitHub-flavored markdown table syntax instantly — no manual pipes or dashes."
            maxWidth="md"
            about="Build a Markdown table visually instead of hand-typing pipe (|) characters and header-divider dashes. Click into any header or cell to edit it directly, use the Column/Row buttons to resize the grid, and the tool continuously regenerates valid GitHub-Flavored Markdown table syntax — including escaping any literal | characters you type — in the output box below. Everything runs client-side as plain string building; nothing is sent to a server."
            howToSteps={[
                { name: 'Set up your grid', text: 'Use the Column and Row buttons (with + and − icons) to grow or shrink the table — it starts at a 3×3 grid.' },
                { name: 'Edit the headers', text: 'Click directly on any Header 1, Header 2… cell at the top of the grid and type to rename it.' },
                { name: 'Fill in cell values', text: 'Click any cell in the body of the table and type its content — each cell is edited in place.' },
                { name: 'Copy the generated Markdown', text: 'The box below the grid updates live with the equivalent pipe-delimited Markdown table syntax; click Copy Markdown to copy it to your clipboard.' },
            ]}
            faq={[
                { question: 'Do I need to type pipe characters or divider dashes myself?', answer: 'No — the tool generates the header row, the --- divider row, and every data row automatically from whatever you type into the grid cells.' },
                { question: 'What happens if my cell text contains a | character?', answer: "It's automatically escaped as \\| in the generated Markdown so it doesn't break the table structure." },
                { question: 'What if I leave a cell empty?', answer: 'Empty cells are rendered as a single space in the output so the pipe structure stays valid Markdown.' },
                { question: 'Is the output GitHub-compatible?', answer: 'Yes — the output is standard GitHub-Flavored Markdown table syntax, so it renders correctly in GitHub READMEs, issues, PRs, and any other GFM-compatible renderer.' },
            ]}
        >
            <Seo title="Markdown Table Generator - Free Online Tool" />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
            }}>
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Button size="small" variant="outlined" startIcon={<Add />} onClick={addColumn}>Column</Button>
                        <Button size="small" variant="outlined" startIcon={<Remove />} onClick={removeColumn}>Column</Button>
                        <Button size="small" variant="outlined" startIcon={<Add />} onClick={addRow}>Row</Button>
                        <Button size="small" variant="outlined" startIcon={<Remove />} onClick={removeRow}>Row</Button>
                    </Box>

                    <Box sx={{ overflowX: 'auto', mb: 3 }}>
                        <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%' }}>
                            <Box component="thead">
                                <Box component="tr">
                                    {headers.map((h, i) => (
                                        <Box
                                            component="th"
                                            key={i}
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => updateHeader(i, e.currentTarget.textContent || '')}
                                            sx={{ ...cellStyle, fontWeight: 800, bgcolor: 'rgba(57,255,136,0.06)', textAlign: 'left' }}
                                        >
                                            {h}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                            <Box component="tbody">
                                {rows.map((row, rIdx) => (
                                    <Box component="tr" key={rIdx}>
                                        {row.map((cell, cIdx) => (
                                            <Box
                                                component="td"
                                                key={cIdx}
                                                contentEditable
                                                suppressContentEditableWarning
                                                onBlur={(e) => updateCell(rIdx, cIdx, e.currentTarget.textContent || '')}
                                                sx={cellStyle}
                                            >
                                                {cell}
                                            </Box>
                                        ))}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Markdown output:
                    </Typography>
                    <Box sx={{
                        p: 2, borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace',
                        fontSize: '0.8rem', whiteSpace: 'pre', overflowX: 'auto', mb: 2,
                    }}>
                        {markdown}
                    </Box>
                    <Button variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
                        Copy Markdown
                    </Button>
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="Markdown copied to clipboard!" />
        </ServicePageShell>
    );
};

export default MarkdownTableGenerator;
