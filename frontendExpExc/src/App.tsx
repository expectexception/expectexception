import React, { useState, useEffect } from 'react';
import { CssBaseline } from '@mui/material';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { CustomThemeContextProvider } from './context/CustomThemeContext';
import Layout from './components/Layout/Layout';
import AnimatedRoutes from './components/layout/AnimatedRoutes';
import AnimatedBackground from './components/layout/AnimatedBackground';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import NotificationPrompt from './components/NotificationPrompt';
import GATracker from './components/analytics/GATracker';

import { HelmetProvider } from 'react-helmet-async';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Wrapper component to access useLocation
function AppContent({ deferredPrompt, handleInstall, handleDismiss }: any) {
    const location = useLocation();
    const isChatPage = location.pathname.startsWith('/chat');

    return (
        <>
            {/* Hide AnimatedBackground on chat page - it has its own StarBackground */}
            {!isChatPage && <AnimatedBackground />}
            <GATracker />
            <Layout>
                <AnimatedRoutes />
            </Layout>
            <NotificationPrompt />
        </>
    );
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
        <CustomThemeContextProvider>
            <CssBaseline />
            <HelmetProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <Router>
                            <AppContent
                                deferredPrompt={deferredPrompt}
                                handleInstall={handleInstall}
                                handleDismiss={handleDismiss}
                            />
                        </Router>
                    </NotificationProvider>
                </AuthProvider>
            </HelmetProvider>
        </CustomThemeContextProvider>
    );
}

export default App;