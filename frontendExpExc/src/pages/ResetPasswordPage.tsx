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
    IconButton,
} from '@mui/material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Visibility, VisibilityOff, LockReset, CheckCircle } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import AuthShell from '../components/auth/AuthShell';
import Seo from '../components/seo/Seo';

/** Lands here from the link in the password-reset email
 * (`${FRONTEND_URL}/reset-password?uid=...&token=...`, built server-side in
 * apps/users/views.py::_send_password_reset_email) - the uid/token pair is
 * only ever read from the URL, never typed in, so a missing/malformed pair
 * is treated the same as a link the backend will reject: no separate
 * "malformed URL" state needed, just let the POST fail and show its message. */
const ResetPasswordPage: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const uid = searchParams.get('uid') || '';
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<string[]>([]);
    const [done, setDone] = useState(false);

    const missingLink = !uid || !token;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors([]);

        if (!password || !confirmPassword) {
            setError('Fill in both password fields');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await apiClient.post(endpoints.auth.passwordResetConfirm, {
                uid,
                token,
                new_password: password,
            });
            setDone(true);
        } catch (err: any) {
            console.error('Password reset confirm error:', err);
            const data = err.response?.data;
            // The backend returns {"new_password": ["too short", ...]} for
            // validation failures and {"detail": "..."} for an invalid/
            // expired link - both are worth showing verbatim rather than a
            // generic "something went wrong".
            if (data?.new_password) {
                setFieldErrors(Array.isArray(data.new_password) ? data.new_password : [String(data.new_password)]);
            } else {
                setError(data?.detail || 'Could not reset your password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Seo title="Reset Password" description="Set a new password for your ExpectException account." noIndex />
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
                            {done ? <CheckCircle sx={{ color: primary, fontSize: 28 }} /> : <LockReset sx={{ color: primary, fontSize: 28 }} />}
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
                            {done ? 'Password Reset' : 'Set a New Password'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {done ? 'You can now sign in with your new password' : 'Choose something you have not used before'}
                        </Typography>
                    </Box>

                    <Card sx={{
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(primary, 0.12)}`,
                        boxShadow: `0 0 40px ${alpha(primary, 0.06)}`,
                    }}>
                        <CardContent sx={{ p: 4 }}>
                            {done ? (
                                <Button
                                    onClick={() => navigate('/login')}
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    sx={{ py: 1.5 }}
                                >
                                    Go to Sign In
                                </Button>
                            ) : missingLink ? (
                                <>
                                    <Alert severity="error" sx={{ mb: 3 }}>
                                        This reset link is missing or incomplete. Request a new one below.
                                    </Alert>
                                    <Button
                                        component={RouterLink}
                                        to="/forgot-password"
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        sx={{ py: 1.5 }}
                                    >
                                        Request a New Link
                                    </Button>
                                </>
                            ) : (
                                <Box component="form" onSubmit={handleSubmit}>
                                    {error && (
                                        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                                            {error}
                                            {error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid') ? (
                                                <Box sx={{ mt: 1 }}>
                                                    <Link component={RouterLink} to="/forgot-password">Request a new link</Link>
                                                </Box>
                                            ) : null}
                                        </Alert>
                                    )}
                                    {fieldErrors.length > 0 && (
                                        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFieldErrors([])}>
                                            {fieldErrors.map((msg, i) => <Box key={i}>{msg}</Box>)}
                                        </Alert>
                                    )}
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        label="New Password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        autoFocus
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                        size="small"
                                                        tabIndex={-1}
                                                        sx={{ color: 'text.secondary' }}
                                                    >
                                                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ mb: 2 }}
                                    />
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        label="Confirm New Password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={loading}
                                        error={confirmPassword.length > 0 && password !== confirmPassword}
                                        helperText={confirmPassword.length > 0 && password !== confirmPassword ? 'Passwords do not match' : ' '}
                                        sx={{ mb: 1 }}
                                    />
                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        disabled={loading}
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockReset />}
                                        sx={{ py: 1.5 }}
                                    >
                                        {loading ? 'Resetting…' : 'Reset Password'}
                                    </Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </AuthShell>
        </>
    );
};

export default ResetPasswordPage;
