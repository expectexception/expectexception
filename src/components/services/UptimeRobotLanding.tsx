import React from 'react';
import { Container, Box, Typography, Button, Grid, Card, Stack, Chip, useTheme, alpha } from '@mui/material';
import { Login, CheckCircle } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    PingRadarSvg,
    PortPlugSvg,
    HeartbeatPulseSvg,
    KeywordScanSvg,
    LinkToolSvg,
    PadlockToolSvg,
} from '../layout/AnimatedSvgs';

const TYPE_SHOWCASE = [
    { icon: <LinkToolSvg />, label: 'HTTP(S)', desc: 'Alert when a status code falls outside 2xx/3xx' },
    { icon: <KeywordScanSvg />, label: 'Keyword Match', desc: 'Confirm a specific string still appears on the page' },
    { icon: <PingRadarSvg />, label: 'Ping', desc: 'A lightweight TCP connect check for host reachability' },
    { icon: <PortPlugSvg />, label: 'Port Check', desc: 'Verify a specific service port is open and accepting connections' },
    { icon: <PadlockToolSvg />, label: 'SSL Certificate', desc: 'Get warned before a certificate expires, not after' },
    { icon: <HeartbeatPulseSvg />, label: 'Heartbeat', desc: 'A dead-man\'s-switch for your own cron jobs and scripts' },
];

/** Logged-out marketing view for /services/uptime-robot. Every stat/number
 * here is clearly labeled as an example — this is the honest positioning
 * copy the persona-section pattern (HirePage "Who This Is For") established
 * earlier, not fabricated live data or fake testimonials. */
const UptimeRobotLanding: React.FC = () => {
    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Chip
                    label="Sign in required — your monitors are private to you"
                    sx={{ bgcolor: alpha(primaryColor, 0.1), color: primaryColor, fontWeight: 700, mb: 3 }}
                />
                <Typography
                    variant="h2"
                    fontWeight={900}
                    gutterBottom
                    sx={{
                        fontSize: { xs: '2.2rem', sm: '3rem', md: '3.6rem' },
                        letterSpacing: '-0.02em',
                        background: `linear-gradient(135deg, #ffffff 30%, ${primaryColor} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Uptime Robot Command Center
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680, mx: 'auto', fontWeight: 400, lineHeight: 1.6, mb: 5 }}>
                    Recurring uptime, keyword, port, SSL, and heartbeat monitors — checked on the interval you set,
                    running on our own server, private to your account. Free up to 10 monitors.
                </Typography>
                <Button
                    component={Link}
                    to="/login"
                    variant="contained"
                    size="large"
                    startIcon={<Login />}
                    sx={{
                        px: 5, py: 1.75, borderRadius: '30px', fontWeight: 800,
                        bgcolor: primaryColor, color: '#000000',
                        '&:hover': { bgcolor: alpha(primaryColor, 0.85), boxShadow: `0 8px 25px ${alpha(primaryColor, 0.4)}` },
                    }}
                >
                    Sign In to Start Monitoring
                </Button>
            </Box>

            {/* Example dashboard preview — clearly labeled sample data */}
            <Box sx={{ mb: 8 }}>
                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2, letterSpacing: '0.1em' }}>
                    Example dashboard — illustrative numbers, not live data
                </Typography>
                <Grid container spacing={3}>
                    {[
                        { label: 'Workspace Health', value: '99.4%' },
                        { label: 'Active & Up', value: '7 / 8' },
                        { label: 'Outages (30d)', value: '2' },
                        { label: 'Avg. Response', value: '184ms' },
                    ].map((stat) => (
                        <Grid item xs={6} sm={3} key={stat.label}>
                            <Card sx={{ p: 3, textAlign: 'center', background: 'rgba(13, 14, 18, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Typography variant="h4" fontWeight={900} color="primary.main">{stat.value}</Typography>
                                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Monitor type showcase */}
            <Box sx={{ mb: 8 }}>
                <Typography variant="h4" fontWeight={800} sx={{ textAlign: 'center', mb: 5 }}>
                    Six ways to know something's wrong before your users do
                </Typography>
                <Grid container spacing={3}>
                    {TYPE_SHOWCASE.map((item, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={item.label}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.06 }}
                            >
                                <Card sx={{ p: 3, height: '100%', background: 'rgba(13, 14, 18, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Box sx={{ color: 'primary.main', mb: 2, transform: 'scale(0.8)', transformOrigin: 'left center' }}>{item.icon}</Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>{item.label}</Typography>
                                    <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Why sign in */}
            <Card sx={{ p: { xs: 4, md: 6 }, background: `linear-gradient(135deg, ${alpha(primaryColor, 0.06)} 0%, transparent 100%)`, border: '1px solid rgba(255,255,255,0.05)' }}>
                <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={7}>
                        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Why does this need an account?</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                            Earlier versions of this tool let anyone create recurring checks against any target with
                            no ownership — which meant no privacy, no abuse limits, and no way to tell whose monitor
                            was whose. An account means your monitors are yours alone, checked by our own server on
                            your schedule, with a free-tier cap so the service stays reliable for everyone.
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Stack spacing={1.5}>
                            {['Private to your account', 'Runs on our own server, always', 'Up to 10 monitors free', 'Real check history, not simulated'].map((line) => (
                                <Stack direction="row" spacing={1.5} alignItems="center" key={line}>
                                    <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                                    <Typography variant="body2">{line}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>
            </Card>
        </Container>
    );
};

export default UptimeRobotLanding;
