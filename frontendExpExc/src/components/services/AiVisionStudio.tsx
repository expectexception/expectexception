import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Container,
    Grid,
    Card,
    Typography,
    Box,
    Button,
    IconButton,
    Chip,
    Stack,
    Tooltip,
    LinearProgress,
    Paper,
    CircularProgress,
    Avatar,
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
    PlayArrow,
    CheckCircle,
    Analytics,
    Memory,
    Psychology,
    AccessibilityNew
} from '@mui/icons-material';
import ServicePageHero from './ServicePageHero';
import Seo from '../seo/Seo';

// TensorFlow, Face-API & MoveNet Pose Detection imports
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as faceapi from '@vladmandic/face-api';
import * as poseDetection from '@tensorflow-models/pose-detection';

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

interface BodyPoseData {
    keypoints: Array<{ x: number; y: number; score?: number; name?: string }>;
    score?: number;
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
    const [showPoseTracking, setShowPoseTracking] = useState(true);
    const [enableVoiceAudio, setEnableVoiceAudio] = useState(false);

    // Live Metrics
    const [fps, setFps] = useState(0);
    const [inferenceTime, setInferenceTime] = useState(0);
    const [motionLevel, setMotionLevel] = useState(0);
    const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
    const [detectedFaces, setDetectedFaces] = useState<FaceDetectionData[]>([]);
    const [detectedPoses, setDetectedPoses] = useState<BodyPoseData[]>([]);

    // Snapshot state
    const [capturedSnapshots, setCapturedSnapshots] = useState<string[]>([]);
    const [lastSpokenText, setLastSpokenText] = useState('');

    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const cocoModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
    const poseDetectorRef = useRef<poseDetection.PoseDetector | null>(null);
    const isFaceApiLoadedRef = useRef<boolean>(false);
    
    // Cached detections for 60 FPS smooth rendering without CPU stalls
    const cachedFacesRef = useRef<FaceDetectionData[]>([]);
    const cachedObjectsRef = useRef<DetectedObject[]>([]);
    const cachedPosesRef = useRef<BodyPoseData[]>([]);
    const isAiDetectingRef = useRef<boolean>(false);
    const prevFrameSampleRef = useRef<Uint8ClampedArray | null>(null);

    const lastFpsTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    const lastSpeechTimeRef = useRef<number>(0);

