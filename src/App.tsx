// ... (previous imports)
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { BrowserRouter as Router } from 'react-router-dom';
import { theme } from './theme/theme';
import Layout from './components/Layout/Layout';
import AnimatedRoutes from './components/layout/AnimatedRoutes';
import AnimatedBackground from './components/layout/AnimatedBackground';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import NotificationPrompt from './components/NotificationPrompt';
import PWAInstallPrompt from './components/pwa/PWAInstallPrompt';
import GATracker from './components/analytics/GATracker';

import { HelmetProvider } from 'react-helmet-async';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function App() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            console.log("Captured beforeinstallprompt event");
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setDeferredPrompt(null);
        // Optional: Persist dismissal to avoid showing again immediately in this session
        // but for now, we just close it until the next event fire (usually reload)
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AnimatedBackground />
            <HelmetProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <Router>
                            <GATracker />
                            <Layout>
                                <AnimatedRoutes />
                            </Layout>
                            <PWAInstallPrompt
                                deferredPrompt={deferredPrompt}
                                onInstall={handleInstall}
                                onDismiss={handleDismiss}
                            />
                            {/* NotificationPrompt can still exist for non-PWA flows, or be redundant. Use logic inside PWA prompt preferred for onboarding. */}
                            {/* <NotificationPrompt /> */}
                        </Router>
                    </NotificationProvider>
                </AuthProvider>
            </HelmetProvider>
        </ThemeProvider>
    );
}

export default App;