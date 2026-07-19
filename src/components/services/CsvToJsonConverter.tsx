import React, { useMemo, useRef, useState } from 'react';
import {
    Box, Card, CardContent, TextField, Typography, Button, Stack, Alert,
    FormControlLabel, Switch, Chip, useTheme, alpha, Snackbar,
} from '@mui/material';
import { Transform, Download, ContentCopy, UploadFile } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

// ---------------------------------------------------------------------------
// CSV parsing
//
// A real state-machine parser rather than `line.split(',')`: CSV fields can
// be wrapped in double quotes to safely contain commas, line breaks, and a
// doubled `""` as an escaped literal quote character. Naively splitting on
// every comma or newline would incorrectly break those fields apart.
// ---------------------------------------------------------------------------

/** Parses raw CSV text into a 2D array of string cells. Handles quoted
 * fields (which may contain commas and embedded line breaks), doubled `""`
 * as an escaped literal quote, and both \n and \r\n line endings. Fully
 * blank lines (a row with a single empty cell) are dropped, since they carry
 * no data and would otherwise become meaningless empty objects. */
function parseCsv(rawInput: string): string[][] {
    // Strip a leading UTF-8 byte-order mark, which spreadsheet apps such as
    // Excel commonly prepend and which would otherwise end up glued to the
    // first header name.
    const input = rawInput.replace(/^\uFEFF/, '');

    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    const endField = () => { row.push(field); field = ''; };
    const endRow = () => { endField(); rows.push(row); row = []; };

    while (i < input.length) {
        const ch = input[i];

        if (inQuotes) {
            if (ch === '"') {
                if (input[i + 1] === '"') { field += '"'; i += 2; continue; }
                inQuotes = false;
                i++;
                continue;
            }
            field += ch;
            i++;
            continue;
        }

        if (ch === '"') { inQuotes = true; i++; continue; }
        if (ch === ',') { endField(); i++; continue; }
        if (ch === '\r') {
            if (input[i + 1] === '\n') i++;
            endRow();
            i++;
            continue;
        }
        if (ch === '\n') { endRow(); i++; continue; }

        field += ch;
        i++;
    }
    // Flush a final field/row for input that does not end with a newline.
    if (field.length > 0 || row.length > 0) endRow();

    return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

// Matches a plain integer or decimal (optionally negative) with no leading
// zero, e.g. "42", "-3.5", "0.25", "0" — but not "007" or "01234", so
// numeric-looking identifiers like ZIP codes are not corrupted into numbers.
const NUMBER_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;

/** Converts a raw CSV cell into a real JSON type when it unambiguously
 * looks like one: "true"/"false" to booleans, "null" to null, and a
 * plain-looking number to an actual number. Anything else — including
 * numbers with a leading zero — is left as a string. */
function coerceValue(raw: string): string | number | boolean | null {
    if (raw === '') return '';
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    if (NUMBER_RE.test(raw)) return Number(raw);
    return raw;
}

/** Builds JSON-object-safe header names from the first CSV row: blank
 * header cells get a placeholder name, and duplicate names are numbered
 * (e.g. two "total" columns become total and total_2) so no field is
 * silently dropped by a key collision. */
function buildHeaders(headerRow: string[]): string[] {
    const seen = new Map<string, number>();
    return headerRow.map((cell, idx) => {
        const base = cell.trim() || `column_${idx + 1}`;
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        return count > 0 ? `${base}_${count + 1}` : base;
    });
}

function rowsToObjects(rows: string[][], coerceTypes: boolean): { headers: string[]; objects: Record<string, unknown>[] } {
    const headers = buildHeaders(rows[0]);
    const objects = rows.slice(1).map(cells => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
            const raw = cells[idx] ?? '';
            obj[h] = coerceTypes ? coerceValue(raw) : raw;
        });
        return obj;
    });
    return { headers, objects };
}

const SAMPLE_CSV = `name,age,city,notes
John Smith,34,"New York, NY","Says ""hi"" a lot"
Jane Doe,29,Boston,Simple note
`;

