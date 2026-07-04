import React, { useState, useMemo } from 'react';
import { Box, Card, CardContent, TextField, Typography, Chip, Alert, Stack, Paper, Grid, Button, useTheme, alpha } from '@mui/material';
import { Schedule } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const PRESETS = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day midnight', value: '0 0 * * *' },
    { label: 'Every Monday', value: '0 9 * * 1' },
    { label: 'Every month 1st', value: '0 0 1 * *' },
    { label: 'Weekdays 9am', value: '0 9 * * 1-5' },
    { label: 'Every 15 mins', value: '*/15 * * * *' },
    { label: 'Twice daily', value: '0 8,20 * * *' },
];

const FIELDS = [
    { name: 'Minute', range: '0-59', examples: ['*', '0', '30', '*/15', '0,30'] },
    { name: 'Hour', range: '0-23', examples: ['*', '0', '12', '*/6', '9,17'] },
    { name: 'Day of Month', range: '1-31', examples: ['*', '1', '15', 'L', '1,15'] },
    { name: 'Month', range: '1-12', examples: ['*', '1', '6', '*/3', '1,7'] },
    { name: 'Day of Week', range: '0-6 (Sun=0)', examples: ['*', '0', '1-5', '1', '6,0'] },
];

const explainField = (val: string, field: string): string => {
    if (val === '*') return `every ${field.toLowerCase()}`;
    if (val.startsWith('*/')) return `every ${val.slice(2)} ${field.toLowerCase()}s`;
    if (val.includes('-')) {
        const [a, b] = val.split('-');
        return `from ${a} to ${b}`;
    }
    if (val.includes(',')) return `at ${val.replace(/,/g, ' and ')}`;
    const maps: Record<string, Record<string, string>> = {
        'Month': { '1': 'January', '2': 'February', '3': 'March', '4': 'April', '5': 'May', '6': 'June', '7': 'July', '8': 'August', '9': 'September', '10': 'October', '11': 'November', '12': 'December' },
        'Day of Week': { '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday' },
    };
    return maps[field]?.[val] ?? `at ${val}`;
};

const explainCron = (expr: string): string => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return 'Invalid: cron expression must have exactly 5 fields';
    const [min, hr, dom, mon, dow] = parts;
    const fieldNames = ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];
    const explained = parts.map((p, i) => explainField(p, fieldNames[i]));

    if (parts.every(p => p === '*')) return 'Runs every minute';
    if (min === '0' && hr === '*' && dom === '*' && mon === '*' && dow === '*') return 'Runs at the top of every hour (00 minutes)';
    if (min === '0' && hr === '0' && dom === '*' && mon === '*' && dow === '*') return 'Runs daily at midnight (00:00)';

    return `Runs ${explained[0] === 'every minute' ? '' : `at minute ${min}`} ${explained[1] === 'every hour' ? '' : `, hour ${hr}`} ${dom === '*' ? '' : `, day ${dom} of the month`} ${mon === '*' ? '' : `, in ${explainField(mon, 'Month')}`} ${dow === '*' ? '' : `, on ${explainField(dow, 'Day of Week')}`}`.replace(/\s+/g, ' ').trim();
};

const CronExplainer: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [expression, setExpression] = useState('0 9 * * 1-5');
    const parts = expression.trim().split(/\s+/);
    const isValid = parts.length === 5 && parts.every(p => /^[\d,*\/\-L#W]+$/.test(p));
    const explanation = useMemo(() => isValid ? explainCron(expression) : 'Enter a valid cron expression (5 fields)', [expression, isValid]);

    return (
        <ServicePageShell
            icon={Schedule}
            title="Cron Expression Explainer"
            subtitle="Understand what any cron expression does in plain English"
            maxWidth="lg"
            seoTitle="Cron Expression Explainer — Translate Cron to Plain English"
            toolId={41}
            keywords={['cron expression explainer', 'cron to english', 'crontab generator', 'cron schedule parser', 'cron syntax', 'what does this cron do', 'cron job examples', 'cron expression generator']}
            faq={[
                { question: 'What is a cron expression?', answer: 'A cron expression is five (or six) fields — minute, hour, day of month, month, day of week — that define a repeating schedule for jobs on Unix-like systems.' },
                { question: 'Does this support ranges and steps?', answer: 'Yes. It explains lists (1,15), ranges (1-5), steps (*/10) and wildcards (*) in plain English so you can verify a schedule before deploying it.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <TextField
                        fullWidth
                        label="Cron Expression"
                        value={expression}
                        onChange={e => setExpression(e.target.value)}
                        placeholder="* * * * *"
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '0.1em' } }}
                        sx={{ mb: 3 }}
                    />

                    {/* Field labels */}
                    {expression.trim() && (
                        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                            {parts.slice(0, 5).map((p, i) => (
                                <Paper key={i} sx={{ px: 2, py: 1.5, textAlign: 'center', bgcolor: alpha(primary, 0.06), border: `1px solid ${alpha(primary, 0.15)}`, borderRadius: 2, minWidth: 80 }}>
                                    <Typography variant="h6" fontFamily="monospace" fontWeight="900" color={primary}>{p}</Typography>
                                    <Typography variant="caption" color="text.disabled" display="block">{FIELDS[i]?.name}</Typography>
                                </Paper>
                            ))}
                        </Box>
                    )}

                    {/* Explanation */}
                    <Paper sx={{ p: 2.5, mb: 3, bgcolor: alpha(primary, 0.06), border: `1px solid ${alpha(primary, 0.2)}`, borderRadius: 2 }}>
                        <Typography variant="caption" fontWeight="700" color={primary} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                            Plain English
                        </Typography>
                        <Typography variant="body1" fontWeight="600" color={isValid ? 'text.primary' : 'text.disabled'}>
                            {explanation}
                        </Typography>
                    </Paper>

                    {/* Presets */}
                    <Box>
                        <Typography variant="caption" fontWeight="700" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                            Common Presets
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                            {PRESETS.map(preset => (
                                <Chip
                                    key={preset.value}
                                    label={preset.label}
                                    onClick={() => setExpression(preset.value)}
                                    variant={expression === preset.value ? 'filled' : 'outlined'}
                                    size="small"
                                    sx={{
                                        cursor: 'pointer',
                                        ...(expression === preset.value ? { bgcolor: alpha(primary, 0.15), color: primary, border: `1px solid ${alpha(primary, 0.35)}` } : {}),
                                    }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    {/* Field reference */}
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="caption" fontWeight="700" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1.5 }}>
                            Field Reference
                        </Typography>
                        <Grid container spacing={1.5}>
                            {FIELDS.map(f => (
                                <Grid item xs={12} sm={6} md={4} key={f.name}>
                                    <Paper sx={{ p: 1.5, bgcolor: alpha('#fff', 0.02), border: '1px solid rgba(255,255,255,0.05)', borderRadius: 1.5 }}>
                                        <Typography variant="caption" fontWeight="700" color="text.secondary" display="block">{f.name}</Typography>
                                        <Typography variant="caption" color="text.disabled">Range: {f.range}</Typography>
                                        <Box sx={{ mt: 0.5, display: 'flex', gap: 0.3, flexWrap: 'wrap' }}>
                                            {f.examples.map(e => <Chip key={e} label={e} size="small" sx={{ height: 18, fontSize: '0.65rem', fontFamily: 'monospace' }} />)}
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default CronExplainer;
