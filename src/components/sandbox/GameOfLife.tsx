import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Button, Typography, useTheme } from '@mui/material';
import { GridView, Delete, PlayArrow, Pause, Casino } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const COLS = 60;
const ROWS = 40;
const STEP_MS = 120;

/** Conway's Game of Life: click cells to seed a pattern, then run the
 * classic four rules (underpopulation, survival, overcrowding, reproduction)
 * generation by generation. Pure canvas + interval, no backend. */
const GameOfLife: React.FC = () => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gridRef = useRef<Uint8Array>(new Uint8Array(COLS * ROWS));
    const cellSizeRef = useRef(6);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [running, setRunning] = useState(false);
    const [generation, setGeneration] = useState(0);

    const idx = (x: number, y: number) => y * COLS + x;

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const cellSize = cellSizeRef.current;
        ctx.fillStyle = '#050608';
        ctx.fillRect(0, 0, COLS * cellSize, ROWS * cellSize);
        ctx.fillStyle = theme.palette.primary.main;
        const grid = gridRef.current;
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[idx(x, y)]) {
                    ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 1, cellSize - 1);
                }
            }
        }
    }, [theme]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const width = Math.max(1, Math.floor(rect.width));
            const cellSize = Math.max(4, Math.floor(width / COLS));
            cellSizeRef.current = cellSize;
            const canvasWidth = cellSize * COLS;
            const canvasHeight = cellSize * ROWS;
            canvas.width = Math.floor(canvasWidth * dpr);
            canvas.height = Math.floor(canvasHeight * dpr);
            canvas.style.width = `${canvasWidth}px`;
            canvas.style.height = `${canvasHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            render();
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [render]);

    const step = useCallback(() => {
        const grid = gridRef.current;
        const next = new Uint8Array(COLS * ROWS);
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = (x + dx + COLS) % COLS;
                        const ny = (y + dy + ROWS) % ROWS;
                        neighbors += grid[idx(nx, ny)];
                    }
                }
                const alive = grid[idx(x, y)];
                next[idx(x, y)] = alive ? (neighbors === 2 || neighbors === 3 ? 1 : 0) : (neighbors === 3 ? 1 : 0);
            }
        }
        gridRef.current = next;
        setGeneration((g) => g + 1);
        render();
    }, [render]);

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(step, STEP_MS);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [running, step]);

    const toggleCellAt = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const cellSize = cellSizeRef.current;
        const gx = Math.floor((clientX - rect.left) / cellSize);
        const gy = Math.floor((clientY - rect.top) / cellSize);
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;
        const grid = gridRef.current;
        grid[idx(gx, gy)] = grid[idx(gx, gy)] ? 0 : 1;
        render();
    };

    const handleRandomize = () => {
        const grid = gridRef.current;
        for (let i = 0; i < grid.length; i++) {
            grid[i] = Math.random() < 0.25 ? 1 : 0;
        }
        setGeneration(0);
        render();
    };

    const handleClear = () => {
        gridRef.current.fill(0);
        setRunning(false);
        setGeneration(0);
        render();
    };

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Conway's Game of Life - Cellular Automaton" gameId={18} />
            <ServicePageHero
                icon={GridView}
                title="Game of Life"
                subtitle="Click cells to seed a pattern, then watch Conway's four simple rules produce gliders, oscillators, and chaos."
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
                    <Box
                        ref={containerRef}
                        sx={{
                            width: '100%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            bgcolor: '#050608',
                            border: '1px solid rgba(255,255,255,0.08)',
                            mb: 3,
                            display: 'flex',
                            justifyContent: 'center',
                            touchAction: 'none',
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            onPointerDown={(e) => toggleCellAt(e.clientX, e.clientY)}
                            style={{ display: 'block', cursor: 'pointer' }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Generation: <strong>{generation}</strong>
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        <Button
                            variant="contained"
                            startIcon={running ? <Pause /> : <PlayArrow />}
                            onClick={() => setRunning((r) => !r)}
                        >
                            {running ? 'Pause' : 'Run'}
                        </Button>
                        <Button variant="outlined" startIcon={<Casino />} onClick={handleRandomize}>
                            Randomize
                        </Button>
                        <Button variant="outlined" startIcon={<Delete />} onClick={handleClear}>
                            Clear
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default GameOfLife;
