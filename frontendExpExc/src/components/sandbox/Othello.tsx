import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, Box, Typography, Button, Stack, useTheme, alpha } from '@mui/material';
import { Circle } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

const BOARD_SIZE = 8;

type Disc = 'black' | 'white';
type Cell = Disc | null;
type Board = Cell[][];
/** [row, col], 0-indexed from the top-left of the board. */
type Position = [number, number];

interface Move {
    row: number;
    col: number;
    /** Opponent discs this move outflanks and flips - always non-empty for a legal move. */
    flips: Position[];
}

interface GameState {
    board: Board;
    turn: Disc;
}

interface Stats {
    wins: number;
    losses: number;
    draws: number;
}

const HUMAN: Disc = 'black';
const AI: Disc = 'white';

const STATS_KEY = 'sandbox_othello_stats';

/** How long the "AI is thinking" / auto-pass beat lasts before the board updates -
 * long enough to read, short enough not to feel sluggish. */
const AI_MOVE_DELAY = 550;
const PASS_DELAY = 900;

const DEFAULT_STATS: Stats = { wins: 0, losses: 0, draws: 0 };

const readStats = (): Stats => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return DEFAULT_STATS;
        const parsed = JSON.parse(raw);
        return {
            wins: Number.isFinite(parsed.wins) ? parsed.wins : 0,
            losses: Number.isFinite(parsed.losses) ? parsed.losses : 0,
            draws: Number.isFinite(parsed.draws) ? parsed.draws : 0,
        };
    } catch {
        return DEFAULT_STATS;
    }
};

const writeStats = (stats: Stats) => {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
        // ignore storage errors
    }
};

// ─── Board helpers ──────────────────────────────────────────────────────────

const DIRECTIONS: Position[] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
];

const CORNERS: Position[] = [[0, 0], [0, BOARD_SIZE - 1], [BOARD_SIZE - 1, 0], [BOARD_SIZE - 1, BOARD_SIZE - 1]];

const inBounds = (row: number, col: number): boolean =>
    row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

const opponentOf = (color: Disc): Disc => (color === HUMAN ? AI : HUMAN);

const cloneBoard = (board: Board): Board => board.map((row) => [...row]);

const createInitialBoard = (): Board => {
    const board: Board = Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(null));
    const mid = BOARD_SIZE / 2;
    board[mid - 1][mid - 1] = AI;
    board[mid - 1][mid] = HUMAN;
    board[mid][mid - 1] = HUMAN;
    board[mid][mid] = AI;
    return board;
};

const countDiscs = (board: Board): { black: number; white: number } => {
    let black = 0;
    let white = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === HUMAN) black += 1;
            else if (board[row][col] === AI) white += 1;
        }
    }
    return { black, white };
};

/** The discs a move at (row, col) would outflank: for each of the 8 directions, walk
 * through contiguous opponent discs and, only if that run is terminated by one of the
 * mover's own discs (no gaps, no running off the board), those discs get flipped. */
const flipsForMove = (board: Board, row: number, col: number, color: Disc): Position[] => {
    if (board[row][col] !== null) return [];
    const opponent = opponentOf(color);
    const allFlips: Position[] = [];

    for (const [dr, dc] of DIRECTIONS) {
        const lineFlips: Position[] = [];
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c) && board[r][c] === opponent) {
            lineFlips.push([r, c]);
            r += dr;
            c += dc;
        }
        if (lineFlips.length > 0 && inBounds(r, c) && board[r][c] === color) {
            allFlips.push(...lineFlips);
        }
    }
    return allFlips;
};

const getLegalMoves = (board: Board, color: Disc): Move[] => {
    const moves: Move[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] !== null) continue;
            const flips = flipsForMove(board, row, col, color);
            if (flips.length > 0) moves.push({ row, col, flips });
        }
    }
    return moves;
};

const applyMove = (board: Board, move: Move, color: Disc): Board => {
    const next = cloneBoard(board);
    next[move.row][move.col] = color;
    for (const [r, c] of move.flips) next[r][c] = color;
    return next;
};

const createInitialGameState = (): GameState => ({
    board: createInitialBoard(),
    turn: HUMAN,
});

// ─── AI: minimax with alpha-beta pruning ────────────────────────────────────
//
// Evaluation combines three signals rather than raw disc count alone (an engine that
// only maximizes immediate discs plays badly - discs flip back and forth constantly
// until the endgame):
//  - corner control: corners can never be flipped once taken, so they're weighted heavily
//  - mobility: having more legal moves than the opponent is a real advantage, especially
//    early/mid-game, since it can force the opponent into bad squares
//  - disc count: barely matters mid-game, but is what actually decides the winner, so its
//    weight ramps up once the board is nearly full

const SEARCH_DEPTH = 4;
const CORNER_WEIGHT = 20;
const MOBILITY_WEIGHT = 4;
const WIN_BONUS = 100000;

