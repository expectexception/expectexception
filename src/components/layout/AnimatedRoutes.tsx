import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Box, CircularProgress } from '@mui/material';
import PageTransition from './PageTransition';

// Loading fallback component
const LoadingFallback = () => (
    <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        width: '100%'
    }}>
        <CircularProgress />
    </Box>
);

// Pages - Lazy loaded
const HomePage = lazy(() => import('../../pages/HomePage'));
const ServicesPage = lazy(() => import('../../pages/ServicesPage'));
const BlogPage = lazy(() => import('../../pages/BlogPage'));
const BlogDetailPage = lazy(() => import('../../pages/BlogDetailPage'));
const DownloadHubPage = lazy(() => import('../../pages/DownloadHubPage'));
const DownloadDetailsPage = lazy(() => import('../../pages/DownloadDetailsPage'));
const LoginPage = lazy(() => import('../../pages/LoginPage'));
const ProfilePage = lazy(() => import('../../pages/ProfilePage'));
const RegisterPage = lazy(() => import('../../pages/RegisterPage'));
const TextToSpeechPage = lazy(() => import('../../pages/TextToSpeechPage'));
const ImageCompressorPage = lazy(() => import('../../pages/ImageCompressorPage'));
const AIDetectorPage = lazy(() => import('../../pages/AIDetectorPage'));
const CreateBlogPage = lazy(() => import('../../pages/admin/CreateBlogPage'));
const UploadResourcePage = lazy(() => import('../../pages/admin/UploadResourcePage'));
const PrivacyPolicy = lazy(() => import('../../pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('../../pages/legal/TermsOfService'));
const ContactPage = lazy(() => import('../../pages/ContactPage'));
const SearchPage = lazy(() => import('../../pages/SearchPage'));
const TextToHandwritingPage = lazy(() => import('../../pages/TextToHandwritingPage'));
const SecretSharerPage = lazy(() => import('../../pages/SecretSharerPage'));


// Service components - Lazy loaded
const QrGenerator = lazy(() => import('../services/QrGenerator'));
const JsonFormatter = lazy(() => import('../services/JsonFormatter'));
const UrlDownloader = lazy(() => import('../services/UrlDownloader'));
const YtDownloader = lazy(() => import('../services/YtDownloader'));
const PdfToDoc = lazy(() => import('../services/PdfToDoc'));
const DocToPdf = lazy(() => import('../services/DocToPdf'));
const PdfMerger = lazy(() => import('../services/PdfMerger'));
const PdfSplitter = lazy(() => import('../services/PdfSplitter'));
const ImageToPdf = lazy(() => import('../services/ImageToPdf'));
const ImageResizer = lazy(() => import('../services/ImageResizer'));
const BackgroundRemover = lazy(() => import('../services/BackgroundRemover'));
const ImageToText = lazy(() => import('../services/ImageToText'));
const ImageConverter = lazy(() => import('../services/ImageConverter'));
const ImageUpscaler = lazy(() => import('../services/ImageUpscaler'));
const Base64Tool = lazy(() => import('../services/Base64Tool'));
const HashGenerator = lazy(() => import('../services/HashGenerator'));
const UuidGenerator = lazy(() => import('../services/UuidGenerator'));
const ColorConverter = lazy(() => import('../services/ColorConverter'));
const MarkdownPreview = lazy(() => import('../services/MarkdownPreview'));

const AnimatedRoutes: React.FC = () => {
    const location = useLocation();

    return (
        <Suspense fallback={<LoadingFallback />}>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />

                    {/* Services */}
                    <Route path="/services" element={<PageTransition><ServicesPage /></PageTransition>} />
                    <Route path="/services/qr-generator" element={<PageTransition><QrGenerator /></PageTransition>} />
                    <Route path="/services/json-formatter" element={<PageTransition><JsonFormatter /></PageTransition>} />
                    <Route path="/services/url-downloader" element={<PageTransition><UrlDownloader /></PageTransition>} />
                    <Route path="/services/yt-downloader" element={<PageTransition><YtDownloader /></PageTransition>} />
                    <Route path="/services/text-to-speech" element={<PageTransition><TextToSpeechPage /></PageTransition>} />
                    <Route path="/services/image-compressor" element={<PageTransition><ImageCompressorPage /></PageTransition>} />
                    <Route path="/services/ai-detector" element={<PageTransition><AIDetectorPage /></PageTransition>} />

                    {/* Document Tools */}
                    <Route path="/services/pdf-to-doc" element={<PageTransition><PdfToDoc /></PageTransition>} />
                    <Route path="/services/doc-to-pdf" element={<PageTransition><DocToPdf /></PageTransition>} />
                    <Route path="/services/pdf-merger" element={<PageTransition><PdfMerger /></PageTransition>} />
                    <Route path="/services/pdf-splitter" element={<PageTransition><PdfSplitter /></PageTransition>} />
                    <Route path="/services/image-to-pdf" element={<PageTransition><ImageToPdf /></PageTransition>} />

                    {/* Image Tools */}
                    <Route path="/services/image-resizer" element={<PageTransition><ImageResizer /></PageTransition>} />
                    <Route path="/services/background-remover" element={<PageTransition><BackgroundRemover /></PageTransition>} />
                    <Route path="/services/image-to-text" element={<PageTransition><ImageToText /></PageTransition>} />
                    <Route path="/services/image-converter" element={<PageTransition><ImageConverter /></PageTransition>} />
                    <Route path="/services/image-upscale" element={<PageTransition><ImageUpscaler /></PageTransition>} />

                    {/* Developer Tools */}
                    <Route path="/services/base64" element={<PageTransition><Base64Tool /></PageTransition>} />
                    <Route path="/services/hash-generator" element={<PageTransition><HashGenerator /></PageTransition>} />
                    <Route path="/services/uuid-generator" element={<PageTransition><UuidGenerator /></PageTransition>} />
                    <Route path="/services/color-converter" element={<PageTransition><ColorConverter /></PageTransition>} />
                    <Route path="/services/markdown-preview" element={<PageTransition><MarkdownPreview /></PageTransition>} />

                    <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
                    <Route path="/services/text-to-handwriting" element={<PageTransition><TextToHandwritingPage /></PageTransition>} />
                    <Route path="/services/secret-sharer" element={<PageTransition><SecretSharerPage /></PageTransition>} />
                    <Route path="/services/secret-sharer/:id" element={<PageTransition><SecretSharerPage /></PageTransition>} />

                    {/* Blog */}
                    <Route path="/blogs" element={<PageTransition><BlogPage /></PageTransition>} />
                    <Route path="/blogs/:id" element={<PageTransition><BlogDetailPage /></PageTransition>} />

                    {/* Profile */}
                    <Route path="/profile/:username" element={<PageTransition><ProfilePage /></PageTransition>} />

                    {/* Authentication */}
                    <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
                    <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />

                    {/* Download Hub */}
                    <Route path="/downloads" element={<PageTransition><DownloadHubPage /></PageTransition>} />

                    {/* Admin */}
                    <Route path="/admin/create-blog" element={<PageTransition><CreateBlogPage /></PageTransition>} />
                    <Route path="/admin/upload-resource" element={<PageTransition><UploadResourcePage /></PageTransition>} />

                    {/* Legal */}
                    <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
                    <Route path="/terms-of-service" element={<PageTransition><TermsOfService /></PageTransition>} />
                    <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
                </Routes>
            </AnimatePresence>
        </Suspense>
    );
};

export default AnimatedRoutes;

