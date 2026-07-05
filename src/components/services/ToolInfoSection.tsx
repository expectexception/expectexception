import React from 'react';
import { Box, Container, Typography, Card, CardContent, Accordion, AccordionSummary, AccordionDetails, Stack, useTheme, alpha } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import type { ContainerProps } from '@mui/material';
import type { HowToStep, FaqItem } from '../seo/Seo';

interface ToolInfoSectionProps {
    maxWidth?: ContainerProps['maxWidth'];
    /** 2-4 sentence description of what the tool does and why/when to use it. */
    about?: string;
    howToSteps?: HowToStep[];
    faq?: FaqItem[];
}

/** Real, visible, indexable content below the tool itself — an "About this
 * tool" paragraph, numbered how-to steps, and an FAQ accordion. Renders in
 * normal page flow (outside ServicePageShell's height-constrained viewport
 * box) so it scrolls like an ordinary page section instead of being squeezed
 * into the tool's single-screen area. Reuses the same howToSteps/faq data
 * already passed to Seo for JSON-LD, so the visible copy and the structured
 * data never drift apart. */
const ToolInfoSection: React.FC<ToolInfoSectionProps> = ({ maxWidth = 'sm', about, howToSteps, faq }) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    if (!about && !howToSteps?.length && !faq?.length) return null;

    return (
        <Container maxWidth={maxWidth} sx={{ pb: { xs: 6, sm: 8 }, pt: { xs: 1, sm: 2 } }}>
            <Stack spacing={3}>
                {about && (
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                            About this tool
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                            {about}
                        </Typography>
                    </Box>
                )}

                {howToSteps && howToSteps.length > 0 && (
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                            How to use it
                        </Typography>
                        <Stack spacing={1.5}>
                            {howToSteps.map((step, i) => (
                                <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                    <Box sx={{
                                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        bgcolor: alpha(primary, 0.12), border: `1px solid ${alpha(primary, 0.3)}`,
                                        color: primary, fontSize: '0.75rem', fontWeight: 800, mt: 0.2,
                                    }}>
                                        {i + 1}
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" fontWeight={700}>{step.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">{step.text}</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}

                {faq && faq.length > 0 && (
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                            Frequently asked questions
                        </Typography>
                        <Stack spacing={1}>
                            {faq.map((item, i) => (
                                <Accordion
                                    key={i}
                                    disableGutters
                                    sx={{
                                        bgcolor: alpha('#fff', 0.02),
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px !important',
                                        '&:before': { display: 'none' },
                                    }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="body2" fontWeight={700}>{item.question}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Typography variant="body2" color="text.secondary">{item.answer}</Typography>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Container>
    );
};

export default ToolInfoSection;
