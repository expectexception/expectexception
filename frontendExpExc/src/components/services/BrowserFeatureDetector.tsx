import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Card, Typography, Stack, Chip, Alert, LinearProgress,
    Table, TableBody, TableRow, TableCell, alpha, useTheme,
} from '@mui/material';
import { Checklist, CheckCircle, Cancel, HourglassEmpty } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

interface FeatureRow {
    key: string;
    label: string;
    /** null while an async check (currently just the storage estimate) is still resolving. */
    supported: boolean | null;
    /** Caveat or usage note shown under the feature name: permission requirements,
     * deprecation status, partial-implementation warnings, etc. */
    detail?: string;
}

interface FeatureGroup {
    name: string;
    rows: FeatureRow[];
}

/** Runs a presence/capability check and swallows any throw as "not supported".
 * A handful of these APIs throw instead of just being absent in locked-down
 * or privacy-hardened browser configurations (e.g. WebGL context creation
 * can throw when a privacy setting blocks it outright), so treating a throw
 * as "unsupported" rather than letting it crash the page is itself part of
 * doing this check honestly. */
function safeCheck(fn: () => boolean): boolean {
    try {
        return fn();
    } catch {
        return false;
    }
}

// Minimal WebAssembly module (function type () -> v128, body using the
// v128.load / i8x16.splat SIMD opcodes) that only validates successfully if
// the engine actually understands SIMD instructions. This exact byte
// sequence is the same one used by Google's wasm-feature-detect library,
// so it's a real feature probe rather than a guess based on browser/version.
const WASM_SIMD_PROBE = new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123,
    3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
]);

function buildFeatureGroups(): FeatureGroup[] {
    const isolated = 'crossOriginIsolated' in window ? window.crossOriginIsolated : false;

    return [
        {
            name: 'Graphics & Compute',
            rows: [
                {
                    key: 'webgl',
                    label: 'WebGL',
                    supported: safeCheck(() => !!document.createElement('canvas').getContext('webgl')),
                },
                {
                    key: 'webgl2',
                    label: 'WebGL2',
                    supported: safeCheck(() => !!document.createElement('canvas').getContext('webgl2')),
                },
                {
                    key: 'webgpu',
                    label: 'WebGPU',
                    supported: 'gpu' in navigator,
                    detail: 'Still rolling out across browsers, so being present here does not guarantee every WebGPU feature is fully implemented yet.',
                },
                {
                    key: 'offscreencanvas',
                    label: 'OffscreenCanvas',
                    supported: 'OffscreenCanvas' in window,
                },
                {
                    key: 'wasm',
                    label: 'WebAssembly',
                    supported: 'WebAssembly' in window,
                },
                {
                    key: 'wasm-simd',
                    label: 'WebAssembly SIMD',
                    supported: safeCheck(() => typeof WebAssembly !== 'undefined'
                        && typeof WebAssembly.validate === 'function'
                        && WebAssembly.validate(WASM_SIMD_PROBE)),
                    detail: 'Tested by asking the engine to validate a tiny module that only compiles if SIMD opcodes are understood.',
                },
            ],
        },
        {
            name: 'Storage',
            rows: [
                { key: 'indexeddb', label: 'IndexedDB', supported: 'indexedDB' in window },
                {
                    key: 'localstorage',
                    label: 'localStorage',
                    supported: safeCheck(() => {
                        const testKey = '__feature_detector_probe__';
                        window.localStorage.setItem(testKey, '1');
                        window.localStorage.removeItem(testKey);
                        return true;
                    }),
                    detail: 'A value is actually written and then removed here rather than only checking for presence, because some private-mode browsers expose the API but throw when it is used.',
                },
                {
                    key: 'sessionstorage',
                    label: 'sessionStorage',
                    supported: safeCheck(() => {
                        const testKey = '__feature_detector_probe__';
                        window.sessionStorage.setItem(testKey, '1');
                        window.sessionStorage.removeItem(testKey);
                        return true;
                    }),
                },
                { key: 'cache-api', label: 'Cache API', supported: 'caches' in window },
                {
                    key: 'storage-quota',
                    label: 'Storage quota estimate',
                    supported: null,
                    detail: 'Checking…',
                },
            ],
        },
        {
            name: 'Media & Devices',
            rows: [
                { key: 'webrtc', label: 'WebRTC (RTCPeerConnection)', supported: 'RTCPeerConnection' in window },
                {
                    key: 'getusermedia',
                    label: 'getUserMedia',
                    supported: safeCheck(() => !!navigator.mediaDevices?.getUserMedia),
                    detail: 'The API existing does not request camera or microphone access; that still needs a call the user has to grant permission for.',
                },
                {
                    key: 'webaudio',
                    label: 'Web Audio API',
                    supported: 'AudioContext' in window || 'webkitAudioContext' in window,
                },
                { key: 'mediarecorder', label: 'MediaRecorder', supported: 'MediaRecorder' in window },
                {
                    key: 'pip',
                    label: 'Picture-in-Picture',
                    supported: safeCheck(() => 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled),
                },
            ],
        },
        {
            name: 'Background & Workers',
            rows: [
                { key: 'workers', label: 'Web Workers', supported: 'Worker' in window },
                { key: 'service-workers', label: 'Service Workers', supported: 'serviceWorker' in navigator },
                {
                    key: 'sab',
                    label: 'SharedArrayBuffer',
                    supported: 'SharedArrayBuffer' in window,
                    detail: isolated
                        ? 'Present and this page is cross-origin isolated (COOP/COEP), so it is actually usable here right now.'
                        : 'Present in this browser, but SharedArrayBuffer only works on pages served with cross-origin isolation (COOP/COEP) headers. This page is not isolated, so it would not be usable here even though the API exists.',
                },
                {
                    key: 'background-sync',
                    label: 'Background Sync',
                    supported: safeCheck(() => 'serviceWorker' in navigator && 'SyncManager' in window),
                },
            ],
        },
        {
            name: 'Security & Identity',
            rows: [
                {
                    key: 'webauthn',
                    label: 'WebAuthn',
                    supported: 'PublicKeyCredential' in window,
                    detail: 'Actually registering or signing in with a passkey/security key still requires user interaction on top of this.',
                },
                { key: 'credential-mgmt', label: 'Credential Management API', supported: 'credentials' in navigator },
                { key: 'permissions-api', label: 'Permissions API', supported: 'permissions' in navigator },
                { key: 'crypto-subtle', label: 'crypto.subtle (Web Crypto)', supported: safeCheck(() => !!window.crypto?.subtle) },
            ],
        },
        {
            name: 'Misc Platform',
            rows: [
                { key: 'clipboard', label: 'Clipboard API', supported: safeCheck(() => !!navigator.clipboard) },
                {
                    key: 'geolocation',
                    label: 'Geolocation',
                    supported: 'geolocation' in navigator,
                    detail: 'The API being present does not mean location access is granted; that prompts the user separately, every time, unless already allowed.',
                },
                {
                    key: 'notifications',
                    label: 'Notifications',
                    supported: 'Notification' in window,
                    detail: 'Sending a notification still requires the user to grant permission first.',
                },
                {
                    key: 'bluetooth',
                    label: 'Web Bluetooth',
                    supported: 'bluetooth' in navigator,
                    detail: 'Chromium-only API. Even where present, connecting to a device requires a user gesture and per-device permission.',
                },
                {
                    key: 'usb',
                    label: 'WebUSB',
                    supported: 'usb' in navigator,
                    detail: 'Chromium-only API, gated behind a user gesture and device permission prompt.',
                },
                {
                    key: 'battery',
                    label: 'Battery Status API',
                    supported: 'getBattery' in navigator,
                    detail: 'Deprecated and removed from most browsers over fingerprinting concerns, so expect "not supported" almost everywhere now.',
                },
            ],
        },
    ];
}

