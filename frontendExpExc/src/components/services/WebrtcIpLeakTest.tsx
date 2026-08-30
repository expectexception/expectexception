import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box, Card, Typography, Stack, Chip, Button, Alert, LinearProgress,
    Table, TableBody, TableHead, TableRow, TableCell,
} from '@mui/material';
import { VpnLock, Replay, Public, Lan } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type CandidateType = 'host' | 'srflx' | 'prflx' | 'relay' | 'unknown';

interface FoundAddress {
    address: string;
    type: CandidateType;
    isMdnsObfuscated: boolean;
    raw: string;
}

type TestStatus = 'idle' | 'running' | 'done' | 'unsupported' | 'error';

const STUN_SERVER = 'stun:stun.l.google.com:19302';
const GATHER_TIMEOUT_MS = 3000;
const KNOWN_TYPES: CandidateType[] = ['host', 'srflx', 'prflx', 'relay'];

/** Parses the SDP `a=candidate` attribute string ICE gives us, e.g.
 * "candidate:842163049 1 udp 1677729535 203.0.113.45 54321 typ srflx raddr 0.0.0.0 rport 0"
 * The grammar is fixed-position (foundation, component, transport,
 * priority, address, port, then "typ" <type>), so splitting on whitespace
 * and reading fields by position/keyword is more robust than a generic
 * IP-shaped regex, and it also handles the mDNS case where the "address"
 * field is a hostname like 8f3e2b1a-....local rather than a dotted IP. */
function parseCandidateLine(candidate: string): { address: string; type: CandidateType } | null {
    const parts = candidate.trim().split(/\s+/);
    if (parts.length < 8) return null;
    const address = parts[4];
    if (!address) return null;
    const typIndex = parts.indexOf('typ');
    const rawType = typIndex !== -1 ? parts[typIndex + 1] : '';
    const type: CandidateType = (KNOWN_TYPES as string[]).includes(rawType) ? (rawType as CandidateType) : 'unknown';
    return { address, type };
}

function typeLabel(entry: FoundAddress): string {
    if (entry.isMdnsObfuscated) return 'Local (mDNS-obfuscated)';
    switch (entry.type) {
        case 'host': return 'Local / Host';
        case 'srflx': return 'Public (via STUN)';
        case 'prflx': return 'Public (peer-reflexive)';
        case 'relay': return 'Relayed (TURN)';
        default: return 'Unknown';
    }
}

function typeChipColor(entry: FoundAddress): 'success' | 'warning' | 'default' {
    if (entry.isMdnsObfuscated) return 'success';
    if (entry.type === 'srflx' || entry.type === 'prflx') return 'warning';
    return 'default';
}

