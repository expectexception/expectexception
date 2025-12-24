import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface NotificationToastProps {
    open: boolean;
    message: string;
    severity: AlertColor;
    onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ open, message, severity, onClose }) => {
    return (
        <Snackbar
            open={open}
            autoHideDuration={6000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert onClose={onClose} severity={severity} sx={{ width: '100%', borderRadius: 2, boxShadow: 3 }}>
                {message}
            </Alert>
        </Snackbar>
    );
};

export default NotificationToast;
