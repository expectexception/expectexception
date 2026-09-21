import React, { useMemo, useState } from 'react';
import {
    Autocomplete, Box, Card, IconButton, Stack, TextField, Typography, alpha,
} from '@mui/material';
import { EventAvailable, Close } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

interface IntlWithSupportedValuesOf {
    supportedValuesOf?: (key: string) => string[];
}

const FALLBACK_ZONES = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Anchorage', 'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
    'America/Bogota', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires',
    'America/Sao_Paulo', 'Europe/London', 'Europe/Dublin', 'Europe/Lisbon', 'Europe/Paris',
    'Europe/Madrid', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Rome', 'Europe/Zurich',
    'Europe/Stockholm', 'Europe/Warsaw', 'Europe/Athens', 'Europe/Istanbul', 'Europe/Moscow',
    'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg', 'Africa/Nairobi',
    'Asia/Jerusalem', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata',
    'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'Asia/Singapore',
    'Asia/Kuala_Lumpur', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Taipei', 'Asia/Manila',
    'Asia/Seoul', 'Asia/Tokyo', 'Australia/Perth', 'Australia/Adelaide', 'Australia/Brisbane',
    'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland', 'Pacific/Fiji',
    'Pacific/Honolulu',
];

function supportedTimeZones(): string[] {
    const intlExt = Intl as unknown as IntlWithSupportedValuesOf;
    if (typeof intlExt.supportedValuesOf === 'function') {
        try {
            const zones = intlExt.supportedValuesOf('timeZone');
            if (zones.length > 0) return zones;
        } catch {
            // fall through to the bundled list
        }
    }
    return FALLBACK_ZONES;
}

/** Local hour/minute in `timeZone` for the given instant, read via the real
 * ICU timezone database through Intl - never hand-rolled UTC offset math, so
 * daylight saving transitions are always correct for "today". */
function localTime(date: Date, timeZone: string): { hour: number; minute: number } {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    const parts = fmt.formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return { hour, minute };
}

type Shade = 'good' | 'ok' | 'poor';

function shadeFor(hour: number): Shade {
    if (hour >= 9 && hour < 18) return 'good';
    if ((hour >= 7 && hour < 9) || (hour >= 18 && hour < 21)) return 'ok';
    return 'poor';
}

const SHADE_COLOR: Record<Shade, string> = {
    good: '#4caf50',
    ok: '#ffb300',
    poor: '#455a64',
};

