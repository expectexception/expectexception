import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiClient, { AUTH_EXPIRED_EVENT } from '../api/config';
import { endpoints } from '../api/endpoints';

import { User } from '../types';

interface AuthContextType {
    isAuthenticated: boolean;
    isInitializing: boolean;
    isAdmin: boolean;
    user: User | null;
    token: string | null;
    login: (access: string, refresh: string) => Promise<void>;
    loginWithGoogle: (credential: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // Starts true so route guards can tell "we haven't checked localStorage
    // yet" apart from "we checked and there's no token" — without this,
    // isAuthenticated's default of false looks identical to a confirmed
    // logged-out state during the one tick before checkAuth()'s effect
    // resolves, and a guard checking it immediately (e.g. AdminGuard) redirects
    // an actually-logged-in user to /login on every hard refresh, which then
    // never self-corrects since the redirect already navigated away.
    const [isInitializing, setIsInitializing] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    const clearSession = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
    }, []);

    const checkAuth = useCallback(async () => {
        const storedToken = localStorage.getItem('accessToken');
        if (!storedToken) {
            clearSession();
            setIsInitializing(false);
            return;
        }

        setToken(storedToken);
        try {
            const response = await apiClient.get(endpoints.auth.profile);
            setUser(response.data);
            // Only now is the session confirmed. Setting this from the mere
            // presence of a token meant an expired or cross-instance-invalid
            // token produced isAuthenticated=true with user=null — a state
            // every guard reads as "still loading", so protected pages hung on
            // a spinner forever instead of showing the sign-in gate.
            setIsAuthenticated(true);
        } catch (e) {
            console.error('Failed to fetch user profile; clearing session', e);
            clearSession();
        } finally {
            setIsInitializing(false);
        }
    }, [clearSession]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // The axios interceptor discards tokens when a refresh fails; without this
    // listener React state kept rendering a signed-in UI against a dead session.
    useEffect(() => {
        const handleExpired = () => clearSession();
        window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    }, [clearSession]);

    const login = async (access: string, refresh: string) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        setToken(access);
        try {
            const response = await apiClient.get(endpoints.auth.profile);
            setUser(response.data);
            setIsAuthenticated(true);
        } catch (e) {
            console.error('Login succeeded but profile fetch failed', e);
            clearSession();
            throw e;
        }
    };

    const loginWithGoogle = async (credential: string) => {
        const response = await apiClient.post(endpoints.auth.google, { credential });
        const { access, refresh } = response.data;
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        setIsAuthenticated(true);
        setToken(access);
        // The response already contains user data
        setUser({
            id: response.data.id,
            email: response.data.email,
            username: response.data.username || response.data.email,
            first_name: response.data.first_name,
            last_name: response.data.last_name,
            is_staff: response.data.is_staff,
            avatar_url: response.data.avatar_url,
            auth_provider: response.data.auth_provider,
        });
    };

    const logout = useCallback(() => {
        const refresh = localStorage.getItem('refreshToken');
        // Revoke server-side so the refresh token can't outlive the logout.
        // Fire-and-forget: local state is cleared either way.
        if (refresh) {
            apiClient.post(endpoints.auth.logout, { refresh }).catch(() => undefined);
        }
        clearSession();
    }, [clearSession]);

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                isInitializing,
                isAdmin: Boolean(user?.is_staff),
                user,
                token,
                login,
                loginWithGoogle,
                logout,
                checkAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
