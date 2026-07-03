import React, { useState } from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Box,
    Stack,
    Alert,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Code,
    CheckCircle,
    Error as ErrorIcon,
    ContentCopy,
    Refresh,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

const JsonFormatter: React.FC = () => {
    const theme = useTheme();
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [indentSize, setIndentSize] = useState(2);

    const handleFormat = () => {
        try {
            if (!input) {
                setError('Please enter some JSON to format');
                return;
            }
            const parsed = JSON.parse(input);
            const formatted = JSON.stringify(parsed, null, indentSize);
            setOutput(formatted);
            setError(null);
        } catch (err: any) {
            setError((err as Error).message);
            setOutput('');
        }
    };

    const handleMinify = () => {
        try {
            const parsed = JSON.parse(input);
            const minified = JSON.stringify(parsed);
            setOutput(minified);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
            setOutput('');
        }
    };

    const handleValidate = () => {
        try {
            JSON.parse(input);
            setError(null);
            setOutput('✓ Valid JSON');
        } catch (err) {
            setError((err as Error).message);
            setOutput('');
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(output);
        setError('Copied to clipboard!');
        setTimeout(() => setError(null), 2000);
    };

    const handleReset = () => {
        setInput('');
        setOutput('');
        setError(null);
    };

    const exampleJSON = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        address: {
            street: '123 Main St',
            city: 'New York',
            country: 'USA',
        },
        hobbies: ['reading', 'coding', 'gaming'],
    };

    return (
        <ServicePageShell
            icon={Code}
            title="JSON Formatter & Validator"
            subtitle="Format, validate, and minify JSON data with ease - entirely in your browser."
            maxWidth="lg"
            howToSteps={[
                { name: 'Paste or type your JSON', text: 'Paste raw JSON text into the left editor panel. It can be minified, formatted, or even partially broken.' },
                { name: 'Format or validate', text: 'Click Format to auto-indent and beautify your JSON, or Validate to check for syntax errors with highlighted line numbers.' },
                { name: 'Copy or minify', text: 'Use the copy button to copy the result, or switch to minify mode to compress the JSON for production use.' },
            ]}
        >
            <Seo
                title="JSON Formatter & Validator - Beautify & Minify"
                toolId={7}
            />

            {error && (
                <Alert
                    severity={error.includes('Copied') ? 'success' : 'error'}
                    sx={{ mb: 1.5, flexShrink: 0 }}
                    onClose={() => setError(null)}
                    icon={error.includes('Copied') ? <CheckCircle /> : <ErrorIcon />}
                >
                    {error}
                </Alert>
            )}

            <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                {/* Left Column - Input */}
                <Grid item xs={12} md={6} sx={{ display: 'flex', minHeight: 0 }}>
                    <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexShrink: 0 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Input JSON
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => setInput(JSON.stringify(exampleJSON, null, 2))}
                                >
                                    Load Example
                                </Button>
                            </Box>

                            <TextField
                                fullWidth
                                multiline
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={'Paste your JSON here...\n\nExample:\n{\n  "name": "value"\n}'}
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                                    '& .MuiInputBase-input': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        height: '100% !important',
                                        overflowY: 'auto !important',
                                    },
                                }}
                            />

                            <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, flexShrink: 0, flexWrap: 'wrap' }}>
                                <Button variant="contained" onClick={handleFormat} startIcon={<Code />}>
                                    Format
                                </Button>
                                <Button variant="outlined" onClick={handleMinify}>
                                    Minify
                                </Button>
                                <Button variant="outlined" onClick={handleValidate} startIcon={<CheckCircle />}>
                                    Validate
                                </Button>
                                <Button variant="text" onClick={handleReset} startIcon={<Refresh />}>
                                    Reset
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column - Output */}
                <Grid item xs={12} md={6} sx={{ display: 'flex', minHeight: 0 }}>
                    <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexShrink: 0 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Output
                                </Typography>
                                {output && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={handleCopy}
                                        startIcon={<ContentCopy />}
                                    >
                                        Copy
                                    </Button>
                                )}
                            </Box>

                            <TextField
                                fullWidth
                                multiline
                                value={output}
                                InputProps={{
                                    readOnly: true,
                                }}
                                placeholder="Formatted JSON will appear here..."
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                                    '& .MuiInputBase-input': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        height: '100% !important',
                                        overflowY: 'auto !important',
                                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                                    },
                                }}
                            />

                            <Box sx={{ mt: 1.5, flexShrink: 0 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Indent Size:
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    {[2, 4, 8].map((size) => (
                                        <Button
                                            key={size}
                                            size="small"
                                            variant={indentSize === size ? 'contained' : 'outlined'}
                                            onClick={() => setIndentSize(size)}
                                        >
                                            {size} spaces
                                        </Button>
                                    ))}
                                </Stack>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default JsonFormatter;
