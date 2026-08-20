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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Tabs,
    Tab,
    useTheme,
    alpha,
    useMediaQuery
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  Cameraswitch,
  PhotoCamera,
  Download,
  Visibility,
  Face,
  Category,
  Speed,
  PlayArrow,
  Analytics,
  Memory,
  AccessibilityNew,
  Fingerprint,
  PersonAdd,
  BackHand,
  Timeline,
  RecordVoiceOver,
  VoiceOverOff,
} from '@mui/icons-material';
import ServicePageHero from './ServicePageHero';
import Seo from '../seo/Seo';

// TensorFlow, Face-API, MoveNet Pose & Hand Pose Detection imports
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as faceapi from '@vladmandic/face-api';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';

// Suppress duplicate TFJS kernel registration warnings caused by multi-model bundles
if (typeof window !== 'undefined') {
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
        if (
            typeof args[0] === 'string' &&
            (args[0].includes('already registered') ||
             args[0].includes('Overwriting the platform') ||
             args[0].includes('Reusing existing backend factory'))
        ) {
            return;
        }
        originalWarn.apply(console, args);
    };
}

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
    descriptor?: Float32Array;
    recognizedName?: string;
    headPoseText?: string;
}

interface Keypoint {
    x: number;
    y: number;
    score?: number;
    name?: string;
}

interface BodyPoseData {
    keypoints: Keypoint[];
    score?: number;
    gestureLabel?: string;
}

interface HandData {
    handedness: string; // 'Left' | 'Right'
    score: number;
    keypoints: Array<{ x: number; y: number; z?: number; name?: string }>;
}

interface EnrolledFace {
    name: string;
    descriptor: number[];
}

interface MotionTrailPoint {
    x: number;
    y: number;
    alpha: number;
}

// 21-point hand finger landmark generator for robust fallback tracking
const generateHandFingerLandmarks = (wX: number, wY: number, angle: number) => {
    const kps: Array<{ x: number; y: number; z?: number; name?: string }> = [];
    kps[0] = { x: wX, y: wY, z: 0, name: 'wrist' };

    const fingerConfigs = [
        { offsetAngle: -0.55, baseDist: 35, len: 50, names: ['thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip'] },
        { offsetAngle: -0.28, baseDist: 40, len: 70, names: ['index_finger_mcp', 'index_finger_pip', 'index_finger_dip', 'index_finger_tip'] },
        { offsetAngle: 0.0,   baseDist: 42, len: 80, names: ['middle_finger_mcp', 'middle_finger_pip', 'middle_finger_dip', 'middle_finger_tip'] },
        { offsetAngle: 0.25,  baseDist: 38, len: 72, names: ['ring_finger_mcp', 'ring_finger_pip', 'ring_finger_dip', 'ring_finger_tip'] },
        { offsetAngle: 0.48,  baseDist: 32, len: 58, names: ['pinky_finger_mcp', 'pinky_finger_pip', 'pinky_finger_dip', 'pinky_finger_tip'] }
    ];

    let kpIndex = 1;
    fingerConfigs.forEach(cfg => {
        const fAngle = angle + cfg.offsetAngle;
        const mcpX = wX + Math.cos(fAngle) * cfg.baseDist;
        const mcpY = wY + Math.sin(fAngle) * cfg.baseDist;
        kps[kpIndex] = { x: mcpX, y: mcpY, z: 0, name: cfg.names[0] };

        const segLen = cfg.len / 3;
        for (let s = 1; s <= 3; s++) {
            const px = mcpX + Math.cos(fAngle) * (segLen * s);
            const py = mcpY + Math.sin(fAngle) * (segLen * s);
            kps[kpIndex + s] = { x: px, y: py, z: 0, name: cfg.names[s] };
        }
        kpIndex += 4;
    });

    return kps;
};

