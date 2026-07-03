import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Grid, TextField, Button, Snackbar, Alert, Stack, CircularProgress, useTheme, alpha } from '@mui/material';
import Seo from '../components/seo/Seo';
import { Email, LocationOn, Send } from '@mui/icons-material';
import { motion } from 'framer-motion';
import apiClient from '../api/config';

// --- Reusable Border Beam Effect ---
const BorderBeam: React.FC<{ activeColor?: string }> = ({ activeColor }) => {
  const theme = useTheme();
  const color = activeColor || theme.palette.primary.main;
  
  return (
    <Box
      className="border-beam-overlay"
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        border: '1.5px solid transparent',
        background: `linear-gradient(90deg, ${color}, ${theme.palette.secondary.main}) border-box`,
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        opacity: 0,
        pointerEvents: 'none',
        transition: 'opacity 0.4s ease',
        zIndex: 10,
        backgroundSize: '200% 200%',
        '@keyframes rotateGradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        animation: 'rotateGradient 4s linear infinite',
      }}
    />
  );
};

// --- Custom Animated SVG for Contact Page ---
const CommunicationHubSvg: React.FC = () => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  
  return (
    <svg width="100%" height="200" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}>
      <defs>
        <filter id="glow-contact" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Connection grid lines */}
      <path 
        d="M50 100 L150 50 L250 150 L350 100" 
        stroke="rgba(255,255,255,0.05)" 
        strokeWidth="2"
      />
      <path 
        d="M50 100 L200 150 L350 100" 
        stroke="rgba(255,255,255,0.03)" 
        strokeWidth="1.5"
      />
      
      {/* Wave propagation from center */}
      <motion.circle
        cx="200"
        cy="100"
        r="30"
        stroke={primaryColor}
        strokeWidth="1.5"
        animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeOut' }}
        style={{ originX: '200px', originY: '100px' }}
      />
      <motion.circle
        cx="200"
        cy="100"
        r="30"
        stroke={theme.palette.secondary.main}
        strokeWidth="1"
        animate={{ scale: [1, 3.5], opacity: [0.4, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeOut', delay: 1.5 }}
        style={{ originX: '200px', originY: '100px' }}
      />

      {/* Pulse Nodes */}
      <circle cx="50" cy="100" r="4" fill="rgba(255,255,255,0.2)" />
      <circle cx="150" cy="50" r="5" fill="#a855f7" style={{ filter: 'drop-shadow(0 0 4px #a855f7)' }} />
      <circle cx="250" cy="150" r="5" fill="#f97316" style={{ filter: 'drop-shadow(0 0 4px #f97316)' }} />
      <circle cx="350" cy="100" r="4" fill="rgba(255,255,255,0.2)" />

      {/* Floating Center Icon (Envelope) */}
      <motion.g
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
      >
        {/* Outer Hexagon */}
        <polygon 
          points="200,75 222,87 222,113 200,125 178,113 178,87" 
          fill="#0d0e12" 
          stroke={primaryColor} 
          strokeWidth="2" 
          style={{ filter: 'url(#glow-contact)' }}
        />
        {/* Envelope Lines inside Hexagon */}
        <path 
          d="M188 93 L200 102 L212 93" 
          stroke="#ffffff" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
        />
        <rect 
          x="188" 
          y="93" 
          width="24" 
          height="16" 
          rx="2" 
          stroke="#ffffff" 
          strokeWidth="1.5" 
          fill="none" 
        />
      </motion.g>
    </svg>
  );
};

const ContactPage: React.FC = () => {
    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;
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
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 12 } }}>
            <Seo
                title="Contact Us - Let's Build Something Great Together"
                description="Get in touch with the ExpectException team. We're here to help with your developer tool needs, feedback, or custom requests."
                keywords={['contact expectexception', 'support', 'developer tools feedback', 'technical support', 'tech collaboration', 'customer service', 'tool improvement requests', 'bug reporting', 'partner with us']}
            />

            <Box sx={{ mb: { xs: 6, md: 10 }, textAlign: 'center' }}>
                <Typography variant="h2" component="h1" gutterBottom fontWeight="900" sx={{
                    background: `linear-gradient(135deg, #ffffff 30%, ${primaryColor} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                }}>
                    Let's Collaborate
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: '600px', mx: 'auto' }}>
                    Have a project in mind, feedback on our AI agents, or general inquiries? Drop us a message below.
                </Typography>
            </Box>

            <Grid container spacing={4} alignItems="stretch">
                {/* Contact Info */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={4} sx={{ height: '100%' }}>
                        {/* Custom Animated Graphic */}
                        <Paper 
                            sx={{ 
                                p: 3, 
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(13, 14, 18, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.03)',
                            }}
                        >
                            <CommunicationHubSvg />
                        </Paper>

                        <Paper 
                            sx={{ 
                                p: 3.5, 
                                borderRadius: '16px',
                                background: 'rgba(13, 14, 18, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                transition: 'all 0.3s',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                    borderColor: alpha(primaryColor, 0.3),
                                    boxShadow: `0 10px 30px -10px ${alpha(primaryColor, 0.1)}`
                                },
                                '&:hover .border-beam-overlay': { opacity: 1 }
                            }}
                        >
                            <BorderBeam activeColor={primaryColor} />
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Email sx={{ mr: 2, color: primaryColor }} />
                                <Typography variant="h6" fontWeight="800">Email Us</Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary" fontWeight="600">
                                support@expectexception.com
                            </Typography>
                            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                                We usually reply within 24 hours.
                            </Typography>
                        </Paper>

                        <Paper 
                            sx={{ 
                                p: 3.5, 
                                borderRadius: '16px',
                                background: 'rgba(13, 14, 18, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                transition: 'all 0.3s',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                    borderColor: alpha(primaryColor, 0.3),
                                    boxShadow: `0 10px 30px -10px ${alpha(primaryColor, 0.1)}`
                                },
                                '&:hover .border-beam-overlay': { opacity: 1 }
                            }}
                        >
                            <BorderBeam activeColor={theme.palette.secondary.main} />
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <LocationOn sx={{ mr: 2, color: 'secondary.main' }} />
                                <Typography variant="h6" fontWeight="800">Location</Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary" fontWeight="600">
                                Digital World
                            </Typography>
                            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                                Available globally for remote collaboration.
                            </Typography>
                        </Paper>
                    </Stack>
                </Grid>

                {/* Contact Form */}
                <Grid item xs={12} md={8}>
                    <Paper 
                        sx={{ 
                            p: { xs: 4, md: 6 }, 
                            borderRadius: '24px', 
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.6) 0%, rgba(13, 14, 18, 0.2) 100%)',
                            position: 'relative',
                            overflow: 'hidden',
                            '&:hover .border-beam-overlay': { opacity: 1 }
                        }}
                    >
                        <BorderBeam activeColor={primaryColor} />
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
                                        disabled={isSubmitting}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        required
                                        fullWidth
                                        multiline
                                        rows={5}
                                        label="Message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
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
                                        sx={{ 
                                            px: 6, 
                                            py: 2, 
                                            borderRadius: '30px',
                                            fontWeight: 800,
                                        }}
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
                <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarSeverity} sx={{ width: '100%', borderRadius: '12px' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ContactPage;
