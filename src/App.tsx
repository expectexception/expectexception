import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { BrowserRouter as Router } from 'react-router-dom';
import { theme } from './theme/theme';
import Layout from './components/Layout/Layout';
import AnimatedRoutes from './components/layout/AnimatedRoutes';
import AnimatedBackground from './components/layout/AnimatedBackground';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import InstallPWA from './components/InstallPWA';
import NotificationPrompt from './components/NotificationPrompt';

import { HelmetProvider } from 'react-helmet-async';

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AnimatedBackground />
            <HelmetProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <Router>
                            <Layout>
                                <AnimatedRoutes />
                            </Layout>
                            <InstallPWA />
                            <NotificationPrompt />
                        </Router>
                    </NotificationProvider>
                </AuthProvider>
            </HelmetProvider>
        </ThemeProvider>
    );
}


export default App;