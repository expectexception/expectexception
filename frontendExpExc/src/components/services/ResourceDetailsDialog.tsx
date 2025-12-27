import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Stack,
    IconButton,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Close,
    Download as DownloadIcon,
    OpenInNew
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

interface Resource {
    slug: string;
    name: string;
    description: string;
    size: string;
    version: string;
    category: string;
    downloads: number;
    created_at: string;
    cover_image?: string;
}

interface ResourceDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    resource: Resource | null;
    onDownload: (slug: string, name: string) => void;
}

const ResourceDetailsDialog: React.FC<ResourceDetailsDialogProps> = ({ open, onClose, resource, onDownload }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    if (!resource) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : 3,
                    backgroundImage: 'none',
                    bgcolor: 'background.paper',
                }
            }}
        >
            <Box sx={{ position: 'relative' }}>
                {/* Cover Image Header if available */}
                {resource.cover_image && (
                    <Box
                        sx={{
                            height: 200,
                            width: '100%',
                            backgroundImage: `url(${resource.cover_image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)'
                        }} />
                    </Box>
                )}

                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: resource.cover_image ? 'white' : 'text.secondary',
                        bgcolor: resource.cover_image ? 'rgba(0,0,0,0.5)' : 'transparent',
                        '&:hover': {
                            bgcolor: resource.cover_image ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.05)',
                        }
                    }}
                >
                    <Close />
                </IconButton>
            </Box>

            <DialogTitle sx={{ pt: resource.cover_image ? 2 : 3, pb: 1 }}>
                <Typography variant="h5" fontWeight={800} gutterBottom>
                    {resource.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        label={resource.category.toUpperCase()}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                    <Chip
                        label={resource.version}
                        size="small"
                        sx={{ bgcolor: 'action.hover', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {resource.size} • {resource.downloads} downloads
                    </Typography>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ borderTop: 'none' }}>
                <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {resource.description || "No description provided."}
                </Typography>
            </DialogContent>

            <DialogActions sx={{ p: 3, flexDirection: 'column', gap: 1.5, alignItems: 'stretch' }}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<DownloadIcon />}
                    onClick={() => onDownload(resource.slug, resource.name)}
                    sx={{
                        py: 1.5,
                        borderRadius: 2,
                        fontSize: '1rem',
                        fontWeight: 700,
                        background: 'linear-gradient(45deg, #2563eb, #7c3aed)',
                        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
                    }}
                >
                    Download Now
                </Button>

                <Button
                    component={Link}
                    to={`/downloads/${resource.slug}`}
                    variant="text"
                    color="secondary"
                    endIcon={<OpenInNew sx={{ fontSize: '1rem !important' }} />}
                    onClick={onClose}
                    sx={{ textTransform: 'none' }}
                >
                    View Full Details Page
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ResourceDetailsDialog;
