import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Container, Card, CardContent, Box, Typography, Button, Stack, useTheme, alpha } from '@mui/material';
import { Grid4x4, Star } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const BOARD_SIZE = 8;

type PieceColor = 'red' | 'black';

interface Piece {
    color: PieceColor;
    king: boolean;
}

type Square = Piece | null;
type Board = Square[][];
/** [row, col], 0-indexed from the top-left of the board. */
type Position = [number, number];

/** A single diagonal hop: either a plain step, or one jump that removes `captured`. */
interface AtomicMove {
    from: Position;
    to: Position;
    captured?: Position;
}

interface GameState {
    board: Board;
    turn: PieceColor;
    /** Set when a piece mid-multi-jump must keep capturing; restricts legal moves to that piece only. */
    forcedFrom: Position | null;
    /** Atomic hops since the last capture - used to call a draw if neither side can make progress. */
    noProgressCount: number;
}

interface Stats {
    wins: number;
    losses: number;
    draws: number;
}

const HUMAN: PieceColor = 'red';
const AI: PieceColor = 'black';

const STATS_KEY = 'sandbox_checkers_stats';

// A game with only kings left shuffling forever is a draw - 80 non-capturing
// hops (40 per side) is a simplified stand-in for the "no progress" rule real
// checkers uses to avoid infinite games.
const DRAW_NO_PROGRESS_LIMIT = 80;

const AI_MOVE_DELAY = 500;

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

const inBounds = (row: number, col: number): boolean =>
    row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

/** Only "dark" squares are ever occupied or playable, matching a real checkers board. */
const isDarkSquare = (row: number, col: number): boolean => (row + col) % 2 === 1;

const opponentOf = (color: PieceColor): PieceColor => (color === HUMAN ? AI : HUMAN);

/** Red promotes on row 0 (top), black promotes on row 7 (bottom). */
const isPromotionRow = (color: PieceColor, row: number): boolean =>
    color === HUMAN ? row === 0 : row === BOARD_SIZE - 1;

const cloneBoard = (board: Board): Board => board.map((row) => row.map((square) => (square ? { ...square } : null)));

const createInitialBoard = (): Board => {
    const board: Board = Array.from({ length: BOARD_SIZE }, () => Array<Square>(BOARD_SIZE).fill(null));
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (!isDarkSquare(row, col)) continue;
            if (row <= 2) board[row][col] = { color: AI, king: false };
            else if (row >= 5) board[row][col] = { color: HUMAN, king: false };
        }
    }
    return board;
};

const countPieces = (board: Board): number => {
    let total = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col]) total += 1;
        }
    }
    return total;
};

/** Row deltas a piece may move/capture along: kings go both ways, regular pieces only "forward". */
const pieceDirections = (piece: Piece): number[] => {
    if (piece.king) return [-1, 1];
    return piece.color === HUMAN ? [-1] : [1];
};

const getSingleStepMoves = (board: Board, row: number, col: number): AtomicMove[] => {
    const piece = board[row][col];
    if (!piece) return [];
    const moves: AtomicMove[] = [];
    for (const dr of pieceDirections(piece)) {
        for (const dc of [-1, 1]) {
            const toRow = row + dr;
            const toCol = col + dc;
            if (inBounds(toRow, toCol) && board[toRow][toCol] === null) {
                moves.push({ from: [row, col], to: [toRow, toCol] });
            }
        }
    }
    return moves;
};

const getSingleCaptureMoves = (board: Board, row: number, col: number): AtomicMove[] => {
    const piece = board[row][col];
    if (!piece) return [];
    const moves: AtomicMove[] = [];
    for (const dr of pieceDirections(piece)) {
        for (const dc of [-1, 1]) {
            const midRow = row + dr;
            const midCol = col + dc;
            const toRow = row + dr * 2;
            const toCol = col + dc * 2;
            if (!inBounds(toRow, toCol)) continue;
            const midSquare = board[midRow][midCol];
            const destSquare = board[toRow][toCol];
            if (midSquare && midSquare.color !== piece.color && destSquare === null) {
                moves.push({ from: [row, col], to: [toRow, toCol], captured: [midRow, midCol] });
            }
        }
    }
    return moves;
};

