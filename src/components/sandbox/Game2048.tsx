import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Typography, Button, useTheme, alpha } from '@mui/material';
import { Apps } from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const GRID_SIZE = 4;
const BEST_SCORE_KEY = 'sandbox_2048_best';
const WIN_VALUE = 2048;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Tile {
    id: number;
    value: number;
    row: number;
    col: number;
    isNew?: boolean;
    isMerged?: boolean;
}

let tileIdCounter = 1;
const nextTileId = (): number => tileIdCounter++;

type Board = (Tile | null)[][];

const createEmptyBoard = (): Board =>
    Array.from({ length: GRID_SIZE }, () => Array<Tile | null>(GRID_SIZE).fill(null));

const cloneBoardShallow = (board: Board): Board => board.map((row) => row.slice());

const getEmptyCells = (board: Board): Array<{ row: number; col: number }> => {
    const cells: Array<{ row: number; col: number }> = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!board[r][c]) cells.push({ row: r, col: c });
        }
    }
    return cells;
};

/** Spawns a new tile (90% a "2", 10% a "4") in a random empty cell. Mutates a clone, returns it. */
const spawnRandomTile = (board: Board): Board => {
    const next = cloneBoardShallow(board);
    const empties = getEmptyCells(next);
    if (empties.length === 0) return next;
    const { row, col } = empties[Math.floor(Math.random() * empties.length)];
    next[row][col] = {
        id: nextTileId(),
        value: Math.random() < 0.9 ? 2 : 4,
        row,
        col,
        isNew: true,
    };
    return next;
};

const createInitialBoard = (): Board => {
    let board = createEmptyBoard();
    board = spawnRandomTile(board);
    board = spawnRandomTile(board);
    return board;
};

/**
 * Slides + merges a single line (array of tiles, possibly with nulls, ordered from
 * "near" to "far" relative to the move direction) using the standard 2048 algorithm:
 * compact non-null tiles, then merge adjacent equal values pairwise (each tile merges
 * at most once), then re-compact. Returns the new line (length GRID_SIZE), whether
 * anything changed, and the score gained from merges in this line.
 */
const collapseLine = (line: Array<Tile | null>): { line: Array<Tile | null>; changed: boolean; scoreGained: number } => {
    const compacted = line.filter((t): t is Tile => t !== null);
    const merged: Tile[] = [];
    let scoreGained = 0;
    let i = 0;
    while (i < compacted.length) {
        const current = compacted[i];
        const nextTile = compacted[i + 1];
        if (nextTile && nextTile.value === current.value) {
            const mergedValue = current.value * 2;
            merged.push({
                id: nextTileId(),
                value: mergedValue,
                row: current.row,
                col: current.col,
                isMerged: true,
            });
            scoreGained += mergedValue;
            i += 2;
        } else {
            merged.push({ ...current, isMerged: false, isNew: false });
            i += 1;
        }
    }
    const resultLine: Array<Tile | null> = [...merged, ...Array<null>(GRID_SIZE - merged.length).fill(null)];

    // Determine if line changed: compare original (positions/values) vs collapsed result
    // by checking the sequence of values that remain (ignoring nulls/positions for "changed"
    // purposes is incorrect - we need positional comparison against the ORIGINAL line).
    let changed = false;
    for (let idx = 0; idx < GRID_SIZE; idx++) {
        const original = line[idx];
        const updated = resultLine[idx];
        if (original?.value !== updated?.value) {
            changed = true;
            break;
        }
    }
    return { line: resultLine, changed, scoreGained };
};

/** Extracts a line of tiles from the board in the order they should slide (index 0 = closest to the target edge). */
const extractLine = (board: Board, direction: Direction, index: number): Array<Tile | null> => {
    const line: Array<Tile | null> = [];
    for (let k = 0; k < GRID_SIZE; k++) {
        if (direction === 'LEFT') line.push(board[index][k]);
        else if (direction === 'RIGHT') line.push(board[index][GRID_SIZE - 1 - k]);
        else if (direction === 'UP') line.push(board[k][index]);
        else line.push(board[GRID_SIZE - 1 - k][index]); // DOWN
    }
    return line;
};

