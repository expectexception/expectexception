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

    const MAX_SPEED = 1000;

    // Derived active values
    const activeSpeed = phase === 'upload' ? uploadSpeed : downloadSpeed;
    const activeColor = phase === 'upload' ? '#bd00ff' : '#00eeff';
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
        const alpha = 0.25; // Slightly faster reaction
        setSmoothedDownload(prev => {
            const next = prev * (1 - alpha) + downloadSpeed * alpha;
            smoothedDownloadRef.current = next;
            return next;
        });
    }, [downloadSpeed]);

    useEffect(() => {
        const alpha = 0.25;
        setSmoothedUpload(prev => {
            const next = prev * (1 - alpha) + uploadSpeed * alpha;
            smoothedUploadRef.current = next;
            return next;
        });
    }, [uploadSpeed]);

    // Feed the graph at a steady rate
    useEffect(() => {
        const interval = setInterval(() => {
            if (!running) return;
            const now = (Date.now() / 1000);
            const speed = phase === 'upload' ? smoothedUploadRef.current : smoothedDownloadRef.current;
            const point: SpeedPoint = { time: parseFloat(now.toFixed(2)), speed: parseFloat(speed.toFixed(2)) };
            dataPointsRef.current = [...dataPointsRef.current.slice(-100), point];
            setDataPoints([...dataPointsRef.current]);
        }, 150); // Faster updates for smoother chart

        return () => clearInterval(interval);
    }, [phase, running]);

    const runNdt7 = async () => {
        return new Promise<void>((resolve, reject) => {
            if (!ndt7) {
                reject(new Error("NDT7 library not loaded"));
                return;
            }

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

                                if (origin.Source === 'server') {
                                    if (data.TCPInfo && data.TCPInfo.MinRTT) {
                                        const rtt = data.TCPInfo.MinRTT / 1000;
                                        setLatency(Math.round(rtt));
                                    }
                                }

                                if (origin.Source === 'client') {
                                    let speed = 0;
                                    if (data.MeanClientMbps) {
                                        speed = data.MeanClientMbps;
                                    } else if (data.mbps) {
                                        speed = data.mbps;
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
                                    speed = data.MeanClientMbps;
                                } else if (data.mbps) {
                                    speed = data.mbps;
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
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: 'none',
                    zIndex: 2
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '10%',
                        left: 'calc(50% - 2px)',
                        width: '4px',
                        height: '40%',
                        background: `linear-gradient(to bottom, ${activeColor}, transparent)`,
                        borderRadius: '4px',
                        boxShadow: `0 0 15px ${activeColor}, 0 0 30px ${activeColor}66`
                    }}
                />
            </Box>
        );
    };

    const GaugeArc = () => (
        <svg viewBox="0 0 200 200" style={{ transform: 'rotate(135deg)', width: '100%', height: '100%' }}>
            <circle
                cx="100" cy="100" r="90"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="6"
                strokeDasharray="424"
                strokeDashoffset="106"
                strokeLinecap="round"
            />
            {running && (
                <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke={activeColor}
                    strokeWidth="6"
                    strokeDasharray="424"
                    strokeDashoffset={424 - (424 * 0.75 * (progress / 100))}
                    strokeLinecap="round"
                    style={{
                        transition: 'stroke-dashoffset 0.2s ease-out',
                        filter: `drop-shadow(0 0 8px ${activeColor})`
                    }}
                />
            )}
        </svg>
    );

    return (
        <Box sx={{
            minHeight: '80vh',
            bgcolor: '#0a0e17',
            color: '#fff',
            pb: 4,
            overflowX: 'hidden',
            backgroundImage: 'radial-gradient(circle at 50% 30%, #1a2333 0%, #0a0e17 80%)'
        }}>
            <Seo title="Internet Speed Test" description="Accurate real-time broadband speed test." toolId={99} />

            <Container maxWidth="lg" sx={{ pt: { xs: 2, md: 4 }, px: { xs: 2, md: 4 }, position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

                {/* Header Stats Strip */}
                <Stack
                    direction="row"
                    justifyContent="center"
                    spacing={{ xs: 4, sm: 6 }}
                    sx={{ mb: { xs: 2, md: 6 }, opacity: 0.8 }}
                >
                    <Stack alignItems="center">
                        <Typography variant="caption" sx={{ color: activeColor, fontWeight: 700, fontSize: '0.7rem' }}>PHASE</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{phase.toUpperCase()}</Typography>
                    </Stack>
                    <Stack alignItems="center">
                        <Typography variant="caption" sx={{ color: activeColor, fontWeight: 700, fontSize: '0.7rem' }}>SERVER</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>M-Lab Global</Typography>
                    </Stack>
                </Stack>

                <Grid container spacing={4} alignItems="center" justifyContent="center" sx={{ flex: 1, alignContent: 'center' }}>

                    {/* Left: Gauge */}
                    <Grid item xs={12} md={6}>
                        <Box sx={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: { xs: 260, md: 380 },
                            aspectRatio: '1/1',
                            mx: 'auto'
                        }}>
                            <Box sx={{ position: 'absolute', inset: 0 }}>
                                <GaugeArc />
                            </Box>

                            {running && <GaugeNeedle percent={progress} />}

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
                                            width: { xs: 100, md: 140 },
                                            height: { xs: 100, md: 140 },
                                            borderRadius: '50%',
                                            border: `2px solid ${alpha('#00eeff', 0.3)}`,
                                            color: '#00eeff',
                                            fontSize: { xs: '1.5rem', md: '1.75rem' },
                                            fontWeight: 900,
                                            background: alpha('#00eeff', 0.05),
                                            backdropFilter: 'blur(10px)',
                                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                            '&:hover': {
                                                background: alpha('#00eeff', 0.2),
                                                boxShadow: '0 0 40px rgba(0, 238, 255, 0.5)',
                                                transform: 'scale(1.1)'
                                            }
                                        }}
                                    >
                                        GO
                                    </Button>
                                ) : (
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="h2" sx={{
                                            fontWeight: 800,
                                            letterSpacing: -2,
                                            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                                            textShadow: `0 0 30px ${activeColor}66`,
                                            fontFamily: 'monospace'
                                        }}>
                                            {activeSpeedSmoothed.toFixed(2)}
                                        </Typography>
                                        <Typography variant="h6" sx={{ color: activeColor, fontWeight: 700, mt: -1, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                                            Mbps
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Grid>

                    {/* Right: Results Dashboard */}
                    <Grid item xs={12} md={5}>
                        {/* Mobile: Horizontal Grid / Desktop: Vertical Stack */}
                        <Grid container spacing={2}>
                            <Grid item xs={4} md={12}>
                                <Paper sx={{
                                    p: { xs: 1.5, md: 3 },
                                    bgcolor: alpha('#fff', 0.03),
                                    border: `1px solid ${alpha('#fff', 0.05)}`,
                                    borderLeft: `4px solid #fff`,
                                    borderRadius: 2,
                                    height: '100%'
                                }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' } }}>PING</Typography>
                                    <Typography variant="h5" fontWeight={800} sx={{ fontSize: { xs: '1.2rem', md: '2.125rem' } }}>{latency !== null ? `${latency}` : '--'}<Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.7 }}>ms</Typography></Typography>
                                </Paper>
                            </Grid>

                            <Grid item xs={4} md={12}>
                                <Paper sx={{
                                    p: { xs: 1.5, md: 3 },
                                    bgcolor: alpha('#00eeff', 0.03),
                                    border: `1px solid ${alpha('#00eeff', 0.1)}`,
                                    borderLeft: `4px solid #00eeff`,
                                    borderRadius: 2,
                                    height: '100%'
                                }}>
                                    <Typography variant="caption" sx={{ color: '#00eeff', opacity: 0.8, fontSize: { xs: '0.65rem', md: '0.75rem' } }} fontWeight={700}>DOWNLOAD</Typography>
                                    <Typography variant="h5" fontWeight={800} color="#00eeff" sx={{ fontSize: { xs: '1.2rem', md: '2.125rem' } }}>
                                        {smoothedDownload > 0 ? smoothedDownload.toFixed(0) : '--'}
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid item xs={4} md={12}>
                                <Paper sx={{
                                    p: { xs: 1.5, md: 3 },
                                    bgcolor: alpha('#bd00ff', 0.03),
                                    border: `1px solid ${alpha('#bd00ff', 0.1)}`,
                                    borderLeft: `4px solid #bd00ff`,
                                    borderRadius: 2,
                                    height: '100%'
                                }}>
                                    <Typography variant="caption" sx={{ color: '#bd00ff', opacity: 0.8, fontSize: { xs: '0.65rem', md: '0.75rem' } }} fontWeight={700}>UPLOAD</Typography>
                                    <Typography variant="h5" fontWeight={800} color="#bd00ff" sx={{ fontSize: { xs: '1.2rem', md: '2.125rem' } }}>
                                        {smoothedUpload > 0 ? smoothedUpload.toFixed(0) : '--'}
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        {phase === 'complete' && (
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={startTest}
                                sx={{
                                    mt: 2,
                                    py: 1.5,
                                    borderColor: alpha('#fff', 0.2),
                                    color: '#fff',
                                    '&:hover': { borderColor: '#fff' }
                                }}
                            >
                                RETEST
                            </Button>
                        )}
                    </Grid>
                </Grid>

                {/* Performance History Chart */}
                <Box sx={{
                    mt: { xs: 4, md: 10 },
                    p: { xs: 0, md: 3 },
                    height: { xs: 120, md: 300 },
                    bgcolor: { xs: 'transparent', md: alpha('#fff', 0.02) },
                    borderRadius: 4,
                    border: { xs: 'none', md: `1px solid ${alpha('#fff', 0.05)}` },
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* <Typography variant="caption" sx={{ position: 'absolute', top: 0, left: 16, opacity: 0.5, fontWeight: 600, display: { xs: 'none', md: 'block' } }}>
                        REAL-TIME THROUGHPUT (Mbps)
                    </Typography> */}

                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dataPoints}>
                            <defs>
                                <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={activeColor} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={activeColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis hide dataKey="time" />
                            <YAxis hide domain={[0, 'auto']} />
                            <Area
                                type="monotone"
                                dataKey="speed"
                                stroke={activeColor}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#speedGradient)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>

                    {/* Data pulse at end of line */}
                    {running && dataPoints.length > 0 && (
                        <Box sx={{
                            position: 'absolute',
                            right: 16,
                            top: `${90 - (Math.min(activeSpeedSmoothed / MAX_SPEED, 1) * 80)}%`,
                            width: 10,
                            height: 10,
                            bgcolor: activeColor,
                            borderRadius: '50%',
                            boxShadow: `0 0 15px ${activeColor}`,
                            transition: 'top 0.3s ease-out'
                        }} />
                    )}
                </Box>

                {error && <Alert severity="error" variant="filled" sx={{ mt: 4, borderRadius: 2 }}>{error}</Alert>}
            </Container>
        </Box>
    );
};

export default SpeedTest;
