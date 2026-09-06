import React, { useEffect, useRef, useCallback, useState } from 'react';
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

// Google's button is a fixed-pixel-width iframe decided at the moment
// renderButton() runs - it is not something CSS can meaningfully rescale
// afterwards. Stretching the iframe element to 100% via CSS just crops or
// pads whatever Google drew at its original width, which is exactly what
// clipped the label text on narrow screens. The only correct fix is to
// track the container's real width with a ResizeObserver and re-render the
// button at that width whenever it changes, capped at a sane maximum so it
// doesn't look oversized on a wide desktop layout.
const MAX_BUTTON_WIDTH = 400;
const MIN_BUTTON_WIDTH = 200; // Google silently ignores anything smaller than this

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
    onSuccess,
    onError,
    text = 'signin_with',
    context = 'signin',
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);
    const scriptLoadedRef = useRef(false);
    const [loading, setLoading] = React.useState(true);
    const [scriptError, setScriptError] = React.useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    const handleCredentialResponse = useCallback((response: any) => {
        if (response?.credential) {
            onSuccess(response.credential);
        } else {
            onError?.('Google sign-in failed: no credential received.');
        }
    }, [onSuccess, onError]);

    const renderButtonAtWidth = useCallback((width: number) => {
        if (!window.google?.accounts?.id || !buttonRef.current) return;
        const clampedWidth = Math.max(MIN_BUTTON_WIDTH, Math.min(MAX_BUTTON_WIDTH, Math.round(width)));
        // renderButton() appends into the element rather than replacing its
        // content, so a re-render at a new width would otherwise stack a
        // second button underneath the first.
        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: clampedWidth,
            text,
            shape: 'rectangular',
            logo_alignment: 'left',
        });
    }, [text]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            setScriptError(true);
            setLoading(false);
            return;
        }

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
                scriptLoadedRef.current = true;
                setLoading(false);
            } catch (err) {
                console.error('Failed to initialize Google Sign-In:', err);
                setScriptError(true);
                setLoading(false);
            }
        };

        if (window.google?.accounts?.id) {
            initializeGoogle();
        } else {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initializeGoogle;
            script.onerror = () => {
                setScriptError(true);
                setLoading(false);
            };
            document.head.appendChild(script);
        }
        // Mount-only: handleCredentialResponse is recreated whenever onSuccess/
        // onError change identity, and re-running this effect would re-append
        // the GSI script tag on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Track the container's real rendered width and re-render the button
    // whenever it changes meaningfully (viewport resize, layout shift, or
    // the initial mount measurement, which is 0 before the first layout pass).
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const width = Math.floor(entries[0].contentRect.width);
            setContainerWidth((prev) => (Math.abs(prev - width) > 2 ? width : prev));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!loading && !scriptError && containerWidth > 0) {
            renderButtonAtWidth(containerWidth);
        }
    }, [loading, scriptError, containerWidth, renderButtonAtWidth]);

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

            <Box ref={containerRef} sx={{ position: 'relative', width: '100%', minHeight: 44 }}>
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
                    }}
                />
            </Box>
        </Box>
    );
};

export default GoogleSignInButton;