    // --- Load Machine Learning Models ---
    useEffect(() => {
        let isMounted = true;

        const loadAiModels = async () => {
            try {
                setLoadingStatusText('Initializing WebGL Hardware Acceleration Engine...');
                setLoadingProgress(20);
                await tf.ready();
                if (tf.getBackend() !== 'webgl') {
                    await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
                }

                setLoadingStatusText('Loading MoveNet Realtime Full-Body Skeleton Detector...');
                setLoadingProgress(40);
                try {
                    const detector = await poseDetection.createDetector(
                        poseDetection.SupportedModels.MoveNet,
                        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
                    );
                    if (isMounted) poseDetectorRef.current = detector;
                } catch (e) {
                    console.warn('MoveNet load warning:', e);
                }

                setLoadingStatusText('Loading COCO-SSD Neural Object Detector...');
                setLoadingProgress(65);
                const cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
                if (isMounted) cocoModelRef.current = cocoModel;

                setLoadingStatusText('Loading 3D Biometric Face & Mood Mesh Nets...');
                setLoadingProgress(85);
                
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
                    setLoadingStatusText('AI Neural Engine Loaded');
                }
            } catch (err) {
                console.error('Error loading AI Models:', err);
                if (isMounted) {
                    setIsModelsLoading(false);
                    setLoadingStatusText('AI Engine Ready (Standard Mode)');
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
        if (now - lastSpeechTimeRef.current < 4000) return;
        lastSpeechTimeRef.current = now;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
        setLastSpokenText(text);
    }, [enableVoiceAudio]);

    // --- Async AI Background Inference Loop ---
    useEffect(() => {
        if (!isCameraActive || isDemoMode) return;

        let isCancelled = false;

        const runAiInference = async () => {
            const video = videoRef.current;
            if (!video || video.readyState !== 4 || isAiDetectingRef.current) return;

            isAiDetectingRef.current = true;
            const startTime = performance.now();

            try {
                // 1. MoveNet Full-Body Pose Estimation
                if (showPoseTracking && poseDetectorRef.current) {
                    const poses = await poseDetectorRef.current.estimatePoses(video);
                    if (!isCancelled && poses.length > 0) {
                        const formattedPoses: BodyPoseData[] = poses.map(p => ({
                            keypoints: p.keypoints.map(k => ({ x: k.x, y: k.y, score: k.score, name: k.name })),
                            score: p.score
                        }));
                        cachedPosesRef.current = formattedPoses;
                        setDetectedPoses(formattedPoses);
                    }
                } else if (!showPoseTracking) {
                    cachedPosesRef.current = [];
                    setDetectedPoses([]);
                }

                // 2. Face & Biometrics Detection
                if (showFaceDetection && isFaceApiLoadedRef.current) {
                    const detections = await faceapi.detectAllFaces(
                        video,
                        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })
                    )
                    .withFaceLandmarks()
                    .withFaceExpressions()
                    .withAgeAndGender();

                    if (!isCancelled) {
                        const formattedFaces: FaceDetectionData[] = detections.map(d => ({
                            box: d.detection.box,
                            expressions: d.expressions as unknown as Record<string, number>,
                            age: Math.round(d.age),
                            gender: d.gender,
                            genderProbability: d.genderProbability,
                            landmarks: d.landmarks.positions
                        }));

                        cachedFacesRef.current = formattedFaces;
                        setDetectedFaces(formattedFaces);

                        if (formattedFaces.length > 0 && enableVoiceAudio) {
                            const face = formattedFaces[0];
                            const topExpr = Object.entries(face.expressions).sort((a, b) => b[1] - a[1])[0];
                            if (topExpr && topExpr[1] > 0.6) {
                                speakAiAnnouncement(`Detected ${face.gender || 'person'}, feeling ${topExpr[0]}`);
                            }
                        }
                    }
                } else if (!showFaceDetection) {
                    cachedFacesRef.current = [];
                    setDetectedFaces([]);
                }

                // 3. Object Detection (COCO-SSD)
                if (showObjectDetection && cocoModelRef.current) {
                    const predictions = await cocoModelRef.current.detect(video);
                    if (!isCancelled) {
                        const formattedObjects = predictions as DetectedObject[];
                        cachedObjectsRef.current = formattedObjects;
                        setDetectedObjects(formattedObjects);
                    }
                } else if (!showObjectDetection) {
                    cachedObjectsRef.current = [];
                    setDetectedObjects([]);
                }

                if (!isCancelled) {
                    const duration = Math.round(performance.now() - startTime);
                    setInferenceTime(duration);
                }
            } catch (e) {
                console.error('Async AI Detection Error:', e);
            } finally {
                isAiDetectingRef.current = false;
            }
        };

        const interval = setInterval(runAiInference, 100); // 10 AI inferences per sec
        return () => {
            isCancelled = true;
            clearInterval(interval);
        };
    }, [isCameraActive, isDemoMode, showFaceDetection, showObjectDetection, showPoseTracking, enableVoiceAudio, speakAiAnnouncement]);

