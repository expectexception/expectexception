import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, IconButton, Stack, Typography, useTheme } from '@mui/material';
import {
    ViewModule,
    KeyboardArrowLeft,
    KeyboardArrowRight,
    KeyboardArrowDown,
    KeyboardDoubleArrowDown,
    RotateRight,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

const BEST_KEY = 'sandbox_tetris_best_score';

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type Cell = PieceType | null;
type GameStatus = 'idle' | 'playing' | 'gameover';

interface ActivePiece {
    type: PieceType;
    matrix: number[][];
    row: number;
    col: number;
}

interface GameRefState {
    board: Cell[][];
    current: ActivePiece;
    status: GameStatus;
    score: number;
    level: number;
    lines: number;
    lastDropTime: number;
}

const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const CELL = 28;
const W = BOARD_COLS * CELL;
const H = BOARD_ROWS * CELL;
const PREVIEW_GRID = 4;
const PREVIEW_CELL = 16;

const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const SHAPE_MATRICES: Record<PieceType, number[][]> = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    O: [
        [1, 1],
        [1, 1],
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
    ],
};

// Fixed neon palette (matches the vivid look already used by Breakout/FlappyBlocks)
// rather than theme colors - the pieces need to stay visually distinct from one another
// regardless of which MUI theme/color mode is active.
const PIECE_COLORS: Record<PieceType, string> = {
    I: '#00e5ff',
    O: '#ffd60a',
    T: '#b967ff',
    S: '#39ff88',
    Z: '#ff4d4d',
    J: '#4d79ff',
    L: '#ff9f40',
};

const LINE_SCORES = [0, 100, 300, 500, 800];

const createEmptyBoard = (): Cell[][] =>
    Array.from({ length: BOARD_ROWS }, () => Array<Cell>(BOARD_COLS).fill(null));

const spawnPiece = (type: PieceType): ActivePiece => {
    const matrix = SHAPE_MATRICES[type].map((row) => [...row]);
    const col = Math.floor((BOARD_COLS - matrix[0].length) / 2);
    return { type, matrix, row: 0, col };
};

const rotateMatrixCW = (matrix: number[][]): number[][] => {
    const size = matrix.length;
    const result: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            result[c][size - 1 - r] = matrix[r][c];
        }
    }
    return result;
};

const isValidPosition = (matrix: number[][], row: number, col: number, board: Cell[][]): boolean => {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (!matrix[r][c]) continue;
            const boardRow = row + r;
            const boardCol = col + c;
            if (boardCol < 0 || boardCol >= BOARD_COLS || boardRow >= BOARD_ROWS) return false;
            if (boardRow < 0) continue;
            if (board[boardRow][boardCol]) return false;
        }
    }
    return true;
};

const getGhostRow = (piece: ActivePiece, board: Cell[][]): number => {
    let row = piece.row;
    while (isValidPosition(piece.matrix, row + 1, piece.col, board)) row += 1;
    return row;
};

const clearLines = (board: Cell[][]): { board: Cell[][]; cleared: number } => {
    const remaining = board.filter((row) => row.some((cell) => cell === null));
    const cleared = BOARD_ROWS - remaining.length;
    const newRows: Cell[][] = Array.from({ length: cleared }, () => Array<Cell>(BOARD_COLS).fill(null));
    return { board: [...newRows, ...remaining], cleared };
};

const getDropInterval = (level: number): number => Math.max(120, 1000 - (level - 1) * 80);

const shuffleBag = (): PieceType[] => {
    const bag = [...PIECE_TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
};

const getPreviewCells = (type: PieceType): boolean[][] => {
    const shape = SHAPE_MATRICES[type];
    const size = shape.length;
    const offset = Math.floor((PREVIEW_GRID - size) / 2);
    const grid = Array.from({ length: PREVIEW_GRID }, () => Array<boolean>(PREVIEW_GRID).fill(false));
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (shape[r][c]) grid[r + offset][c + offset] = true;
        }
    }
    return grid;
};

const drawCell = (ctx: CanvasRenderingContext2D, col: number, row: number, color: string) => {
    if (row < 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2);
};

const loadBest = (): number => {
    try {
        const n = Number(localStorage.getItem(BEST_KEY));
        return Number.isFinite(n) ? n : 0;
    } catch {
        return 0;
    }
};

/** Classic Tetris: 10x20 board, the 7 standard tetrominoes with a simple
 * rotate-the-matrix-90-degrees rotation system (plus a small wall-kick nudge),
 * gravity that speeds up with level, and guideline-ish line-clear scoring.
 * Game state lives in a ref (like Breakout/FlappyBlocks) and is redrawn to
 * canvas every animation frame; only score/level/lines/status are mirrored
 * into React state for the UI chrome around the board. */
