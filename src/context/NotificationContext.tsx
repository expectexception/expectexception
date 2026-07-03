import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import NotificationToast from '../components/layout/NotificationToast';
import { AlertColor } from '@mui/material';

interface Notification {
    id: number;
    verb: string;
    description: string;
    timestamp: string;
    read: boolean;
}

export interface InAppNotification {
    id: number;
    type: string;
    title: string;
    body: string;
    url: string;
    is_read: boolean;
    created_at: string;
    sender: string | null;
}

interface NotificationContextType {
    notifications: Notification[];
    inAppNotifications: InAppNotification[];
    unreadCount: number;
    refresh: () => void;
    showNotification: (message: string, type?: AlertColor) => void;
    markAllRead: () => void;
    markOneRead: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);

    // Toast State
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastSeverity, setToastSeverity] = useState<AlertColor>('info');

    const showNotification = useCallback((message: string, type: AlertColor = 'info') => {
        setToastMessage(message);
        setToastSeverity(type);
        setToastOpen(true);
    }, []);

    const handleCloseToast = () => {
        setToastOpen(false);
    };

    const fetchNotifications = React.useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiClient.get(endpoints.notifications.inApp);
            const data = res.data?.notifications || [];
            setInAppNotifications(data);
        } catch {
            // silently fail
        }
    }, [token]);

    const markAllRead = useCallback(async () => {
        try {
            await apiClient.patch(endpoints.notifications.inApp);
            setInAppNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch {}
    }, []);

    const markOneRead = useCallback(async (id: number) => {
        try {
            await apiClient.patch(endpoints.notifications.inAppMarkRead(id));
            setInAppNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch {}
    }, []);

    useEffect(() => {
        if (token) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [fetchNotifications, token]);

    const unreadCount = inAppNotifications.filter(n => !n.is_read).length;

    const value: NotificationContextType = {
        notifications,
        inAppNotifications,
        unreadCount,
        refresh: fetchNotifications,
        showNotification,
        markAllRead,
        markOneRead,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <NotificationToast
                open={toastOpen}
                message={toastMessage}
                severity={toastSeverity}
                onClose={handleCloseToast}
            />
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};
