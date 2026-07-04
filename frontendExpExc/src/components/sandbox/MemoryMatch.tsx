import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography, useTheme } from '@mui/material';
import { Extension, Refresh } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageHero from '../services/ServicePageHero';

const BEST_KEY = 'sandbox_memory_match_best_moves';
const SYMBOLS = ['🚀', '⚡', '🎯', '🧩', '🎨', '🔮', '🎲', '💎'];

interface Tile {
    id: number;
    symbol: string;
    flipped: boolean;
    matched: boolean;
}

const buildDeck = (): Tile[] => {
    const pairs = [...SYMBOLS, ...SYMBOLS];
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs.map((symbol, id) => ({ id, symbol, flipped: false, matched: false }));
};

const loadBest = (): number | null => {
    try {
        const raw = localStorage.getItem(BEST_KEY);
        const n = raw ? Number(raw) : NaN;
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    }
};

const MemoryMatch: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [tiles, setTiles] = useState<Tile[]>(buildDeck);
    const [, setSelected] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [best, setBest] = useState<number | null>(() => loadBest());
    const [won, setWon] = useState(false);
    const lockRef = useRef(false);

    const reset = useCallback(() => {
        setTiles(buildDeck());
        setSelected([]);
        setMoves(0);
        setWon(false);
        lockRef.current = false;
    }, []);

    const handleFlip = useCallback((index: number) => {
        if (lockRef.current) return;
        setTiles(prev => {
            const tile = prev[index];
            if (tile.flipped || tile.matched) return prev;
            const next = prev.map((t, i) => (i === index ? { ...t, flipped: true } : t));
            setSelected(sel => {
                const newSel = [...sel, index];
                if (newSel.length === 2) {
                    lockRef.current = true;
                    setMoves(m => m + 1);
                    const [a, b] = newSel;
                    if (next[a].symbol === next[b].symbol) {
                        setTimeout(() => {
                            setTiles(t => t.map((x, i) => (i === a || i === b ? { ...x, matched: true } : x)));
                            setSelected([]);
                            lockRef.current = false;
                        }, 350);
                    } else {
                        setTimeout(() => {
                            setTiles(t => t.map((x, i) => (i === a || i === b ? { ...x, flipped: false } : x)));
                            setSelected([]);
                            lockRef.current = false;
                        }, 800);
                    }
                }
                return newSel.length === 2 ? [] : newSel;
            });
            return next;
        });
    }, []);

    useEffect(() => {
        if (tiles.length > 0 && tiles.every(t => t.matched) && !won) {
            setWon(true);
            const finalMoves = moves;
            if (best === null || finalMoves < best) {
                setBest(finalMoves);
                try { localStorage.setItem(BEST_KEY, String(finalMoves)); } catch { /* ignore */ }
            }
        }
    }, [tiles, moves, best, won]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Seo
                title="Memory Match — Free Online Card Matching Game"
                keywords={['memory match game', 'card matching game', 'concentration game online', 'memory game free', 'brain training game', 'pairs matching game']}
            />
            <ServicePageHero
                icon={Extension}
                title="Memory Match"
                subtitle="Flip cards two at a time and match every pair in as few moves as possible."
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
                        <Typography variant="body1"><strong>Moves:</strong> {moves}</Typography>
                        <Typography variant="body1" color="text.secondary">
                            Best: {best ?? '—'}
                        </Typography>
                        <Button size="small" startIcon={<Refresh />} onClick={reset}>New game</Button>
                    </Stack>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: { xs: 1, sm: 1.5 },
                    }}>
                        {tiles.map((tile, index) => {
                            const showFace = tile.flipped || tile.matched;
                            return (
                                <Box
                                    key={tile.id}
                                    onClick={() => handleFlip(index)}
                                    sx={{
                                        aspectRatio: '1 / 1',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: { xs: '1.8rem', sm: '2.2rem' },
                                        cursor: showFace ? 'default' : 'pointer',
                                        userSelect: 'none',
                                        transition: 'transform 0.2s, background 0.2s, border-color 0.2s',
                                        transform: showFace ? 'rotateY(0deg)' : 'none',
                                        bgcolor: showFace ? `${primary}22` : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${tile.matched ? primary : 'rgba(255,255,255,0.08)'}`,
                                        opacity: tile.matched ? 0.55 : 1,
                                        '&:hover': showFace ? {} : { borderColor: `${primary}88`, transform: 'translateY(-2px)' },
                                    }}
                                >
                                    {showFace ? tile.symbol : ''}
                                </Box>
                            );
                        })}
                    </Box>

                    {won && (
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ color: primary, fontWeight: 800 }}>
                                Solved in {moves} moves! 🎉
                            </Typography>
                            <Button variant="contained" onClick={reset} sx={{ mt: 1.5 }}>Play again</Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default MemoryMatch;
