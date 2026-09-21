import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, Checkbox, FormControlLabel, IconButton, MenuItem,
    Select, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { Wifi, Download, ContentCopy, Check, ExpandMore, ExpandLess } from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import ServicePageShell from './ServicePageShell';

type Security = 'WPA' | 'WEP' | 'nopass';

const SECURITY_LABELS: Record<Security, string> = {
    WPA: 'WPA / WPA2 / WPA3',
    WEP: 'WEP',
    nopass: 'None (open network)',
};

/* The de-facto WIFI: QR payload format (never formally standardized, but
 * universally understood by Android and iOS camera apps) is
 * WIFI:T:<type>;S:<ssid>;P:<password>;H:<true|false>;;
 * Within it, a backslash, semicolon, comma, double quote or colon inside the
 * SSID or password has to be backslash-escaped, or those characters would be
 * read as field separators instead of literal content. */
const ESCAPE_PATTERN = /([\\;,":])/g;

function escapeField(value: string): string {
    return value.replace(ESCAPE_PATTERN, '\\$1');
}

function buildPayload(ssid: string, password: string, security: Security, hidden: boolean): string {
    const parts = [`T:${security === 'nopass' ? 'nopass' : security}`];
    parts.push(`S:${escapeField(ssid)}`);
    if (security !== 'nopass') {
        parts.push(`P:${escapeField(password)}`);
    }
    if (hidden) parts.push('H:true');
    return `WIFI:${parts.join(';')};;`;
}

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const WifiQrCodeGenerator: React.FC = () => {
    const [ssid, setSsid] = useState('Home Network');
    const [password, setPassword] = useState('');
    const [security, setSecurity] = useState<Security>('WPA');
    const [hidden, setHidden] = useState(false);
    const [showPayload, setShowPayload] = useState(false);
    const [copied, setCopied] = useState(false);
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const qrBoxRef = React.useRef<HTMLDivElement>(null);

    const payload = useMemo(
        () => buildPayload(ssid, password, security, hidden),
        [ssid, password, security, hidden],
    );

    const canGenerate = ssid.trim() !== '';

    const copyPayload = useCallback(() => {
        navigator.clipboard.writeText(payload).then(
            () => setCopied(true),
            () => setSnackbar('Could not copy to clipboard'),
        );
        setTimeout(() => setCopied(false), 1800);
    }, [payload]);

    const download = useCallback(async () => {
        if (!qrBoxRef.current) return;
        try {
            const canvas = await html2canvas(qrBoxRef.current);
            canvas.toBlob((blob) => {
                if (blob) {
                    const name = (ssid.trim() || 'network').replace(/[^a-z0-9-]+/gi, '-');
                    saveAs(blob, `wifi-qr-${name}.png`);
                }
            });
        } catch {
            setSnackbar('Could not generate the download');
        }
    }, [ssid]);

    const about = "Most phone cameras can join a WiFi network straight from a QR code, using a payload format that packs the network name, password and security type into one string: WIFI:T:WPA;S:MyNetwork;P:MyPassword;H:false;;. This tool builds that string correctly, including the escaping WPA/WEP passwords and SSIDs need when they contain a semicolon, comma, backslash, colon or quote, characters that would otherwise be read as the end of a field instead of part of your password. The QR code itself is rendered entirely in your browser and never touches a server, which matters here more than most tools on this site since the image directly encodes a plaintext password.";

    const howToSteps = [
        { name: 'Enter the network name and password', text: 'Type the SSID exactly as it appears when you scan for networks, and the WiFi password. Leave the password blank for an open network.' },
        { name: 'Pick the security type', text: 'Choose WPA/WPA2/WPA3 for almost any modern router, WEP only for very old hardware, or None for a network with no password.' },
        { name: 'Mark it hidden if needed', text: 'Tick "Hidden network" only if the router is configured to not broadcast its SSID. Most networks are not hidden, and getting this wrong stops the code from connecting.' },
        { name: 'Download or scan it directly', text: 'Save the PNG to print or share, or just point a phone camera at the screen. Recent Android and iOS camera apps recognize the code and offer to join the network in one tap.' },
    ];

    const faq = [
        {
            question: 'What actually happens when someone scans this?',
            answer: "Android's camera and Google Lens, and iOS's Camera app, both recognize the WIFI: prefix and show a \"Join Network\" prompt instead of opening it as a link or plain text. Tapping it fills in the SSID and password and connects, the same as typing them in by hand. Older phones or third-party QR scanners may instead just show the raw payload text, in which case the person can read the SSID and password off it manually.",
        },
        {
            question: 'What does the "Hidden network" checkbox do?',
            answer: "It sets H:true in the payload, which tells the scanning device the router does not broadcast its SSID in the usual beacon frames, so the device needs to actively probe for that exact name rather than picking it from a visible list. Set it only if you deliberately disabled SSID broadcast on the router. Ticking it for an ordinary visible network does not break anything, but it is inaccurate and unnecessary.",
        },
        {
            question: 'Should I use WPA, WEP or None?',
            answer: "This only affects how the QR code is labeled, not your router's actual security, that is configured on the router itself. Pick whatever your router is really running: WPA covers WPA, WPA2 and WPA3, which is what almost every network built in the last decade uses. WEP is essentially obsolete and trivially broken, only present here for old hardware that has nothing better. None means an open network with no password at all, in which case the password field is left out of the payload entirely.",
        },
        {
            question: 'Why does the password end up visible in the QR code?',
            answer: "That is simply how this connection method works, the password has to be in the payload for a device to join automatically. It is not sent anywhere and this tool has no server component, but the resulting image is exactly as sensitive as the plaintext password: anyone who scans or reads it can connect. Treat a printed copy the way you would a sticky note with your WiFi password on it, and avoid posting a photo of it somewhere public.",
        },
        {
            question: 'Why do I need to escape special characters in the SSID or password?',
            answer: "The WIFI: format uses semicolons, commas, colons and quotes to separate its fields, so a password like p@ss;word would otherwise be read as ending right at the semicolon. This tool backslash-escapes those characters automatically wherever they appear in your SSID or password, so you can type the real value and the generated payload stays correct.",
        },
    ];

    return (
        <ServicePageShell
            icon={Wifi}
            title="WiFi QR Code Generator"
            subtitle="Turn a WiFi network name and password into a QR code that joins the network on scan"
            maxWidth="sm"
            toolId={110}
            seoTitle="WiFi QR Code Generator - Free WPA2 Network QR Code Maker"
            seoDescription="Generate a scannable WiFi QR code from a network name and password. Supports WPA/WPA2/WPA3, WEP and open networks, plus hidden networks, with correct payload escaping. Runs entirely in your browser."
            keywords={['wifi qr code generator', 'wifi qr code maker', 'generate wifi qr code', 'share wifi password qr', 'wpa2 qr code generator']}
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
                    <TextField
                        label="Network name (SSID)"
                        value={ssid}
                        onChange={(e) => setSsid(e.target.value)}
                        fullWidth
                        size="small"
                        inputProps={{ spellCheck: false }}
                    />

                    <Select
                        size="small"
                        value={security}
                        onChange={(e) => setSecurity(e.target.value as Security)}
                        fullWidth
                    >
                        {(Object.keys(SECURITY_LABELS) as Security[]).map((key) => (
                            <MenuItem key={key} value={key}>{SECURITY_LABELS[key]}</MenuItem>
                        ))}
                    </Select>

                    {security !== 'nopass' && (
                        <TextField
                            label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                            size="small"
                            inputProps={{ spellCheck: false, style: { fontFamily: 'monospace' } }}
                        />
                    )}

                    <FormControlLabel
                        control={<Checkbox checked={hidden} onChange={(e) => setHidden(e.target.checked)} />}
                        label={<Typography variant="body2">Hidden network (SSID not broadcast)</Typography>}
                    />

                    <Box sx={{ textAlign: 'center' }}>
                        {canGenerate ? (
                            <Box ref={qrBoxRef} sx={{ p: 2, bgcolor: 'white', borderRadius: '14px', display: 'inline-block' }}>
                                <QRCodeCanvas value={payload} size={220} level="H" includeMargin />
                            </Box>
                        ) : (
                            <Box sx={{ ...boxSx, py: 6 }}>
                                <Typography variant="body2" color="text.secondary">Enter a network name to generate a code</Typography>
                            </Box>
                        )}
                    </Box>

                    <Stack direction="row" spacing={1.5} justifyContent="center">
                        <Button size="small" variant="contained" startIcon={<Download />} onClick={download} disabled={!canGenerate}>
                            Download PNG
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={showPayload ? <ExpandLess /> : <ExpandMore />}
                            onClick={() => setShowPayload((v) => !v)}
                        >
                            {showPayload ? 'Hide payload' : 'Show payload'}
                        </Button>
                    </Stack>

                    {showPayload && (
                        <Box sx={{ ...boxSx, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                {payload}
                            </Typography>
                            <Tooltip title={copied ? 'Copied' : 'Copy payload'}>
                                <IconButton size="small" onClick={copyPayload} sx={{ color: copied ? 'success.main' : 'text.secondary', flexShrink: 0 }}>
                                    {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}

                    <Alert severity="info" sx={{ mt: 1 }}>
                        This QR code is generated entirely in your browser and never sent anywhere. But anyone who scans or photographs the image can read the WiFi password embedded in it, so handle a printed copy with the same care as the password itself.
                    </Alert>
                </Stack>
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default WifiQrCodeGenerator;
