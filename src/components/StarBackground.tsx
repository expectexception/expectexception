import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';

interface Star {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
    layer: number; // 1, 2, or 3 for parallax
    animationDuration: number;
    animationDelay: number;
}

interface ShootingStar {
    id: number;
    x: number;
    y: number;
    angle: number;
    duration: number;
    delay: number;
    width: number;
}

interface StarBackgroundProps {
    density?: 'subtle' | 'medium' | 'dense';
    showShootingStars?: boolean;
    disabled?: boolean;
}

// Global Clean Keyframes
const starStyles = `
@keyframes shootingStarSimple {
    0% {
        transform: translateX(0) translateY(0);
        opacity: 0;
        width: 0;
    }
    10% {
        opacity: 1;
        width: 150px;
    }
    90% {
        opacity: 1;
        width: 150px;
    }
    100% {
        transform: translateX(400px) translateY(150px);
        opacity: 0;
        width: 0;
    }
}

@keyframes twinkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.3; transform: scale(0.8); }
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}
`;

const StarBackground: React.FC<StarBackgroundProps> = ({
    density = 'medium',
    showShootingStars = true,
    disabled = false,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // State for dynamic shooting stars
    const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
    const shootingStarIdRef = useRef(0);

    // Static Stars
    const stars = useMemo<Star[]>(() => {
        if (disabled) return [];
        const densityMap = { subtle: 40, medium: 80, dense: 150 };
        const count = isMobile ? densityMap[density] * 0.6 : densityMap[density];

        return Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.6 + 0.2,
            layer: Math.floor(Math.random() * 3) + 1,
            animationDuration: Math.random() * 4 + 3,
            animationDelay: Math.random() * 5,
        }));
    }, [density, isMobile, disabled]);

    // Spawner
    const createShootingStar = useCallback(() => {
        const id = shootingStarIdRef.current++;
        const newStar: ShootingStar = {
            id,
            x: Math.random() * 100,
            y: Math.random() * 40, // Top 40% only for more dramatic fall
            angle: 20 + Math.random() * 40, // 20 to 60 degrees
            duration: 1.5 + Math.random() * 2,
            delay: 0,
            width: 100 + Math.random() * 100,
        };

        setShootingStars(prev => [...prev, newStar]);

        // Cleanup
        setTimeout(() => {
            setShootingStars(prev => prev.filter(s => s.id !== id));
        }, (newStar.duration * 1000) + 100);
    }, []);

    useEffect(() => {
        if (disabled || !showShootingStars) return;

        let timeoutId: ReturnType<typeof setTimeout>;

        const loop = () => {
            createShootingStar();
            const nextTime = 3000 + Math.random() * 7000; // 3s to 10s
            timeoutId = setTimeout(loop, nextTime);
        };

        timeoutId = setTimeout(loop, 2000);
        return () => clearTimeout(timeoutId);
    }, [disabled, showShootingStars, createShootingStar]);

    if (disabled) return null;

    return (
        <Box sx={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
            background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)',
        }}>
            <style>{starStyles}</style>

            {/* Static Stars with Parallax feel */}
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
                        bgcolor: star.layer === 1 ? '#fff' : star.layer === 2 ? '#94a3b8' : '#64748b',
                        opacity: star.opacity,
                        animation: `twinkle ${star.animationDuration}s ease-in-out infinite`,
                        animationDelay: `${star.animationDelay}s`,
                        boxShadow: star.layer === 1 ? `0 0 ${star.size * 3}px white` : 'none',
                        zIndex: star.layer,
                    }}
                />
            ))}

            {/* Shooting Stars */}
            {shootingStars.map((star) => (
                <Box
                    key={`shooting-${star.id}`}
                    sx={{
                        position: 'absolute',
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        transform: `rotate(${star.angle}deg)`,
                        width: star.width,
                        height: 2,
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 70%, rgba(255,255,255,0) 100%)',
                            animation: `shootingStarSimple ${star.duration}s linear forwards`,
                            borderRadius: '100px',
                            boxShadow: '0 0 15px rgba(255,255,255,0.4)',
                        }}
                    />
                </Box>
            ))}

            {/* Nebula effect overlay */}
            {/* <Box sx={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)',
                filter: 'blur(60px)',
                zIndex: 0,
            }} /> */}
        </Box>
    );
};

export default StarBackground;