/** Writes a collapsed line back into the board, assigning correct row/col to each tile. */
const writeLine = (board: Board, direction: Direction, index: number, line: Array<Tile | null>): void => {
    for (let k = 0; k < GRID_SIZE; k++) {
        let row: number;
        let col: number;
        if (direction === 'LEFT') { row = index; col = k; }
        else if (direction === 'RIGHT') { row = index; col = GRID_SIZE - 1 - k; }
        else if (direction === 'UP') { row = k; col = index; }
        else { row = GRID_SIZE - 1 - k; col = index; } // DOWN

        const tile = line[k];
        if (tile) {
            board[row][col] = { ...tile, row, col };
        } else {
            board[row][col] = null;
        }
    }
};

/** Applies a move in the given direction across the whole board. Returns the new board, whether it changed, and score gained. */
const move = (board: Board, direction: Direction): { board: Board; changed: boolean; scoreGained: number } => {
    const next = createEmptyBoard();
    let anyChanged = false;
    let totalScore = 0;

    for (let index = 0; index < GRID_SIZE; index++) {
        const line = extractLine(board, direction, index);
        const { line: collapsed, changed, scoreGained } = collapseLine(line);
        if (changed) anyChanged = true;
        totalScore += scoreGained;
        writeLine(next, direction, index, collapsed);
    }

    return { board: next, changed: anyChanged, scoreGained: totalScore };
};

/** A move is possible if applying it in a "dry run" (without spawning) would change the board. */
const canMove = (board: Board): boolean => {
    const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    return directions.some((dir) => move(board, dir).changed);
};

const hasReachedWinValue = (board: Board): boolean =>
    board.some((row) => row.some((tile) => tile && tile.value >= WIN_VALUE));

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
        // ignore storage errors
    }
};

const flattenTiles = (board: Board): Tile[] => {
    const tiles: Tile[] = [];
    board.forEach((row) => row.forEach((tile) => { if (tile) tiles.push(tile); }));
    return tiles;
};

const tileColors: Record<number, { bg: string; color: string }> = {};

