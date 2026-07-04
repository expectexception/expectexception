import React, { useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Button, Typography } from '@mui/material';
import { SportsEsports, RestartAlt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const PADDLE_H = 70;
const PADDLE_W = 10;
const BALL_SIZE = 9;
const PLAYER_SPEED = 6.5;
const AI_SPEED = 4.6;
const WIN_SCORE = 7;

/** Classic Pong vs a speed-limited AI paddle (so it's beatable). Move the
 * mouse/touch vertically to control your paddle on the right. Pure canvas +
 * rAF, no backend. */
const Pong: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef({ w: 600, h: 360 });
    const stateRef = useRef({
        playerY: 145, aiY: 145,
        ballX: 300, ballY: 180, ballVX: 4, ballVY: 3,
        playerScore: 0, aiScore: 0,
    });
    const [scores, setScores] = useState({ player: 0, ai: 0 });
    const [gameOver, setGameOver] = useState<string | null>(null);
    const runningRef = useRef(true);

    const resetBall = (dir: number) => {
        const { w, h } = sizeRef.current;
        stateRef.current.ballX = w / 2;
        stateRef.current.ballY = h / 2;
        stateRef.current.ballVX = 4 * dir;
        stateRef.current.ballVY = (Math.random() - 0.5) * 5;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = Math.max(1, Math.floor(rect.width));
            const h = 360;
            sizeRef.current = { w, h };
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            stateRef.current.playerY = h / 2 - PADDLE_H / 2;
            stateRef.current.aiY = h / 2 - PADDLE_H / 2;
        };
        resize();
        resetBall(1);
        window.addEventListener('resize', resize);

        const loop = () => {
            const s = stateRef.current;
            const { w, h } = sizeRef.current;

            if (runningRef.current) {
                // AI tracks the ball but is speed-capped so it's beatable.
                const aiCenter = s.aiY + PADDLE_H / 2;
                if (aiCenter < s.ballY - 10) s.aiY += AI_SPEED;
                else if (aiCenter > s.ballY + 10) s.aiY -= AI_SPEED;
                s.aiY = Math.max(0, Math.min(h - PADDLE_H, s.aiY));

                s.ballX += s.ballVX;
                s.ballY += s.ballVY;

                if (s.ballY <= 0 || s.ballY >= h - BALL_SIZE) s.ballVY *= -1;

                // Player paddle is on the left, AI on the right.
                if (s.ballX <= PADDLE_W + 14 && s.ballY + BALL_SIZE >= s.playerY && s.ballY <= s.playerY + PADDLE_H && s.ballVX < 0) {
                    s.ballVX *= -1.05;
                    s.ballVY += (s.ballY - (s.playerY + PADDLE_H / 2)) * 0.1;
                }
                if (s.ballX >= w - PADDLE_W - 14 - BALL_SIZE && s.ballY + BALL_SIZE >= s.aiY && s.ballY <= s.aiY + PADDLE_H && s.ballVX > 0) {
                    s.ballVX *= -1.05;
                    s.ballVY += (s.ballY - (s.aiY + PADDLE_H / 2)) * 0.1;
                }

                if (s.ballX < 0) {
                    s.aiScore++;
                    setScores({ player: s.playerScore, ai: s.aiScore });
                    if (s.aiScore >= WIN_SCORE) { setGameOver('AI Wins'); runningRef.current = false; }
                    else resetBall(1);
                } else if (s.ballX > w) {
                    s.playerScore++;
                    setScores({ player: s.playerScore, ai: s.aiScore });
                    if (s.playerScore >= WIN_SCORE) { setGameOver('You Win!'); runningRef.current = false; }
                    else resetBall(-1);
                }
            }

            ctx.fillStyle = '#050608';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.setLineDash([6, 8]);
            ctx.beginPath();
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w / 2, h);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#39ff88';
            ctx.fillRect(14, s.playerY, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(w - 14 - PADDLE_W, s.aiY, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(s.ballX, s.ballY, BALL_SIZE, BALL_SIZE);

            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top - PADDLE_H / 2;
        stateRef.current.playerY = Math.max(0, Math.min(sizeRef.current.h - PADDLE_H, y));
    };

    const handleRestart = () => {
        const s = stateRef.current;
        s.playerScore = 0;
        s.aiScore = 0;
        setScores({ player: 0, ai: 0 });
        setGameOver(null);
        runningRef.current = true;
        resetBall(1);
    };

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Pong - Classic Arcade Game" />
            <ServicePageHero
                icon={SportsEsports}
                title="Pong"
                subtitle="The original arcade classic. Move your mouse or finger up and down to control the left paddle — first to 7 wins."
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3
            }}>
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 6, mb: 2 }}>
                        <Typography variant="h4" fontWeight={900} color="primary.main">{scores.player}</Typography>
                        <Typography variant="h4" fontWeight={900} sx={{ color: '#00e5ff' }}>{scores.ai}</Typography>
                    </Box>

                    <Box
                        ref={containerRef}
                        sx={{
                            width: '100%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            bgcolor: '#050608',
                            border: '1px solid rgba(255,255,255,0.08)',
                            mb: 3,
                            position: 'relative',
                            touchAction: 'none',
                        }}
                    >
                        <canvas ref={canvasRef} onPointerMove={handlePointerMove} style={{ display: 'block', cursor: 'none' }} />
                        {gameOver && (
                            <Box sx={{
                                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.75)',
                            }}>
                                <Typography variant="h4" fontWeight={900} sx={{ mb: 2 }}>{gameOver}</Typography>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleRestart}>
                            Restart
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Pong;
