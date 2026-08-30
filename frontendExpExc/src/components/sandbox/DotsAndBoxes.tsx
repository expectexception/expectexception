import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import { BorderAll } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

/* ------------------------------------------------------------------ *
 * Dots and Boxes on a GRID x GRID grid of boxes, meaning (GRID+1) x
 * (GRID+1) dots. A move claims one edge (a horizontal or vertical
 * line between two adjacent dots). Completing the 4th edge of a box
 * scores that box for whoever drew the completing edge, and earns
 * that player another turn immediately (the standard rule that
 * makes the endgame about chains, not just filling in edges).
 * ------------------------------------------------------------------ */

const GRID = 5; // 5x5 boxes = 6x6 dots
const TOTAL_BOXES = GRID * GRID;

type Player = 'you' | 'cpu';

// hKey(row, col): horizontal edge above box (row, col), rows 0..GRID, cols 0..GRID-1
// vKey(row, col): vertical edge left of box (row, col), rows 0..GRID-1, cols 0..GRID
const hKey = (r: number, c: number) => `h-${r}-${c}`;
const vKey = (r: number, c: number) => `v-${r}-${c}`;

interface BoxEdges {
    top: string;
    bottom: string;
    left: string;
    right: string;
}

function boxEdges(row: number, col: number): BoxEdges {
    return {
        top: hKey(row, col),
        bottom: hKey(row + 1, col),
        left: vKey(row, col),
        right: vKey(row, col + 1),
    };
}

function allEdgeKeys(): string[] {
    const keys: string[] = [];
    for (let r = 0; r <= GRID; r++) for (let c = 0; c < GRID; c++) keys.push(hKey(r, c));
    for (let r = 0; r < GRID; r++) for (let c = 0; c <= GRID; c++) keys.push(vKey(r, c));
    return keys;
}
const ALL_EDGE_KEYS = allEdgeKeys();

function boxesCompletedBy(edgeKey: string, drawn: Set<string>): { row: number; col: number }[] {
    const completed: { row: number; col: number }[] = [];
    for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
            const edges = boxEdges(row, col);
            if (![edges.top, edges.bottom, edges.left, edges.right].includes(edgeKey)) continue;
            if (drawn.has(edges.top) && drawn.has(edges.bottom) && drawn.has(edges.left) && drawn.has(edges.right)) {
                completed.push({ row, col });
            }
        }
    }
    return completed;
}

function countBoxSides(row: number, col: number, drawn: Set<string>): number {
    const edges = boxEdges(row, col);
    return [edges.top, edges.bottom, edges.left, edges.right].filter(e => drawn.has(e)).length;
}

/** Heuristic CPU: never draws the 3rd side of a box if a safe move exists
 * elsewhere (a move that completes 0 boxes and creates no box with 3 sides).
 * If forced, prefers completing a box (4th side) over anything else. If no
 * safe move and no free box exists, picks the move that opens the shortest
 * chain, a reasonable stand-in for real chain-counting strategy. */
function pickCpuMove(drawn: Set<string>): string {
    const available = ALL_EDGE_KEYS.filter(k => !drawn.has(k));

    const affectedBoxes = (edgeKey: string): { row: number; col: number }[] => {
        const boxes: { row: number; col: number }[] = [];
        for (let row = 0; row < GRID; row++) {
            for (let col = 0; col < GRID; col++) {
                const edges = boxEdges(row, col);
                if ([edges.top, edges.bottom, edges.left, edges.right].includes(edgeKey)) boxes.push({ row, col });
            }
        }
        return boxes;
    };

    // 1) Complete any box that's currently at 3 sides.
    const completing = available.filter(k => affectedBoxes(k).some(b => countBoxSides(b.row, b.col, drawn) === 3));
    if (completing.length > 0) return completing[Math.floor(Math.random() * completing.length)];

    // 2) Safe moves: drawing this edge leaves no box at exactly 3 sides.
    const safe = available.filter(k => {
        const boxes = affectedBoxes(k);
        return boxes.every(b => countBoxSides(b.row, b.col, drawn) + 1 < 3);
    });
    if (safe.length > 0) return safe[Math.floor(Math.random() * safe.length)];

    // 3) Forced to open a chain: pick the move touching boxes with the
    // fewest existing sides, to concede as little as possible.
    let best = available[0];
    let bestScore = Infinity;
    for (const k of available) {
        const boxes = affectedBoxes(k);
        const score = Math.max(...boxes.map(b => countBoxSides(b.row, b.col, drawn)));
        if (score < bestScore) {
            bestScore = score;
            best = k;
        }
    }
    return best;
}

interface Stats { wins: number; losses: number; ties: number }
const STATS_KEY = 'sandbox_dots_and_boxes_stats';
const DEFAULT_STATS: Stats = { wins: 0, losses: 0, ties: 0 };

