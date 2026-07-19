import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Typography, TextField, Alert, Grid, Paper, Button,
    Snackbar, useTheme, alpha,
} from '@mui/material';
import { Router, ContentCopy } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

// ---------------------------------------------------------------------------
// IPv4 / CIDR bit arithmetic, implemented directly (no library).
//
// An IPv4 address is conventionally written as four dotted-decimal octets
// but is really just a 32-bit unsigned integer. Everything below works by
// converting those four octets to a single number, doing plain
// mask/AND/OR/NOT arithmetic on it, then splitting the result back into
// four octets for display — exactly what a router does in hardware.
//
// Octets are combined with `* 256 +` rather than `<< 8` so intermediate
// values stay as ordinary (safe, double-precision) JS numbers instead of
// tripping the sign-bit wraparound that `<<` has once bit 31 is set (e.g.
// any address starting with an octet >= 128). The bitwise operators
// (`&`, `|`, `~`, `<<`) are only ever applied to full 32-bit values, with a
// final `>>> 0` to read the result back out as an unsigned number.
// ---------------------------------------------------------------------------

const ipToInt = (octets: number[]): number =>
    octets.reduce((acc, o) => acc * 256 + o, 0) >>> 0;

const intToIp = (int: number): string =>
    [24, 16, 8, 0].map(shift => (int >>> shift) & 255).join('.');

/** 32-bit mask with `prefix` leading 1 bits. Prefix 0 is special-cased
 * because `<< 32` is a no-op in JS (shift amounts wrap mod 32), which would
 * otherwise wrongly produce an all-ones mask instead of an all-zeros one. */
const maskFromPrefix = (prefix: number): number =>
    prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;

interface SubnetError {
    error: string;
}

interface SubnetOk {
    cidr: string;
    networkAddress: string;
    broadcastAddress: string;
    subnetMask: string;
    wildcardMask: string;
    firstHost: string;
    lastHost: string;
    usableHostCount: number;
    totalAddresses: number;
    note?: string;
}

type SubnetResult = SubnetError | SubnetOk;

const calculateSubnet = (raw: string): SubnetResult => {
    const trimmed = raw.trim();
    if (!trimmed) return { error: 'Enter an IPv4 address in CIDR notation, e.g. 192.168.1.0/24.' };

    const match = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,3})$/.exec(trimmed);
    if (!match) return { error: 'Format must be an IPv4 address followed by a prefix, e.g. 192.168.1.0/24.' };

    const octets = match[1].split('.').map(Number);
    if (octets.some(o => o < 0 || o > 255)) {
        return { error: 'Each IP octet must be a whole number between 0 and 255.' };
    }

    const prefix = Number(match[2]);
    if (prefix < 0 || prefix > 32) {
        return { error: 'Prefix length must be a whole number between /0 and /32.' };
    }

    const ipInt = ipToInt(octets);
    const maskInt = maskFromPrefix(prefix);
    const wildcardInt = (~maskInt) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;
    const totalAddresses = 2 ** (32 - prefix);

    let firstHostInt = networkInt;
    let lastHostInt = broadcastInt;
    let usableHostCount = Math.max(totalAddresses - 2, 0);
    let note: string | undefined;

    if (prefix === 32) {
        usableHostCount = 1;
        note = 'A /32 is a single-host route — the network address, broadcast address, and only usable address are all the same.';
    } else if (prefix === 31) {
        usableHostCount = 2;
        note = 'A /31 is a point-to-point link (RFC 3021) — both addresses are usable; there is no separate network or broadcast address.';
    } else {
        firstHostInt = networkInt + 1;
        lastHostInt = broadcastInt - 1;
    }

    return {
        cidr: `${octets.join('.')}/${prefix}`,
        networkAddress: intToIp(networkInt),
        broadcastAddress: intToIp(broadcastInt),
        subnetMask: intToIp(maskInt),
        wildcardMask: intToIp(wildcardInt),
        firstHost: intToIp(firstHostInt),
        lastHost: intToIp(lastHostInt),
        usableHostCount,
        totalAddresses,
        note,
    };
};

const DEFAULT_CIDR = '192.168.1.0/24';

