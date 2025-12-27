import React, { useState, useEffect } from 'react';
import Seo from '../components/seo/Seo';
import {
    Container,
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Grid,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    IconButton,
    InputAdornment,
    Alert,
    Fade,
    Paper,
} from '@mui/material';
import {
    Lock,
    AccessTime,
    ContentCopy,
    Visibility,
    Security,
    CheckCircle,
    LocalFireDepartment,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

const SecretSharerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Create Mode State
    const [secret, setSecret] = useState('');
    const [expiration, setExpiration] = useState('24');
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    // View Mode State
    const [viewing, setViewing] = useState(!!id);
    const [revealedContent, setRevealedContent] = useState('');
    const [burnState, setBurnState] = useState<'initial' | 'burning' | 'destroyed'>('initial');
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            setViewing(true);
        } else {
            setViewing(false);
            setGeneratedLink('');
            setSecret('');
        }
    }, [id]);

    const handleCreate = async () => {
        if (!secret.trim()) return;

        setLoading(true);
        try {
            const response = await apiClient.post(endpoints.services.secretSharer.create, {
                content: secret,
                expiration: parseInt(expiration),
            });

            // Build absolute URL
            const startUrl = window.location.origin + '/services/secret-sharer/' + response.data.id;
            setGeneratedLink(startUrl);
            setSecret(''); // Clear sensitive data from memory immediately
        } catch (err) {
            console.error(err);
            setError('Failed to create secret. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReveal = async () => {
        if (!id) return;
        setLoading(true);
        setError('');

        try {
            // @ts-ignore
            const response = await apiClient.get(endpoints.services.secretSharer.view(id));
            setRevealedContent(response.data.content);
            setBurnState('burning');
        } catch (err: any) {
            setBurnState('destroyed');
            if (err.response && err.response.status === 410) {
                setError('This secret has expired.');
            } else if (err.response && err.response.status === 404) {
                setError('Secret not found or already viewed.');
            } else {
                setError('Failed to retrieve secret.');
            }
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Render View Mode (Recipient)
    if (viewing) {
        return (
            <Container maxWidth="md" sx={{ py: 12, minHeight: '80vh' }}>
                <Seo
                    title="View Secure Secret | One-Time Sharer"
                    description="View a secure, self-destructing message."
                    keywords={[]}
                />

                <Box textAlign="center" mb={6}>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                    >
                        <Lock sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                        <Typography variant="h3" fontWeight={800} gutterBottom>
                            Secure Message
                        </Typography>
                    </motion.div>
                </Box>

                <Card sx={{
                    position: 'relative',
                    overflow: 'visible',
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
                }}>
                    <CardContent sx={{ p: 6, minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                        {/* Initial Curtain */}
                        {burnState === 'initial' && !error && (
                            <Box textAlign="center">
                                <Alert severity="warning" sx={{ mb: 4, textAlign: 'left' }}>
                                    Warning: This message will self-destruct immediately after viewing.
                                    Do not reload the page or close the tab until you have saved the content.
                                </Alert>
                                <Button
                                    variant="contained"
                                    color="error"
                                    size="large"
                                    onClick={handleReveal}
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Visibility />}
                                    sx={{ py: 2, px: 6, fontSize: '1.2rem', borderRadius: 50 }}
                                >
                                    {loading ? 'Decrypting...' : 'View Secret'}
                                </Button>
                            </Box>
                        )}

                        {/* Revealed Content */}
                        {burnState === 'burning' && revealedContent && (
                            <motion.div
                                initial={{ opacity: 0, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, filter: 'blur(0px)' }}
                                transition={{ duration: 0.5 }}
                                style={{ width: '100%' }}
                            >
                                <Alert severity="error" icon={<LocalFireDepartment />} sx={{ mb: 3 }}>
                                    This message has been permanently deleted from the server.
                                </Alert>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        bgcolor: 'rgba(0,0,0,0.05)',
                                        border: '1px dashed #666',
                                        borderRadius: 2,
                                        fontFamily: 'monospace',
                                        fontSize: '1.1rem',
                                        wordBreak: 'break-all',
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {revealedContent}
                                </Paper>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    sx={{ mt: 3 }}
                                    onClick={() => navigate('/services/secret-sharer')}
                                >
                                    Create New Secret
                                </Button>
                            </motion.div>
                        )}

                        {/* Error / Destroyed State */}
                        {(error || burnState === 'destroyed') && (
                            <Box textAlign="center">
                                <Security sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h5" color="text.secondary" gutterBottom>
                                    Message Unavailable
                                </Typography>
                                <Typography color="text.disabled" sx={{ mb: 4 }}>
                                    {error || 'This secret has already been viewed and destroyed.'}
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={() => navigate('/services/secret-sharer')}
                                >
                                    Create New Secret
                                </Button>
                            </Box>
                        )}

                    </CardContent>
                </Card>
            </Container>
        );
    }

    // Render Create Mode (Sender)
    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Seo
                title="Create One-Time Secret | Secure Sharing"
                description="Share passwords and sensitive data securely with self-destructing links."
                keywords={['secret', 'password share', 'encrypt', 'one time link']}
            />

            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography variant="h2" gutterBottom sx={{ fontWeight: 800 }}>
                    One-Time <span style={{ color: '#f44336' }}>Secret</span>
                </Typography>
                <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
                    Paste a password or secret message below. We'll generate a secure link that only works once, then vanishes forever.
                </Typography>
            </Box>

            <Grid container spacing={4} justifyContent="center">
                <Grid item xs={12} md={8}>
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                    >
                        <Card sx={{
                            borderRadius: 4,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                            p: 2
                        }}>
                            <CardContent>
                                {!generatedLink ? (
                                    <>
                                        <TextField
                                            fullWidth
                                            multiline
                                            minRows={6}
                                            maxRows={12}
                                            placeholder="Paste your sensitive data here..."
                                            value={secret}
                                            onChange={(e) => setSecret(e.target.value)}
                                            sx={{
                                                mb: 3,
                                                bgcolor: 'background.paper',
                                                '& .MuiOutlinedInput-root': { borderRadius: 2 }
                                            }}
                                        />

                                        <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
                                            <Grid item xs={12} sm={6}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Expires In</InputLabel>
                                                    <Select
                                                        value={expiration}
                                                        label="Expires In"
                                                        onChange={(e) => setExpiration(e.target.value)}
                                                    >
                                                        <MenuItem value="1">1 Hour</MenuItem>
                                                        <MenuItem value="24">24 Hours</MenuItem>
                                                        <MenuItem value="168">7 Days</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    (If not viewed, it will be deleted after this time)
                                                </Typography>
                                            </Grid>
                                        </Grid>

                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            color="error"
                                            onClick={handleCreate}
                                            disabled={loading || !secret}
                                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Lock />}
                                            sx={{ py: 2, borderRadius: 3, fontSize: '1.1rem' }}
                                        >
                                            {loading ? 'Encrypting...' : 'Create Secret Link'}
                                        </Button>
                                    </>
                                ) : (
                                    <Box textAlign="center" py={4}>
                                        <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                                        <Typography variant="h5" gutterBottom>Secret Created!</Typography>
                                        <Typography color="text.secondary" paragraph>
                                            Share this link. It will self-destruct after being viewed once.
                                        </Typography>

                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            bgcolor: 'background.paper',
                                            p: 1,
                                            borderRadius: 2,
                                            border: '1px solid #eee',
                                            mb: 3
                                        }}>
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    flexGrow: 1,
                                                    mr: 2,
                                                    fontFamily: 'monospace',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                {generatedLink}
                                            </Typography>
                                            <Button
                                                variant={copied ? "contained" : "outlined"}
                                                color={copied ? "success" : "primary"}
                                                onClick={copyToClipboard}
                                                startIcon={<ContentCopy />}
                                            >
                                                {copied ? "Copied" : "Copy"}
                                            </Button>
                                        </Box>

                                        <Button color="inherit" onClick={() => setGeneratedLink('')}>
                                            Create Another
                                        </Button>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>
        </Container>
    );
};

export default SecretSharerPage;