    // --- 60 FPS Smooth Canvas Render Loop ---
    const processFrame = useCallback(() => {
        if (!canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = video?.videoWidth || 1280;
        const height = video?.videoHeight || 720;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        // 1. Draw Feed (Real webcam or Cyber Demo background)
        if (isDemoMode || !video || video.readyState !== 4) {
            ctx.fillStyle = '#06080d';
            ctx.fillRect(0, 0, width, height);

            const time = Date.now() * 0.002;
            // Animated Cyber Grid
            ctx.strokeStyle = 'rgba(0, 255, 102, 0.12)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = 0; y < height; y += 40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }

            // Demo Target Simulation
            const centerX = width / 2 + Math.sin(time) * 30;
            const centerY = height / 2 + Math.cos(time * 0.8) * 15;

            if (showFaceDetection) {
                drawCyberBox(ctx, centerX - 90, centerY - 110, 180, 220, '#00ff66', 'FACE TARGET #01');
            }
            if (showObjectDetection) {
                drawCyberBox(ctx, width * 0.18, height * 0.35, 160, 200, '#00ff66', 'LAPTOP 96%');
            }

            // Simulated Pose Skeleton in Demo Mode
            if (showPoseTracking) {
                const sY = centerY + 30;
                const eY = sY + 80;
                const wY = eY + 70;
                const lHandX = centerX - 160;
                const rHandX = centerX + 160;

                ctx.strokeStyle = '#00ff66';
                ctx.lineWidth = 3;
                ctx.beginPath();
                // Arms outstretched
                ctx.moveTo(lHandX, wY); ctx.lineTo(centerX - 90, eY); ctx.lineTo(centerX - 40, sY);
                ctx.lineTo(centerX + 40, sY); ctx.lineTo(centerX + 90, eY); ctx.lineTo(rHandX, wY);
                ctx.stroke();

                // Joint Nodes
                [
                    { x: lHandX, y: wY, label: 'LEFT WRIST' },
                    { x: centerX - 90, y: eY, label: 'LEFT ELBOW' },
                    { x: centerX - 40, y: sY, label: 'LEFT SHOULDER' },
                    { x: centerX + 40, y: sY, label: 'RIGHT SHOULDER' },
                    { x: centerX + 90, y: eY, label: 'RIGHT ELBOW' },
                    { x: rHandX, y: wY, label: 'RIGHT WRIST' }
                ].forEach(j => {
                    ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
                    ctx.beginPath(); ctx.arc(j.x, j.y, 9, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(j.x, j.y, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#00ff66';
                    ctx.font = '800 10px Inter, sans-serif';
                    ctx.fillText(j.label, j.x - 20, j.y - 12);
                });
            }

            setDetectedFaces([{
                box: { x: centerX - 90, y: centerY - 110, width: 180, height: 220 },
                expressions: { happy: 0.94, neutral: 0.05, surprised: 0.01 },
                age: 26,
                gender: 'male',
                genderProbability: 0.99
            }]);

            setDetectedObjects([
                { bbox: [width * 0.18, height * 0.35, 160, 200], class: 'laptop', score: 0.96 },
                { bbox: [centerX - 90, centerY - 110, 180, 220], class: 'person', score: 0.98 }
            ]);

            setMotionLevel(Math.round(25 + Math.sin(time * 5) * 15));
        } else {
            // Draw real webcam stream onto main canvas
            ctx.drawImage(video, 0, 0, width, height);

            // Fast motion estimation
            if (showPoseTracking || showFaceDetection) {
                if (!offscreenCanvasRef.current) {
                    offscreenCanvasRef.current = document.createElement('canvas');
                    offscreenCanvasRef.current.width = 80;
                    offscreenCanvasRef.current.height = 45;
                }
                const offCtx = offscreenCanvasRef.current.getContext('2d');
                if (offCtx) {
                    offCtx.drawImage(video, 0, 0, 80, 45);
                    const imgData = offCtx.getImageData(0, 0, 80, 45).data;
                    if (prevFrameSampleRef.current && prevFrameSampleRef.current.length === imgData.length) {
                        let diffSum = 0;
                        const prev = prevFrameSampleRef.current;
                        for (let i = 0; i < imgData.length; i += 8) {
                            diffSum += Math.abs(imgData[i] - prev[i]);
                        }
                        const motionVal = Math.min(100, Math.round((diffSum / (imgData.length / 8)) * 2.5));
                        setMotionLevel(motionVal);
                    }
                    prevFrameSampleRef.current = imgData;
                }
            }

            // 2. Draw Realtime MoveNet Full-Body Pose Kinematic Skeleton
            if (showPoseTracking && cachedPosesRef.current.length > 0) {
                cachedPosesRef.current.forEach(pose => {
                    if (!pose.keypoints) return;
                    const kps = pose.keypoints;
                    const minConf = 0.25;

                    const kpMap: Record<string, { x: number; y: number; score?: number; name?: string }> = {};
                    kps.forEach((k, idx) => {
                        if (k.name) kpMap[k.name] = k;
                        else kpMap[idx] = k;
                    });

                    // MoveNet 17-Keypoint Skeleton Bones
                    const connections = [
                        ['nose', 'left_eye'], ['nose', 'right_eye'],
                        ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
                        ['left_shoulder', 'right_shoulder'],
                        ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
                        ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
                        ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
                        ['left_hip', 'right_hip'],
                        ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
                        ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
                    ];

                    // Draw Skeleton Bones with Glowing Neon Emerald Green
                    ctx.strokeStyle = '#00ff66';
                    ctx.lineWidth = 3.5;
                    ctx.shadowColor = '#00ff66';
                    ctx.shadowBlur = 10;

                    connections.forEach(([p1Name, p2Name]) => {
                        const p1 = kpMap[p1Name];
                        const p2 = kpMap[p2Name];
                        if (p1 && p2 && (p1.score ?? 1) > minConf && (p2.score ?? 1) > minConf) {
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    });

                    ctx.shadowBlur = 0; // Reset glow

                    // Draw Joint Reticle Nodes
                    kps.forEach(kp => {
                        if ((kp.score ?? 1) > minConf) {
                            // Outer aura
                            ctx.fillStyle = 'rgba(0, 255, 102, 0.45)';
                            ctx.beginPath();
                            ctx.arc(kp.x, kp.y, 8, 0, Math.PI * 2);
                            ctx.fill();

                            // Inner core node
                            ctx.fillStyle = '#ffffff';
                            ctx.beginPath();
                            ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
                            ctx.fill();

                            // Label for key limbs (Wrists, Elbows, Shoulders, Knees, Ankles)
                            const labelName = kp.name || '';
                            if (['left_wrist', 'right_wrist', 'left_elbow', 'right_elbow', 'left_shoulder', 'right_shoulder', 'left_knee', 'right_knee'].includes(labelName)) {
                                ctx.fillStyle = '#00ff66';
                                ctx.font = '800 10px Inter, sans-serif';
                                ctx.fillText(labelName.replace('_', ' ').toUpperCase(), kp.x + 10, kp.y + 4);
                            }
                        }
                    });
                });
            }

            // 3. Draw Cached Object Detections (COCO-SSD)
            if (showObjectDetection && cachedObjectsRef.current.length > 0) {
                cachedObjectsRef.current.forEach(obj => {
                    const [x, y, w, h] = obj.bbox;
                    drawCyberBox(ctx, x, y, w, h, '#00ff66', `${obj.class.toUpperCase()} ${Math.round(obj.score * 100)}%`);
                });
            }

            // 4. Draw Cached 3D Face Wireframe & Biometric HUD
            if (showFaceDetection && cachedFacesRef.current.length > 0) {
                cachedFacesRef.current.forEach((face, fIdx) => {
                    const { x, y, width: w, height: h } = face.box;

                    // Cyber Bounding Box
                    drawCyberBox(ctx, x, y, w, h, '#00ff66', `FACE LOCK #${fIdx + 1}`);

                    // Scanning Laser Line
                    const scanY = y + ((Date.now() * 0.2) % h);
                    ctx.strokeStyle = 'rgba(0, 255, 102, 0.8)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x + 4, scanY);
                    ctx.lineTo(x + w - 4, scanY);
                    ctx.stroke();

                    // Clean 3D Facial Landmark Contour Connections
                    if (face.landmarks && face.landmarks.length > 0) {
                        const pts = face.landmarks;

                        const drawContour = (indices: number[], strokeColor: string, closed: boolean = false) => {
                            ctx.strokeStyle = strokeColor;
                            ctx.lineWidth = 1.5;
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

                        // Jawline (0-16)
                        drawContour(Array.from({ length: 17 }, (_, i) => i), 'rgba(0, 255, 102, 0.7)');
                        // Eyebrows (17-21, 22-26)
                        drawContour([17, 18, 19, 20, 21], '#00ff66');
                        drawContour([22, 23, 24, 25, 26], '#00ff66');
                        // Nose (27-30, 31-35)
                        drawContour([27, 28, 29, 30], '#00ff66');
                        drawContour([31, 32, 33, 34, 35], '#00ff66');
                        // Eyes (36-41, 42-47)
                        drawContour([36, 37, 38, 39, 40, 41], '#00ff66', true);
                        drawContour([42, 43, 44, 45, 46, 47], '#00ff66', true);
                        // Outer Lips (48-59)
                        drawContour([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59], '#00ff66', true);

                        // Pupil reticles
                        [38, 43].forEach(eyeCenterIdx => {
                            if (pts[eyeCenterIdx]) {
                                const ep = pts[eyeCenterIdx];
                                ctx.strokeStyle = '#00ff66';
                                ctx.lineWidth = 1;
                                ctx.beginPath();
                                ctx.arc(ep.x, ep.y, 4, 0, Math.PI * 2);
                                ctx.stroke();
                            }
                        });

                        // Nodes
                        ctx.fillStyle = '#ffffff';
                        pts.forEach((pt, i) => {
                            if (i % 2 === 0) ctx.fillRect(pt.x - 1, pt.y - 1, 2.5, 2.5);
                        });
                    }
                });
            }
        }

        // Compute 60 FPS Counter
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsTimeRef.current >= 1000) {
            setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
        }

        animationFrameRef.current = requestAnimationFrame(processFrame);
    }, [isDemoMode, showFaceDetection, showObjectDetection, showPoseTracking]);

    // Start/Stop canvas render loop
    useEffect(() => {
        if (isCameraActive) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
        }
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isCameraActive, processFrame]);

    // Helper: Draw High-Tech Cyber Corner Brackets on Bounding Boxes
    const drawCyberBox = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, label: string) => {
        ctx.fillStyle = alpha(color, 0.08);
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = alpha(color, 0.4);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        const cLen = Math.min(20, w * 0.25, h * 0.25);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + cLen); ctx.lineTo(x, y); ctx.lineTo(x + cLen, y);
        ctx.moveTo(x + w - cLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cLen);
        ctx.moveTo(x, y + h - cLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cLen, y + h);
        ctx.moveTo(x + w - cLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cLen);
        ctx.stroke();

        if (label) {
            ctx.fillStyle = color;
            ctx.fillRect(x, Math.max(0, y - 22), Math.min(w, 180), 20);
            ctx.fillStyle = '#000000';
            ctx.font = '800 11px Inter, sans-serif';
            ctx.fillText(label, x + 6, Math.max(14, y - 7));
        }
    };

    // Snapshot Handler
    const takeSnapshot = () => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setCapturedSnapshots(prev => [dataUrl, ...prev.slice(0, 7)]);
    };