/**
 * Legal atomic hops for `color`. If `forcedFrom` is set (mid multi-jump), only further
 * captures from that exact square are legal. Otherwise: American checkers' mandatory
 * capture rule means if ANY piece of this color can capture, no simple steps are legal
 * at all - only capture hops are returned.
 */
const getLegalMoves = (board: Board, color: PieceColor, forcedFrom: Position | null): AtomicMove[] => {
    if (forcedFrom) {
        return getSingleCaptureMoves(board, forcedFrom[0], forcedFrom[1]);
    }

    const captureMoves: AtomicMove[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) captureMoves.push(...getSingleCaptureMoves(board, row, col));
        }
    }
    if (captureMoves.length > 0) return captureMoves;

    const stepMoves: AtomicMove[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) stepMoves.push(...getSingleStepMoves(board, row, col));
        }
    }
    return stepMoves;
};

const applyAtomicMove = (board: Board, move: AtomicMove): { board: Board; promoted: boolean } => {
    const next = cloneBoard(board);
    const pieceAtFrom = next[move.from[0]][move.from[1]];
    next[move.from[0]][move.from[1]] = null;
    if (move.captured) {
        next[move.captured[0]][move.captured[1]] = null;
    }
    if (!pieceAtFrom) return { board: next, promoted: false }; // unreachable: moves are only ever generated from real pieces

    let landed: Piece = { ...pieceAtFrom };
    let promoted = false;
    if (!landed.king && isPromotionRow(landed.color, move.to[0])) {
        landed = { ...landed, king: true };
        promoted = true;
    }
    next[move.to[0]][move.to[1]] = landed;
    return { board: next, promoted };
};

/**
 * Decides whose turn it is next. A capture that lands a piece with further jumps
 * available forces the SAME player to continue with that SAME piece (chain capture) -
 * unless this hop just crowned it, in which case (standard American rules) the move
 * ends immediately even if the new king could technically jump again.
 */
const resolveNextTurn = (
    board: Board,
    move: AtomicMove,
    mover: PieceColor,
    promoted: boolean
): { turn: PieceColor; forcedFrom: Position | null } => {
    if (!move.captured || promoted) {
        return { turn: opponentOf(mover), forcedFrom: null };
    }
    const further = getSingleCaptureMoves(board, move.to[0], move.to[1]);
    if (further.length > 0) {
        return { turn: mover, forcedFrom: move.to };
    }
    return { turn: opponentOf(mover), forcedFrom: null };
};

const reduceMove = (state: GameState, move: AtomicMove, mover: PieceColor): GameState => {
    const { board: nextBoard, promoted } = applyAtomicMove(state.board, move);
    const { turn, forcedFrom } = resolveNextTurn(nextBoard, move, mover, promoted);
    const noProgressCount = move.captured ? 0 : state.noProgressCount + 1;
    return { board: nextBoard, turn, forcedFrom, noProgressCount };
};

// ─── AI: minimax with alpha-beta pruning ────────────────────────────────────

const MAN_VALUE = 100;
const KING_VALUE = 175;
const ADVANCE_WEIGHT = 3;

/** Simple static evaluation: material (with a king bonus) plus a small nudge for advancing. */
const evaluateBoard = (board: Board): number => {
    let score = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = board[row][col];
            if (!piece) continue;
            let value = piece.king ? KING_VALUE : MAN_VALUE;
            if (!piece.king) {
                const advancement = piece.color === AI ? row : BOARD_SIZE - 1 - row;
                value += advancement * ADVANCE_WEIGHT;
            }
            score += piece.color === AI ? value : -value;
        }
    }
    return score;
};

interface SearchNode {
    board: Board;
    turn: PieceColor;
    forcedFrom: Position | null;
}

const WIN_SCORE = 100000;

