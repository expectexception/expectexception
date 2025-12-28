import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logPageView, setUserId } from '../../utils/analytics';

const GATracker = () => {
    const location = useLocation();
    const { user } = useAuth();

    // Track Page Views
    useEffect(() => {
        logPageView(location.pathname + location.search);
    }, [location]);

    // Track User Identity
    useEffect(() => {
        if (user?.id) {
            setUserId(user.id);
        } else {
            setUserId(null); // Clear ID on logout if supported/needed
        }
    }, [user]);

    return null;
};

export default GATracker;
