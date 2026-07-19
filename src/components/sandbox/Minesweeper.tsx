import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography, useTheme } from '@mui/material';
import { Flag, GridView, Refresh } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const SIZE = 9;
const MINES = 10;
const BEST_KEY = 'sandbox_minesweeper_best_seconds';

interface Cell {
    mine: boolean;
    revealed: boolean;
    flagged: boolean;
    adjacent: number;
}

type Board = Cell[][];
type Status = 'ready' | 'playing' | 'won' | 'lost';

const emptyBoard = (): Board =>
    Array.from({ length: SIZE }, () =>
        Array.from({ length: SIZE }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
    );

// Mines are placed after the first click so you can never lose on move one.
const placeMines = (board: Board, safeR: number, safeC: number): Board => {
    const next = board.map(row => row.map(c => ({ ...c })));
    let placed = 0;
    while (placed < MINES) {
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        if (next[r][c].mine || (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) continue;
        next[r][c].mine = true;
        placed += 1;
    }
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (next[r][c].mine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && next[nr][nc].mine) count += 1;
                }
            }
            next[r][c].adjacent = count;
        }
    }
    return next;
};

const floodReveal = (board: Board, r: number, c: number) => {
    const stack: [number, number][] = [[r, c]];
    while (stack.length) {
        const [cr, cc] = stack.pop()!;
        const cell = board[cr][cc];
        if (cell.revealed || cell.flagged) continue;
        cell.revealed = true;
        if (cell.adjacent === 0 && !cell.mine) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = cr + dr, nc = cc + dc;
                    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc].revealed) stack.push([nr, nc]);
                }
            }
        }
    }
};

const NUM_COLORS = ['', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#06b6d4', '#f97316', '#e2e8f0'];

const loadBest = (): number | null => {
    try {
        const n = Number(localStorage.getItem(BEST_KEY));
        return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
        return null;
    }
};

const Minesweeper: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [board, setBoard] = useState<Board>(emptyBoard);
    const [status, setStatus] = useState<Status>('ready');
    const [flags, setFlags] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [best, setBest] = useState<number | null>(() => loadBest());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopTimer = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }, []);

    useEffect(() => () => stopTimer(), [stopTimer]);

    const reset = useCallback(() => {
        stopTimer();
        setBoard(emptyBoard());
        setStatus('ready');
        setFlags(0);
        setSeconds(0);
    }, [stopTimer]);

    const startTimer = useCallback(() => {
        stopTimer();
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }, [stopTimer]);

    const revealCell = useCallback((r: number, c: number) => {
        if (status === 'won' || status === 'lost') return;
        setBoard(prev => {
            let working = prev.map(row => row.map(cell => ({ ...cell })));
            if (status === 'ready') {
                working = placeMines(working, r, c);
                setStatus('playing');
                startTimer();
            }
            const cell = working[r][c];
            if (cell.revealed || cell.flagged) return working;

            if (cell.mine) {
                working.forEach(row => row.forEach(x => { if (x.mine) x.revealed = true; }));
                setStatus('lost');
                stopTimer();
                return working;
            }

            floodReveal(working, r, c);

            // Win when every non-mine cell is revealed.
            const safeLeft = working.flat().filter(x => !x.mine && !x.revealed).length;
            if (safeLeft === 0) {
                setStatus('won');
                stopTimer();
                setSeconds(sec => {
                    if (best === null || sec < best) {
                        setBest(sec);
                        try { localStorage.setItem(BEST_KEY, String(sec)); } catch { /* ignore */ }
                    }
                    return sec;
                });
            }
            return working;
        });
    }, [status, best, startTimer, stopTimer]);

    const toggleFlag = useCallback((r: number, c: number) => {
        if (status === 'won' || status === 'lost' || status === 'ready') return;
        setBoard(prev => {
            const working = prev.map(row => row.map(cell => ({ ...cell })));
            const cell = working[r][c];
            if (cell.revealed) return working;
            cell.flagged = !cell.flagged;
            setFlags(f => f + (cell.flagged ? 1 : -1));
            return working;
        });
    }, [status]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                gameId={13}
                title="Minesweeper — Free Online Classic Game"
                keywords={['minesweeper game', 'play minesweeper online', 'minesweeper free', 'classic minesweeper', 'online puzzle game', 'minesweeper browser']}
            />
            <ServicePageHero
                icon={GridView}
                title="Minesweeper"
                subtitle="Clear the board without hitting a mine. Tap to reveal, long-press or use the flag button to mark mines."
            />

            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: { xs: 2, sm: 3 },
            }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                        <Typography variant="body1"><Flag sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5 }} />{MINES - flags}</Typography>
                        <Typography variant="body1" color="text.secondary">
                            ⏱ {seconds}s · Best: {best ?? '—'}
                        </Typography>
                        <Button size="small" startIcon={<Refresh />} onClick={reset}>New</Button>
                    </Stack>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
                        gap: '3px',
                        maxWidth: 380,
                        mx: 'auto',
                        userSelect: 'none',
                        touchAction: 'manipulation',
                    }}>
                        {board.map((row, r) => row.map((cell, c) => {
                            const revealed = cell.revealed;
                            return (
                                <Box
                                    key={`${r}-${c}`}
                                    onClick={() => revealCell(r, c)}
                                    onContextMenu={e => { e.preventDefault(); toggleFlag(r, c); }}
                                    sx={{
                                        aspectRatio: '1 / 1',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: { xs: '0.8rem', sm: '0.95rem' },
                                        cursor: 'pointer',
                                        bgcolor: revealed
                                            ? (cell.mine ? '#7f1d1d' : 'rgba(255,255,255,0.06)')
                                            : 'rgba(255,255,255,0.13)',
                                        border: `1px solid ${revealed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)'}`,
                                        color: cell.mine ? '#fff' : NUM_COLORS[cell.adjacent],
                                        transition: 'background 0.1s',
                                        '&:hover': revealed ? {} : { bgcolor: 'rgba(255,255,255,0.2)' },
                                    }}
                                >
                                    {revealed
                                        ? (cell.mine ? '💣' : (cell.adjacent > 0 ? cell.adjacent : ''))
                                        : (cell.flagged ? '🚩' : '')}
                                </Box>
                            );
                        }))}
                    </Box>

                    {(status === 'won' || status === 'lost') && (
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: status === 'won' ? primary : theme.palette.error.main }}>
                                {status === 'won' ? `Cleared in ${seconds}s! 🎉` : 'Boom! 💥'}
                            </Typography>
                            <Button variant="contained" onClick={reset} sx={{ mt: 1.5 }}>Play again</Button>
                        </Box>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                        Right-click (desktop) to flag. On mobile, use long-press.
                    </Typography>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Minesweeper;