/**
 * Depth is consumed one per atomic hop (including forced recaptures), not per full
 * turn - forced chains are cheap (branching factor is usually small), so this still
 * gives several real "decisions" of lookahead. Tuned via a standalone benchmark to
 * stay well under ~250ms even in the heaviest midgame branching, leaving margin for
 * slower mobile CPUs (a browser tab is generally slower than the Node.js bench).
 */
const pickSearchDepth = (board: Board): number => {
    const total = countPieces(board);
    if (total <= 12) return 8;
    if (total <= 20) return 7;
    return 6;
};

const minimaxScore = (node: SearchNode, depth: number, alpha: number, beta: number): number => {
    const moves = getLegalMoves(node.board, node.turn, node.forcedFrom);
    const maximizing = node.turn === AI;

    if (moves.length === 0) {
        // Whoever is to move here has no legal moves and loses. Weight by remaining
        // depth so the AI prefers sooner wins and later losses among equal outcomes.
        return maximizing ? -(WIN_SCORE + depth) : WIN_SCORE + depth;
    }
    if (depth <= 0) {
        return evaluateBoard(node.board);
    }

    let a = alpha;
    let b = beta;
    if (maximizing) {
        let best = -Infinity;
        for (const move of moves) {
            const { board: nextBoard, promoted } = applyAtomicMove(node.board, move);
            const { turn, forcedFrom } = resolveNextTurn(nextBoard, move, node.turn, promoted);
            const score = minimaxScore({ board: nextBoard, turn, forcedFrom }, depth - 1, a, b);
            if (score > best) best = score;
            if (best > a) a = best;
            if (a >= b) break;
        }
        return best;
    }
    let best = Infinity;
    for (const move of moves) {
        const { board: nextBoard, promoted } = applyAtomicMove(node.board, move);
        const { turn, forcedFrom } = resolveNextTurn(nextBoard, move, node.turn, promoted);
        const score = minimaxScore({ board: nextBoard, turn, forcedFrom }, depth - 1, a, b);
        if (score < best) best = score;
        if (best < b) b = best;
        if (a >= b) break;
    }
    return best;
};

/** Picks the AI's best atomic hop. Assumes at least one legal move exists for AI. */
const getBestMoveForAI = (board: Board, forcedFrom: Position | null): AtomicMove | null => {
    const moves = getLegalMoves(board, AI, forcedFrom);
    if (moves.length === 0) return null;

    const depth = pickSearchDepth(board);
    let bestMove = moves[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of moves) {
        const { board: nextBoard, promoted } = applyAtomicMove(board, move);
        const { turn, forcedFrom: nextForced } = resolveNextTurn(nextBoard, move, AI, promoted);
        const score = minimaxScore({ board: nextBoard, turn, forcedFrom: nextForced }, depth - 1, alpha, beta);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        if (score > alpha) alpha = score;
    }
    return bestMove;
};

const createInitialGameState = (): GameState => ({
    board: createInitialBoard(),
    turn: HUMAN,
    forcedFrom: null,
    noProgressCount: 0,
});

// ─── Component ───────────────────────────────────────────────────────────────