function formatHourMinute(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

const DEFAULT_ZONES = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'];

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const MeetingTimezonePlanner: React.FC = () => {
    const allZones = useMemo(() => supportedTimeZones(), []);
    const [zones, setZones] = useState<string[]>(DEFAULT_ZONES);
    const [selectedHour, setSelectedHour] = useState<number | null>(12);
    const [pickerValue, setPickerValue] = useState<string | null>(null);

    // A single stable "today" so the whole grid represents one consistent
    // UTC-anchored day, computed once rather than drifting mid-session.
    const [baseDate] = useState(() => {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    });

    const instants = useMemo(
        () => HOURS.map((h) => new Date(baseDate.getTime() + h * 3600 * 1000)),
        [baseDate],
    );

    const addZone = (zone: string | null) => {
        if (!zone || zones.includes(zone)) return;
        setZones((prev) => [...prev, zone]);
        setPickerValue(null);
    };

    const removeZone = (zone: string) => {
        setZones((prev) => prev.filter((z) => z !== zone));
    };

    const summary = selectedHour === null ? null : zones.map((zone) => {
        const { hour, minute } = localTime(instants[selectedHour], zone);
        return { zone, hour, minute, shade: shadeFor(hour) };
    });

    const about = "Converting one time zone at a time is easy to get wrong the moment daylight saving is involved, since a fixed UTC offset silently stops being correct twice a year in most places. This lays every added city out as a full 24-hour grid instead, each cell computed against a real date through the browser's own Intl timezone database rather than hand-rolled offset arithmetic, so the daylight saving state for \"today\" is always correct automatically. Pick a column to see the exact local time it maps to everywhere at once.";

    const howToSteps = [
        { name: 'Add time zones', text: 'Search by city or region name and add everyone relevant to the meeting.' },
        { name: 'Scan the grid', text: 'Each row is a city, each column a UTC hour. Green is a comfortable local time, amber is early/late but workable, dark is outside reasonable hours.' },
        { name: 'Pick an hour', text: 'Click a column header to see the exact local time it produces for every added city in the summary line below.' },
    ];

    const faq = [
        {
            question: 'How does this handle daylight saving time correctly?',
            answer: 'Every local time shown is computed by asking the browser\'s own Intl.DateTimeFormat API what the local wall-clock time is in a given IANA time zone at a specific real instant (today\'s date), rather than applying a fixed UTC offset per zone. That API is backed by the same IANA time zone database your operating system uses, which already tracks every region\'s daylight saving rules and their change dates, so a zone currently observing daylight saving is reflected correctly without this tool needing to know anything about DST rules itself.',
        },
        {
            question: 'Why use a grid instead of just converting one time at a time?',
            answer: 'A single conversion answers "what time is 3pm my time somewhere else", but scheduling almost always needs the opposite question answered for several people at once: "which hour works reasonably for everyone". Laying every zone out against the same 24 UTC hours turns that into something you can just look at, rather than mentally re-deriving offsets for each participant one at a time.',
        },
        {
            question: 'What does "reasonable hours" actually mean here?',
            answer: 'It is a simple, fixed default, not a personal preference setting: local 9am-6pm counts as comfortable, 7-9am and 6-9pm as early-or-late-but-workable, and everything outside that as unreasonable for most people. It is meant as a fast visual heuristic for spotting a workable slot at a glance, not a hard rule, since what counts as a reasonable meeting time genuinely varies by person and role.',
        },
        {
            question: 'Does the grid represent "today" specifically, or is it always the same 24 hours?',
            answer: 'It is anchored to the current UTC calendar day at the moment the page loaded, which matters because a given UTC hour can fall on different calendar dates in different zones, and because daylight saving state depends on the actual date. Reloading the page recomputes it against the new current day.',
        },
        {
            question: 'Can I add the same time zone twice, or a city that isn\'t listed?',
            answer: 'Duplicates are prevented automatically. The searchable list comes from the browser\'s own supported time zone list where available (essentially the full IANA database, hundreds of zones), falling back to a curated list of roughly 50 major zones on browsers that don\'t expose that API yet. Either way, zones are identified by region name (like Asia/Kolkata) rather than city name, which is the same convention every IANA-based tool uses.',
        },
    ];

    return (
        <ServicePageShell
            icon={EventAvailable}
            title="Meeting Time Zone Planner"
            subtitle="Lay out several time zones side by side and find an hour that works for everyone, DST handled correctly"
            maxWidth="lg"
            toolId={118}
            seoTitle="Meeting Time Zone Planner - Free Time Zone Overlap Finder"
            seoDescription="Find a meeting time that works across multiple time zones. A 24-hour overlap grid computed via the real Intl timezone API, so daylight saving is always handled correctly."
            keywords={['meeting time zone planner', 'time zone overlap finder', 'schedule across time zones', 'world clock meeting planner']}
            about={about}
            howToSteps={howToSteps}
            faq={faq}
        >
            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                overflowY: 'auto',
            }}>
                <Stack spacing={2}>
                    <Autocomplete
                        size="small"
                        options={allZones.filter((z) => !zones.includes(z))}
                        value={pickerValue}
                        onChange={(_, value) => addZone(value)}
                        renderInput={(params) => <TextField {...params} label="Add a time zone" placeholder="e.g. Asia/Kolkata" />}
                    />

                    <Box sx={{ overflowX: 'auto' }}>
                        <Box sx={{ minWidth: 24 * 34 + 160 }}>
                            <Box sx={{ display: 'flex', pl: '160px', mb: 0.5 }}>
                                {HOURS.map((h) => (
                                    <Box
                                        key={h}
                                        onClick={() => setSelectedHour(h)}
                                        sx={{
                                            width: 34, textAlign: 'center', cursor: 'pointer', borderRadius: '4px',
                                            bgcolor: selectedHour === h ? alpha('#fff', 0.12) : 'transparent',
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">{String(h).padStart(2, '0')}</Typography>
                                    </Box>
                                ))}
                            </Box>

                            {zones.map((zone) => (
                                <Box key={zone} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                    <Box sx={{ width: 160, pr: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" noWrap title={zone}>{zone.replace(/_/g, ' ')}</Typography>
                                        <IconButton size="small" onClick={() => removeZone(zone)} sx={{ color: 'text.secondary' }}>
                                            <Close sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Box>
                                    {HOURS.map((h) => {
                                        const { hour, minute } = localTime(instants[h], zone);
                                        const shade = shadeFor(hour);
                                        return (
                                            <Box
                                                key={h}
                                                onClick={() => setSelectedHour(h)}
                                                sx={{
                                                    width: 34, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', bgcolor: alpha(SHADE_COLOR[shade], shade === 'poor' ? 0.35 : 0.55),
                                                    border: selectedHour === h ? '1px solid rgba(255,255,255,0.6)' : '1px solid transparent',
                                                    borderRadius: '3px', mr: '1px',
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ fontSize: '0.62rem', fontFamily: 'monospace' }}>
                                                    {formatHourMinute(hour, minute)}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {summary && summary.length > 0 && (
                        <Box sx={boxSx}>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>{formatHourMinute(selectedHour ?? 0, 0)} UTC</strong> is:
                            </Typography>
                            <Stack spacing={0.25}>
                                {summary.map(({ zone, hour, minute, shade }) => (
                                    <Typography key={zone} variant="body2" color="text.secondary">
                                        {zone.replace(/_/g, ' ')}: <span style={{ color: SHADE_COLOR[shade] }}>{formatHourMinute(hour, minute)}</span>
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Stack>
            </Card>
        </ServicePageShell>
    );
};

export default MeetingTimezonePlanner;
