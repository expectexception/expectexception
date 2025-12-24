import React from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy: React.FC = () => {
    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Helmet>
                <title>Privacy Policy - ExpectException</title>
                <meta name="description" content="Privacy Policy for ExpectException. Learn how we collect, use, and protect your data." />
            </Helmet>
            <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, borderRadius: 4 }}>
                <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary">
                    Privacy Policy
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Last updated: {new Date().toLocaleDateString()}
                </Typography>
                <Divider sx={{ my: 4 }} />

                <Box sx={{ '& > h5': { mt: 4, mb: 2, fontWeight: 600, color: 'text.primary' }, '& > p': { mb: 2, lineHeight: 1.7, color: 'text.secondary' } }}>
                    <Typography variant="h5" component="h2">1. Introduction</Typography>
                    <Typography variant="body1">
                        Welcome to ExpectException ("we," "our," or "us"). We are committed to protecting your privacy while you use our suite of developer tools and services, including our YouTube Downloader, AI Image Detector, and other utilities. This Privacy Policy explains how we collect, use, and safeguard your information.
                    </Typography>

                    <Typography variant="h5" component="h2">2. Information We Collect</Typography>
                    <Typography variant="body1">
                        We collect minimal information necessary to provide our services:
                    </Typography>
                    <ul>
                        <li><Typography variant="body1"><strong>Usage Data:</strong> We may collect anonymous metrics such as pages visited, tools used, and error logs to improve system performance.</Typography></li>
                        <li><Typography variant="body1"><strong>Input Data:</strong> URL inputs (for the Downloader) or Image uploads (for AI Detector) are processed temporarily to fulfill your request and are not permanently stored on our servers unless explicitly stated (e.g., for caching performance).</Typography></li>
                        <li><Typography variant="body1"><strong>Account Data:</strong> If you register, we store your email address and username to manage your preferences and history.</Typography></li>
                    </ul>

                    <Typography variant="h5" component="h2">3. How We Use Your Information</Typography>
                    <Typography variant="body1">
                        - <strong>Service Provision:</strong> To process video downloads, convert files, or analyze images as requested.
                        <br />- <strong>Improvement:</strong> To analyze usage patterns and fix bugs.
                        <br />- <strong>Communication:</strong> To send important system updates (only for registered users).
                    </Typography>

                    <Typography variant="h5" component="h2">4. YouTube Downloader Specifics</Typography>
                    <Typography variant="body1">
                        When using our YouTube Downloader, we process the video URL you provide to generate a download link. We do not track which videos individual users download, nor do we keep a permanent history of your downloads beyond the immediate session required to deliver the file.
                    </Typography>

                    <Typography variant="h5" component="h2">5. AI & Data Processing</Typography>
                    <Typography variant="body1">
                        For our AI tools (e.g., Image Detector), images are processed in real-time. We rely on secure processing pipelines and do not use your uploaded images to train public models without your explicit consent.
                    </Typography>

                    <Typography variant="h5" component="h2">6. Cookies</Typography>
                    <Typography variant="body1">
                        We use local storage and necessary cookies to maintain your session state (e.g., keeping you logged in). We do not use third-party tracking cookies for advertising.
                    </Typography>

                    <Typography variant="h5" component="h2">7. Data Security</Typography>
                    <Typography variant="body1">
                        We employ industry-standard encryption (SSL/TLS) and secure server infrastructure to protect your data. However, no method of transmission over the Internet is 100% secure.
                    </Typography>

                    <Typography variant="h5" component="h2">8. Contact Us</Typography>
                    <Typography variant="body1">
                        If you have concerns about our privacy practices, please contact us through our support channels.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default PrivacyPolicy;
