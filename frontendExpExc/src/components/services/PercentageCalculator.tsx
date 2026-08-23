import React, { useState, useMemo } from 'react';
import {
    Card, CardContent, Typography, TextField, Paper, Stack,
    ToggleButton, ToggleButtonGroup, useTheme, alpha,
} from '@mui/material';
import { Percent, TrendingUp, TrendingDown } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Four independent percentage calculations. Each mode keeps its own pair
 * of raw text inputs (so a field can sit blank or mid-edit without being
 * coerced to 0 on every keystroke) and derives its result with useMemo,
 * the same live-recalculation pattern LoanCalculator uses for its
 * schedule. Division-by-zero and blank inputs are handled explicitly so
 * the UI can never show NaN or Infinity — only a "—" placeholder.
 * ------------------------------------------------------------------ */

type Mode = 'of' | 'isWhatPercent' | 'change' | 'adjust';

const MODES: { value: Mode; label: string }[] = [
    { value: 'of', label: 'X% of Y' },
    { value: 'isWhatPercent', label: 'X is what % of Y' },
    { value: 'change', label: '% change' },
    { value: 'adjust', label: 'Increase/decrease by %' },
];

/** Parses a text field to a finite number, or null if it's blank/invalid —
 * used everywhere instead of a bare Number() so an empty field reads as
 * "no input yet" rather than silently becoming 0. */
function parseInput(raw: string): number | null {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

const fmtNumber = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });

const ResultPlaceholder: React.FC<{ text?: string }> = ({ text = 'Enter both values above' }) => (
    <Typography variant="body2" color="text.disabled">{text}</Typography>
);

