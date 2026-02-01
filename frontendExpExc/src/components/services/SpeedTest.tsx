import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Container,
    Grid,
    Typography,
    Stack,
    Alert,
    useTheme,
    Paper,
    alpha
} from '@mui/material';
import {
    PlayArrow,
    Refresh,
    Wifi,
    Public
} from '@mui/icons-material';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer
} from 'recharts';
import Seo from '../seo/Seo';

// @ts-ignore
import ndt7 from '@m-lab/ndt7';

interface SpeedPoint {
    time: number;
    speed: number;
}

const SpeedTest: React.FC = () => {
    const theme = useTheme();
    const [running, setRunning] = useState(false);
    const [phase, setPhase] = useState<'idle' | 'download' | 'upload' | 'complete'>('idle');
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [latency, setLatency] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dataPoints, setDataPoints] = useState<SpeedPoint[]>([]);
    const dataPointsRef = useRef<SpeedPoint[]>([]);

    // Smoothed values for UI (exponential moving average)
    const [smoothedDownload, setSmoothedDownload] = useState(0);
    const [smoothedUpload, setSmoothedUpload] = useState(0);
    const smoothedDownloadRef = useRef(0);
    const smoothedUploadRef = useRef(0);

    const MAX_SPEED = 1000; // Cap for gauge visual

    // Derived active values
    const activeSpeed = phase === 'upload' ? uploadSpeed : downloadSpeed;
    const activeColor = phase === 'upload' ? '#bd00ff' : '#00eeff'; // Purple vs Cyan
    const activeSpeedSmoothed = phase === 'upload' ? smoothedUpload : smoothedDownload;
    const progress = Math.min(activeSpeedSmoothed / MAX_SPEED * 100, 100);

    const startTest = async () => {
        setRunning(true);
        setPhase('download');
        setDownloadSpeed(0);
        setUploadSpeed(0);
        setLatency(null);
        setError(null);
        setDataPoints([]);
        dataPointsRef.current = [];

        try {
            await runNdt7();
            setPhase('complete');
        } catch (e: any) {
            console.error("Speed test failed:", e);
            setError("Could not connect to test server. Please check your connection.");
            setPhase('idle');
        } finally {
            setRunning(false);
        }
    };

    // Smooth incoming speed updates with EMA
    useEffect(() => {
        const alpha = 0.18;
        setSmoothedDownload(prev => {
            const next = prev * (1 - alpha) + downloadSpeed * alpha;
            smoothedDownloadRef.current = next;
            return next;
        });
    }, [downloadSpeed]);

    useEffect(() => {
        const alpha = 0.18;
        setSmoothedUpload(prev => {
            const next = prev * (1 - alpha) + uploadSpeed * alpha;
            smoothedUploadRef.current = next;
            return next;
        });
    }, [uploadSpeed]);

    // Feed the graph at a steady rate (uses smoothed refs to avoid rapid re-renders)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = (Date.now() / 1000);
            const speed = phase === 'upload' ? smoothedUploadRef.current : smoothedDownloadRef.current;
            const point: SpeedPoint = { time: Math.round(now), speed: Number(speed.toFixed(2)) };
            dataPointsRef.current = [...dataPointsRef.current.slice(-120), point];
            setDataPoints([...dataPointsRef.current]);
        }, 700);

        return () => clearInterval(interval);
    }, [phase]);

    const runNdt7 = async () => {
        return new Promise<void>((resolve, reject) => {
            if (!ndt7) {
                reject(new Error("NDT7 library not loaded"));
                return;
            }

            let currentPoints: SpeedPoint[] = [];
            const startTime = Date.now();

            try {
                ndt7.test(
                    {
                        userAcceptedDataPolicy: true,
                        downloadworkerfile: '/ndt7/ndt7-download-worker.min.js',
                        uploadworkerfile: '/ndt7/ndt7-upload-worker.min.js',
                    },
                    {
                        serverChosen: (server: any) => {
                            console.log('Server chosen:', server);
                        },
                        downloadMeasurement: (origin: any) => {
                            if (origin && origin.Data) {
                                setPhase('download');
                                const data = origin.Data;

                                // --- SERVER MSG (Latency) ---
                                if (origin.Source === 'server') {
                                    if (data.TCPInfo && data.TCPInfo.MinRTT) {
                                        // MinRTT is in microseconds
                                        const rtt = data.TCPInfo.MinRTT / 1000;
                                        setLatency(Math.round(rtt));
                                    }
                                }

                                // --- CLIENT MSG (Throughput) ---
                                if (origin.Source === 'client') {
                                    let speed = 0;
                                    if (data.MeanClientMbps) {
                                        speed = parseFloat(data.MeanClientMbps.toFixed(2));
                                    } else if (data.AppInfo && data.AppInfo.NumBytes && data.AppInfo.ElapsedTime) {
                                        // Calc fallback
                                        speed = data.mbps ? parseFloat(data.mbps.toFixed(2)) : 0;
                                    }

                                    if (speed > 0) {
                                        setDownloadSpeed(speed);
                                    }
                                }
                            }
                        },
                        uploadMeasurement: (origin: any) => {
                            if (origin && origin.Source === 'client' && origin.Data) {
                                setPhase('upload');
                                const data = origin.Data;

                                let speed = 0;
                                if (data.MeanClientMbps) {
                                    speed = parseFloat(data.MeanClientMbps.toFixed(2));
                                } else {
                                    speed = data.mbps ? parseFloat(data.mbps.toFixed(2)) : 0;
                                }

                                if (speed > 0) {
                                    setUploadSpeed(speed);
                                }
                            }
                        },
                        error: (err: any) => {
                            console.error("NDT7 error", err);
                        }
                    }
                ).then((exitcode: number) => {
                    resolve();
                }).catch((err: any) => {
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    };

    // --- Custom Gauge Components ---
    const GaugeNeedle = ({ percent }: { percent: number }) => {
        // -135deg to +135deg range
        const rotation = -135 + (percent / 100) * 270;
        return (
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '100%',
                    height: '100%',
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    transition: 'transform 0.1s linear',
                    pointerEvents: 'none',
                    zIndex: 2
                }}
            >
                {/* Needle Design - tapered line */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: '10%',
                        left: 'calc(50% - 2px)',
                        width: '4px',
                        height: '40%',
                        background: activeColor,
                        borderRadius: '4px',
                        boxShadow: `0 0 15px ${activeColor}, 0 0 30px ${activeColor}`
                    }}
                />
            </Box>
        );
    };

    const GaugeArc = () => (
        <svg viewBox="0 0 200 200" style={{ transform: 'rotate(135deg)', width: '100%', height: '100%' }}>
            {/* Background Track */}
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeDasharray="410" strokeDashoffset="105" strokeLinecap="round" />

            {/* Active Progress */}
            {running && (
                <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke={activeColor}
                    strokeWidth="4"
                    strokeDasharray="410"
                    strokeDashoffset={410 - (410 * 0.75 * (progress / 100))}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                />
            )}
        </svg>
    );

    return (
        <Box sx={{
            minHeight: '80vh',
            bgcolor: '#0a0e17',
            color: '#fff',
            pb: 8,
            overflow: 'hidden',
            backgroundImage: 'radial-gradient(circle at 50% 30%, #1a2333 0%, #0a0e17 70%)'
        }}>
            <Seo title="Internet Speed Test" description="Accurate broadband speed test." toolId={99} />

            <Container maxWidth="lg" sx={{ pt: 4, px: { xs: 2, md: 4 }, position: 'relative', zIndex: 1 }}>

                {/* Header Info */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={2}
                    sx={{ mb: 6 }}
                >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.7 }}>
                        <Public fontSize="small" />
                        <Typography variant="body2">SERVER: M-Lab (Global)</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.7 }}>
                        <Wifi fontSize="small" />
                        <Typography variant="body2">{running ? 'TESTING...' : 'IDLE'}</Typography>
                    </Stack>
                </Stack>

                <Grid container spacing={4} alignItems="center" justifyContent="center">

                    {/* Main Gauge Section */}
                    <Grid item xs={12} md={6}>
                        <Box sx={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 320,
                            aspectRatio: '1/1',
                            mx: 'auto'
                        }}>
                            {/* Gauge SVG Layer */}
                            <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                                <GaugeArc />
                            </Box>

                            {/* Needle Layer */}
                            {running && <GaugeNeedle percent={progress} />}

                            {/* Center Content */}
                            <Box sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 3
                            }}>
                                {!running && phase !== 'complete' ? (
                                    <Button
                                        onClick={startTest}
                                        sx={{
                                            width: { xs: 100, sm: 120 },
                                            height: { xs: 100, sm: 120 },
                                            borderRadius: '50%',
                                            border: '2px solid rgba(0, 238, 255, 0.3)',
                                            color: '#00eeff',
                                            fontSize: { xs: '1.25rem', sm: '1.5rem' },
                                            fontWeight: 900,
                                            background: 'rgba(0, 238, 255, 0.05)',
                                            backdropFilter: 'blur(5px)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                background: 'rgba(0, 238, 255, 0.15)',
                                                boxShadow: '0 0 30px rgba(0, 238, 255, 0.4)',
                                                transform: 'scale(1.05)'
                                            }
                                        }}
                                    >
                                        GO
                                    </Button>
                                ) : (
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
                                            {phase === 'download' ? 'DOWNLOAD' : phase === 'upload' ? 'UPLOAD' : 'RESULT'}
                                        </Typography>
                                        <Typography variant="h2" sx={{
                                            fontWeight: 700,
                                            letterSpacing: -2,
                                            my: 0,
                                            fontSize: { xs: '3rem', sm: '3.75rem' },
                                            textShadow: `0 0 20px ${activeColor}55`
                                        }}>
                                            {activeSpeedSmoothed.toFixed(0)}
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: activeColor, fontWeight: 600 }}>
                                            Mbps
                                        </Typography>
                                    </Box>
                                )}

                                {phase === 'complete' && !running && (
                                    <Button
                                        startIcon={<Refresh />}
                                        onClick={startTest}
                                        sx={{ mt: 2, color: 'rgba(255,255,255,0.7)' }}
                                    >
                                        Restart
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Grid>

                    {/* Stats List */}
                    <Grid item xs={12} md={4}>
                        <Stack spacing={2} direction={{ xs: 'row', md: 'column' }} justifyContent="center">
                            <Paper sx={{ p: 2, flex: 1, bgcolor: 'rgba(255,255,255,0.03)', borderLeft: '4px solid #fff' }}>
                                <Typography variant="caption" color="text.secondary">PING</Typography>
                                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>{latency !== null ? `${latency} ms` : '-'}</Typography>
                            </Paper>
                                <Paper sx={{ p: 2, flex: 1, bgcolor: 'rgba(255,255,255,0.03)', borderLeft: '4px solid #00eeff' }}>
                                <Typography variant="caption" color="text.secondary">DOWNLOAD</Typography>
                                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' }, color: '#00eeff' }}>{smoothedDownload > 0 ? smoothedDownload.toFixed(0) : '-'}</Typography>
                            </Paper>
                            <Paper sx={{ p: 2, flex: 1, bgcolor: 'rgba(255,255,255,0.03)', borderLeft: '4px solid #bd00ff' }}>
                                <Typography variant="caption" color="text.secondary">UPLOAD</Typography>
                                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' }, color: '#bd00ff' }}>{smoothedUpload > 0 ? smoothedUpload.toFixed(0) : '-'}</Typography>
                            </Paper>
                        </Stack>
                    </Grid>
                </Grid>

                {/* Graph at Bottom */}
                <Box sx={{ mt: 8, height: 200, opacity: 0.8, display: { xs: 'none', sm: 'block' } }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dataPoints}>
                            <defs>
                                <linearGradient id="gradientGraph" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={activeColor} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={activeColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis hide dataKey="time" />
                            <YAxis hide domain={[0, 'auto']} />
                            <Area
                                type="monotone"
                                dataKey="speed"
                                stroke={activeColor}
                                strokeWidth={2}
                                fill="url(#gradientGraph)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </Box>

                {/* Background graph visible on mobile (smaller height) with latest-point pulse */}
                <Box sx={{ mt: 4, height: { xs: 120, sm: 200 }, opacity: 0.75, display: 'block', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dataPoints}>
                            <defs>
                                <linearGradient id="gradientGraphMobile" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={activeColor} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={activeColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis hide dataKey="time" />
                            <YAxis hide domain={[0, 'auto']} />
                            <Area type="monotone" dataKey="speed" stroke={activeColor} strokeWidth={2} fill="url(#gradientGraphMobile)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>

                    {/* latest-point indicator */}
                    <Box
                        sx={(theme) => ({
                            position: 'absolute',
                            right: 12,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            transform: 'translateY(-50%)',
                            background: activeColor,
                            boxShadow: `0 0 12px ${activeColor}55, 0 0 24px ${activeColor}33`,
                            top: `${50 - (Math.min(activeSpeedSmoothed / MAX_SPEED, 1) * 50)}%`,
                            transition: 'top 400ms ease, box-shadow 400ms',
                            border: `2px solid ${theme.palette.background.default}`
                        })}
                    />
                </Box>

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Container>
        </Box>
    );
};

export default SpeedTest;
