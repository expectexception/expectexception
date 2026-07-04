import React, { useState, useCallback } from 'react';
import {
    Box, Typography, Button, Stack, Grid, Paper, TextField, IconButton, Alert,
} from '@mui/material';
import { ContentCopy, Check, Code as CodeIcon, AutoFixHigh } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function jsonToTs(obj: any, name: string = 'Root', interfaces: Map<string, string> = new Map()): string {
    if (obj === null) return 'null';
    if (Array.isArray(obj)) {
        if (obj.length === 0) return 'any[]';
        const inner = jsonToTs(obj[0], name + 'Item', interfaces);
        return `${inner}[]`;
    }
    if (typeof obj === 'object') {
        const lines: string[] = [];
        for (const [key, val] of Object.entries(obj)) {
            const safeName = /^[a-zA-Z_$]/.test(key) ? key : `'${key}'`;
            const childName = capitalize(key);
            lines.push(`  ${safeName}: ${jsonToTs(val, childName, interfaces)};`);
        }
        const body = `interface ${name} {\n${lines.join('\n')}\n}`;
        interfaces.set(name, body);
        return name;
    }
    if (typeof obj === 'string') return 'string';
    if (typeof obj === 'number') return Number.isInteger(obj) ? 'number' : 'number';
    if (typeof obj === 'boolean') return 'boolean';
    return 'unknown';
}

const JsonToTypescript: React.FC = () => {
    const [input, setInput] = useState('{\n  "id": 1,\n  "name": "Alice",\n  "email": "alice@example.com",\n  "roles": ["admin", "user"],\n  "address": {\n    "city": "Mumbai",\n    "zip": "400001"\n  }\n}');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [rootName, setRootName] = useState('Root');

    const generate = useCallback(() => {
        setError('');
        try {
            const parsed = JSON.parse(input);
            const interfaces = new Map<string, string>();
            jsonToTs(parsed, rootName || 'Root', interfaces);
            const result = Array.from(interfaces.values()).reverse().join('\n\n');
            setOutput(result);
        } catch (e: any) {
            setError('Invalid JSON: ' + e.message);
        }
    }, [input, rootName]);

    const copy = () => {
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <ServicePageShell
            title="JSON to TypeScript Types"
            subtitle="Paste any JSON and instantly generate TypeScript interfaces. Handles nested objects, arrays, and primitives automatically."
            icon={CodeIcon}
            seoTitle="JSON to TypeScript — Generate Interfaces & Types from JSON"
            seoDescription="Convert JSON to TypeScript interfaces instantly. Supports nested objects and arrays."
            toolId={45}
            keywords={['json to typescript', 'generate typescript interface', 'json to type', 'typescript interface generator', 'json schema to types', 'json to ts', 'quicktype alternative', 'ts type from json']}
            howToSteps={[
                { name: 'Paste your JSON', text: 'Paste any JSON object in the input panel.' },
                { name: 'Set root interface name', text: 'Optionally change the root interface name (default: Root).' },
                { name: 'Generate & copy', text: 'Click Generate and copy the TypeScript interfaces.' },
            ]}
        >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <TextField size="small" label="Root interface name" value={rootName} onChange={e => setRootName(e.target.value)} sx={{ width: 200 }} />
                <Button variant="contained" startIcon={<AutoFixHigh />} onClick={generate} sx={{ height: 40 }}>Generate</Button>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>JSON Input</Typography>
                    <TextField
                        multiline
                        rows={16}
                        fullWidth
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                        placeholder='Paste JSON here…'
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">TypeScript Output</Typography>
                        {output && <IconButton size="small" onClick={copy} sx={{ color: copied ? 'success.main' : 'text.secondary' }}>{copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}</IconButton>}
                    </Box>
                    <Paper sx={{ p: 2, bgcolor: '#0d1117', borderRadius: 1.5, minHeight: 360, position: 'relative', overflow: 'auto' }}>
                        <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#c9d1d9', m: 0, whiteSpace: 'pre-wrap' }}>
                            {output || <span style={{ color: '#64748b' }}>TypeScript interfaces will appear here…</span>}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default JsonToTypescript;
