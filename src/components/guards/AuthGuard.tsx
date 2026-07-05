import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Box,
    CircularProgress,
    Typography,
    Paper,
    Button,
} from '@mui/material';
import { Lock, Login } from '@mui/icons-material';
import GoogleSignInButton from '../auth/GoogleSignInButton';

interface AuthGuardProps {
    children: React.ReactNode;
    toolName?: string;
}

/**
 * Route guard that requires authentication to access a tool.
 * Shows a premium login modal with Google Sign-In when user is not authenticated.
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children, toolName }) => {
    const { isAuthenticated, isInitializing, user, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    // Still loading auth state — see AdminGuard for why isInitializing is
    // checked ahead of isAuthenticated (which defaults to false pre-check).
    if (isInitializing || (isAuthenticated && !user)) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                }}
            >
                <CircularProgress sx={{ color: '#6366f1' }} />
                <Typography sx={{ mt: 2, color: 'grey.500' }}>
                    Verifying access...
                </Typography>
            </Box>
        );
    }

    // Not authenticated — show gate
    if (!isAuthenticated) {
        const handleGoogleSuccess = async (credential: string) => {
            setLoading(true);
            setError(null);
            try {
                await loginWithGoogle(credential);
            } catch (err: any) {
                console.error('Google login failed:', err);
                setError(err.response?.data?.detail || 'Google sign-in failed. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '70vh',
                    p: 3,
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 4, md: 6 },
                        textAlign: 'center',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4,
                        maxWidth: 440,
                        width: '100%',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <Box
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            bgcolor: 'rgba(99, 102, 241, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 3,
                        }}
                    >
                        <Lock sx={{ fontSize: 36, color: '#6366f1' }} />
                    </Box>

                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                        Sign In Required
                    </Typography>
                    <Typography sx={{ color: 'grey.400', mb: 4, lineHeight: 1.6 }}>
                        {toolName
                            ? `"${toolName}" requires you to be signed in. Sign in with Google for instant access.`
                            : 'This tool requires you to be signed in. Sign in with Google for instant access.'}
                    </Typography>

                    {error && (
                        <Typography sx={{ color: '#ef4444', mb: 2, fontSize: '0.875rem' }}>
                            {error}
                        </Typography>
                    )}

                    {loading ? (
                        <CircularProgress size={32} sx={{ color: '#6366f1', mb: 2 }} />
                    ) : (
                        <GoogleSignInButton
                            onSuccess={handleGoogleSuccess}
                            onError={setError}
                            text="signin_with"
                            context="signin"
                        />
                    )}

                    <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Login />}
                            onClick={() => navigate('/login')}
                            sx={{
                                borderColor: 'rgba(255,255,255,0.2)',
                                color: 'grey.300',
                                '&:hover': {
                                    borderColor: 'rgba(255,255,255,0.4)',
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                },
                            }}
                        >
                            Email Login
                        </Button>
                        <Button
                            variant="text"
                            size="small"
                            onClick={() => navigate('/register')}
                            sx={{ color: 'grey.400' }}
                        >
                            Create Account
                        </Button>
                    </Box>
                </Paper>
            </Box>
        );
    }

    // Authenticated — render children
    return <>{children}</>;
};

export default AuthGuard;