const PercentageCalculator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [mode, setMode] = useState<Mode>('of');

    // Mode 1: X% of Y
    const [ofPercent, setOfPercent] = useState('20');
    const [ofBase, setOfBase] = useState('150');

    // Mode 2: X is what % of Y
    const [partValue, setPartValue] = useState('30');
    const [wholeValue, setWholeValue] = useState('120');

    // Mode 3: change from X to Y
    const [changeFrom, setChangeFrom] = useState('80');
    const [changeTo, setChangeTo] = useState('100');

    // Mode 4: X adjusted by P%
    const [adjustBase, setAdjustBase] = useState('200');
    const [adjustPercent, setAdjustPercent] = useState('15');

    const ofResult = useMemo(() => {
        const x = parseInput(ofPercent), y = parseInput(ofBase);
        if (x === null || y === null) return null;
        return (x / 100) * y;
    }, [ofPercent, ofBase]);

    const isWhatPercentResult = useMemo(() => {
        const x = parseInput(partValue), y = parseInput(wholeValue);
        if (x === null || y === null || y === 0) return null;
        return (x / y) * 100;
    }, [partValue, wholeValue]);

    const changeResult = useMemo(() => {
        const x = parseInput(changeFrom), y = parseInput(changeTo);
        if (x === null || y === null || x === 0) return null;
        return ((y - x) / x) * 100;
    }, [changeFrom, changeTo]);

    const adjustResult = useMemo(() => {
        const x = parseInput(adjustBase), p = parseInput(adjustPercent);
        if (x === null || p === null) return null;
        const delta = (x * p) / 100;
        return { result: x + delta, delta };
    }, [adjustBase, adjustPercent]);

    return (
        <ServicePageShell
            icon={Percent}
            title="Percentage Calculator"
            subtitle="Four everyday percentage calculations, updating as you type"
            maxWidth="sm"
            toolId={69}
            seoTitle="Percentage Calculator | Percent Of, Percent Change & Increase/Decrease"
            seoDescription="Work out X% of Y, what percentage one number is of another, percentage change between two values, or a value after a percentage increase or decrease. Updates live, entirely in your browser."
            keywords={['percentage calculator', 'percent of calculator', 'percentage change calculator', 'percentage increase calculator', 'percentage decrease calculator', 'what percent calculator', 'percent difference calculator']}
            about="Four percentage problems come up constantly and each needs slightly different arithmetic, which is why they're kept as separate modes here rather than one formula. 'X% of Y' answers questions like a tip or a tax amount. 'X is what % of Y' answers questions like a test score or a completion rate. 'Percentage change' compares two values over time — a bill, a metric, a price — and signs the result so an increase and a decrease are never ambiguous. 'Increase/decrease by %' goes the other way: given a starting value and a percentage, it finds the resulting value, which is what a discount or a markup needs. Every result recalculates as you type, and the arithmetic runs entirely in your browser."
            howToSteps={[
                { name: 'Pick a mode', text: 'Choose the calculation that matches your question: a percentage of a number, one number as a percentage of another, the percentage change between two values, or a value after applying a percentage change.' },
                { name: 'Enter the two numbers', text: 'Type into both fields for that mode. The result updates immediately — there is no submit button.' },
                { name: 'Read the result', text: 'Percentage change and the increase/decrease mode both show whether the movement is up or down, colour-coded so it is unambiguous at a glance.' },
            ]}
            faq={[
                { question: 'When would I use "percentage change" instead of "X is what % of Y"?', answer: 'Use percentage change when comparing two values of the same kind over time or between conditions — e.g. "my rent went from $1,200 to $1,350, what\'s the increase?". Use "X is what % of Y" when one number is a portion of another at a single point in time — e.g. "38 correct answers out of 50, what percentage is that?".' },
                { question: 'How do I calculate a price after a discount?', answer: 'Use "Increase/decrease by %": set the base value to the original price and the percentage to the negative of the discount (e.g. -20 for 20% off). The result is the final price, and the tool also shows the raw amount taken off.' },
                { question: 'Why does the tool show "—" instead of a number sometimes?', answer: 'That means the calculation is undefined for the current inputs — most commonly dividing by zero, such as asking what percentage a number is "of" zero, or the percentage change from a starting value of zero. Rather than show NaN or Infinity, the tool shows a dash until the inputs make sense.' },
                { question: 'Is this connected to any server?', answer: 'No — it\'s arithmetic in JavaScript running in your browser. Nothing you type is sent anywhere, though for a calculator that barely needs saying.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <ToggleButtonGroup
                        exclusive
                        value={mode}
                        onChange={(_, v) => { if (v !== null) setMode(v); }}
                        sx={{ mb: 3, flexWrap: 'wrap', gap: 0.75, '& .MuiToggleButtonGroup-grouped': { border: '1px solid', borderColor: alpha(primary, 0.3), borderRadius: '8px !important' } }}
                    >
                        {MODES.map(m => (
                            <ToggleButton key={m.value} value={m.value} sx={{ px: 1.5, py: 0.75, fontSize: '0.78rem', textTransform: 'none' }}>
                                {m.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>

                    {mode === 'of' && (
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    fullWidth label="Percentage (X)" type="number"
                                    value={ofPercent} onChange={e => setOfPercent(e.target.value)}
                                    InputProps={{ endAdornment: '%' }}
                                />
                                <TextField
                                    fullWidth label="Of value (Y)" type="number"
                                    value={ofBase} onChange={e => setOfBase(e.target.value)}
                                />
                            </Stack>
                            <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha(primary, 0.07), border: `1px solid ${alpha(primary, 0.2)}`, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    {ofPercent || '?'}% OF {ofBase || '?'}
                                </Typography>
                                {ofResult === null ? <ResultPlaceholder /> : (
                                    <Typography variant="h3" fontWeight={900} sx={{ color: primary }}>
                                        {fmtNumber(ofResult)}
                                    </Typography>
                                )}
                            </Paper>
                        </Stack>
                    )}

                    {mode === 'isWhatPercent' && (
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    fullWidth label="Part (X)" type="number"
                                    value={partValue} onChange={e => setPartValue(e.target.value)}
                                />
                                <TextField
                                    fullWidth label="Whole (Y)" type="number"
                                    value={wholeValue} onChange={e => setWholeValue(e.target.value)}
                                />
                            </Stack>
                            <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha(primary, 0.07), border: `1px solid ${alpha(primary, 0.2)}`, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    {partValue || '?'} IS WHAT % OF {wholeValue || '?'}
                                </Typography>
                                {isWhatPercentResult === null ? (
                                    <ResultPlaceholder text={wholeValue.trim() !== '' && Number(wholeValue) === 0 ? 'Cannot divide by a whole of zero' : undefined} />
                                ) : (
                                    <Typography variant="h3" fontWeight={900} sx={{ color: primary }}>
                                        {fmtNumber(isWhatPercentResult)}%
                                    </Typography>
                                )}
                            </Paper>
                        </Stack>
                    )}

                    {mode === 'change' && (
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    fullWidth label="Original value (X)" type="number"
                                    value={changeFrom} onChange={e => setChangeFrom(e.target.value)}
                                />
                                <TextField
                                    fullWidth label="New value (Y)" type="number"
                                    value={changeTo} onChange={e => setChangeTo(e.target.value)}
                                />
                            </Stack>
                            <Paper sx={{
                                p: 2.5, borderRadius: 2, textAlign: 'center',
                                bgcolor: changeResult !== null && changeResult < 0 ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.success.main, 0.08),
                                border: `1px solid ${alpha(changeResult !== null && changeResult < 0 ? theme.palette.error.main : theme.palette.success.main, 0.25)}`,
                            }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    CHANGE FROM {changeFrom || '?'} TO {changeTo || '?'}
                                </Typography>
                                {changeResult === null ? (
                                    <ResultPlaceholder text={changeFrom.trim() !== '' && Number(changeFrom) === 0 ? 'Cannot measure change from zero' : undefined} />
                                ) : (
                                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                                        {changeResult < 0 ? <TrendingDown sx={{ color: theme.palette.error.main }} /> : <TrendingUp sx={{ color: theme.palette.success.main }} />}
                                        <Typography variant="h3" fontWeight={900} sx={{ color: changeResult < 0 ? theme.palette.error.main : theme.palette.success.main }}>
                                            {changeResult > 0 ? '+' : ''}{fmtNumber(changeResult)}%
                                        </Typography>
                                    </Stack>
                                )}
                                {changeResult !== null && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        {changeResult < 0 ? 'decrease' : 'increase'}
                                    </Typography>
                                )}
                            </Paper>
                        </Stack>
                    )}

                    {mode === 'adjust' && (
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    fullWidth label="Base value (X)" type="number"
                                    value={adjustBase} onChange={e => setAdjustBase(e.target.value)}
                                />
                                <TextField
                                    fullWidth label="Percentage (P)" type="number"
                                    value={adjustPercent} onChange={e => setAdjustPercent(e.target.value)}
                                    helperText="Negative for a decrease, e.g. -20"
                                    InputProps={{ endAdornment: '%' }}
                                />
                            </Stack>
                            <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha(primary, 0.07), border: `1px solid ${alpha(primary, 0.2)}`, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    {adjustBase || '?'} {Number(adjustPercent || 0) < 0 ? 'DECREASED' : 'INCREASED'} BY {adjustPercent ? Math.abs(Number(adjustPercent)) : '?'}%
                                </Typography>
                                {adjustResult === null ? <ResultPlaceholder /> : (
                                    <>
                                        <Typography variant="h3" fontWeight={900} sx={{ color: primary }}>
                                            {fmtNumber(adjustResult.result)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            change: {adjustResult.delta >= 0 ? '+' : ''}{fmtNumber(adjustResult.delta)}
                                        </Typography>
                                    </>
                                )}
                            </Paper>
                        </Stack>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default PercentageCalculator;
