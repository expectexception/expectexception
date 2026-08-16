import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, Button, Stack, useTheme, alpha } from '@mui/material';
import { Style, Replay } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

type Suit = 'S' | 'H' | 'D' | 'C';
const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS: Suit[] = ['H', 'D'];
const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

interface PlayingCard {
    id: string;
    suit: Suit;
    rank: number; // 1-13
    faceUp: boolean;
}

type Selection = { source: 'waste' } | { source: 'tableau'; col: number; index: number } | null;

const CARD_W = 40;
const CARD_H = 56;
const STACK_STEP = 16;

const rankLabel = (rank: number) => RANK_LABEL[rank] || String(rank);
const isRed = (suit: Suit) => RED_SUITS.includes(suit);

const buildShuffledDeck = (): PlayingCard[] => {
    const deck: PlayingCard[] = [];
    SUITS.forEach((suit) => {
        for (let rank = 1; rank <= 13; rank++) {
            deck.push({ id: `${suit}${rank}`, suit, rank, faceUp: false });
        }
    });
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

interface DealResult {
    tableau: PlayingCard[][];
    stock: PlayingCard[];
}

const dealNewGame = (): DealResult => {
    const deck = buildShuffledDeck();
    const tableau: PlayingCard[][] = [[], [], [], [], [], [], []];
    let cursor = 0;
    for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
            const card = deck[cursor++];
            card.faceUp = row === col;
            tableau[col].push(card);
        }
    }
    const stock = deck.slice(cursor);
    return { tableau, stock };
};

/** Klondike Solitaire. Tap a face-up card to select it (and every card on top
 * of it, i.e. the run below it in the column), then tap a destination pile -
 * a foundation or another tableau column - to move it there. No drag-and-drop
 * needed, so it works the same on mouse and touch. */
