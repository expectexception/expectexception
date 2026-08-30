import React, { useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, Slider, Chip, useTheme } from '@mui/material';
import { Hub } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

function isValidOctet(n: number): boolean {
    return Number.isInteger(n) && n >= 0 && n <= 255;
}

function parseIPv4(ip: string): number[] | null {
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return null;
    const nums = parts.map(p => Number(p));
    for (let i = 0; i < 4; i++) {
        if (!/^\d{1,3}$/.test(parts[i]) || !isValidOctet(nums[i])) return null;
    }
    return nums;
}

function octetsToUint32(octets: number[]): number {
    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function uint32ToOctets(n: number): number[] {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function uint32ToIp(n: number): string {
    return uint32ToOctets(n).join('.');
}

function maskFromPrefix(prefix: number): number {
    if (prefix === 0) return 0;
    return (0xffffffff << (32 - prefix)) >>> 0;
}

interface SubnetResult {
    network: string;
    broadcast: string;
    firstHost: string;
    lastHost: string;
    usableHosts: number;
    totalAddresses: number;
    netmask: string;
    wildcard: string;
    binaryMask: string;
    ipClass: string;
}

function ipClassOf(firstOctet: number): string {
    if (firstOctet < 128) return 'A';
    if (firstOctet < 192) return 'B';
    if (firstOctet < 224) return 'C';
    if (firstOctet < 240) return 'D (multicast)';
    return 'E (reserved)';
}

function calcSubnet(ip: string, prefix: number): SubnetResult | null {
    const octets = parseIPv4(ip);
    if (!octets || prefix < 0 || prefix > 32) return null;

    const ipInt = octetsToUint32(octets);
    const mask = maskFromPrefix(prefix);
    const networkInt = (ipInt & mask) >>> 0;
    const broadcastInt = (networkInt | (~mask >>> 0)) >>> 0;
    const totalAddresses = Math.pow(2, 32 - prefix);
    const usableHosts = prefix >= 31 ? 0 : totalAddresses - 2;

    const firstHostInt = prefix >= 31 ? networkInt : (networkInt + 1) >>> 0;
    const lastHostInt = prefix >= 31 ? broadcastInt : (broadcastInt - 1) >>> 0;

    return {
        network: uint32ToIp(networkInt),
        broadcast: uint32ToIp(broadcastInt),
        firstHost: uint32ToIp(firstHostInt),
        lastHost: uint32ToIp(lastHostInt),
        usableHosts,
        totalAddresses,
        netmask: uint32ToIp(mask),
        wildcard: uint32ToIp((~mask) >>> 0),
        binaryMask: uint32ToOctets(mask).map(o => o.toString(2).padStart(8, '0')).join('.'),
        ipClass: ipClassOf(octets[0]),
    };
}

const SubnetCalculator: React.FC = () => {
    const theme = useTheme();
    const [ipInput, setIpInput] = useState('192.168.1.10');
    const [prefix, setPrefix] = useState(24);

    const result = useMemo(() => calcSubnet(ipInput, prefix), [ipInput, prefix]);
    const isValid = parseIPv4(ipInput) !== null;

    return (
        <ServicePageShell
            icon={Hub}
            title="IPv4 Subnet / CIDR Calculator"
            subtitle="Work out network address, broadcast address, usable host range and subnet mask from any IP and prefix length"
            maxWidth="sm"
            toolId={81}
            seoTitle="Subnet Calculator | IPv4 CIDR Network, Broadcast & Host Range"
            seoDescription="Free IPv4 subnet calculator. Enter an IP address and CIDR prefix to get the network address, broadcast address, usable host range, subnet mask and total address count instantly, entirely in your browser."
            keywords={['subnet calculator', 'cidr calculator', 'ip subnet calculator', 'network address calculator', 'broadcast address calculator', 'subnet mask calculator', 'ipv4 calculator']}
            about="Takes an IPv4 address and a CIDR prefix length and works out everything that follows from them: the network address, the broadcast address, the subnet mask in both dotted-decimal and binary, the wildcard mask, and the first and last usable host addresses. The math is plain bitwise arithmetic on the 32-bit integer form of the address, done with JavaScript's own bitwise operators, so there is nothing to send to a server and nothing to wait on."
            howToSteps={[
                { name: 'Enter an IPv4 address', text: 'Type any address in the four-octet dotted-decimal form, like 192.168.1.10.' },
                { name: 'Set the CIDR prefix length', text: 'Drag the slider or read off a value from 0 to 32. /24 is the most common home and small-office prefix.' },
                { name: 'Read the results', text: 'The network address, broadcast address, subnet mask, wildcard mask and usable host range update as you type or drag.' },
            ]}
            faq={[
                {
                    question: 'What does a /24 actually mean?',
                    answer: 'The number after the slash is the prefix length: how many leading bits of the 32-bit address are fixed as the network portion, with the rest free for host addresses. A /24 fixes the first 24 bits, leaving 8 bits (256 addresses) for hosts, of which 254 are usable once the network and broadcast addresses are set aside. A /16 leaves 16 host bits (65,536 addresses), and so on: every extra bit in the prefix cuts the address space in half.',
                },
                {
                    question: 'Why are only some of the addresses in a subnet usable for hosts?',
                    answer: 'The very first address in a subnet is reserved as the network address, and the very last is reserved as the broadcast address, so neither can be assigned to an individual device. That is why usable hosts equals total addresses minus 2, for every prefix except /31 and /32, which are special cases used for point-to-point links and single-host routes where that reservation does not apply.',
                },
                {
                    question: 'What is a wildcard mask and how is it different from a subnet mask?',
                    answer: "A wildcard mask is just the bitwise inverse of the subnet mask, and it shows up mainly in access control lists on routers and firewalls, where some vendors express address ranges that way instead of with a plain mask. Where a subnet mask has a 1 for every network bit, the wildcard mask has a 0 there and a 1 everywhere else, which is why the two always add up to all 1s when combined.",
                },
                {
                    question: 'Is this tool doing anything different from working it out by hand?',
                    answer: 'No, it is the same arithmetic you would do with pencil and paper or a subnetting cheat sheet: convert the IP address to its 32-bit integer form, AND it with the mask to get the network address, OR the inverted mask onto the network address to get the broadcast address, and read the host range off both ends. This just does it instantly and without a chance of an arithmetic slip.',
                },
            ]}
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
                <CardContent sx={{ p: 1 }}>
                    <TextField
                        fullWidth
                        label="IPv4 address"
                        value={ipInput}
                        onChange={e => setIpInput(e.target.value)}
                        error={!isValid}
                        helperText={isValid ? ' ' : 'Enter a valid IPv4 address, e.g. 192.168.1.10'}
                        sx={{ mb: 1 }}
                        inputProps={{ spellCheck: false, style: { fontFamily: 'monospace' } }}
                    />

                    <Typography gutterBottom sx={{ mt: 2 }}>
                        Prefix length: /{prefix}
                    </Typography>
                    <Slider
                        value={prefix}
                        onChange={(_, v) => setPrefix(v as number)}
                        min={0}
                        max={32}
                        step={1}
                        sx={{ mb: 3 }}
                    />

                    {result && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            {[
                                ['Network address', result.network],
                                ['Broadcast address', result.broadcast],
                                ['First usable host', result.firstHost],
                                ['Last usable host', result.lastHost],
                                ['Subnet mask', result.netmask],
                                ['Wildcard mask', result.wildcard],
                            ].map(([label, value]) => (
                                <Box key={label} sx={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    p: 1.5, borderRadius: '10px', bgcolor: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: theme.palette.primary.main }}>{value}</Typography>
                                </Box>
                            ))}

                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                <Chip size="small" label={`${result.usableHosts.toLocaleString()} usable hosts`} />
                                <Chip size="small" label={`${result.totalAddresses.toLocaleString()} total addresses`} />
                                <Chip size="small" label={`Class ${result.ipClass}`} />
                            </Box>

                            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', mt: 1, wordBreak: 'break-all' }}>
                                Mask (binary): {result.binaryMask}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default SubnetCalculator;
