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
    Tabs,
    Tab,
} from '@mui/material';
import {
    Lock,
    AccessTime,
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
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

const SecretSharerPage: React.FC = () => {
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
        } else {
            setViewing(false);
            setGeneratedLink('');
            setSecret('');
            setFile(null);
            setActiveTab(0);
        }
    }, [id]);

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
            <Container maxWidth="md" sx={{ py: 12, minHeight: '80vh' }}>
                <Seo title="View Secure Secret" description="View a secure, self-destructing message." />

                <Box textAlign="center" mb={6}>
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <Lock sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                        <Typography variant="h3" fontWeight={800} gutterBottom>Secure {type === 'file' ? 'File' : 'Message'}</Typography>
                    </motion.div>
                </Box>

                <Card sx={{
                    borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    overflow: 'hidden'
                }}>
                    <CardContent sx={{ p: 6, minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                        {/* Initial Curtain */}
                        {burnState === 'initial' && !error && (
                            <Box textAlign="center">
                                <Alert severity="warning" sx={{ mb: 4, textAlign: 'left' }}>
                                    Warning: This {type === 'file' ? 'file' : 'message'} wll self-destruct immediately after {type === 'file' ? 'downloading' : 'viewing'}.
                                    {type === 'file' ? ' Please ensure your download completes.' : ' Do not reload the page until saved.'}
                                </Alert>
                                <Button
                                    variant="contained" color="error" size="large" onClick={handleReveal} disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Visibility />}
                                    sx={{ py: 2, px: 6, fontSize: '1.2rem', borderRadius: 50 }}
                                >
                                    {loading ? 'Decrypting...' : (type === 'file' ? 'Unlock & Download File' : 'View Secret')}
                                </Button>
                            </Box>
                        )}

                        {/* Revealed Content */}
                        {burnState === 'burning' && (
                            <motion.div initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.5 }} style={{ width: '100%' }}>
                                <Alert severity="error" icon={<LocalFireDepartment />} sx={{ mb: 3 }}>
                                    This secret has been wiped from the server.
                                </Alert>

                                {type === 'file' && revealedFile ? (
                                    <Box textAlign="center" py={4}>
                                        <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                                        <Typography variant="h5" gutterBottom>File Decrypted!</Typography>
                                        <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 3 }}>{revealedFile.name}</Typography>
                                        <Button variant="contained" size="large" onClick={downloadFile} startIcon={<GetApp />}>
                                            Download Again (Cached)
                                        </Button>
                                    </Box>
                                ) : (
                                    <Paper elevation={0} sx={{ p: 4, bgcolor: 'rgba(0,0,0,0.05)', border: '1px dashed #666', borderRadius: 2, fontFamily: 'monospace', fontSize: '1.1rem', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                                        {revealedContent}
                                    </Paper>
                                )}

                                <Button fullWidth variant="outlined" sx={{ mt: 3 }} onClick={() => navigate('/services/secret-sharer')}>
                                    Create New Secret
                                </Button>
                            </motion.div>
                        )}

                        {/* Error / Destroyed State */}
                        {(error || burnState === 'destroyed') && (
                            <Box textAlign="center">
                                <Security sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h5" color="text.secondary" gutterBottom>Message Unavailable</Typography>
                                <Typography color="text.disabled" sx={{ mb: 4 }}>{error || 'This secret has already been viewed and destroyed.'}</Typography>
                                <Button variant="contained" onClick={() => navigate('/services/secret-sharer')}>Create New Secret</Button>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Container>
        );
    }

    // Render Create Mode
    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Seo title="Create One-Time Secret" description="Share passwords and files securely." />

            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography variant="h2" gutterBottom sx={{ fontWeight: 800 }}>One-Time <span style={{ color: '#f44336' }}>Secret</span></Typography>
                <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
                    Share sensitive data securely. Links self-destruct after one use.
                </Typography>
            </Box>

            <Grid container spacing={4} justifyContent="center">
                <Grid item xs={12} md={8}>
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <Card sx={{ borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', p: 2 }}>
                            <CardContent>
                                {!generatedLink ? (
                                    <>
                                        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth" sx={{ mb: 3 }}>
                                            <Tab icon={<ShortText />} label="Text" />
                                            <Tab icon={<AttachFile />} label="File (Max 50MB)" />
                                        </Tabs>

                                        {activeTab === 0 ? (
                                            <TextField
                                                fullWidth multiline minRows={6} maxRows={12}
                                                placeholder="Paste your sensitive data here..."
                                                value={secret} onChange={(e) => setSecret(e.target.value)}
                                                sx={{ mb: 3, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 2, p: 4, mb: 3, textAlign: 'center', cursor: 'pointer',
                                                    bgcolor: 'rgba(0,0,0,0.1)', '&:hover': { bgcolor: 'rgba(0,0,0,0.2)' }
                                                }}
                                                onClick={() => document.getElementById('file-upload')?.click()}
                                            >
                                                <input
                                                    id="file-upload" type="file" hidden
                                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                                />
                                                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                                <Typography variant="h6">{file ? file.name : 'Click to Upload File'}</Typography>
                                                <Typography variant="caption" color="text.secondary">Max 50MB. Encrypted locally.</Typography>
                                            </Box>
                                        )}

                                        <FormControl fullWidth size="small" sx={{ mb: 4 }}>
                                            <InputLabel>Expires In</InputLabel>
                                            <Select value={expiration} label="Expires In" onChange={(e) => setExpiration(e.target.value)}>
                                                <MenuItem value="1">1 Hour</MenuItem>
                                                <MenuItem value="24">24 Hours</MenuItem>
                                                <MenuItem value="168">7 Days</MenuItem>
                                            </Select>
                                        </FormControl>

                                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                                        <Button
                                            fullWidth variant="contained" size="large" color="error"
                                            onClick={handleCreate} disabled={loading || (activeTab === 0 && !secret) || (activeTab === 1 && !file)}
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
                                        <Typography color="text.secondary" paragraph>Share this link. It will self-destruct after beinig used.</Typography>

                                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.paper', p: 1, borderRadius: 2, border: '1px solid #eee', mb: 3 }}>
                                            <Typography variant="body1" sx={{ flexGrow: 1, mr: 2, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {generatedLink}
                                            </Typography>
                                            <Button variant={copied ? "contained" : "outlined"} color={copied ? "success" : "primary"} onClick={copyToClipboard} startIcon={<ContentCopy />}>
                                                {copied ? "Copied" : "Copy"}
                                            </Button>
                                        </Box>

                                        <Button color="inherit" onClick={() => { setGeneratedLink(''); setFile(null); setSecret(''); }}>Create Another</Button>
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
