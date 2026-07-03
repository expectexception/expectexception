import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { keyframes } from '@mui/system';

// --- Types ---
interface Star {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
    animationDuration: number;
    animationDelay: number;
    color: string;
    glow: number;
}

interface ShootingStar {
    id: number;
    x: number;
    y: number;
    angle: number;
    scale: number;
    speed: number;
}

interface StarBackgroundProps {
    density?: 'subtle' | 'medium' | 'dense';
    showShootingStars?: boolean;
    enableNebula?: boolean;
    disabled?: boolean;
    fixed?: boolean;
}

// --- Keyframes ---
const twinkle = keyframes`
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
`;

const shoot = keyframes`
    0% { transform: translateX(0) scale(1); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateX(800px) scale(0); opacity: 0; }
`;

// --- Utility: Noise Texture for "Film Grain" feel ---
// A tiny transparent noise pattern encoded in base64 to avoid external assets
const NOISE_SVG_DATA_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`;

// --- Sub-component: Static Stars ---
// Memoized to prevent re-rendering when shooting stars animate
const StaticStars = React.memo(({ stars }: { stars: Star[] }) => {
    return (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            {stars.map((star) => (
                <Box
                    key={`star-${star.id}`}
                    sx={{
                        position: 'absolute',
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                        borderRadius: '50%',
                        backgroundColor: star.color,
                        boxShadow: `0 0 ${star.glow}px ${star.color}`,
                        opacity: star.opacity,
                        animation: `${twinkle} ${star.animationDuration}s ease-in-out infinite`,
                        animationDelay: `${star.animationDelay}s`,
                        willChange: 'opacity, transform',
                    }}
                />
            ))}
        </Box>
    );
});

const StarBackground: React.FC<StarBackgroundProps> = ({
    density = 'medium',
    showShootingStars = true,
    enableNebula = true,
    disabled = false,
    fixed = false,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
    const shootingStarIdRef = useRef(0);

    // --- 1. Generate Static Stars ---
    const stars = useMemo<Star[]>(() => {
        if (disabled) return [];
        const densityMap = { subtle: 50, medium: 100, dense: 200 };
        const count = isMobile ? densityMap[density] * 0.5 : densityMap[density];

        return Array.from({ length: count }, (_, i) => {
            const isBlueStar = Math.random() > 0.9; // 10% chance of a blue/hot star
            const size = Math.random() * 2 + 0.5;

            return {
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: size,
                opacity: Math.random() * 0.7 + 0.3,
                animationDuration: Math.random() * 3 + 2, // 2s to 5s
                animationDelay: Math.random() * 5,
                color: isBlueStar ? '#a5f3fc' : '#fff', // Cyan-ish or White
                glow: isBlueStar ? 4 : 2,
            };
        });
    }, [density, isMobile, disabled]);

    // --- 2. Spawner Logic ---
    const createShootingStar = useCallback(() => {
        const id = shootingStarIdRef.current++;
        // Start from top-leftish area mostly, but vary it
        const startX = Math.random() * 100;
        const startY = Math.random() * 50;

        const newStar: ShootingStar = {
            id,
            x: startX,
            y: startY,
            angle: 35 + Math.random() * 20, // 35 to 55 degrees downwards
            scale: 0.8 + Math.random() * 0.7, // Random size variation
            speed: 2 + Math.random() * 1.5, // 2s to 3.5s duration
        };

        setShootingStars(prev => [...prev, newStar]);

        setTimeout(() => {
            setShootingStars(prev => prev.filter(s => s.id !== id));
        }, newStar.speed * 1000 + 100);
    }, []);

    useEffect(() => {
        if (disabled || !showShootingStars) return;

        let timeoutId: ReturnType<typeof setTimeout>;

        const scheduleNext = () => {
            const delay = 2000 + Math.random() * 5000; // Random interval between 2s and 7s
            timeoutId = setTimeout(() => {
                createShootingStar();
                scheduleNext();
            }, delay);
        };

        scheduleNext();
        return () => clearTimeout(timeoutId);
    }, [disabled, showShootingStars, createShootingStar]);

    if (disabled) return null;

    return (
        <Box sx={{
            position: fixed ? 'fixed' : 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
            bgcolor: '#020617', // Very dark slate/black base
        }}>
            {/* Layer 1: Nebula Effects (CSS Gradients) */}
            {enableNebula && (
                <>
                    <Box sx={{
                        position: 'absolute',
                        top: '-20%',
                        left: '-10%',
                        width: '60%',
                        height: '60%',
                        background: 'radial-gradient(circle, rgba(76, 29, 149, 0.15) 0%, rgba(0,0,0,0) 70%)',
                        filter: 'blur(60px)',
                        zIndex: 0,
                        animation: `${twinkle} 15s ease-in-out infinite alternate`,
                    }} />
                    <Box sx={{
                        position: 'absolute',
                        bottom: '-10%',
                        right: '-10%',
                        width: '50%',
                        height: '50%',
                        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, rgba(0,0,0,0) 70%)',
                        filter: 'blur(50px)',
                        zIndex: 0,
                        animation: `${twinkle} 20s ease-in-out infinite alternate-reverse`,
                    }} />
                </>
            )}

            {/* Layer 2: Noise Texture (Film Grain) */}
            <Box sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: NOISE_SVG_DATA_URI,
                opacity: 0.4,
                zIndex: 0,
                mixBlendMode: 'overlay',
            }} />

            {/* Layer 3: Static Stars (Memoized) */}
            <StaticStars stars={stars} />

            {/* Layer 4: Shooting Stars */}
            {shootingStars.map((star) => (
                <Box
                    key={`shooting-${star.id}`}
                    sx={{
                        position: 'absolute',
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        transform: `rotate(${star.angle}deg)`,
                        zIndex: 2,
                    }}
                >
                    {/* The Falling Animation Wrapper */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        // We animate the translateX here
                        animation: `${shoot} ${star.speed}s linear forwards`,
                        willChange: 'transform, opacity',
                    }}>
                        {/* The Head (Glowing Ball) */}
                        <Box sx={{
                            width: `${4 * star.scale}px`,
                            height: `${4 * star.scale}px`,
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.8), 0 0 20px 4px rgba(139, 92, 246, 0.3)',
                            zIndex: 2,
                        }} />

                        {/* The Tail (Gradient Trail) */}
                        <Box sx={{
                            width: `${250 * star.scale}px`,
                            height: `${2 * star.scale}px`,
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
                            // Negative margin pulls the tail behind the head seamlessly
                            marginLeft: '-2px',
                            transform: 'translateX(-1px)',
                            borderRadius: '100%',
                        }} />
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default StarBackground;