const readStats = (): Stats => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return DEFAULT_STATS;
        const parsed = JSON.parse(raw);
        return {
            wins: Number.isFinite(parsed.wins) ? parsed.wins : 0,
            losses: Number.isFinite(parsed.losses) ? parsed.losses : 0,
            ties: Number.isFinite(parsed.ties) ? parsed.ties : 0,
        };
    } catch {
        return DEFAULT_STATS;
    }
};
const writeStats = (s: Stats) => {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};

const DotsAndBoxes: React.FC = () => {
    const theme = useTheme();
    const [drawn, setDrawn] = useState<Set<string>>(new Set());
    const [owner, setOwner] = useState<Map<string, Player>>(new Map()); // box key "r-c" -> owner
    const [turn, setTurn] = useState<Player>('you');
    const [stats, setStats] = useState<Stats>(readStats);
    const [recorded, setRecorded] = useState(false);

    const boxesFilled = owner.size;
    const gameOver = boxesFilled === TOTAL_BOXES;
    const youScore = useMemo(() => Array.from(owner.values()).filter(v => v === 'you').length, [owner]);
    const cpuScore = useMemo(() => Array.from(owner.values()).filter(v => v === 'cpu').length, [owner]);

    const newGame = useCallback(() => {
        setDrawn(new Set());
        setOwner(new Map());
        setTurn('you');
        setRecorded(false);
    }, []);

    const applyMove = useCallback((edgeKey: string, player: Player) => {
        setDrawn(prevDrawn => {
            if (prevDrawn.has(edgeKey)) return prevDrawn;
            const nextDrawn = new Set(prevDrawn);
            nextDrawn.add(edgeKey);

            const completed = boxesCompletedBy(edgeKey, nextDrawn);
            if (completed.length > 0) {
                setOwner(prevOwner => {
                    const nextOwner = new Map(prevOwner);
                    completed.forEach(b => nextOwner.set(`${b.row}-${b.col}`, player));
                    return nextOwner;
                });
                // Same player goes again; turn state unchanged.
            } else {
                setTurn(player === 'you' ? 'cpu' : 'you');
            }
            return nextDrawn;
        });
    }, []);

    const handleEdgeClick = (edgeKey: string) => {
        if (gameOver || turn !== 'you' || drawn.has(edgeKey)) return;
        applyMove(edgeKey, 'you');
    };

    // CPU turn, with a short delay so its moves are visible rather than instant.
    useEffect(() => {
        if (gameOver || turn !== 'cpu') return;
        const timeout = setTimeout(() => {
            const move = pickCpuMove(drawn);
            applyMove(move, 'cpu');
        }, 500);
        return () => clearTimeout(timeout);
    }, [turn, drawn, gameOver, applyMove]);

    useEffect(() => {
        if (!gameOver || recorded) return;
        setRecorded(true);
        setStats(prev => {
            const next: Stats = youScore > cpuScore
                ? { ...prev, wins: prev.wins + 1 }
                : youScore < cpuScore
                    ? { ...prev, losses: prev.losses + 1 }
                    : { ...prev, ties: prev.ties + 1 };
            writeStats(next);
            return next;
        });
    }, [gameOver, recorded, youScore, cpuScore]);

    const CELL = 52;
    const DOT = 10;
    const boardSize = GRID * CELL + DOT;

    let statusText: string;
    if (gameOver) {
        statusText = youScore > cpuScore ? `You win, ${youScore}-${cpuScore}!` : youScore < cpuScore ? `CPU wins, ${cpuScore}-${youScore}.` : `Tied, ${youScore}-${cpuScore}.`;
    } else {
        statusText = turn === 'you' ? 'Your turn — claim an edge' : "CPU's turn…";
    }

    return (
        <>
            <Seo
                title="Dots and Boxes - Play Free Online Against the CPU"
                description="Claim edges on a 5x5 grid, complete boxes to score and go again, and beat the CPU in this classic pen-and-paper game. Play free in your browser, no sign-up."
                keywords={['dots and boxes game', 'dots and boxes online', 'play dots and boxes free', 'squares game online', 'classic paper game online']}
            />
            <GamePlayShell
                icon={BorderAll}
                title="Dots and Boxes"
                subtitle="Claim edges to complete boxes. Finishing a box scores it and gives you another turn. Most boxes when the grid is full wins."
                onRestart={newGame}
                maxWidth="sm"
            >
                <Card sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 2, sm: 3 },
                }}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: { xs: 1, sm: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: boardSize, mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                W {stats.wins} · L {stats.losses} · T {stats.ties}
                            </Typography>
                            <Chip
                                size="small"
                                label={`You ${youScore} - ${cpuScore} CPU`}
                                sx={{ bgcolor: alpha(theme.palette.text.primary, 0.08), fontWeight: 800 }}
                            />
                        </Box>

                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 800, mb: 2, textAlign: 'center', color: gameOver ? (youScore > cpuScore ? 'primary.main' : youScore < cpuScore ? 'error.main' : 'text.primary') : 'text.primary' }}
                        >
                            {statusText}
                        </Typography>

                        <Box
                            sx={{
                                position: 'relative',
                                width: boardSize,
                                height: boardSize,
                                touchAction: 'none',
                            }}
                        >
                            {/* Boxes (fill) */}
                            {Array.from({ length: GRID }).map((_, row) =>
                                Array.from({ length: GRID }).map((__, col) => {
                                    const own = owner.get(`${row}-${col}`);
                                    if (!own) return null;
                                    return (
                                        <Box
                                            key={`box-${row}-${col}`}
                                            sx={{
                                                position: 'absolute',
                                                left: DOT / 2 + col * CELL,
                                                top: DOT / 2 + row * CELL,
                                                width: CELL - DOT / 2,
                                                height: CELL - DOT / 2,
                                                bgcolor: own === 'you' ? alpha(theme.palette.primary.main, 0.35) : alpha(theme.palette.error.main, 0.3),
                                                borderRadius: '4px',
                                            }}
                                        />
                                    );
                                }),
                            )}

                            {/* Horizontal edges */}
                            {Array.from({ length: GRID + 1 }).map((_, row) =>
                                Array.from({ length: GRID }).map((__, col) => {
                                    const key = hKey(row, col);
                                    const isDrawn = drawn.has(key);
                                    return (
                                        <Box
                                            key={key}
                                            onClick={() => handleEdgeClick(key)}
                                            role="button"
                                            aria-label={`Horizontal edge row ${row} col ${col}`}
                                            sx={{
                                                position: 'absolute',
                                                left: DOT / 2 + col * CELL,
                                                top: row * CELL,
                                                width: CELL - DOT / 2,
                                                height: DOT,
                                                cursor: isDrawn || gameOver || turn !== 'you' ? 'default' : 'pointer',
                                                bgcolor: isDrawn ? theme.palette.primary.main : 'rgba(255,255,255,0.08)',
                                                borderRadius: '4px',
                                                transition: 'background-color 0.1s ease',
                                                '&:hover': !isDrawn && turn === 'you' && !gameOver ? { bgcolor: alpha(theme.palette.primary.main, 0.5) } : undefined,
                                            }}
                                        />
                                    );
                                }),
                            )}

                            {/* Vertical edges */}
                            {Array.from({ length: GRID }).map((_, row) =>
                                Array.from({ length: GRID + 1 }).map((__, col) => {
                                    const key = vKey(row, col);
                                    const isDrawn = drawn.has(key);
                                    return (
                                        <Box
                                            key={key}
                                            onClick={() => handleEdgeClick(key)}
                                            role="button"
                                            aria-label={`Vertical edge row ${row} col ${col}`}
                                            sx={{
                                                position: 'absolute',
                                                left: col * CELL,
                                                top: DOT / 2 + row * CELL,
                                                width: DOT,
                                                height: CELL - DOT / 2,
                                                cursor: isDrawn || gameOver || turn !== 'you' ? 'default' : 'pointer',
                                                bgcolor: isDrawn ? theme.palette.primary.main : 'rgba(255,255,255,0.08)',
                                                borderRadius: '4px',
                                                transition: 'background-color 0.1s ease',
                                                '&:hover': !isDrawn && turn === 'you' && !gameOver ? { bgcolor: alpha(theme.palette.primary.main, 0.5) } : undefined,
                                            }}
                                        />
                                    );
                                }),
                            )}

                            {/* Dots */}
                            {Array.from({ length: GRID + 1 }).map((_, row) =>
                                Array.from({ length: GRID + 1 }).map((__, col) => (
                                    <Box
                                        key={`dot-${row}-${col}`}
                                        sx={{
                                            position: 'absolute',
                                            left: col * CELL,
                                            top: row * CELL,
                                            width: DOT,
                                            height: DOT,
                                            borderRadius: '50%',
                                            bgcolor: theme.palette.text.primary,
                                        }}
                                    />
                                )),
                            )}
                        </Box>

                        {gameOver && (
                            <Button sx={{ mt: 3 }} variant="contained" onClick={newGame} startIcon={<BorderAll />}>
                                New Game
                            </Button>
                        )}

                        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{ width: 14, height: 14, borderRadius: '3px', bgcolor: alpha(theme.palette.primary.main, 0.35) }} />
                                <Typography variant="caption" color="text.secondary">You</Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{ width: 14, height: 14, borderRadius: '3px', bgcolor: alpha(theme.palette.error.main, 0.3) }} />
                                <Typography variant="caption" color="text.secondary">CPU</Typography>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default DotsAndBoxes;
