import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Grid,
    Typography,
    Stack,
    Alert,
    useTheme,
    Paper,
    alpha,
    Card,
    Container,
} from '@mui/material';
import {
    Refresh,
    Speed,
    NetworkCheck,
    CompassCalibration
} from '@mui/icons-material';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer
} from 'recharts';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

// @ts-ignore
import ndt7 from '@m-lab/ndt7';

interface SpeedPoint {
    time: number;
    speed: number;
}

const SpeedTest: React.FC = () => {
    const theme = useTheme();
    const downloadColor = theme.palette.secondary.main;
    const uploadColor = theme.palette.primary.main;
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
        const alpha = 0.25;
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
        }, 150);

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
                        serverChosen: () => {},
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

    // --- Interactive Cyber Radar/Console SVGs ---
    const renderRadarConsole = () => {
        const angle = -135 + (progress / 100) * 270;
        return (
            <svg viewBox="0 0 220 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* Outer Cybernetic Ring */}
                <circle cx="110" cy="110" r="102" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                <circle cx="110" cy="110" r="98" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1.5" strokeDasharray="5 8" />

                {/* Radar Grid Overlay */}
                <line x1="110" y1="12" x2="110" y2="208" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                <line x1="12" y1="110" x2="208" y2="110" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                
                {/* Speed Divisions (Ticks) */}
                {Array.from({ length: 11 }).map((_, i) => {
                    const tickAngle = -135 + i * 27;
                    const rad = (tickAngle * Math.PI) / 180;
                    const x1 = 110 + 80 * Math.cos(rad);
                    const y1 = 110 + 80 * Math.sin(rad);
                    const x2 = 110 + 90 * Math.cos(rad);
                    const y2 = 110 + 90 * Math.sin(rad);
                    return (
                        <line
                            key={i}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke={i * 100 <= activeSpeedSmoothed ? activeColor : 'rgba(255, 255, 255, 0.15)'}
                            strokeWidth={i % 5 === 0 ? '2' : '1'}
                            style={{ transition: 'stroke 0.3s ease' }}
                        />
                    );
                })}

                {/* Main Progress Arc */}
                <circle
                    cx="110" cy="110" r="86"
                    fill="none"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="8"
                    strokeDasharray="405"
                    strokeDashoffset="101"
                    strokeLinecap="round"
                    style={{ transform: 'rotate(135deg)', transformOrigin: '110px 110px' }}
                />
                
                {running && (
                    <circle
                        cx="110" cy="110" r="86"
                        fill="none"
                        stroke={activeColor}
                        strokeWidth="8"
                        strokeDasharray="405"
                        strokeDashoffset={405 - (405 * 0.75 * (progress / 100))}
                        strokeLinecap="round"
                        style={{
                            transform: 'rotate(135deg)',
                            transformOrigin: '110px 110px',
                            transition: 'stroke-dashoffset 0.15s ease-out',
                            filter: `drop-shadow(0 0 10px ${activeColor})`
                        }}
                    />
                )}

                {/* Center Core */}
                <circle cx="110" cy="110" r="54" fill="rgba(10, 14, 23, 0.85)" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                <circle cx="110" cy="110" r="46" fill="none" stroke={alpha(activeColor, 0.15)} strokeWidth="1" strokeDasharray="3 3" />

                {/* Scanning sweep effect (when running) */}
                {running && (
                    <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '110px 110px', transition: 'transform 0.15s ease-out' }}>
                        {/* Needle */}
                        <line
                            x1="110" y1="110" x2="110" y2="24"
                            stroke={activeColor}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 8px ${activeColor})` }}
                        />
                        <polygon
                            points="106,32 110,20 114,32"
                            fill={activeColor}
                            style={{ filter: `drop-shadow(0 0 6px ${activeColor})` }}
                        />
                    </g>
                )}
            </svg>
        );
    };

    // --- Data Pipe Pipeline Animation ---
    const renderDataPipeline = () => {
        const isDownload = phase === 'download';
        const isUpload = phase === 'upload';
        const activePipeColor = isDownload ? '#00eeff' : isUpload ? '#bd00ff' : 'rgba(255,255,255,0.1)';
        
        return (
            <svg viewBox="0 0 60 280" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* Pipe Column */}
                <rect x="22" y="10" width="16" height="260" rx="8" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
                
                {/* Center pipeline track */}
                <line x1="30" y1="15" x2="30" y2="265" stroke={alpha(activePipeColor, 0.2)} strokeWidth="2" strokeDasharray="4 4" />
                
                {/* Flowing Packets */}
                {running && (
                    <g>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <circle
                                key={i}
                                cx="30"
                                cy="30"
                                r="4"
                                fill={activePipeColor}
                                style={{
                                    filter: `drop-shadow(0 0 6px ${activePipeColor})`,
                                    animation: `flow-packet-${isDownload ? 'down' : 'up'} 1.5s infinite linear`,
                                    animationDelay: `${i * 0.375}s`
                                }}
                            />
                        ))}
                    </g>
                )}
                
                <style>
                    {`
                        @keyframes flow-packet-down {
                            0% { transform: translateY(0); opacity: 0; }
                            10% { opacity: 1; }
                            90% { opacity: 1; }
                            100% { transform: translateY(220px); opacity: 0; }
                        }
                        @keyframes flow-packet-up {
                            0% { transform: translateY(220px); opacity: 0; }
                            10% { opacity: 1; }
                            90% { opacity: 1; }
                            100% { transform: translateY(0); opacity: 0; }
                        }
                    `}
                </style>
            </svg>
        );
    };

    return (
        <Box sx={{
            minHeight: '90vh',
            bgcolor: '#050507',
            color: '#fff',
            py: 6,
            position: 'relative',
            overflow: 'hidden'
        }}>
            <Seo title="High-Speed Internet Diagnostics" description="Test your connection latency, download, and upload speeds with our premium cybernetic telemetry suite." />

            {/* Futuristic Tech Background grids */}
            <Box sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(0, 238, 255, 0.05) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    <Speed sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="800">Network Telemetry Sandbox</Typography>
                        <Typography variant="body2" color="text.secondary">Inspect bandwidth throughput, packet latency, and data flow pipelines in real-time.</Typography>
                    </Box>
                </Box>

                <Grid container spacing={4} alignItems="stretch" justifyContent="center">
                    {/* Left Side: Pipeline Visualization */}
                    <Grid item xs={12} md={2} sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Card sx={{
                            height: '100%',
                            p: 3,
                            background: 'rgba(10, 11, 14, 0.4)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Pipeline
                            </Typography>
                            <Box sx={{ width: '100%', height: '300px' }}>
                                {renderDataPipeline()}
                            </Box>
                        </Card>
                    </Grid>

                    {/* Middle: The Main Radar Gauge */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{
                            p: 4,
                            background: 'rgba(10, 11, 14, 0.4)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '20px',
                            boxShadow: '0 20px 45px -15px rgba(0,0,0,0.6)',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Neon Border Accent when active */}
                            {running && (
                                <Box sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    border: `1px solid ${alpha(activeColor, 0.25)}`,
                                    borderRadius: 'inherit',
                                    pointerEvents: 'none',
                                    boxShadow: `inset 0 0 20px ${alpha(activeColor, 0.08)}`,
                                    transition: 'border-color 0.3s ease'
                                }} />
                            )}

                            <Box sx={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: 300,
                                aspectRatio: '1/1',
                                mx: 'auto',
                                mb: 3
                            }}>
                                {renderRadarConsole()}

                                {/* Digital Readout in Core */}
                                <Box sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 2
                                }}>
                                    {!running && phase !== 'complete' ? (
                                        <Button
                                            onClick={startTest}
                                            variant="contained"
                                            sx={{
                                                width: 110,
                                                height: 110,
                                                borderRadius: '50%',
                                                bgcolor: 'rgba(0, 238, 255, 0.07)',
                                                border: '2px solid #00eeff',
                                                color: '#00eeff',
                                                fontSize: '1.5rem',
                                                fontWeight: 900,
                                                letterSpacing: 1,
                                                boxShadow: '0 0 25px rgba(0, 238, 255, 0.2)',
                                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(0, 238, 255, 0.2)',
                                                    boxShadow: '0 0 35px rgba(0, 238, 255, 0.55)',
                                                    transform: 'scale(1.08)'
                                                }
                                            }}
                                        >
                                            GO
                                        </Button>
                                    ) : (
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h3" sx={{
                                                fontWeight: 900,
                                                fontFamily: 'monospace',
                                                color: '#ffffff',
                                                textShadow: `0 0 20px ${alpha(activeColor, 0.4)}`,
                                                lineHeight: 1
                                            }}>
                                                {activeSpeedSmoothed.toFixed(1)}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: activeColor,
                                                fontWeight: 800,
                                                letterSpacing: 1.5,
                                                textTransform: 'uppercase',
                                                mt: 0.5,
                                                display: 'block'
                                            }}>
                                                Mbps
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>

                            <Stack direction="row" justifyContent="center" spacing={4} sx={{ opacity: 0.8 }}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="caption" color="grey.500" display="block">DIAGNOSTIC</Typography>
                                    <Typography variant="body2" fontWeight="700">
                                        {phase === 'idle' ? 'STANDBY' : phase.toUpperCase()}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="caption" color="grey.500" display="block">NODE</Typography>
                                    <Typography variant="body2" fontWeight="700">M-LAB GLOBAL</Typography>
                                </Box>
                            </Stack>
                        </Card>
                    </Grid>

                    {/* Right Side: Diagnostics metrics */}
                    <Grid item xs={12} md={4}>
                        <Stack spacing={3.5} sx={{ height: '100%', justifyContent: 'space-between' }}>
                            {/* Latency/Ping */}
                            <Paper sx={{
                                p: 3,
                                background: 'rgba(10, 11, 14, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderLeft: '4px solid #ffffff',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <Box>
                                    <Typography variant="caption" color="grey.500" fontWeight="700" sx={{ letterSpacing: 0.5 }}>LATENCY / PING</Typography>
                                    <Typography variant="h4" fontWeight="900" sx={{ mt: 0.5 }}>
                                        {latency !== null ? latency : '--'}
                                        <Typography component="span" variant="subtitle1" sx={{ ml: 0.5, color: 'grey.500' }}>ms</Typography>
                                    </Typography>
                                </Box>
                                <CompassCalibration sx={{ color: 'grey.400', fontSize: 32 }} />
                            </Paper>

                            {/* Download Speed */}
                            <Paper sx={{
                                p: 3,
                                background: 'rgba(10, 11, 14, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderLeft: '4px solid #00eeff',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: phase === 'download' ? '0 0 20px rgba(0, 238, 255, 0.08)' : 'none',
                                transition: 'all 0.3s'
                            }}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#00eeff', fontWeight: 700, letterSpacing: 0.5 }}>DOWNLOAD RATE</Typography>
                                    <Typography variant="h4" fontWeight="900" color="#00eeff" sx={{ mt: 0.5 }}>
                                        {smoothedDownload > 0 ? smoothedDownload.toFixed(1) : '--'}
                                        <Typography component="span" variant="subtitle1" sx={{ ml: 0.5, color: 'rgba(0, 238, 255, 0.6)' }}>Mbps</Typography>
                                    </Typography>
                                </Box>
                                <Speed sx={{ color: '#00eeff', fontSize: 32 }} />
                            </Paper>

                            {/* Upload Speed */}
                            <Paper sx={{
                                p: 3,
                                background: 'rgba(10, 11, 14, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderLeft: '4px solid #bd00ff',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: phase === 'upload' ? '0 0 20px rgba(189, 0, 255, 0.08)' : 'none',
                                transition: 'all 0.3s'
                            }}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#bd00ff', fontWeight: 700, letterSpacing: 0.5 }}>UPLOAD RATE</Typography>
                                    <Typography variant="h4" fontWeight="900" color="#bd00ff" sx={{ mt: 0.5 }}>
                                        {smoothedUpload > 0 ? smoothedUpload.toFixed(1) : '--'}
                                        <Typography component="span" variant="subtitle1" sx={{ ml: 0.5, color: 'rgba(189, 0, 255, 0.6)' }}>Mbps</Typography>
                                    </Typography>
                                </Box>
                                <NetworkCheck sx={{ color: '#bd00ff', fontSize: 32 }} />
                            </Paper>

                            {/* Retest Trigger */}
                            {phase === 'complete' && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={startTest}
                                    startIcon={<Refresh />}
                                    sx={{
                                        py: 2,
                                        borderRadius: '12px',
                                        borderColor: 'rgba(255,255,255,0.15)',
                                        color: '#fff',
                                        fontWeight: 700,
                                        '&:hover': {
                                            borderColor: '#fff',
                                            bgcolor: 'rgba(255,255,255,0.02)'
                                        }
                                    }}
                                >
                                    Restart Diagnostics
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                </Grid>

                {/* Real-time throughput Area Chart */}
                <Card sx={{
                    mt: 5,
                    p: 3,
                    background: 'rgba(10, 11, 14, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    height: 200
                }}>
                    <Typography variant="caption" color="grey.500" fontWeight="700" sx={{ mb: 2, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Live Throughput Timeline (Mbps)
                    </Typography>
                    <Box sx={{ width: '100%', height: 130 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dataPoints}>
                                <defs>
                                    <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={activeColor} stopOpacity={0.35} />
                                        <stop offset="95%" stopColor={activeColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis hide dataKey="time" />
                                <YAxis hide domain={[0, 'auto']} />
                                <Area
                                    type="monotone"
                                    dataKey="speed"
                                    stroke={activeColor}
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#speedGradient)"
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </Card>

                {error && <Alert severity="error" variant="filled" sx={{ mt: 4, borderRadius: '12px' }}>{error}</Alert>}
            </Container>
        </Box>
    );
};

export default SpeedTest;