function formatBytes(bytes: number): string {
    if (!isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exp = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, exp);
    return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

function StatusIcon({ supported }: { supported: boolean | null }) {
    if (supported === null) return <HourglassEmpty fontSize="small" sx={{ color: 'text.disabled' }} />;
    return supported
        ? <CheckCircle fontSize="small" color="success" />
        : <Cancel fontSize="small" color="error" />;
}

const BrowserFeatureDetector: React.FC = () => {
    const theme = useTheme();
    const [groups, setGroups] = useState<FeatureGroup[]>(() => buildFeatureGroups());

    useEffect(() => {
        let cancelled = false;

        function setStorageQuotaRow(supported: boolean, detail: string) {
            if (cancelled) return;
            setGroups((prev) => prev.map((g) => (g.name !== 'Storage' ? g : {
                ...g,
                rows: g.rows.map((r) => (r.key !== 'storage-quota' ? r : { ...r, supported, detail })),
            })));
        }

        (async () => {
            if (!navigator.storage || typeof navigator.storage.estimate !== 'function') {
                setStorageQuotaRow(false, 'navigator.storage.estimate() is not available in this browser.');
                return;
            }
            try {
                const est = await navigator.storage.estimate();
                const usage = est.usage ?? 0;
                const quota = est.quota ?? 0;
                setStorageQuotaRow(true, `${formatBytes(usage)} used of an estimated ${formatBytes(quota)} available (browser-reported, approximate).`);
            } catch {
                setStorageQuotaRow(false, 'The estimate request failed in this browser.');
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const { supportedCount, totalCount } = useMemo(() => {
        let supported = 0;
        let total = 0;
        groups.forEach((g) => g.rows.forEach((r) => {
            if (r.supported === null) return;
            total += 1;
            if (r.supported) supported += 1;
        }));
        return { supportedCount: supported, totalCount: total };
    }, [groups]);

    const about = 'Runs a live runtime check against a broad set of modern web platform APIs instead of reading your browser\'s User-Agent string. Each row calls the same presence or capability test a website would use before relying on that feature: does a canvas actually return a WebGL context, does navigator.mediaDevices expose getUserMedia, does WebAssembly.validate() accept a SIMD-using module. Results are grouped by category (graphics, storage, media, background processing, security, and a few miscellaneous platform APIs) so you can scan for what your current browser exposes right now.';

    const howToSteps = [
        { name: 'Open the page', text: 'Every check runs automatically the moment the page loads. There is nothing to click to start.' },
        { name: 'Scan by category', text: 'Features are grouped into Graphics & Compute, Storage, Media & Devices, Background & Workers, Security & Identity, and Misc Platform.' },
        { name: 'Read the notes', text: 'Some rows include a caveat underneath the name, such as a permission requirement or a deprecation warning, and those matter as much as the pass/fail icon.' },
        { name: 'Check the summary', text: 'The count at the top totals every feature that resolved to a definite yes/no (the storage quota estimate is informational and is not counted).' },
    ];

    const faq = [
        {
            question: 'Why is this more reliable than just checking my browser name and version?',
            answer: 'User-Agent strings can be spoofed by extensions or dev tools, are increasingly frozen or truncated by browsers themselves for privacy reasons, and even when accurate they only tell you which browser is running, not whether a specific API actually works. Feature detection skips the middleman: it asks the browser directly, right now, whether a given API exists and responds the way it should. That is also exactly how well-built websites decide whether to use an API in production, rather than maintaining a lookup table of which browser versions support what.',
        },
        {
            question: 'What does "supported" actually mean here?',
            answer: 'It means the API existed and did not throw on a basic presence or capability check. It does not mean every corner of its spec is fully implemented. A browser can expose an API\'s name while only partially supporting it, shipping it behind a flag in some configurations, or handling edge cases differently than the spec describes. This is a real limitation of feature detection in general, and it is worth keeping in mind before treating a green checkmark as a guarantee.',
        },
        {
            question: 'The API shows as supported, so why did the actual feature refuse to work in my app?',
            answer: 'Several of these APIs (camera and microphone access, precise geolocation, notifications, Bluetooth, USB) require the user to grant permission separately, every time or per-origin, even when the API itself is fully present. A "supported" result here means the browser exposes the capability, not that it is currently authorized for use. Try the actual permission prompt in context if you need to confirm it works end to end.',
        },
        {
            question: 'Does this tool send anything about my browser to a server?',
            answer: 'No. Every check runs in your browser with plain JavaScript: canvas context creation, object presence checks, a WebAssembly validation call, and a storage estimate. Nothing about the results leaves your device.',
        },
    ];

    return (
        <ServicePageShell
            icon={Checklist}
            title="Browser Feature & API Support Matrix"
            subtitle="Live runtime detection of modern web platform APIs, not a guess based on your User-Agent string"
            maxWidth="md"
            toolId={93}
            seoTitle="Browser Feature Detector | Live Web API Support Test"
            seoDescription="Check which modern web platform APIs (WebGL, WebGPU, WebRTC, Service Workers, WebAuthn and more) your browser actually supports right now, tested live at runtime rather than guessed from the User-Agent string."
            keywords={['browser feature detector', 'browser api support test', 'web platform api checker', 'can i use test online', 'webgl support test', 'webgpu support check', 'feature detection tool', 'browser compatibility checker']}
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
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="h5" fontWeight={900}>
                            {supportedCount} of {totalCount} features supported
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Tested live in this browser session, just now.
                        </Typography>
                    </Box>
                    <Chip
                        icon={<CheckCircle />}
                        label={`${totalCount > 0 ? Math.round((supportedCount / totalCount) * 100) : 0}% supported`}
                        color="primary"
                        variant="outlined"
                    />
                </Stack>
                <LinearProgress
                    variant="determinate"
                    value={totalCount > 0 ? (supportedCount / totalCount) * 100 : 0}
                    sx={{ borderRadius: 1, height: 6, mb: 3 }}
                />

                <Alert severity="info" sx={{ mb: 2 }}>
                    Every row below is a real runtime check performed in this page, not a lookup based on your browser's name or version string.
                </Alert>

                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableBody>
                            {groups.map((group) => (
                                <React.Fragment key={group.name}>
                                    <TableRow>
                                        <TableCell colSpan={2} sx={{ border: 0, pt: 2.5, pb: 0.5 }}>
                                            <Typography variant="overline" fontWeight={800} sx={{ color: theme.palette.primary.main, letterSpacing: 1 }}>
                                                {group.name}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                    {group.rows.map((row) => (
                                        <TableRow key={row.key} sx={{ '&:hover': { bgcolor: alpha('#fff', 0.02) } }}>
                                            <TableCell sx={{ border: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <Typography variant="body2" fontWeight={600}>{row.label}</Typography>
                                                {row.detail && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                                        {row.detail}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right" sx={{ border: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
                                                <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                                                    <StatusIcon supported={row.supported} />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {row.supported === null ? 'Checking…' : row.supported ? 'Supported' : 'Not supported'}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            </Card>
        </ServicePageShell>
    );
};

export default BrowserFeatureDetector;
