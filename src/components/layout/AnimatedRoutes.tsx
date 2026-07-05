import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Box, CircularProgress } from '@mui/material';
import PageTransition from './PageTransition';
import AdminGuard from '../guards/AdminGuard';
import AuthGuard from '../guards/AuthGuard';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

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
const SandboxPage = lazy(() => import('../../pages/SandboxPage'));
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
const AdminDashboardPage = lazy(() => import('../../pages/admin/AdminDashboardPage'));
const PrivacyPolicy = lazy(() => import('../../pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('../../pages/legal/TermsOfService'));
const ContactPage = lazy(() => import('../../pages/ContactPage'));
const SearchPage = lazy(() => import('../../pages/SearchPage'));
const TextToHandwritingPage = lazy(() => import('../../pages/TextToHandwritingPage'));
const SecretSharerPage = lazy(() => import('../../pages/SecretSharerPage'));
const HirePage = lazy(() => import('../../pages/HirePage'));
const EstimatorPage = lazy(() => import('../../pages/EstimatorPage'));
const ChatbotPage = lazy(() => import('../../pages/ChatbotPage'));
const CommunityPage = lazy(() => import('../../pages/CommunityPage'));
const NewThreadPage = lazy(() => import('../../pages/NewThreadPage'));
const ThreadDetailPage = lazy(() => import('../../pages/ThreadDetailPage'));
const CommunityStatsPage = lazy(() => import('../../pages/CommunityStatsPage'));
const SharedResultPage = lazy(() => import('../../pages/SharedResultPage'));
const EmbedPage = lazy(() => import('../../pages/EmbedPage'));


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
const RegexTester = lazy(() => import('../services/RegexTester'));
const KeypairGenerator = lazy(() => import('../services/KeypairGenerator'));
const RedirectInspector = lazy(() => import('../services/RedirectInspector'));
const DnsLookup = lazy(() => import('../services/DnsLookup'));
const UnitConverter = lazy(() => import('../services/UnitConverter'));
const ColorContrastChecker = lazy(() => import('../services/ColorContrastChecker'));
const RandomDataGenerator = lazy(() => import('../services/RandomDataGenerator'));
const TextEncryptor = lazy(() => import('../services/TextEncryptor'));
const MarkdownTableGenerator = lazy(() => import('../services/MarkdownTableGenerator'));
const WebsiteDiagnostics = lazy(() => import('../services/WebsiteDiagnostics'));
const SpeedTest = lazy(() => import('../services/SpeedTest'));
const AudioSeparator = lazy(() => import('../services/AudioSeparator'));
const UptimeRobot = lazy(() => import('../services/UptimeRobot'));

// Frontend-only tools (no backend calls) - lazy loaded
const WordCounter = lazy(() => import('../services/WordCounter'));
const LoremIpsumGenerator = lazy(() => import('../services/LoremIpsumGenerator'));
const CssGradientGenerator = lazy(() => import('../services/CssGradientGenerator'));
const TimestampConverter = lazy(() => import('../services/TimestampConverter'));
const PasswordGenerator = lazy(() => import('../services/PasswordGenerator'));
const TextDiffChecker = lazy(() => import('../services/TextDiffChecker'));
const CaseConverter = lazy(() => import('../services/CaseConverter'));
const HtmlEntityCodec = lazy(() => import('../services/HtmlEntityCodec'));
const NumberBaseConverter = lazy(() => import('../services/NumberBaseConverter'));
const JsonToCsv = lazy(() => import('../services/JsonToCsv'));
const UrlEncoderDecoder = lazy(() => import('../services/UrlEncoderDecoder'));
const JwtDecoder = lazy(() => import('../services/JwtDecoder'));
const CronExplainer = lazy(() => import('../services/CronExplainer'));
const ColorPaletteGenerator = lazy(() => import('../services/ColorPaletteGenerator'));
const CssBoxShadowGenerator = lazy(() => import('../services/CssBoxShadowGenerator'));
const HttpStatusCodes = lazy(() => import('../services/HttpStatusCodes'));
const JsonToTypescript = lazy(() => import('../services/JsonToTypescript'));
const FaviconGenerator = lazy(() => import('../services/FaviconGenerator'));
const BarcodeGenerator = lazy(() => import('../services/BarcodeGenerator'));
const CssGridGenerator = lazy(() => import('../services/CssGridGenerator'));
const MetaTagGenerator = lazy(() => import('../services/MetaTagGenerator'));
const JsonDiffChecker = lazy(() => import('../services/JsonDiffChecker'));
const AgeDateCalculator = lazy(() => import('../services/AgeDateCalculator'));
const ColorNameFinder = lazy(() => import('../services/ColorNameFinder'));

// Sandbox games - lazy loaded (all frontend-only, no backend, no auth gate)
const SnakeGame = lazy(() => import('../sandbox/SnakeGame'));
const Game2048 = lazy(() => import('../sandbox/Game2048'));
const TicTacToe = lazy(() => import('../sandbox/TicTacToe'));
const ParticlePlayground = lazy(() => import('../sandbox/ParticlePlayground'));
const FallingSand = lazy(() => import('../sandbox/FallingSand'));
const WordGuess = lazy(() => import('../sandbox/WordGuess'));
const SlidingPuzzle = lazy(() => import('../sandbox/SlidingPuzzle'));
const ReactionTest = lazy(() => import('../sandbox/ReactionTest'));
const AimTrainer = lazy(() => import('../sandbox/AimTrainer'));
const MemoryMatch = lazy(() => import('../sandbox/MemoryMatch'));
const SimonSays = lazy(() => import('../sandbox/SimonSays'));
const Breakout = lazy(() => import('../sandbox/Breakout'));
const Minesweeper = lazy(() => import('../sandbox/Minesweeper'));
const ConnectFour = lazy(() => import('../sandbox/ConnectFour'));
const WhackAMole = lazy(() => import('../sandbox/WhackAMole'));
const TypingTest = lazy(() => import('../sandbox/TypingTest'));
const Kaleidoscope = lazy(() => import('../sandbox/Kaleidoscope'));
const GameOfLife = lazy(() => import('../sandbox/GameOfLife'));
const Boids = lazy(() => import('../sandbox/Boids'));
const Spirograph = lazy(() => import('../sandbox/Spirograph'));
const Pong = lazy(() => import('../sandbox/Pong'));
const Hangman = lazy(() => import('../sandbox/Hangman'));
const RockPaperScissors = lazy(() => import('../sandbox/RockPaperScissors'));
const FlappyBlocks = lazy(() => import('../sandbox/FlappyBlocks'));
const Tetris = lazy(() => import('../sandbox/Tetris'));
const Sudoku = lazy(() => import('../sandbox/Sudoku'));
const BubbleShooter = lazy(() => import('../sandbox/BubbleShooter'));
const TowerOfHanoi = lazy(() => import('../sandbox/TowerOfHanoi'));
const MazeRunner = lazy(() => import('../sandbox/MazeRunner'));

/**
 * Helper: wraps a component with AuthGuard if the path requires login.
 */
const withAuthGuard = (
    element: React.ReactNode,
    path: string,
    toolAccess: Record<string, boolean>,
    toolName?: string,
): React.ReactNode => {
    if (toolAccess[path]) {
        return <AuthGuard toolName={toolName}>{element}</AuthGuard>;
    }
    return element;
};


const AnimatedRoutes: React.FC = () => {
    const location = useLocation();
    const isYtd = window.location.hostname.startsWith('ytdown.');

    // Fetch tool access configuration
    const [toolAccess, setToolAccess] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchToolAccess = async () => {
            try {
                const response = await apiClient.get(endpoints.services.toolAccess);
                if (response.data?.tools) {
                    setToolAccess(response.data.tools);
                }
            } catch (err) {
                console.error('Failed to fetch tool access config:', err);
            }
        };
        fetchToolAccess();
    }, []);

    return (
        <Suspense fallback={<LoadingFallback />}>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={
                        <PageTransition>
                            {isYtd ? <YtDownloader /> : <HomePage />}
                        </PageTransition>
                    } />

                    {/* Services */}
                    <Route path="/services" element={<PageTransition><ServicesPage /></PageTransition>} />
                    <Route path="/estimate" element={<PageTransition><EstimatorPage /></PageTransition>} />
                    <Route path="/services/qr-generator" element={<PageTransition>{withAuthGuard(<QrGenerator />, '/services/qr-generator', toolAccess, 'QR Generator')}</PageTransition>} />
                    <Route path="/services/json-formatter" element={<PageTransition>{withAuthGuard(<JsonFormatter />, '/services/json-formatter', toolAccess, 'JSON Formatter')}</PageTransition>} />
                    <Route path="/services/url-downloader" element={<PageTransition>{withAuthGuard(<UrlDownloader />, '/services/url-downloader', toolAccess, 'URL Downloader')}</PageTransition>} />
                    <Route path="/services/yt-downloader" element={<PageTransition>{withAuthGuard(<YtDownloader />, '/services/yt-downloader', toolAccess, 'YouTube Downloader')}</PageTransition>} />
                    <Route path="/services/text-to-speech" element={<PageTransition>{withAuthGuard(<TextToSpeechPage />, '/services/text-to-speech', toolAccess, 'Text to Speech')}</PageTransition>} />
                    <Route path="/services/image-compressor" element={<PageTransition>{withAuthGuard(<ImageCompressorPage />, '/services/image-compressor', toolAccess, 'Image Compressor')}</PageTransition>} />
                    <Route path="/services/ai-detector" element={<PageTransition>{withAuthGuard(<AIDetectorPage />, '/services/ai-detector', toolAccess, 'AI Detector')}</PageTransition>} />

                    {/* Document Tools */}
                    <Route path="/services/pdf-to-doc" element={<PageTransition>{withAuthGuard(<PdfToDoc />, '/services/pdf-to-doc', toolAccess, 'PDF to Doc')}</PageTransition>} />
                    <Route path="/services/doc-to-pdf" element={<PageTransition>{withAuthGuard(<DocToPdf />, '/services/doc-to-pdf', toolAccess, 'Doc to PDF')}</PageTransition>} />
                    <Route path="/services/pdf-merger" element={<PageTransition>{withAuthGuard(<PdfMerger />, '/services/pdf-merger', toolAccess, 'PDF Merger')}</PageTransition>} />
                    <Route path="/services/pdf-splitter" element={<PageTransition>{withAuthGuard(<PdfSplitter />, '/services/pdf-splitter', toolAccess, 'PDF Splitter')}</PageTransition>} />
                    <Route path="/services/image-to-pdf" element={<PageTransition>{withAuthGuard(<ImageToPdf />, '/services/image-to-pdf', toolAccess, 'Image to PDF')}</PageTransition>} />

                    {/* Image Tools */}
                    <Route path="/services/image-resizer" element={<PageTransition>{withAuthGuard(<ImageResizer />, '/services/image-resizer', toolAccess, 'Image Resizer')}</PageTransition>} />
                    <Route path="/services/background-remover" element={<PageTransition>{withAuthGuard(<BackgroundRemover />, '/services/background-remover', toolAccess, 'Background Remover')}</PageTransition>} />
                    <Route path="/services/image-to-text" element={<PageTransition>{withAuthGuard(<ImageToText />, '/services/image-to-text', toolAccess, 'Image to Text')}</PageTransition>} />
                    <Route path="/services/image-converter" element={<PageTransition>{withAuthGuard(<ImageConverter />, '/services/image-converter', toolAccess, 'Image Converter')}</PageTransition>} />
                    <Route path="/services/image-upscale" element={<PageTransition>{withAuthGuard(<ImageUpscaler />, '/services/image-upscale', toolAccess, 'Image Upscaler')}</PageTransition>} />

                    {/* Developer Tools */}
                    <Route path="/services/base64" element={<PageTransition>{withAuthGuard(<Base64Tool />, '/services/base64', toolAccess, 'Base64 Tool')}</PageTransition>} />
                    <Route path="/services/hash-generator" element={<PageTransition>{withAuthGuard(<HashGenerator />, '/services/hash-generator', toolAccess, 'Hash Generator')}</PageTransition>} />
                    <Route path="/services/uuid-generator" element={<PageTransition>{withAuthGuard(<UuidGenerator />, '/services/uuid-generator', toolAccess, 'UUID Generator')}</PageTransition>} />
                    <Route path="/services/color-converter" element={<PageTransition>{withAuthGuard(<ColorConverter />, '/services/color-converter', toolAccess, 'Color Converter')}</PageTransition>} />
                    <Route path="/services/markdown-preview" element={<PageTransition>{withAuthGuard(<MarkdownPreview />, '/services/markdown-preview', toolAccess, 'Markdown Preview')}</PageTransition>} />
                    <Route path="/services/regex-tester" element={<PageTransition>{withAuthGuard(<RegexTester />, '/services/regex-tester', toolAccess, 'Regex Tester')}</PageTransition>} />
                    <Route path="/services/keypair-generator" element={<PageTransition>{withAuthGuard(<KeypairGenerator />, '/services/keypair-generator', toolAccess, 'Keypair Generator')}</PageTransition>} />
                    <Route path="/services/redirect-inspector" element={<PageTransition>{withAuthGuard(<RedirectInspector />, '/services/redirect-inspector', toolAccess, 'Redirect Inspector')}</PageTransition>} />
                    <Route path="/services/dns-lookup" element={<PageTransition>{withAuthGuard(<DnsLookup />, '/services/dns-lookup', toolAccess, 'DNS Lookup')}</PageTransition>} />
                    <Route path="/services/unit-converter" element={<PageTransition><UnitConverter /></PageTransition>} />
                    <Route path="/services/color-contrast-checker" element={<PageTransition><ColorContrastChecker /></PageTransition>} />
                    <Route path="/services/random-data-generator" element={<PageTransition><RandomDataGenerator /></PageTransition>} />
                    <Route path="/services/text-encryptor" element={<PageTransition><TextEncryptor /></PageTransition>} />
                    <Route path="/services/markdown-table-generator" element={<PageTransition><MarkdownTableGenerator /></PageTransition>} />
                    <Route path="/services/barcode-generator" element={<PageTransition><BarcodeGenerator /></PageTransition>} />
                    <Route path="/services/css-grid-generator" element={<PageTransition><CssGridGenerator /></PageTransition>} />
                    <Route path="/services/meta-tag-generator" element={<PageTransition><MetaTagGenerator /></PageTransition>} />
                    <Route path="/services/json-diff-checker" element={<PageTransition><JsonDiffChecker /></PageTransition>} />
                    <Route path="/services/age-calculator" element={<PageTransition><AgeDateCalculator /></PageTransition>} />
                    <Route path="/services/color-name-finder" element={<PageTransition><ColorNameFinder /></PageTransition>} />
                    <Route path="/services/website-diagnostics" element={<PageTransition>{withAuthGuard(<WebsiteDiagnostics />, '/services/website-diagnostics', toolAccess, 'Website Diagnostics')}</PageTransition>} />
                    <Route path="/services/speed-test" element={<PageTransition>{withAuthGuard(<SpeedTest />, '/services/speed-test', toolAccess, 'Speed Test')}</PageTransition>} />
                    <Route path="/services/audio-separator" element={<PageTransition>{withAuthGuard(<AudioSeparator />, '/services/audio-separator', toolAccess, 'Audio Separator')}</PageTransition>} />
                    {/* No withAuthGuard here on purpose — UptimeRobot renders its own
                        richer logged-out landing/marketing view instead of the generic
                        bare "Sign In Required" wall, then gates the real command center
                        internally via useAuth(). */}
                    <Route path="/services/uptime-robot" element={<PageTransition><UptimeRobot /></PageTransition>} />

                    {/* Frontend-only tools - no backend, no auth gate */}
                    <Route path="/services/word-counter" element={<PageTransition><WordCounter /></PageTransition>} />
                    <Route path="/services/lorem-ipsum" element={<PageTransition><LoremIpsumGenerator /></PageTransition>} />
                    <Route path="/services/css-gradient-generator" element={<PageTransition><CssGradientGenerator /></PageTransition>} />
                    <Route path="/services/timestamp-converter" element={<PageTransition><TimestampConverter /></PageTransition>} />
                    <Route path="/services/password-generator" element={<PageTransition><PasswordGenerator /></PageTransition>} />
                    <Route path="/services/text-diff" element={<PageTransition><TextDiffChecker /></PageTransition>} />
                    <Route path="/services/case-converter" element={<PageTransition><CaseConverter /></PageTransition>} />
                    <Route path="/services/html-entity-codec" element={<PageTransition><HtmlEntityCodec /></PageTransition>} />
                    <Route path="/services/number-base-converter" element={<PageTransition><NumberBaseConverter /></PageTransition>} />
                    <Route path="/services/json-csv" element={<PageTransition><JsonToCsv /></PageTransition>} />
                    <Route path="/services/url-encode-decode" element={<PageTransition><UrlEncoderDecoder /></PageTransition>} />
                    <Route path="/services/jwt-decoder" element={<PageTransition><JwtDecoder /></PageTransition>} />
                    <Route path="/services/cron-explainer" element={<PageTransition><CronExplainer /></PageTransition>} />
                    <Route path="/services/color-palette" element={<PageTransition><ColorPaletteGenerator /></PageTransition>} />
                    <Route path="/services/css-box-shadow" element={<PageTransition><CssBoxShadowGenerator /></PageTransition>} />
                    <Route path="/services/http-status-codes" element={<PageTransition><HttpStatusCodes /></PageTransition>} />
                    <Route path="/services/json-to-typescript" element={<PageTransition><JsonToTypescript /></PageTransition>} />
                    <Route path="/services/favicon-generator" element={<PageTransition><FaviconGenerator /></PageTransition>} />

                    {/* Sandbox - public, frontend-only mini games */}
                    <Route path="/sandbox" element={<PageTransition><SandboxPage /></PageTransition>} />
                    <Route path="/sandbox/snake" element={<PageTransition><SnakeGame /></PageTransition>} />
                    <Route path="/sandbox/2048" element={<PageTransition><Game2048 /></PageTransition>} />
                    <Route path="/sandbox/tic-tac-toe" element={<PageTransition><TicTacToe /></PageTransition>} />
                    <Route path="/sandbox/particles" element={<PageTransition><ParticlePlayground /></PageTransition>} />
                    <Route path="/sandbox/falling-sand" element={<PageTransition><FallingSand /></PageTransition>} />
                    <Route path="/sandbox/word-guess" element={<PageTransition><WordGuess /></PageTransition>} />
                    <Route path="/sandbox/sliding-puzzle" element={<PageTransition><SlidingPuzzle /></PageTransition>} />
                    <Route path="/sandbox/reaction-test" element={<PageTransition><ReactionTest /></PageTransition>} />
                    <Route path="/sandbox/aim-trainer" element={<PageTransition><AimTrainer /></PageTransition>} />
                    <Route path="/sandbox/memory-match" element={<PageTransition><MemoryMatch /></PageTransition>} />
                    <Route path="/sandbox/simon-says" element={<PageTransition><SimonSays /></PageTransition>} />
                    <Route path="/sandbox/breakout" element={<PageTransition><Breakout /></PageTransition>} />
                    <Route path="/sandbox/minesweeper" element={<PageTransition><Minesweeper /></PageTransition>} />
                    <Route path="/sandbox/connect-four" element={<PageTransition><ConnectFour /></PageTransition>} />
                    <Route path="/sandbox/whack-a-mole" element={<PageTransition><WhackAMole /></PageTransition>} />
                    <Route path="/sandbox/typing-test" element={<PageTransition><TypingTest /></PageTransition>} />
                    <Route path="/sandbox/kaleidoscope" element={<PageTransition><Kaleidoscope /></PageTransition>} />
                    <Route path="/sandbox/game-of-life" element={<PageTransition><GameOfLife /></PageTransition>} />
                    <Route path="/sandbox/boids" element={<PageTransition><Boids /></PageTransition>} />
                    <Route path="/sandbox/spirograph" element={<PageTransition><Spirograph /></PageTransition>} />
                    <Route path="/sandbox/pong" element={<PageTransition><Pong /></PageTransition>} />
                    <Route path="/sandbox/hangman" element={<PageTransition><Hangman /></PageTransition>} />
                    <Route path="/sandbox/rock-paper-scissors" element={<PageTransition><RockPaperScissors /></PageTransition>} />
                    <Route path="/sandbox/flappy-blocks" element={<PageTransition><FlappyBlocks /></PageTransition>} />
                    <Route path="/sandbox/tetris" element={<PageTransition><Tetris /></PageTransition>} />
                    <Route path="/sandbox/sudoku" element={<PageTransition><Sudoku /></PageTransition>} />
                    <Route path="/sandbox/bubble-shooter" element={<PageTransition><BubbleShooter /></PageTransition>} />
                    <Route path="/sandbox/tower-of-hanoi" element={<PageTransition><TowerOfHanoi /></PageTransition>} />
                    <Route path="/sandbox/maze-runner" element={<PageTransition><MazeRunner /></PageTransition>} />

                    <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
                    <Route path="/services/text-to-handwriting" element={<PageTransition>{withAuthGuard(<TextToHandwritingPage />, '/services/text-to-handwriting', toolAccess, 'Text to Handwriting')}</PageTransition>} />
                    <Route path="/services/secret-sharer" element={<PageTransition>{withAuthGuard(<SecretSharerPage />, '/services/secret-sharer', toolAccess, 'Secret Sharer')}</PageTransition>} />
                    <Route path="/services/secret-sharer/:id" element={<PageTransition><SecretSharerPage /></PageTransition>} />

                    {/* Community Forum */}
                    <Route path="/community" element={<PageTransition><CommunityPage /></PageTransition>} />
                    <Route path="/community/new" element={<PageTransition><NewThreadPage /></PageTransition>} />
                    <Route path="/community/thread/:id/:slug" element={<PageTransition><ThreadDetailPage /></PageTransition>} />
                    <Route path="/community/thread/:id" element={<PageTransition><ThreadDetailPage /></PageTransition>} />
                    <Route path="/community/stats" element={<PageTransition><CommunityStatsPage /></PageTransition>} />
                    <Route path="/share/:shortId" element={<PageTransition><SharedResultPage /></PageTransition>} />
                    <Route path="/embed/:toolSlug" element={<EmbedPage />} />

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
                    <Route path="/downloads/:slug" element={<PageTransition><DownloadDetailsPage /></PageTransition>} />

                    {/* Chatbot */}
                    <Route path="/chat" element={<PageTransition><ChatbotPage /></PageTransition>} />

                    {/* Admin */}
                    <Route path="/admin/dashboard" element={<AdminGuard><PageTransition><AdminDashboardPage /></PageTransition></AdminGuard>} />
                    <Route path="/admin/create-blog" element={<AdminGuard><PageTransition><CreateBlogPage /></PageTransition></AdminGuard>} />
                    <Route path="/admin/upload-resource" element={<AdminGuard><PageTransition><UploadResourcePage /></PageTransition></AdminGuard>} />

                    {/* Legal */}
                    <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
                    <Route path="/terms-of-service" element={<PageTransition><TermsOfService /></PageTransition>} />
                    <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
                    <Route path="/hire" element={<PageTransition><HirePage /></PageTransition>} />
                    {/* Catch-all: redirect any unlisted URL to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AnimatePresence>
        </Suspense>
    );
};

export default AnimatedRoutes;

