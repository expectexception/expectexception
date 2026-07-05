import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, TextField, Button, Divider, Alert,
    ToggleButtonGroup, ToggleButton, Grid, useTheme, alpha,
} from '@mui/material';
import { Cake, SwapHoriz, ContentCopy } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type Mode = 'age' | 'diff';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses a native <input type="date"> value ("YYYY-MM-DD") into a local
 * midnight Date. Deliberately avoids `new Date(str)`, which parses the bare
 * ISO form as UTC midnight and can shift a day in negative-UTC-offset
 * timezones once local getters (getDate, getMonth) are read. */
const parseDateInput = (s: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
};

const todayInput = (): string => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Calendar-aware years/months/days breakdown between two dates where
 * `from` is chronologically on or before `to`. */
const dateBreakdown = (from: Date, to: Date) => {
    let years = to.getFullYear() - from.getFullYear();
    let months = to.getMonth() - from.getMonth();
    let days = to.getDate() - from.getDate();

    if (days < 0) {
        months -= 1;
        const daysInPrevMonth = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
        days += daysInPrevMonth;
    }
    if (months < 0) {
        months += 12;
        years -= 1;
    }
    return { years, months, days };
};

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

const AgeDateCalculator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [mode, setMode] = useState<Mode>('age');
    const [birth, setBirth] = useState('2000-01-15');
    const [start, setStart] = useState('2015-06-01');
    const [end, setEnd] = useState(todayInput());

    const copy = (text: string) => navigator.clipboard.writeText(text);

    const ageResult = useMemo(() => {
        const birthDate = parseDateInput(birth);
        if (!birthDate) return { error: 'Enter a valid birth date.' };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (birthDate.getTime() > today.getTime()) return { error: 'Birth date is in the future.' };

        const { years, months, days } = dateBreakdown(birthDate, today);
        const totalDays = Math.round((today.getTime() - birthDate.getTime()) / MS_PER_DAY);

        let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (nextBirthday.getTime() < today.getTime()) {
            nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
        }
        const daysUntilBirthday = Math.round((nextBirthday.getTime() - today.getTime()) / MS_PER_DAY);

        return { years, months, days, totalDays, daysUntilBirthday, nextBirthday };
    }, [birth]);

    const diffResult = useMemo(() => {
        const startDate = parseDateInput(start);
        const endDate = parseDateInput(end);
        if (!startDate || !endDate) return { error: 'Enter two valid dates.' };

        const reversed = startDate.getTime() > endDate.getTime();
        const from = reversed ? endDate : startDate;
        const to = reversed ? startDate : endDate;

        const { years, months, days } = dateBreakdown(from, to);
        const totalDays = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
        const totalWeeks = Math.floor(totalDays / 7);
        const remainderDays = totalDays % 7;

        return { years, months, days, totalDays, totalWeeks, remainderDays, reversed };
    }, [start, end]);

    const swapDates = () => {
        setStart(end);
        setEnd(start);
    };

    return (
        <ServicePageShell
            toolId={60}
            icon={Cake}
            title="Age & Date Difference Calculator"
            subtitle="Work out an exact age from a birth date, or the difference between any two dates - computed locally in your browser."
            maxWidth="md"
            seoTitle="Age Calculator & Date Difference Calculator - Free Online Tool"
            keywords={['age calculator', 'date difference calculator', 'how many days between two dates', 'days until birthday', 'calculate age from birthdate', 'date calculator']}
            about="Two related date calculations in one tool. Age mode takes a birth date and today's date and works out your exact age broken into years, months, and days - the calendar-correct way, not just a straight day count divided by 365 - plus how many days remain until your next birthday. Date Difference mode instead takes any two arbitrary dates and reports the gap between them the same way (years/months/days) as well as the total number of whole days and weeks. Both modes use the browser's native Date object and run entirely client-side; no date library and no server round-trip are involved."
            howToSteps={[
                { name: 'Choose a mode', text: 'Use the toggle to switch between Age Calculator (one date, vs. today) and Date Difference (any two dates).' },
                { name: 'Enter your date(s)', text: 'In Age mode, pick a birth date. In Date Difference mode, pick a start and end date.' },
                { name: 'Read the breakdown', text: 'The result shows the gap as years/months/days, plus total days (and, in Date Difference mode, total weeks).' },
                { name: 'Check the extras', text: 'Age mode also shows the exact date of, and days remaining until, your next birthday. Copy the summary line with the Copy button.' },
            ]}
            faq={[
                { question: 'How is "years, months, and days" calculated - is it just totalDays / 365?', answer: 'No - it walks the calendar the way a person would count it: comparing year, month, and day components directly (borrowing a month\'s worth of days when the day-of-month goes negative, and a year\'s worth of months when the month goes negative), which correctly accounts for varying month lengths and leap years instead of using a fixed 365-day average.' },
                { question: 'What happens if I enter a future birth date, or leave a field blank?', answer: 'The tool shows a clear message ("Birth date is in the future" or "Enter a valid date") instead of showing a nonsensical or negative age.' },
                { question: 'What if my end date is before my start date in Date Difference mode?', answer: "It still computes the difference - the two dates are compared chronologically regardless of which box they're in - and shows a note that the end date was earlier than the start date, along with a Swap button to reorder the fields." },
                { question: 'Does this account for leap years and Feb 29 birthdays?', answer: "Yes for leap-year day counting in the year/month/day breakdown. For a Feb 29 birthday specifically, the browser's Date object resolves the \"next birthday\" in a non-leap year to March 1st, since Feb 29th doesn't exist that year." },
            ]}
        >
            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
            }}>
                <CardContent sx={{ p: 1 }}>
                    <ToggleButtonGroup
                        exclusive
                        value={mode}
                        onChange={(_e, v) => v && setMode(v)}
                        size="small"
                        sx={{ mb: 3 }}
                    >
                        <ToggleButton value="age">Age Calculator</ToggleButton>
                        <ToggleButton value="diff">Date Difference</ToggleButton>
                    </ToggleButtonGroup>

                    {mode === 'age' && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Birth Date</Typography>
                            <TextField
                                type="date"
                                value={birth}
                                onChange={e => setBirth(e.target.value)}
                                sx={{ mb: 3, maxWidth: 260 }}
                            />

                            {'error' in ageResult ? (
                                <Alert severity="error">{ageResult.error}</Alert>
                            ) : (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha(primary, 0.06), border: `1px solid ${alpha(primary, 0.2)}` }}>
                                            <Typography variant="caption" fontWeight="700" color={primary} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                                Exact Age
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800}>
                                                {plural(ageResult.years!, 'year')}, {plural(ageResult.months!, 'month')}, {plural(ageResult.days!, 'day')}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {ageResult.totalDays!.toLocaleString()} days lived in total
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Typography variant="caption" fontWeight="700" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                                Next Birthday
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800}>
                                                {ageResult.daysUntilBirthday === 0 ? 'Today!' : plural(ageResult.daysUntilBirthday!, 'day')}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {ageResult.nextBirthday!.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Button
                                            size="small"
                                            startIcon={<ContentCopy />}
                                            onClick={() => copy(`Age: ${plural(ageResult.years!, 'year')}, ${plural(ageResult.months!, 'month')}, ${plural(ageResult.days!, 'day')} (${ageResult.totalDays} days total). Next birthday in ${plural(ageResult.daysUntilBirthday!, 'day')}.`)}
                                        >
                                            Copy Summary
                                        </Button>
                                    </Grid>
                                </Grid>
                            )}
                        </Box>
                    )}

                    {mode === 'diff' && (
                        <Box>
                            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={5}>
                                    <Typography variant="subtitle2" gutterBottom>Start Date</Typography>
                                    <TextField type="date" fullWidth value={start} onChange={e => setStart(e.target.value)} />
                                </Grid>
                                <Grid item xs={12} sm={2} sx={{ textAlign: 'center' }}>
                                    <Button onClick={swapDates} sx={{ minWidth: 0 }}><SwapHoriz /></Button>
                                </Grid>
                                <Grid item xs={12} sm={5}>
                                    <Typography variant="subtitle2" gutterBottom>End Date</Typography>
                                    <TextField type="date" fullWidth value={end} onChange={e => setEnd(e.target.value)} />
                                </Grid>
                            </Grid>

                            {'error' in diffResult ? (
                                <Alert severity="error">{diffResult.error}</Alert>
                            ) : (
                                <>
                                    {diffResult.reversed && (
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                            End date is earlier than start date - showing the absolute difference between the two.
                                        </Alert>
                                    )}
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha(primary, 0.06), border: `1px solid ${alpha(primary, 0.2)}` }}>
                                                <Typography variant="caption" fontWeight="700" color={primary} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                                    Difference
                                                </Typography>
                                                <Typography variant="h6" fontWeight={800}>
                                                    {plural(diffResult.years!, 'year')}, {plural(diffResult.months!, 'month')}, {plural(diffResult.days!, 'day')}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <Typography variant="caption" fontWeight="700" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                                    Total
                                                </Typography>
                                                <Typography variant="h6" fontWeight={800}>
                                                    {diffResult.totalDays!.toLocaleString()} days
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {diffResult.totalWeeks!.toLocaleString()} weeks, {diffResult.remainderDays} day{diffResult.remainderDays === 1 ? '' : 's'}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button
                                                size="small"
                                                startIcon={<ContentCopy />}
                                                onClick={() => copy(`${plural(diffResult.years!, 'year')}, ${plural(diffResult.months!, 'month')}, ${plural(diffResult.days!, 'day')} - ${diffResult.totalDays} total days (${diffResult.totalWeeks} weeks, ${diffResult.remainderDays} days)`)}
                                            >
                                                Copy Summary
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </>
                            )}
                        </Box>
                    )}

                    <Divider sx={{ my: 3 }} />
                    <Typography variant="caption" color="text.secondary">
                        All calculations use your device's local date - nothing is sent to a server.
                    </Typography>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default AgeDateCalculator;
