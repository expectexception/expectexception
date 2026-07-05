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
    Divider,
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Visibility, VisibilityOff, Login, Person } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import AuthShell from '../components/auth/AuthShell';
import Seo from '../components/seo/Seo';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    // Set when RegisterPage navigates here after a successful sign-up
    // (`navigate('/login', { state: { message: '...' } })`) - previously
    // silently dropped since this page never read `location.state`, so a
    // brand-new user got no on-screen confirmation their account was created.
    const [successMessage, setSuccessMessage] = useState<string | null>(
        (location.state as { message?: string } | null)?.message || null
    );

    const { login, loginWithGoogle } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.post(endpoints.auth.login, formData);
            const { access, refresh } = response.data;

            login(access, refresh);

            // Redirect to dashboard or home
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(
                err.response?.data?.detail ||
                'Login failed. Please check your credentials.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credential: string) => {
        setGoogleLoading(true);
        setError(null);
        try {
            await loginWithGoogle(credential);
            navigate('/');
        } catch (err: any) {
            console.error('Google login error:', err);
            setError(
                err.response?.data?.detail ||
                'Google sign-in failed. Please try again.'
            );
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <>
            <Seo title="Sign In" description="Sign in to your ExpectException account to access personalized features, bookmarks, and your tool history." noIndex />
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
                            <Login sx={{ color: primary, fontSize: 28 }} />
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
                            Welcome Back
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Sign in to continue to ExpectException
                        </Typography>
                    </Box>

                    <Card sx={{
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(primary, 0.12)}`,
                        boxShadow: `0 0 40px ${alpha(primary, 0.06)}`,
                    }}>
                        <CardContent sx={{ p: 4 }}>
                            {successMessage && (
                                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
                                    {successMessage}
                                </Alert>
                            )}
                            {error && (
                                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}

                            {/* Google Sign-In */}
                            {googleLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <CircularProgress size={32} />
                                </Box>
                            ) : (
                                <GoogleSignInButton
                                    onSuccess={handleGoogleSuccess}
                                    onError={(err) => setError(err)}
                                    text="signin_with"
                                    context="signin"
                                />
                            )}
                            <Divider sx={{ my: 2.5, fontSize: '0.75rem', color: 'text.disabled' }}>or continue with email</Divider>

                            <Box component="form" onSubmit={handleSubmit}>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="email"
                                    label="Email Address"
                                    name="email"
                                    autoComplete="email"
                                    autoFocus
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={loading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Person sx={{ color: alpha(primary, 0.6) }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    autoComplete="current-password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                                    sx={{ mb: 3 }}
                                />

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Login />}
                                    sx={{ py: 1.5, mb: 3 }}
                                >
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </Button>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Link component={RouterLink} to="/forgot-password" variant="body2" color="text.secondary">
                                        Forgot password?
                                    </Link>
                                    <Link component={RouterLink} to="/register" variant="body2" sx={{ fontWeight: 600 }}>
                                        Create account
                                    </Link>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </motion.div>
            </AuthShell>
        </>
    );
};

export default LoginPage;