const WebrtcIpLeakTest: React.FC = () => {
    const [status, setStatus] = useState<TestStatus>('idle');
    const [addresses, setAddresses] = useState<FoundAddress[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const cancelledRef = useRef(false);

    const runTest = useCallback(() => {
        if (!('RTCPeerConnection' in window)) {
            setStatus('unsupported');
            return;
        }

        setStatus('running');
        setAddresses([]);
        setErrorMsg(null);
        const found = new Map<string, FoundAddress>();

        let pc: RTCPeerConnection;
        try {
            pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVER }] });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Could not create an RTCPeerConnection in this browser.';
            setStatus('error');
            setErrorMsg(message);
            return;
        }
        pcRef.current = pc;

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            pc.close();
            if (pcRef.current === pc) pcRef.current = null;
            if (!cancelledRef.current) setStatus('done');
        };

        pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (cancelledRef.current) return;
            if (!event.candidate || !event.candidate.candidate) {
                finish();
                return;
            }
            const parsed = parseCandidateLine(event.candidate.candidate);
            if (!parsed) return;
            const isMdns = parsed.address.endsWith('.local');
            const key = `${parsed.type}:${parsed.address}`;
            if (found.has(key)) return;
            found.set(key, { address: parsed.address, type: parsed.type, isMdnsObfuscated: isMdns, raw: event.candidate.candidate });
            setAddresses(Array.from(found.values()));
        };

        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') finish();
        };

        pc.createDataChannel('leak-test');
        pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .catch((e) => {
                if (cancelledRef.current) return;
                const message = e instanceof Error ? e.message : 'Failed to start ICE candidate gathering.';
                setStatus('error');
                setErrorMsg(message);
            });

        timeoutRef.current = window.setTimeout(finish, GATHER_TIMEOUT_MS);
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        runTest();
        return () => {
            cancelledRef.current = true;
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            pcRef.current?.close();
            pcRef.current = null;
        };
    }, [runTest]);

    const publicAddresses = addresses.filter((a) => a.type === 'srflx' || a.type === 'prflx');
    const localOpenAddresses = addresses.filter((a) => a.type === 'host' && !a.isMdnsObfuscated);
    const mdnsAddresses = addresses.filter((a) => a.isMdnsObfuscated);

    const about = 'Opens a real WebRTC peer connection to a public STUN server and inspects the ICE candidates your browser gathers while trying to set up that connection, the same mechanism dedicated "WebRTC leak test" sites use. The connection is never completed and no media or data is ever sent; it exists only long enough for ICE gathering to disclose which local and public addresses your browser is willing to reveal. This matters most for VPN users, since some VPNs tunnel ordinary HTTP traffic but never touch WebRTC, letting a website see your real public IP anyway.';

    const howToSteps = [
        { name: 'Test starts automatically', text: 'Gathering begins the moment this page loads. No button click is needed and no camera or microphone permission is ever requested.' },
        { name: 'Wait a few seconds', text: 'Gathering stops as soon as ICE reports it is complete, or after a 3 second timeout, whichever happens first.' },
        { name: 'Read the summary line', text: 'It states plainly whether a public IP was exposed via WebRTC and whether your local address was hidden behind mDNS.' },
        { name: 'Check the address table', text: 'Every unique address found is listed with its category: local/host, public (server-reflexive via STUN), or mDNS-obfuscated.' },
        { name: 'Re-run after toggling your VPN', text: 'Use the Run Again button to repeat the test right after connecting or disconnecting a VPN and compare the public IP it reports.' },
    ];

    const faq = [
        {
            question: 'Why does a WebRTC leak matter if I use a VPN?',
            answer: 'A VPN typically routes your regular HTTP/HTTPS traffic through its tunnel, but WebRTC establishes connections differently: it asks a STUN server directly what public IP it sees you connecting from, and some VPN clients never intercept that request. The result is that a website can run exactly the test on this page and learn your real public IP through WebRTC even while your normal browsing traffic is anonymized through the VPN. That gap is the whole reason "WebRTC leak test" is its own category of privacy tool.',
        },
        {
            question: 'I see an address ending in ".local" instead of a real 192.168.x.x address. Is the test broken?',
            answer: 'No, that is your browser working as intended. Modern Chrome and Firefox hide your real local network IP behind a randomly generated hostname like 8f3e2b1a-....local by default, specifically to stop websites from fingerprinting your local network topology. Seeing a .local address instead of your actual LAN IP confirms that protection is switched on.',
        },
        {
            question: 'What exactly does this tool send, and where does it go?',
            answer: 'Only STUN protocol messages to a public STUN server (Google\'s stun.l.google.com, the same kind of server ordinary WebRTC apps like video-calling tools already use) asking what address it sees the connection coming from. No video, audio, or data channel content is ever sent, no camera or microphone permission is requested, and nothing about the result is sent to expectexception.com\'s own servers. Everything after the STUN round trip happens locally in your browser.',
        },
        {
            question: "No public IP shows up at all. Is that good or bad?",
            answer: 'It usually means something is blocking WebRTC outright, such as a browser privacy extension, a restrictive firewall, or a browser setting that disables WebRTC entirely. That is generally a good sign from a privacy standpoint (there is nothing to leak if the mechanism does not run) though it also means this specific check cannot confirm anything either way for you right now.',
        },
    ];

    return (
        <ServicePageShell
            icon={VpnLock}
            title="WebRTC IP Leak Test"
            subtitle="Checks whether WebRTC reveals your real local or public IP address, the same technique VPN leak-test sites use"
            maxWidth="sm"
            toolId={95}
            seoTitle="WebRTC IP Leak Test | Check for VPN IP Leaks"
            seoDescription="Test whether WebRTC exposes your real public or local IP address, even behind a VPN. Uses a real STUN-based ICE candidate gathering test entirely in your browser: no media sent, nothing uploaded to our servers."
            keywords={['webrtc leak test', 'webrtc ip leak', 'vpn leak test', 'stun ip test', 'does my vpn leak my ip', 'webrtc privacy test', 'real ip address test']}
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
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2.5 }}>
                    <Typography variant="h6" fontWeight={800}>ICE candidate gathering</Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Replay />}
                        onClick={runTest}
                        disabled={status === 'running'}
                    >
                        {status === 'running' ? 'Running…' : 'Run Again'}
                    </Button>
                </Stack>

                {status === 'unsupported' && (
                    <Alert severity="info">
                        WebRTC (RTCPeerConnection) is not available in this browser, so this leak vector does not apply here.
                    </Alert>
                )}

                {status === 'error' && (
                    <Alert severity="error">{errorMsg || 'The WebRTC test failed unexpectedly.'}</Alert>
                )}

                {status === 'running' && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Gathering ICE candidates via a public STUN server (up to {(GATHER_TIMEOUT_MS / 1000).toFixed(0)}s)…
                        </Typography>
                        <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
                    </Box>
                )}

                {status === 'done' && (
                    <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                        {publicAddresses.length > 0 ? (
                            <Alert severity="warning" icon={<Public />}>
                                Your public IP as seen via WebRTC: {publicAddresses.map((a) => a.address).join(', ')}.
                                If you expect a VPN to hide this everywhere and it does not match your VPN's IP, WebRTC is leaking your real address.
                            </Alert>
                        ) : (
                            <Alert severity="success" icon={<Public />}>
                                No public IP was exposed via WebRTC in this test.
                            </Alert>
                        )}
                        {localOpenAddresses.length > 0 && (
                            <Alert severity="info" icon={<Lan />}>
                                A raw local network address was also exposed (not mDNS-obfuscated): {localOpenAddresses.map((a) => a.address).join(', ')}.
                            </Alert>
                        )}
                        {mdnsAddresses.length > 0 && (
                            <Alert severity="success" icon={<Lan />}>
                                Your local network address is hidden behind an mDNS hostname ({mdnsAddresses.length} found). That's your browser's privacy protection working as intended.
                            </Alert>
                        )}
                        {addresses.length === 0 && (
                            <Alert severity="info">
                                No ICE candidates were gathered at all. This can happen if a browser extension, firewall, or privacy setting blocks WebRTC entirely.
                            </Alert>
                        )}
                    </Stack>
                )}

                {addresses.length > 0 && (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ border: 0 }}>Address</TableCell>
                                    <TableCell sx={{ border: 0 }} align="right">Type</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {addresses.map((entry) => (
                                    <TableRow key={`${entry.type}:${entry.address}`}>
                                        <TableCell sx={{ border: 0, fontFamily: 'monospace' }}>{entry.address}</TableCell>
                                        <TableCell sx={{ border: 0 }} align="right">
                                            <Chip size="small" label={typeLabel(entry)} color={typeChipColor(entry)} variant={typeChipColor(entry) === 'default' ? 'outlined' : 'filled'} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}

                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2.5 }}>
                    STUN server used: {STUN_SERVER}. No media is sent, no camera/microphone permission is requested, and nothing is sent to expectexception.com's own servers. The only network traffic is the STUN round trip directly between your browser and Google's public STUN server.
                </Typography>
            </Card>
        </ServicePageShell>
    );
};

export default WebrtcIpLeakTest;