const SubnetCalculator: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [input, setInput] = useState(DEFAULT_CIDR);
    const [snackbar, setSnackbar] = useState(false);

    const result = useMemo(() => calculateSubnet(input), [input]);

    const copySummary = () => {
        if ('error' in result) return;
        const summary =
            `CIDR: ${result.cidr}\n` +
            `Network Address: ${result.networkAddress}\n` +
            `Broadcast Address: ${result.broadcastAddress}\n` +
            `Subnet Mask: ${result.subnetMask}\n` +
            `Wildcard Mask: ${result.wildcardMask}\n` +
            `First Usable Host: ${result.firstHost}\n` +
            `Last Usable Host: ${result.lastHost}\n` +
            `Usable Hosts: ${result.usableHostCount.toLocaleString()}\n` +
            `Total Addresses: ${result.totalAddresses.toLocaleString()}`;
        navigator.clipboard.writeText(summary);
        setSnackbar(true);
    };

    const fields = 'error' in result ? [] : [
        { label: 'Network Address', value: result.networkAddress },
        { label: 'Broadcast Address', value: result.broadcastAddress },
        { label: 'Subnet Mask', value: result.subnetMask },
        { label: 'Wildcard Mask', value: result.wildcardMask },
        { label: 'First Usable Host', value: result.firstHost },
        { label: 'Last Usable Host', value: result.lastHost },
        { label: 'Usable Hosts', value: result.usableHostCount.toLocaleString() },
        { label: 'Total Addresses', value: result.totalAddresses.toLocaleString() },
    ];

    return (
        <ServicePageShell
            icon={Router}
            title="IP Subnet / CIDR Calculator"
            subtitle="Work out the network, broadcast, and usable host range for any IPv4 CIDR address — computed locally in your browser"
            maxWidth="md"
            seoTitle="Subnet Calculator — Free IPv4 CIDR Network Calculator"
            keywords={['subnet calculator', 'cidr calculator', 'ip subnet calculator', 'network address calculator', 'broadcast address calculator', 'wildcard mask calculator', 'ipv4 cidr calculator', 'subnet mask calculator']}
            about="Takes an IPv4 address in CIDR notation, such as 192.168.1.0/24, and works out every value a network engineer needs from it: the network and broadcast addresses, the subnet mask and its wildcard-mask complement, the first and last usable host addresses, and both the usable host count and total address count for that prefix. All of the arithmetic — converting dotted-decimal octets to a 32-bit integer, applying the prefix mask, and splitting the results back into octets — runs as plain bitwise and arithmetic operations directly in the browser; nothing is looked up from an external IP database or sent to a server. Point-to-point /31 and single-host /32 prefixes are called out with their RFC 3021 / host-route conventions rather than the usual network-plus-broadcast-reserved rule."
            howToSteps={[
                { name: 'Enter a CIDR address', text: 'Type an IPv4 address with a prefix length, e.g. 192.168.1.0/24, into the input field.' },
                { name: 'Check for validation errors', text: 'A malformed IP, an octet outside 0-255, or a prefix outside 0-32 shows a specific error message instead of a result.' },
                { name: 'Read the computed values', text: 'Network Address, Broadcast Address, Subnet Mask, Wildcard Mask, first/last usable host, and both address counts are all shown immediately as you type.' },
                { name: 'Copy the results', text: 'Click Copy Summary to copy every computed field to your clipboard as plain text.' },
            ]}
            faq={[
                { question: 'How is the network address calculated?', answer: 'The IP address is converted to a 32-bit integer and bitwise-ANDed with the subnet mask, which is itself derived from the prefix length as a 32-bit integer — the same calculation networking equipment performs. The result is converted back to dotted-decimal for display.' },
                { question: 'Why don’t /31 and /32 show "usable = total - 2"?', answer: "A /32 is a single host route — 1 address, no separate network or broadcast — and a /31 is a point-to-point link defined by RFC 3021, where both of its 2 addresses are usable since there's no room to reserve one for a broadcast address. Every other prefix (/0-/30) reserves the first address as the network address and the last as the broadcast address." },
                { question: 'Does this support IPv6?', answer: "No — this calculator is IPv4-only. IPv6 uses 128-bit addresses and different conventions (no broadcast address, for instance), which aren't covered here." },
                { question: 'Is my IP address sent anywhere?', answer: 'No. Parsing and all bit arithmetic happen locally in JavaScript in your browser — nothing is transmitted, logged, or looked up externally.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <TextField
                        fullWidth
                        label="CIDR Address"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="192.168.1.0/24"
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '1.1rem' } }}
                        sx={{ mb: 3 }}
                    />

                    {'error' in result ? (
                        <Alert severity="error">{result.error}</Alert>
                    ) : (
                        <>
                            {result.note && (
                                <Alert severity="info" sx={{ mb: 2 }}>{result.note}</Alert>
                            )}
                            <Grid container spacing={1.5} sx={{ mb: 3 }}>
                                {fields.map(f => (
                                    <Grid item xs={12} sm={6} md={3} key={f.label}>
                                        <Paper
                                            sx={{
                                                p: 1.5,
                                                height: '100%',
                                                borderRadius: 2,
                                                bgcolor: alpha(primary, 0.06),
                                                border: `1px solid ${alpha(primary, 0.2)}`,
                                            }}
                                        >
                                            <Typography variant="caption" fontWeight={700} color={primary} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                                                {f.label}
                                            </Typography>
                                            <Typography variant="subtitle1" fontWeight={800} fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                                                {f.value}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>

                            <Button variant="outlined" size="small" startIcon={<ContentCopy />} onClick={copySummary}>
                                Copy Summary
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="Copied to clipboard!" />
        </ServicePageShell>
    );
};

export default SubnetCalculator;