const Solitaire: React.FC = () => {
    const theme = useTheme();
    const initialDeal = useMemo(() => dealNewGame(), []);
    const [tableau, setTableau] = useState<PlayingCard[][]>(initialDeal.tableau);
    const [stock, setStock] = useState<PlayingCard[]>(initialDeal.stock);
    const [waste, setWaste] = useState<PlayingCard[]>([]);
    const [foundations, setFoundations] = useState<Record<Suit, PlayingCard[]>>({ S: [], H: [], D: [], C: [] });
    const [selection, setSelection] = useState<Selection>(null);
    const [moves, setMoves] = useState(0);

    const isWon = useMemo(
        () => SUITS.every((s) => foundations[s].length === 13),
        [foundations]
    );

    const newGame = useCallback(() => {
        const deal = dealNewGame();
        setTableau(deal.tableau);
        setStock(deal.stock);
        setWaste([]);
        setFoundations({ S: [], H: [], D: [], C: [] });
        setSelection(null);
        setMoves(0);
    }, []);

    const drawStock = () => {
        if (stock.length === 0) {
            if (waste.length === 0) return;
            const recycled = [...waste].reverse().map((c) => ({ ...c, faceUp: false }));
            setStock(recycled);
            setWaste([]);
            setSelection(null);
            return;
        }
        const next = [...stock];
        const drawn = { ...next.pop()!, faceUp: true };
        setStock(next);
        setWaste((w) => [...w, drawn]);
        setSelection(null);
    };

    const clearSelection = () => setSelection(null);

    const selectWasteTop = () => {
        if (waste.length === 0) return;
        setSelection((prev) => (prev && prev.source === 'waste' ? null : { source: 'waste' }));
    };

    const selectTableauCard = (col: number, index: number) => {
        const card = tableau[col][index];
        if (!card || !card.faceUp) return;
        setSelection((prev) =>
            prev && prev.source === 'tableau' && prev.col === col && prev.index === index
                ? null
                : { source: 'tableau', col, index }
        );
    };

    const getHeldRun = (): PlayingCard[] => {
        if (!selection) return [];
        if (selection.source === 'waste') return waste.length ? [waste[waste.length - 1]] : [];
        return tableau[selection.col].slice(selection.index);
    };

    const removeHeldRun = () => {
        if (!selection) return;
        if (selection.source === 'waste') {
            setWaste((w) => w.slice(0, -1));
            return;
        }
        setTableau((cols) => {
            const next = cols.map((c) => [...c]);
            next[selection.col] = next[selection.col].slice(0, selection.index);
            const col = next[selection.col];
            if (col.length > 0 && !col[col.length - 1].faceUp) {
                col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
            }
            return next;
        });
    };

    const moveToFoundation = (suit: Suit) => {
        const held = getHeldRun();
        if (held.length !== 1) return;
        const card = held[0];
        if (card.suit !== suit) return;
        const pile = foundations[suit];
        const nextRankNeeded = pile.length === 0 ? 1 : pile[pile.length - 1].rank + 1;
        if (card.rank !== nextRankNeeded) return;
        removeHeldRun();
        setFoundations((f) => ({ ...f, [suit]: [...f[suit], card] }));
        setMoves((m) => m + 1);
        setSelection(null);
    };

    const moveToTableau = (destCol: number) => {
        const held = getHeldRun();
        if (held.length === 0) return;
        if (selection && selection.source === 'tableau' && selection.col === destCol) return;
        const destPile = tableau[destCol];
        const top = destPile[destPile.length - 1];
        const bottomOfHeld = held[0];
        const valid = top
            ? isRed(top.suit) !== isRed(bottomOfHeld.suit) && top.rank === bottomOfHeld.rank + 1
            : bottomOfHeld.rank === 13;
        if (!valid) return;
        removeHeldRun();
        setTableau((cols) => {
            const next = cols.map((c) => [...c]);
            next[destCol] = [...next[destCol], ...held];
            return next;
        });
        setMoves((m) => m + 1);
        setSelection(null);
    };

    const isSelected = (source: 'waste' | 'tableau', col?: number, index?: number) => {
        if (!selection) return false;
        if (selection.source === 'waste') return source === 'waste';
        return source === 'tableau' && selection.col === col && index !== undefined && index >= selection.index;
    };

    const renderCardFace = (card: PlayingCard, selected: boolean) => (
        <Box
            sx={{
                width: CARD_W,
                height: CARD_H,
                borderRadius: '6px',
                bgcolor: card.faceUp ? '#f4f4f4' : alpha(theme.palette.primary.main, 0.35),
                border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(0,0,0,0.4)',
                boxShadow: selected ? `0 0 10px ${alpha(theme.palette.primary.main, 0.6)}` : '0 2px 4px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.faceUp ? (isRed(card.suit) ? '#c62828' : '#111111') : 'transparent',
                fontWeight: 800,
                fontSize: '0.75rem',
                lineHeight: 1.1,
                userSelect: 'none',
            }}
        >
            {card.faceUp ? (
                <>
                    <span>{rankLabel(card.rank)}</span>
                    <span style={{ fontSize: '0.95rem' }}>{SUIT_SYMBOL[card.suit]}</span>
                </>
            ) : null}
        </Box>
    );

    const cardRef = React.useRef<HTMLDivElement | null>(null);

    return (
        <>
            <Seo title="Play Solitaire (Klondike) Online - Free Card Game" gameId={30} />
            <GamePlayShell
                icon={Style}
                title="Solitaire"
                subtitle="Classic Klondike solitaire. Tap a card to pick it up, tap a foundation or column to place it - no dragging required."
                onRestart={newGame}
            >
                <Card
                    ref={cardRef}
                    sx={{
                        background: 'rgba(13, 14, 18, 0.5)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: { xs: '16px', sm: '24px' },
                        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                        p: { xs: 1.25, sm: 3 },
                    }}
                >
                    <CardContent sx={{ p: { xs: 0.5, sm: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="body2" fontWeight={800}>
                                Moves: {moves}
                            </Typography>
                            {isWon && (
                                <Typography variant="body2" fontWeight={900} color="primary.main">
                                    You won! 🎉
                                </Typography>
                            )}
                            <Button size="small" variant="outlined" startIcon={<Replay />} onClick={newGame} sx={{ borderRadius: '10px' }}>
                                New Game
                            </Button>
                        </Stack>

                        {/* Stock / Waste / Foundations row */}
                        <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                            <Box onClick={drawStock} sx={{ cursor: 'pointer' }}>
                                {stock.length > 0 ? (
                                    renderCardFace({ id: 'stock', suit: 'S', rank: 0, faceUp: false }, false)
                                ) : (
                                    <Box sx={{ width: CARD_W, height: CARD_H, borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.25)' }} />
                                )}
                            </Box>
                            <Box onClick={selectWasteTop}>
                                {waste.length > 0 ? (
                                    renderCardFace(waste[waste.length - 1], isSelected('waste'))
                                ) : (
                                    <Box sx={{ width: CARD_W, height: CARD_H, borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.15)' }} />
                                )}
                            </Box>
                            <Box sx={{ width: 16 }} />
                            {SUITS.map((suit) => {
                                const pile = foundations[suit];
                                const top = pile[pile.length - 1];
                                return (
                                    <Box key={suit} onClick={() => moveToFoundation(suit)}>
                                        {top ? (
                                            renderCardFace(top, false)
                                        ) : (
                                            <Box
                                                sx={{
                                                    width: CARD_W,
                                                    height: CARD_H,
                                                    borderRadius: '6px',
                                                    border: '1px dashed rgba(255,255,255,0.25)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: isRed(suit) ? alpha('#c62828', 0.6) : 'rgba(255,255,255,0.3)',
                                                    fontSize: '1.1rem',
                                                }}
                                            >
                                                {SUIT_SYMBOL[suit]}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </Stack>

                        {/* Tableau columns */}
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                            {tableau.map((col, colIdx) => (
                                <Box
                                    key={colIdx}
                                    onClick={() => moveToTableau(colIdx)}
                                    sx={{ position: 'relative', width: CARD_W, minHeight: CARD_H + STACK_STEP * 6 }}
                                >
                                    {col.length === 0 && (
                                        <Box sx={{ width: CARD_W, height: CARD_H, borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.15)' }} />
                                    )}
                                    {col.map((card, idx) => (
                                        <Box
                                            key={card.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                selectTableauCard(colIdx, idx);
                                            }}
                                            sx={{ position: 'absolute', top: idx * STACK_STEP, left: 0 }}
                                        >
                                            {renderCardFace(card, isSelected('tableau', colIdx, idx))}
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                        </Stack>

                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Button size="small" variant="text" onClick={clearSelection} disabled={!selection} sx={{ borderRadius: '10px' }}>
                                Deselect
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default Solitaire;
