import React from 'react';
import { Box, Container, Typography, useTheme, alpha } from '@mui/material';
import type { ContainerProps } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import Seo, { HowToStep, FaqItem } from '../seo/Seo';
import ToolInfoSection from './ToolInfoSection';

interface ServicePageShellProps {
    icon: SvgIconComponent;
    title: string;
    subtitle: string;
    maxWidth?: ContainerProps['maxWidth'];
    children: React.ReactNode;
    /** Optional: keyword-rich <title> for search engines (defaults to `title`). */
    seoTitle?: string;
    /** Optional: override default SEO description */
    seoDescription?: string;
    /** Optional: tools.json id → SoftwareApplication schema + tool keywords */
    toolId?: number;
    /** Optional: extra high-intent keywords merged into the meta keywords */
    keywords?: string[];
    /** Optional: HowTo steps — rendered as a visible numbered list below the
     * tool AND as JSON-LD rich-result data (single source of truth). */
    howToSteps?: HowToStep[];
    /** Optional: FAQ entries — rendered as a visible accordion below the
     * tool AND as FAQPage JSON-LD (single source of truth). */
    faq?: FaqItem[];
    /** Optional: 2-4 sentence "about this tool" paragraph, rendered visibly
     * below the tool. Real, indexable page content (not just SEO metadata) —
     * this is what a bare/thin-looking tool page is usually missing. */
    about?: string;
}

/** App-bar-aware, single-viewport layout for tool pages: a compact inline
 * header (icon + title + subtitle) followed by a flex-grow content area that
 * fills the rest of the screen. Tool content should size itself with
 * `flex: 1, minHeight: 0` and scroll internally if it has unavoidably long
 * output (e.g. JSON/text) instead of letting the whole page grow taller than
 * the viewport. Replaces the old `ServicePageHero` + `py: 8` pattern, which
 * pushed every tool page well past one screen. */
const ServicePageShell: React.FC<ServicePageShellProps> = ({
    icon: Icon, title, subtitle, maxWidth = 'sm', children, seoTitle, seoDescription,
    toolId, keywords, howToSteps, faq, about,
}) => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const viewportHeight = {
        xs: 'calc(100vh - 58px)',
        sm: 'calc(100vh - 64px)',
        md: 'calc(100vh - 72px)',
    };

    return (
        <>
        <Seo
            title={seoTitle || title}
            description={seoDescription || subtitle}
            toolId={toolId}
            keywords={keywords}
            howToSteps={howToSteps}
            faq={faq}
        />
        <Box sx={{
            minHeight: viewportHeight,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: { xs: 3, sm: 2 },
        }}>
            <Container
                maxWidth={maxWidth}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: 2, sm: 2.5 },
                    maxHeight: viewportHeight,
                    width: '100%',
                    // maxHeight alone doesn't clip: with the default
                    // `overflow: visible`, content taller than this box
                    // doesn't scroll or get contained — it paints straight
                    // through the box's bottom edge and into whatever's
                    // next in the DOM (the site Footer), rendering as
                    // "content hidden behind the footer" on any tool page
                    // whose output doesn't fit in one mobile screen.
                    overflowY: 'auto',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <Box sx={{
                        width: 52,
                        height: 52,
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(primary, 0.1),
                        border: `1px solid ${alpha(primary, 0.25)}`,
                        color: 'primary.main',
                        flexShrink: 0,
                    }}>
                        <Icon sx={{ fontSize: 28 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="h5"
                            component="h1"
                            sx={{
                                fontWeight: 800,
                                background: `linear-gradient(135deg, #ffffff 30%, ${primary} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                lineHeight: 1.2,
                            }}
                        >
                            {title}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ display: { xs: 'none', sm: 'block' }, mt: 0.25 }}
                        >
                            {subtitle}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {children}
                </Box>
            </Container>
        </Box>
        <ToolInfoSection maxWidth={maxWidth} about={about} howToSteps={howToSteps} faq={faq} />
        </>
    );
};

export default ServicePageShell;