const Game2048: React.FC = () => {
    const theme = useTheme();
    const [board, setBoard] = useState<Board>(createInitialBoard);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState<number>(readBestScore);
    const [hasWon, setHasWon] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);

    const boardRef = useRef(board);
    const isGameOverRef = useRef(false);
    const isAnimatingRef = useRef(false);

    useEffect(() => { boardRef.current = board; }, [board]);
    useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);

    const resetGame = useCallback(() => {
        const initial = createInitialBoard();
        setBoard(initial);
        boardRef.current = initial;
        setScore(0);
        setHasWon(false);
        setIsGameOver(false);
        isAnimatingRef.current = false;
    }, []);

    const performMove = useCallback((direction: Direction) => {
        if (isGameOverRef.current || isAnimatingRef.current) return;
        const current = boardRef.current;
        const { board: movedBoard, changed, scoreGained } = move(current, direction);
        if (!changed) return;

        isAnimatingRef.current = true;
        const boardWithSpawn = spawnRandomTile(movedBoard);

        setBoard(boardWithSpawn);
        boardRef.current = boardWithSpawn;
        setScore((s) => s + scoreGained);

        if (hasReachedWinValue(boardWithSpawn)) {
            setHasWon(true);
        }
        if (!canMove(boardWithSpawn) && getEmptyCells(boardWithSpawn).length === 0) {
            setIsGameOver(true);
        }

        // Small debounce so rapid key repeats don't double-process the same move
        // before state has flushed.
        window.setTimeout(() => {
            isAnimatingRef.current = false;
        }, 80);
    }, []);

    useEffect(() => {
        if (score > bestScore) {
            setBestScore(score);
            writeBestScore(score);
        }
    }, [score, bestScore]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    performMove('UP');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    performMove('DOWN');
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    performMove('LEFT');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    performMove('RIGHT');
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [performMove]);

    // Basic touch-swipe support for mobile, since arrow keys aren't available there.
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        const start = touchStartRef.current;
        if (!start) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const threshold = 20;
        if (Math.max(absDx, absDy) < threshold) return;
        if (absDx > absDy) {
            performMove(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
            performMove(dy > 0 ? 'DOWN' : 'UP');
        }
        touchStartRef.current = null;
    };

    const getTileColor = (value: number): { bg: string; color: string } => {
        if (tileColors[value]) return tileColors[value];
        const primary = theme.palette.primary.main;
        const secondary = theme.palette.secondary.main;
        // Interpolate intensity by log2(value): low values use translucent neutrals,
        // higher values lean into the theme's primary/secondary colors.
        const power = Math.log2(value);
        let result: { bg: string; color: string };
        if (value <= 4) {
            result = { bg: 'rgba(255,255,255,0.10)', color: theme.palette.text.primary };
        } else if (power <= 6) {
            const t = (power - 2) / 4; // 0..1 across 8..64
            result = { bg: alpha(primary, 0.18 + t * 0.35), color: '#fff' };
        } else {
            const t = Math.min(1, (power - 6) / 5); // across 128..2048+
            result = { bg: alpha(secondary, 0.35 + t * 0.55), color: '#fff' };
        }
        tileColors[value] = result;
        return result;
    };

    const tiles = flattenTiles(board);
    const cellGapPx = 8;
    const cellSizePx = 76;
    const boardSizePx = cellSizePx * GRID_SIZE + cellGapPx * (GRID_SIZE + 1);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo title="Play 2048 Online - Free Browser Puzzle Game" />
            <ServicePageHero
                icon={Apps}
                title="2048"
                subtitle="Slide tiles with the arrow keys to merge matching numbers. Reach 2048 to win - but keep playing for an even higher score."
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: boardSizePx, mb: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            Score: {score}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                            Best: {bestScore}
                        </Typography>
                    </Box>

                    {hasWon && !isGameOver && (
                        <Box sx={{
                            width: '100%',
                            maxWidth: boardSizePx,
                            mb: 2,
                            p: 1.25,
                            borderRadius: '10px',
                            textAlign: 'center',
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                        }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                You reached 2048! Keep playing for a higher score.
                            </Typography>
                        </Box>
                    )}

                    <Box
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        sx={{
                            position: 'relative',
                            width: boardSizePx,
                            height: boardSizePx,
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            bgcolor: 'rgba(0,0,0,0.35)',
                            touchAction: 'none',
                        }}
                    >
                        {/* Background grid cells */}
                        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                            const r = Math.floor(idx / GRID_SIZE);
                            const c = idx % GRID_SIZE;
                            return (
                                <Box
                                    key={`bg-${r}-${c}`}
                                    sx={{
                                        position: 'absolute',
                                        top: cellGapPx + r * (cellSizePx + cellGapPx),
                                        left: cellGapPx + c * (cellSizePx + cellGapPx),
                                        width: cellSizePx,
                                        height: cellSizePx,
                                        borderRadius: '8px',
                                        bgcolor: 'rgba(255,255,255,0.04)',
                                    }}
                                />
                            );
                        })}

                        <AnimatePresence>
                            {tiles.map((tile) => {
                                const { bg, color } = getTileColor(tile.value);
                                const top = cellGapPx + tile.row * (cellSizePx + cellGapPx);
                                const left = cellGapPx + tile.col * (cellSizePx + cellGapPx);
                                const fontSize = tile.value >= 1024 ? '1.3rem' : tile.value >= 128 ? '1.5rem' : '1.75rem';
                                return (
                                    <motion.div
                                        key={tile.id}
                                        initial={tile.isNew ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                                        animate={{
                                            scale: tile.isMerged ? [1, 1.15, 1] : 1,
                                            opacity: 1,
                                            top,
                                            left,
                                        }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ duration: 0.15, ease: 'easeOut' }}
                                        style={{
                                            position: 'absolute',
                                            width: cellSizePx,
                                            height: cellSizePx,
                                            borderRadius: 8,
                                            background: bg,
                                            color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize,
                                        }}
                                    >
                                        {tile.value}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

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
                                    bgcolor: 'rgba(0,0,0,0.75)',
                                    borderRadius: '12px',
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

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                        Use arrow keys or WASD (or swipe on mobile) to move.
                    </Typography>

                    <Button sx={{ mt: 2 }} variant="outlined" onClick={resetGame}>
                        New Game
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Game2048;
