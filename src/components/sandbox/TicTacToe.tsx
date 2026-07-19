import React, { useCallback, useEffect, useState } from 'react';
import { Container, Card, CardContent, Box, Typography, Button, useTheme, alpha } from '@mui/material';
import { GridOn } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

type Cell = 'X' | 'O' | null;
type BoardState = Cell[]; // length 9, row-major

const HUMAN: Cell = 'X';
const AI: Cell = 'O';

const STATS_KEY = 'sandbox_tictactoe_stats';

const WIN_LINES: number[][] = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6],            // diagonals
];

interface Stats {
    wins: number;
    losses: number;
    draws: number;
}

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

/** Returns 'X' | 'O' if that player has a winning line on the board, else null. */
const getWinner = (board: BoardState): Cell => {
    for (const [a, b, c] of WIN_LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
};

const getWinningLine = (board: BoardState): number[] | null => {
    for (const line of WIN_LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return line;
        }
    }
    return null;
};

const isBoardFull = (board: BoardState): boolean => board.every((cell) => cell !== null);

const getAvailableMoves = (board: BoardState): number[] =>
    board.reduce<number[]>((acc, cell, idx) => {
        if (cell === null) acc.push(idx);
        return acc;
    }, []);

/**
 * Minimax with depth-aware scoring so the AI prefers faster wins and slower losses
 * (still provably unbeatable either way, since full game tree search is exhaustive
 * for a 3x3 board - depth just breaks ties between equally-optimal outcomes).
 */
const minimax = (board: BoardState, player: Cell, depth: number): { score: number; index: number | null } => {
    const winner = getWinner(board);
    if (winner === AI) return { score: 10 - depth, index: null };
    if (winner === HUMAN) return { score: depth - 10, index: null };
    if (isBoardFull(board)) return { score: 0, index: null };

    const availableMoves = getAvailableMoves(board);
    let bestIndex: number | null = null;

    if (player === AI) {
        let bestScore = -Infinity;
        for (const move of availableMoves) {
            const nextBoard = board.slice();
            nextBoard[move] = AI;
            const { score } = minimax(nextBoard, HUMAN, depth + 1);
            if (score > bestScore) {
                bestScore = score;
                bestIndex = move;
            }
        }
        return { score: bestScore, index: bestIndex };
    } else {
        let bestScore = Infinity;
        for (const move of availableMoves) {
            const nextBoard = board.slice();
            nextBoard[move] = HUMAN;
            const { score } = minimax(nextBoard, AI, depth + 1);
            if (score < bestScore) {
                bestScore = score;
                bestIndex = move;
            }
        }
        return { score: bestScore, index: bestIndex };
    }
};

/** Picks the AI's best move via full minimax search. Assumes at least one empty cell exists. */
const getBestAiMove = (board: BoardState): number => {
    const { index } = minimax(board, AI, 0);
    if (index !== null) return index;
    // Fallback (should be unreachable if called only on non-terminal boards): first open cell.
    return getAvailableMoves(board)[0];
};

const createEmptyBoard = (): BoardState => Array<Cell>(9).fill(null);

const TicTacToe: React.FC = () => {
    const theme = useTheme();
    const [board, setBoard] = useState<BoardState>(createEmptyBoard);
    const [isHumanTurn, setIsHumanTurn] = useState(true);
    const [stats, setStats] = useState<Stats>(readStats);
    const [statsRecorded, setStatsRecorded] = useState(false);

    const winner = getWinner(board);
    const winningLine = getWinningLine(board);
    const isDraw = !winner && isBoardFull(board);
    const isGameOver = winner !== null || isDraw;

    const resetGame = useCallback(() => {
        setBoard(createEmptyBoard());
        setIsHumanTurn(true);
        setStatsRecorded(false);
    }, []);

    // Record the result exactly once per finished game.
    useEffect(() => {
        if (!isGameOver || statsRecorded) return;
        setStatsRecorded(true);
        setStats((prev) => {
            const next: Stats = { ...prev };
            if (winner === HUMAN) next.wins += 1;
            else if (winner === AI) next.losses += 1;
            else next.draws += 1;
            writeStats(next);
            return next;
        });
    }, [isGameOver, statsRecorded, winner]);

    // AI move effect: whenever it becomes the AI's turn and the game isn't over,
    // compute and apply its move (slight delay so it feels less instantaneous/robotic).
    useEffect(() => {
        if (isHumanTurn || isGameOver) return undefined;
        const timeoutId = window.setTimeout(() => {
            setBoard((current) => {
                if (getWinner(current) || isBoardFull(current)) return current;
                const aiIndex = getBestAiMove(current);
                const next = current.slice();
                next[aiIndex] = AI;
                return next;
            });
            setIsHumanTurn(true);
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [isHumanTurn, isGameOver]);

    const handleCellClick = (index: number) => {
        if (!isHumanTurn || isGameOver || board[index] !== null) return;
        const next = board.slice();
        next[index] = HUMAN;
        setBoard(next);
        setIsHumanTurn(false);
    };

    let statusText: string;
    if (winner === HUMAN) statusText = 'You win!';
    else if (winner === AI) statusText = 'The AI wins.';
    else if (isDraw) statusText = "It's a draw.";
    else statusText = isHumanTurn ? 'Your turn (X)' : "AI's turn (O)...";

    const cellSize = 96;
    const boardSize = cellSize * 3 + 8 * 4;

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo title="Play Tic-Tac-Toe Online - Unbeatable AI" gameId={3} />
            <ServicePageHero
                icon={GridOn}
                title="Tic-Tac-Toe"
                subtitle="Take on an unbeatable AI opponent powered by the minimax algorithm. You play X, the AI plays O - the best you can do is force a draw."
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: boardSize, mb: 1 }}>
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
                            color: winner === HUMAN ? 'primary.main' : winner === AI ? 'secondary.main' : 'text.primary',
                        }}
                    >
                        {statusText}
                    </Typography>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(3, ${cellSize}px)`,
                            gridTemplateRows: `repeat(3, ${cellSize}px)`,
                            gap: '8px',
                            p: '8px',
                            borderRadius: '12px',
                            bgcolor: 'rgba(0,0,0,0.35)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        {board.map((cell, index) => {
                            const isWinningCell = winningLine?.includes(index) ?? false;
                            return (
                                <Box
                                    key={index}
                                    onClick={() => handleCellClick(index)}
                                    sx={{
                                        width: cellSize,
                                        height: cellSize,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '8px',
                                        bgcolor: isWinningCell
                                            ? alpha(theme.palette.primary.main, 0.25)
                                            : 'rgba(255,255,255,0.04)',
                                        cursor: !cell && isHumanTurn && !isGameOver ? 'pointer' : 'default',
                                        transition: 'background-color 0.2s ease',
                                        '&:hover': {
                                            bgcolor: !cell && isHumanTurn && !isGameOver
                                                ? 'rgba(255,255,255,0.08)'
                                                : undefined,
                                        },
                                    }}
                                >
                                    <AnimatePresence>
                                        {cell && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontSize: '2.5rem',
                                                        fontWeight: 900,
                                                        color: cell === HUMAN ? 'primary.main' : 'secondary.main',
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    {cell}
                                                </Typography>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Box>
                            );
                        })}
                    </Box>

                    <Button sx={{ mt: 3 }} variant="contained" onClick={resetGame}>
                        {isGameOver ? 'Play Again' : 'Restart'}
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default TicTacToe;
