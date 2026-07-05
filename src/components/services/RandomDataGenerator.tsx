import React, { useState } from 'react';
import { Card, CardContent, Box, Typography, Button, TextField, MenuItem, Snackbar, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Casino, ContentCopy, Download } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

type Field = 'name' | 'email' | 'phone' | 'address' | 'uuid';

const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Priya', 'Wei', 'Fatima', 'Carlos', 'Emma', 'Liam', 'Sofia', 'Kenji', 'Aisha', 'Noah', 'Olivia', 'Diego'];
const LAST_NAMES = ['Smith', 'Johnson', 'Patel', 'Chen', 'Khan', 'Garcia', 'Muller', 'Nguyen', 'Kim', 'Rossi', 'Silva', 'Kowalski', 'Andersen', 'Sato'];
const DOMAINS = ['example.com', 'mail.com', 'inbox.dev', 'testmail.io', 'sample.org'];
const STREETS = ['Maple Ave', 'Oak Street', 'Sunset Blvd', 'Main Street', 'Cedar Lane', 'Park Road', 'Highland Drive'];
const CITIES = ['Springfield', 'Riverside', 'Fairview', 'Georgetown', 'Salem', 'Ashford', 'Millbrook'];

const FIELD_OPTIONS: { value: Field; label: string }[] = [
    { value: 'name', label: 'Full Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'address', label: 'Address' },
    { value: 'uuid', label: 'UUID' },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateValue = (field: Field, first: string, last: string): string => {
    switch (field) {
        case 'name': return `${first} ${last}`;
        case 'email': return `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1, 99)}@${pick(DOMAINS)}`;
        case 'phone': return `+1-${randInt(200, 999)}-${randInt(200, 999)}-${randInt(1000, 9999)}`;
        case 'address': return `${randInt(100, 9999)} ${pick(STREETS)}, ${pick(CITIES)}`;
        case 'uuid': return crypto.randomUUID();
    }
};

/** Generates plausible-looking (not real) mock data client-side for testing
 * forms, seeding databases, or filling out demos. Nothing leaves the browser. */
const RandomDataGenerator: React.FC = () => {
    const [fields, setFields] = useState<Field[]>(['name', 'email', 'phone']);
    const [count, setCount] = useState(10);
    const [rows, setRows] = useState<Record<string, string>[]>([]);
    const [snackbar, setSnackbar] = useState(false);

    const generate = () => {
        const newRows: Record<string, string>[] = [];
        for (let i = 0; i < count; i++) {
            const first = pick(FIRST_NAMES);
            const last = pick(LAST_NAMES);
            const row: Record<string, string> = {};
            for (const f of fields) row[f] = generateValue(f, first, last);
            newRows.push(row);
        }
        setRows(newRows);
    };

    const toggleField = (field: Field) => {
        setFields((prev) => prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]);
    };

    const asJson = () => JSON.stringify(rows, null, 2);
    const asCsv = () => {
        if (rows.length === 0) return '';
        const header = fields.join(',');
        const body = rows.map((r) => fields.map((f) => `"${r[f]}"`).join(',')).join('\n');
        return `${header}\n${body}`;
    };

    const handleCopyJson = () => {
        navigator.clipboard.writeText(asJson());
        setSnackbar(true);
    };

    const handleDownloadCsv = () => {
        const blob = new Blob([asCsv()], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mock-data.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <ServicePageShell
            icon={Casino}
            title="Random Data Generator"
            subtitle="Generate plausible mock names, emails, phone numbers, addresses, and UUIDs for testing forms and demos — nothing leaves your browser."
            maxWidth="md"
            about="Generates rows of plausible-looking but entirely fake test data — names, emails, phone numbers, street addresses, and UUIDs — by combining small built-in name/city/street lists with randomized numbers, all computed client-side with Math.random() and crypto.randomUUID(). Useful for populating a form, seeding a database, or building a demo without using real people's information. Output can be copied as JSON or downloaded as a CSV file."
            howToSteps={[
                { name: 'Pick your fields', text: 'Click the chips (Full Name, Email, Phone, Address, UUID) to toggle which columns get generated — selected chips turn green.' },
                { name: 'Choose a row count', text: 'Pick how many rows to generate from the Rows dropdown (5, 10, 25, 50, or 100).' },
                { name: 'Generate', text: 'Click Generate to produce a table of random rows using your selected fields.' },
                { name: 'Export the data', text: 'Click Copy JSON to copy the rows as a JSON array, or Download CSV to save them as a .csv file.' },
            ]}
            faq={[
                { question: 'Is this real personal data?', answer: 'No. Names are randomly combined from small built-in first/last-name lists, emails use fake placeholder domains (example.com, testmail.io, etc.), and phone numbers and addresses are randomly generated digits and streets — none of it corresponds to a real person.' },
                { question: 'Does anything get sent to a server?', answer: 'No. All generation happens in your browser with Math.random() and crypto.randomUUID(); nothing is uploaded, and the data only exists in your browser tab until you copy or download it.' },
                { question: 'What formats can I export to?', answer: 'Copy JSON copies a JSON array of row objects to your clipboard; Download CSV saves a comma-separated .csv file with a header row matching your selected fields.' },
                { question: 'Can I generate more than 100 rows at once?', answer: 'Not from the dropdown — it caps at 5/10/25/50/100 per click, though you can click Generate repeatedly (each click replaces the previous rows, so export before generating again if you want to keep them).' },
            ]}
        >
            <Seo title="Random Data Generator - Mock Test Data Online" />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
            }}>
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {FIELD_OPTIONS.map((f) => (
                            <Box
                                key={f.value}
                                onClick={() => toggleField(f.value)}
                                sx={{
                                    px: 2, py: 0.75, borderRadius: '20px', cursor: 'pointer',
                                    border: '1px solid', borderColor: fields.includes(f.value) ? 'primary.main' : 'rgba(255,255,255,0.15)',
                                    bgcolor: fields.includes(f.value) ? 'rgba(57,255,136,0.1)' : 'transparent',
                                    color: fields.includes(f.value) ? 'primary.main' : 'text.secondary',
                                    fontSize: '0.85rem', fontWeight: 600,
                                }}
                            >
                                {f.label}
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                        <TextField
                            select
                            label="Rows"
                            value={count}
                            onChange={(e) => setCount(Number(e.target.value))}
                            sx={{ width: 140 }}
                        >
                            {[5, 10, 25, 50, 100].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                        </TextField>
                        <Button variant="contained" startIcon={<Casino />} onClick={generate} disabled={fields.length === 0}>
                            Generate
                        </Button>
                        <Button variant="outlined" startIcon={<ContentCopy />} onClick={handleCopyJson} disabled={rows.length === 0}>
                            Copy JSON
                        </Button>
                        <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadCsv} disabled={rows.length === 0}>
                            Download CSV
                        </Button>
                    </Box>

                    {rows.length > 0 && (
                        <Box sx={{ maxHeight: 360, overflow: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {fields.map((f) => <TableCell key={f} sx={{ fontWeight: 700 }}>{FIELD_OPTIONS.find((o) => o.value === f)?.label}</TableCell>)}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row, i) => (
                                        <TableRow key={i}>
                                            {fields.map((f) => <TableCell key={f} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row[f]}</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}

                    {rows.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                            Pick fields and click Generate.
                        </Typography>
                    )}
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="Copied JSON to clipboard!" />
        </ServicePageShell>
    );
};

export default RandomDataGenerator;