const CsvToJsonConverter: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [csvText, setCsvText] = useState(SAMPLE_CSV);
    const [fileName, setFileName] = useState<string | null>(null);
    const [coerceTypes, setCoerceTypes] = useState(true);
    const [snackbar, setSnackbar] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { objects, headers, error } = useMemo(() => {
        const parsedRows = parseCsv(csvText);
        if (parsedRows.length === 0) {
            return {
                objects: [] as Record<string, unknown>[],
                headers: [] as string[],
                error: 'Paste CSV text above, or upload a .csv file, to see the JSON output.' as string | null,
            };
        }
        const { headers, objects } = rowsToObjects(parsedRows, coerceTypes);
        return { objects, headers, error: null as string | null };
    }, [csvText, coerceTypes]);

    const jsonOutput = useMemo(() => JSON.stringify(objects, null, 2), [objects]);

    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = e => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                setCsvText(result);
                setFileName(file.name);
            }
        };
        reader.onerror = () => setSnackbar('Failed to read the file.');
        reader.readAsText(file);
    };

    const handleCopy = () => {
        if (!objects.length) return;
        navigator.clipboard.writeText(jsonOutput);
        setSnackbar('JSON copied to clipboard!');
    };

    const handleDownload = () => {
        if (!objects.length) return;
        const blob = new Blob([jsonOutput], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName ? fileName.replace(/\.csv$/i, '') : 'data'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <ServicePageShell
            icon={Transform}
            title="CSV to JSON Converter"
            subtitle="Paste or upload a CSV file and convert it to a formatted JSON array — parsed entirely in your browser"
            maxWidth="md"
            seoTitle="CSV to JSON Converter — Free Online CSV to JSON Tool"
            keywords={['csv to json converter', 'convert csv to json online', 'csv to json free', 'csv file to json array', 'parse csv to json', 'csv to json javascript', 'upload csv convert json', 'csv to json object']}
            about="Parses CSV text, whether pasted directly or loaded from an uploaded .csv file, using a real character-by-character parser rather than a naive comma split, so fields wrapped in double quotes can safely contain commas and line breaks, and a doubled double quote inside a quoted field is correctly unescaped to a single literal quote character. The first row is treated as the header and becomes the object keys; every following row becomes one JSON object, with an optional automatic type pass that converts unquoted true, false, and null text into real booleans and null, and plain numbers into actual numeric values, while leaving anything with a leading zero, such as a ZIP code, as a string so it is not corrupted. Built for quick conversions of exported spreadsheets or database dumps into JSON for use in code, API testing, or configuration files; it is not a streaming parser, so extremely large files of tens of megabytes may be slow since the whole file is parsed in memory at once. Everything runs locally in the browser and the file contents are never uploaded anywhere."
            howToSteps={[
                { name: 'Add your CSV', text: 'Paste CSV text directly into the box, or click Upload CSV File to load a .csv file from your computer.' },
                { name: 'Check the parsed output', text: 'The JSON array of objects updates automatically on the right, using the first row as the object keys.' },
                { name: 'Toggle type conversion', text: 'Turn on Convert numbers and booleans to turn plain numeric and true, false, or null text into real JSON types, or turn it off to keep every value as a plain string.' },
                { name: 'Copy or download', text: 'Click Copy JSON to copy the result to the clipboard, or Download JSON to save it as a .json file.' },
            ]}
            faq={[
                { question: 'How does it handle commas inside a field?', answer: 'Wrap that field in double quotes in the CSV, for example a name field containing a comma, and the parser keeps it as a single field instead of splitting on the comma inside the quotes. This is standard CSV quoting, implemented directly rather than by just splitting on every comma.' },
                { question: 'What if a quoted field itself contains a double quote?', answer: 'Escape it by doubling it, so a literal quote character inside a quoted field is written as two double quotes in a row. This is the standard CSV escaping convention, and the parser turns the doubled quote back into a single literal quote in the output.' },
                { question: 'Does it work with files exported from Excel or Google Sheets?', answer: 'Yes, both Unix-style and Windows-style line endings are supported, which covers CSV files exported from Excel, Google Sheets, Numbers, and most databases.' },
                { question: 'Is the CSV data uploaded anywhere?', answer: 'No, parsing happens entirely in the browser using JavaScript, whether the CSV is pasted as text or loaded from an uploaded file; nothing is sent to a server.' },
            ]}
        >
            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2, flexShrink: 0 }}>
                        <Button variant="outlined" size="small" startIcon={<UploadFile />} onClick={() => inputRef.current?.click()}>
                            Upload CSV File
                        </Button>
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".csv,text/csv,text/plain"
                            hidden
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                        />
                        {fileName && <Chip size="small" label={fileName} onDelete={() => setFileName(null)} />}
                        <FormControlLabel
                            sx={{ ml: 'auto' }}
                            control={<Switch checked={coerceTypes} onChange={e => setCoerceTypes(e.target.checked)} size="small" />}
                            label={<Typography variant="body2">Convert numbers &amp; booleans</Typography>}
                        />
                    </Stack>

                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, flex: 1, minHeight: 0 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                CSV Input
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={14}
                                value={csvText}
                                onChange={e => { setCsvText(e.target.value); setFileName(null); }}
                                placeholder={'name,age,city\nJohn,34,NYC'}
                                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                    JSON Output{objects.length > 0 && ` — ${objects.length} row${objects.length === 1 ? '' : 's'} × ${headers.length} col${headers.length === 1 ? '' : 's'}`}
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                    <Button size="small" onClick={handleCopy} startIcon={<ContentCopy sx={{ fontSize: 14 }} />} disabled={!objects.length} sx={{ fontSize: '0.72rem' }}>
                                        Copy
                                    </Button>
                                    <Button size="small" onClick={handleDownload} startIcon={<Download sx={{ fontSize: 14 }} />} disabled={!objects.length} sx={{ fontSize: '0.72rem' }}>
                                        Download
                                    </Button>
                                </Stack>
                            </Box>
                            {error ? (
                                <Alert severity="info">{error}</Alert>
                            ) : (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={14}
                                    value={jsonOutput}
                                    inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' }, readOnly: true }}
                                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: alpha(primary, 0.02) } }}
                                />
                            )}
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default CsvToJsonConverter;
