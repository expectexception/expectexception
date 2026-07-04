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
