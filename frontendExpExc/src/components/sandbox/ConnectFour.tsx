import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography, useTheme } from '@mui/material';
import { Casino, Refresh } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const ROWS = 6;
const COLS = 7;
type Player = 1 | 2; // 1 = you (green), 2 = AI (red)
type Cell = 0 | Player;
type Grid = Cell[][];

const emptyGrid = (): Grid => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));

const dropRow = (grid: Grid, col: number): number => {
    for (let r = ROWS - 1; r >= 0; r--) if (grid[r][col] === 0) return r;
    return -1;
};

const winnerFrom = (grid: Grid): Player | null => {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const p = grid[r][c];
            if (!p) continue;
            for (const [dr, dc] of dirs) {
                let k = 1;
                while (k < 4) {
                    const nr = r + dr * k, nc = c + dc * k;
                    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || grid[nr][nc] !== p) break;
                    k += 1;
                }
                if (k === 4) return p as Player;
            }
        }
    }
    return null;
};

const validCols = (grid: Grid): number[] => {
    const cols: number[] = [];
    for (let c = 0; c < COLS; c++) if (grid[0][c] === 0) cols.push(c);
    return cols;
};

// Lightweight AI: win now if possible, else block your win, else prefer centre.
const chooseAiMove = (grid: Grid): number => {
    const cols = validCols(grid);
    for (const player of [2, 1] as Player[]) {
        for (const c of cols) {
            const r = dropRow(grid, c);
            const test = grid.map(row => [...row]);
            test[r][c] = player;
            if (winnerFrom(test) === player) return c;
        }
    }
    const centre = [3, 2, 4, 1, 5, 0, 6].filter(c => cols.includes(c));
    return centre[0] ?? cols[0];
};

const ConnectFour: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [grid, setGrid] = useState<Grid>(emptyGrid);
    const [turn, setTurn] = useState<Player>(1);
    const [winner, setWinner] = useState<Player | 'draw' | null>(null);
    const busyRef = useRef(false);

    const reset = useCallback(() => {
        setGrid(emptyGrid());
        setTurn(1);
        setWinner(null);
        busyRef.current = false;
    }, []);

    const applyMove = useCallback((g: Grid, col: number, player: Player): Grid | null => {
        const r = dropRow(g, col);
        if (r < 0) return null;
        const next = g.map(row => [...row]);
        next[r][col] = player;
        return next;
    }, []);

    const handleColumn = useCallback((col: number) => {
        if (winner || turn !== 1 || busyRef.current) return;
        const afterYou = applyMove(grid, col, 1);
        if (!afterYou) return;
        busyRef.current = true;
        setGrid(afterYou);

        const youWin = winnerFrom(afterYou);
        if (youWin) { setWinner(1); busyRef.current = false; return; }
        if (validCols(afterYou).length === 0) { setWinner('draw'); busyRef.current = false; return; }

        setTurn(2);
        // Let the AI respond after a short beat so the drop is visible.
        setTimeout(() => {
            const aiCol = chooseAiMove(afterYou);
            const afterAi = applyMove(afterYou, aiCol, 2);
            if (!afterAi) { busyRef.current = false; return; }
            setGrid(afterAi);
            const aiWin = winnerFrom(afterAi);
            if (aiWin) setWinner(2);
            else if (validCols(afterAi).length === 0) setWinner('draw');
            else setTurn(1);
            busyRef.current = false;
        }, 380);
    }, [grid, turn, winner, applyMove]);

    useEffect(() => reset, [reset]);

    const status = winner === 1 ? 'You win! 🎉'
        : winner === 2 ? 'The AI wins — try again'
        : winner === 'draw' ? "It's a draw"
        : turn === 1 ? 'Your move (green)' : 'AI thinking…';

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                gameId={14}
                title="Connect Four — Play Free Online vs AI"
                keywords={['connect four game', 'connect 4 online', 'play connect four vs computer', 'four in a row game', 'connect four free', 'strategy board game online']}
            />
            <ServicePageHero
                icon={Casino}
                title="Connect Four"
                subtitle="Drop your discs and line up four in a row — horizontally, vertically, or diagonally — before the AI does."
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
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: winner === 2 ? theme.palette.error.main : winner ? primary : 'text.primary' }}>
                            {status}
                        </Typography>
                        <Button size="small" startIcon={<Refresh />} onClick={reset}>New game</Button>
                    </Stack>

                    <Box sx={{
                        p: { xs: 1, sm: 1.5 },
                        borderRadius: '14px',
                        bgcolor: 'rgba(30, 58, 138, 0.25)',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                        gap: { xs: 0.75, sm: 1 },
                        maxWidth: 420,
                        mx: 'auto',
                    }}>
                        {Array.from({ length: COLS }).map((_, c) => (
                            <Box
                                key={c}
                                onClick={() => handleColumn(c)}
                                sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.75, sm: 1 }, cursor: winner || turn !== 1 ? 'default' : 'pointer' }}
                            >
                                {Array.from({ length: ROWS }).map((__, r) => {
                                    const v = grid[r][c];
                                    return (
                                        <Box key={r} sx={{
                                            aspectRatio: '1 / 1',
                                            borderRadius: '50%',
                                            bgcolor: v === 1 ? primary : v === 2 ? '#ef4444' : 'rgba(0,0,0,0.45)',
                                            boxShadow: v ? 'inset 0 -3px 6px rgba(0,0,0,0.35)' : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                                            transition: 'background 0.15s',
                                        }} />
                                    );
                                })}
                            </Box>
                        ))}
                    </Box>

                    {winner && (
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Button variant="contained" onClick={reset}>Play again</Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default ConnectFour;
