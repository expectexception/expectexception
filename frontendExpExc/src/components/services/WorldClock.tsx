import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, Paper, Stack, IconButton,
    Autocomplete, TextField, Slider, Button, useTheme, alpha,
} from '@mui/material';
import {
    Public, Close, WbSunny, NightsStay, AccessTime, RestartAlt,
} from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * Every displayed time comes from Intl.DateTimeFormat with an explicit
 * `timeZone`, formatting either "now" (a live Date ticking every second)
 * or a chosen reference instant. There is deliberately no manual
 * UTC-offset arithmetic anywhere in this file — a fixed offset is wrong
 * for roughly half the world's timezones for roughly half the year, once
 * DST and each region's own historical rule changes are involved. Letting
 * the browser's own tz database (which Intl is backed by) do that work is
 * the only way to get it right for every zone, on every date, forever.
 * ------------------------------------------------------------------ */

const STORAGE_KEY = 'world_clock_zones';

/** TypeScript 4.9's lib defs predate Intl.supportedValuesOf (added to the
 * spec after this project's lib target), so it's not on the Intl type even
 * though every evergreen browser implements it — hence the cast. Falls
 * back to a curated list of major IANA zones for the rare runtime that
 * doesn't support the call (older Safari/WebKit builds). */
function getAvailableZones(): string[] {
    try {
        const supportedValuesOf = (Intl as any).supportedValuesOf;
        if (typeof supportedValuesOf === 'function') {
            const zones: string[] = supportedValuesOf('timeZone');
            if (Array.isArray(zones) && zones.length > 0) return zones;
        }
    } catch {
        // fall through to the static list below
    }
    return FALLBACK_ZONES;
}

const FALLBACK_ZONES = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Anchorage', 'America/Sao_Paulo', 'America/Mexico_City', 'America/Toronto',
    'America/Bogota', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
    'Europe/Rome', 'Europe/Moscow', 'Europe/Istanbul', 'Europe/Amsterdam', 'Africa/Cairo',
    'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi', 'Asia/Dubai', 'Asia/Karachi',
    'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Shanghai',
    'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Manila',
    'Australia/Perth', 'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
    'Pacific/Honolulu', 'Pacific/Fiji',
];

/** "America/New_York" -> "New York"; "Asia/Kolkata" -> "Kolkata";
 * "Etc/UTC" -> "UTC". A simple, honest derivation from the IANA string
 * rather than a maintained city-name lookup table. */
function zoneLabel(zone: string): string {
    const last = zone.split('/').pop() || zone;
    return last.replace(/_/g, ' ');
}

/** The region ("America", "Asia", ...) shown as secondary context next to
 * the derived city label, so e.g. two different "Columbia"s aren't
 * ambiguous in the picker. */
function zoneRegion(zone: string): string {
    const parts = zone.split('/');
    return parts.length > 1 ? parts[0].replace(/_/g, ' ') : '';
}

function formatOffset(zone: string, instant: Date): string {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            timeZoneName: 'shortOffset',
        }).formatToParts(instant);
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        if (!tzPart) return '';
        // Comes back as e.g. "GMT+5:30" / "GMT-4" / "GMT" — normalise the
        // "GMT" (no offset) case to the conventional "UTC+0".
        const raw = tzPart.value.replace('GMT', 'UTC');
        return raw === 'UTC' ? 'UTC+0' : raw;
    } catch {
        return '';
    }
}

function formatTime(zone: string, instant: Date): string {
    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        }).format(instant);
    } catch {
        return '--:--:--';
    }
}

function formatDate(zone: string, instant: Date): string {
    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        }).format(instant);
    } catch {
        return '';
    }
}

/** The 0-23 local hour in `zone` at `instant`, used only to decide between
 * the sun/moon glyph — not shown as a number anywhere. */
function localHour(zone: string, instant: Date): number {
    try {
        const hourStr = new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            hour: 'numeric',
            hour12: false,
        }).format(instant);
        return parseInt(hourStr, 10) % 24;
    } catch {
        return 12;
    }
}

function loadSavedZones(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((z): z is string => typeof z === 'string') : [];
    } catch {
        return [];
    }
}