const evaluateBoard = (board: Board): number => {
    const { black, white } = countDiscs(board);
    const emptyCount = BOARD_SIZE * BOARD_SIZE - black - white;
    const discWeight = emptyCount <= 12 ? 8 : 1;
    const discDiff = white - black;

    let cornerScore = 0;
    for (const [r, c] of CORNERS) {
        if (board[r][c] === AI) cornerScore += 1;
        else if (board[r][c] === HUMAN) cornerScore -= 1;
    }

    const aiMoves = getLegalMoves(board, AI).length;
    const humanMoves = getLegalMoves(board, HUMAN).length;
    const mobilityScore = aiMoves - humanMoves;

    return discWeight * discDiff + CORNER_WEIGHT * cornerScore + MOBILITY_WEIGHT * mobilityScore;
};

/** Both sides completely out of moves - score by final disc margin. */
const terminalScore = (board: Board): number => {
    const { black, white } = countDiscs(board);
    const diff = white - black;
    if (diff > 0) return WIN_BONUS + diff;
    if (diff < 0) return -WIN_BONUS + diff;
    return 0;
};

const minimaxScore = (board: Board, turn: Disc, depth: number, alpha: number, beta: number): number => {
    const moves = getLegalMoves(board, turn);

    if (moves.length === 0) {
        const opponentMoves = getLegalMoves(board, opponentOf(turn));
        if (opponentMoves.length === 0) return terminalScore(board);
        // This side must pass - the position doesn't change, so it doesn't cost a ply
        // of lookahead, it just hands the move straight to the opponent.
        return minimaxScore(board, opponentOf(turn), depth, alpha, beta);
    }
    if (depth <= 0) return evaluateBoard(board);

    const maximizing = turn === AI;
    let a = alpha;
    let b = beta;
    if (maximizing) {
        let best = -Infinity;
        for (const move of moves) {
            const nextBoard = applyMove(board, move, turn);
            const score = minimaxScore(nextBoard, opponentOf(turn), depth - 1, a, b);
            if (score > best) best = score;
            if (best > a) a = best;
            if (a >= b) break;
        }
        return best;
    }
    let best = Infinity;
    for (const move of moves) {
        const nextBoard = applyMove(board, move, turn);
        const score = minimaxScore(nextBoard, opponentOf(turn), depth - 1, a, b);
        if (score < best) best = score;
        if (best < b) b = best;
        if (a >= b) break;
    }
    return best;
};

/** Picks the AI's best move. Assumes at least one legal move exists for AI. */
const getBestMoveForAI = (board: Board): Move | null => {
    const moves = getLegalMoves(board, AI);
    if (moves.length === 0) return null;

    let bestMove = moves[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of moves) {
        const nextBoard = applyMove(board, move, AI);
        const score = minimaxScore(nextBoard, HUMAN, SEARCH_DEPTH - 1, alpha, beta);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        if (score > alpha) alpha = score;
    }
    return bestMove;
};

// ─── Component ───────────────────────────────────────────────────────────────

const discGradient: Record<Disc, string> = {
    black: 'linear-gradient(145deg, #4b5160, #15171b)',
    white: 'linear-gradient(145deg, #ffffff, #cfd3d8)',
};

