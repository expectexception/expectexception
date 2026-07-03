import React, { useState, useEffect } from 'react';
import Seo from '../components/seo/Seo';
import {
    Container,
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    Paper,
    Tabs,
    Tab,
    useTheme,
} from '@mui/material';
import {
    Lock,
    ContentCopy,
    Visibility,
    Security,
    CheckCircle,
    LocalFireDepartment,
    ShortText,
    AttachFile,
    CloudUpload,
    GetApp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import ServicePageShell from '../components/services/ServicePageShell';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

const SecretSharerPage: React.FC = () => {
    const theme = useTheme();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(window.location.search);
    const type = queryParams.get('type') || 'text';

    // Create Mode State
    const [activeTab, setActiveTab] = useState(0); // 0: Text, 1: File
    const [secret, setSecret] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [expiration, setExpiration] = useState('24');
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    // View Mode State
    const [viewing, setViewing] = useState(!!id);
    const [revealedContent, setRevealedContent] = useState('');
    const [revealedFile, setRevealedFile] = useState<{ name: string, blob: Blob } | null>(null);
    const [burnState, setBurnState] = useState<'initial' | 'burning' | 'destroyed'>('initial');
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            setViewing(true);
            // Proactive check: does this secret even exist?
            const checkExistence = async () => {
                try {
                    if (type === 'file') {
                        // @ts-ignore
                        await apiClient.head(endpoints.services.secretSharer.viewFile(id));
                    } else {
                        // @ts-ignore
                        await apiClient.head(endpoints.services.secretSharer.view(id));
                    }
                } catch (err: any) {
                    // If check fails (404/410), show error immediately
                    if (err.response && (err.response.status === 404 || err.response.status === 410)) {
                        setBurnState('destroyed');
                        setError('This secret has expired or does not exist.');
                    }
                }
            };
            checkExistence();
        } else {
            setViewing(false);
            setGeneratedLink('');
            setSecret('');
            setFile(null);
            setActiveTab(0);
        }
    }, [id, type]);

    const handleCreate = async () => {
        if (activeTab === 0 && !secret.trim()) return;
        if (activeTab === 1 && !file) return;

        setLoading(true);
        try {
            let response;
            let urlType = 'text';

            if (activeTab === 0) {
                response = await apiClient.post(endpoints.services.secretSharer.create, {
                    content: secret,
                    expiration: parseInt(expiration),
                });
            } else {
                urlType = 'file';
                const formData = new FormData();
                if (file) formData.append('file', file);
                formData.append('expiration', expiration);
                // @ts-ignore
                response = await apiClient.post(endpoints.services.secretSharer.createFile, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            // Build absolute URL
            const startUrl = window.location.origin + '/services/secret-sharer/' + response.data.id + (urlType === 'file' ? '?type=file' : '');
            setGeneratedLink(startUrl);
            setSecret('');
            setFile(null);
        } catch (err: any) {
            console.error(err);
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Failed to create secret. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReveal = async () => {
        if (!id) return;
        setLoading(true);
        setError('');

        try {
            if (type === 'file') {
                // @ts-ignore
                const response = await apiClient.get(endpoints.services.secretSharer.viewFile(id), { responseType: 'blob' });

                // Extract filename from header or default
                const disposition = response.headers['content-disposition'];
                let filename = 'secret-file';
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }

                setRevealedFile({ name: filename, blob: response.data });
                setBurnState('burning');
            } else {
                // @ts-ignore
                const response = await apiClient.get(endpoints.services.secretSharer.view(id));
                setRevealedContent(response.data.content);
                setBurnState('burning');
            }
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

    const downloadFile = () => {
        if (!revealedFile) return;
        const url = window.URL.createObjectURL(revealedFile.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = revealedFile.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Render View Mode
    if (viewing) {
        return (
            <Container maxWidth="md" sx={{ py: { xs: 6, sm: 8 }, minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Seo title="View Secure Secret" description="View a secure, self-destructing message." />

                <Box textAlign="center" mb={4}>
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <Lock sx={{ fontSize: 64, color: 'primary.main', mb: 1.5, filter: `drop-shadow(0 0 15px ${theme.palette.primary.main}66)` }} />
                        <Typography variant="h4" component="h1" sx={{
                            fontWeight: 900,
                            background: `linear-gradient(135deg, #ffffff 30%, ${theme.palette.primary.main} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.02em',
                        }}>
                            Secure {type === 'file' ? 'File' : 'Message'}
                        </Typography>
                    </motion.div>
                </Box>

                <Card sx={{
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    overflow: 'hidden'
                }}>
                    <CardContent sx={{ p: { xs: 3, sm: 4 }, minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                        {/* Initial Curtain */}
                        {burnState === 'initial' && !error && (
                            <Box textAlign="center" sx={{ width: '100%' }}>
                                <Alert severity="warning" variant="filled" sx={{ mb: 3, textAlign: 'left', borderRadius: '12px' }}>
                                    Warning: This {type === 'file' ? 'file' : 'message'} will self-destruct immediately after {type === 'file' ? 'downloading' : 'viewing'}.
                                    {type === 'file' ? ' Please ensure your download completes.' : ' Do not reload the page until saved.'}
                                </Alert>
                                <Button
                                    variant="contained" color="error" size="large" onClick={handleReveal} disabled={loading}
                                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Visibility />}
                                    sx={{ py: 1.5, px: 6, fontSize: '1.1rem', borderRadius: '10px', fontWeight: 700 }}
                                >
                                    {loading ? 'Decrypting...' : (type === 'file' ? 'Unlock & Download File' : 'View Secret')}
                                </Button>
                            </Box>
                        )}

                        {/* Revealed Content */}
                        {burnState === 'burning' && (
                            <motion.div initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.5 }} style={{ width: '100%' }}>
                                <Alert severity="error" icon={<LocalFireDepartment />} variant="filled" sx={{ mb: 3, borderRadius: '12px' }}>
                                    This secret has been wiped from the server.
                                </Alert>

                                {type === 'file' && revealedFile ? (
                                    <Box textAlign="center" py={3}>
                                        <CheckCircle sx={{ fontSize: 56, color: 'success.main', mb: 1.5 }} />
                                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>File Decrypted!</Typography>
                                        <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2.5, color: 'primary.main' }}>{revealedFile.name}</Typography>
                                        <Button variant="contained" size="large" onClick={downloadFile} startIcon={<GetApp />} sx={{ borderRadius: '10px', fontWeight: 700 }}>
                                            Download Again (Cached)
                                        </Button>
                                    </Box>
                                ) : (
                                    <Paper elevation={0} sx={{
                                        p: 3,
                                        bgcolor: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        fontFamily: 'monospace',
                                        fontSize: '1.05rem',
                                        color: '#ffffff',
                                        wordBreak: 'break-all',
                                        whiteSpace: 'pre-wrap',
                                        maxHeight: '40vh',
                                        overflowY: 'auto',
                                    }}>
                                        {revealedContent}
                                    </Paper>
                                )}

                                <Button fullWidth variant="outlined" sx={{ mt: 3, py: 1.2, borderRadius: '10px' }} onClick={() => navigate('/services/secret-sharer')}>
                                    Create New Secret
                                </Button>
                            </motion.div>
                        )}

                        {/* Error / Destroyed State */}
                        {(error || burnState === 'destroyed') && (
                            <Box textAlign="center">
                                <Security sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
                                <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontWeight: 700 }}>Message Unavailable</Typography>
                                <Typography color="text.disabled" sx={{ mb: 3 }}>{error || 'This secret has already been viewed and destroyed.'}</Typography>
                                <Button variant="contained" onClick={() => navigate('/services/secret-sharer')} sx={{ borderRadius: '10px', fontWeight: 700 }}>
                                    Create New Secret
                                </Button>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Container>
        );
    }

    // Render Create Mode
    return (
        <ServicePageShell
            icon={Security}
            title="One-Time Secret"
            subtitle="Share sensitive data securely. Links self-destruct after one use."
            maxWidth="sm"
        >
            <Seo
                title="Create One-Time Secret"
                description="Share passwords and files securely with self-destructing links. Encrypted, private, and permanent deletion after viewing."
                toolId={4}
            />

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex' }}>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ width: '100%' }}>
                    <Card sx={{
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(13, 14, 18, 0.4)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                        p: 2
                    }}>
                        <CardContent>
                            {!generatedLink ? (
                                <>
                                    <Tabs
                                        value={activeTab}
                                        onChange={(e, v) => setActiveTab(v)}
                                        variant="fullWidth"
                                        sx={{
                                            mb: 3,
                                            '& .MuiTab-root': {
                                                fontWeight: 700,
                                                fontSize: '1rem',
                                                color: 'text.secondary',
                                                '&.Mui-selected': {
                                                    color: 'primary.main'
                                                }
                                            },
                                            '& .MuiTabs-indicator': {
                                                backgroundColor: theme.palette.primary.main
                                            }
                                        }}
                                    >
                                        <Tab icon={<ShortText />} label="Text" iconPosition="start" sx={{ minHeight: '48px' }} />
                                        <Tab icon={<AttachFile />} label="File (Max 50MB)" iconPosition="start" sx={{ minHeight: '48px' }} />
                                    </Tabs>

                                    {activeTab === 0 ? (
                                        <TextField
                                            fullWidth multiline minRows={4} maxRows={8}
                                            placeholder="Paste your sensitive data here..."
                                            value={secret} onChange={(e) => setSecret(e.target.value)}
                                            sx={{
                                                mb: 3,
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '12px',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                                                }
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                border: '2px dashed rgba(255, 255, 255, 0.1)',
                                                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                                                borderRadius: '16px',
                                                p: 4,
                                                mb: 3,
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    backgroundColor: (t) => `${t.palette.primary.main}0A`,
                                                    boxShadow: (t) => `0 0 20px ${t.palette.primary.main}0D`,
                                                }
                                            }}
                                            onClick={() => document.getElementById('file-upload')?.click()}
                                        >
                                            <input
                                                id="file-upload" type="file" hidden
                                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                            />
                                            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                                {file ? file.name : 'Click to Upload File'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">Max 50MB. Encrypted locally.</Typography>
                                        </Box>
                                    )}

                                    <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                                        <InputLabel>Expires In</InputLabel>
                                        <Select
                                            value={expiration}
                                            label="Expires In"
                                            onChange={(e) => setExpiration(e.target.value)}
                                            sx={{ borderRadius: '10px' }}
                                        >
                                            <MenuItem value="1">1 Hour</MenuItem>
                                            <MenuItem value="24">24 Hours</MenuItem>
                                            <MenuItem value="168">7 Days</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {error && <Alert severity="error" variant="filled" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

                                    <Button
                                        fullWidth variant="contained" size="large"
                                        onClick={handleCreate} disabled={loading || (activeTab === 0 && !secret) || (activeTab === 1 && !file)}
                                        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Lock />}
                                        sx={{ py: 1.5, borderRadius: '10px', fontWeight: 700 }}
                                    >
                                        {loading ? 'Encrypting...' : 'Create Secret Link'}
                                    </Button>
                                </>
                            ) : (
                                <Box textAlign="center" py={3}>
                                    <CheckCircle sx={{ fontSize: 56, color: 'success.main', mb: 1.5 }} />
                                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>Secret Created!</Typography>
                                    <Typography color="text.secondary" paragraph>Share this link. It will self-destruct after being used.</Typography>

                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        p: 1.5,
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        mb: 3
                                    }}>
                                        <Typography variant="body1" sx={{ flexGrow: 1, mr: 2, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', color: 'primary.main', textAlign: 'left', pl: 1 }}>
                                            {generatedLink}
                                        </Typography>
                                        <Button
                                            variant={copied ? "contained" : "outlined"}
                                            color={copied ? "success" : "primary"}
                                            onClick={copyToClipboard}
                                            startIcon={<ContentCopy />}
                                            sx={{ borderRadius: '8px' }}
                                        >
                                            {copied ? "Copied" : "Copy"}
                                        </Button>
                                    </Box>

                                    <Button color="inherit" onClick={() => { setGeneratedLink(''); setFile(null); setSecret(''); }} sx={{ fontWeight: 700 }}>
                                        Create Another
                                    </Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </Box>
        </ServicePageShell>
    );
};

export default SecretSharerPage;