const Tetris: React.FC = () => {
    const theme = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const queueRef = useRef<PieceType[]>([]);
    const nextTypeRef = useRef<PieceType>('I');
    const holdTimerRef = useRef<number | null>(null);

    const gameRef = useRef<GameRefState>({
        board: createEmptyBoard(),
        current: spawnPiece('T'),
        status: 'idle',
        score: 0,
        level: 1,
        lines: 0,
        lastDropTime: 0,
    });

    const [status, setStatus] = useState<GameStatus>('idle');
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [lines, setLines] = useState(0);
    const [best, setBest] = useState<number>(() => loadBest());
    const [nextType, setNextType] = useState<PieceType>('I');

    const ensureQueue = () => {
        while (queueRef.current.length < 2) {
            queueRef.current.push(...shuffleBag());
        }
    };

    const popPiece = (): PieceType => {
        ensureQueue();
        const type = queueRef.current.shift() as PieceType;
        ensureQueue();
        return type;
    };

    const draw = useCallback((ctx: CanvasRenderingContext2D) => {
        const g = gameRef.current;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let c = 0; c <= BOARD_COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CELL, 0);
            ctx.lineTo(c * CELL, H);
            ctx.stroke();
        }
        for (let r = 0; r <= BOARD_ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CELL);
            ctx.lineTo(W, r * CELL);
            ctx.stroke();
        }

        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const cell = g.board[r][c];
                if (cell) drawCell(ctx, c, r, PIECE_COLORS[cell]);
            }
        }

        if (g.status === 'playing') {
            const ghostRow = getGhostRow(g.current, g.board);
            ctx.globalAlpha = 0.25;
            g.current.matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val) drawCell(ctx, g.current.col + c, ghostRow + r, PIECE_COLORS[g.current.type]);
                });
            });
            ctx.globalAlpha = 1;

            g.current.matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val) drawCell(ctx, g.current.col + c, g.current.row + r, PIECE_COLORS[g.current.type]);
                });
            });
        }
    }, []);

    const endGame = useCallback(() => {
        const g = gameRef.current;
        g.status = 'gameover';
        setStatus('gameover');
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        setBest((prevBest) => {
            if (g.score <= prevBest) return prevBest;
            try {
                localStorage.setItem(BEST_KEY, String(g.score));
            } catch {
                // ignore storage errors
            }
            return g.score;
        });
    }, []);

    const lockActivePiece = useCallback(() => {
        const g = gameRef.current;
        const { current } = g;

        current.matrix.forEach((row, r) => {
            row.forEach((val, c) => {
                if (!val) return;
                const boardRow = current.row + r;
                const boardCol = current.col + c;
                if (boardRow >= 0 && boardRow < BOARD_ROWS && boardCol >= 0 && boardCol < BOARD_COLS) {
                    g.board[boardRow][boardCol] = current.type;
                }
            });
        });

        const { board: clearedBoard, cleared } = clearLines(g.board);
        g.board = clearedBoard;

        if (cleared > 0) {
            g.lines += cleared;
            g.level = Math.floor(g.lines / 10) + 1;
            g.score += LINE_SCORES[cleared] * g.level;
            setLines(g.lines);
            setLevel(g.level);
            setScore(g.score);
        }

        const spawned = spawnPiece(nextTypeRef.current);
        g.current = spawned;
        const upcoming = popPiece();
        nextTypeRef.current = upcoming;
        setNextType(upcoming);

        if (!isValidPosition(spawned.matrix, spawned.row, spawned.col, g.board)) {
            endGame();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endGame]);

    const loop = useCallback((time: number) => {
        const g = gameRef.current;
        if (g.status === 'playing') {
            if (time - g.lastDropTime > getDropInterval(g.level)) {
                g.lastDropTime = time;
                if (isValidPosition(g.current.matrix, g.current.row + 1, g.current.col, g.board)) {
                    g.current.row += 1;
                } else {
                    lockActivePiece();
                }
            }
        }

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) draw(ctx);

        if (g.status === 'playing') {
            rafRef.current = requestAnimationFrame(loop);
        }
    }, [draw, lockActivePiece]);

    const start = useCallback(() => {
        queueRef.current = [];
        const firstType = popPiece();
        const upcoming = popPiece();
        nextTypeRef.current = upcoming;
        setNextType(upcoming);

        gameRef.current = {
            board: createEmptyBoard(),
            current: spawnPiece(firstType),
            status: 'playing',
            score: 0,
            level: 1,
            lines: 0,
            lastDropTime: performance.now(),
        };

        setScore(0);
        setLevel(1);
        setLines(0);
        setStatus('playing');

        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(loop);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loop]);

    const moveHorizontal = useCallback((dir: number) => {
        const g = gameRef.current;
        if (g.status !== 'playing') return;
        const { current, board } = g;
        if (isValidPosition(current.matrix, current.row, current.col + dir, board)) {
            current.col += dir;
        }
    }, []);

    const rotatePiece = useCallback(() => {
        const g = gameRef.current;
        if (g.status !== 'playing') return;
        const { current, board } = g;
        if (current.type === 'O') return;
        const rotated = rotateMatrixCW(current.matrix);
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
            if (isValidPosition(rotated, current.row, current.col + kick, board)) {
                current.matrix = rotated;
                current.col += kick;
                return;
            }
        }
    }, []);

    const softDrop = useCallback(() => {
        const g = gameRef.current;
        if (g.status !== 'playing') return;
        const { current, board } = g;
        if (isValidPosition(current.matrix, current.row + 1, current.col, board)) {
            current.row += 1;
            g.score += 1;
            g.lastDropTime = performance.now();
            setScore(g.score);
        } else {
            lockActivePiece();
        }
    }, [lockActivePiece]);

    const hardDrop = useCallback(() => {
        const g = gameRef.current;
        if (g.status !== 'playing') return;
        const { current, board } = g;
        let dropped = 0;
        while (isValidPosition(current.matrix, current.row + 1, current.col, board)) {
            current.row += 1;
            dropped += 1;
        }
        if (dropped > 0) {
            g.score += dropped * 2;
            setScore(g.score);
        }
        lockActivePiece();
    }, [lockActivePiece]);

    // Initial idle draw + cleanup of any pending animation frame on unmount.
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) draw(ctx);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [draw]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (gameRef.current.status !== 'playing') return;
            switch (e.code) {
                case 'ArrowLeft':
                    e.preventDefault();
                    moveHorizontal(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    moveHorizontal(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    rotatePiece();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    softDrop();
                    break;
                case 'Space':
                    e.preventDefault();
                    hardDrop();
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [moveHorizontal, rotatePiece, softDrop, hardDrop]);

    const stopHold = useCallback(() => {
        if (holdTimerRef.current !== null) {
            window.clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    const startHold = useCallback((action: () => void) => {
        action();
        stopHold();
        holdTimerRef.current = window.setInterval(action, 110);
    }, [stopHold]);

    useEffect(() => () => stopHold(), [stopHold]);

    const isPlaying = status === 'playing';
    const previewCells = getPreviewCells(nextType);

    const cardRef = useRef<HTMLDivElement | null>(null);

    const handleStartClick = () => {
        start();
        if (cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const controllerDock = (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Stack direction="row" spacing={1.5} justifyContent="center">
                <IconButton
                    aria-label="Move left"
                    disabled={!isPlaying}
                    onPointerDown={() => startHold(() => moveHorizontal(-1))}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    sx={{
                        minWidth: 56, minHeight: 56,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        borderRadius: '14px',
                        color: '#ffffff',
                        touchAction: 'none',
                        '&:active': { bgcolor: theme.palette.primary.main, color: '#000000' }
                    }}
                >
                    <KeyboardArrowLeft fontSize="large" />
                </IconButton>
                <IconButton
                    aria-label="Rotate piece"
                    disabled={!isPlaying}
                    onClick={rotatePiece}
                    sx={{
                        minWidth: 56, minHeight: 56,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        borderRadius: '14px',
                        color: '#ffffff',
                        '&:active': { bgcolor: theme.palette.secondary.main, color: '#000000' }
                    }}
                >
                    <RotateRight fontSize="large" />
                </IconButton>
                <IconButton
                    aria-label="Move right"
                    disabled={!isPlaying}
                    onPointerDown={() => startHold(() => moveHorizontal(1))}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    sx={{
                        minWidth: 56, minHeight: 56,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        borderRadius: '14px',
                        color: '#ffffff',
                        touchAction: 'none',
                        '&:active': { bgcolor: theme.palette.primary.main, color: '#000000' }
                    }}
                >
                    <KeyboardArrowRight fontSize="large" />
                </IconButton>
            </Stack>
            <Stack direction="row" spacing={1.5} justifyContent="center">
                <IconButton
                    aria-label="Soft drop"
                    disabled={!isPlaying}
                    onPointerDown={() => startHold(softDrop)}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    sx={{
                        minWidth: 56, minHeight: 56,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        borderRadius: '14px',
                        color: '#ffffff',
                        touchAction: 'none',
                        '&:active': { bgcolor: theme.palette.warning.main, color: '#000000' }
                    }}
                >
                    <KeyboardArrowDown fontSize="large" />
                </IconButton>
                <IconButton
                    aria-label="Hard drop"
                    disabled={!isPlaying}
                    onClick={hardDrop}
                    sx={{
                        minWidth: 56, minHeight: 56,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        borderRadius: '14px',
                        color: '#ffffff',
                        '&:active': { bgcolor: theme.palette.error.main, color: '#ffffff' }
                    }}
                >
                    <KeyboardDoubleArrowDown fontSize="large" />
                </IconButton>
            </Stack>
        </Box>
    );

    return (
        <>
            <Seo
                gameId={25}
                title="Tetris | Play Classic Block-Stacking Puzzle Online Free"
                keywords={['tetris online', 'tetris game free', 'block stacking game', 'classic arcade puzzle', 'tetromino game', 'falling blocks game']}
            />
            <GamePlayShell
                icon={ViewModule}
                title="Tetris"
                subtitle="Rotate and stack the falling tetrominoes to clear full lines before the board fills up."
                onRestart={handleStartClick}
                controls={controllerDock}
            >
            <Card
                ref={cardRef}
                sx={{
                    background: 'rgba(13, 14, 18, 0.5)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: { xs: '16px', sm: '24px' },
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 1.5, sm: 3 },
                }}
            >
                <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                    <Stack direction="row" flexWrap="wrap" justifyContent="center" spacing={2.5} sx={{ mb: 2 }}>
                        <Typography variant="body1"><strong>Score:</strong> {score}</Typography>
                        <Typography variant="body1" sx={{ color: theme.palette.secondary.main, fontWeight: 700 }}>
                            Level: {level}
                        </Typography>
                        <Typography variant="body1"><strong>Lines:</strong> {lines}</Typography>
                        <Typography variant="body1" color="text.secondary"><strong>Best:</strong> {best}</Typography>
                    </Stack>

                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'center', sm: 'flex-start' },
                        justifyContent: 'center',
                        gap: 2.5,
                    }}>
                        <Box sx={{ position: 'relative', width: W, maxWidth: '100%', mx: 'auto' }}>
                            <canvas
                                ref={canvasRef}
                                width={W}
                                height={H}
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block',
                                    borderRadius: 12,
                                    border: '1px solid rgba(255,255,255,0.12)',
                                }}
                            />

                            <AnimatePresence>
                                {!isPlaying && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeOut' }}
                                        style={{ position: 'absolute', inset: 0 }}
                                    >
                                        <Box sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 2,
                                            bgcolor: 'rgba(0,0,0,0.85)',
                                            backdropFilter: 'blur(8px)',
                                            borderRadius: '12px',
                                            textAlign: 'center',
                                            px: 2,
                                            zIndex: 10
                                        }}>
                                            {status === 'gameover' && (
                                                <>
                                                    <Typography variant="h4" sx={{ fontWeight: 900, color: theme.palette.error.main }}>
                                                        Game Over
                                                    </Typography>
                                                    <Typography variant="body1">Final score: {score}</Typography>
                                                </>
                                            )}
                                            {status === 'idle' && (
                                                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                                    Ready to Play?
                                                </Typography>
                                            )}
                                            <Button variant="contained" onClick={handleStartClick} sx={{ px: 4, py: 1.2, fontWeight: 800, borderRadius: '12px', fontSize: '1rem' }}>
                                                {status === 'idle' ? 'Start Game 🎮' : 'Play Again'}
                                            </Button>
                                        </Box>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, alignItems: 'center', gap: 1.5 }}>
                            <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>NEXT PIECE</Typography>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${PREVIEW_GRID}, ${PREVIEW_CELL}px)`,
                                gridTemplateRows: `repeat(${PREVIEW_GRID}, ${PREVIEW_CELL}px)`,
                                gap: '2px',
                                p: 1,
                                borderRadius: '10px',
                                bgcolor: 'rgba(0,0,0,0.45)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}>
                                {previewCells.flatMap((row, r) => row.map((filled, c) => (
                                    <Box
                                        key={`${r}-${c}`}
                                        sx={{
                                            width: PREVIEW_CELL,
                                            height: PREVIEW_CELL,
                                            borderRadius: '3px',
                                            bgcolor: filled ? PIECE_COLORS[nextType] : 'rgba(255,255,255,0.04)',
                                        }}
                                    />
                                )))}
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'center', mt: 3, width: '100%' }}>
                        {controllerDock}
                    </Box>
                </CardContent>
            </Card>
            </GamePlayShell>
        </>
    );
};

export default Tetris;