    // Export Analytics JSON
    const exportAnalyticsJson = () => {
        const payload = {
            timestamp: new Date().toISOString(),
            fps,
            inferenceTimeMs: inferenceTime,
            detectedFacesCount: detectedFaces.length,
            detectedObjectsCount: detectedObjects.length,
            detectedPosesCount: detectedPoses.length,
            motionLevelPercent: motionLevel,
            faces: detectedFaces,
            objects: detectedObjects,
            poses: detectedPoses
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

    const primaryPose = detectedPoses[0];
    const trackedJointsCount = primaryPose?.keypoints
        ? primaryPose.keypoints.filter(k => (k.score ?? 1) > 0.25).length
        : 0;

    return (
        <Box sx={{ pb: 8 }}>
            <Seo
                title="Realtime AI Vision Studio — Face, Emotion, Full Body Pose & Object Detection"
                description="100% frontend realtime AI vision lab using WebGL, TensorFlow MoveNet & Face-API. Detect full-body skeletons, faces, emotions, age, objects, and motion directly in your browser."
                keywords={[
                    "ai vision studio",
                    "realtime pose tracking movenet",
                    "full body skeleton tracking browser",
                    "face detection webcam",
                    "emotion recognition online",
                    "object detection tensorflow js"
                ]}
            />

            <ServicePageHero
                title="Realtime AI Vision Studio"
                subtitle="High-Performance Neural Vision in Your Browser — Real-Time Full Body Pose Kinematics, Face Mesh, 7 Emotions, Objects & Motion 100% Client-Side."
                icon={Visibility}
            />

            <Container maxWidth="xl" sx={{ mt: { xs: 1, md: 2 } }}>

                {/* --- Model Loading Progress Bar --- */}
                {isModelsLoading && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 4,
                            bgcolor: 'rgba(13, 17, 24, 0.85)',
                            border: '1px solid rgba(0, 255, 102, 0.25)',
                            borderRadius: 3,
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 8px 32px rgba(0, 255, 102, 0.1)'
                        }}
                    >
                        <Stack spacing={2}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <CircularProgress size={20} sx={{ color: '#00ff66' }} />
                                    <Typography variant="subtitle2" fontWeight={700} color="#ffffff">
                                        {loadingStatusText}
                                    </Typography>
                                </Stack>
                                <Chip
                                    label={`${loadingProgress}%`}
                                    size="small"
                                    sx={{ bgcolor: 'rgba(0, 255, 102, 0.15)', color: '#00ff66', fontWeight: 800 }}
                                />
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={loadingProgress}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                                    '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(90deg, #00ff66 0%, #00b347 100%)',
                                    }
                                }}
                            />
                        </Stack>
                    </Paper>
                )}

                {/* Hidden Native Video Element */}
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{ display: 'none' }}
                />

                {/* Main Vision Studio Grid */}
                <Grid container spacing={3} alignItems="stretch">

                    {/* Left Column: Vision Canvas Feed */}
                    <Grid item xs={12} lg={8}>
                        <Card
                            elevation={0}
                            sx={{
                                bgcolor: '#080a0f',
                                border: '1px solid rgba(0, 255, 102, 0.25)',
                                borderRadius: 3,
                                overflow: 'hidden',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
                            }}
                        >
                            {/* Canvas HUD Header */}
                            <Box
                                sx={{
                                    px: 2.5,
                                    py: 1.5,
                                    bgcolor: 'rgba(13, 17, 24, 0.95)',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1.5
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            bgcolor: isCameraActive ? '#00ff66' : '#ff0055',
                                            boxShadow: isCameraActive ? '0 0 10px #00ff66' : '0 0 10px #ff0055'
                                        }}
                                    />
                                    <Typography variant="subtitle2" fontWeight={800} color="#ffffff" letterSpacing="0.05em">
                                        VISION CANVAS {isDemoMode ? '(CYBER DEMO FEED)' : isCameraActive ? '(LIVE FEED)' : '(OFFLINE)'}
                                    </Typography>
                                </Stack>

                                {/* Performance HUD Badges */}
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                        icon={<Speed sx={{ fontSize: '16px !important', color: '#00ff66 !important' }} />}
                                        label={`${fps} FPS`}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(0, 255, 102, 0.1)', color: '#00ff66', fontWeight: 700, border: '1px solid rgba(0, 255, 102, 0.2)' }}
                                    />
                                    <Chip
                                        icon={<Memory sx={{ fontSize: '16px !important', color: '#00ff66 !important' }} />}
                                        label={`${inferenceTime} ms`}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(0, 255, 102, 0.1)', color: '#00ff66', fontWeight: 700, border: '1px solid rgba(0, 255, 102, 0.2)' }}
                                    />
                                    <IconButton size="small" onClick={switchCamera} title="Switch Front/Back Camera" sx={{ color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                                        <Cameraswitch fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Box>

                            {/* Canvas Viewport */}
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    aspectRatio: '16/9',
                                    bgcolor: '#040508',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden'
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain'
                                    }}
                                />

                                {/* Camera Start Overlay Prompt when stopped */}
                                {!isCameraActive && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            bgcolor: 'rgba(6, 8, 14, 0.92)',
                                            backdropFilter: 'blur(8px)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            p: 4,
                                            textAlign: 'center',
                                            zIndex: 5
                                        }}
                                    >
                                        <Avatar
                                            sx={{
                                                width: 72,
                                                height: 72,
                                                bgcolor: alpha(primaryColor, 0.12),
                                                border: `2px solid ${primaryColor}`,
                                                mb: 2.5,
                                                boxShadow: `0 0 30px ${alpha(primaryColor, 0.4)}`
                                            }}
                                        >
                                            <Videocam sx={{ fontSize: 36, color: primaryColor }} />
                                        </Avatar>

                                        <Typography variant="h5" fontWeight={800} color="#ffffff" gutterBottom>
                                            ACTIVATE AI CAMERA FEED
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mb: 3.5, lineHeight: 1.6 }}>
                                            Enable your webcam to run real-time MoveNet full-body pose tracking, 3D face mesh, 7-emotion mood analysis, estimated age & gender classification, object bounding boxes, and optical motion tracking 100% in your browser.
                                        </Typography>

                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                            <Button
                                                variant="contained"
                                                size="large"
                                                startIcon={<Videocam sx={{ color: '#000000' }} />}
                                                onClick={startCamera}
                                                disabled={isModelsLoading}
                                                sx={{
                                                    borderRadius: '28px',
                                                    px: 4,
                                                    py: 1.5,
                                                    fontWeight: 800,
                                                    background: 'linear-gradient(135deg, #00ff66 0%, #00b347 100%)',
                                                    color: '#000000',
                                                    boxShadow: '0 8px 25px rgba(0, 255, 102, 0.35)',
                                                    '&:hover': {
                                                        background: 'linear-gradient(135deg, #00e65c 0%, #00993d 100%)',
                                                        boxShadow: '0 10px 30px rgba(0, 255, 102, 0.55)'
                                                    }
                                                }}
                                            >
                                                ENABLE CAMERA
                                            </Button>

                                            <Button
                                                variant="outlined"
                                                size="large"
                                                startIcon={<PlayArrow />}
                                                onClick={() => { setIsDemoMode(true); setIsCameraActive(true); }}
                                                disabled={isModelsLoading}
                                                sx={{
                                                    borderRadius: '28px',
                                                    px: 3.5,
                                                    py: 1.5,
                                                    fontWeight: 700,
                                                    borderColor: 'rgba(0, 255, 102, 0.4)',
                                                    color: '#ffffff',
                                                    '&:hover': {
                                                        borderColor: '#00ff66',
                                                        color: '#00ff66',
                                                        bgcolor: 'rgba(0, 255, 102, 0.08)'
                                                    }
                                                }}
                                            >
                                                LAUNCH DEMO FEED
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}
                            </Box>

                            {/* Canvas Toolbar & Action Buttons */}
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: 'rgba(13, 17, 24, 0.95)',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1.5
                                }}
                            >
                                {/* Overlay Feature Toggles */}
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                                    <Chip
                                        icon={<AccessibilityNew sx={{ fontSize: '16px !important' }} />}
                                        label="Full Body Pose"
                                        clickable
                                        color={showPoseTracking ? 'success' : 'default'}
                                        variant={showPoseTracking ? 'filled' : 'outlined'}
                                        onClick={() => setShowPoseTracking(!showPoseTracking)}
                                        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                    />
                                    <Chip
                                        icon={<Face sx={{ fontSize: '16px !important' }} />}
                                        label="Face & Mood"
                                        clickable
                                        color={showFaceDetection ? 'success' : 'default'}
                                        variant={showFaceDetection ? 'filled' : 'outlined'}
                                        onClick={() => setShowFaceDetection(!showFaceDetection)}
                                        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                    />
                                    <Chip
                                        icon={<Category sx={{ fontSize: '16px !important' }} />}
                                        label="COCO Objects"
                                        clickable
                                        color={showObjectDetection ? 'success' : 'default'}
                                        variant={showObjectDetection ? 'filled' : 'outlined'}
                                        onClick={() => setShowObjectDetection(!showObjectDetection)}
                                        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                    />
                                </Stack>

                                {/* Action Buttons */}
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Tooltip title={enableVoiceAudio ? 'Mute AI Audio' : 'Enable Voice Audio Announcements'}>
                                        <IconButton
                                            onClick={() => setEnableVoiceAudio(!enableVoiceAudio)}
                                            sx={{
                                                bgcolor: enableVoiceAudio ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                color: enableVoiceAudio ? '#00ff66' : 'text.secondary'
                                            }}
                                        >
                                            {enableVoiceAudio ? <VolumeUp fontSize="small" /> : <VolumeOff fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>

                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<PhotoCamera />}
                                        onClick={takeSnapshot}
                                        disabled={!isCameraActive}
                                        sx={{
                                            borderRadius: '20px',
                                            borderColor: 'rgba(0, 255, 102, 0.4)',
                                            color: '#00ff66',
                                            fontWeight: 700,
                                            '&:hover': {
                                                borderColor: '#00ff66',
                                                bgcolor: 'rgba(0, 255, 102, 0.08)'
                                            }
                                        }}
                                    >
                                        Snapshot
                                    </Button>

                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<Download sx={{ color: '#000000' }} />}
                                        onClick={exportAnalyticsJson}
                                        sx={{
                                            borderRadius: '20px',
                                            background: 'linear-gradient(135deg, #00ff66 0%, #00b347 100%)',
                                            color: '#000000',
                                            fontWeight: 800,
                                            boxShadow: '0 4px 15px rgba(0, 255, 102, 0.3)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #00e65c 0%, #00993d 100%)',
                                                boxShadow: '0 6px 20px rgba(0, 255, 102, 0.5)'
                                            }
                                        }}
                                    >
                                        Export JSON
                                    </Button>

                                    {isCameraActive && (
                                        <IconButton onClick={stopCamera} color="error" title="Stop Camera" sx={{ bgcolor: 'rgba(255, 0, 85, 0.15)' }}>
                                            <VideocamOff fontSize="small" />
                                        </IconButton>
                                    )}
                                </Stack>
                            </Box>
                        </Card>
                    </Grid>

                    {/* Right Column: Biometrics & Analytics Panels */}
                    <Grid item xs={12} lg={4}>
                        <Stack spacing={2.5} sx={{ height: '100%' }}>

                            {/* 1. Realtime Full-Body Pose Kinematics Panel */}
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    bgcolor: '#080a0f',
                                    border: '1px solid rgba(0, 255, 102, 0.25)',
                                    borderRadius: 3,
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <AccessibilityNew sx={{ color: '#00ff66', fontSize: 22 }} />
                                    <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                                        FULL-BODY POSE KINEMATICS
                                    </Typography>
                                </Stack>

                                {primaryPose && trackedJointsCount > 0 ? (
                                    <Stack spacing={1.5}>
                                        <Paper sx={{ p: 1.5, bgcolor: 'rgba(0, 255, 102, 0.05)', border: '1px solid rgba(0, 255, 102, 0.2)', borderRadius: 2 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                SKELETON TRACKING STATUS
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} color="#00ff66">
                                                {trackedJointsCount}/17 KEYPOINTS LOCKED
                                            </Typography>
                                            <Typography variant="caption" color="#00ff66" fontWeight={700}>
                                                Hands, Elbows, Shoulders, Hips, Knees & Ankles Active
                                            </Typography>
                                        </Paper>
                                    </Stack>
                                ) : (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <AccessibilityNew sx={{ fontSize: 36, color: 'rgba(255, 255, 255, 0.2)', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Stand in camera view for full-body MoveNet pose tracking.
                                        </Typography>
                                    </Box>
                                )}
                            </Card>

                            {/* 2. Biometric & Mood Analytics Panel */}
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    bgcolor: '#080a0f',
                                    border: '1px solid rgba(0, 255, 102, 0.25)',
                                    borderRadius: 3,
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <Psychology sx={{ color: '#00ff66', fontSize: 22 }} />
                                    <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                                        BIOMETRIC & MOOD ANALYTICS
                                    </Typography>
                                </Stack>

                                {primaryFace ? (
                                    <Stack spacing={2}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Paper sx={{ p: 1.5, bgcolor: 'rgba(0, 255, 102, 0.05)', border: '1px solid rgba(0, 255, 102, 0.2)', borderRadius: 2 }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        DOMINANT EMOTION
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={800} color="#00ff66" sx={{ textTransform: 'uppercase' }}>
                                                        {topEmotion ? topEmotion[0] : 'NEUTRAL'}
                                                    </Typography>
                                                    <Typography variant="caption" color="#00ff66" fontWeight={700}>
                                                        {topEmotion ? `${Math.round(topEmotion[1] * 100)}% Confidence` : ''}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Paper sx={{ p: 1.5, bgcolor: 'rgba(0, 255, 102, 0.05)', border: '1px solid rgba(0, 255, 102, 0.2)', borderRadius: 2 }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        ESTIMATED AGE / GENDER
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={800} color="#00ff66">
                                                        {primaryFace.age ? `${primaryFace.age} Yrs` : 'N/A'}
                                                    </Typography>
                                                    <Typography variant="caption" color="#00ff66" fontWeight={700}>
                                                        {primaryFace.gender ? primaryFace.gender.toUpperCase() : ''}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        </Grid>

                                        {/* Emotion Spectrum Progress Bars */}
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            EMOTION CONFIDENCE SPECTRUM
                                        </Typography>

                                        <Stack spacing={1.2}>
                                            {primaryFace.expressions && Object.entries(primaryFace.expressions).map(([expr, val]) => {
                                                const percentage = Math.round(val * 100);
                                                return (
                                                    <Box key={expr}>
                                                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                                            <Typography variant="caption" color="#ffffff" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                                                                {expr}
                                                            </Typography>
                                                            <Typography variant="caption" color="#00ff66" fontWeight={700}>
                                                                {percentage}%
                                                            </Typography>
                                                        </Stack>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={percentage}
                                                            sx={{
                                                                height: 6,
                                                                borderRadius: 3,
                                                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                                                '& .MuiLinearProgress-bar': {
                                                                    bgcolor: '#00ff66'
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    </Stack>
                                ) : (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <Face sx={{ fontSize: 36, color: 'rgba(255, 255, 255, 0.2)', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            No face detected in video frame. Position face toward camera.
                                        </Typography>
                                    </Box>
                                )}
                            </Card>

                            {/* 3. Detected Objects Inventory Panel */}
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    bgcolor: '#080a0f',
                                    border: '1px solid rgba(0, 255, 102, 0.25)',
                                    borderRadius: 3,
                                    flexGrow: 1
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <Category sx={{ color: '#00ff66', fontSize: 22 }} />
                                    <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                                        OBJECT INVENTORY ({detectedObjects.length})
                                    </Typography>
                                </Stack>

                                {detectedObjects.length > 0 ? (
                                    <Stack spacing={1} sx={{ maxHeight: 150, overflowY: 'auto', pr: 0.5 }}>
                                        {detectedObjects.map((obj, idx) => (
                                            <Paper
                                                key={idx}
                                                elevation={0}
                                                sx={{
                                                    p: 1.25,
                                                    px: 2,
                                                    bgcolor: 'rgba(0, 255, 102, 0.05)',
                                                    border: '1px solid rgba(0, 255, 102, 0.2)',
                                                    borderRadius: 2,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={700} color="#ffffff" sx={{ textTransform: 'capitalize' }}>
                                                    {obj.class}
                                                </Typography>
                                                <Chip
                                                    label={`${Math.round(obj.score * 100)}% Match`}
                                                    size="small"
                                                    sx={{ bgcolor: 'rgba(0, 255, 102, 0.2)', color: '#00ff66', fontWeight: 800, fontSize: '0.7rem' }}
                                                />
                                            </Paper>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                                        No objects currently detected.
                                    </Typography>
                                )}
                            </Card>

                            {/* 4. Optical Motion Density Gauge */}
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    bgcolor: '#080a0f',
                                    border: '1px solid rgba(0, 255, 102, 0.25)',
                                    borderRadius: 3
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Analytics sx={{ color: '#00ff66', fontSize: 22 }} />
                                        <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                                            OPTICAL MOTION DENSITY
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h6" fontWeight={800} color="#00ff66">
                                        {motionLevel}%
                                    </Typography>
                                </Stack>

                                <LinearProgress
                                    variant="determinate"
                                    value={motionLevel}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                                        '& .MuiLinearProgress-bar': {
                                            background: 'linear-gradient(90deg, #00ff66 0%, #00b347 100%)'
                                        }
                                    }}
                                />
                            </Card>

                        </Stack>
                    </Grid>

                </Grid>

                {/* --- Snapshot Gallery Section --- */}
                {capturedSnapshots.length > 0 && (
                    <Box sx={{ mt: 5 }}>
                        <Typography variant="h6" fontWeight={800} color="#ffffff" gutterBottom>
                            CAPTURED SNAPSHOT GALLERY ({capturedSnapshots.length})
                        </Typography>

                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            {capturedSnapshots.map((snap, idx) => (
                                <Grid item xs={6} sm={3} md={2} key={idx}>
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            border: '1px solid rgba(0, 255, 102, 0.3)',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        <img src={snap} alt={`Snapshot ${idx + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = snap;
                                                a.download = `snapshot-${idx + 1}.png`;
                                                a.click();
                                            }}
                                            sx={{
                                                position: 'absolute',
                                                bottom: 6,
                                                right: 6,
                                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                                                color: '#00ff66',
                                                '&:hover': { bgcolor: '#00ff66', color: '#000000' }
                                            }}
                                        >
                                            <Download fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

            </Container>
        </Box>
    );
};

export default AiVisionStudio;
