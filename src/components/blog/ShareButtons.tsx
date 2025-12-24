import React, { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import {
    Share as ShareIcon,
    Twitter,
    LinkedIn,
    Facebook,
    Link as LinkIcon,
    Email,
    WhatsApp
} from '@mui/icons-material';

interface ShareButtonsProps {
    url?: string;
    title: string;
    description?: string;
}

const ShareButtons: React.FC<ShareButtonsProps> = ({ url, title, description = '' }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [copied, setCopied] = useState(false);
    const shareUrl = url || window.location.href;

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            handleClose();
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`,
        email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${shareUrl}`)}`,
    };

    const handleShare = (platform: keyof typeof shareLinks) => {
        window.open(shareLinks[platform], '_blank', 'width=600,height=400');
        handleClose();
    };

    return (
        <>
            <Tooltip title="Share">
                <IconButton onClick={handleClick} color="primary">
                    <ShareIcon />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    sx: { minWidth: 200 },
                }}
            >
                <MenuItem onClick={() => handleShare('twitter')}>
                    <ListItemIcon>
                        <Twitter fontSize="small" sx={{ color: '#1DA1F2' }} />
                    </ListItemIcon>
                    <ListItemText>Twitter</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleShare('linkedin')}>
                    <ListItemIcon>
                        <LinkedIn fontSize="small" sx={{ color: '#0077B5' }} />
                    </ListItemIcon>
                    <ListItemText>LinkedIn</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleShare('facebook')}>
                    <ListItemIcon>
                        <Facebook fontSize="small" sx={{ color: '#1877F2' }} />
                    </ListItemIcon>
                    <ListItemText>Facebook</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleShare('whatsapp')}>
                    <ListItemIcon>
                        <WhatsApp fontSize="small" sx={{ color: '#25D366' }} />
                    </ListItemIcon>
                    <ListItemText>WhatsApp</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleShare('email')}>
                    <ListItemIcon>
                        <Email fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Email</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleCopyLink}>
                    <ListItemIcon>
                        <LinkIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{copied ? 'Copied!' : 'Copy Link'}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};

export default ShareButtons;
