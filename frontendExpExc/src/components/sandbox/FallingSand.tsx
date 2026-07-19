import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Container, Card, CardContent, Box, Button, Chip, Typography, useTheme } from '@mui/material';
import { Grain, Delete } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

type Material = 'sand' | 'water' | 'wall' | 'empty';

const COLS = 100;
const ROWS = 70;
const TICKS_PER_SEC = 45;
const TICK_INTERVAL = 1000 / TICKS_PER_SEC;

/** A coarse-grid falling-sand cellular automaton. Sand falls straight down then
 * diagonally; water falls and spreads sideways; walls are static. Pure canvas +
 * rAF simulation, no backend. */
const FallingSand: React.FC = () => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gridRef = useRef<Uint8Array>(new Uint8Array(COLS * ROWS)); // 0=empty,1=sand,2=water,3=wall
    const rafRef = useRef<number | null>(null);
    const lastTickRef = useRef<number>(0);
    const cellSizeRef = useRef<number>(6);
    const drawingRef = useRef<boolean>(false);
    const materialRef = useRef<Material>('sand');
    const [material, setMaterial] = useState<Material>('sand');

    useEffect(() => {
        materialRef.current = material;
    }, [material]);

    const materialCode = (m: Material): number => {
        switch (m) {
            case 'sand': return 1;
            case 'water': return 2;
            case 'wall': return 3;
            default: return 0;
        }
    };

    const colorFor = useCallback((code: number): string => {
        switch (code) {
            case 1: return theme.palette.secondary.main; // sand
            case 2: return theme.palette.primary.main; // water
            case 3: return '#8a8a8a'; // wall / stone - neutral gray, not a primary brand color
            default: return 'transparent';
        }
    }, [theme]);

    const idx = (x: number, y: number) => y * COLS + x;

    const simulateStep = useCallback(() => {
        const grid = gridRef.current;
        // Process bottom-to-top so a cell that moves down doesn't get processed again this tick.
        for (let y = ROWS - 1; y >= 0; y--) {
            // Alternate horizontal scan direction per row to avoid directional bias in spreading.
            const leftToRight = y % 2 === 0;
            for (let i = 0; i < COLS; i++) {
                const x = leftToRight ? i : COLS - 1 - i;
                const cur = idx(x, y);
                const code = grid[cur];
                if (code === 0 || code === 3) continue; // empty or wall: nothing to do

                if (code === 1) {
                    // SAND: fall straight down, else diagonally down-left/right
                    if (y + 1 < ROWS) {
                        const below = idx(x, y + 1);
                        if (grid[below] === 0) {
                            grid[below] = code;
                            grid[cur] = 0;
                            continue;
                        }
                        if (grid[below] === 2) {
                            // displace water upward (sand sinks)
                            grid[below] = code;
                            grid[cur] = 2;
                            continue;
                        }
                        const dir = Math.random() < 0.5 ? -1 : 1;
                        const firstX = x + dir;
                        const secondX = x - dir;
                        if (firstX >= 0 && firstX < COLS && grid[idx(firstX, y + 1)] === 0) {
                            grid[idx(firstX, y + 1)] = code;
                            grid[cur] = 0;
                            continue;
                        }
                        if (secondX >= 0 && secondX < COLS && grid[idx(secondX, y + 1)] === 0) {
                            grid[idx(secondX, y + 1)] = code;
                            grid[cur] = 0;
                            continue;
                        }
                    }
                } else if (code === 2) {
                    // WATER: fall straight down, else diagonally, else spread sideways
                    if (y + 1 < ROWS) {
                        const below = idx(x, y + 1);
                        if (grid[below] === 0) {
                            grid[below] = code;
                            grid[cur] = 0;
                            continue;
                        }
                        const dir = Math.random() < 0.5 ? -1 : 1;
                        const firstX = x + dir;
                        const secondX = x - dir;
                        if (firstX >= 0 && firstX < COLS && grid[idx(firstX, y + 1)] === 0) {
                            grid[idx(firstX, y + 1)] = code;
                            grid[cur] = 0;
                            continue;
                        }
                        if (secondX >= 0 && secondX < COLS && grid[idx(secondX, y + 1)] === 0) {
                            grid[idx(secondX, y + 1)] = code;
                            grid[cur] = 0;
                            continue;
                        }
                    }
                    // spread sideways on same row to find open space
                    const dir2 = Math.random() < 0.5 ? -1 : 1;
                    const sx1 = x + dir2;
                    const sx2 = x - dir2;
                    if (sx1 >= 0 && sx1 < COLS && grid[idx(sx1, y)] === 0) {
                        grid[idx(sx1, y)] = code;
                        grid[cur] = 0;
                        continue;
                    }
                    if (sx2 >= 0 && sx2 < COLS && grid[idx(sx2, y)] === 0) {
                        grid[idx(sx2, y)] = code;
                        grid[cur] = 0;
                        continue;
                    }
                }
            }
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            // Grid cell size is derived from the container's width only (height follows
            // from ROWS * cellSize) so the grid keeps its fixed column/row aspect ratio.
            const width = Math.max(1, Math.floor(rect.width));
            const cellSize = Math.max(2, Math.floor(width / COLS));
            cellSizeRef.current = cellSize;
            const canvasWidth = cellSize * COLS;
            const canvasHeight = cellSize * ROWS;
            canvas.width = Math.floor(canvasWidth * dpr);
            canvas.height = Math.floor(canvasHeight * dpr);
            canvas.style.width = `${canvasWidth}px`;
            canvas.style.height = `${canvasHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        const handleResize = () => resize();
        window.addEventListener('resize', handleResize);

        const render = () => {
            const grid = gridRef.current;
            const cellSize = cellSizeRef.current;
            ctx.clearRect(0, 0, COLS * cellSize, ROWS * cellSize);
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const code = grid[idx(x, y)];
                    if (code === 0) continue;
                    ctx.fillStyle = colorFor(code);
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        };

        const loop = (now: number) => {
            if (now - lastTickRef.current >= TICK_INTERVAL) {
                simulateStep();
                lastTickRef.current = now;
            }
            render();
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorFor, simulateStep]);

    const paintAt = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const cellSize = cellSizeRef.current;
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;
        const gx = Math.floor(localX / cellSize);
        const gy = Math.floor(localY / cellSize);
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;
        const code = materialCode(materialRef.current);
        const grid = gridRef.current;
        // Paint a small brush (3x3) for a more usable drawing experience.
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const px = gx + dx;
                const py = gy + dy;
                if (px < 0 || px >= COLS || py < 0 || py >= ROWS) continue;
                grid[idx(px, py)] = code;
            }
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        drawingRef.current = true;
        paintAt(e.clientX, e.clientY);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        paintAt(e.clientX, e.clientY);
    };

    const stopDrawing = () => {
        drawingRef.current = false;
    };

    const handleClear = () => {
        gridRef.current.fill(0);
    };

    const materials: { key: Material; label: string }[] = [
        { key: 'sand', label: 'Sand' },
        { key: 'water', label: 'Water' },
        { key: 'wall', label: 'Wall' },
    ];

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Seo title="Falling Sand Sandbox - Cellular Automaton Toy" gameId={5} />
            <ServicePageHero
                icon={Grain}
                title="Falling Sand"
                subtitle="A tiny falling-sand simulator. Pick a material and draw on the grid - sand piles up, water spreads, walls stay put."
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
                            bgcolor: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            mb: 3,
                            display: 'flex',
                            justifyContent: 'center',
                            touchAction: 'none',
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={stopDrawing}
                            onPointerLeave={stopDrawing}
                            onPointerCancel={stopDrawing}
                            style={{ display: 'block', cursor: 'crosshair' }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            Material:
                        </Typography>
                        {materials.map((m) => (
                            <Chip
                                key={m.key}
                                label={m.label}
                                clickable
                                color={material === m.key ? 'primary' : 'default'}
                                variant={material === m.key ? 'filled' : 'outlined'}
                                onClick={() => setMaterial(m.key)}
                            />
                        ))}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button variant="outlined" startIcon={<Delete />} onClick={handleClear}>
                            Clear
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default FallingSand;
