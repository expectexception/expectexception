import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, Grid, IconButton, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { ContactPage, Download, ContentCopy, Check, ExpandMore, ExpandLess } from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import ServicePageShell from './ServicePageShell';

/* vCard reserved characters (RFC 6350 / the older 2426 that most phones still
 * parse fine): backslash, comma, semicolon and newline must be escaped or
 * they are read as field/value separators instead of literal content. */
function escapeVcard(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}

interface ContactFields {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    org: string;
    title: string;
    website: string;
    address: string;
}

const EMPTY_CONTACT: ContactFields = {
    firstName: 'Jane', lastName: 'Doe', phone: '+1 555 123 4567', email: 'jane@example.com',
    org: '', title: '', website: '', address: '',
};

function buildVcard(c: ContactFields): string {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    const fullName = [c.firstName, c.lastName].filter((s) => s.trim() !== '').join(' ').trim();

    lines.push(`N:${escapeVcard(c.lastName)};${escapeVcard(c.firstName)};;;`);
    lines.push(`FN:${escapeVcard(fullName || 'Unnamed')}`);
    if (c.org.trim()) lines.push(`ORG:${escapeVcard(c.org)}`);
    if (c.title.trim()) lines.push(`TITLE:${escapeVcard(c.title)}`);
    if (c.phone.trim()) lines.push(`TEL;TYPE=CELL:${escapeVcard(c.phone)}`);
    if (c.email.trim()) lines.push(`EMAIL:${escapeVcard(c.email)}`);
    if (c.website.trim()) lines.push(`URL:${escapeVcard(c.website)}`);
    if (c.address.trim()) lines.push(`ADR;TYPE=WORK:;;${escapeVcard(c.address)};;;;`);
    lines.push('END:VCARD');
    return lines.join('\n');
}

