import React, { useState, useEffect } from 'react';
import './InstallPWA.css';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detect iOS/Safari
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        setIsIOS(isIOSDevice || isSafari);

        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if dismissed in current session only (not persisted across reloads)
        const dismissed = sessionStorage.getItem('pwa-install-dismissed');
        if (dismissed === 'true') {
            return;
        }

        // For iOS, show prompt after some delay if not installed
        if (isIOSDevice || isSafari) {
            const timer = setTimeout(() => {
                setShowInstallPrompt(true);
            }, 3000); // Show after 3 seconds
            return () => clearTimeout(timer);
        }

        // Listen for the beforeinstallprompt event (Chrome/Android)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowInstallPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for successful installation
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
            sessionStorage.removeItem('pwa-install-dismissed');
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user's response
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('[PWA] User accepted the install prompt');
        } else {
            console.log('[PWA] User dismissed the install prompt');
        }

        // Clear the prompt
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
        sessionStorage.setItem('pwa-install-dismissed', 'true');
    };

    // Don't show if already installed
    if (isInstalled || !showInstallPrompt) {
        return null;
    }

    // iOS-specific prompt
    if (isIOS) {
        return (
            <div className="install-pwa-banner ios">
                <div className="install-pwa-content">
                    <div className="install-pwa-icon">
                        <img src="/logo192.png" alt="ExpectException" />
                    </div>
                    <div className="install-pwa-text">
                        <h3>Install ExpectException</h3>
                        <p>Tap <svg className="ios-share-icon" width="14" height="18" viewBox="0 0 16 20" fill="currentColor">
                            <path d="M8 0L6.59 1.41L11.17 6H0V8H11.17L6.59 12.59L8 14L15 7L8 0Z" transform="rotate(-90 7.5 7)" />
                        </svg> then "Add to Home Screen"</p>
                    </div>
                    <div className="install-pwa-actions">
                        <button
                            className="install-pwa-btn dismiss"
                            onClick={handleDismiss}
                            aria-label="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Chrome/Android prompt
    return (
        <div className="install-pwa-banner">
            <div className="install-pwa-content">
                <div className="install-pwa-icon">
                    <img src="/logo192.png" alt="ExpectException" />
                </div>
                <div className="install-pwa-text">
                    <h3>Install ExpectException</h3>
                    <p>Get quick access to all tools with one click!</p>
                </div>
                <div className="install-pwa-actions">
                    <button
                        className="install-pwa-btn install"
                        onClick={handleInstallClick}
                        aria-label="Install app"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="7 10 12 15 17 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="15" x2="12" y2="3" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Install
                    </button>
                    <button
                        className="install-pwa-btn dismiss"
                        onClick={handleDismiss}
                        aria-label="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPWA;
