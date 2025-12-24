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

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    refresh: () => void;
    showNotification: (message: string, type?: AlertColor) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);

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
            const res = await apiClient.get(endpoints.notifications.list);
            const data = Array.isArray(res.data) ? res.data : res.data.results || [];
            setNotifications(data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000); // poll every 30s
            return () => clearInterval(interval);
        }
    }, [fetchNotifications, token]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const value: NotificationContextType = {
        notifications,
        unreadCount,
        refresh: fetchNotifications,
        showNotification,
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
