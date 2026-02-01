import React, { useState } from 'react';
import {
    Container,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Stack,
    Chip,
    TextField,
    Snackbar,
    Alert,
    alpha,
    useTheme,
    Paper,
    Divider,
    CircularProgress,
} from '@mui/material';
import Seo from '../components/seo/Seo';
import {
    Psychology,
    Chat,
    Code,
    Web,
    Storage,
    SmartToy,
    Send,
    Rocket,
    CheckCircle,
    ArrowForward,
    WorkspacePremium,
    AccessTime,
    Handshake,
    Email,
    PhoneAndroid,
    CloudQueue,
    Analytics,
    Security,
    IntegrationInstructions,
    DesignServices,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import apiClient from '../api/config';

interface ServiceItem {
    title: string;
    icon: React.ReactNode;
    desc: string;
    features: string[];
    color: string;
}

const HirePage: React.FC = () => {
    const theme = useTheme();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        projectType: '',
        budget: '',
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
            await apiClient.post('/api/contact/hire/', {
                name: formData.name,
                email: formData.email,
                projectType: formData.projectType,
                budget: formData.budget,
                message: formData.message,
            });

            setSnackbarMessage('Thank you! Your inquiry has been received. We\'ll get back to you within 24 hours.');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
            setFormData({ name: '', email: '', projectType: '', budget: '', message: '' });
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

    const services: ServiceItem[] = [
        {
            title: 'Frontend Development',
            icon: <Web sx={{ fontSize: 40 }} />,
            desc: 'Modern, responsive web interfaces built with React, Next.js, Vue, or Angular. Pixel-perfect designs with smooth animations.',
            features: ['React/Next.js', 'TypeScript', 'Responsive Design', 'Performance Optimized'],
            color: '#3b82f6',
        },
        {
            title: 'Backend Development',
            icon: <Storage sx={{ fontSize: 40 }} />,
            desc: 'Scalable server-side solutions with Python, Node.js, or Go. RESTful APIs, GraphQL, and database architecture.',
            features: ['Django/FastAPI', 'Node.js', 'PostgreSQL/MongoDB', 'Cloud Deployment'],
            color: '#10b981',
        },
        {
            title: 'Full Stack Development',
            icon: <Code sx={{ fontSize: 40 }} />,
            desc: 'End-to-end web applications from concept to deployment. Complete solutions with modern tech stacks.',
            features: ['Complete Apps', 'Database Design', 'API Integration', 'DevOps & CI/CD'],
            color: '#8b5cf6',
        },
        {
            title: 'AI Chatbot Development',
            icon: <Chat sx={{ fontSize: 40 }} />,
            desc: 'Intelligent conversational AI powered by OpenAI, Claude, or custom models. Customer support bots and assistants.',
            features: ['GPT Integration', 'Custom Knowledge Base', 'Multi-platform', '24/7 Availability'],
            color: '#f59e0b',
        },
        {
            title: 'ML Model Training',
            icon: <Psychology sx={{ fontSize: 40 }} />,
            desc: 'Custom machine learning models for classification, detection, NLP, and computer vision tasks.',
            features: ['Custom Models', 'Fine-tuning', 'Data Pipelines', 'Model Deployment'],
            color: '#ef4444',
        },
        {
            title: 'AI/Automation Solutions',
            icon: <SmartToy sx={{ fontSize: 40 }} />,
            desc: 'Intelligent automation, data processing pipelines, and AI-powered business tools.',
            features: ['Python Automation', 'Data Processing', 'Workflow Optimization', 'Custom Tools'],
            color: '#06b6d4',
        },
        {
            title: 'Mobile App Development',
            icon: <PhoneAndroid sx={{ fontSize: 40 }} />,
            desc: 'Cross-platform mobile apps with React Native or Flutter. Native-like performance on iOS and Android.',
            features: ['React Native', 'Flutter', 'iOS & Android', 'App Store Deployment'],
            color: '#a855f7',
        },
        {
            title: 'Cloud & DevOps',
            icon: <CloudQueue sx={{ fontSize: 40 }} />,
            desc: 'Cloud infrastructure setup, CI/CD pipelines, containerization, and Kubernetes deployment.',
            features: ['AWS/GCP/Azure', 'Docker/K8s', 'CI/CD Pipelines', 'Infrastructure as Code'],
            color: '#0ea5e9',
        },
        {
            title: 'Data Analytics & BI',
            icon: <Analytics sx={{ fontSize: 40 }} />,
            desc: 'Data visualization dashboards, business intelligence solutions, and reporting systems.',
            features: ['Dashboards', 'ETL Pipelines', 'Data Visualization', 'Custom Reports'],
            color: '#14b8a6',
        },
        {
            title: 'API Development & Integration',
            icon: <IntegrationInstructions sx={{ fontSize: 40 }} />,
            desc: 'RESTful and GraphQL API development, third-party integrations, and microservices architecture.',
            features: ['REST/GraphQL', 'Microservices', 'API Gateway', 'Webhook Systems'],
            color: '#f97316',
        },
        {
            title: 'Security & Penetration Testing',
            icon: <Security sx={{ fontSize: 40 }} />,
            desc: 'Security audits, vulnerability assessments, and secure coding practices implementation.',
            features: ['Security Audits', 'Pen Testing', 'Code Review', 'Compliance'],
            color: '#dc2626',
        },
        {
            title: 'UI/UX Design',
            icon: <DesignServices sx={{ fontSize: 40 }} />,
            desc: 'User interface and experience design with Figma. Wireframes, prototypes, and design systems.',
            features: ['Figma Design', 'Prototyping', 'Design Systems', 'User Research'],
            color: '#ec4899',
        },
    ];

    const processSteps = [
        {
            step: '01',
            title: 'Discovery Call',
            desc: 'We discuss your requirements, goals, and timeline to understand your project fully.',
            icon: <Handshake />,
        },
        {
            step: '02',
            title: 'Proposal & Quote',
            desc: 'Receive a detailed proposal with scope, timeline, and transparent pricing.',
            icon: <WorkspacePremium />,
        },
        {
            step: '03',
            title: 'Agile Development',
            desc: 'Regular updates, demos, and feedback loops to ensure the project meets your vision.',
            icon: <AccessTime />,
        },
        {
            step: '04',
            title: 'Delivery & Support',
            desc: 'Full handover with documentation, training, and ongoing support options.',
            icon: <Rocket />,
        },
    ];

    return (
        <Box sx={{ minHeight: '100vh', pb: 8 }}>
            <Seo
                title="Hire a Developer - Expert ML, Python & Full-Stack Engineers"
                description="Hire experienced developers for frontend, backend, full-stack, mobile apps, AI chatbots, ML model training, and cloud solutions. Fast delivery, transparent pricing, professional results."
                keywords={['hire developer', 'freelance developer', 'ml engineer', 'chatbot developer', 'full-stack developer', 'python development', 'react developer', 'ai development', 'mobile app developer', 'cloud engineer']}
            />

            {/* Hero Section */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                    py: { xs: 6, md: 10 },
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Container maxWidth="lg">
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={7}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <Chip
                                    label="🚀 Available for Projects"
                                    sx={{
                                        bgcolor: alpha(theme.palette.success.main, 0.15),
                                        color: theme.palette.success.main,
                                        fontWeight: 600,
                                        mb: 2,
                                    }}
                                />
                                <Typography
                                    variant="h2"
                                    component="h1"
                                    gutterBottom
                                    fontWeight="bold"
                                    sx={{
                                        background: 'linear-gradient(45deg, #2563eb, #7c3aed)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                                        lineHeight: 1.2,
                                    }}
                                >
                                    Hire Expert Developers
                                </Typography>
                                <Typography
                                    variant="h5"
                                    color="text.secondary"
                                    sx={{ mb: 4, fontSize: { xs: '1rem', sm: '1.25rem' } }}
                                >
                                    From stunning frontends to powerful AI solutions — we build production-ready software that scales.
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        endIcon={<ArrowForward />}
                                        href="#contact"
                                        sx={{
                                            px: 4,
                                            py: 1.5,
                                            borderRadius: 3,
                                            fontWeight: 700,
                                            fontSize: { xs: '0.9rem', sm: '1rem' },
                                        }}
                                    >
                                        Get a Free Quote
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        component={Link}
                                        to="/services"
                                        sx={{
                                            px: 4,
                                            py: 1.5,
                                            borderRadius: 3,
                                            fontSize: { xs: '0.9rem', sm: '1rem' },
                                        }}
                                    >
                                        View Our Tools
                                    </Button>
                                </Stack>
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <Card
                                    sx={{
                                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        p: 3,
                                    }}
                                >
                                    <Stack spacing={2}>
                                        {[
                                            { label: 'Projects Delivered', value: '50+' },
                                            { label: 'Client Satisfaction', value: '100%' },
                                            { label: 'Response Time', value: '< 24hrs' },
                                            { label: 'Technologies', value: '25+' },
                                        ].map((stat, idx) => (
                                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body1" color="text.secondary">{stat.label}</Typography>
                                                <Typography variant="h5" fontWeight={700} color="primary.main">{stat.value}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Card>
                            </motion.div>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Services Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
                <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <Typography variant="h3" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.5rem' } }}>
                        Our Services
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                        Expert development services tailored to your business needs
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {services.map((service, index) => (
                        <Grid item xs={6} sm={6} md={4} lg={3} key={service.title}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                whileHover={{ y: -8 }}
                            >
                                <Card
                                    sx={{
                                        height: '100%',
                                        minHeight: { xs: 260, sm: 300 },
                                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(30, 41, 59, 0.3) 100%)',
                                        backdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            borderColor: alpha(service.color, 0.4),
                                            boxShadow: `0 16px 48px -12px ${alpha(service.color, 0.3)}`,
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                                        <Box
                                            sx={{
                                                width: { xs: 48, sm: 60 },
                                                height: { xs: 48, sm: 60 },
                                                borderRadius: 2,
                                                background: alpha(service.color, 0.15),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: service.color,
                                                mb: 2,
                                                '& svg': {
                                                    fontSize: { xs: 28, sm: 36 },
                                                },
                                            }}
                                        >
                                            {service.icon}
                                        </Box>
                                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' } }}>
                                            {service.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 2,
                                                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                                                lineHeight: 1.5,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {service.desc}
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                                            {service.features.slice(0, 3).map((feature) => (
                                                <Chip
                                                    key={feature}
                                                    label={feature}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alpha(service.color, 0.1),
                                                        color: service.color,
                                                        fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                                        height: { xs: 20, sm: 24 },
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Process Section */}
            <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), py: { xs: 6, md: 10 } }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Typography variant="h3" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.5rem' } }}>
                            How We Work
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                            A streamlined process for delivering exceptional results
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {processSteps.map((step, index) => (
                            <Grid item xs={6} md={3} key={step.step}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.15 }}
                                >
                                    <Card
                                        sx={{
                                            height: '100%',
                                            minHeight: { xs: 180, sm: 220 },
                                            textAlign: 'center',
                                            p: { xs: 2, sm: 3 },
                                            background: 'transparent',
                                            border: '1px dashed',
                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                        }}
                                    >
                                        <Typography
                                            variant="h3"
                                            sx={{
                                                color: alpha(theme.palette.primary.main, 0.2),
                                                fontWeight: 900,
                                                mb: 1,
                                                fontSize: { xs: '2rem', sm: '3rem' },
                                            }}
                                        >
                                            {step.step}
                                        </Typography>
                                        <Box sx={{ color: 'primary.main', mb: 1 }}>{step.icon}</Box>
                                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' } }}>
                                            {step.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                            {step.desc}
                                        </Typography>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Contact Form Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }} id="contact">
                <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={5}>
                        <Typography variant="h3" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.5rem' } }}>
                            Ready to Start?
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                            Tell us about your project and get a free quote within 24 hours.
                        </Typography>
                        <Stack spacing={2}>
                            {[
                                'No upfront payment required',
                                'Free project consultation',
                                'Transparent pricing',
                                'Satisfaction guaranteed'
                            ].map((item) => (
                                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                    <Typography variant="body1">{item}</Typography>
                                </Box>
                            ))}
                        </Stack>

                        <Divider sx={{ my: 3 }} />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Email sx={{ color: 'primary.main' }} />
                            <Typography variant="body1">contact@expectexception.com</Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={7}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 3, sm: 4 },
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.3) 0%, rgba(30, 41, 59, 0.1) 100%)',
                            }}
                        >
                            <form onSubmit={handleSubmit}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            required
                                            fullWidth
                                            label="Your Name"
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
                                            label="Email Address"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            variant="outlined"
                                            disabled={isSubmitting}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Project Type"
                                            name="projectType"
                                            placeholder="e.g., Web App, Chatbot, ML Model"
                                            value={formData.projectType}
                                            onChange={handleChange}
                                            variant="outlined"
                                            disabled={isSubmitting}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Budget Range"
                                            name="budget"
                                            placeholder="e.g., $500-$1000"
                                            value={formData.budget}
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
                                            label="Project Details"
                                            name="message"
                                            placeholder="Describe your project requirements..."
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
                                            fullWidth
                                            disabled={isSubmitting}
                                            endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                                fontWeight: 700,
                                                fontSize: { xs: '0.9rem', sm: '1rem' },
                                            }}
                                        >
                                            {isSubmitting ? 'Sending...' : 'Send Project Inquiry'}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>

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
        </Box>
    );
};

export default HirePage;
