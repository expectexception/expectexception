import React, { useState, useCallback } from 'react';
import { Box, Card, CardContent, Typography, TextField, Grid, Chip, Alert, useTheme, alpha, Paper } from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const BASES = [
    { label: 'Binary', base: 2, prefix: '0b' },
    { label: 'Octal', base: 8, prefix: '0o' },
    { label: 'Decimal', base: 10, prefix: '' },
    { label: 'Hexadecimal', base: 16, prefix: '0x' },
];

const NumberBaseConverter: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [values, setValues] = useState<Record<number, string>>({ 2: '', 8: '', 10: '', 16: '' });
    const [error, setError] = useState<string | null>(null);

    const handleChange = useCallback((base: number, raw: string) => {
        setError(null);
        const input = raw.replace(/\s/g, '');
        if (!input) {
            setValues({ 2: '', 8: '', 10: '', 16: '' });
            return;
        }
        const decimal = parseInt(input, base);
        if (isNaN(decimal) || decimal < 0) {
            setError(`"${input}" is not a valid ${BASES.find(b => b.base === base)?.label} number.`);
            setValues(prev => ({ ...prev, [base]: raw }));
            return;
        }
        setValues({
            2: decimal.toString(2),
            8: decimal.toString(8),
            10: decimal.toString(10),
            16: decimal.toString(16).toUpperCase(),
        });
    }, []);

    return (
        <ServicePageShell icon={SwapHoriz} title="Number Base Converter" subtitle="Convert between binary, octal, decimal, and hexadecimal" maxWidth="md">
            <Card>
                <CardContent sx={{ p: 3 }}>
                    {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
                    <Grid container spacing={2.5}>
                        {BASES.map(({ label, base, prefix }) => (
                            <Grid item xs={12} sm={6} key={base}>
                                <Paper sx={{ p: 2.5, bgcolor: alpha(primary, 0.03), border: `1px solid ${alpha(primary, 0.1)}`, borderRadius: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                        <Chip label={`Base ${base}`} size="small" sx={{ bgcolor: alpha(primary, 0.12), color: primary, fontWeight: 700, fontSize: '0.7rem' }} />
                                        <Typography variant="subtitle2" fontWeight="700">{label}</Typography>
                                    </Box>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={values[base]}
                                        onChange={e => handleChange(base, e.target.value)}
                                        placeholder={`Enter ${label.toLowerCase()}...`}
                                        inputProps={{
                                            style: { fontFamily: 'monospace', fontSize: '1rem' },
                                            ...(base === 16 ? { pattern: '[0-9A-Fa-f]*' } : {}),
                                        }}
                                        InputProps={prefix ? {
                                            startAdornment: <Typography color="text.disabled" sx={{ mr: 0.5, fontFamily: 'monospace' }}>{prefix}</Typography>
                                        } : undefined}
                                    />
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {values[10] && (
                        <Box sx={{ mt: 3, p: 2, bgcolor: alpha(primary, 0.06), borderRadius: 2, border: `1px solid ${alpha(primary, 0.15)}` }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>DECIMAL VALUE</Typography>
                            <Typography variant="h4" fontWeight="900" color={primary} sx={{ fontFamily: 'monospace' }}>
                                {parseInt(values[10], 10).toLocaleString()}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default NumberBaseConverter;