const Checkers: React.FC = () => {
    const theme = useTheme();

    const [game, setGame] = useState<GameState>(createInitialGameState);
    const [selected, setSelected] = useState<Position | null>(null);
    const [stats, setStats] = useState<Stats>(readStats);
    const [statsRecorded, setStatsRecorded] = useState(false);

    const legalMoves = useMemo(
        () => getLegalMoves(game.board, game.turn, game.forcedFrom),
        [game.board, game.turn, game.forcedFrom]
    );

    const isNoProgressDraw = game.noProgressCount >= DRAW_NO_PROGRESS_LIMIT;
    const isGameOver = legalMoves.length === 0 || isNoProgressDraw;
    const winner: PieceColor | null = isGameOver && legalMoves.length === 0 ? opponentOf(game.turn) : null;
    const isDraw = isGameOver && winner === null;

    // getLegalMoves is all-or-nothing (every move is a capture, or none are), so
    // checking the first entry tells us whether this whole turn is a forced capture.
    const mandatoryCapture = legalMoves.length > 0 && legalMoves[0].captured !== undefined;

    // The piece the human is currently acting through: an in-progress forced chain
    // always wins over a free-form click-selection.
    const activeFrom: Position | null =
        game.turn === HUMAN && !isGameOver ? game.forcedFrom ?? selected : null;

    const destinationMoves = useMemo(
        () => (activeFrom ? legalMoves.filter((m) => m.from[0] === activeFrom[0] && m.from[1] === activeFrom[1]) : []),
        [legalMoves, activeFrom]
    );

    const movablePieceKeys = useMemo(() => {
        const set = new Set<string>();
        if (game.turn === HUMAN) {
            legalMoves.forEach((m) => set.add(`${m.from[0]}-${m.from[1]}`));
        }
        return set;
    }, [legalMoves, game.turn]);

    const resetGame = useCallback(() => {
        setGame(createInitialGameState());
        setSelected(null);
        setStatsRecorded(false);
    }, []);

    // Record the result exactly once per finished game.
    useEffect(() => {
        if (!isGameOver || statsRecorded) return;
        setStatsRecorded(true);
        setStats((prev) => {
            const next: Stats = { ...prev };
            if (isDraw) next.draws += 1;
            else if (winner === HUMAN) next.wins += 1;
            else if (winner === AI) next.losses += 1;
            writeStats(next);
            return next;
        });
    }, [isGameOver, isDraw, winner, statsRecorded]);

    // AI turn: compute and apply ONE atomic hop, with a short delay so it doesn't feel
    // instantaneous. If that hop is a capture that must chain, `game.forcedFrom` stays
    // set to the AI's piece and `game.turn` stays AI - since `game` changed, this effect
    // re-fires and schedules the next hop, so multi-jumps visibly step through the board.
    useEffect(() => {
        if (game.turn !== AI || isGameOver) return undefined;
        const timeoutId = window.setTimeout(() => {
            setGame((prev) => {
                if (prev.turn !== AI) return prev;
                const move = getBestMoveForAI(prev.board, prev.forcedFrom);
                if (!move) return prev;
                return reduceMove(prev, move, AI);
            });
        }, AI_MOVE_DELAY);
        return () => window.clearTimeout(timeoutId);
    }, [game, isGameOver]);

    const handleSquareClick = (row: number, col: number) => {
        if (game.turn !== HUMAN || isGameOver) return;

        if (activeFrom) {
            const move = legalMoves.find(
                (m) => m.from[0] === activeFrom[0] && m.from[1] === activeFrom[1] && m.to[0] === row && m.to[1] === col
            );
            if (move) {
                setGame((prev) => reduceMove(prev, move, HUMAN));
                setSelected(null);
                return;
            }
            // Mid forced-chain, this click isn't one of the forced piece's jumps - ignore it.
            if (game.forcedFrom) return;
        }

        const piece = game.board[row][col];
        if (piece && piece.color === HUMAN && movablePieceKeys.has(`${row}-${col}`)) {
            setSelected([row, col]);
        } else {
            setSelected(null);
        }
    };

    let statusText: string;
    if (isDraw) statusText = "It's a draw.";
    else if (winner === HUMAN) statusText = 'You win!';
    else if (winner === AI) statusText = 'The AI wins.';
    else if (game.turn === HUMAN) {
        if (game.forcedFrom) statusText = 'Continue your jump!';
        else if (mandatoryCapture) statusText = 'Capture available - you must jump.';
        else statusText = 'Your move (red)';
    } else {
        statusText = game.forcedFrom ? "AI is chaining a jump…" : "AI's turn (black)...";
    }

    const boardSquares: React.ReactNode[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const dark = isDarkSquare(row, col);
            const piece = dark ? game.board[row][col] : null;
            const isSelected = !!activeFrom && activeFrom[0] === row && activeFrom[1] === col;
            const destination = destinationMoves.find((m) => m.to[0] === row && m.to[1] === col);
            const isHintedOrigin =
                dark &&
                !activeFrom &&
                game.turn === HUMAN &&
                !isGameOver &&
                movablePieceKeys.has(`${row}-${col}`);
            const interactive = dark && game.turn === HUMAN && !isGameOver;

            boardSquares.push(
                <Box
                    key={`${row}-${col}`}
                    onClick={() => dark && handleSquareClick(row, col)}
                    sx={{
                        position: 'relative',
                        aspectRatio: '1 / 1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: dark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.015)',
                        cursor: interactive ? 'pointer' : 'default',
                        transition: 'background-color 0.15s ease',
                        boxShadow: isSelected
                            ? `inset 0 0 0 3px ${theme.palette.primary.main}`
                            : isHintedOrigin
                              ? `inset 0 0 0 2px ${alpha(
                                    mandatoryCapture ? theme.palette.warning.main : theme.palette.primary.main,
                                    0.6
                                )}`
                              : 'none',
                        '&:hover':
                            interactive && !isSelected ? { bgcolor: 'rgba(255,255,255,0.09)' } : undefined,
                    }}
                >
                    <AnimatePresence>
                        {piece && (
                            <Box
                                key={piece.king ? 'king' : 'man'}
                                component={motion.div}
                                initial={{ scale: 0.4, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.3, opacity: 0 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                sx={{
                                    width: '78%',
                                    height: '78%',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background:
                                        piece.color === HUMAN
                                            ? 'linear-gradient(145deg, #ef5350, #b71c1c)'
                                            : 'linear-gradient(145deg, #4b5160, #15171b)',
                                    boxShadow: piece.king
                                        ? `0 0 0 3px ${alpha('#fbbf24', 0.9)}, inset 0 -4px 6px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.25)`
                                        : 'inset 0 -4px 6px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.2)',
                                }}
                            >
                                {piece.king && <Star sx={{ fontSize: '55%', color: '#fbbf24' }} />}
                            </Box>
                        )}
                    </AnimatePresence>

                    {!piece && destination && (
                        <Box
                            component={motion.div}
                            animate={destination.captured ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                            transition={
                                destination.captured
                                    ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
                                    : undefined
                            }
                            sx={{
                                width: destination.captured ? '38%' : '30%',
                                height: destination.captured ? '38%' : '30%',
                                borderRadius: '50%',
                                bgcolor: alpha(
                                    destination.captured ? theme.palette.warning.main : theme.palette.primary.main,
                                    0.55
                                ),
                            }}
                        />
                    )}
                </Box>
            );
        }
    }

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                title="Checkers - Play Free Online vs AI"
                description="Play classic American checkers against a minimax AI opponent right in your browser. Mandatory captures, forced multi-jumps, and kings - free, no sign-up."
                keywords={['checkers game', 'play checkers online', 'checkers vs computer', 'american checkers', 'draughts online', 'board game ai']}
            />
            <ServicePageHero
                icon={Grid4x4}
                title="Checkers"
                subtitle="Classic American checkers against a minimax-powered AI. Captures are mandatory, chain jumps are forced, and reaching the back row crowns a king."
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: { xs: 2, sm: 3 },
            }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: { xs: 1, sm: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 440, mb: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Wins: {stats.wins}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            Draws: {stats.draws}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                            Losses: {stats.losses}
                        </Typography>
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
                                      : mandatoryCapture && game.turn === HUMAN
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
                            border: '1px solid rgba(255,255,255,0.1)',
                            userSelect: 'none',
                            touchAction: 'manipulation',
                        }}
                    >
                        {boardSquares}
                    </Box>

                    <Stack direction="row" spacing={2.5} sx={{ mt: 2.5 }} alignItems="center">
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(145deg, #ef5350, #b71c1c)' }} />
                            <Typography variant="caption" color="text.secondary">You</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(145deg, #4b5160, #15171b)' }} />
                            <Typography variant="caption" color="text.secondary">AI</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <Star sx={{ fontSize: 14, color: '#fbbf24' }} />
                            <Typography variant="caption" color="text.secondary">King</Typography>
                        </Stack>
                    </Stack>

                    <Button sx={{ mt: 3 }} variant="contained" onClick={resetGame}>
                        New Game
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Checkers;
