import React, { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Alert,
    Link,
    CircularProgress,
    InputAdornment,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Email, MarkEmailRead } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import AuthShell from '../components/auth/AuthShell';
import Seo from '../components/seo/Seo';

/** Requests a password-reset email. The backend (PasswordResetRequestView)
 * deliberately returns the same generic message whether or not the address
 * has an account - a distinguishable response here would turn this page
 * into an account-existence oracle - so this form only ever has one success
 * state, never a per-address error. */
const ForgotPasswordPage: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Enter your email address');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await apiClient.post(endpoints.auth.passwordReset, { email: email.trim().toLowerCase() });
            setSent(true);
        } catch (err: any) {
            // The endpoint itself never returns a per-address error, but the
            // request can still fail outright (network, rate limit, etc.).
            console.error('Password reset request error:', err);
            setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Seo title="Forgot Password" description="Reset your ExpectException account password." noIndex />
            <AuthShell>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ width: '100%', maxWidth: 440 }}
                >
                    <Box sx={{ mb: 4, textAlign: 'center' }}>
                        <Box sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, ${alpha(primary, 0.2)}, transparent)`,
                            border: `1.5px solid ${alpha(primary, 0.4)}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2,
                        }}>
                            {sent ? <MarkEmailRead sx={{ color: primary, fontSize: 28 }} /> : <Email sx={{ color: primary, fontSize: 28 }} />}
                        </Box>
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 1,
                            }}
                        >
                            Forgot Password?
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {sent ? "Check your inbox for a reset link" : "We'll email you a link to reset it"}
                        </Typography>
                    </Box>

                    <Card sx={{
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(primary, 0.12)}`,
                        boxShadow: `0 0 40px ${alpha(primary, 0.06)}`,
                    }}>
                        <CardContent sx={{ p: 4 }}>
                            {sent ? (
                                <>
                                    <Alert severity="success" sx={{ mb: 3 }}>
                                        If an account exists for <strong>{email.trim()}</strong>, a reset link has been sent.
                                        It may take a few minutes to arrive - check spam too.
                                    </Alert>
                                    <Button
                                        component={RouterLink}
                                        to="/login"
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        sx={{ py: 1.5 }}
                                    >
                                        Back to Sign In
                                    </Button>
                                </>
                            ) : (
                                <Box component="form" onSubmit={handleSubmit}>
                                    {error && (
                                        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                                            {error}
                                        </Alert>
                                    )}
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        id="email"
                                        label="Email Address"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        autoFocus
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Email sx={{ color: alpha(primary, 0.6) }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ mb: 3 }}
                                    />
                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        disabled={loading}
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Email />}
                                        sx={{ py: 1.5, mb: 3 }}
                                    >
                                        {loading ? 'Sending…' : 'Send Reset Link'}
                                    </Button>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Link component={RouterLink} to="/login" variant="body2" color="text.secondary">
                                            Back to Sign In
                                        </Link>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </AuthShell>
        </>
    );
};

export default ForgotPasswordPage;
