import { Metric } from 'web-vitals';

declare global {
    interface Window {
        gtag: (...args: any[]) => void;
    }
}

const GA_MEASUREMENT_ID = 'G-BN291MYX4T';

// Check if we are in production
const isProduction = process.env.NODE_ENV === 'production';

// Initialize GA4
export const initGA = () => {
    if (isProduction && window.gtag) {
        window.gtag('config', GA_MEASUREMENT_ID, {
            send_page_view: false, // We handle this manually
        });
    }
};

// Log Page View
export const logPageView = (path: string) => {
    if (isProduction && window.gtag) {
        window.gtag('event', 'page_view', {
            page_path: path,
        });
    } else {
        console.log(`[Analytics] Page View: ${path}`);
    }
};

// Log Custom Event
export const logEvent = (category: string, action: string, label?: string, value?: number) => {
    if (isProduction && window.gtag) {
        window.gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value,
        });
    } else {
        console.log(`[Analytics] Event: ${category} - ${action}`, { label, value });
    }
};

// Set User ID
export const setUserId = (userId: string | number | null) => {
    if (isProduction && window.gtag) {
        window.gtag('config', GA_MEASUREMENT_ID, {
            user_id: userId,
        });
    } else if (userId) {
        console.log(`[Analytics] User ID Set: ${userId}`);
    }
};

// Handle Web Vitals
export const sendToAnalytics = (metric: Metric) => {
    const { id, name, delta, value } = metric;
    if (isProduction && window.gtag) {
        window.gtag('event', name, {
            event_category: 'Web Vitals',
            event_label: id,
            value: Math.round(name === 'CLS' ? delta * 1000 : delta),
            non_interaction: true,
        });
    } else {
        // console.log(`[Analytics] Vital: ${name}`, { id, delta, value });
    }
};
