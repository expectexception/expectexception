import React, { useRef, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Stack, Chip, useTheme, alpha } from '@mui/material';
import { Download, Share, Check, ContentCopy, AutoAwesome } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';

interface Props {
    title: string;
    subtitle?: string;
    data: Record<string, any>;
    metrics?: { label: string; value: string | number; color?: string }[];
    badgeText?: string;
}

const ShareableResultCard: React.FC<Props> = ({
    title,
    subtitle = 'Processed via ExpectException AI Suite',
    data,
    metrics = [],
    badgeText = 'VERIFIED RESULT',
}) => {
    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;
    const cardRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExportPng = async () => {
        if (!cardRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#0d0e12',
                scale: 2,
                useCORS: true,
            });

            const link = document.createElement('a');
            link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-result.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.8 },
                colors: [primaryColor, '#a855f7', '#00eeff']
            });
        } catch (err) {
            console.error('Failed to export card image:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleCopySummary = () => {
        const text = `${title} Result:\n` + Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nGenerated via ExpectException`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Box sx={{ mt: 3, width: '100%' }}>
            {/* The Visual Card Container */}
            <Card
                ref={cardRef}
                sx={{
                    position: 'relative',
                    background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.95) 0%, rgba(20, 22, 30, 0.95) 100%)',
                    border: `1px solid ${alpha(primaryColor, 0.3)}`,
                    borderRadius: 4,
                    overflow: 'hidden',
                    p: 1,
                    boxShadow: `0 16px 40px ${alpha('#000', 0.6)}`,
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 120,
                        height: 120,
                        background: `radial-gradient(circle, ${alpha(primaryColor, 0.25)} 0%, transparent 70%)`,
                        pointerEvents: 'none',
                    }}
                />

                <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AutoAwesome sx={{ color: primaryColor, fontSize: 20 }} />
                            <Typography variant="h6" fontWeight={800} color="#ffffff" sx={{ letterSpacing: '-0.02em' }}>
                                {title}
                            </Typography>
                        </Box>
                        <Chip
                            label={badgeText}
                            size="small"
                            sx={{
                                bgcolor: alpha(primaryColor, 0.15),
                                color: primaryColor,
                                border: `1px solid ${alpha(primaryColor, 0.4)}`,
                                fontWeight: 800,
                                fontSize: '0.65rem',
                                letterSpacing: '0.05em',
                            }}
                        />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                        {subtitle}
                    </Typography>

                    {/* Metrics Grid */}
                    {metrics.length > 0 && (
                        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
                            {metrics.map((m, idx) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        flex: 1,
                                        minWidth: 110,
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>
                                        {m.label}
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color={m.color || primaryColor}>
                                        {m.value}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                    )}

                    {/* Key Output Details */}
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {Object.entries(data).map(([key, val], idx) => (
                            <Stack key={idx} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    {key}
                                </Typography>
                                <Typography variant="caption" color="#ffffff" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                                    {String(val)}
                                </Typography>
                            </Stack>
                        ))}
                    </Box>

                    {/* Watermark Footer */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2.5, pt: 1, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            expectexception.com
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {new Date().toLocaleDateString()}
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>

            {/* Action Triggers */}
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={copied ? <Check /> : <ContentCopy />}
                    onClick={handleCopySummary}
                    sx={{ borderRadius: 2, color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                    {copied ? 'Copied' : 'Copy Text'}
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<Download />}
                    disabled={isExporting}
                    onClick={handleExportPng}
                    sx={{
                        borderRadius: 2,
                        bgcolor: primaryColor,
                        color: '#000000',
                        fontWeight: 800,
                        '&:hover': { bgcolor: alpha(primaryColor, 0.9) }
                    }}
                >
                    {isExporting ? 'Generating PNG...' : 'Download Card PNG'}
                </Button>
            </Stack>
        </Box>
    );
};

export default ShareableResultCard;
