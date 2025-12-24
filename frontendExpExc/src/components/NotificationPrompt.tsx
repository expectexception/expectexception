import React, { useState, useEffect } from 'react';
import NotificationManager from '../utils/NotificationManager';
import './NotificationPrompt.css';

const NotificationPrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        checkSubscriptionStatus();
    }, []);

    const checkSubscriptionStatus = async () => {
        // Don't show if notifications not supported
        if (!NotificationManager.isSupported()) {
            return;
        }

        // Don't show if already granted or denied
        const permission = NotificationManager.getPermissionStatus();
        if (permission !== 'default') {
            return;
        }

        // Don't show if dismissed
        const dismissed = localStorage.getItem('notification-prompt-dismissed');
        if (dismissed === 'true') {
            return;
        }

        // Check if already subscribed
        const subscribed = await NotificationManager.isSubscribed();
        setIsSubscribed(subscribed);

        // Show prompt after delay if not subscribed
        if (!subscribed) {
            setTimeout(() => setShowPrompt(true), 21000000); // Show after 5 seconds
        }
    };

    const handleEnable = async () => {
        try {
            const subscription = await NotificationManager.subscribe();

            if (subscription) {
                setIsSubscribed(true);
                setShowPrompt(false);
                console.log('[NotificationPrompt] Successfully subscribed');
            } else {
                console.log('[NotificationPrompt] Permission denied');
                handleDismiss(); // Hide prompt if denied
            }
        } catch (error) {
            console.error('[NotificationPrompt] Error subscribing:', error);
            handleDismiss();
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('notification-prompt-dismissed', 'true');
    };

    if (!showPrompt || isSubscribed) {
        return null;
    }

    return (
        <div className="notification-prompt-overlay">
            <div className="notification-prompt">
                <div className="notification-prompt-icon">
                    🔔
                </div>
                <div className="notification-prompt-content">
                    <h3>Stay Updated!</h3>
                    <p>Get notified when:</p>
                    <ul>
                        <li>✓ Downloads complete</li>
                        <li>✓ Processing finishes</li>
                        <li>✓ New features launch</li>
                    </ul>
                </div>
                <div className="notification-prompt-actions">
                    <button
                        className="notification-prompt-btn primary"
                        onClick={handleEnable}
                    >
                        Enable Notifications
                    </button>
                    <button
                        className="notification-prompt-btn secondary"
                        onClick={handleDismiss}
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationPrompt;