const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const ZoneCard: React.FC<{ zone: string; instant: Date; onRemove: () => void }> = ({ zone, instant, onRemove }) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const hour = localHour(zone, instant);
    const isDaytime = hour >= 6 && hour < 18;

    return (
        <Paper sx={{ p: 2, borderRadius: 2, height: '100%', position: 'relative', border: `1px solid ${alpha(primary, 0.15)}` }}>
            <IconButton
                size="small"
                onClick={onRemove}
                aria-label={`Remove ${zoneLabel(zone)}`}
                sx={{ position: 'absolute', top: 6, right: 6, color: 'text.disabled' }}
            >
                <Close fontSize="small" />
            </IconButton>

            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5, pr: 3 }}>
                {isDaytime
                    ? <WbSunny sx={{ fontSize: 18, color: theme.palette.warning.main }} />
                    : <NightsStay sx={{ fontSize: 18, color: alpha(theme.palette.info.main, 0.9) }} />}
                <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                    {zoneLabel(zone)}
                </Typography>
            </Stack>
            {zoneRegion(zone) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {zoneRegion(zone)} · {zone === LOCAL_ZONE ? 'your timezone' : formatOffset(zone, instant)}
                </Typography>
            )}

            <Typography variant="h4" fontWeight={900} sx={{ color: primary, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                {formatTime(zone, instant)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {formatDate(zone, instant)}
            </Typography>
        </Paper>
    );
};

const WorldClock: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [zones, setZones] = useState<string[]>(loadSavedZones);
    const [now, setNow] = useState(() => new Date());
    const availableZones = useMemo(getAvailableZones, []);

    // Reference-time override: when set, every card shows this moment
    // instead of live "now". Represented as minutes-since-midnight in the
    // browser's own local timezone, applied to today's date.
    const [referenceMinutes, setReferenceMinutes] = useState<number | null>(null);

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
        } catch {
            // localStorage unavailable (private mode / quota) — the list
            // still works for this session, it just won't persist.
        }
    }, [zones]);

    const displayedInstant = useMemo(() => {
        if (referenceMinutes === null) return now;
        const d = new Date(now);
        d.setHours(0, referenceMinutes, 0, 0);
        return d;
    }, [now, referenceMinutes]);

    const addZone = (zone: string | null) => {
        if (!zone || zones.includes(zone)) return;
        setZones(prev => [...prev, zone]);
    };

    const removeZone = (zone: string) => {
        setZones(prev => prev.filter(z => z !== zone));
    };

    const referenceLabel = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const period = h < 12 ? 'AM' : 'PM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    };

    return (
        <ServicePageShell
            icon={Public}
            title="World Clock & Timezone Converter"
            subtitle="Live time across multiple cities, or convert a single moment between them"
            maxWidth="lg"
            toolId={75}
            seoTitle="World Clock & Timezone Converter | Compare Times Across Cities"
            seoDescription="Add multiple cities and see their current time side by side, updating live. Or pick a reference time to see what that same moment looks like in every zone at once — DST-aware, powered by your browser's own timezone database."
            keywords={['world clock', 'timezone converter', 'time zone calculator', 'what time is it in', 'compare time zones', 'meeting time converter', 'utc converter', 'dst calculator']}
            about="This tool adds each timezone you pick to a live-updating panel, so several cities' current times sit side by side rather than one at a time. Every time shown — including the UTC offset next to each city — is computed by asking the browser's own Intl.DateTimeFormat to format the current instant in that specific IANA timezone, never by adding or subtracting a fixed number of hours. That distinction matters because offsets are not constants: most timezones observe daylight saving on different dates from each other, some don't observe it at all, and a handful of regions have changed their rules within the last few years. Only the browser's timezone database — the same one your operating system uses — tracks all of that correctly. The reference-time mode flips the question around: instead of 'what time is it now everywhere', it answers 'what does 9:00 AM my time look like everywhere', by picking one instant and reformatting it per zone. Your saved list of cities is kept in this browser's local storage, so it's there next time you visit, and it never leaves your machine."
            howToSteps={[
                { name: 'Add a timezone', text: 'Use the search box to find a city or IANA zone (e.g. "Tokyo" or "Asia/Tokyo") and add it to your list. It\'s saved in this browser for next time.' },
                { name: 'Read the live times', text: 'Each card updates every second with that zone\'s current time, date and UTC offset, plus a sun/moon icon for roughly day or night.' },
                { name: 'Optionally set a reference time', text: 'Switch on the reference-time slider to pick a specific time in your own timezone and see what it is in every added zone at that same instant. Click "Back to now" to return to live time.' },
            ]}
            faq={[
                { question: 'Does this handle daylight saving time correctly?', answer: 'Yes, automatically. Every time on this page is produced by the browser\'s own Intl timezone database — the same system-level database your phone and computer use — rather than a fixed offset table this tool maintains. That database already knows each region\'s DST start/end dates (and lack of DST, where applicable), so times stay correct across a DST transition with no special handling needed here.' },
                { question: 'What does the "reference time" mode actually compare?', answer: 'A single moment across zones, not a recurring meeting slot. Setting it to 9:00 AM shows what your local 9:00 AM today looks like right now in every added city. It is not a scheduler and won\'t account for a meeting that recurs weekly across a DST boundary — for that, re-check the tool on the date that matters, since the equivalent time in another zone can shift by an hour around DST changes.' },
                { question: 'Where does the list of timezones come from?', answer: 'From the browser itself, via Intl.supportedValuesOf(\'timeZone\') where available — the full IANA time zone database your browser ships with. On the rare browser without that API, the search falls back to a curated list of roughly 40 major zones covering every populated region.' },
                { question: 'Is my saved city list sent anywhere?', answer: 'No. It\'s stored in this browser\'s local storage only, and every time calculation happens client-side in JavaScript. Nothing about which cities you track is transmitted or logged.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2.5 }}>
                        <Autocomplete
                            options={availableZones}
                            groupBy={zoneRegion}
                            getOptionLabel={(z) => `${zoneLabel(z)}${zoneRegion(z) ? ` (${z})` : ''}`}
                            filterOptions={(opts, state) => {
                                const q = state.inputValue.trim().toLowerCase();
                                if (!q) return opts.slice(0, 50);
                                return opts.filter(o => o.toLowerCase().replace(/_/g, ' ').includes(q)).slice(0, 50);
                            }}
                            value={null}
                            onChange={(_, v) => addZone(v)}
                            renderInput={(params) => (
                                <TextField {...params} label="Add a timezone" placeholder="e.g. Tokyo, London, America/New_York" size="small" />
                            )}
                            sx={{ flex: 1, minWidth: 0 }}
                            blurOnSelect
                            clearOnBlur
                        />
                        {zones.length > 0 && (
                            <Button
                                size="small"
                                startIcon={<AccessTime fontSize="small" />}
                                onClick={() => addZone(LOCAL_ZONE)}
                                disabled={zones.includes(LOCAL_ZONE)}
                                sx={{ whiteSpace: 'nowrap' }}
                            >
                                Add my timezone
                            </Button>
                        )}
                    </Stack>

                    <Paper sx={{ p: 2, borderRadius: 2, mb: 2.5, bgcolor: alpha(primary, 0.05), border: `1px solid ${alpha(primary, 0.15)}` }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 180 }}>
                                <AccessTime sx={{ fontSize: 18, color: primary }} />
                                <Typography variant="body2" fontWeight={700}>
                                    {referenceMinutes === null ? 'Showing live time' : `Reference: ${referenceLabel(referenceMinutes)} your time`}
                                </Typography>
                            </Stack>
                            <Slider
                                size="small"
                                value={referenceMinutes ?? now.getHours() * 60 + now.getMinutes()}
                                min={0}
                                max={1439}
                                step={5}
                                onChange={(_, v) => setReferenceMinutes(v as number)}
                                valueLabelDisplay="auto"
                                valueLabelFormat={referenceLabel}
                                sx={{ flex: 1 }}
                            />
                            <Button
                                size="small"
                                startIcon={<RestartAlt fontSize="small" />}
                                onClick={() => setReferenceMinutes(null)}
                                disabled={referenceMinutes === null}
                                sx={{ whiteSpace: 'nowrap' }}
                            >
                                Back to now
                            </Button>
                        </Stack>
                    </Paper>

                    {zones.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <Public sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5 }}>
                                No timezones added yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Search for a city above, or add your own timezone to get started.
                            </Typography>
                            <Button variant="outlined" size="small" onClick={() => addZone(LOCAL_ZONE)}>
                                Add my timezone ({zoneLabel(LOCAL_ZONE)})
                            </Button>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {zones.map(zone => (
                                <Grid item xs={12} sm={6} md={4} key={zone}>
                                    <ZoneCard zone={zone} instant={displayedInstant} onRemove={() => removeZone(zone)} />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default WorldClock;
