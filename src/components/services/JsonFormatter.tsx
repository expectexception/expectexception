import React, { useState } from 'react';
import {
    Container,
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
} from '@mui/material';
import {
    Code,
    CheckCircle,
    Error as ErrorIcon,
    ContentCopy,
    Download,
    Refresh,
} from '@mui/icons-material';
import Seo from '../seo/Seo';




const JsonFormatter: React.FC = () => {
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
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Seo
                title="JSON Formatter & Validator - Beautify & Minify"
                description="The best online JSON formatter, beautifier, and validator. Clean up messy JSON data, validate syntax, and minify for production."
                keywords={['json formatter', 'json beautifier', 'validate json', 'minify json', 'json editor online', 'developer tools', 'json pretty print', 'json validator', 'json minify', 'format json string', 'validate json data']}
            />

            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                JSON Formatter & Validator
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
                Format, validate, and minify JSON data with ease
            </Typography>

            {error && (
                <Alert
                    severity={error.includes('Copied') ? 'success' : 'error'}
                    sx={{ mb: 3 }}
                    onClose={() => setError(null)}
                    icon={error.includes('Copied') ? <CheckCircle /> : <ErrorIcon />}
                >
                    {error}
                </Alert>
            )}

            <Grid container spacing={4}>
                {/* Left Column - Input */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                                rows={20}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder='Paste your JSON here...\n\nExample:\n{\n  "name": "value"\n}'
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                    },
                                }}
                            />

                            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
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
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                                rows={20}
                                value={output}
                                InputProps={{
                                    readOnly: true,
                                }}
                                placeholder="Formatted JSON will appear here..."
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        bgcolor: alpha('#000', 0.02),
                                    },
                                }}
                            />

                            <Box sx={{ mt: 3 }}>
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

            {/* Features */}
            <Box sx={{ mt: 6 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                    Features
                </Typography>
                <Grid container spacing={3} sx={{ mt: 2 }}>
                    {[
                        {
                            title: 'Format & Beautify',
                            description: 'Make your JSON readable with proper indentation and line breaks.',
                            icon: <Code />,
                        },
                        {
                            title: 'Validate',
                            description: 'Check if your JSON is valid and identify syntax errors.',
                            icon: <CheckCircle />,
                        },
                        {
                            title: 'Minify',
                            description: 'Remove whitespace to reduce file size for production.',
                            icon: <Download />,
                        },
                        {
                            title: 'Error Detection',
                            description: 'Get detailed error messages to fix invalid JSON quickly.',
                            icon: <ErrorIcon />,
                        },
                    ].map((feature, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 2,
                                            bgcolor: 'primary.light',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'primary.main',
                                            mb: 2,
                                        }}
                                    >
                                        {feature.icon}
                                    </Box>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                        {feature.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {feature.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Container>
    );
};

export default JsonFormatter;
