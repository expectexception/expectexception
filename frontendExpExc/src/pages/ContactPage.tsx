import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Grid, TextField, Button, Snackbar, Alert, Stack, CircularProgress } from '@mui/material';
import Seo from '../components/seo/Seo';
import { Email, LocationOn, Send } from '@mui/icons-material';
import apiClient from '../api/config';

const ContactPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await apiClient.post('/api/contact/', {
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message,
                inquiry_type: 'general',
            });

            setSnackbarMessage('Message sent successfully! We\'ll get back to you soon.');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error: any) {
            console.error('Form submission error:', error);
            const errorMsg = error.response?.data?.message || 'Something went wrong. Please try again.';
            setSnackbarMessage(errorMsg);
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Seo
                title="Contact Us - Let's Build Something Great Together"
                description="Get in touch with the ExpectException team. We're here to help with your developer tool needs, feedback, or custom requests."
                keywords={['contact expectexception', 'support', 'developer tools feedback', 'technical support', 'tech collaboration', 'customer service', 'tool improvement requests', 'bug reporting', 'partner with us']}
            />


            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" sx={{
                    background: 'linear-gradient(45deg, #2563eb, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    Get in Touch
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    Have questions? We'd love to hear from you.
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {/* Contact Info */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={3}>
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Email color="primary" sx={{ mr: 2 }} />
                                <Typography variant="h6">Email Us</Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary">
                                support@expectexception.com
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                We usually reply within 24 hours.
                            </Typography>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <LocationOn color="primary" sx={{ mr: 2 }} />
                                <Typography variant="h6">Location</Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary">
                                Digital World
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Available globally.
                            </Typography>
                        </Paper>
                    </Stack>
                </Grid>

                {/* Contact Form */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <form onSubmit={handleSubmit}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        required
                                        fullWidth
                                        label="Name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        variant="outlined"
                                        disabled={isSubmitting}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        required
                                        fullWidth
                                        label="Email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        variant="outlined"
                                        disabled={isSubmitting}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        required
                                        fullWidth
                                        label="Subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        variant="outlined"
                                        disabled={isSubmitting}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        required
                                        fullWidth
                                        multiline
                                        rows={4}
                                        label="Message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        variant="outlined"
                                        disabled={isSubmitting}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        disabled={isSubmitting}
                                        endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                                        sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                                    >
                                        {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar
                open={openSnackbar}
                autoHideDuration={6000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ContactPage;
