import React, { useState, useCallback } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Stack,
    Alert,
    LinearProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    useTheme,
    alpha,
    Switch,
    FormControlLabel,
    Collapse,
    Tooltip,
} from '@mui/material';
import {
    PictureAsPdf,
    Description,
    CloudUpload,
    Download,
    CheckCircle,
    Error as ErrorIcon,
    Refresh,
    InsertDriveFile,
    ExpandMore,
    ExpandLess,
    Settings,
    Info,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient, { API_BASE_URL } from '../../api/config';
import { endpoints } from '../../api/endpoints';

interface ConversionResult {
    success: boolean;
    file_url: string;
    filename: string;
    original_name: string;
    format: string;
    original_size: number;
    converted_size: number;
    engine_used?: string;
    ocr_used?: boolean;
}

const PdfToDoc: React.FC = () => {
    const theme = useTheme();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [outputFormat, setOutputFormat] = useState('docx');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('Converting...');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ConversionResult | null>(null);
    const [dragActive, setDragActive] = useState(false);

    // Advanced options
    const [ocrEnabled, setOcrEnabled] = useState(false);
    const [ocrLanguage, setOcrLanguage] = useState('eng');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    const ocrLanguages = [
        { value: 'eng', label: 'English' },
        { value: 'ara', label: 'Arabic' },
        { value: 'fra', label: 'French' },
        { value: 'deu', label: 'German' },
        { value: 'spa', label: 'Spanish' },
        { value: 'hin', label: 'Hindi' },
        { value: 'chi_sim', label: 'Chinese (Simplified)' },
        { value: 'jpn', label: 'Japanese' },
    ];

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const validateAndSetFile = (file: File) => {
        setError(null);
        setResult(null);

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please upload a valid PDF file.');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError(`File too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`);
            return;
        }

        setSelectedFile(file);
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    }, []);

    const pollStatus = async (taskId: string) => {
        let attempts = 0;
        const maxAttempts = 120; // 4 minutes at 2s intervals
        const interval = setInterval(async () => {
            attempts++;
            try {
                // endpoints.services.pdfToDoc already has a trailing slash; avoid a double slash here.
                const res = await apiClient.get(`${endpoints.services.pdfToDoc}status/${taskId}/`);
                const { status: taskStatus, ...resultData } = res.data;
                // Celery's native AsyncResult.state is uppercase (PENDING/STARTED/SUCCESS/FAILURE);
                // our own cached result uses lowercase ('success'/'failed'). Normalize before comparing.
                const normalizedStatus = (taskStatus || '').toLowerCase();

                // Update progress label based on state
                if (attempts < 5) setProgressLabel('Uploading & queuing...');
                else if (ocrEnabled && attempts < 20) setProgressLabel('Running OCR (this may take a while)...');
                else setProgressLabel('Converting document...');

                if (normalizedStatus === 'success') {
                    clearInterval(interval);
                    setProgress(100);
                    setProgressLabel('Done!');
                    const fileUrl = resultData.file_url && !resultData.file_url.startsWith('http')
                        ? `${API_BASE_URL}${resultData.file_url}`
                        : resultData.file_url;
                    setResult({ ...resultData, file_url: fileUrl });
                    setLoading(false);
                } else if (normalizedStatus === 'failed' || normalizedStatus === 'failure') {
                    clearInterval(interval);
                    setError(resultData.error || 'Conversion process failed.');
                    setLoading(false);
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    setError('Conversion timed out. Please try again with a smaller file.');
                    setLoading(false);
                } else {
                    setProgress((prev) => Math.min(prev + (ocrEnabled ? 0.8 : 1.5), 90));
                }
            } catch (err) {
                console.error('Polling error', err);
                clearInterval(interval);
                setError('Lost connection while waiting for conversion result.');
                setLoading(false);
            }
        }, 2000);
    };

    const handleConvert = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setProgress(5);
        setProgressLabel(ocrEnabled ? 'Uploading & starting OCR...' : 'Uploading & converting...');

        const formData = new FormData();
        formData.append('pdf', selectedFile);
        formData.append('format', outputFormat);
        formData.append('ocr_enabled', ocrEnabled.toString());
        formData.append('language', ocrLanguage);

        try {
            const response = await apiClient.post(endpoints.services.pdfToDoc, formData, {
                timeout: 30000, // 30s for upload
            });

            const data = response.data;

            if (response.status === 202 && data.task_id) {
                // Async path — poll for completion
                setProgress(20);
                setProgressLabel('Queued, converting...');
                pollStatus(data.task_id);
            } else {
                // Sync path (Celery not available)
                setProgress(100);
                setProgressLabel('Done!');
                if (data.file_url && !data.file_url.startsWith('http')) {
                    data.file_url = `${API_BASE_URL}${data.file_url}`;
                }
                setResult(data);
                setLoading(false);
            }

        } catch (err: any) {
            console.error('Conversion request error:', err);
            const errMsg = err.response?.data?.error ||
                (err.code === 'ECONNABORTED' ? 'Upload timed out — try a smaller file' : 'Failed to start conversion.');
            setError(errMsg);
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (result?.file_url) {
            window.open(result.file_url, '_blank');
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setResult(null);
        setError(null);
        setProgress(0);
        setProgressLabel('Converting...');
        setOcrEnabled(false);
        setOcrLanguage('eng');
    };

    const outputFormats = [
        { value: 'docx', label: 'DOCX (Word 2007+)', icon: <Description /> },
        { value: 'doc', label: 'DOC (Word 97-2003)', icon: <Description /> },
        { value: 'odt', label: 'ODT (OpenDocument)', icon: <InsertDriveFile /> },
        { value: 'rtf', label: 'RTF (Rich Text)', icon: <InsertDriveFile /> },
        { value: 'txt', label: 'TXT (Plain Text)', icon: <InsertDriveFile /> },
    ];

    return (
        <ServicePageShell
            icon={PictureAsPdf}
            title="PDF to Word Converter"
            subtitle="Convert standard and scanned PDFs to editable documents with high accuracy"
            maxWidth="md"
        >
            <Seo
                title="Advanced PDF to Word Converter with OCR"
                toolId={8}
            />

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 1.5, flexShrink: 0 }}
                    onClose={() => setError(null)}
                    icon={<ErrorIcon />}
                >
                    {error}
                </Alert>
            )}

            {result && (
                <Alert
                    severity="success"
                    sx={{ mb: 1.5, flexShrink: 0 }}
                    icon={<CheckCircle />}
                    action={
                        <Button color="inherit" size="small" onClick={handleDownload} startIcon={<Download />}>
                            Download
                        </Button>
                    }
                >
                    Conversion successful! Your {result.format} file is ready.
                </Alert>
            )}

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Card sx={{ flex: 1.4 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        {/* Drag & Drop Zone */}
                        <Box
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            sx={{
                                border: '2px dashed',
                                borderColor: dragActive ? 'primary.main' : 'divider',
                                borderRadius: 3,
                                p: { xs: 2.5, sm: 3 },
                                textAlign: 'center',
                                cursor: 'pointer',
                                bgcolor: dragActive
                                    ? alpha(theme.palette.primary.main, 0.05)
                                    : selectedFile
                                        ? alpha(theme.palette.secondary.main, 0.05)
                                        : 'transparent',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                                },
                            }}
                        >
                            <input
                                accept=".pdf,application/pdf"
                                style={{ display: 'none' }}
                                id="pdf-upload"
                                type="file"
                                onChange={handleFileSelect}
                            />
                            <label htmlFor="pdf-upload" style={{ cursor: 'pointer', display: 'block' }}>
                                {selectedFile ? (
                                    <Box>
                                        <PictureAsPdf sx={{ fontSize: 44, color: 'error.main', mb: 1 }} />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            {selectedFile.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {formatBytes(selectedFile.size)}
                                        </Typography>
                                        <Button
                                            variant="text"
                                            size="small"
                                            sx={{ mt: 0.5 }}
                                            onClick={(e) => { e.preventDefault(); handleReset(); }}
                                        >
                                            Change file
                                        </Button>
                                    </Box>
                                ) : (
                                    <Box>
                                        <CloudUpload sx={{ fontSize: 44, color: 'primary.main', mb: 1, opacity: 0.8 }} />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                            Drop your PDF here
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            or click to browse files
                                        </Typography>
                                        <Chip
                                            label={`Max ${formatBytes(MAX_FILE_SIZE)}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Box>
                                )}
                            </label>
                        </Box>

                        {/* Progress Bar */}
                        {loading && (
                            <Box sx={{ mt: 2 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={progress}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        '& .MuiLinearProgress-bar': { borderRadius: 4 }
                                    }}
                                />
                                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                                    {progressLabel} {Math.round(progress)}%
                                </Typography>
                            </Box>
                        )}

                        {/* Convert Button */}
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleConvert}
                            disabled={!selectedFile || loading}
                            startIcon={loading ? null : <Description />}
                            sx={{
                                mt: 2,
                                py: 1.25,
                                borderRadius: 2,
                                fontWeight: 600,
                            }}
                        >
                            {loading ? 'Processing...' : `Convert to ${outputFormat.toUpperCase()}`}
                        </Button>
                    </CardContent>
                </Card>

                <Card sx={{ flex: 1, overflowY: 'auto' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                            Settings
                        </Typography>

                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>Output Format</InputLabel>
                            <Select
                                value={outputFormat}
                                label="Output Format"
                                onChange={(e) => setOutputFormat(e.target.value)}
                            >
                                {outputFormats.map((format) => (
                                    <MenuItem key={format.value} value={format.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {format.icon}
                                            {format.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Advanced Settings */}
                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                            <Box
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                sx={{
                                    p: 1.5,
                                    bgcolor: 'action.hover',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Settings fontSize="small" color="action" />
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Advanced Options
                                    </Typography>
                                </Box>
                                {showAdvanced ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </Box>
                            <Collapse in={showAdvanced}>
                                <Box sx={{ p: 1.5 }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={ocrEnabled}
                                                onChange={(e) => setOcrEnabled(e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="body2">Enable OCR (Scanned Docs)</Typography>
                                                <Tooltip title="Use for scanned documents (images as PDF). Runs pytesseract to extract text before converting. Slower but needed for image-only PDFs.">
                                                    <Info fontSize="small" color="action" sx={{ fontSize: 16 }} />
                                                </Tooltip>
                                            </Box>
                                        }
                                    />
                                    {ocrEnabled && (
                                        <Box sx={{ mt: 1.5 }}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>OCR Language</InputLabel>
                                                <Select
                                                    value={ocrLanguage}
                                                    label="OCR Language"
                                                    onChange={(e) => setOcrLanguage(e.target.value)}
                                                >
                                                    {ocrLanguages.map(lang => (
                                                        <MenuItem key={lang.value} value={lang.value}>
                                                            {lang.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            <Alert severity="info" sx={{ mt: 1, py: 0.25 }}>
                                                OCR adds ~1-3 min but makes scanned text fully editable.
                                            </Alert>
                                        </Box>
                                    )}
                                </Box>
                            </Collapse>
                        </Box>

                        {/* Result Info */}
                        {result && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Conversion Details
                                </Typography>
                                <Stack spacing={1} sx={{ mt: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Original Size</Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {result.original_size ? formatBytes(result.original_size) : formatBytes(selectedFile?.size || 0)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Converted Size</Typography>
                                        <Typography variant="body2" fontWeight={600}>{formatBytes(result.converted_size)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Output Format</Typography>
                                        <Chip label={result.format} size="small" color="primary" />
                                    </Box>
                                    {result.engine_used && (
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Engine</Typography>
                                            <Chip
                                                label={result.engine_used === 'pdf2docx' ? 'pdf2docx (high quality)' : result.engine_used}
                                                size="small"
                                                color={result.engine_used === 'pdf2docx' ? 'success' : 'default'}
                                                variant="outlined"
                                            />
                                        </Box>
                                    )}
                                    {result.ocr_used && (
                                        <Chip label="OCR applied" size="small" color="info" sx={{ alignSelf: 'flex-start' }} />
                                    )}
                                </Stack>

                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="success"
                                    onClick={handleDownload}
                                    startIcon={<Download />}
                                    sx={{ mt: 2, py: 1, borderRadius: 2 }}
                                >
                                    Download {result.format}
                                </Button>

                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={handleReset}
                                    startIcon={<Refresh />}
                                    sx={{ mt: 1, borderRadius: 2 }}
                                >
                                    Convert Another
                                </Button>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </ServicePageShell>
    );
};

export default PdfToDoc;
