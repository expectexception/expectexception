import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
    interface Window {
        gtag: (...args: any[]) => void;
    }
}

const GATracker = () => {
    const location = useLocation();

    useEffect(() => {
        if (window.gtag) {
            window.gtag('config', 'G-BN291MYX4T', {
                page_path: location.pathname + location.search,
            });
        }
    }, [location]);

    return null;
};

export default GATracker;
