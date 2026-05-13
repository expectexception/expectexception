import React, { useEffect, useRef, useCallback } from 'react';
import { Box, CircularProgress, Typography, Divider } from '@mui/material';

// Google's GSI types
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (element: HTMLElement, config: any) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

interface GoogleSignInButtonProps {
    onSuccess: (credential: string) => void;
    onError?: (error: string) => void;
    text?: 'signin_with' | 'signup_with' | 'continue_with';
    context?: 'signin' | 'signup';
}

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
    onSuccess,
    onError,
    text = 'signin_with',
    context = 'signin',
}) => {
    const buttonRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = React.useState(true);
    const [scriptError, setScriptError] = React.useState(false);

    const handleCredentialResponse = useCallback((response: any) => {
        if (response?.credential) {
            onSuccess(response.credential);
        } else {
            onError?.('Google sign-in failed — no credential received.');
        }
    }, [onSuccess, onError]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            setScriptError(true);
            setLoading(false);
            return;
        }

        // Check if script already loaded
        if (window.google?.accounts?.id) {
            initializeGoogle();
            return;
        }

        // Load the GSI script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            initializeGoogle();
        };
        script.onerror = () => {
            setScriptError(true);
            setLoading(false);
        };
        document.head.appendChild(script);

        return () => {
            // Cleanup: don't remove script since other components might use it
        };
    }, []);

    const initializeGoogle = () => {
        if (!window.google?.accounts?.id) {
            setScriptError(true);
            setLoading(false);
            return;
        }

        try {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
            });

            if (buttonRef.current) {
                window.google.accounts.id.renderButton(buttonRef.current, {
                    theme: 'filled_black',
                    size: 'large',
                    width: buttonRef.current.offsetWidth || 400,
                    text: text,
                    shape: 'rectangular',
                    logo_alignment: 'left',
                });
            }

            setLoading(false);
        } catch (err) {
            console.error('Failed to initialize Google Sign-In:', err);
            setScriptError(true);
            setLoading(false);
        }
    };

    if (scriptError && !GOOGLE_CLIENT_ID) {
        // Don't render anything if no client ID is configured
        return null;
    }

    if (scriptError) {
        return (
            <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    Google Sign-In unavailable
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Divider sx={{ my: 2.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                    OR
                </Typography>
            </Divider>

            <Box sx={{ position: 'relative', width: '100%', minHeight: 44 }}>
                {loading && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 44,
                    }}>
                        <CircularProgress size={24} />
                    </Box>
                )}
                <Box
                    ref={buttonRef}
                    sx={{
                        width: '100%',
                        display: loading ? 'none' : 'flex',
                        justifyContent: 'center',
                        '& > div': {
                            width: '100% !important',
                        },
                        '& iframe': {
                            width: '100% !important',
                        },
                    }}
                />
            </Box>
        </Box>
    );
};

export default GoogleSignInButton;