const FIELD_CONFIG: { key: keyof ContactFields; label: string; required?: boolean }[] = [
    { key: 'firstName', label: 'First name', required: true },
    { key: 'lastName', label: 'Last name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'org', label: 'Organization' },
    { key: 'title', label: 'Job title' },
    { key: 'website', label: 'Website' },
    { key: 'address', label: 'Address' },
];

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const VcardQrCodeGenerator: React.FC = () => {
    const [contact, setContact] = useState<ContactFields>(EMPTY_CONTACT);
    const [showPayload, setShowPayload] = useState(false);
    const [copied, setCopied] = useState(false);
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const qrBoxRef = React.useRef<HTMLDivElement>(null);

    const payload = useMemo(() => buildVcard(contact), [contact]);
    const canGenerate = contact.firstName.trim() !== '' || contact.lastName.trim() !== '';

    const setField = useCallback((key: keyof ContactFields, value: string) => {
        setContact((prev) => ({ ...prev, [key]: value }));
    }, []);

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
                    const name = [contact.firstName, contact.lastName].join('-').replace(/[^a-z0-9-]+/gi, '-') || 'contact';
                    saveAs(blob, `vcard-qr-${name}.png`);
                }
            });
        } catch {
            setSnackbar('Could not generate the download');
        }
    }, [contact]);

    const about = "Scanning this QR code offers to save a new contact directly, because it encodes a vCard, the same plain-text contact format phones and address book apps read natively, rather than a link to somewhere else. Every field you fill in becomes one line of the vCard, with commas, semicolons, backslashes and line breaks escaped correctly so a comma in a company name or an address does not corrupt the fields around it. Everything is generated and rendered in your browser, useful on a printed business card, an email signature, or a conference badge.";

    const howToSteps = [
        { name: 'Fill in a name', text: 'First or last name is the only thing required; everything else is optional and left out of the vCard if left blank.' },
        { name: 'Add contact details', text: 'Phone, email, organization, title, website and address are all optional fields that get added to the card when filled in.' },
        { name: 'Scan or download', text: 'Point a phone camera at the code to test it, or download it as a PNG to print on a card or add to a signature.' },
    ];

    const faq = [
        {
            question: 'What happens when someone scans this?',
            answer: 'Most phone camera apps recognize the vCard format automatically and show an "Add Contact" or "Create Contact" prompt with every field already filled in, rather than opening it as a link or plain text. One tap saves it straight into their address book, no manual typing required.',
        },
        {
            question: 'Which fields are actually required?',
            answer: 'Only a name, first or last, is required to produce a valid card; every other field is left out of the generated vCard entirely if you leave it blank, rather than being included empty. A vCard with just a name is still perfectly valid and scannable, it just will not have anything to save beyond that name.',
        },
        {
            question: 'What vCard version does this use, and does it matter?',
            answer: "This generates vCard 3.0, which is the version with the broadest real-world compatibility: essentially every iOS and Android contact app parses it correctly. vCard 4.0 exists and is the more modern standard, but support for it is inconsistent enough across phone camera apps that 3.0 remains the safer choice for something meant to be scanned by an unknown device.",
        },
        {
            question: 'Can I put this on a printed business card?',
            answer: 'Yes, that is one of the most common uses. Download the PNG and place it anywhere on a card design with enough contrast and a reasonable minimum size (roughly 2cm/0.8in square at typical print resolution scans reliably from a normal reading distance). Test it with a couple of different phones before a print run, since very small or low-contrast prints can be harder for a camera to lock onto.',
        },
        {
            question: 'Why are commas and semicolons in my input backslash-escaped in the raw payload?',
            answer: 'The vCard format itself uses commas and semicolons as structural separators within a field, so a literal comma in something like "Doe, Inc." would otherwise be misread as two separate values. This tool escapes those characters, along with backslashes and line breaks, automatically wherever they appear in what you type, so the field displays correctly once scanned.',
        },
    ];

    return (
        <ServicePageShell
            icon={ContactPage}
            title="vCard QR Code Generator"
            subtitle="Turn contact details into a QR code that saves straight into a phone's address book"
            maxWidth="sm"
            toolId={115}
            seoTitle="vCard QR Code Generator - Free Contact Card / Business Card QR Maker"
            seoDescription="Generate a scannable vCard QR code from a name, phone, email, organization and address. Correctly escaped, standards-compliant vCard 3.0, rendered entirely in your browser."
            keywords={['vcard qr code generator', 'contact card qr code', 'business card qr code generator', 'vcf qr code maker']}
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
                    <Grid container spacing={1.5}>
                        {FIELD_CONFIG.map(({ key, label, required }) => (
                            <Grid item xs={12} sm={6} key={key}>
                                <TextField
                                    label={label + (required ? ' *' : '')}
                                    value={contact[key]}
                                    onChange={(e) => setField(key, e.target.value)}
                                    fullWidth
                                    size="small"
                                    inputProps={{ spellCheck: false }}
                                />
                            </Grid>
                        ))}
                    </Grid>

                    <Box sx={{ textAlign: 'center' }}>
                        {canGenerate ? (
                            <Box ref={qrBoxRef} sx={{ p: 2, bgcolor: 'white', borderRadius: '14px', display: 'inline-block' }}>
                                <QRCodeCanvas value={payload} size={220} level="M" includeMargin />
                            </Box>
                        ) : (
                            <Box sx={{ ...boxSx, py: 6 }}>
                                <Typography variant="body2" color="text.secondary">Enter a name to generate a code</Typography>
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
                            {showPayload ? 'Hide vCard' : 'Show vCard'}
                        </Button>
                    </Stack>

                    {showPayload && (
                        <Box sx={{ ...boxSx, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                            <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>
                                {payload}
                            </Typography>
                            <Tooltip title={copied ? 'Copied' : 'Copy vCard'}>
                                <IconButton size="small" onClick={copyPayload} sx={{ color: copied ? 'success.main' : 'text.secondary', flexShrink: 0 }}>
                                    {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}

                    <Alert severity="info" sx={{ mt: 1 }}>
                        This QR code is generated entirely in your browser and never sent anywhere.
                    </Alert>
                </Stack>
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default VcardQrCodeGenerator;
