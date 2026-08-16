import React, { useState, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Grid, Paper, Slider, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, Divider, InputAdornment,
    ToggleButton, ToggleButtonGroup, useTheme, alpha,
} from '@mui/material';
import { Calculate } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Amortising loan maths.
 *
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1), where r is the periodic rate
 * and n the number of payments. r = 0 has to be special-cased, since
 * that formula divides by zero for an interest-free loan.
 * ------------------------------------------------------------------ */

interface YearRow {
    year: number;
    principalPaid: number;
    interestPaid: number;
    balance: number;
}

interface Schedule {
    payment: number;
    totalPaid: number;
    totalInterest: number;
    rows: YearRow[];
}

function buildSchedule(principal: number, annualRate: number, years: number): Schedule | null {
    if (!(principal > 0) || !(years > 0) || annualRate < 0) return null;

    const n = Math.round(years * 12);
    const r = annualRate / 100 / 12;

    const payment = r === 0
        ? principal / n
        : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    if (!isFinite(payment)) return null;

    const rows: YearRow[] = [];
    let balance = principal;
    let totalInterest = 0;
    let yearPrincipal = 0;
    let yearInterest = 0;

    for (let month = 1; month <= n; month++) {
        const interest = balance * r;
        // Final instalment absorbs any rounding drift so the balance lands
        // exactly on zero rather than a few cents either side.
        const principalPart = month === n ? balance : payment - interest;
        balance = Math.max(0, balance - principalPart);
        totalInterest += interest;
        yearPrincipal += principalPart;
        yearInterest += interest;

        if (month % 12 === 0 || month === n) {
            rows.push({
                year: Math.ceil(month / 12),
                principalPaid: yearPrincipal,
                interestPaid: yearInterest,
                balance,
            });
            yearPrincipal = 0;
            yearInterest = 0;
        }
    }

    return { payment, totalPaid: principal + totalInterest, totalInterest, rows };
}

const CURRENCIES = [
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'INR', symbol: '₹' },
];

