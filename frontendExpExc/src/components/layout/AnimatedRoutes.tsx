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
const ForgotPasswordPage = lazy(() => import('../../pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../../pages/ResetPasswordPage'));
const ProfilePage = lazy(() => import('../../pages/ProfilePage'));
const RegisterPage = lazy(() => import('../../pages/RegisterPage'));
const TextToSpeechPage = lazy(() => import('../../pages/TextToSpeechPage'));
const ImageCompressorPage = lazy(() => import('../../pages/ImageCompressorPage'));
const AIDetectorPage = lazy(() => import('../../pages/AIDetectorPage'));
const AiVisionStudio = lazy(() => import('../services/AiVisionStudio'));
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
const AutonomousAIAgentsPage = lazy(() => import('../../pages/AutonomousAIAgentsPage'));
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
const ExifViewer = lazy(() => import('../services/ExifViewer'));
const SqlFormatter = lazy(() => import('../services/SqlFormatter'));
const ColorBlindnessSimulator = lazy(() => import('../services/ColorBlindnessSimulator'));
const ReadabilityAnalyzer = lazy(() => import('../services/ReadabilityAnalyzer'));
const LoanCalculator = lazy(() => import('../services/LoanCalculator'));
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
const CpuLoadTest = lazy(() => import('../services/CpuLoadTest'));
const ImageColorExtractor = lazy(() => import('../services/ImageColorExtractor'));
const PercentageCalculator = lazy(() => import('../services/PercentageCalculator'));
const QrCodeReader = lazy(() => import('../services/QrCodeReader'));
const PasswordStrengthChecker = lazy(() => import('../services/PasswordStrengthChecker'));
const JwtGenerator = lazy(() => import('../services/JwtGenerator'));
const ApiRequestTester = lazy(() => import('../services/ApiRequestTester'));
const SvgOptimizer = lazy(() => import('../services/SvgOptimizer'));
const WorldClock = lazy(() => import('../services/WorldClock'));
const PlaceholderImageGenerator = lazy(() => import('../services/PlaceholderImageGenerator'));
const WordCloudGenerator = lazy(() => import('../services/WordCloudGenerator'));
const WhitespaceVisualizer = lazy(() => import('../services/WhitespaceVisualizer'));
const CssClampCalculator = lazy(() => import('../services/CssClampCalculator'));
const PassphraseGenerator = lazy(() => import('../services/PassphraseGenerator'));
const SubnetCalculator = lazy(() => import('../services/SubnetCalculator'));
const CurlCommandGenerator = lazy(() => import('../services/CurlCommandGenerator'));
const SlugGenerator = lazy(() => import('../services/SlugGenerator'));
const UlidGenerator = lazy(() => import('../services/UlidGenerator'));
const RobotsTxtGenerator = lazy(() => import('../services/RobotsTxtGenerator'));
const ListSorterDeduplicator = lazy(() => import('../services/ListSorterDeduplicator'));
const DisplayRefreshRateTester = lazy(() => import('../services/DisplayRefreshRateTester'));
const NetworkLatencyTester = lazy(() => import('../services/NetworkLatencyTester'));
const WasmVsJsBenchmark = lazy(() => import('../services/WasmVsJsBenchmark'));
const StorageSpeedTest = lazy(() => import('../services/StorageSpeedTest'));
const AudioLatencyAnalyzer = lazy(() => import('../services/AudioLatencyAnalyzer'));
const BrowserFeatureDetector = lazy(() => import('../services/BrowserFeatureDetector'));
const FontDetector = lazy(() => import('../services/FontDetector'));
const WebrtcIpLeakTest = lazy(() => import('../services/WebrtcIpLeakTest'));
const AudioTrimmer = lazy(() => import('../services/AudioTrimmer'));
const ImageWatermarkAdder = lazy(() => import('../services/ImageWatermarkAdder'));
const UrlQueryStringTool = lazy(() => import('../services/UrlQueryStringTool'));

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
const Solitaire = lazy(() => import('../sandbox/Solitaire'));
const TriviaQuiz = lazy(() => import('../sandbox/TriviaQuiz'));
const Checkers = lazy(() => import('../sandbox/Checkers'));
const EndlessRunner = lazy(() => import('../sandbox/EndlessRunner'));
const Blackjack = lazy(() => import('../sandbox/Blackjack'));
const Asteroids = lazy(() => import('../sandbox/Asteroids'));
const Othello = lazy(() => import('../sandbox/Othello'));
const Yahtzee = lazy(() => import('../sandbox/Yahtzee'));
const Battleship = lazy(() => import('../sandbox/Battleship'));
const Mastermind = lazy(() => import('../sandbox/Mastermind'));
const DotsAndBoxes = lazy(() => import('../sandbox/DotsAndBoxes'));
const WordSearch = lazy(() => import('../sandbox/WordSearch'));
const AirHockey = lazy(() => import('../sandbox/AirHockey'));
const Nonogram = lazy(() => import('../sandbox/Nonogram'));

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
    const isYtd = window.location.hostname.startsWith('ytd.');

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
                    <Route path="/services/ai-vision-studio" element={<PageTransition>{withAuthGuard(<AiVisionStudio />, '/services/ai-vision-studio', toolAccess, 'Realtime AI Vision Studio')}</PageTransition>} />
                    <Route path="/services/ai-vision" element={<PageTransition>{withAuthGuard(<AiVisionStudio />, '/services/ai-vision', toolAccess, 'Realtime AI Vision Studio')}</PageTransition>} />
                    <Route path="/services/vision-studio" element={<PageTransition>{withAuthGuard(<AiVisionStudio />, '/services/vision-studio', toolAccess, 'Realtime AI Vision Studio')}</PageTransition>} />
                    <Route path="/services/100" element={<PageTransition>{withAuthGuard(<AiVisionStudio />, '/services/100', toolAccess, 'Realtime AI Vision Studio')}</PageTransition>} />

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
                    <Route path="/services/unit-converter" element={<PageTransition>{withAuthGuard(<UnitConverter />, '/services/unit-converter', toolAccess, 'Unit Converter')}</PageTransition>} />
                    <Route path="/services/color-contrast-checker" element={<PageTransition>{withAuthGuard(<ColorContrastChecker />, '/services/color-contrast-checker', toolAccess, 'Color Contrast Checker')}</PageTransition>} />
                    <Route path="/services/random-data-generator" element={<PageTransition>{withAuthGuard(<RandomDataGenerator />, '/services/random-data-generator', toolAccess, 'Random Data Generator')}</PageTransition>} />
                    <Route path="/services/text-encryptor" element={<PageTransition>{withAuthGuard(<TextEncryptor />, '/services/text-encryptor', toolAccess, 'Text Encryptor')}</PageTransition>} />
                    <Route path="/services/markdown-table-generator" element={<PageTransition>{withAuthGuard(<MarkdownTableGenerator />, '/services/markdown-table-generator', toolAccess, 'Markdown Table Generator')}</PageTransition>} />
                    <Route path="/services/barcode-generator" element={<PageTransition>{withAuthGuard(<BarcodeGenerator />, '/services/barcode-generator', toolAccess, 'Barcode Generator')}</PageTransition>} />
                    <Route path="/services/css-grid-generator" element={<PageTransition>{withAuthGuard(<CssGridGenerator />, '/services/css-grid-generator', toolAccess, 'CSS Grid Generator')}</PageTransition>} />
                    <Route path="/services/meta-tag-generator" element={<PageTransition>{withAuthGuard(<MetaTagGenerator />, '/services/meta-tag-generator', toolAccess, 'Meta Tag Generator')}</PageTransition>} />
                    <Route path="/services/json-diff-checker" element={<PageTransition>{withAuthGuard(<JsonDiffChecker />, '/services/json-diff-checker', toolAccess, 'JSON Diff Checker')}</PageTransition>} />
                    <Route path="/services/age-calculator" element={<PageTransition>{withAuthGuard(<AgeDateCalculator />, '/services/age-calculator', toolAccess, 'Age & Date Difference Calculator')}</PageTransition>} />
                    <Route path="/services/color-name-finder" element={<PageTransition>{withAuthGuard(<ColorNameFinder />, '/services/color-name-finder', toolAccess, 'Color Name Finder')}</PageTransition>} />
                    <Route path="/services/website-diagnostics" element={<PageTransition>{withAuthGuard(<WebsiteDiagnostics />, '/services/website-diagnostics', toolAccess, 'Website Diagnostics')}</PageTransition>} />
                    <Route path="/services/speed-test" element={<PageTransition>{withAuthGuard(<SpeedTest />, '/services/speed-test', toolAccess, 'Speed Test')}</PageTransition>} />
                    <Route path="/services/audio-separator" element={<PageTransition>{withAuthGuard(<AudioSeparator />, '/services/audio-separator', toolAccess, 'Audio Separator')}</PageTransition>} />
                    {/* No withAuthGuard here on purpose, UptimeRobot renders its own
                        richer logged-out landing/marketing view instead of the generic
                        bare "Sign In Required" wall, then gates the real command center
                        internally via useAuth(). */}
                    <Route path="/services/uptime-robot" element={<PageTransition>{withAuthGuard(<UptimeRobot />, '/services/uptime-robot', toolAccess, 'Uptime Robot Monitor')}</PageTransition>} />

                    {/* Frontend-only tools - no backend, no auth gate */}
                    <Route path="/services/word-counter" element={<PageTransition>{withAuthGuard(<WordCounter />, '/services/word-counter', toolAccess, 'Word & Character Counter')}</PageTransition>} />
                    <Route path="/services/lorem-ipsum" element={<PageTransition>{withAuthGuard(<LoremIpsumGenerator />, '/services/lorem-ipsum', toolAccess, 'Lorem Ipsum Generator')}</PageTransition>} />
                    <Route path="/services/css-gradient-generator" element={<PageTransition>{withAuthGuard(<CssGradientGenerator />, '/services/css-gradient-generator', toolAccess, 'CSS Gradient Generator')}</PageTransition>} />
                    <Route path="/services/timestamp-converter" element={<PageTransition>{withAuthGuard(<TimestampConverter />, '/services/timestamp-converter', toolAccess, 'Timestamp Converter')}</PageTransition>} />
                    <Route path="/services/password-generator" element={<PageTransition>{withAuthGuard(<PasswordGenerator />, '/services/password-generator', toolAccess, 'Password Generator')}</PageTransition>} />
                    <Route path="/services/text-diff" element={<PageTransition>{withAuthGuard(<TextDiffChecker />, '/services/text-diff', toolAccess, 'Text Diff Checker')}</PageTransition>} />
                    <Route path="/services/case-converter" element={<PageTransition>{withAuthGuard(<CaseConverter />, '/services/case-converter', toolAccess, 'Case Converter')}</PageTransition>} />
                    <Route path="/services/html-entity-codec" element={<PageTransition>{withAuthGuard(<HtmlEntityCodec />, '/services/html-entity-codec', toolAccess, 'HTML Entity Encoder/Decoder')}</PageTransition>} />
                    <Route path="/services/number-base-converter" element={<PageTransition>{withAuthGuard(<NumberBaseConverter />, '/services/number-base-converter', toolAccess, 'Number Base Converter')}</PageTransition>} />

                    {/* Client-only tools: all processing happens in the browser,
                        so these need no auth guard and no backend round-trip. */}
                    <Route path="/services/exif-viewer" element={<PageTransition>{withAuthGuard(<ExifViewer />, '/services/exif-viewer', toolAccess, 'EXIF Metadata Viewer & Stripper')}</PageTransition>} />
                    <Route path="/services/sql-formatter" element={<PageTransition>{withAuthGuard(<SqlFormatter />, '/services/sql-formatter', toolAccess, 'SQL Formatter')}</PageTransition>} />
                    <Route path="/services/color-blindness-simulator" element={<PageTransition>{withAuthGuard(<ColorBlindnessSimulator />, '/services/color-blindness-simulator', toolAccess, 'Colour Blindness Simulator')}</PageTransition>} />
                    <Route path="/services/readability-analyzer" element={<PageTransition>{withAuthGuard(<ReadabilityAnalyzer />, '/services/readability-analyzer', toolAccess, 'Readability & Text Analyzer')}</PageTransition>} />
                    <Route path="/services/loan-calculator" element={<PageTransition>{withAuthGuard(<LoanCalculator />, '/services/loan-calculator', toolAccess, 'Loan & EMI Calculator')}</PageTransition>} />
                    <Route path="/services/json-csv" element={<PageTransition>{withAuthGuard(<JsonToCsv />, '/services/json-csv', toolAccess, 'JSON ↔ CSV Converter')}</PageTransition>} />
                    <Route path="/services/url-encode-decode" element={<PageTransition>{withAuthGuard(<UrlEncoderDecoder />, '/services/url-encode-decode', toolAccess, 'URL Encoder / Decoder')}</PageTransition>} />
                    <Route path="/services/jwt-decoder" element={<PageTransition>{withAuthGuard(<JwtDecoder />, '/services/jwt-decoder', toolAccess, 'JWT Decoder')}</PageTransition>} />
                    <Route path="/services/cron-explainer" element={<PageTransition>{withAuthGuard(<CronExplainer />, '/services/cron-explainer', toolAccess, 'Cron Expression Explainer')}</PageTransition>} />
                    <Route path="/services/color-palette" element={<PageTransition>{withAuthGuard(<ColorPaletteGenerator />, '/services/color-palette', toolAccess, 'Color Palette Generator')}</PageTransition>} />
                    <Route path="/services/css-box-shadow" element={<PageTransition>{withAuthGuard(<CssBoxShadowGenerator />, '/services/css-box-shadow', toolAccess, 'CSS Box Shadow Generator')}</PageTransition>} />
                    <Route path="/services/http-status-codes" element={<PageTransition>{withAuthGuard(<HttpStatusCodes />, '/services/http-status-codes', toolAccess, 'HTTP Status Code Reference')}</PageTransition>} />
                    <Route path="/services/json-to-typescript" element={<PageTransition>{withAuthGuard(<JsonToTypescript />, '/services/json-to-typescript', toolAccess, 'JSON to TypeScript')}</PageTransition>} />
                    <Route path="/services/favicon-generator" element={<PageTransition>{withAuthGuard(<FaviconGenerator />, '/services/favicon-generator', toolAccess, 'Favicon Generator')}</PageTransition>} />
                    <Route path="/services/cpu-load-test" element={<PageTransition>{withAuthGuard(<CpuLoadTest />, '/services/cpu-load-test', toolAccess, 'CPU, GPU & RAM Benchmark')}</PageTransition>} />
                    <Route path="/services/image-color-extractor" element={<PageTransition>{withAuthGuard(<ImageColorExtractor />, '/services/image-color-extractor', toolAccess, 'Image Color Palette Extractor')}</PageTransition>} />
                    <Route path="/services/percentage-calculator" element={<PageTransition>{withAuthGuard(<PercentageCalculator />, '/services/percentage-calculator', toolAccess, 'Percentage Calculator')}</PageTransition>} />
                    <Route path="/services/qr-code-reader" element={<PageTransition>{withAuthGuard(<QrCodeReader />, '/services/qr-code-reader', toolAccess, 'QR Code Reader')}</PageTransition>} />
                    <Route path="/services/password-strength-checker" element={<PageTransition>{withAuthGuard(<PasswordStrengthChecker />, '/services/password-strength-checker', toolAccess, 'Password Strength Checker')}</PageTransition>} />
                    <Route path="/services/jwt-generator" element={<PageTransition>{withAuthGuard(<JwtGenerator />, '/services/jwt-generator', toolAccess, 'JWT Generator')}</PageTransition>} />
                    <Route path="/services/api-request-tester" element={<PageTransition>{withAuthGuard(<ApiRequestTester />, '/services/api-request-tester', toolAccess, 'API Request Tester')}</PageTransition>} />
                    <Route path="/services/svg-optimizer" element={<PageTransition>{withAuthGuard(<SvgOptimizer />, '/services/svg-optimizer', toolAccess, 'SVG Optimizer')}</PageTransition>} />
                    <Route path="/services/world-clock" element={<PageTransition>{withAuthGuard(<WorldClock />, '/services/world-clock', toolAccess, 'World Clock & Timezone Converter')}</PageTransition>} />
                    <Route path="/services/placeholder-image-generator" element={<PageTransition>{withAuthGuard(<PlaceholderImageGenerator />, '/services/placeholder-image-generator', toolAccess, 'Placeholder Image Generator')}</PageTransition>} />
                    <Route path="/services/word-cloud-generator" element={<PageTransition>{withAuthGuard(<WordCloudGenerator />, '/services/word-cloud-generator', toolAccess, 'Word Cloud Generator')}</PageTransition>} />
                    <Route path="/services/whitespace-visualizer" element={<PageTransition>{withAuthGuard(<WhitespaceVisualizer />, '/services/whitespace-visualizer', toolAccess, 'Whitespace & Invisible Character Visualizer')}</PageTransition>} />
                    <Route path="/services/css-clamp-calculator" element={<PageTransition>{withAuthGuard(<CssClampCalculator />, '/services/css-clamp-calculator', toolAccess, 'CSS Clamp / Fluid Typography Calculator')}</PageTransition>} />
                    <Route path="/services/passphrase-generator" element={<PageTransition>{withAuthGuard(<PassphraseGenerator />, '/services/passphrase-generator', toolAccess, 'Passphrase Generator')}</PageTransition>} />
                    <Route path="/services/subnet-calculator" element={<PageTransition>{withAuthGuard(<SubnetCalculator />, '/services/subnet-calculator', toolAccess, 'IPv4 Subnet / CIDR Calculator')}</PageTransition>} />
                    <Route path="/services/curl-command-generator" element={<PageTransition>{withAuthGuard(<CurlCommandGenerator />, '/services/curl-command-generator', toolAccess, 'cURL Command Generator')}</PageTransition>} />
                    <Route path="/services/slug-generator" element={<PageTransition>{withAuthGuard(<SlugGenerator />, '/services/slug-generator', toolAccess, 'Slug Generator')}</PageTransition>} />
                    <Route path="/services/ulid-generator" element={<PageTransition>{withAuthGuard(<UlidGenerator />, '/services/ulid-generator', toolAccess, 'ULID Generator')}</PageTransition>} />
                    <Route path="/services/robots-txt-generator" element={<PageTransition>{withAuthGuard(<RobotsTxtGenerator />, '/services/robots-txt-generator', toolAccess, 'Robots.txt Generator')}</PageTransition>} />
                    <Route path="/services/list-sorter-deduplicator" element={<PageTransition>{withAuthGuard(<ListSorterDeduplicator />, '/services/list-sorter-deduplicator', toolAccess, 'List Sorter & Deduplicator')}</PageTransition>} />
                    <Route path="/services/refresh-rate-tester" element={<PageTransition>{withAuthGuard(<DisplayRefreshRateTester />, '/services/refresh-rate-tester', toolAccess, 'Display Refresh Rate & Frame Time Tester')}</PageTransition>} />
                    <Route path="/services/network-latency-tester" element={<PageTransition>{withAuthGuard(<NetworkLatencyTester />, '/services/network-latency-tester', toolAccess, 'Network Latency & Jitter Tester')}</PageTransition>} />
                    <Route path="/services/wasm-vs-js-benchmark" element={<PageTransition>{withAuthGuard(<WasmVsJsBenchmark />, '/services/wasm-vs-js-benchmark', toolAccess, 'WebAssembly vs JavaScript Benchmark')}</PageTransition>} />
                    <Route path="/services/storage-speed-test" element={<PageTransition>{withAuthGuard(<StorageSpeedTest />, '/services/storage-speed-test', toolAccess, 'Storage (IndexedDB) Speed Test')}</PageTransition>} />
                    <Route path="/services/audio-latency-analyzer" element={<PageTransition>{withAuthGuard(<AudioLatencyAnalyzer />, '/services/audio-latency-analyzer', toolAccess, 'Audio Latency Analyzer')}</PageTransition>} />
                    <Route path="/services/browser-feature-detector" element={<PageTransition>{withAuthGuard(<BrowserFeatureDetector />, '/services/browser-feature-detector', toolAccess, 'Browser Feature & API Support Matrix')}</PageTransition>} />
                    <Route path="/services/font-detector" element={<PageTransition>{withAuthGuard(<FontDetector />, '/services/font-detector', toolAccess, 'Installed Font Detector')}</PageTransition>} />
                    <Route path="/services/webrtc-ip-leak-test" element={<PageTransition>{withAuthGuard(<WebrtcIpLeakTest />, '/services/webrtc-ip-leak-test', toolAccess, 'WebRTC IP Leak Test')}</PageTransition>} />
                    <Route path="/services/audio-trimmer" element={<PageTransition>{withAuthGuard(<AudioTrimmer />, '/services/audio-trimmer', toolAccess, 'Audio Trimmer & Cutter')}</PageTransition>} />
                    <Route path="/services/image-watermark-adder" element={<PageTransition>{withAuthGuard(<ImageWatermarkAdder />, '/services/image-watermark-adder', toolAccess, 'Image Watermark Adder')}</PageTransition>} />
                    <Route path="/services/url-query-string-tool" element={<PageTransition>{withAuthGuard(<UrlQueryStringTool />, '/services/url-query-string-tool', toolAccess, 'URL Query String Parser & Builder')}</PageTransition>} />

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
                    <Route path="/sandbox/solitaire" element={<PageTransition><Solitaire /></PageTransition>} />
                    <Route path="/sandbox/trivia-quiz" element={<PageTransition><TriviaQuiz /></PageTransition>} />
                    <Route path="/sandbox/checkers" element={<PageTransition><Checkers /></PageTransition>} />
                    <Route path="/sandbox/endless-runner" element={<PageTransition><EndlessRunner /></PageTransition>} />
                    <Route path="/sandbox/blackjack" element={<PageTransition><Blackjack /></PageTransition>} />
                    <Route path="/sandbox/asteroids" element={<PageTransition><Asteroids /></PageTransition>} />
                    <Route path="/sandbox/othello" element={<PageTransition><Othello /></PageTransition>} />
                    <Route path="/sandbox/yahtzee" element={<PageTransition><Yahtzee /></PageTransition>} />
                    <Route path="/sandbox/battleship" element={<PageTransition><Battleship /></PageTransition>} />
                    <Route path="/sandbox/mastermind" element={<PageTransition><Mastermind /></PageTransition>} />
                    <Route path="/sandbox/dots-and-boxes" element={<PageTransition><DotsAndBoxes /></PageTransition>} />
                    <Route path="/sandbox/word-search" element={<PageTransition><WordSearch /></PageTransition>} />
                    <Route path="/sandbox/air-hockey" element={<PageTransition><AirHockey /></PageTransition>} />
                    <Route path="/sandbox/nonogram" element={<PageTransition><Nonogram /></PageTransition>} />

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
                    <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
                    <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />
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
                    <Route path="/solutions/autonomous-ai-agents" element={<PageTransition><AutonomousAIAgentsPage /></PageTransition>} />
                    {/* Catch-all: redirect any unlisted URL to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AnimatePresence>
        </Suspense>
    );
};

export default AnimatedRoutes;

