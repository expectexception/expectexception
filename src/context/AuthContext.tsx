import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

import { User } from '../types';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    login: (access: string, refresh: string) => void;
    loginWithGoogle: (credential: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const storedToken = localStorage.getItem('accessToken');
        if (storedToken) {
            setIsAuthenticated(true);
            setToken(storedToken);
            try {
                const response = await apiClient.get(endpoints.auth.profile);
                setUser(response.data);
            } catch (e) {
                console.error("Failed to fetch user profile", e);
                // If token invalid, maybe logout?
                // setIsAuthenticated(false);
            }
        } else {
            setIsAuthenticated(false);
            setToken(null);
            setUser(null);
        }
    };

    const login = async (access: string, refresh: string) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        setIsAuthenticated(true);
        setToken(access);
        try {
            const response = await apiClient.get(endpoints.auth.profile);
            setUser(response.data);
        } catch (e) { console.error(e) }
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

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, token, login, loginWithGoogle, logout, checkAuth }}>
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
