import React, { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const EMBED_MAP: Record<string, React.LazyExoticComponent<React.FC>> = {
    'json-formatter': lazy(() => import('../components/services/JsonFormatter')),
    'qr-generator': lazy(() => import('../components/services/QrGenerator')),
    'password-generator': lazy(() => import('../components/services/PasswordGenerator')),
    'hash-generator': lazy(() => import('../components/services/HashGenerator')),
    'uuid-generator': lazy(() => import('../components/services/UuidGenerator')),
    'base64': lazy(() => import('../components/services/Base64Tool')),
    'word-counter': lazy(() => import('../components/services/WordCounter')),
    'lorem-ipsum': lazy(() => import('../components/services/LoremIpsumGenerator')),
    'markdown-preview': lazy(() => import('../components/services/MarkdownPreview')),
    'regex-tester': lazy(() => import('../components/services/RegexTester')),
    'timestamp-converter': lazy(() => import('../components/services/TimestampConverter')),
    'color-converter': lazy(() => import('../components/services/ColorConverter')),
    'color-palette': lazy(() => import('../components/services/ColorPaletteGenerator')),
    'css-gradient-generator': lazy(() => import('../components/services/CssGradientGenerator')),
    'css-box-shadow': lazy(() => import('../components/services/CssBoxShadowGenerator')),
    'http-status-codes': lazy(() => import('../components/services/HttpStatusCodes')),
    'json-to-typescript': lazy(() => import('../components/services/JsonToTypescript')),
    'case-converter': lazy(() => import('../components/services/CaseConverter')),
    'text-diff': lazy(() => import('../components/services/TextDiffChecker')),
    'url-encode-decode': lazy(() => import('../components/services/UrlEncoderDecoder')),
    'number-base-converter': lazy(() => import('../components/services/NumberBaseConverter')),
    'json-csv': lazy(() => import('../components/services/JsonToCsv')),
    'cron-explainer': lazy(() => import('../components/services/CronExplainer')),
    'jwt-decoder': lazy(() => import('../components/services/JwtDecoder')),
    'html-entity-codec': lazy(() => import('../components/services/HtmlEntityCodec')),
};

const EmbedPage: React.FC = () => {
    const { toolSlug } = useParams<{ toolSlug: string }>();
    const Tool = toolSlug ? EMBED_MAP[toolSlug] : undefined;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#050505', color: '#f1f5f9', p: 2 }}>
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>}>
                {Tool ? (
                    <Tool />
                ) : (
                    <Box sx={{ textAlign: 'center', pt: 8 }}>
                        <Typography variant="h5" color="error">Tool not available for embedding.</Typography>
                        <Typography color="text.secondary" sx={{ mt: 1 }}>Visit <strong>expectexception.com/services</strong> for all tools.</Typography>
                    </Box>
                )}
            </Suspense>
        </Box>
    );
};

export default EmbedPage;
