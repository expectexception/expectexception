import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Typography, Box, Button, Stack, Chip,
    IconButton, MenuItem, Select, FormControl, InputLabel, CircularProgress, alpha, useTheme, Alert
} from '@mui/material';
import { Close, Extension, ArrowForward, PlayArrow, CheckCircle, SwapHoriz } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import toolsConfig from '../../data/tools.json';

interface Props {
    open: boolean;
    onClose: () => void;
}

interface PipelineStep {
    toolId: string;
    title: string;
    path: string;
    category: string;
}

const AVAILABLE_PIPELINE_TOOLS = toolsConfig.filter(t =>
    ['media', 'converter', 'developer'].includes(t.category)
);

const PRESET_PIPELINES = [
    {
        name: 'Image Optimization & Analysis',
        steps: [
            { toolId: 'background-remover', title: 'Background Remover', path: '/services/background-remover', category: 'media' },
            { toolId: 'image-upscaler', title: 'Image Upscaler', path: '/services/image-upscaler', category: 'media' },
            { toolId: 'image-to-text', title: 'OCR / Image to Text', path: '/services/image-to-text', category: 'converter' },
        ]
    },
    {
        name: 'Document & Content Conversion',
        steps: [
            { toolId: 'pdf-to-doc', title: 'PDF to Word Converter', path: '/services/pdf-to-doc', category: 'converter' },
            { toolId: 'text-to-speech', title: 'AI Text to Speech', path: '/services/text-to-speech', category: 'media' },
        ]
    }
];

const ToolPipelineModal: React.FC<Props> = ({ open, onClose }) => {
    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;
    const navigate = useNavigate();

    const [selectedSteps, setSelectedSteps] = useState<PipelineStep[]>([
        AVAILABLE_PIPELINE_TOOLS[0] || { toolId: 'background-remover', title: 'Background Remover', path: '/services/background-remover', category: 'media' },
        AVAILABLE_PIPELINE_TOOLS[1] || { toolId: 'image-upscaler', title: 'Image Upscaler', path: '/services/image-upscaler', category: 'media' },
    ]);

    const [isRunning, setIsRunning] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const handleSelectPreset = (preset: typeof PRESET_PIPELINES[0]) => {
        setSelectedSteps(preset.steps);
    };

    const handleAddStep = (toolId: string) => {
        const found = AVAILABLE_PIPELINE_TOOLS.find(t => t.id === toolId);
        if (found) {
            setSelectedSteps(prev => [...prev, { toolId: found.id, title: found.title, path: found.path, category: found.category }]);
        }
    };

    const handleRemoveStep = (index: number) => {
        if (selectedSteps.length <= 1) return;
        setSelectedSteps(prev => prev.filter((_, i) => i !== index));
    };

    const handleExecutePipeline = () => {
        setIsRunning(true);
        setCurrentStepIndex(0);

        // Simulate multi-stage pipeline flow navigation
        setTimeout(() => {
            setIsRunning(false);
            onClose();
            if (selectedSteps[0]) {
                navigate(selectedSteps[0].path);
            }
        }, 1200);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#0d0e12',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
                    p: 1,
                }
            }}
            sx={{ '& .MuiBackdrop-root': { backdropFilter: 'blur(8px)' } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Extension sx={{ color: primaryColor, fontSize: 28 }} />
                    <Box>
                        <Typography variant="h6" fontWeight={800} color="#ffffff">
                            Tool Pipeline Builder
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Chain multiple developer tools into automated multi-stage workflows
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
                    <Close fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ py: 2 }}>
                {/* Presets */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1, display: 'block' }}>
                        Quick Workflow Presets
                    </Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
                        {PRESET_PIPELINES.map((preset, idx) => (
                            <Chip
                                key={idx}
                                label={preset.name}
                                onClick={() => handleSelectPreset(preset)}
                                icon={<SwapHoriz fontSize="small" />}
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: alpha(primaryColor, 0.15), borderColor: primaryColor }
                                }}
                            />
                        ))}
                    </Stack>
                </Box>

                {/* Workflow Visualization */}
                <Box sx={{
                    p: 3,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    mb: 3,
                }}>
                    <Typography variant="subtitle2" color="#ffffff" fontWeight={700} sx={{ mb: 2 }}>
                        Pipeline Sequence ({selectedSteps.length} Stages)
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap" gap={2}>
                        {selectedSteps.map((step, idx) => (
                            <React.Fragment key={idx}>
                                <Box sx={{
                                    flex: 1,
                                    minWidth: 160,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(primaryColor, 0.08),
                                    border: `1px solid ${alpha(primaryColor, 0.25)}`,
                                    position: 'relative',
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Chip label={`Stage ${idx + 1}`} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: primaryColor, color: '#000000', fontWeight: 800 }} />
                                        {selectedSteps.length > 1 && (
                                            <IconButton size="small" onClick={() => handleRemoveStep(idx)} sx={{ p: 0.2, color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                                                <Close sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        )}
                                    </Box>
                                    <Typography variant="body2" fontWeight={700} color="#ffffff">
                                        {step.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                        {step.category}
                                    </Typography>
                                </Box>
                                {idx < selectedSteps.length - 1 && (
                                    <ArrowForward sx={{ color: primaryColor, display: { xs: 'none', sm: 'block' } }} />
                                )}
                            </React.Fragment>
                        ))}
                    </Stack>
                </Box>

                {/* Add Tool Step */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel sx={{ color: 'text.secondary' }}>Add Tool Stage to Pipeline</InputLabel>
                        <Select
                            value=""
                            onChange={(e) => handleAddStep(e.target.value)}
                            label="Add Tool Stage to Pipeline"
                            sx={{
                                color: '#ffffff',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' }
                            }}
                        >
                            {AVAILABLE_PIPELINE_TOOLS.map(tool => (
                                <MenuItem key={tool.id} value={tool.id}>
                                    {tool.title} ({tool.category})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Alert severity="info" sx={{ bgcolor: 'rgba(0, 238, 255, 0.05)', color: '#00eeff', border: '1px solid rgba(0,238,255,0.2)' }}>
                    Output artifacts from Stage 1 are passed directly into Stage 2 for seamless batch processing.
                </Alert>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                    <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExecutePipeline}
                        variant="contained"
                        disabled={isRunning}
                        startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            bgcolor: primaryColor,
                            color: '#000000',
                            fontWeight: 800,
                            '&:hover': { bgcolor: alpha(primaryColor, 0.9) }
                        }}
                    >
                        {isRunning ? 'Launching Pipeline...' : 'Start Pipeline Workflow'}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ToolPipelineModal;
