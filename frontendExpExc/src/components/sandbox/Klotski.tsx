import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, Card, CardContent,
    Chip, Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { ExpandMore, RestartAlt, ViewQuilt } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import DPadControls, { type Direction } from './shared/DPadControls';
import { useIsPlayModeDevice } from './shared/useFullscreenPlayMode';

const FAQ: { question: string; answer: string }[] = [
    {
        question: 'What is Klotski / Huarong Dao?',
        answer: 'Klotski is the general name for a sliding block puzzle where blocks of different sizes share one board and slide (never lift or jump) until a target piece reaches an exit. The layout used here as "Classic" is the most famous version of it, a Chinese puzzle called Huarong Dao (华容道), themed around General Cao Cao escaping through a narrow pass while blocked by his generals\' troops. The big 2x2 block is Cao Cao, and the goal is to walk him down to the gap at the bottom of the board.',
    },
    {
        question: 'Does the order I make moves in matter?',
        answer: 'It matters for how many moves you use, but not for whether the puzzle is solvable at all. Every slide is reversible - you can always slide a piece back the way it came - so getting "stuck" here just means you have boxed yourself into a longer route, never a dead end you cannot recover from. That is different from a puzzle like Sokoban, where pushing a crate into a corner can end the game for good. In Klotski you can always retreat and try a different order, which is exactly what makes finding the *shortest* solution the real challenge.',
    },
    {
        question: 'Are all Klotski layouts solvable?',
        answer: 'No, and this is a real difference from the classic 15-puzzle, which has a clean parity rule that tells you instantly whether a shuffled board can be solved. Klotski boards mix pieces of different shapes and sizes, so there is no equivalent one-line formula - solvability depends on the specific arrangement and generally has to be settled by search. The two layouts offered here are not randomly generated for exactly that reason: Classic is the historical Huarong Dao arrangement that has been solved for centuries, and Easy was hand-built with a short, direct route to the exit, so both are guaranteed solvable by construction rather than by chance.',
    },
    {
        question: 'How many moves does the Classic board need?',
        answer: 'The commonly cited optimal solution for this exact starting arrangement is 81 single-step slides. That number sounds large mostly because every piece in the way of Cao Cao has to be walked out to the side and back again through a board with very little spare room - at almost every point in the solution, only one or two pieces have anywhere legal to go.',
    },
    {
        question: 'Any tips for solving the Classic board?',
        answer: 'Work from the exit backward in your head: Cao Cao needs a clear 2-wide, 2-tall corridor all the way from the top to the bottom two rows before his final slide down. The four 1x1 soldiers are your most useful pieces because they can tuck into gaps nothing else fits in - use them to plug and unplug space rather than leaving them parked. And try to avoid shuffling the two tall pieces on the left and right edges until you actually need the columns they free up, since moving them early just to "make room" tends to trap you a few moves later.',
    },
];

const ROWS = 5;
const COLS = 4;

type PieceKind = 'cao' | 'vertical' | 'horizontal' | 'single';

interface Piece {
    id: string;
    row: number;
    col: number;
    w: number;
    h: number;
    kind: PieceKind;
}

type LayoutKey = 'classic' | 'easy';

interface LayoutDef {
    label: string;
    par: number;
    pieces: Piece[];
}

/** The historical Huarong Dao starting position: Cao Cao (2x2) boxed in at the
 * top by four soldiers, two tall guards down each side, and one horizontal
 * guard just below him. The exit is the 2-wide gap at the bottom center,
 * which is empty from the start. This exact arrangement has a well-documented
 * solution, so it is used as-is rather than generated. */