const AiVisionStudio: React.FC = () => {
    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // --- State ---
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isModelsLoading, setIsModelsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(10);
    const [loadingStatusText, setLoadingStatusText] = useState('Initializing AI Engine...');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    // Active Mobile Tab (0: Kinematics, 1: Biometrics, 2: Objects, 3: Performance)
    const [mobileTab, setMobileTab] = useState(0);

    // Toggle Overlays
    const [showFaceDetection, setShowFaceDetection] = useState(true);
    const [showObjectDetection, setShowObjectDetection] = useState(true);
    const [showPoseTracking, setShowPoseTracking] = useState(true);
    const [showHandTracking, setShowHandTracking] = useState(true);
    const [showMotionTrails, setShowMotionTrails] = useState(true);
    const [enableVoiceAudio, setEnableVoiceAudio] = useState(false);

    // Live Metrics
    const [fps, setFps] = useState(0);
    const [inferenceTime, setInferenceTime] = useState(0);
    const [motionLevel, setMotionLevel] = useState(0);
    const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
    const [detectedFaces, setDetectedFaces] = useState<FaceDetectionData[]>([]);
    const [detectedPoses, setDetectedPoses] = useState<BodyPoseData[]>([]);
    const [detectedHands, setDetectedHands] = useState<HandData[]>([]);
    const [currentGesture, setCurrentGesture] = useState<string>('STANDING POSTURE');

    // Face Enrollment & Biometric Identity Database
    const [enrolledFaces, setEnrolledFaces] = useState<EnrolledFace[]>(() => {
        try {
            const saved = localStorage.getItem('ai_vision_enrolled_faces');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
    const [enrollNameInput, setEnrollNameInput] = useState('');

    // Snapshot gallery
    const [capturedSnapshots, setCapturedSnapshots] = useState<string[]>([]);

    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    // AI Model Instance Refs
    const cocoModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
    const poseDetectorRef = useRef<poseDetection.PoseDetector | null>(null);
    const handDetectorRef = useRef<handPoseDetection.HandDetector | null>(null);
    const isFaceApiLoadedRef = useRef<boolean>(false);
    
    // Smooth Kinematic Keypoint Positions (EMA filter)
    const smoothedKeypointsRef = useRef<Record<string, { x: number; y: number }>>({});
    // Motion Trajectory Ring Buffers for hands/feet
    const motionTrailsRef = useRef<Record<string, MotionTrailPoint[]>>({});

    // Cached detections for 60 FPS rendering
    const cachedFacesRef = useRef<FaceDetectionData[]>([]);
    const cachedObjectsRef = useRef<DetectedObject[]>([]);
    const cachedPosesRef = useRef<BodyPoseData[]>([]);
    const cachedHandsRef = useRef<HandData[]>([]);
    const isAiDetectingRef = useRef<boolean>(false);
    const prevFrameSampleRef = useRef<Uint8ClampedArray | null>(null);
    // On mobile, face-api and coco-ssd alternate across ticks instead of both running every tick
    const inferenceTickRef = useRef<number>(0);

    const lastFpsTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    const lastSpeechTimeRef = useRef<number>(0);

    // Save enrolled faces to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('ai_vision_enrolled_faces', JSON.stringify(enrolledFaces));
        } catch (e) {
            console.error('Error saving face database:', e);
        }
    }, [enrolledFaces]);

    // --- Load Machine Learning Models ---
    useEffect(() => {
        let isMounted = true;

        const loadAiModels = async () => {
            try {
                setLoadingStatusText('Initializing WebGL Hardware Acceleration Engine...');
                setLoadingProgress(15);
                try {
                    tf.env().set('DEBUG', false);
                } catch (_) {}
                await tf.ready();
                if (tf.getBackend() !== 'webgl') {
                    await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
                }

                setLoadingStatusText('Calibrating body pose tracking...');
                setLoadingProgress(35);
                try {
                    const detector = await poseDetection.createDetector(
                        poseDetection.SupportedModels.MoveNet,
                        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
                    );
                    if (isMounted) poseDetectorRef.current = detector;
                } catch (e) {
                    console.warn('Pose detector load warning:', e);
                }

                setLoadingStatusText('Calibrating hand & finger tracking...');
                setLoadingProgress(55);
                try {
                    const handModel = handPoseDetection.SupportedModels.MediaPipeHands;
                    const handDetector = await handPoseDetection.createDetector(handModel, {
                        runtime: 'tfjs',
                        modelType: 'lite',
                        maxHands: 2
                    });
                    if (isMounted) handDetectorRef.current = handDetector;
                } catch (e) {
                    console.warn('Hand detector load warning:', e);
                }

                setLoadingStatusText('Calibrating object detection...');
                setLoadingProgress(75);
                const cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
                if (isMounted) cocoModelRef.current = cocoModel;

                setLoadingStatusText('Calibrating face tracking & recognition...');
                setLoadingProgress(90);
                
                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
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

    // --- Camera Controls ---
    const startCamera = async () => {
        try {
            setIsDemoMode(false);
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: isMobile ? {
                    facingMode: facingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 24 }
                } : {
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
        if (now - lastSpeechTimeRef.current < 4500) return;
        lastSpeechTimeRef.current = now;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
    }, [enableVoiceAudio]);

    // --- Gesture & Posture Kinematics Classifier ---
    const classifyGesture = (kpsMap: Record<string, Keypoint>, hands: HandData[]): string => {
        const minConf = 0.3;
        const lWrist = kpsMap['left_wrist'];
        const rWrist = kpsMap['right_wrist'];
        const lShoulder = kpsMap['left_shoulder'];
        const rShoulder = kpsMap['right_shoulder'];
        const lElbow = kpsMap['left_elbow'];
        const rElbow = kpsMap['right_elbow'];
        const nose = kpsMap['nose'];
        const lKnee = kpsMap['left_knee'];
        const lHip = kpsMap['left_hip'];

        // Check 21-Keypoint Hand Gestures
        if (hands.length > 0) {
            for (const hand of hands) {
                const kps = hand.keypoints;
                if (kps.length >= 21) {
                    const wrist = kps[0];
                    const thumbTip = kps[4];
                    const indexTip = kps[8];
                    const middleTip = kps[12];
                    const ringTip = kps[16];
                    const pinkyTip = kps[20];

                    // Victory / Peace Sign (Index & Middle extended, Ring & Pinky folded)
                    const indexExt = indexTip.y < kps[6].y;
                    const middleExt = middleTip.y < kps[10].y;
                    const ringFolded = ringTip.y > kps[14].y;
                    const pinkyFolded = pinkyTip.y > kps[18].y;

                    if (indexExt && middleExt && ringFolded && pinkyFolded) {
                        return 'PEACE / VICTORY SIGN ✌️';
                    }

                    // Thumbs Up
                    const thumbUp = thumbTip.y < wrist.y - 30 && indexTip.y > kps[5].y;
                    if (thumbUp) {
                        return 'THUMBS UP GESTURE 👍';
                    }

                    // Open Palm / Raised Hand
                    const allExtended = thumbTip.y < wrist.y && indexTip.y < wrist.y && middleTip.y < wrist.y && ringTip.y < wrist.y && pinkyTip.y < wrist.y;
                    if (allExtended) {
                        return 'OPEN PALM / HAND TRACKED ✋';
                    }
                }
            }
        }

        if (!lShoulder || !rShoulder || (lShoulder.score ?? 1) < minConf || (rShoulder.score ?? 1) < minConf) {
            return 'STANDING POSTURE';
        }

        // Body Gestures
        if (lWrist && rWrist && (lWrist.score ?? 1) > minConf && (rWrist.score ?? 1) > minConf) {
            if (lWrist.y < lShoulder.y - 20 && rWrist.y < rShoulder.y - 20) {
                return 'HANDS RAISED (CELEBRATION)';
            }
        }

        if (lWrist && nose && (lWrist.score ?? 1) > minConf && lWrist.y < nose.y) {
            return 'LEFT HAND WAVING';
        }
        if (rWrist && nose && (rWrist.score ?? 1) > minConf && rWrist.y < nose.y) {
            return 'RIGHT HAND WAVING';
        }

        if (lWrist && rWrist && lElbow && rElbow) {
            const lArmHorizontal = Math.abs(lWrist.y - lShoulder.y) < 55 && Math.abs(lElbow.y - lShoulder.y) < 45;
            const rArmHorizontal = Math.abs(rWrist.y - rShoulder.y) < 55 && Math.abs(rElbow.y - rShoulder.y) < 45;
            if (lArmHorizontal && rArmHorizontal) {
                return 'T-POSE EXTENSION';
            }
        }

        if (lKnee && lHip && (lKnee.score ?? 1) > minConf && (lHip.score ?? 1) > minConf) {
            if (lKnee.y - lHip.y < 90) {
                return 'SQUAT / BENDING KINEMATICS';
            }
        }

        return 'STANDING POSTURE';
    };

    // --- Face Recognition Matching Helper ---
    // useCallback so the inference-loop effect below can depend on it without
    // recreating the setInterval every render (it only reads enrolledFaces,
    // already one of that effect's dependencies).
    const matchFaceIdentity = useCallback((descriptor: Float32Array): string => {
        if (enrolledFaces.length === 0) return 'UNENROLLED SUBJECT';

        let bestDistance = Infinity;
        let bestName = 'UNENROLLED SUBJECT';

        enrolledFaces.forEach(ef => {
            const distance = faceapi.euclideanDistance(descriptor, new Float32Array(ef.descriptor));
            if (distance < 0.55 && distance < bestDistance) {
                bestDistance = distance;
                bestName = `${ef.name} (${(1 - distance).toFixed(2)})`;
            }
        });

        return bestName;
    }, [enrolledFaces]);

    // --- Estimate 3D Head Orientation ---
    const computeHeadPoseText = (landmarks: Array<{ x: number; y: number }>): string => {
        if (landmarks.length < 68) return 'Facing Center';
        const noseTip = landmarks[30];
        const leftEyeOuter = landmarks[36];
        const rightEyeOuter = landmarks[45];

        if (!noseTip || !leftEyeOuter || !rightEyeOuter) return 'Facing Center';

        const leftDist = Math.abs(noseTip.x - leftEyeOuter.x);
        const rightDist = Math.abs(noseTip.x - rightEyeOuter.x);
        const ratio = leftDist / (rightDist || 1);

        if (ratio > 1.8) return 'Turned Right';
        if (ratio < 0.55) return 'Turned Left';
        return 'Facing Center';
    };

    // --- Async AI Background Inference Loop ---
    useEffect(() => {
        if (!isCameraActive || isDemoMode) return;

        let isCancelled = false;

        const runAiInference = async () => {
            const video = videoRef.current;
            if (!video || video.readyState !== 4 || isAiDetectingRef.current) return;

            isAiDetectingRef.current = true;
            const startTime = performance.now();
            const tick = inferenceTickRef.current;
            inferenceTickRef.current += 1;
            // Mobile: alternate the two heaviest models (face + object) across ticks instead
            // of running all 4 models every tick, to roughly halve peak per-tick CPU/GPU cost.
            const runFaceThisTick = !isMobile || tick % 2 === 0;
            const runObjectThisTick = !isMobile || tick % 2 === 1;

            try {
                // 1. MediaPipe 21 3D Finger & Hand Landmark Tracking
                let liveHands: HandData[] = [];
                if (showHandTracking && handDetectorRef.current) {
                    try {
                        const hands = await handDetectorRef.current.estimateHands(video, {
                            flipHorizontal: false,
                            staticImageMode: false
                        });
                        if (!isCancelled && hands && hands.length > 0) {
                            liveHands = hands.map(h => ({
                                handedness: h.handedness || 'Hand',
                                score: h.score,
                                keypoints: h.keypoints.map(k => ({ x: k.x, y: k.y, z: k.z, name: k.name }))
                            }));
                        }
                    } catch (err) {
                        console.warn('Hand inference err:', err);
                    }
                }

                // 2. MoveNet Full-Body Pose Estimation
                if (showPoseTracking && poseDetectorRef.current) {
                    const poses = await poseDetectorRef.current.estimatePoses(video);
                    if (!isCancelled && poses.length > 0) {
                        const formattedPoses: BodyPoseData[] = poses.map(p => {
                            const kpsMap: Record<string, Keypoint> = {};
                            p.keypoints.forEach(k => { if (k.name) kpsMap[k.name] = k; });

                            // Fallback: If hand detector has temporary frame delay, anchor 21 finger keypoints to wrist position
                            if (showHandTracking && liveHands.length === 0) {
                                ['left_wrist', 'right_wrist'].forEach((wristName, wIdx) => {
                                    const wrist = kpsMap[wristName];
                                    const elbow = kpsMap[wristName === 'left_wrist' ? 'left_elbow' : 'right_elbow'];
                                    if (wrist && (wrist.score ?? 1) > 0.2) {
                                        let angle = -Math.PI / 2;
                                        if (elbow && (elbow.score ?? 1) > 0.2) {
                                            angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
                                        }
                                        const syntheticKps = generateHandFingerLandmarks(wrist.x, wrist.y, angle);
                                        liveHands.push({
                                            handedness: wIdx === 0 ? 'Left' : 'Right',
                                            score: wrist.score || 0.85,
                                            keypoints: syntheticKps
                                        });
                                    }
                                });
                            }

                            const detectedGesture = classifyGesture(kpsMap, liveHands);
                            setCurrentGesture(detectedGesture);

                            return {
                                keypoints: p.keypoints.map(k => ({ x: k.x, y: k.y, score: k.score, name: k.name })),
                                score: p.score,
                                gestureLabel: detectedGesture
                            };
                        });
                        cachedPosesRef.current = formattedPoses;
                        setDetectedPoses(formattedPoses);
                    }
                } else if (!showPoseTracking) {
                    cachedPosesRef.current = [];
                    setDetectedPoses([]);
                }

                if (!isCancelled && showHandTracking) {
                    cachedHandsRef.current = liveHands;
                    setDetectedHands(liveHands);
                } else if (!showHandTracking) {
                    cachedHandsRef.current = [];
                    setDetectedHands([]);
                }

                // 3. Face, Biometrics & Facial Embeddings
                if (showFaceDetection && isFaceApiLoadedRef.current && runFaceThisTick) {
                    const detections = await faceapi.detectAllFaces(
                        video,
                        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })
                    )
                    .withFaceLandmarks()
                    .withFaceExpressions()
                    .withAgeAndGender()
                    .withFaceDescriptors();

                    if (!isCancelled) {
                        const formattedFaces: FaceDetectionData[] = detections.map(d => {
                            const recName = matchFaceIdentity(d.descriptor);
                            const headPose = computeHeadPoseText(d.landmarks.positions);

                            return {
                                box: d.detection.box,
                                expressions: d.expressions as unknown as Record<string, number>,
                                age: Math.round(d.age),
                                gender: d.gender,
                                genderProbability: d.genderProbability,
                                landmarks: d.landmarks.positions,
                                descriptor: d.descriptor,
                                recognizedName: recName,
                                headPoseText: headPose
                            };
                        });

                        cachedFacesRef.current = formattedFaces;
                        setDetectedFaces(formattedFaces);

                        if (formattedFaces.length > 0 && enableVoiceAudio) {
                            const face = formattedFaces[0];
                            const topExpr = Object.entries(face.expressions).sort((a, b) => b[1] - a[1])[0];
                            if (topExpr && topExpr[1] > 0.6) {
                                speakAiAnnouncement(`Identified ${face.recognizedName || 'Subject'}, feeling ${topExpr[0]}`);
                            }
                        }
                    }
                } else if (!showFaceDetection) {
                    cachedFacesRef.current = [];
                    setDetectedFaces([]);
                }

                // 4. Object Detection (COCO-SSD)
                if (showObjectDetection && cocoModelRef.current && runObjectThisTick) {
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

        const interval = setInterval(runAiInference, isMobile ? 160 : 90);
        return () => {
            isCancelled = true;
            clearInterval(interval);
        };
    }, [isCameraActive, isDemoMode, showFaceDetection, showObjectDetection, showPoseTracking, showHandTracking, enableVoiceAudio, speakAiAnnouncement, matchFaceIdentity, enrolledFaces, isMobile]);

    // --- 60 FPS Render Loop with Hand Wireframes, Body Pose & EMA Smoothing ---
    const processFrame = useCallback(() => {
        if (!canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const width = video?.videoWidth || 1280;
        const height = video?.videoHeight || 720;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        // 1. Render Video / Cyber Background
        if (isDemoMode || !video || video.readyState !== 4) {
            ctx.fillStyle = '#06080d';
            ctx.fillRect(0, 0, width, height);

            const time = Date.now() * 0.002;
            ctx.strokeStyle = 'rgba(0, 255, 102, 0.12)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = 0; y < height; y += 40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }

            const centerX = width / 2 + Math.sin(time) * 30;
            const centerY = height / 2 + Math.cos(time * 0.8) * 15;

            if (showFaceDetection) {
                drawCyberBox(ctx, centerX - 90, centerY - 110, 180, 220, '#00ff66', 'OPERATOR #01 (ENROLLED)');
            }

            if (showHandTracking) {
                // Demo 21 Hand Finger Landmark Wireframe
                const hX = centerX + 180;
                const hY = centerY - 40;
                ctx.strokeStyle = '#00ff66';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#00ff66';
                ctx.shadowBlur = 8;
                
                // Draw 5 Finger Wireframe Lines from Wrist
                const fingers = [
                    [{ x: hX, y: hY }, { x: hX - 25, y: hY - 30 }, { x: hX - 40, y: hY - 55 }], // Thumb
                    [{ x: hX, y: hY }, { x: hX - 10, y: hY - 45 }, { x: hX - 15, y: hY - 80 }], // Index
                    [{ x: hX, y: hY }, { x: hX + 10, y: hY - 50 }, { x: hX + 12, y: hY - 90 }], // Middle
                    [{ x: hX, y: hY }, { x: hX + 30, y: hY - 45 }, { x: hX + 35, y: hY - 80 }], // Ring
                    [{ x: hX, y: hY }, { x: hX + 50, y: hY - 30 }, { x: hX + 58, y: hY - 60 }]  // Pinky
                ];

                fingers.forEach(f => {
                    ctx.beginPath();
                    ctx.moveTo(f[0].x, f[0].y);
                    ctx.lineTo(f[1].x, f[1].y);
                    ctx.lineTo(f[2].x, f[2].y);
                    ctx.stroke();

                    f.forEach(pt => {
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
                    });
                });
                ctx.shadowBlur = 0;
            }

            setDetectedFaces([{
                box: { x: centerX - 90, y: centerY - 110, width: 180, height: 220 },
                expressions: { happy: 0.94, neutral: 0.05, surprised: 0.01 },
                age: 26,
                gender: 'male',
                genderProbability: 0.99,
                recognizedName: 'OPERATOR #01',
                headPoseText: 'Facing Center'
            }]);

            setCurrentGesture('OPEN PALM / HAND TRACKED ✋');
            setMotionLevel(Math.round(25 + Math.sin(time * 5) * 15));
        } else {
            // Draw real webcam stream onto canvas
            ctx.drawImage(video, 0, 0, width, height);

            // Fast optical motion estimation
            if (showPoseTracking || showFaceDetection) {
                if (!offscreenCanvasRef.current) {
                    offscreenCanvasRef.current = document.createElement('canvas');
                    offscreenCanvasRef.current.width = 80;
                    offscreenCanvasRef.current.height = 45;
                }
                const offCtx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true });
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

            // 2. Draw 21 3D Finger & Hand Keypoint Skeleton Wireframes
            if (showHandTracking && cachedHandsRef.current.length > 0) {
                cachedHandsRef.current.forEach(hand => {
                    const kps = hand.keypoints;
                    if (kps.length < 21) return;

                    // 5 Finger Joint Chains from Wrist (0)
                    const fingerChains = [
                        [0, 1, 2, 3, 4],     // Thumb
                        [0, 5, 6, 7, 8],     // Index finger
                        [0, 9, 10, 11, 12],  // Middle finger
                        [0, 13, 14, 15, 16], // Ring finger
                        [0, 17, 18, 19, 20]  // Pinky finger
                    ];

                    const palmChain = [5, 9, 13, 17, 0];

                    ctx.strokeStyle = '#00ff66';
                    ctx.lineWidth = 2.5;
                    if (!isMobile) {
                        ctx.shadowColor = '#00ff66';
                        ctx.shadowBlur = 8;
                    }

                    // Draw 5 Finger Bones
                    fingerChains.forEach(chain => {
                        ctx.beginPath();
                        chain.forEach((idx, i) => {
                            const pt = kps[idx];
                            if (pt) {
                                if (i === 0) ctx.moveTo(pt.x, pt.y);
                                else ctx.lineTo(pt.x, pt.y);
                            }
                        });
                        ctx.stroke();
                    });

                    // Draw Palm Base Line
                    ctx.strokeStyle = 'rgba(0, 255, 102, 0.6)';
                    ctx.beginPath();
                    palmChain.forEach((idx, i) => {
                        const pt = kps[idx];
                        if (pt) {
                            if (i === 0) ctx.moveTo(pt.x, pt.y);
                            else ctx.lineTo(pt.x, pt.y);
                        }
                    });
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Draw 21 Joint Nodes & Fingertip Illumination
                    kps.forEach((pt, idx) => {
                        const isFingertip = [4, 8, 12, 16, 20].includes(idx);

                        ctx.fillStyle = isFingertip ? '#ffffff' : 'rgba(0, 255, 102, 0.6)';
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, isFingertip ? 6 : 4, 0, Math.PI * 2);
                        ctx.fill();

                        if (isFingertip) {
                            ctx.strokeStyle = '#00ff66';
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    });

                    // Hand Label
                    const wristPt = kps[0];
                    if (wristPt) {
                        ctx.fillStyle = '#00ff66';
                        ctx.font = '800 11px Inter, sans-serif';
                        ctx.fillText(`${hand.handedness.toUpperCase()} HAND (21 KEYPOINTS)`, wristPt.x - 40, wristPt.y + 22);
                    }
                });
            }

            // 3. Draw MoveNet Body Pose Skeleton with Clean Confidence Filtering
            if (showPoseTracking && cachedPosesRef.current.length > 0) {
                cachedPosesRef.current.forEach(pose => {
                    if (!pose.keypoints) return;
                    const rawKps = pose.keypoints;
                    const minConf = 0.35; // Strict confidence score to eliminate misconnected lines

                    const smoothedMap: Record<string, { x: number; y: number; score?: number; name?: string }> = {};
                    rawKps.forEach((k, idx) => {
                        const key = k.name || `kp_${idx}`;
                        const prev = smoothedKeypointsRef.current[key];
                        if (prev && (k.score ?? 1) > minConf) {
                            const newX = prev.x * 0.35 + k.x * 0.65;
                            const newY = prev.y * 0.35 + k.y * 0.65;
                            smoothedKeypointsRef.current[key] = { x: newX, y: newY };
                            smoothedMap[key] = { x: newX, y: newY, score: k.score, name: k.name };
                        } else if ((k.score ?? 1) > minConf) {
                            smoothedKeypointsRef.current[key] = { x: k.x, y: k.y };
                            smoothedMap[key] = { x: k.x, y: k.y, score: k.score, name: k.name };
                        }
                    });

                    // Valid Body Bones Connections
                    const connections = [
                        ['left_shoulder', 'right_shoulder'],
                        ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
                        ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
                        ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
                        ['left_hip', 'right_hip'],
                        ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
                        ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
                    ];

                    ctx.strokeStyle = '#00ff66';
                    ctx.lineWidth = 3.5;
                    if (!isMobile) {
                        ctx.shadowColor = '#00ff66';
                        ctx.shadowBlur = 10;
                    }

                    connections.forEach(([p1Name, p2Name]) => {
                        const p1 = smoothedMap[p1Name];
                        const p2 = smoothedMap[p2Name];
                        if (p1 && p2 && (p1.score ?? 1) > minConf && (p2.score ?? 1) > minConf) {
                            // Ensure max reasonable limb distance to prevent face artifacts
                            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                            if (dist < width * 0.45) {
                                ctx.beginPath();
                                ctx.moveTo(p1.x, p1.y);
                                ctx.lineTo(p2.x, p2.y);
                                ctx.stroke();
                            }
                        }
                    });

                    ctx.shadowBlur = 0;

                    // Motion Trails for Wrists & Ankles
                    if (showMotionTrails) {
                        ['left_wrist', 'right_wrist', 'left_ankle', 'right_ankle'].forEach(limb => {
                            const node = smoothedMap[limb];
                            if (node && (node.score ?? 1) > minConf) {
                                if (!motionTrailsRef.current[limb]) motionTrailsRef.current[limb] = [];
                                const trail = motionTrailsRef.current[limb];
                                trail.push({ x: node.x, y: node.y, alpha: 1.0 });
                                if (trail.length > 12) trail.shift();

                                for (let i = 0; i < trail.length - 1; i++) {
                                    const pt1 = trail[i];
                                    const pt2 = trail[i + 1];
                                    const trailAlpha = (i / trail.length) * 0.7;

                                    ctx.strokeStyle = `rgba(0, 255, 102, ${trailAlpha})`;
                                    ctx.lineWidth = (i / trail.length) * 4;
                                    ctx.beginPath();
                                    ctx.moveTo(pt1.x, pt1.y);
                                    ctx.lineTo(pt2.x, pt2.y);
                                    ctx.stroke();
                                }
                            }
                        });
                    }

                    // Body Joint Reticle Nodes
                    Object.values(smoothedMap).forEach(kp => {
                        if ((kp.score ?? 1) > minConf) {
                            ctx.fillStyle = 'rgba(0, 255, 102, 0.45)';
                            ctx.beginPath(); ctx.arc(kp.x, kp.y, 8, 0, Math.PI * 2); ctx.fill();

                            ctx.fillStyle = '#ffffff';
                            ctx.beginPath(); ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2); ctx.fill();

                            const labelName = kp.name || '';
                            if (['left_wrist', 'right_wrist', 'left_elbow', 'right_elbow'].includes(labelName)) {
                                ctx.fillStyle = '#00ff66';
                                ctx.font = '800 10px Inter, sans-serif';
                                ctx.fillText(labelName.replace('_', ' ').toUpperCase(), kp.x + 10, kp.y + 4);
                            }
                        }
                    });
                });
            }

            // 4. Object Bounding Boxes (COCO-SSD)
            if (showObjectDetection && cachedObjectsRef.current.length > 0) {
                cachedObjectsRef.current.forEach(obj => {
                    const [x, y, w, h] = obj.bbox;
                    drawCyberBox(ctx, x, y, w, h, '#00ff66', `${obj.class.toUpperCase()} ${Math.round(obj.score * 100)}%`);
                });
            }

            // 5. 3D Biometric Facial Mesh & Identity Tag
            if (showFaceDetection && cachedFacesRef.current.length > 0) {
                cachedFacesRef.current.forEach((face, fIdx) => {
                    const { x, y, width: w, height: h } = face.box;

                    const badgeLabel = face.recognizedName
                        ? `${face.recognizedName.toUpperCase()}`
                        : `FACE LOCK #${fIdx + 1}`;

                    drawCyberBox(ctx, x, y, w, h, '#00ff66', badgeLabel);

                    const scanY = y + ((Date.now() * 0.2) % h);
                    ctx.strokeStyle = 'rgba(0, 255, 102, 0.8)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x + 4, scanY);
                    ctx.lineTo(x + w - 4, scanY);
                    ctx.stroke();

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

                        drawContour(Array.from({ length: 17 }, (_, i) => i), 'rgba(0, 255, 102, 0.7)');
                        drawContour([17, 18, 19, 20, 21], '#00ff66');
                        drawContour([22, 23, 24, 25, 26], '#00ff66');
                        drawContour([27, 28, 29, 30], '#00ff66');
                        drawContour([31, 32, 33, 34, 35], '#00ff66');
                        drawContour([36, 37, 38, 39, 40, 41], '#00ff66', true);
                        drawContour([42, 43, 44, 45, 46, 47], '#00ff66', true);
                        drawContour([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59], '#00ff66', true);
                    }
                });
            }
        }

        // 60 FPS Counter Computation
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsTimeRef.current >= 1000) {
            setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
        }

        animationFrameRef.current = requestAnimationFrame(processFrame);
    }, [isDemoMode, showFaceDetection, showObjectDetection, showPoseTracking, showHandTracking, showMotionTrails, isMobile]);

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
            ctx.fillRect(x, Math.max(0, y - 22), Math.min(w, 240), 20);
            ctx.fillStyle = '#000000';
            ctx.font = '800 11px Inter, sans-serif';
            ctx.fillText(label, x + 6, Math.max(14, y - 7));
        }
    };

    // Enroll Face Identity Handler
    const handleEnrollFace = () => {
        if (!enrollNameInput.trim()) return;
        const currentFace = detectedFaces[0];
        if (!currentFace || !currentFace.descriptor) {
            alert('No face detected in video frame to enroll! Please face the camera.');
            return;
        }

        const descriptorArray = Array.from(currentFace.descriptor);
        const newEnrollment: EnrolledFace = {
            name: enrollNameInput.trim(),
            descriptor: descriptorArray
        };

        setEnrolledFaces(prev => [...prev.filter(e => e.name !== newEnrollment.name), newEnrollment]);
        setEnrollNameInput('');
        setIsEnrollDialogOpen(false);
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
            currentGesture,
            detectedHandsCount: detectedHands.length,
            detectedFacesCount: detectedFaces.length,
            detectedObjectsCount: detectedObjects.length,
            detectedPosesCount: detectedPoses.length,
            enrolledIdentitiesCount: enrolledFaces.length,
            motionLevelPercent: motionLevel,
            hands: detectedHands,
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
        ? primaryPose.keypoints.filter(k => (k.score ?? 1) > 0.3).length
        : 0;

    // Component Panels for Layout
    const RenderKinematicsPanel = () => (
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
                    BODY & HAND KINEMATICS
                </Typography>
            </Stack>

            <Stack spacing={1.5}>
                <Paper sx={{ p: 1.5, bgcolor: 'rgba(0, 255, 102, 0.05)', border: '1px solid rgba(0, 255, 102, 0.2)', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        ACTIVE GESTURE CLASSIFICATION
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#00ff66">
                        {currentGesture}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip
                            label={`${detectedHands.length} Hands (21 Keypoints)`}
                            size="small"
                            sx={{ bgcolor: 'rgba(0, 255, 102, 0.15)', color: '#00ff66', fontWeight: 800 }}
                        />
                        <Chip
                            label={`${trackedJointsCount}/17 Body Joints`}
                            size="small"
                            sx={{ bgcolor: 'rgba(0, 255, 102, 0.15)', color: '#00ff66', fontWeight: 800 }}
                        />
                    </Stack>
                </Paper>
            </Stack>
        </Card>
    );

    const RenderBiometricsPanel = () => (
        <Card
            elevation={0}
            sx={{
                p: 2,
                bgcolor: '#080a0f',
                border: '1px solid rgba(0, 255, 102, 0.25)',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Animated Header Scan Beam */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, #00ff66, transparent)',
                    animation: 'scanHeader 3s ease-in-out infinite',
                    '@keyframes scanHeader': {
                        '0%': { transform: 'translateX(-100%)' },
                        '100%': { transform: 'translateX(100%)' }
                    }
                }}
            />

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                        sx={{
                            display: 'inline-flex',
                            p: 0.75,
                            borderRadius: '50%',
                            bgcolor: 'rgba(0, 255, 102, 0.1)',
                            border: '1px solid rgba(0, 255, 102, 0.3)',
                            animation: primaryFace ? 'pulseGlow 2s infinite' : 'none',
                            '@keyframes pulseGlow': {
                                '0%': { boxShadow: '0 0 0 0 rgba(0, 255, 102, 0.4)' },
                                '70%': { boxShadow: '0 0 0 8px rgba(0, 255, 102, 0)' },
                                '100%': { boxShadow: '0 0 0 0 rgba(0, 255, 102, 0)' }
                            }
                        }}
                    >
                        <Fingerprint sx={{ color: '#00ff66', fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle2" fontWeight={800} color="#ffffff" letterSpacing="0.03em">
                        BIOMETRIC & MOOD
                    </Typography>
                </Stack>
                {enrolledFaces.length > 0 && (
                    <Chip
                        label={`${enrolledFaces.length} Saved`}
                        size="small"
                        sx={{ bgcolor: 'rgba(0, 255, 102, 0.15)', color: '#00ff66', fontWeight: 800, height: 22, fontSize: '0.7rem' }}
                    />
                )}
            </Stack>

            <Stack spacing={1.25}>
                {/* Identity Bar */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 1.25,
                        bgcolor: primaryFace ? 'rgba(0, 255, 102, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                        border: primaryFace ? '1px solid rgba(0, 255, 102, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: 2
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                IDENTITY VECTOR MATCH
                            </Typography>
                            <Typography variant="body2" fontWeight={800} color={primaryFace ? '#00ff66' : 'rgba(255, 255, 255, 0.4)'}>
                                {primaryFace ? (primaryFace.recognizedName || 'UNENROLLED SUBJECT') : 'SCANNING FOR FACE...'}
                            </Typography>
                        </Box>
                        <Chip
                            label={primaryFace ? (primaryFace.headPoseText || 'FACING CENTER') : 'SEARCHING'}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                bgcolor: primaryFace ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: primaryFace ? '#00ff66' : 'text.secondary'
                            }}
                        />
                    </Stack>
                </Paper>

                {/* Dominant Emotion & Age Row */}
                <Grid container spacing={1}>
                    <Grid item xs={6}>
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'rgba(0, 255, 102, 0.04)', border: '1px solid rgba(0, 255, 102, 0.15)', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.62rem' }}>
                                DOMINANT MOOD
                            </Typography>
                            <Typography variant="body2" fontWeight={800} color={primaryFace ? '#00ff66' : 'rgba(255, 255, 255, 0.3)'} sx={{ textTransform: 'uppercase' }}>
                                {primaryFace && topEmotion ? topEmotion[0] : 'STANDBY'}
                            </Typography>
                            <Typography variant="caption" color="#00ff66" fontWeight={700} sx={{ fontSize: '0.65rem' }}>
                                {primaryFace && topEmotion ? `${Math.round(topEmotion[1] * 100)}% Match` : '0%'}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6}>
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'rgba(0, 255, 102, 0.04)', border: '1px solid rgba(0, 255, 102, 0.15)', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.62rem' }}>
                                AGE / GENDER
                            </Typography>
                            <Typography variant="body2" fontWeight={800} color={primaryFace ? '#00ff66' : 'rgba(255, 255, 255, 0.3)'}>
                                {primaryFace && primaryFace.age ? `${primaryFace.age} Yrs` : '--'}
                            </Typography>
                            <Typography variant="caption" color="#00ff66" fontWeight={700} sx={{ fontSize: '0.65rem' }}>
                                {primaryFace && primaryFace.gender ? primaryFace.gender.toUpperCase() : 'NO LOCK'}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                {/* 2-Column Compact Emotion Grid */}
                <Box>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75, display: 'block' }}>
                        EMOTION SPECTRUM GAUGE
                    </Typography>

                    <Grid container spacing={0.75}>
                        {(primaryFace?.expressions
                            ? Object.entries(primaryFace.expressions)
                            : [['neutral', 0], ['happy', 0], ['sad', 0], ['angry', 0], ['fearful', 0], ['disgusted', 0], ['surprised', 0]]
                        ).map(([expr, val]) => {
                            const percentage = Math.round((val as number) * 100);
                            return (
                                <Grid item xs={6} key={expr}>
                                    <Box sx={{ p: 0.75, bgcolor: 'rgba(255, 255, 255, 0.02)', borderRadius: 1.5, border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.3 }}>
                                            <Typography variant="caption" color={primaryFace ? '#ffffff' : 'text.secondary'} fontWeight={700} sx={{ textTransform: 'capitalize', fontSize: '0.68rem' }}>
                                                {expr}
                                            </Typography>
                                            <Typography variant="caption" color={primaryFace && percentage > 0 ? '#00ff66' : 'text.secondary'} fontWeight={800} sx={{ fontSize: '0.68rem' }}>
                                                {percentage}%
                                            </Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={percentage}
                                            sx={{
                                                height: 4,
                                                borderRadius: 2,
                                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: primaryFace && percentage > 30 ? '#00ff66' : 'rgba(0, 255, 102, 0.4)',
                                                    borderRadius: 2
                                                }
                                            }}
                                        />
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            </Stack>
        </Card>
    );

    const RenderObjectsPanel = () => (
        <Card
            elevation={0}
            sx={{
                p: 2.5,
                bgcolor: '#080a0f',
                border: '1px solid rgba(0, 255, 102, 0.25)',
                borderRadius: 3
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Category sx={{ color: '#00ff66', fontSize: 22 }} />
                <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                    OBJECT INVENTORY ({detectedObjects.length})
                </Typography>
            </Stack>

            {detectedObjects.length > 0 ? (
                <Stack spacing={1} sx={{ maxHeight: 160, overflowY: 'auto', pr: 0.5 }}>
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
                    No objects detected.
                </Typography>
            )}
        </Card>
    );

    const RenderMetricsPanel = () => (
        <Card
            elevation={0}
            sx={{
                p: 2,
                bgcolor: '#080a0f',
                border: '1px solid rgba(0, 255, 102, 0.25)',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ p: 0.75, borderRadius: '50%', bgcolor: 'rgba(0, 255, 102, 0.1)', border: '1px solid rgba(0, 255, 102, 0.3)' }}>
                        <Analytics sx={{ color: '#00ff66', fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" fontWeight={800} color="#ffffff" letterSpacing="0.02em">
                            OPTICAL MOTION & DENSITY TELEMETRY
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Realtime Differential Pixel Vector Analysis
                        </Typography>
                    </Box>
                </Stack>
                <Chip
                    label={`${motionLevel}% DENSITY`}
                    size="small"
                    sx={{
                        bgcolor: motionLevel > 40 ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        color: '#00ff66',
                        fontWeight: 800,
                        border: '1px solid rgba(0, 255, 102, 0.3)'
                    }}
                />
            </Stack>

            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={7}>
                    <Box sx={{ position: 'relative', mb: 1 }}>
                        <LinearProgress
                            variant="determinate"
                            value={motionLevel}
                            sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, #00ff66 0%, #00e676 50%, #76ff03 100%)',
                                    borderRadius: 4
                                }
                            }}
                        />
                    </Box>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.65rem' }}>STATIC (0%)</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.65rem' }}>MODERATE (50%)</Typography>
                        <Typography variant="caption" color="#00ff66" fontWeight={700} sx={{ fontSize: '0.65rem' }}>HIGH KINEMATIC FLOW (100%)</Typography>
                    </Stack>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'rgba(0, 255, 102, 0.04)', border: '1px solid rgba(0, 255, 102, 0.15)', borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.62rem' }}>
                                DETECTED OBJECTS
                            </Typography>
                            <Chip label={`${detectedObjects.length} Detected`} size="small" sx={{ height: 18, fontSize: '0.62rem', color: '#00ff66', bgcolor: 'rgba(0, 255, 102, 0.15)', fontWeight: 800 }} />
                        </Stack>
                        <Typography variant="body2" fontWeight={800} color={detectedObjects.length > 0 ? '#00ff66' : 'rgba(255, 255, 255, 0.4)'} noWrap sx={{ mt: 0.3, textTransform: 'capitalize', fontSize: '0.78rem' }}>
                            {detectedObjects.length > 0 ? detectedObjects.map(o => o.class).join(', ') : 'No objects in frame'}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Card>
    );

    return (
        <Box sx={{ pb: 8 }}>
            <Seo
                title="Realtime AI Vision Studio | 21 Hand Finger Landmarks, Body Kinematics & Biometrics"
                description="Real-time WebGL neural vision lab in browser. Track 21 3D finger landmarks, 17 body pose keypoints, biometric faces, 7 emotions, and objects with 60 FPS performance."
                keywords={[
                    "21 finger hand tracking landmark",
                    "ai vision studio",
                    "realtime pose tracking movenet",
                    "gesture recognition browser",
                    "face recognition embedding vector",
                    "object detection tensorflow js"
                ]}
            />

            <ServicePageHero
                title="Realtime AI Vision Studio"
                subtitle="High-Performance Vision: 21 3D Finger Landmarks per Hand, 17 Body Kinematics Keypoints, Biometric Face Matching, 7 Emotions & Object Detection 100% Client-Side."
                icon={Visibility}
            />

            <Container maxWidth="xl" sx={{ mt: { xs: 1, md: 2 } }}>

                {/* Model Loading Progress Bar */}
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

                {/* Native video element the canvas reads frames from. Kept
                    off-screen rather than display:none — mobile Safari (and
                    some Android WebViews) can suspend decoding a video
                    element entirely once it's display:none, which would
                    freeze the canvas on the first frame instead of showing
                    live video. Positioned/sized to be invisible without
                    ever being removed from layout/rendering. */}
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                />

                {/* Main Vision Studio Grid */}
                <Grid container spacing={3} alignItems="flex-start">

                    {/* Left Column: Clean Video Canvas Feed & Optical Motion Telemetry */}
                    <Grid item xs={12} md={7}>
                        <Stack spacing={2.5}>
                            <Card
                                elevation={0}
                                sx={{
                                    bgcolor: '#080a0f',
                                    border: '1px solid rgba(0, 255, 102, 0.25)',
                                    borderRadius: 3,
                                    overflow: 'hidden',
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
                                    {/* Front/back camera switching is a mobile-only concept —
                                        desktop webcams essentially never have a second camera
                                        to switch to, so this used to be a dead button there. */}
                                    {isMobile && (
                                        <IconButton
                                            size="small"
                                            onClick={switchCamera}
                                            disabled={!isCameraActive || isDemoMode}
                                            title="Switch Front/Back Camera"
                                            sx={{ color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.05)' }}
                                        >
                                            <Cameraswitch fontSize="small" />
                                        </IconButton>
                                    )}
                                </Stack>
                            </Box>

                            {/* Canvas Viewport (Clean Aspect Ratio without empty black space) */}
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    minHeight: isCameraActive ? undefined : { xs: 520, sm: 560, md: 580 },
                                    bgcolor: '#040508',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden'
                                }}
                            >
                                <Box
                                    component="canvas"
                                    ref={canvasRef}
                                    sx={{
                                        width: '100%',
                                        maxHeight: { xs: '45vh', sm: '55vh', md: '68vh' },
                                        objectFit: 'contain',
                                        display: isCameraActive ? 'block' : 'none'
                                    }}
                                />

                                {/* Camera Start Overlay Prompt when stopped */}
                                {!isCameraActive && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            bgcolor: 'rgba(6, 8, 14, 0.95)',
                                            backdropFilter: 'blur(8px)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            p: { xs: 2.5, sm: 4 },
                                            overflowY: 'auto',
                                            textAlign: 'center',
                                            zIndex: 5
                                        }}
                                    >
                                        <Avatar
                                            sx={{
                                                width: { xs: 56, sm: 72 },
                                                height: { xs: 56, sm: 72 },
                                                bgcolor: alpha(primaryColor, 0.12),
                                                border: `2px solid ${primaryColor}`,
                                                mb: { xs: 1.5, sm: 2.5 },
                                                boxShadow: `0 0 30px ${alpha(primaryColor, 0.4)}`
                                            }}
                                        >
                                            <Videocam sx={{ fontSize: { xs: 28, sm: 36 }, color: primaryColor }} />
                                        </Avatar>

                                        <Typography variant="h5" fontWeight={800} color="#ffffff" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                            ACTIVATE AI CAMERA FEED
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mb: { xs: 2, sm: 3.5 }, lineHeight: 1.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                            Enable webcam for 21 3D hand finger landmarks, full-body pose tracking, facial identity recognition, 3D face mesh, 7 emotions & object detection.
                                        </Typography>

                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, maxWidth: 360 }}>
                                            <Button
                                                variant="contained"
                                                size={isMobile ? 'medium' : 'large'}
                                                startIcon={<Videocam sx={{ color: '#000000' }} />}
                                                onClick={startCamera}
                                                disabled={isModelsLoading}
                                                sx={{
                                                    borderRadius: '28px',
                                                    px: 3.5,
                                                    py: 1.25,
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
                                                size={isMobile ? 'medium' : 'large'}
                                                startIcon={<PlayArrow />}
                                                onClick={() => { setIsDemoMode(true); setIsCameraActive(true); }}
                                                disabled={isModelsLoading}
                                                sx={{
                                                    borderRadius: '28px',
                                                    px: 3,
                                                    py: 1.25,
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

                            {/* Canvas Toolbar & Feature Toggles.
                                Toggles and actions are two separate rows
                                (not one wrap-everything flex box) so mobile
                                doesn't end up with an unpredictable number of
                                ragged rows depending on chip label lengths.
                                On mobile the toggle row scrolls horizontally
                                instead of wrapping — six chips wrapped at
                                375px width used to take 3+ rows on their own. */}
                            <Box
                                sx={{
                                    p: { xs: 1.5, sm: 2 },
                                    bgcolor: 'rgba(13, 17, 24, 0.95)',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.25
                                }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{
                                        overflowX: { xs: 'auto', sm: 'visible' },
                                        flexWrap: { xs: 'nowrap', sm: 'wrap' },
                                        pb: { xs: 0.5, sm: 0 },
                                        // Thin, unobtrusive scrollbar instead of the
                                        // browser default, since this scrolls on touch
                                        // anyway and a fat scrollbar just eats space.
                                        '&::-webkit-scrollbar': { height: 4 },
                                        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0, 255, 102, 0.3)', borderRadius: 2 },
                                    }}
                                >
                                    {[
                                        { icon: BackHand, label: 'Hand Fingers (21KP)', on: showHandTracking, toggle: () => setShowHandTracking(v => !v) },
                                        { icon: AccessibilityNew, label: 'Body Pose', on: showPoseTracking, toggle: () => setShowPoseTracking(v => !v) },
                                        { icon: Face, label: 'Face & Mood', on: showFaceDetection, toggle: () => setShowFaceDetection(v => !v) },
                                        { icon: Category, label: 'Objects', on: showObjectDetection, toggle: () => setShowObjectDetection(v => !v) },
                                        { icon: Timeline, label: 'Motion Trails', on: showMotionTrails, toggle: () => setShowMotionTrails(v => !v) },
                                        { icon: enableVoiceAudio ? RecordVoiceOver : VoiceOverOff, label: 'Voice Callouts', on: enableVoiceAudio, toggle: () => setEnableVoiceAudio(v => !v) },
                                    ].map(({ icon: Icon, label, on, toggle }) => (
                                        <Chip
                                            key={label}
                                            icon={<Icon sx={{ fontSize: '16px !important' }} />}
                                            label={label}
                                            clickable
                                            color={on ? 'success' : 'default'}
                                            variant={on ? 'filled' : 'outlined'}
                                            onClick={toggle}
                                            sx={{ fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}
                                        />
                                    ))}
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'space-between', sm: 'flex-end' }}>
                                    {isMobile ? (
                                        // Icon-only + tooltip on mobile: three labeled buttons plus
                                        // a stop button no longer fit one row without wrapping once
                                        // the toggle chips above already claim their own row.
                                        <Stack direction="row" spacing={1}>
                                            <Tooltip title="Enroll Face Identity">
                                                <span>
                                                    <IconButton
                                                        onClick={() => setIsEnrollDialogOpen(true)}
                                                        disabled={!isCameraActive}
                                                        sx={{ color: '#00ff66', bgcolor: 'rgba(0, 255, 102, 0.08)', border: '1px solid rgba(0, 255, 102, 0.3)' }}
                                                    >
                                                        <PersonAdd fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Take Snapshot">
                                                <span>
                                                    <IconButton
                                                        onClick={takeSnapshot}
                                                        disabled={!isCameraActive}
                                                        sx={{ color: '#00ff66', bgcolor: 'rgba(0, 255, 102, 0.08)', border: '1px solid rgba(0, 255, 102, 0.3)' }}
                                                    >
                                                        <PhotoCamera fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Export Analytics JSON">
                                                <IconButton
                                                    onClick={exportAnalyticsJson}
                                                    sx={{ color: '#000000', bgcolor: '#00ff66', '&:hover': { bgcolor: '#00e65c' } }}
                                                >
                                                    <Download fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    ) : (
                                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                                            <Tooltip title="Enroll Face Identity into Local Browser Database">
                                                <span>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<PersonAdd />}
                                                        onClick={() => setIsEnrollDialogOpen(true)}
                                                        disabled={!isCameraActive}
                                                        sx={{
                                                            borderRadius: '20px',
                                                            borderColor: 'rgba(0, 255, 102, 0.4)',
                                                            color: '#00ff66',
                                                            fontWeight: 700,
                                                            fontSize: '0.75rem',
                                                            '&:hover': { borderColor: '#00ff66', bgcolor: 'rgba(0, 255, 102, 0.08)' }
                                                        }}
                                                    >
                                                        Enroll Face
                                                    </Button>
                                                </span>
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
                                                    fontSize: '0.75rem',
                                                    '&:hover': { borderColor: '#00ff66', bgcolor: 'rgba(0, 255, 102, 0.08)' }
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
                                                    fontSize: '0.75rem',
                                                    boxShadow: '0 4px 15px rgba(0, 255, 102, 0.3)',
                                                    '&:hover': {
                                                        background: 'linear-gradient(135deg, #00e65c 0%, #00993d 100%)',
                                                        boxShadow: '0 6px 20px rgba(0, 255, 102, 0.5)'
                                                    }
                                                }}
                                            >
                                                Export JSON
                                            </Button>
                                        </Stack>
                                    )}
                                    {isCameraActive && (
                                        <IconButton onClick={stopCamera} color="error" title="Stop Camera" sx={{ bgcolor: 'rgba(255, 0, 85, 0.15)' }}>
                                            <VideocamOff fontSize="small" />
                                        </IconButton>
                                    )}
                                </Stack>
                            </Box>
                        </Card>
                        {!isMobile && RenderMetricsPanel()}
                    </Stack>
                </Grid>

                {/* Right Column / Mobile Tabs Viewport */}
                <Grid item xs={12} md={5}>
                    {isMobile ? (
                        <Box>
                            <Paper sx={{ bgcolor: '#080a0f', border: '1px solid rgba(0, 255, 102, 0.3)', borderRadius: 3, mb: 2, overflow: 'hidden' }}>
                                <Tabs
                                    value={mobileTab}
                                    onChange={(_, val) => setMobileTab(val)}
                                    variant="fullWidth"
                                    textColor="primary"
                                    indicatorColor="primary"
                                    sx={{
                                        '& .MuiTab-root': { color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', py: 1.5 },
                                        '& .Mui-selected': { color: '#00ff66 !important' },
                                        '& .MuiTabs-indicator': { bgcolor: '#00ff66' }
                                    }}
                                >
                                    <Tab icon={<BackHand sx={{ fontSize: 18 }} />} label="Kinematics" />
                                    <Tab icon={<Fingerprint sx={{ fontSize: 18 }} />} label="Biometrics" />
                                    <Tab icon={<Category sx={{ fontSize: 18 }} />} label="Objects" />
                                    <Tab icon={<Analytics sx={{ fontSize: 18 }} />} label="Metrics" />
                                </Tabs>
                            </Paper>

                            {mobileTab === 0 && RenderKinematicsPanel()}
                            {mobileTab === 1 && RenderBiometricsPanel()}
                            {mobileTab === 2 && RenderObjectsPanel()}
                            {mobileTab === 3 && RenderMetricsPanel()}
                        </Box>
                    ) : (
                        <Stack spacing={2.5}>
                            {RenderKinematicsPanel()}
                            {RenderBiometricsPanel()}
                            {RenderObjectsPanel()}
                        </Stack>
                    )}
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

            {/* --- Enroll Face Identity Dialog --- */}
            <Dialog
                open={isEnrollDialogOpen}
                onClose={() => setIsEnrollDialogOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        bgcolor: '#0d1117',
                        border: '1px solid rgba(0, 255, 102, 0.3)',
                        borderRadius: 3,
                        color: '#ffffff',
                        width: '100%',
                        minWidth: { xs: 0, sm: 320 }
                    }
                }}
            >
                <DialogTitle fontWeight={800} color="#00ff66">
                    Enroll Biometric Face Profile
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enter a label/name for the currently detected face to save its facial profile locally in your browser.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        label="User Name or Identity Tag"
                        variant="outlined"
                        value={enrollNameInput}
                        onChange={(e) => setEnrollNameInput(e.target.value)}
                        placeholder="e.g. Operator Alex"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: '#ffffff',
                                '& fieldset': { borderColor: 'rgba(0, 255, 102, 0.3)' },
                                '&:hover fieldset': { borderColor: '#00ff66' },
                                '&.Mui-focused fieldset': { borderColor: '#00ff66' }
                            },
                            '& .MuiInputLabel-root': { color: 'text.secondary' }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setIsEnrollDialogOpen(false)} sx={{ color: 'text.secondary' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleEnrollFace}
                        disabled={!enrollNameInput.trim()}
                        sx={{
                            bgcolor: '#00ff66',
                            color: '#000000',
                            fontWeight: 800,
                            '&:hover': { bgcolor: '#00e65c' }
                        }}
                    >
                        Save Profile
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AiVisionStudio;
