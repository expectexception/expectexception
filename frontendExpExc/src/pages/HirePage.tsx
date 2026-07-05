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
import { RocketBadgeSvg } from '../components/layout/AnimatedSvgs';
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
    const primaryColor = theme.palette.primary.main;
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
            color: primaryColor,
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
            color: theme.palette.secondary.main,
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
            color: '#a855f7',
        },
        {
            title: 'Mobile App Development',
            icon: <PhoneAndroid sx={{ fontSize: 40 }} />,
            desc: 'Cross-platform mobile apps with React Native or Flutter. Native-like performance on iOS and Android.',
            features: ['React Native', 'Flutter', 'iOS & Android', 'App Store Deployment'],
            color: '#ec4899',
        },
        {
            title: 'Cloud & DevOps',
            icon: <CloudQueue sx={{ fontSize: 40 }} />,
            desc: 'Cloud infrastructure setup, CI/CD pipelines, containerization, and Kubernetes deployment.',
            features: ['AWS/GCP/Azure', 'Docker/K8s', 'CI/CD Pipelines', 'Infrastructure as Code'],
            color: '#0ea5e9',
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
        <Box sx={{ minHeight: '100vh', pb: 8, bgcolor: '#050505' }}>
            <Seo
                title="Hire a Developer - Expert ML, Python & Full-Stack Engineers"
                description="Hire experienced developers for frontend, backend, full-stack, mobile apps, AI chatbots, ML model training, and cloud solutions. Fast delivery, transparent pricing, professional results."
                keywords={['hire developer', 'freelance developer', 'ml engineer', 'chatbot developer', 'full-stack developer', 'python development', 'react developer', 'ai development', 'mobile app developer', 'cloud engineer']}
            />

            {/* Hero Section */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${alpha(primaryColor, 0.08)} 0%, transparent 100%)`,
                    py: { xs: 8, md: 12 },
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Ambient glow */}
                <Box sx={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-10%',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(primaryColor, 0.08)} 0%, transparent 70%)`,
                    filter: 'blur(40px)',
                    pointerEvents: 'none',
                }} />

                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                    <Grid container spacing={6} alignItems="center">
                        <Grid item xs={12} md={7.5}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <Chip
                                    icon={<RocketBadgeSvg />}
                                    label="Available for Projects"
                                    sx={{
                                        bgcolor: alpha(primaryColor, 0.1),
                                        color: primaryColor,
                                        borderColor: alpha(primaryColor, 0.2),
                                        borderWidth: 1,
                                        borderStyle: 'solid',
                                        fontWeight: 700,
                                        mb: 3,
                                        '& .MuiChip-icon': { color: primaryColor, ml: '10px' },
                                    }}
                                />
                                <Typography
                                    variant="h2"
                                    component="h1"
                                    gutterBottom
                                    fontWeight="900"
                                    sx={{
                                        background: `linear-gradient(135deg, #ffffff 30%, ${primaryColor} 100%)`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontSize: { xs: '2.2rem', sm: '3rem', md: '4rem' },
                                        lineHeight: 1.1,
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Hire Expert Developers
                                </Typography>
                                <Typography
                                    variant="h5"
                                    color="text.secondary"
                                    sx={{ mb: 5, fontSize: { xs: '1.05rem', sm: '1.25rem' }, fontWeight: 400, lineHeight: 1.6 }}
                                >
                                    We build frontends, backends, and the AI features in between. If you have a project in mind, tell us about it and we'll figure out the fastest path to shipping it.
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        endIcon={<ArrowForward />}
                                        href="#contact"
                                        sx={{
                                            px: 4,
                                            py: 1.75,
                                            borderRadius: '30px',
                                            fontWeight: 800,
                                            fontSize: '0.95rem',
                                            background: primaryColor,
                                            color: '#000000',
                                            '&:hover': {
                                                background: alpha(primaryColor, 0.9),
                                                boxShadow: `0 8px 25px ${alpha(primaryColor, 0.4)}`,
                                            }
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
                                            py: 1.75,
                                            borderRadius: '30px',
                                            fontSize: '0.95rem',
                                            borderColor: 'rgba(255, 255, 255, 0.15)',
                                            color: '#ffffff',
                                            '&:hover': {
                                                borderColor: primaryColor,
                                                color: primaryColor,
                                                bgcolor: alpha(primaryColor, 0.03),
                                            }
                                        }}
                                    >
                                        View Our Tools
                                    </Button>
                                </Stack>
                              </motion.div>
                        </Grid>
                        <Grid item xs={12} md={4.5}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <Card
                                    sx={{
                                        background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.6) 0%, rgba(13, 14, 18, 0.2) 100%)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        p: 4,
                                        borderRadius: 4,
                                        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
                                    }}
                                >
                                    <Stack spacing={3}>
                                        {[
                                            { label: 'Projects Delivered', value: '50+' },
                                            { label: 'Client Satisfaction', value: '100%' },
                                            { label: 'Response Time', value: '< 24hrs' },
                                            { label: 'Technologies', value: '25+' },
                                        ].map((stat, idx) => (
                                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body1" color="text.secondary" fontWeight="550">{stat.label}</Typography>
                                                <Typography variant="h5" fontWeight={800} color="primary.main">{stat.value}</Typography>
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
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '2rem', sm: '2.75rem' }, letterSpacing: '-0.02em' }}>
                        Our Development Services
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: { xs: '1rem', sm: '1.2rem' }, fontWeight: 400 }}>
Pick one, or combine a few — most projects end up touching more than one of these.
                    </Typography>
                </Box>

                <Grid container spacing={3.5}>
                    {services.map((service, index) => (
                        <Grid item xs={12} sm={6} md={3} key={service.title}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                whileHover={{ y: -6 }}
                            >
                                <Card
                                    sx={{
                                        height: '100%',
                                        minHeight: 280,
                                        background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.5) 0%, rgba(13, 14, 18, 0.2) 100%)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            borderColor: alpha(service.color, 0.35),
                                            boxShadow: `0 16px 40px -12px ${alpha(service.color, 0.2)}`,
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Box
                                            sx={{
                                                width: 52,
                                                height: 52,
                                                borderRadius: 2,
                                                background: alpha(service.color, 0.1),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: service.color,
                                                mb: 3,
                                                '& svg': {
                                                    fontSize: 32,
                                                },
                                            }}
                                        >
                                            {service.icon}
                                        </Box>
                                        <Typography variant="h6" fontWeight="800" gutterBottom sx={{ fontSize: '1.1rem' }}>
                                            {service.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 3,
                                                fontSize: '0.825rem',
                                                lineHeight: 1.6,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {service.desc}
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.75}>
                                            {service.features.slice(0, 2).map((feature) => (
                                                <Chip
                                                    key={feature}
                                                    label={feature}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alpha(service.color, 0.08),
                                                        color: service.color,
                                                        fontSize: '0.68rem',
                                                        fontWeight: 600,
                                                        height: 22,
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

            {/* Who We Work With Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
                <Box sx={{ textAlign: 'center', mb: 7 }}>
                    <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Who This Is For
                    </Typography>
                    <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, letterSpacing: '-0.02em' }}>
                        Not sure if we're a fit? Here's who usually reaches out.
                    </Typography>
                </Box>

                <Grid container spacing={3.5}>
                    {[
                        {
                            icon: <Rocket sx={{ fontSize: 30 }} />,
                            title: 'Founders validating an idea',
                            desc: "You need a working product to show users or investors, not a slide deck. We scope down to what actually needs to exist for a first version and build that.",
                            color: primaryColor,
                        },
                        {
                            icon: <IntegrationInstructions sx={{ fontSize: 30 }} />,
                            title: 'Agencies needing extra hands',
                            desc: 'A deadline is close and the team is stretched thin. We can slot into an existing codebase and ship a specific feature or module without a long ramp-up.',
                            color: theme.palette.secondary.main,
                        },
                        {
                            icon: <CloudQueue sx={{ fontSize: 30 }} />,
                            title: 'Small teams drowning in manual work',
                            desc: "Some process is still done by hand in a spreadsheet or over email. We build the automation or internal tool that gets it off someone's plate.",
                            color: '#a855f7',
                        },
                        {
                            icon: <SmartToy sx={{ fontSize: 30 }} />,
                            title: 'Products that want to add AI',
                            desc: 'You know you want an AI feature — a chatbot, a classifier, a content pipeline — but not exactly how to wire it into what already exists. That integration work is what we do most.',
                            color: '#f97316',
                        },
                    ].map((persona, idx) => (
                        <Grid item xs={12} sm={6} md={3} key={persona.title}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.08 }}
                            >
                                <Card sx={{
                                    height: '100%',
                                    minHeight: 220,
                                    p: 3,
                                    background: 'rgba(13, 14, 18, 0.4)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'border-color 0.3s ease',
                                    '&:hover': { borderColor: alpha(persona.color, 0.3) },
                                }}>
                                    <Box sx={{
                                        width: 52, height: 52, borderRadius: 2,
                                        bgcolor: alpha(persona.color, 0.1),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: persona.color, mb: 2.5,
                                    }}>
                                        {persona.icon}
                                    </Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5, fontSize: '1.05rem' }}>
                                        {persona.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                                        {persona.desc}
                                    </Typography>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Process Section */}
            <Box sx={{ bgcolor: '#08090d', py: { xs: 8, md: 12 }, borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 8 }}>
                        <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '2rem', sm: '2.75rem' }, letterSpacing: '-0.02em' }}>
                            How We Work
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, fontWeight: 400 }}>
                            No lengthy onboarding — a short call, a written scope, then we start building.
                        </Typography>
                    </Box>

                    <Grid container spacing={4}>
                        {processSteps.map((step, index) => (
                            <Grid item xs={12} sm={6} md={3} key={step.step}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.15 }}
                                >
                                    <Card
                                        sx={{
                                            height: '100%',
                                            minHeight: 200,
                                            textAlign: 'center',
                                            p: 3.5,
                                            background: 'rgba(13, 14, 18, 0.3)',
                                            border: '1px dashed',
                                            borderColor: alpha(primaryColor, 0.2),
                                        }}
                                    >
                                        <Typography
                                            variant="h2"
                                            sx={{
                                                color: alpha(primaryColor, 0.2),
                                                fontWeight: 900,
                                                mb: 1.5,
                                                fontSize: '3rem',
                                            }}
                                        >
                                            {step.step}
                                        </Typography>
                                        <Box sx={{ color: 'primary.main', mb: 1.5, display: 'flex', justifyContent: 'center' }}>{step.icon}</Box>
                                        <Typography variant="h6" fontWeight="800" gutterBottom sx={{ fontSize: '1.05rem' }}>
                                            {step.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
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
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }} id="contact">
                <Grid container spacing={6} alignItems="center">
                    <Grid item xs={12} md={5}>
                        <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '2rem', sm: '2.75rem' }, letterSpacing: '-0.02em' }}>
                            Ready to Start?
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontSize: { xs: '1rem', sm: '1.15rem' }, fontWeight: 400, lineHeight: 1.6 }}>
                            Tell us about your project and receive a comprehensive proposal within 24 hours.
                        </Typography>
                        <Stack spacing={2.5}>
                          {[
                              'No upfront payment required',
                              'Free project consultation & scoping call',
                              'Transparent milestone-based pricing',
                              'Clean code and satisfaction guaranteed'
                          ].map((item) => (
                              <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                                  <Typography variant="body1" fontWeight="600" color="#ffffff">{item}</Typography>
                              </Box>
                          ))}
                        </Stack>

                        <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.05)' }} />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Email sx={{ color: 'primary.main' }} />
                            <Typography variant="body1" fontWeight="500">contact@expectexception.com</Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={7}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 3, md: 5 },
                                borderRadius: 4,
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.6) 0%, rgba(13, 14, 18, 0.2) 100%)',
                            }}
                        >
                            <form onSubmit={handleSubmit}>
                                <Grid container spacing={3}>
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
                                            placeholder="e.g., $1000-$5000"
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
                                            rows={5}
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
                                                py: 1.75,
                                                borderRadius: '30px',
                                                background: primaryColor,
                                                color: '#000000',
                                                fontWeight: 800,
                                                fontSize: '0.95rem',
                                                '&:hover': {
                                                    background: theme.palette.primary.light,
                                                    boxShadow: `0 8px 25px ${alpha(primaryColor, 0.4)}`,
                                                }
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