const LoanCalculator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [principal, setPrincipal] = useState(250000);
    const [rate, setRate] = useState(7.5);
    const [years, setYears] = useState(20);
    const [currency, setCurrency] = useState(CURRENCIES[0]);

    const schedule = useMemo(() => buildSchedule(principal, rate, years), [principal, rate, years]);

    const money = (n: number) =>
        `${currency.symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    const interestShare = schedule && schedule.totalPaid > 0
        ? (schedule.totalInterest / schedule.totalPaid) * 100
        : 0;

    return (
        <ServicePageShell
            icon={Calculate}
            title="Loan & EMI Calculator"
            subtitle="Monthly payment, total interest, and a year-by-year payoff schedule"
            maxWidth="lg"
            seoTitle="Loan & EMI Calculator | Monthly Payment and Amortisation Schedule"
            seoDescription="Work out the monthly payment on a loan or mortgage, see how much of it is interest, and read the full year-by-year amortisation schedule. Runs entirely in your browser."
            toolId={66}
            keywords={['emi calculator', 'loan calculator', 'mortgage payment calculator', 'amortisation schedule', 'monthly payment calculator', 'total interest calculator', 'home loan emi', 'car loan calculator']}
            about="An amortising loan is repaid in equal instalments, but the split inside each instalment shifts over time: early payments are mostly interest, and only later does the balance start falling quickly. That is why the total interest on a long loan can rival the amount borrowed, and why the year-by-year schedule below is often more revealing than the monthly figure. Enter the amount, rate and term to see the instalment, the total repaid, the share of it that is interest, and how the balance falls each year. The calculation runs in your browser, so nothing about your finances is transmitted or stored."
            howToSteps={[
                { name: 'Enter the loan amount', text: 'Set the principal — the amount actually borrowed, after any deposit.' },
                { name: 'Set the rate and term', text: 'Enter the annual interest rate and the number of years to repay. Both can be adjusted with the sliders.' },
                { name: 'Read the schedule', text: 'Check the monthly instalment, then look at the yearly table to see how slowly the balance falls in the early years.' },
            ]}
            faq={[
                { question: 'What is EMI?', answer: 'Equated Monthly Instalment — the fixed amount paid each month on an amortising loan. It stays constant while its internal split changes: the interest portion shrinks as the balance falls, so more of each payment goes to principal over time.' },
                { question: 'Why is so much of my early payment interest?', answer: 'Interest is charged on the outstanding balance, which is at its largest at the start. On a 20- or 30-year loan the first few years can be well over half interest — which is also why overpaying early saves disproportionately more than overpaying late.' },
                { question: 'Does this include fees, taxes or insurance?', answer: 'No. It calculates principal and interest only. Arrangement fees, property tax, insurance and any mandatory escrow will add to what you actually pay each month.' },
                { question: 'Is my data sent anywhere?', answer: 'No. The whole calculation is JavaScript running in your browser, so the figures you enter never leave your machine.' },
            ]}
        >
            <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={800}>Loan details</Typography>
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={currency.code}
                                    onChange={(_, v) => { const c = CURRENCIES.find(x => x.code === v); if (c) setCurrency(c); }}
                                >
                                    {CURRENCIES.map(c => (
                                        <ToggleButton key={c.code} value={c.code} sx={{ px: 1.2, fontSize: '0.7rem' }}>
                                            {c.symbol}
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            </Stack>

                            <TextField
                                fullWidth
                                label="Loan amount"
                                type="number"
                                value={principal}
                                onChange={e => setPrincipal(Math.max(0, Number(e.target.value)))}
                                InputProps={{ startAdornment: <InputAdornment position="start">{currency.symbol}</InputAdornment> }}
                                sx={{ mb: 1 }}
                            />
                            <Slider
                                value={Math.min(principal, 1000000)}
                                min={1000}
                                max={1000000}
                                step={1000}
                                onChange={(_, v) => setPrincipal(v as number)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                label="Annual interest rate"
                                type="number"
                                value={rate}
                                onChange={e => setRate(Math.max(0, Number(e.target.value)))}
                                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                sx={{ mb: 1 }}
                            />
                            <Slider
                                value={Math.min(rate, 25)}
                                min={0}
                                max={25}
                                step={0.1}
                                onChange={(_, v) => setRate(v as number)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                label="Term"
                                type="number"
                                value={years}
                                onChange={e => setYears(Math.max(1, Number(e.target.value)))}
                                InputProps={{ endAdornment: <InputAdornment position="end">years</InputAdornment> }}
                                sx={{ mb: 1 }}
                            />
                            <Slider
                                value={Math.min(years, 40)}
                                min={1}
                                max={40}
                                step={1}
                                onChange={(_, v) => setYears(v as number)}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            {!schedule ? (
                                <Typography variant="body2" color="text.disabled">
                                    Enter a loan amount and term to see the schedule.
                                </Typography>
                            ) : (
                                <>
                                    <Paper sx={{ p: 2.5, mb: 2, borderRadius: 2, bgcolor: alpha(primary, 0.07), border: `1px solid ${alpha(primary, 0.2)}` }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                            MONTHLY PAYMENT
                                        </Typography>
                                        <Typography variant="h3" fontWeight={900} sx={{ color: primary }}>
                                            {currency.symbol}{schedule.payment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </Typography>
                                    </Paper>

                                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                                        <Grid item xs={4}>
                                            <Paper sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>PRINCIPAL</Typography>
                                                <Typography variant="h6" fontWeight={800}>{money(principal)}</Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Paper sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>INTEREST</Typography>
                                                <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.warning.main }}>
                                                    {money(schedule.totalInterest)}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Paper sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL</Typography>
                                                <Typography variant="h6" fontWeight={800}>{money(schedule.totalPaid)}</Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>

                                    <Typography variant="caption" color="text.secondary">
                                        Interest is <strong>{interestShare.toFixed(1)}%</strong> of everything you repay.
                                    </Typography>
                                    <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', mt: 0.75, mb: 2 }}>
                                        <Box sx={{ width: `${100 - interestShare}%`, bgcolor: primary }} />
                                        <Box sx={{ width: `${interestShare}%`, bgcolor: theme.palette.warning.main }} />
                                    </Box>

                                    <Divider sx={{ mb: 1.5 }} />
                                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                                        Year-by-year breakdown
                                    </Typography>
                                    <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>Year</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Principal</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Interest</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {schedule.rows.map(row => (
                                                    <TableRow key={row.year}>
                                                        <TableCell>{row.year}</TableCell>
                                                        <TableCell align="right">{money(row.principalPaid)}</TableCell>
                                                        <TableCell align="right" sx={{ color: theme.palette.warning.main }}>
                                                            {money(row.interestPaid)}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600 }}>{money(row.balance)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default LoanCalculator;