const CLASSIC_PIECES: Piece[] = [
    { id: 'cao', row: 0, col: 1, w: 2, h: 2, kind: 'cao' },
    { id: 'v1', row: 0, col: 0, w: 1, h: 2, kind: 'vertical' },
    { id: 'v2', row: 0, col: 3, w: 1, h: 2, kind: 'vertical' },
    { id: 'v3', row: 2, col: 0, w: 1, h: 2, kind: 'vertical' },
    { id: 'v4', row: 2, col: 3, w: 1, h: 2, kind: 'vertical' },
    { id: 'h1', row: 2, col: 1, w: 2, h: 1, kind: 'horizontal' },
    { id: 's1', row: 3, col: 1, w: 1, h: 1, kind: 'single' },
    { id: 's2', row: 3, col: 2, w: 1, h: 1, kind: 'single' },
    { id: 's3', row: 4, col: 0, w: 1, h: 1, kind: 'single' },
    { id: 's4', row: 4, col: 3, w: 1, h: 1, kind: 'single' },
];

/** A hand-built warm-up: Cao Cao's column is blocked by two single soldiers
 * two rows down, with a tall guard down each side. Move the two soldiers out
 * of the way (they have clear floor to slide into on either side) and Cao Cao
 * has an open run straight down - five moves, verified by inspection rather
 * than search, since the whole lower half of the board is empty floor. */
const EASY_PIECES: Piece[] = [
    { id: 'cao', row: 0, col: 1, w: 2, h: 2, kind: 'cao' },
    { id: 'v1', row: 0, col: 0, w: 1, h: 2, kind: 'vertical' },
    { id: 'v2', row: 0, col: 3, w: 1, h: 2, kind: 'vertical' },
    { id: 's1', row: 2, col: 1, w: 1, h: 1, kind: 'single' },
    { id: 's2', row: 2, col: 2, w: 1, h: 1, kind: 'single' },
];

const LAYOUTS: Record<LayoutKey, LayoutDef> = {
    classic: { label: 'Classic', par: 81, pieces: CLASSIC_PIECES },
    easy: { label: 'Easy', par: 5, pieces: EASY_PIECES },
};

/** Cao Cao occupies rows [3,4] and cols [1,2] once he reaches the exit. */
const isExit = (cao: Piece) => cao.row === ROWS - cao.h && cao.col === 1;

const clonePieces = (pieces: Piece[]): Piece[] => pieces.map((p) => ({ ...p }));

/** Occupancy grid keyed by piece id, used for both collision checks and the
 * decorative empty-floor cells underneath the pieces. */
function buildOccupancy(pieces: Piece[]): (string | null)[][] {
    const grid: (string | null)[][] = Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
    pieces.forEach((piece) => {
        for (let r = piece.row; r < piece.row + piece.h; r++) {
            for (let c = piece.col; c < piece.col + piece.w; c++) {
                grid[r][c] = piece.id;
            }
        }
    });
    return grid;
}

const DELTAS: Record<Direction, { dr: number; dc: number }> = {
    UP: { dr: -1, dc: 0 },
    DOWN: { dr: 1, dc: 0 },
    LEFT: { dr: 0, dc: -1 },
    RIGHT: { dr: 0, dc: 1 },
};

function canSlide(piece: Piece, dir: Direction, occupancy: (string | null)[][]): boolean {
    const { dr, dc } = DELTAS[dir];
    for (let r = piece.row; r < piece.row + piece.h; r++) {
        for (let c = piece.col; c < piece.col + piece.w; c++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
            const occupant = occupancy[nr][nc];
            if (occupant !== null && occupant !== piece.id) return false;
        }
    }
    return true;
}

const BEST_KEY_PREFIX = 'sandbox_klotski_best_';

