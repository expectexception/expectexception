/**
 * Notification Manager Utility
 * Handles Web Push Notification subscription and management
 */

const VAPID_PUBLIC_KEY = 'BGcxbIdFOOx06gl9Nt_D0IMsNM1pfe4_nCx2_bB9rSi-fTabOnGvNY1To4WzL6laMTqYcl7ALDQRrbnDoeCBrZk';
const API_BASE = '/api/notifications';

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

class NotificationManager {
    private static instance: NotificationManager;

    private constructor() { }

    static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    /**
     * Check if push notifications are supported
     */
    isSupported(): boolean {
        return 'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window;
    }

    /**
     * Get current notification permission status
     */
    getPermissionStatus(): NotificationPermission {
        return Notification.permission;
    }

    /**
     * Request notification permission from user
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) {
            throw new Error('Push notifications are not supported');
        }

        const permission = await Notification.requestPermission();
        console.log('[Notifications] Permission:', permission);
        return permission;
    }

    /**
     * Subscribe to push notifications
     */
    async subscribe(): Promise<PushSubscription | null> {
        try {
            // Check permission
            if (Notification.permission !== 'granted') {
                const permission = await this.requestPermission();
                if (permission !== 'granted') {
                    console.log('[Notifications] Permission denied');
                    return null;
                }
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed
            let subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                console.log('[Notifications] Already subscribed');
                return subscription;
            }

            // Subscribe to push notifications
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
            });

            console.log('[Notifications] New subscription created');

            // Send subscription to backend
            await this.sendSubscriptionToBackend(subscription);

            return subscription;

        } catch (error) {
            console.error('[Notifications] Subscribe error:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe(): Promise<boolean> {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Send unsubscribe request to backend
                await this.sendUnsubscribeToBackend(subscription);

                // Unsubscribe from browser
                const success = await subscription.unsubscribe();
                console.log('[Notifications] Unsubscribed:', success);
                return success;
            }

            return false;
        } catch (error) {
            console.error('[Notifications] Unsubscribe error:', error);
            return false;
        }
    }

    /**
     * Check if currently subscribed
     */
    async isSubscribed(): Promise<boolean> {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            return subscription !== null;
        } catch {
            return false;
        }
    }


    /**
      * Send subscription to backend
      */
    private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
        try {
            const response = await fetch(`${API_BASE}/subscribe/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription.toJSON())
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('[Notifications] Subscription saved:', data);
        } catch (error) {
            console.error('[Notifications] Failed to send subscription to backend:', error);
            throw error;
        }
    }

    /**
     * Send unsubscribe request to backend
     */
    private async sendUnsubscribeToBackend(subscription: PushSubscription): Promise<void> {
        try {
            const response = await fetch(`${API_BASE}/unsubscribe/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ endpoint: subscription.endpoint })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('[Notifications] Unsubscribe request sent');
        } catch (error) {
            console.error('[Notifications] Failed to send unsubscribe to backend:', error);
        }
    }
}

export default NotificationManager.getInstance();
