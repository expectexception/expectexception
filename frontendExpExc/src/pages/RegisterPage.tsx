import React, { useState } from 'react';
import {
    Container,
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
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Visibility, VisibilityOff, AppRegistration, Person, Email } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import Seo from '../components/seo/Seo';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    const { loginWithGoogle } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields (Email and Passwords are required)');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await apiClient.post(endpoints.auth.register, {
                email: formData.email,
                password: formData.password,
                password2: formData.confirmPassword,
                first_name: formData.first_name,
                last_name: formData.last_name,
            });

            navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(
                err.response?.data ? JSON.stringify(err.response.data) : 'Registration failed. Please try again.'
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
            console.error('Google sign-up error:', err);
            setError(
                err.response?.data?.detail ||
                'Google sign-up failed. Please try again.'
            );
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="sm">
            <Seo title="Create Account" description="Create a free ExpectException account to unlock personalized features, save bookmarks, and track your tool usage history." noIndex />
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minHeight: '80vh',
                    justifyContent: 'center',
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ width: '100%' }}
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
                            <AppRegistration sx={{ color: primary, fontSize: 28 }} />
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
                            Join Us
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Create your account to access all features
                        </Typography>
                    </Box>

                    <Card sx={{
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(primary, 0.12)}`,
                        boxShadow: `0 0 40px ${alpha(primary, 0.06)}`,
                    }}>
                        <CardContent sx={{ p: 4 }}>
                            {error && (
                                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}

                            {/* Google Sign-Up (same endpoint — auto-creates account) */}
                            {googleLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <CircularProgress size={32} />
                                </Box>
                            ) : (
                                <GoogleSignInButton
                                    onSuccess={handleGoogleSuccess}
                                    onError={(err) => setError(err)}
                                    text="signup_with"
                                    context="signup"
                                />
                            )}
                            <Divider sx={{ my: 2.5, fontSize: '0.75rem', color: 'text.disabled' }}>or register with email</Divider>

                            <Box component="form" onSubmit={handleSubmit}>
                                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                    <TextField
                                        required
                                        fullWidth
                                        id="first_name"
                                        label="First Name"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        disabled={loading}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Person color="action" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    <TextField
                                        fullWidth
                                        id="last_name"
                                        label="Last Name"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        disabled={loading}
                                    />
                                </Box>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="email"
                                    label="Email Address"
                                    name="email"
                                    autoComplete="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={loading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Email color="action" />
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
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    disabled={loading}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
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
                                    name="confirmPassword"
                                    label="Confirm Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    disabled={loading}
                                    sx={{ mb: 3 }}
                                />

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AppRegistration />}
                                    sx={{ py: 1.5, mb: 3 }}
                                >
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Button>

                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Already have an account?{' '}
                                        <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
                                            Sign in
                                        </Link>
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </motion.div>
            </Box>
        </Container>
    );
};

export default RegisterPage;
