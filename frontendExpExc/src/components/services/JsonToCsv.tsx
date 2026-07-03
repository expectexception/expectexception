import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Alert, Stack, Typography, useTheme, alpha } from '@mui/material';
import { TableChart, Download, SwapHoriz, ContentCopy } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const jsonToCsv = (jsonStr: string): string => {
    const data = JSON.parse(jsonStr);
    const arr = Array.isArray(data) ? data : [data];
    if (!arr.length) return '';
    const keys = Array.from(new Set(arr.flatMap(Object.keys)));
    const escape = (v: any) => {
        const s = v === null || v === undefined ? '' : String(typeof v === 'object' ? JSON.stringify(v) : v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [keys.join(','), ...arr.map(row => keys.map(k => escape(row[k])).join(','))].join('\n');
};

const csvToJson = (csv: string): string => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    });
    return JSON.stringify(rows, null, 2);
};

const JsonToCsv: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [mode, setMode] = useState<'json-to-csv' | 'csv-to-json'>('json-to-csv');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const convert = () => {
        setError(null);
        try {
            setOutput(mode === 'json-to-csv' ? jsonToCsv(input) : csvToJson(input));
        } catch (e: any) {
            setError(e.message || 'Conversion failed');
        }
    };

    const download = () => {
        const ext = mode === 'json-to-csv' ? 'csv' : 'json';
        const blob = new Blob([output], { type: `text/${ext}` });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `output.${ext}`;
        a.click();
    };

    const copy = () => {
        navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    const placeholder = mode === 'json-to-csv'
        ? '[{"name":"Alice","age":30},{"name":"Bob","age":25}]'
        : 'name,age\nAlice,30\nBob,25';

    return (
        <ServicePageShell icon={TableChart} title="JSON ↔ CSV Converter" subtitle="Convert between JSON arrays and CSV files — 100% in your browser" maxWidth="xl">
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                        <Button
                            variant={mode === 'json-to-csv' ? 'contained' : 'outlined'}
                            onClick={() => { setMode('json-to-csv'); setInput(''); setOutput(''); setError(null); }}
                            size="small" sx={{ borderRadius: 2 }}
                        >JSON → CSV</Button>
                        <Button
                            variant={mode === 'csv-to-json' ? 'contained' : 'outlined'}
                            onClick={() => { setMode('csv-to-json'); setInput(''); setOutput(''); setError(null); }}
                            size="small" sx={{ borderRadius: 2 }}
                        >CSV → JSON</Button>
                    </Stack>
                    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Input ({mode === 'json-to-csv' ? 'JSON' : 'CSV'})
                            </Typography>
                            <TextField
                                fullWidth multiline rows={14} value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={placeholder}
                                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Button variant="contained" onClick={convert} sx={{ px: 3, py: 1.5, borderRadius: 2, minWidth: 120 }} startIcon={<SwapHoriz />}>
                                Convert
                            </Button>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Output ({mode === 'json-to-csv' ? 'CSV' : 'JSON'})
                                </Typography>
                                {output && (
                                    <Stack direction="row" spacing={0.5}>
                                        <Button size="small" onClick={copy} startIcon={<ContentCopy sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.72rem' }}>
                                            {copied ? 'Copied!' : 'Copy'}
                                        </Button>
                                        <Button size="small" onClick={download} startIcon={<Download sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.72rem' }}>
                                            Download
                                        </Button>
                                    </Stack>
                                )}
                            </Box>
                            <TextField
                                fullWidth multiline rows={14} value={output}
                                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' }, readOnly: true }}
                                placeholder="Output will appear here..."
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: alpha(primary, 0.02) } }}
                            />
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default JsonToCsv;
