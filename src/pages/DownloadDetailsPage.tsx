import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Button,
    Grid,
    Chip,
    Card,
    CardContent,
    Skeleton,
    Stack,
    Divider,
    Alert
} from '@mui/material';
import {
    CloudDownload,
    ArrowBack,
    CalendarToday,
    Storage,
    Category,
    VerifiedUser,
    Share // For future use
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import Seo from '../components/seo/Seo';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

const DownloadDetailsPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [resource, setResource] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchResource = async () => {
            try {
                const response = await apiClient.get(`${endpoints.services.downloads}${slug}/`);
                setResource(response.data);
            } catch (err) {
                console.error('Failed to load resource:', err);
                setError('Resource not found or deleted.');
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchResource();
        }
    }, [slug]);

    const handleDownload = async () => {
        if (!resource) return;
        try {
            const response = await apiClient.get(endpoints.services.downloadFile(resource.slug), { // API now supports slug
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', resource.name);
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Update local download count
            setResource((prev: any) => ({ ...prev, downloads: prev.downloads + 1 }));

        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 6 }}>
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, mb: 4 }} />
                <Skeleton variant="text" height={60} width="60%" />
                <Skeleton variant="text" height={30} width="40%" />
            </Container>
        );
    }

    if (error || !resource) {
        return (
            <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
                <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/downloads')}>
                    Back to Hub
                </Button>
            </Container>
        );
    }

    return (
        <>
            <Seo
                title={resource.seo_title || resource.name}
                description={resource.seo_description || resource.description.slice(0, 160)}
                keywords={resource.keywords}
                type="article" // Or 'product' / 'item'
            />

            <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/downloads')}
                    sx={{ mb: 3 }}
                >
                    Back to Downloads
                </Button>

                <Grid container spacing={4}>
                    {/* Left Column: Image & Actions */}
                    <Grid item xs={12} md={5}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <Card sx={{
                                borderRadius: 3,
                                overflow: 'hidden',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                            }}>
                                {resource.cover_image ? (
                                    <Box
                                        component="img"
                                        src={resource.cover_image}
                                        alt={resource.name}
                                        sx={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Box sx={{
                                        height: 300,
                                        bgcolor: 'primary.light',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white'
                                    }}>
                                        <CloudDownload sx={{ fontSize: 80, opacity: 0.8 }} />
                                    </Box>
                                )}
                                <CardContent sx={{ p: 3 }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        fullWidth
                                        startIcon={<CloudDownload />}
                                        onClick={handleDownload}
                                        sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 700 }}
                                    >
                                        Download Now
                                    </Button>
                                    <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1.5, color: 'text.secondary' }}>
                                        File Size: {resource.size} • Virus Scanned <VerifiedUser fontSize="inherit" color="success" sx={{ verticalAlign: 'text-bottom' }} />
                                    </Typography>
                                </CardContent>
                            </Card>

                            {/* Quick Stats */}
                            <Card sx={{ mt: 3, borderRadius: 2 }}>
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <CalendarToday color="action" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Updated</Typography>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {new Date(resource.created_at).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Divider />
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Storage color="action" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Version</Typography>
                                                <Typography variant="body2" fontWeight={600}>{resource.version}</Typography>
                                            </Box>
                                        </Stack>
                                        <Divider />
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Category color="action" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Category</Typography>
                                                <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                                                    {resource.category}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    {/* Right Column: Content */}
                    <Grid item xs={12} md={7}>
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <Typography variant="h3" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>
                                {resource.name}
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                                {resource.keywords && resource.keywords.split(',').slice(0, 4).map((tag: string) => (
                                    <Chip key={tag} label={tag.trim()} size="small" variant="outlined" />
                                ))}
                            </Stack>

                            <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1.7, mb: 4 }}>
                                {/* Render simple text or markdown if supported later */}
                                {resource.description || "No description provided."}
                            </Typography>

                            <Typography variant="h5" fontWeight={700} gutterBottom>
                                Why download this?
                            </Typography>
                            <Box component="ul" sx={{ pl: 2, mb: 4, color: 'text.secondary' }}>
                                <li>High quality resource verified by our team.</li>
                                <li>Fast and secure download servers.</li>
                                <li>Updated regularly with improvements.</li>
                                <li>Free for personal and educational use.</li>
                            </Box>

                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </>
    );
};

export default DownloadDetailsPage;