const readBest = (layout: LayoutKey): number | null => {
    try {
        const raw = localStorage.getItem(`${BEST_KEY_PREFIX}${layout}`);
        if (!raw) return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
};

const writeBest = (layout: LayoutKey, moves: number) => {
    try {
        localStorage.setItem(`${BEST_KEY_PREFIX}${layout}`, String(moves));
    } catch {
        // localStorage unavailable - the record just stays in memory for this session.
    }
};

const PIECE_COLOR: Record<PieceKind, (theme: Theme) => string> = {
    cao: (theme) => theme.palette.warning.main,
    vertical: (theme) => theme.palette.info.main,
    horizontal: (theme) => theme.palette.secondary.main,
    single: () => 'rgba(255,255,255,0.28)',
};

const Klotski: React.FC = () => {
    const theme = useTheme();
    const isPlayMode = useIsPlayModeDevice();
    const [layoutKey, setLayoutKey] = useState<LayoutKey>('classic');
    const [pieces, setPieces] = useState<Piece[]>(() => clonePieces(LAYOUTS.classic.pieces));
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [moves, setMoves] = useState(0);
    const [won, setWon] = useState(false);
    const [best, setBest] = useState<number | null>(() => readBest('classic'));

    const layout = LAYOUTS[layoutKey];
    const occupancy = useMemo(() => buildOccupancy(pieces), [pieces]);
    const selectedPiece = useMemo(() => pieces.find((p) => p.id === selectedId) ?? null, [pieces, selectedId]);

    const loadLayout = useCallback((key: LayoutKey) => {
        setLayoutKey(key);
        setPieces(clonePieces(LAYOUTS[key].pieces));
        setSelectedId(null);
        setMoves(0);
        setWon(false);
        setBest(readBest(key));
    }, []);

    const resetLayout = useCallback(() => loadLayout(layoutKey), [loadLayout, layoutKey]);

    const attemptMove = useCallback((direction: Direction) => {
        if (won || !selectedId) return;
        setPieces((prev) => {
            const grid = buildOccupancy(prev);
            const piece = prev.find((p) => p.id === selectedId);
            if (!piece || !canSlide(piece, direction, grid)) return prev;
            const { dr, dc } = DELTAS[direction];
            const next = prev.map((p) => (p.id === piece.id ? { ...p, row: p.row + dr, col: p.col + dc } : p));
            setMoves((m) => m + 1);
            return next;
        });
    }, [won, selectedId]);

    const selectCell = useCallback((cellId: string | null) => {
        if (won) return;
        setSelectedId((prev) => (prev === cellId ? null : cellId));
    }, [won]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey || !selectedId) return;
            const map: Record<string, Direction> = {
                ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
                w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT', W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
            };
            const direction = map[event.key];
            if (direction) {
                event.preventDefault();
                attemptMove(direction);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [attemptMove, selectedId]);

    useEffect(() => {
        if (won) return;
        const cao = pieces.find((p) => p.kind === 'cao');
        if (!cao || !isExit(cao)) return;
        setWon(true);
        setSelectedId(null);
        if (best === null || moves < best) {
            setBest(moves);
            writeBest(layoutKey, moves);
        }
    }, [pieces, won, moves, best, layoutKey]);

    const dpad = (
        <DPadControls
            onDirection={attemptMove}
            accentColor={selectedPiece ? theme.palette.primary.main : 'rgba(255,255,255,0.25)'}
        />
    );

    const cellPx = isPlayMode ? 66 : 78;
    const boardWidth = COLS * cellPx;
    const boardHeight = ROWS * cellPx;

    return (
        <>
            <Seo
                gameId={46}
                title="Klotski - Play the Huarong Dao Sliding Block Puzzle Free"
                description="Play Klotski online for free. Slide Cao Cao's 2x2 block down through the classic Huarong Dao arrangement, or warm up on an easier board. Select a piece and slide it with arrow keys, WASD, or the on-screen pad. Move counter and per-board best score included."
                keywords={['klotski game', 'huarong dao puzzle', 'sliding block puzzle online', 'play klotski free', 'block sliding puzzle', 'chinese sliding puzzle']}
            />
            <GamePlayShell
                icon={ViewQuilt}
                title="Klotski"
                subtitle="Select the big block, then slide it clear of the board. Everything else has to get out of its way first."
                onRestart={resetLayout}
                controls={dpad}
                maxWidth="sm"
            >
                <Card sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: { xs: 1.5, sm: 3 },
                }}>
                    <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                            <ToggleButtonGroup
                                size="small"
                                value={layoutKey}
                                exclusive
                                onChange={(_, value: LayoutKey | null) => value && value !== layoutKey && loadLayout(value)}
                            >
                                {(Object.keys(LAYOUTS) as LayoutKey[]).map((key) => (
                                    <ToggleButton key={key} value={key}>{LAYOUTS[key].label}</ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Stack>

                        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                            <Chip size="small" label={`Moves: ${moves}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip size="small" label={`Par: ${layout.par}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip
                                size="small"
                                label={best === null ? 'Best: none yet' : `Best: ${best}`}
                                sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
                            />
                        </Stack>

                        {won && (
                            <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ textAlign: 'center', mb: 2 }}>
                                {moves <= layout.par ? `Out in ${moves} moves, matching or beating par!` : `Out in ${moves} moves!`}
                            </Typography>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: boardWidth,
                                    height: boardHeight,
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)`,
                                    gridTemplateRows: `repeat(${ROWS}, ${cellPx}px)`,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    bgcolor: 'rgba(0,0,0,0.35)',
                                }}
                                onClick={() => selectCell(null)}
                            >
                                {occupancy.flatMap((row, r) => row.map((_, c) => (
                                    <Box
                                        key={`floor-${r}-${c}`}
                                        sx={{
                                            gridColumn: c + 1,
                                            gridRow: r + 1,
                                            borderRight: '1px solid rgba(255,255,255,0.04)',
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            bgcolor: r >= ROWS - 1 && c >= 1 && c <= 2 ? alpha(theme.palette.success.main, 0.08) : 'transparent',
                                        }}
                                    />
                                )))}

                                {pieces.map((piece) => {
                                    const isSelected = piece.id === selectedId;
                                    const color = PIECE_COLOR[piece.kind](theme);
                                    return (
                                        <Box
                                            key={piece.id}
                                            onClick={(event) => { event.stopPropagation(); selectCell(piece.id); }}
                                            sx={{
                                                position: 'relative',
                                                zIndex: 1,
                                                gridColumn: `${piece.col + 1} / span ${piece.w}`,
                                                gridRow: `${piece.row + 1} / span ${piece.h}`,
                                                m: '3px',
                                                borderRadius: '8px',
                                                cursor: won ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: alpha(color, piece.kind === 'single' ? 0.35 : 0.8),
                                                border: `2px solid ${isSelected ? '#fff' : alpha(color, 0.9)}`,
                                                boxShadow: isSelected ? `0 0 16px ${alpha(color, 0.7)}` : 'none',
                                                transition: 'top 0.12s ease, left 0.12s ease, box-shadow 0.12s ease',
                                            }}
                                        >
                                            {piece.kind === 'cao' && (
                                                <Typography sx={{ fontWeight: 800, color: '#1a1a1a', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                                    CAO CAO
                                                </Typography>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1.5 }}>
                            {selectedPiece
                                ? 'Piece selected - slide it with arrow keys, WASD, or the pad.'
                                : 'Tap a piece to select it, then slide it.'}
                        </Typography>

                        <Stack direction="row" spacing={1.5} justifyContent="center">
                            <Button size="small" variant="outlined" startIcon={<RestartAlt />} onClick={resetLayout}>
                                Reset board
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>

                {!isPlayMode && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                            Frequently asked questions
                        </Typography>
                        <Stack spacing={1}>
                            {FAQ.map((item, i) => (
                                <Accordion
                                    key={i}
                                    disableGutters
                                    sx={{
                                        bgcolor: alpha('#fff', 0.02),
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px !important',
                                        '&:before': { display: 'none' },
                                    }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="body2" fontWeight={700}>{item.question}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Typography variant="body2" color="text.secondary">{item.answer}</Typography>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Stack>
                    </Box>
                )}
            </GamePlayShell>
        </>
    );
};

export default Klotski;
