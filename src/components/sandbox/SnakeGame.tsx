import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Typography, Button, IconButton, useTheme } from '@mui/material';
import {
    VideogameAsset,
    KeyboardArrowUp,
    KeyboardArrowDown,
    KeyboardArrowLeft,
    KeyboardArrowRight,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const GRID_SIZE = 20;
const CELL_SIZE = 18; // px, canvas = GRID_SIZE * CELL_SIZE
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const BASE_SPEED_MS = 140;
const MIN_SPEED_MS = 70; // cap so it doesn't become unplayable
const SPEED_STEP_MS = 4; // ms removed per food eaten
const BEST_SCORE_KEY = 'sandbox_snake_best';

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const OPPOSITE: Record<Direction, Direction> = {
    UP: 'DOWN',
    DOWN: 'UP',
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
};

const DIRECTION_VECTORS: Record<Direction, Point> = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
};

const getInitialSnake = (): Point[] => {
    const cy = Math.floor(GRID_SIZE / 2);
    const cx = Math.floor(GRID_SIZE / 2);
    // Body laid out horizontally, head at index 0 (rightmost)
    return [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
    ];
};

const randomEmptyCell = (occupied: Point[]): Point => {
    const occupiedSet = new Set(occupied.map((p) => `${p.x},${p.y}`));
    const freeCells: Point[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (!occupiedSet.has(`${x},${y}`)) freeCells.push({ x, y });
        }
    }
    if (freeCells.length === 0) return { x: 0, y: 0 };
    return freeCells[Math.floor(Math.random() * freeCells.length)];
};

const readBestScore = (): number => {
    try {
        const raw = localStorage.getItem(BEST_SCORE_KEY);
        const parsed = raw ? parseInt(raw, 10) : 0;
        return Number.isFinite(parsed) ? parsed : 0;
    } catch {
        return 0;
    }
};

const writeBestScore = (value: number) => {
    try {
        localStorage.setItem(BEST_SCORE_KEY, String(value));
    } catch {
        // ignore storage errors (private mode, quota, etc.)
    }
};