const Othello: React.FC = () => {
    const theme = useTheme();

    const [game, setGame] = useState<GameState>(createInitialGameState);
    const [stats, setStats] = useState<Stats>(readStats);
    const [statsRecorded, setStatsRecorded] = useState(false);

    const legalMoves = useMemo(() => getLegalMoves(game.board, game.turn), [game.board, game.turn]);
    const opponentLegalMoves = useMemo(
        () => getLegalMoves(game.board, opponentOf(game.turn)),
        [game.board, game.turn]
    );

    const isGameOver = legalMoves.length === 0 && opponentLegalMoves.length === 0;
    const mustPass = legalMoves.length === 0 && !isGameOver;

    const { black, white } = useMemo(() => countDiscs(game.board), [game.board]);
    const winner: Disc | 'draw' | null = isGameOver ? (black > white ? HUMAN : white > black ? AI : 'draw') : null;

    const resetGame = useCallback(() => {
        setGame(createInitialGameState());
        setStatsRecorded(false);
    }, []);

    // Record the result exactly once per finished game.
    useEffect(() => {
        if (!isGameOver || statsRecorded) return;
        setStatsRecorded(true);
        setStats((prev) => {
            const next: Stats = { ...prev };
            if (winner === 'draw') next.draws += 1;
            else if (winner === HUMAN) next.wins += 1;
            else if (winner === AI) next.losses += 1;
            writeStats(next);
            return next;
        });
    }, [isGameOver, winner, statsRecorded]);

    // Whoever's turn it is has no legal move: auto-pass back to the other side after a
    // short, readable beat instead of requiring a manual "pass" button.
    useEffect(() => {
        if (!mustPass) return undefined;
        const timeoutId = window.setTimeout(() => {
            setGame((prev) => ({ ...prev, turn: opponentOf(prev.turn) }));
        }, PASS_DELAY);
        return () => window.clearTimeout(timeoutId);
    }, [mustPass, game]);

    // AI's turn: think for a beat, then play its best move.
    useEffect(() => {
        if (game.turn !== AI || isGameOver || mustPass) return undefined;
        const timeoutId = window.setTimeout(() => {
            setGame((prev) => {
                if (prev.turn !== AI) return prev;
                const move = getBestMoveForAI(prev.board);
                if (!move) return prev;
                return { board: applyMove(prev.board, move, AI), turn: HUMAN };
            });
        }, AI_MOVE_DELAY);
        return () => window.clearTimeout(timeoutId);
    }, [game, isGameOver, mustPass]);

    const handleCellClick = (row: number, col: number) => {
        if (game.turn !== HUMAN || isGameOver || mustPass) return;
        const move = legalMoves.find((m) => m.row === row && m.col === col);
        if (!move) return;
        setGame((prev) => ({ board: applyMove(prev.board, move, HUMAN), turn: AI }));
    };

    const showHints = game.turn === HUMAN && !isGameOver && !mustPass;
    const legalMoveKeys = useMemo(() => {
        const set = new Set<string>();
        if (showHints) legalMoves.forEach((m) => set.add(`${m.row}-${m.col}`));
        return set;
    }, [legalMoves, showHints]);

    let statusText: string;
    if (winner === 'draw') statusText = "It's a draw.";
    else if (winner === HUMAN) statusText = 'You win!';
    else if (winner === AI) statusText = 'The AI wins.';
    else if (mustPass) statusText = `No legal moves for ${game.turn === HUMAN ? 'you' : 'the AI'} - turn passed`;
    else if (game.turn === HUMAN) statusText = 'Your move (black)';
    else statusText = 'AI is thinking… (white)';

    const boardCells: React.ReactNode[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const disc = game.board[row][col];
            const key = `${row}-${col}`;
            const isHint = legalMoveKeys.has(key);
            const interactive = isHint;

            boardCells.push(
                <Box
                    key={key}
                    onClick={() => interactive && handleCellClick(row, col)}
                    sx={{
                        position: 'relative',
                        aspectRatio: '1 / 1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#0c3320',
                        border: '1px solid rgba(0,0,0,0.35)',
                        cursor: interactive ? 'pointer' : 'default',
                        transition: 'background-color 0.15s ease',
                        '&:hover': interactive ? { bgcolor: '#0f3d27' } : undefined,
                    }}
                >
                    <AnimatePresence>
                        {disc && (
                            <Box
                                key={disc}
                                component={motion.div}
                                initial={{ scale: 0.4, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                                exit={{ scale: 0.3, opacity: 0 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                                sx={{
                                    width: '78%',
                                    height: '78%',
                                    borderRadius: '50%',
                                    background: discGradient[disc],
                                    boxShadow:
                                        disc === HUMAN
                                            ? 'inset 0 -4px 6px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.5)'
                                            : 'inset 0 -3px 5px rgba(0,0,0,0.15), inset 0 2px 3px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5)',
                                }}
                            />
                        )}
                    </AnimatePresence>

                    {!disc && isHint && (
                        <Box
                            sx={{
                                width: '26%',
                                height: '26%',
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.primary.main, 0.55),
                            }}
                        />
                    )}
                </Box>
            );
        }
    }
    const cardRef = useRef<HTMLDivElement | null>(null);

    return (
        <>
            <Seo
                title="Othello - Play Free Online vs AI"
                description="Play classic Othello (Reversi) against a minimax AI opponent right in your browser. Outflank and flip discs, control the corners, and win the board - free, no sign-up."
                keywords={['othello game', 'reversi online', 'play othello vs computer', 'othello ai', 'reversi game free', 'board game ai']}
            />
            <GamePlayShell
                icon={Circle}
                title="Othello"
                subtitle="Outflank your opponent's discs to flip them to your color. Corners are permanent - control them and you control the board."
                onRestart={resetGame}
            >
                <Card ref={cardRef} sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 2, sm: 3 },
                }}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: { xs: 1, sm: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 440, mb: 1.5 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: discGradient.black, flexShrink: 0 }} />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>You: {black}</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                W {stats.wins} · D {stats.draws} · L {stats.losses}
                            </Typography>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>AI: {white}</Typography>
                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: discGradient.white, flexShrink: 0 }} />
                            </Stack>
                        </Box>

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                mb: 2,
                                textAlign: 'center',
                                color:
                                    winner === HUMAN
                                        ? 'primary.main'
                                        : winner === AI
                                          ? 'secondary.main'
                                          : mustPass
                                            ? 'warning.main'
                                            : 'text.primary',
                            }}
                        >
                            {statusText}
                        </Typography>

                        <Box
                            sx={{
                                width: '100%',
                                maxWidth: 440,
                                mx: 'auto',
                                display: 'grid',
                                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                                gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
                                borderRadius: '10px',
                                overflow: 'hidden',
                                border: '2px solid #082418',
                                userSelect: 'none',
                                touchAction: 'manipulation',
                            }}
                        >
                            {boardCells}
                        </Box>

                        <Button sx={{ mt: 3 }} variant="contained" onClick={resetGame}>
                            New Game
                        </Button>
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default Othello;
