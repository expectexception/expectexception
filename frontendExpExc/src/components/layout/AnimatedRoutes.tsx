import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './PageTransition';

// Pages
import HomePage from '../../pages/HomePage';
import ServicesPage from '../../pages/ServicesPage';
import BlogPage from '../../pages/BlogPage';
import BlogDetailPage from '../../pages/BlogDetailPage';
import DownloadHubPage from '../../pages/DownloadHubPage';
import LoginPage from '../../pages/LoginPage';
import ProfilePage from '../../pages/ProfilePage';
import RegisterPage from '../../pages/RegisterPage';
import TextToSpeechPage from '../../pages/TextToSpeechPage';
import ImageCompressorPage from '../../pages/ImageCompressorPage';
import AIDetectorPage from '../../pages/AIDetectorPage';
import CreateBlogPage from '../../pages/admin/CreateBlogPage';
import UploadResourcePage from '../../pages/admin/UploadResourcePage';
import PrivacyPolicy from '../../pages/legal/PrivacyPolicy';
import TermsOfService from '../../pages/legal/TermsOfService';
import ContactPage from '../../pages/ContactPage';
import SearchPage from '../../pages/SearchPage';

// Service components
import QrGenerator from '../services/QrGenerator';
import JsonFormatter from '../services/JsonFormatter';
import UrlDownloader from '../services/UrlDownloader';
import YtDownloader from '../services/YtDownloader';
import PdfToDoc from '../services/PdfToDoc';
import DocToPdf from '../services/DocToPdf';
import PdfMerger from '../services/PdfMerger';
import PdfSplitter from '../services/PdfSplitter';
import ImageToPdf from '../services/ImageToPdf';
import ImageResizer from '../services/ImageResizer';
import BackgroundRemover from '../services/BackgroundRemover';
import ImageToText from '../services/ImageToText';
import ImageConverter from '../services/ImageConverter';
import Base64Tool from '../services/Base64Tool';
import HashGenerator from '../services/HashGenerator';
import UuidGenerator from '../services/UuidGenerator';
import ColorConverter from '../services/ColorConverter';
import MarkdownPreview from '../services/MarkdownPreview';

const AnimatedRoutes: React.FC = () => {
    const location = useLocation();

    return (
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

                {/* Developer Tools */}
                <Route path="/services/base64" element={<PageTransition><Base64Tool /></PageTransition>} />
                <Route path="/services/hash-generator" element={<PageTransition><HashGenerator /></PageTransition>} />
                <Route path="/services/uuid-generator" element={<PageTransition><UuidGenerator /></PageTransition>} />
                <Route path="/services/color-converter" element={<PageTransition><ColorConverter /></PageTransition>} />
                <Route path="/services/markdown-preview" element={<PageTransition><MarkdownPreview /></PageTransition>} />

                <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />

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
    );
};

export default AnimatedRoutes;

