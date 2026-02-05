import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { Lock } from '@mui/icons-material';

interface AdminGuardProps {
    children: React.ReactNode;
}

/**
 * Route guard that only allows access to users with is_staff: true.
 * Shows loading state while checking auth, redirects to home if not authorized.
 */
const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();

    // Still loading auth state
    if (isAuthenticated && !user) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    bgcolor: '#0a0a0f',
                }}
            >
                <CircularProgress sx={{ color: '#6366f1' }} />
                <Typography sx={{ mt: 2, color: 'grey.500' }}>
                    Verifying access...
                </Typography>
            </Box>
        );
    }

    // Not authenticated at all
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Authenticated but not admin
    if (user && !user.is_staff) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    bgcolor: '#0a0a0f',
                    p: 3,
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4,
                        maxWidth: 400,
                    }}
                >
                    <Lock sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                        Access Denied
                    </Typography>
                    <Typography sx={{ color: 'grey.500', mb: 3 }}>
                        You need administrator privileges to access this page.
                    </Typography>
                    <Typography
                        component="a"
                        href="/"
                        sx={{
                            color: '#6366f1',
                            textDecoration: 'none',
                            fontWeight: 600,
                            '&:hover': { textDecoration: 'underline' },
                        }}
                    >
                        Return to Home
                    </Typography>
                </Paper>
            </Box>
        );
    }

    // User is admin - render children
    return <>{children}</>;
};

export default AdminGuard;
