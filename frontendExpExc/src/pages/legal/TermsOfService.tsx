import React from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import { Helmet } from 'react-helmet-async';

const TermsOfService: React.FC = () => {
    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Helmet>
                <title>Terms of Service - ExpectException</title>
                <meta name="description" content="Terms of Service for ExpectException. Read our terms and conditions for using our tools and services." />
            </Helmet>
            <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, borderRadius: 4 }}>
                <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary">
                    Terms of Service
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Last updated: {new Date().toLocaleDateString()}
                </Typography>
                <Divider sx={{ my: 4 }} />

                <Box sx={{ '& > h5': { mt: 4, mb: 2, fontWeight: 600, color: 'text.primary' }, '& > p': { mb: 2, lineHeight: 1.7, color: 'text.secondary' } }}>
                    <Typography variant="h5" component="h2">1. Acceptance of Terms</Typography>
                    <Typography variant="body1">
                        By accessing ExpectException and using our tools (including the YouTube Downloader, AI Detector, etc.), you agree to be bound by these Terms. If you do not agree to these terms, please do not use our services.
                    </Typography>

                    <Typography variant="h5" component="h2">2. Use of Services</Typography>
                    <Typography variant="body1">
                        Our tools are provided for personal, non-commercial use, and educational purposes.
                        <br /><br />
                        <strong>Video Downloader:</strong> You agree to use the YouTube Downloader only for content that you have the right to download (e.g., your own content, public domain content, or content with a Creative Commons license). You are strictly prohibited from using this tool to infringe on copyrights or download copyrighted material without permission.
                    </Typography>

                    <Typography variant="h5" component="h2">3. User Responsibilities</Typography>
                    <Typography variant="body1">
                        You are responsible for:
                    </Typography>
                    <ul>
                        <li><Typography variant="body1">Maintaining the confidentiality of your account credentials (if registered).</Typography></li>
                        <li><Typography variant="body1">All activities that occur under your account.</Typography></li>
                        <li><Typography variant="body1">Ensuring your use of our tools complies with all applicable local and international laws.</Typography></li>
                    </ul>

                    <Typography variant="h5" component="h2">4. Intellectual Property</Typography>
                    <Typography variant="body1">
                        ExpectException and its original content (excluding user-generated content or downloaded media) are protected by copyright and intellectual property laws. You may not reverse engineer or attempt to extract the source code of our tools.
                    </Typography>

                    <Typography variant="h5" component="h2">5. Disclaimer of Warranties</Typography>
                    <Typography variant="body1">
                        The services are provided "AS IS" and "AS AVAILABLE" without any warranties. We do not guarantee that the services will be uninterrupted, secure, or error-free (e.g., YouTube API changes may temporarily affect downloader functionality).
                    </Typography>

                    <Typography variant="h5" component="h2">6. Limitation of Liability</Typography>
                    <Typography variant="body1">
                        ExpectException shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the service, including but not limited to any copyright strikes or legal actions taken against you for misuse of downloaded content. Only YOU are responsible for how you use the downloaded files.
                    </Typography>

                    <Typography variant="h5" component="h2">7. Changes to Terms</Typography>
                    <Typography variant="body1">
                        We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default TermsOfService;
