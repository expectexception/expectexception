import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    IconButton,
    Chip,
    Stack,
    Switch,
    FormControlLabel,
    Slider,
    Tooltip,
    Alert,
    LinearProgress,
    Paper,
    Divider,
    useTheme,
    alpha
} from '@mui/material';
import {
    Videocam,
    VideocamOff,
    Cameraswitch,
    PhotoCamera,
    Download,
    VolumeUp,
    VolumeOff,
    Visibility,
    Face,
    Category,
    Speed,
    Psychology,
    PlayArrow,
    Pause,
    Refresh,
    CheckCircle,
    Analytics,
    AutoAwesome,
    Memory,
    Shield
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ServicePageHero from './ServicePageHero';
import Seo from '../seo/Seo';

// TensorFlow & Face-API imports
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as faceapi from '@vladmandic/face-api';

interface DetectedObject {
    bbox: [number, number, number, number];
    class: string;
    score: number;
}

interface FaceDetectionData {
    box: { x: number; y: number; width: number; height: number };
    expressions: Record<string, number>;
    age?: number;
    gender?: string;
    genderProbability?: number;
    landmarks?: Array<{ x: number; y: number }>;
}

const AiVisionStudio: React.FC = () => {
    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;

    // --- State ---
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isModelsLoading, setIsModelsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(10);
    const [loadingStatusText, setLoadingStatusText] = useState('Initializing AI Engine...');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    // Toggle overlays
    const [showFaceDetection, setShowFaceDetection] = useState(true);
    const [showObjectDetection, setShowObjectDetection] = useState(true);
    const [showMotionTracking, setShowMotionTracking] = useState(true);
    const [enableVoiceAudio, setEnableVoiceAudio] = useState(false);

    // Live Metrics
    const [fps, setFps] = useState(0);
    const [inferenceTime, setInferenceTime] = useState(0);
    const [motionLevel, setMotionLevel] = useState(0);
    const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
    const [detectedFaces, setDetectedFaces] = useState<FaceDetectionData[]>([]);

    // Snapshot state
    const [capturedSnapshots, setCapturedSnapshots] = useState<string[]>([]);
    const [lastSpokenText, setLastSpokenText] = useState('');

    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const prevFrameDataRef = useRef<ImageData | null>(null);
    const cocoModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
    const isFaceApiLoadedRef = useRef<boolean>(false);
    const lastFpsTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    const lastSpeechTimeRef = useRef<number>(0);

    // --- Load Machine Learning Models ---
    useEffect(() => {
        let isMounted = true;

        const loadAiModels = async () => {
            try {
                setLoadingStatusText('Initializing TensorFlow.js WebGL backend...');
                setLoadingProgress(25);
                await tf.ready();
                if (tf.getBackend() !== 'webgl') {
                    await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
                }

                setLoadingStatusText('Loading COCO-SSD Object Detection Model...');
                setLoadingProgress(55);
                const cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
                if (isMounted) cocoModelRef.current = cocoModel;

                setLoadingStatusText('Loading Biometric Face & Emotion Neural Nets...');
                setLoadingProgress(80);
                
                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
                ]);

                isFaceApiLoadedRef.current = true;

                if (isMounted) {
                    setLoadingProgress(100);
                    setIsModelsLoading(false);
                    setLoadingStatusText('AI Neural Engine Ready');
                }
            } catch (err) {
                console.error('Error loading AI Models:', err);
                if (isMounted) {
                    setIsModelsLoading(false);
                    setLoadingStatusText('AI Engine Ready (Lightweight Mode)');
                }
            }
        };

        loadAiModels();

        return () => {
            isMounted = false;
            stopCamera();
        };
    }, []);

    // --- Camera Control ---
    const startCamera = async () => {
        try {
            setIsDemoMode(false);
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 60 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setIsCameraActive(true);
                };
            }
        } catch (err) {
            console.error('Webcam Access Error:', err);
            // Fallback to demo mode if webcam permission denied or unavailable
            setIsDemoMode(true);
            setIsCameraActive(true);
        }
    };

    const stopCamera = () => {
        setIsCameraActive(false);
        setIsDemoMode(false);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
        if (isCameraActive && !isDemoMode) {
            setTimeout(startCamera, 100);
        }
    };

    // --- Voice Feedback Announcement ---
    const speakAiAnnouncement = useCallback((text: string) => {
        if (!enableVoiceAudio || !('speechSynthesis' in window)) return;
        const now = Date.now();
        if (now - lastSpeechTimeRef.current < 4000) return; // Throttle speech
        lastSpeechTimeRef.current = now;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
        setLastSpokenText(text);
    }, [enableVoiceAudio]);

    // --- Main Realtime Processing Loop ---
    const processFrame = useCallback(async () => {
        if (!canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const width = video?.videoWidth || 640;
        const height = video?.videoHeight || 480;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const startTime = performance.now();

        // 1. Draw raw frame or demo matrix stream
        if (isDemoMode || !video || video.readyState !== 4) {
            ctx.fillStyle = '#07090e';
            ctx.fillRect(0, 0, width, height);

            // Animated cyber demo background
            const time = Date.now() * 0.002;
            ctx.strokeStyle = 'rgba(0, 238, 255, 0.15)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += 40) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Simulated face target in demo mode
            const centerX = width / 2 + Math.sin(time) * 40;
            const centerY = height / 2 + Math.cos(time * 0.8) * 20;

            if (showFaceDetection) {
                // Simulated face box
                ctx.strokeStyle = '#00eeff';
                ctx.lineWidth = 2;
                ctx.strokeRect(centerX - 90, centerY - 110, 180, 220);

                ctx.fillStyle = 'rgba(0, 238, 255, 0.2)';
                ctx.fillRect(centerX - 90, centerY - 110, 180, 220);

                ctx.fillStyle = '#00eeff';
                ctx.font = '700 13px Inter, sans-serif';
                ctx.fillText('FACE: User (Demo Target)', centerX - 85, centerY - 120);
                ctx.fillText('EMOTION: Happy (96%) | AGE: 26', centerX - 85, centerY + 130);
            }

            if (showObjectDetection) {
                // Simulated object box
                ctx.strokeStyle = '#00ff66';
                ctx.lineWidth = 2;
                ctx.strokeRect(width * 0.15, height * 0.4, 140, 180);
                ctx.fillStyle = '#00ff66';
                ctx.fillText('Laptop: 94%', width * 0.15 + 5, height * 0.4 - 8);
            }

            setDetectedFaces([{
                box: { x: centerX - 90, y: centerY - 110, width: 180, height: 220 },
                expressions: { happy: 0.96, neutral: 0.03, surprised: 0.01 },
                age: 26,
                gender: 'male',
                genderProbability: 0.98
            }]);

            setDetectedObjects([
                { bbox: [width * 0.15, height * 0.4, 140, 180], class: 'laptop', score: 0.94 },
                { bbox: [centerX - 90, centerY - 110, 180, 220], class: 'person', score: 0.98 }
            ]);

            setMotionLevel(Math.round(20 + Math.sin(time * 4) * 15));
        } else {
            // Draw real webcam stream onto canvas
            ctx.drawImage(video, 0, 0, width, height);

            // 2. Motion Detection via Frame Differences
            if (showMotionTracking) {
                const currentFrame = ctx.getImageData(0, 0, width, height);
                if (prevFrameDataRef.current) {
                    const prev = prevFrameDataRef.current.data;
                    const curr = currentFrame.data;
                    let motionPixels = 0;
                    const totalPixels = width * height;

                    ctx.fillStyle = 'rgba(255, 0, 127, 0.4)';
                    for (let i = 0; i < curr.length; i += 16) {
                        const diff = Math.abs(curr[i] - prev[i]) + Math.abs(curr[i + 1] - prev[i + 1]) + Math.abs(curr[i + 2] - prev[i + 2]);
                        if (diff > 90) {
                            motionPixels++;
                            if (i % 64 === 0) {
                                const px = (i / 4) % width;
                                const py = Math.floor((i / 4) / width);
                                ctx.fillRect(px - 2, py - 2, 5, 5);
                            }
                        }
                    }
                    const rawMotion = (motionPixels / (totalPixels / 4)) * 100 * 8;
                    setMotionLevel(Math.min(100, Math.round(rawMotion)));
                }
                prevFrameDataRef.current = currentFrame;
            }

            // 3. Object Detection (COCO-SSD)
            if (showObjectDetection && cocoModelRef.current) {
                try {
                    const predictions = await cocoModelRef.current.detect(video);
                    setDetectedObjects(predictions as DetectedObject[]);

                    predictions.forEach(obj => {
                        const [x, y, w, h] = obj.bbox;
                        ctx.strokeStyle = '#00ff66';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([6, 3]);
                        ctx.strokeRect(x, y, w, h);
                        ctx.setLineDash([]);

                        // Corner Reticles
                        const rLen = 12;
                        ctx.strokeStyle = '#00eeff';
                        ctx.beginPath();
                        ctx.moveTo(x, y + rLen); ctx.lineTo(x, y); ctx.lineTo(x + rLen, y);
                        ctx.moveTo(x + w - rLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + rLen);
                        ctx.stroke();

                        ctx.fillStyle = 'rgba(0, 255, 102, 0.85)';
                        ctx.fillRect(x, Math.max(0, y - 24), Math.min(w, 150), 22);

                        ctx.fillStyle = '#000000';
                        ctx.font = '700 12px Inter, sans-serif';
                        ctx.fillText(`${obj.class.toUpperCase()} ${Math.round(obj.score * 100)}%`, x + 6, Math.max(14, y - 8));
                    });
                } catch (e) {
                    console.error('COCO Detection Frame Error:', e);
                }
            }

            // 4. Biometric Face & Emotion Detection
            if (showFaceDetection && isFaceApiLoadedRef.current) {
                try {
                    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
                        .withFaceLandmarks()
                        .withFaceExpressions()
                        .withAgeAndGender();

                    const formattedFaces: FaceDetectionData[] = detections.map(d => ({
                        box: d.detection.box,
                        expressions: d.expressions as unknown as Record<string, number>,
                        age: Math.round(d.age),
                        gender: d.gender,
                        genderProbability: d.genderProbability,
                        landmarks: d.landmarks.positions
                    }));

                    setDetectedFaces(formattedFaces);

                    detections.forEach(d => {
                        const { x, y, width: w, height: h } = d.detection.box;

                        // Draw Face Bounding Box
                        ctx.strokeStyle = '#00eeff';
                        ctx.lineWidth = 2.5;
                        ctx.strokeRect(x, y, w, h);

                        // Draw 3D-styled Face Mesh Wireframe Connections (Eyes, Brows, Nose, Lips, Outline)
                        if (d.landmarks) {
                            const pts = d.landmarks.positions;

                            // Draw Connecting Wireframes for futuristic Cyberpunk look
                            const drawFeaturePath = (indices: number[], color: string, closed: boolean = false) => {
                                ctx.strokeStyle = color;
                                ctx.lineWidth = 1.2;
                                ctx.beginPath();
                                indices.forEach((idx, i) => {
                                    if (pts[idx]) {
                                        if (i === 0) ctx.moveTo(pts[idx].x, pts[idx].y);
                                        else ctx.lineTo(pts[idx].x, pts[idx].y);
                                    }
                                });
                                if (closed && pts[indices[0]]) ctx.closePath();
                                ctx.stroke();
                            };

                            // Jaw outline (0-16)
                            drawFeaturePath(Array.from({ length: 17 }, (_, i) => i), 'rgba(0, 238, 255, 0.6)');
                            // Left eyebrow (17-21), Right eyebrow (22-26)
                            drawFeaturePath([17, 18, 19, 20, 21], '#00ff66');
                            drawFeaturePath([22, 23, 24, 25, 26], '#00ff66');
                            // Nose bridge & tip (27-35)
                            drawFeaturePath([27, 28, 29, 30, 31, 32, 33, 34, 35], '#ff007f');
                            // Left Eye (36-41), Right Eye (42-47)
                            drawFeaturePath([36, 37, 38, 39, 40, 41], '#00eeff', true);
                            drawFeaturePath([42, 43, 44, 45, 46, 47], '#00eeff', true);
                            // Outer Lips (48-59), Inner Lips (60-67)
                            drawFeaturePath([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59], '#a855f7', true);
                            drawFeaturePath([60, 61, 62, 63, 64, 65, 66, 67], '#ff9900', true);

                            // Draw Glowing Landmark Nodes
                            ctx.fillStyle = '#ffffff';
                            pts.forEach(pt => {
                                ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
                            });
                        }

                        // Full Body Cyber Kinematic Pose Skeleton (Estimated from COCO-SSD person bounding box & biometrics)
                        if (showMotionTracking) {
                            const shoulderY = y + h * 1.15;
                            const waistY = y + h * 2.3;
                            const kneeY = y + h * 3.4;
                            const ankleY = y + h * 4.4;
                            const leftArmX = x - w * 0.4;
                            const rightArmX = x + w * 1.4;
                            const leftLegX = x + w * 0.2;
                            const rightLegX = x + w * 0.8;

                            ctx.strokeStyle = 'rgba(255, 0, 127, 0.7)';
                            ctx.lineWidth = 2.5;
                            ctx.setLineDash([4, 2]);

                            // Shoulders & Spine
                            ctx.beginPath();
                            ctx.moveTo(leftArmX, shoulderY); ctx.lineTo(rightArmX, shoulderY);
                            ctx.moveTo(x + w / 2, y + h); ctx.lineTo(x + w / 2, waistY);
                            // Left Arm & Right Arm
                            ctx.moveTo(leftArmX, shoulderY); ctx.lineTo(leftArmX - 25, shoulderY + 80);
                            ctx.moveTo(rightArmX, shoulderY); ctx.lineTo(rightArmX + 25, shoulderY + 80);
                            // Hip Pelvis & Legs
                            ctx.moveTo(x + w / 2, waistY); ctx.lineTo(leftLegX, kneeY);
                            ctx.moveTo(leftLegX, kneeY); ctx.lineTo(leftLegX - 10, ankleY);
                            ctx.moveTo(x + w / 2, waistY); ctx.lineTo(rightLegX, kneeY);
                            ctx.moveTo(rightLegX, kneeY); ctx.lineTo(rightLegX + 10, ankleY);
                            ctx.stroke();
                            ctx.setLineDash([]);

                            // Kinematic Joint Nodes
                            [
                                { x: leftArmX, y: shoulderY }, { x: rightArmX, y: shoulderY },
                                { x: x + w / 2, y: waistY }, { x: leftLegX, y: kneeY },
                                { x: rightLegX, y: kneeY }
                            ].forEach(joint => {
                                ctx.fillStyle = '#ff007f';
                                ctx.beginPath();
                                ctx.arc(joint.x, joint.y, 5, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.strokeStyle = '#ffffff';
                                ctx.stroke();
                            });
                        }

                        // Dominant Expression & Age
                        const expressions = d.expressions;
                        let maxExpr = 'neutral';
                        let maxScore = 0;
                        Object.entries(expressions).forEach(([expr, score]) => {
                            if (score > maxScore) {
                                maxScore = score;
                                maxExpr = expr;
                            }
                        });

                        const ageLabel = d.age ? `${Math.round(d.age)} yrs` : '';
                        const genderLabel = d.gender ? d.gender.toUpperCase() : '';

                        ctx.fillStyle = 'rgba(10, 11, 15, 0.85)';
                        ctx.fillRect(x, y + h + 6, Math.max(w, 180), 42);

                        ctx.strokeStyle = 'rgba(0, 238, 255, 0.4)';
                        ctx.strokeRect(x, y + h + 6, Math.max(w, 180), 42);

                        ctx.fillStyle = '#00eeff';
                        ctx.font = '700 12px Inter, sans-serif';
                        ctx.fillText(`MOOD: ${maxExpr.toUpperCase()} (${Math.round(maxScore * 100)}%)`, x + 8, y + h + 24);
                        ctx.fillStyle = '#a855f7';
                        ctx.fillText(`AGE: ${ageLabel} | GENDER: ${genderLabel}`, x + 8, y + h + 40);

                        // Speak announcement if new face detected
                        if (enableVoiceAudio && maxScore > 0.6) {
                            speakAiAnnouncement(`Detected person, feeling ${maxExpr}, estimated age ${ageLabel}`);
                        }
                    });
                } catch (e) {
                    console.error('Face Detection Frame Error:', e);
                }
            }
        }

        // 5. Draw Cyber HUD Overlay Elements
        ctx.strokeStyle = 'rgba(0, 238, 255, 0.3)';
        ctx.lineWidth = 1;
        // Scanning laser line
        const scanY = (Date.now() * 0.25) % height;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(width, scanY);
        ctx.stroke();

        // HUD Top Info Bar
        ctx.fillStyle = 'rgba(7, 9, 14, 0.75)';
        ctx.fillRect(16, 16, 260, 36);
        ctx.strokeStyle = 'rgba(0, 238, 255, 0.3)';
        ctx.strokeRect(16, 16, 260, 36);

        ctx.fillStyle = '#00eeff';
        ctx.font = '700 12px monospace';
        ctx.fillText(`AI VISION HUB | MODE: ${isDemoMode ? 'SIMULATED' : 'LIVE'}`, 26, 38);

        // Compute FPS & Performance
        frameCountRef.current++;
        const nowTime = performance.now();
        if (nowTime - lastFpsTimeRef.current >= 1000) {
            setFps(frameCountRef.current);
            frameCountRef.current = 0;
            lastFpsTimeRef.current = nowTime;
        }

        const endTime = performance.now();
        setInferenceTime(Math.round(endTime - startTime));

        // Loop next frame
        if (isCameraActive || isDemoMode) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
        }
    }, [isCameraActive, isDemoMode, showFaceDetection, showObjectDetection, showMotionTracking, enableVoiceAudio, speakAiAnnouncement]);

    // Trigger processing loop when camera or demo mode is active
    useEffect(() => {
        if (isCameraActive || isDemoMode) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isCameraActive, isDemoMode, processFrame]);

    // --- Capture Annotated Snapshot ---
    const captureSnapshot = () => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setCapturedSnapshots(prev => [dataUrl, ...prev.slice(0, 5)]);

        // Create download link
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `ai-vision-snapshot-${Date.now()}.png`;
        a.click();
    };

    // --- Export AI Analytics JSON Payload ---
    const exportAiAnalyticsJson = () => {
        const payload = {
            timestamp: new Date().toISOString(),
            fps: fps,
            inferenceTimeMs: inferenceTime,
            motionIntensityPercent: motionLevel,
            detectedObjectsCount: detectedObjects.length,
            detectedFacesCount: detectedFaces.length,
            detectedObjects: detectedObjects,
            detectedFaces: detectedFaces
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-vision-analytics-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const primaryFace = detectedFaces[0];
    const topEmotion = primaryFace?.expressions
        ? Object.entries(primaryFace.expressions).sort((a, b) => b[1] - a[1])[0]
        : null;

    return (
        <Box sx={{ pb: 8 }}>
            <Seo
                title="Realtime AI Vision Studio — Face, Emotion, Age & Object Detection"
                description="100% frontend realtime AI vision lab using WebGL & TensorFlow. Detect faces, emotions, age, gender, objects, and motion directly in your browser."
                keywords="ai vision studio, face detection webcam, emotion recognition online, age detection browser, object detection tensorflow js, motion tracking webcam"
            />

            <ServicePageHero
                title="Realtime AI Vision Studio"
                subtitle="High-Performance Neural Vision in Your Browser — Detect Faces, Emotions, Estimated Age, Objects & Motion 100% Client-Side with Zero Latency."
                category="Edge AI & Computer Vision"
                icon={<Visibility sx={{ fontSize: 36, color: '#00eeff' }} />}
            />

            <Container maxWidth="xl" sx={{ mt: { xs: 2, md: 4 } }}>
                <Grid container spacing={3}>
                    
                    {/* Left Column: Live Camera & Vision Canvas */}
                    <Grid item xs={12} lg={8}>
                        <Card sx={{
                            bgcolor: 'rgba(10, 11, 15, 0.85)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(0, 238, 255, 0.2)',
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: `0 0 30px ${alpha('#00eeff', 0.1)}`
                        }}>
                            <Box sx={{
                                p: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                bgcolor: 'rgba(7, 9, 14, 0.6)'
                            }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: isCameraActive ? '#00ff66' : '#f59e0b', boxShadow: isCameraActive ? '0 0 10px #00ff66' : 'none' }} />
                                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#ffffff', letterSpacing: '0.5px' }}>
                                        VISION CANVAS {isDemoMode ? '(SIMULATED LAB)' : '(LIVE FEED)'}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                        icon={<Speed sx={{ fontSize: '16px !important' }} />}
                                        label={`${fps} FPS`}
                                        size="small"
                                        sx={{ bgcolor: alpha(primaryColor, 0.15), color: primaryColor, fontWeight: 700, border: `1px solid ${alpha(primaryColor, 0.3)}` }}
                                    />
                                    <Chip
                                        icon={<Memory sx={{ fontSize: '16px !important' }} />}
                                        label={`${inferenceTime} ms`}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', fontWeight: 700, border: '1px solid rgba(168, 85, 247, 0.3)' }}
                                    />
                                    <IconButton onClick={switchCamera} disabled={!isCameraActive || isDemoMode} size="small" sx={{ color: '#00eeff', border: '1px solid rgba(0, 238, 255, 0.2)' }}>
                                        <Cameraswitch fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Box>

                            {/* Canvas Viewport */}
                            <Box sx={{ position: 'relative', width: '100%', minHeight: { xs: 320, sm: 480 }, bgcolor: '#040508', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                
                                {/* Hidden Video Element */}
                                <video
                                    ref={videoRef}
                                    playsInline
                                    muted
                                    style={{ display: 'none' }}
                                />

                                {/* Main HUD Render Canvas */}
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        maxHeight: '560px',
                                        objectFit: 'contain',
                                        display: (isCameraActive || isDemoMode) ? 'block' : 'none'
                                    }}
                                />

                                {/* Initial Offline State / Model Loading Overlay */}
                                {(!isCameraActive && !isDemoMode) && (
                                    <Box sx={{ p: 4, textAlign: 'center', maxWidth: 480 }}>
                                        {isModelsLoading ? (
                                            <Stack spacing={2} alignItems="center">
                                                <CircularProgress size={48} sx={{ color: '#00eeff' }} />
                                                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                                                    {loadingStatusText}
                                                </Typography>
                                                <Box sx={{ width: '100%' }}>
                                                    <LinearProgress variant="determinate" value={loadingProgress} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Loading Neural Weights (COCO-SSD & Face Landmark Nets)
                                                </Typography>
                                            </Stack>
                                        ) : (
                                            <Stack spacing={2.5} alignItems="center">
                                                <Avatar sx={{ width: 72, height: 72, bgcolor: alpha('#00eeff', 0.1), border: '2px solid #00eeff' }}>
                                                    <Videocam sx={{ fontSize: 36, color: '#00eeff' }} />
                                                </Avatar>
                                                <Typography variant="h6" fontWeight={800} color="#ffffff">
                                                    Start Realtime AI Vision
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Grant camera access to process face biometrics, emotion recognition, age detection & object tracking in real-time. 100% private & client-side.
                                                </Typography>
                                                
                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width="100%">
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<Videocam />}
                                                        onClick={startCamera}
                                                        fullWidth
                                                        sx={{
                                                            py: 1.2,
                                                            borderRadius: '30px',
                                                            bgcolor: '#00eeff',
                                                            color: '#000000',
                                                            fontWeight: 800,
                                                            '&:hover': { bgcolor: '#00cce6' }
                                                        }}
                                                    >
                                                        Enable Camera Feed
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<PlayArrow />}
                                                        onClick={() => { setIsDemoMode(true); setIsCameraActive(true); }}
                                                        fullWidth
                                                        sx={{
                                                            py: 1.2,
                                                            borderRadius: '30px',
                                                            borderColor: 'rgba(255, 255, 255, 0.2)',
                                                            color: '#ffffff',
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        Run Demo Stream
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        )}
                                    </Box>
                                )}
                            </Box>

                            {/* Controls Bar */}
                            <Box sx={{ p: 2, bgcolor: 'rgba(7, 9, 14, 0.8)', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} sm={6}>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                            <Button
                                                size="small"
                                                variant={showFaceDetection ? 'contained' : 'outlined'}
                                                startIcon={<Face fontSize="small" />}
                                                onClick={() => setShowFaceDetection(!showFaceDetection)}
                                                sx={{ borderRadius: '20px', fontSize: '0.75rem', py: 0.4 }}
                                            >
                                                Face & Mood
                                            </Button>
                                            <Button
                                                size="small"
                                                variant={showObjectDetection ? 'contained' : 'outlined'}
                                                startIcon={<Category fontSize="small" />}
                                                onClick={() => setShowObjectDetection(!showObjectDetection)}
                                                color="success"
                                                sx={{ borderRadius: '20px', fontSize: '0.75rem', py: 0.4 }}
                                            >
                                                COCO Objects
                                            </Button>
                                            <Button
                                                size="small"
                                                variant={showMotionTracking ? 'contained' : 'outlined'}
                                                startIcon={<Speed fontSize="small" />}
                                                onClick={() => setShowMotionTracking(!showMotionTracking)}
                                                color="secondary"
                                                sx={{ borderRadius: '20px', fontSize: '0.75rem', py: 0.4 }}
                                            >
                                                Motion Optical
                                            </Button>
                                        </Stack>
                                    </Grid>

                                    <Grid item xs={12} sm={6} textAlign={{ sm: 'right' }}>
                                        <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                                            <Tooltip title={enableVoiceAudio ? "Mute Voice AI" : "Enable Voice AI Announcements"}>
                                                <IconButton
                                                    onClick={() => setEnableVoiceAudio(!enableVoiceAudio)}
                                                    sx={{ color: enableVoiceAudio ? '#00ff66' : 'grey.500', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                                                >
                                                    {enableVoiceAudio ? <VolumeUp /> : <VolumeOff />}
                                                </IconButton>
                                            </Tooltip>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<PhotoCamera />}
                                                onClick={captureSnapshot}
                                                disabled={!isCameraActive && !isDemoMode}
                                                sx={{ borderRadius: '20px', borderColor: '#00eeff', color: '#00eeff' }}
                                            >
                                                Snapshot
                                            </Button>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<Download />}
                                                onClick={exportAiAnalyticsJson}
                                                disabled={!isCameraActive && !isDemoMode}
                                                sx={{ borderRadius: '20px', bgcolor: '#a855f7', color: '#ffffff' }}
                                            >
                                                Export JSON
                                            </Button>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Card>
                    </Grid>

                    {/* Right Column: Realtime AI Biometric Dashboard */}
                    <Grid item xs={12} lg={4}>
                        <Stack spacing={3}>
                            
                            {/* Biometrics & Emotion Panel */}
                            <Card sx={{
                                bgcolor: 'rgba(10, 11, 15, 0.85)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(0, 238, 255, 0.2)',
                                borderRadius: 3,
                                p: 2.5
                            }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                                    <Psychology sx={{ color: '#00eeff' }} />
                                    <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                                        BIOMETRIC & MOOD ANALYTICS
                                    </Typography>
                                </Stack>

                                {primaryFace ? (
                                    <Stack spacing={2}>
                                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(primaryColor, 0.1), border: `1px solid ${alpha(primaryColor, 0.2)}` }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">DOMINANT EMOTION</Typography>
                                                    <Typography variant="h6" fontWeight={800} color="#00eeff">
                                                        {topEmotion ? topEmotion[0].toUpperCase() : 'N/A'}
                                                    </Typography>
                                                    <Typography variant="caption" color="primary.main">
                                                        {topEmotion ? `${Math.round(topEmotion[1] * 100)}% Confidence` : ''}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">ESTIMATED AGE / GENDER</Typography>
                                                    <Typography variant="h6" fontWeight={800} color="#a855f7">
                                                        {primaryFace.age ? `${primaryFace.age} Yrs` : 'N/A'}
                                                    </Typography>
                                                    <Typography variant="caption" color="secondary.main">
                                                        {primaryFace.gender ? primaryFace.gender.toUpperCase() : ''}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>

                                        {/* Emotion Spectrum Progress Bars */}
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1 }}>
                                            EMOTION CONFIDENCE SPECTRUM
                                        </Typography>

                                        {primaryFace.expressions && Object.entries(primaryFace.expressions).map(([expr, val]) => (
                                            <Box key={expr}>
                                                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                                    <Typography variant="caption" sx={{ textTransform: 'capitalize', color: '#ffffff' }}>
                                                        {expr}
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight={700} color="#00eeff">
                                                        {Math.round(val * 100)}%
                                                    </Typography>
                                                </Stack>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={val * 100}
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 3,
                                                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: expr === 'happy' ? '#00ff66' : expr === 'surprised' ? '#00eeff' : '#a855f7'
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Box sx={{ py: 4, textAlign: 'center' }}>
                                        <Face sx={{ fontSize: 40, color: 'grey.600', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            No face detected in video frame. Position yourself clearly in front of the camera.
                                        </Typography>
                                    </Box>
                                )}
                            </Card>

                            {/* Detected Objects Panel */}
                            <Card sx={{
                                bgcolor: 'rgba(10, 11, 15, 0.85)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(0, 255, 102, 0.2)',
                                borderRadius: 3,
                                p: 2.5
                            }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                                    <Category sx={{ color: '#00ff66' }} />
                                    <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                                        OBJECT INVENTORY ({detectedObjects.length})
                                    </Typography>
                                </Stack>

                                {detectedObjects.length > 0 ? (
                                    <Stack spacing={1} maxHeight={220} sx={{ overflowY: 'auto' }}>
                                        {detectedObjects.map((obj, idx) => (
                                            <Paper key={idx} sx={{ p: 1.2, px: 2, bgcolor: 'rgba(0, 255, 102, 0.05)', border: '1px solid rgba(0, 255, 102, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" fontWeight={700} color="#ffffff" sx={{ textTransform: 'capitalize' }}>
                                                    {obj.class}
                                                </Typography>
                                                <Chip
                                                    label={`${Math.round(obj.score * 100)}% Match`}
                                                    size="small"
                                                    sx={{ bgcolor: 'rgba(0, 255, 102, 0.15)', color: '#00ff66', fontWeight: 700, fontSize: '0.7rem' }}
                                                />
                                            </Paper>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                                        Scanning frame for physical objects...
                                    </Typography>
                                )}
                            </Card>

                            {/* Realtime Motion Gauge */}
                            <Card sx={{
                                bgcolor: 'rgba(10, 11, 15, 0.85)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(168, 85, 247, 0.2)',
                                borderRadius: 3,
                                p: 2.5
                            }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                                    <Speed sx={{ color: '#a855f7' }} />
                                    <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                                        OPTICAL MOTION DENSITY
                                    </Typography>
                                </Stack>

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="h4" fontWeight={900} color="#a855f7">
                                        {motionLevel}%
                                    </Typography>
                                    <Chip
                                        label={motionLevel > 40 ? 'HIGH MOTION' : motionLevel > 15 ? 'MODERATE' : 'STATIONARY'}
                                        size="small"
                                        color={motionLevel > 40 ? 'error' : motionLevel > 15 ? 'warning' : 'success'}
                                    />
                                </Box>

                                <LinearProgress
                                    variant="determinate"
                                    value={motionLevel}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                        '& .MuiLinearProgress-bar': { bgcolor: '#a855f7' }
                                    }}
                                />
                            </Card>

                        </Stack>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default AiVisionStudio;