const SnakeGame: React.FC = () => {
    const theme = useTheme();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [snake, setSnake] = useState<Point[]>(getInitialSnake);
    const [food, setFood] = useState<Point>(() => randomEmptyCell(getInitialSnake()));
    const [direction, setDirection] = useState<Direction>('RIGHT');
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState<number>(readBestScore);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isRunning, setIsRunning] = useState(true);

    // Refs to avoid stale closures inside the interval / keydown handler.
    const directionRef = useRef<Direction>('RIGHT');
    const nextDirectionRef = useRef<Direction>('RIGHT');
    const snakeRef = useRef<Point[]>(snake);
    const foodRef = useRef<Point>(food);
    const isGameOverRef = useRef(false);

    useEffect(() => { snakeRef.current = snake; }, [snake]);
    useEffect(() => { foodRef.current = food; }, [food]);
    useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);

    const requestDirection = useCallback((dir: Direction) => {
        if (isGameOverRef.current) return;
        // Prevent reversing directly into the snake's own body.
        if (OPPOSITE[dir] === directionRef.current) return;
        nextDirectionRef.current = dir;
    }, []);

    const resetGame = useCallback(() => {
        const initialSnake = getInitialSnake();
        setSnake(initialSnake);
        setFood(randomEmptyCell(initialSnake));
        setDirection('RIGHT');
        directionRef.current = 'RIGHT';
        nextDirectionRef.current = 'RIGHT';
        setScore(0);
        setIsGameOver(false);
        setIsRunning(true);
    }, []);

    // Main game tick: advances the snake by one cell using current refs.
    const tick = useCallback(() => {
        if (isGameOverRef.current) return;

        directionRef.current = nextDirectionRef.current;
        const dir = directionRef.current;
        const vector = DIRECTION_VECTORS[dir];
        const currentSnake = snakeRef.current;
        const head = currentSnake[0];
        const newHead: Point = { x: head.x + vector.x, y: head.y + vector.y };

        // Wall collision - no wraparound.
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            setIsGameOver(true);
            setIsRunning(false);
            return;
        }

        // Self collision. Note: if the new head lands exactly on the current tail
        // cell, that tail cell is about to move away (unless food was just eaten),
        // so we must exclude the tail when food is not eaten this step.
        const willEatFood = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;
        const bodyToCheck = willEatFood ? currentSnake : currentSnake.slice(0, -1);
        const hitsSelf = bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y);
        if (hitsSelf) {
            setIsGameOver(true);
            setIsRunning(false);
            return;
        }

        let newSnake: Point[];
        if (willEatFood) {
            newSnake = [newHead, ...currentSnake];
            const nextFood = randomEmptyCell(newSnake);
            setFood(nextFood);
            setScore((s) => {
                const newScore = s + 1;
                return newScore;
            });
        } else {
            newSnake = [newHead, ...currentSnake.slice(0, -1)];
        }

        setSnake(newSnake);
    }, []);

    // Game loop interval - speed increases (interval shrinks) with score, capped at MIN_SPEED_MS.
    useEffect(() => {
        if (!isRunning || isGameOver) return undefined;
        const speed = Math.max(MIN_SPEED_MS, BASE_SPEED_MS - score * SPEED_STEP_MS);
        const intervalId = window.setInterval(tick, speed);
        return () => window.clearInterval(intervalId);
    }, [isRunning, isGameOver, score, tick]);

    // Update best score whenever the live score beats it.
    useEffect(() => {
        if (score > bestScore) {
            setBestScore(score);
            writeBestScore(score);
        }
    }, [score, bestScore]);

    // Keyboard controls: arrow keys + WASD.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    requestDirection('UP');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    requestDirection('DOWN');
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    requestDirection('LEFT');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    requestDirection('RIGHT');
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [requestDirection]);

    // Canvas rendering - redraws whenever snake/food/theme changes.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const primary = theme.palette.primary.main;
        const secondary = theme.palette.secondary.main;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Subtle grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let i = 1; i < GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
            ctx.stroke();
        }

        // Food
        ctx.fillStyle = secondary;
        const foodPad = 2;
        ctx.beginPath();
        ctx.roundRect(
            food.x * CELL_SIZE + foodPad,
            food.y * CELL_SIZE + foodPad,
            CELL_SIZE - foodPad * 2,
            CELL_SIZE - foodPad * 2,
            4
        );
        ctx.fill();

        // Snake
        snake.forEach((segment, idx) => {
            ctx.fillStyle = idx === 0 ? primary : primary;
            ctx.globalAlpha = idx === 0 ? 1 : 0.75;
            const pad = 1.5;
            ctx.beginPath();
            ctx.roundRect(
                segment.x * CELL_SIZE + pad,
                segment.y * CELL_SIZE + pad,
                CELL_SIZE - pad * 2,
                CELL_SIZE - pad * 2,
                3
            );
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }, [snake, food, theme]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo title="Play Snake Online - Free Browser Game" gameId={1} />
            <ServicePageHero
                icon={VideogameAsset}
                title="Snake"
                subtitle="The classic snake game, right in your browser. Use the arrow keys or WASD to steer - eat food, grow longer, and avoid crashing into yourself or the walls."
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3
            }}>
                <CardContent sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: CANVAS_SIZE, mb: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            Score: {score}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                            Best: {bestScore}
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            position: 'relative',
                            width: CANVAS_SIZE,
                            height: CANVAS_SIZE,
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_SIZE}
                            height={CANVAS_SIZE}
                            style={{ display: 'block' }}
                        />
                        {isGameOver && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    bgcolor: 'rgba(0,0,0,0.7)',
                                }}
                            >
                                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                    Game Over
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Final score: {score}
                                </Typography>
                                <Button variant="contained" onClick={resetGame}>
                                    Play Again
                                </Button>
                            </Box>
                        )}
                    </Box>

                    {/* Touch / click controls for mobile or no-keyboard environments */}
                    <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gridTemplateRows: 'repeat(3, 48px)', gap: 0.5 }}>
                        <Box />
                        <IconButton
                            aria-label="Move up"
                            onClick={() => requestDirection('UP')}
                            sx={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <KeyboardArrowUp />
                        </IconButton>
                        <Box />

                        <IconButton
                            aria-label="Move left"
                            onClick={() => requestDirection('LEFT')}
                            sx={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <KeyboardArrowLeft />
                        </IconButton>
                        <Box />
                        <IconButton
                            aria-label="Move right"
                            onClick={() => requestDirection('RIGHT')}
                            sx={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <KeyboardArrowRight />
                        </IconButton>

                        <Box />
                        <IconButton
                            aria-label="Move down"
                            onClick={() => requestDirection('DOWN')}
                            sx={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <KeyboardArrowDown />
                        </IconButton>
                        <Box />
                    </Box>

                    {!isGameOver && (
                        <Button sx={{ mt: 3 }} variant="outlined" onClick={resetGame}>
                            Restart
                        </Button>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default SnakeGame;
