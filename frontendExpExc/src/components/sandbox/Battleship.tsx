import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Anchor, Casino, Close, LocalFireDepartment, Rotate90DegreesCcw } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

const BOARD_SIZE = 10;
const AI_MOVE_DELAY = 650;

type ShipId = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';
type Orientation = 'horizontal' | 'vertical';
type ShotResult = 'hit' | 'miss';
type AIMode = 'hunt' | 'target';

interface ShipSpec {
    id: ShipId;
    name: string;
    size: number;
}

/** The standard Battleship fleet: 5 ships totalling 17 cells. */
const SHIP_SPECS: ShipSpec[] = [
    { id: 'carrier', name: 'Carrier', size: 5 },
    { id: 'battleship', name: 'Battleship', size: 4 },
    { id: 'cruiser', name: 'Cruiser', size: 3 },
    { id: 'submarine', name: 'Submarine', size: 3 },
    { id: 'destroyer', name: 'Destroyer', size: 2 },
];

const shipName = (id: ShipId): string => SHIP_SPECS.find((s) => s.id === id)?.name ?? id;

interface PlacedShip {
    id: ShipId;
    /** Cell keys ("row-col") this ship occupies, length equal to its spec's size. */
    cells: string[];
}

type ShotMap = Record<string, ShotResult>;

interface FleetState {
    ships: PlacedShip[];
    /** Shots fired AT this fleet by the opponent, keyed by cell. */
    shots: ShotMap;
}

/** The attacking AI's hunt/target state machine. In 'hunt' mode it fires blind at
 * unexplored cells; once it lands a hit it switches to 'target' mode and tracks every
 * confirmed hit belonging to the ship currently being hunted down. */
interface AITargeting {
    mode: AIMode;
    hits: [number, number][];
}

interface ShotFeedback {
    row: number;
    col: number;
    result: ShotResult;
    sunk: boolean;
    shipName: string | null;
}

interface BattleState {
    turn: 'player' | 'ai';
    playerFleet: FleetState;
    aiFleet: FleetState;
    aiTargeting: AITargeting;
    lastPlayerShot: ShotFeedback | null;
    lastAiShot: ShotFeedback | null;
}

type Phase = 'placement' | 'battle';

interface Stats {
    wins: number;
    losses: number;
    shotsFired: number;
    hits: number;
}

const STATS_KEY = 'sandbox_battleship_stats';
const DEFAULT_STATS: Stats = { wins: 0, losses: 0, shotsFired: 0, hits: 0 };

const readStats = (): Stats => {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return DEFAULT_STATS;
        const parsed = JSON.parse(raw);
        return {
            wins: Number.isFinite(parsed.wins) ? parsed.wins : 0,
            losses: Number.isFinite(parsed.losses) ? parsed.losses : 0,
            shotsFired: Number.isFinite(parsed.shotsFired) ? parsed.shotsFired : 0,
            hits: Number.isFinite(parsed.hits) ? parsed.hits : 0,
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

const cellKey = (row: number, col: number): string => `${row}-${col}`;

const inBounds = (row: number, col: number): boolean =>
    row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

/** Cells a ship of `size` would occupy anchored at (row, col), extending right
 * (horizontal) or down (vertical). Returns null if any cell would fall off the grid. */
const shipCellsAt = (row: number, col: number, size: number, orientation: Orientation): [number, number][] | null => {
    const cells: [number, number][] = [];
    for (let i = 0; i < size; i++) {
        const r = orientation === 'vertical' ? row + i : row;
        const c = orientation === 'horizontal' ? col + i : col;
        if (!inBounds(r, c)) return null;
        cells.push([r, c]);
    }
    return cells;
};

const hasOverlap = (cells: [number, number][], occupied: Set<string>): boolean =>
    cells.some(([r, c]) => occupied.has(cellKey(r, c)));

const isShipSunk = (ship: PlacedShip, shots: ShotMap): boolean => ship.cells.every((key) => shots[key] === 'hit');

const MAX_PLACEMENT_ATTEMPTS = 400;

/** Randomly places the full fleet with no overlaps and nothing hanging off the
 * grid. 400 random attempts per ship against a 10x10 board (at most 17 cells ever
 * occupied) succeeds in practice essentially every time. */
const randomFleetPlacement = (): PlacedShip[] => {
    const placed: PlacedShip[] = [];
    const occupied = new Set<string>();
    for (const spec of SHIP_SPECS) {
        for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
            const orientation: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            const row = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE);
            const cells = shipCellsAt(row, col, spec.size, orientation);
            if (!cells || hasOverlap(cells, occupied)) continue;
            const keys = cells.map(([r, c]) => cellKey(r, c));
            keys.forEach((k) => occupied.add(k));
            placed.push({ id: spec.id, cells: keys });
            break;
        }
    }
    return placed;
};

// ─── AI targeting ───────────────────────────────────────────────────────────

const orthogonalNeighbors = (row: number, col: number): [number, number][] =>
    ([[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]] as [number, number][]).filter(([r, c]) => inBounds(r, c));

/** Hunt mode: fire at a random untried cell, preferring a checkerboard parity -
 * since every ship is at least 2 cells long, a checkerboard pattern is guaranteed
 * to touch every possible ship placement, so it never wastes a shot a ship could
 * hide from. Falls back to any untried cell once that parity runs out. */
const pickHuntCell = (tried: Set<string>): [number, number] => {
    const checkerboard: [number, number][] = [];
    const anyUntried: [number, number][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (tried.has(cellKey(r, c))) continue;
            anyUntried.push([r, c]);
            if ((r + c) % 2 === 0) checkerboard.push([r, c]);
        }
    }
    const pool = checkerboard.length > 0 ? checkerboard : anyUntried;
    if (pool.length === 0) return [0, 0]; // unreachable: the game ends once a fleet is destroyed, well before this
    return pool[Math.floor(Math.random() * pool.length)];
};

/** Target mode: given the confirmed hits on the ship currently being hunted, work out
 * where to fire next. One hit so far -> try its 4 orthogonal neighbors. Two or more
 * collinear hits -> a direction is confirmed, so only the two cells extending the line
 * past either end are candidates; a miss (which is already reflected in `tried`) at one
 * end naturally drops that end and leaves the other end as the sole remaining candidate,
 * which is exactly the "back off and try the other direction" behavior. */
const computeTargetQueue = (hits: [number, number][], tried: Set<string>): [number, number][] => {
    if (hits.length === 0) return [];
    if (hits.length === 1) {
        return orthogonalNeighbors(hits[0][0], hits[0][1]).filter(([r, c]) => !tried.has(cellKey(r, c)));
    }
    const rows = hits.map((h) => h[0]);
    const cols = hits.map((h) => h[1]);
    const sameRow = rows.every((r) => r === rows[0]);
    const sameCol = cols.every((c) => c === cols[0]);

    let candidates: [number, number][];
    if (sameRow) {
        const r = rows[0];
        candidates = [[r, Math.min(...cols) - 1], [r, Math.max(...cols) + 1]];
    } else if (sameCol) {
        const c = cols[0];
        candidates = [[Math.min(...rows) - 1, c], [Math.max(...rows) + 1, c]];
    } else {
        // Hits aren't collinear - can happen if a neighbor probe landed on a different,
        // adjacent ship. Fall back to probing around the most recent hit.
        candidates = orthogonalNeighbors(hits[hits.length - 1][0], hits[hits.length - 1][1]);
    }
    return candidates.filter(([r, c]) => inBounds(r, c) && !tried.has(cellKey(r, c)));
};

/** Picks the AI's next shot. `huntFallback` is true whenever target mode had no viable
 * candidate left (e.g. both ends of a confirmed line already tried) and the AI dropped
 * back to blind hunting - the caller uses this to discard the now-stale hit history. */
const chooseAiShot = (targeting: AITargeting, tried: Set<string>): { cell: [number, number]; huntFallback: boolean } => {
    if (targeting.mode === 'target' && targeting.hits.length > 0) {
        const queue = computeTargetQueue(targeting.hits, tried);
        if (queue.length > 0) return { cell: queue[0], huntFallback: false };
    }
    return { cell: pickHuntCell(tried), huntFallback: true };
};

// ─── Colors ─────────────────────────────────────────────────────────────────

const WATER_COLOR = '#0a2b45';
const SHIP_COLOR = '#7c8a9c';
const HIT_COLOR = '#c62828';
const SUNK_COLOR = '#2a1212';

// ─── Component ───────────────────────────────────────────────────────────────

const createInitialTargeting = (): AITargeting => ({ mode: 'hunt', hits: [] });

const Battleship: React.FC = () => {
    const theme = useTheme();

    const [phase, setPhase] = useState<Phase>('placement');
    const [orientation, setOrientation] = useState<Orientation>('horizontal');
    const [placedShips, setPlacedShips] = useState<PlacedShip[]>([]);
    const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
    const [battle, setBattle] = useState<BattleState | null>(null);
    const [stats, setStats] = useState<Stats>(readStats);
    const [statsRecorded, setStatsRecorded] = useState(false);

    const resetGame = useCallback(() => {
        setPhase('placement');
        setOrientation('horizontal');
        setPlacedShips([]);
        setHoverCell(null);
        setBattle(null);
        setStatsRecorded(false);
    }, []);

    // ── Placement phase ──
    const occupiedDuringPlacement = useMemo(
        () => new Set(placedShips.flatMap((s) => s.cells)),
        [placedShips]
    );
    const currentShip = useMemo(
        () => SHIP_SPECS.find((spec) => !placedShips.some((p) => p.id === spec.id)) ?? null,
        [placedShips]
    );
    const allShipsPlaced = placedShips.length === SHIP_SPECS.length;

    const previewCells = useMemo(() => {
        if (!hoverCell || !currentShip) return null;
        const cells = shipCellsAt(hoverCell[0], hoverCell[1], currentShip.size, orientation);
        if (!cells) return { cells: [] as [number, number][], valid: false };
        return { cells, valid: !hasOverlap(cells, occupiedDuringPlacement) };
    }, [hoverCell, currentShip, orientation, occupiedDuringPlacement]);

    const handlePlaceClick = (row: number, col: number) => {
        if (!currentShip) return;
        const cells = shipCellsAt(row, col, currentShip.size, orientation);
        if (!cells || hasOverlap(cells, occupiedDuringPlacement)) return;
        setPlacedShips((prev) => [...prev, { id: currentShip.id, cells: cells.map(([r, c]) => cellKey(r, c)) }]);
        setHoverCell(null);
    };

    const randomizePlacement = () => {
        setPlacedShips(randomFleetPlacement());
        setHoverCell(null);
    };

    const clearPlacement = () => {
        setPlacedShips([]);
        setHoverCell(null);
    };

    const startBattle = () => {
        if (!allShipsPlaced) return;
        setBattle({
            turn: 'player',
            playerFleet: { ships: placedShips, shots: {} },
            aiFleet: { ships: randomFleetPlacement(), shots: {} },
            aiTargeting: createInitialTargeting(),
            lastPlayerShot: null,
            lastAiShot: null,
        });
        setPhase('battle');
    };

    // ── Battle phase ──
    const playerWon = useMemo(
        () => (battle ? battle.aiFleet.ships.every((s) => isShipSunk(s, battle.aiFleet.shots)) : false),
        [battle]
    );
    const aiWon = useMemo(
        () => (battle ? battle.playerFleet.ships.every((s) => isShipSunk(s, battle.playerFleet.shots)) : false),
        [battle]
    );
    const gameOver = playerWon || aiWon;

    // Record the win/loss tally exactly once per finished game.
    useEffect(() => {
        if (!battle || !gameOver || statsRecorded) return;
        setStatsRecorded(true);
        setStats((prev) => {
            const next: Stats = {
                ...prev,
                wins: prev.wins + (playerWon ? 1 : 0),
                losses: prev.losses + (aiWon ? 1 : 0),
            };
            writeStats(next);
            return next;
        });
    }, [battle, gameOver, statsRecorded, playerWon, aiWon]);

    const handleFireAtAi = (row: number, col: number) => {
        if (!battle || battle.turn !== 'player' || gameOver) return;
        const key = cellKey(row, col);
        if (battle.aiFleet.shots[key]) return;

        const ship = battle.aiFleet.ships.find((s) => s.cells.includes(key)) ?? null;
        const result: ShotResult = ship ? 'hit' : 'miss';
        const nextShots: ShotMap = { ...battle.aiFleet.shots, [key]: result };
        const sunk = ship ? isShipSunk(ship, nextShots) : false;

        setStats((prev) => {
            const next: Stats = { ...prev, shotsFired: prev.shotsFired + 1, hits: prev.hits + (ship ? 1 : 0) };
            writeStats(next);
            return next;
        });

        setBattle((prev) => {
            if (!prev || prev.turn !== 'player') return prev;
            return {
                ...prev,
                aiFleet: { ...prev.aiFleet, shots: nextShots },
                turn: 'ai',
                lastPlayerShot: { row, col, result, sunk, shipName: ship ? shipName(ship.id) : null },
            };
        });
    };

    // AI's turn: think for a beat, then fire using the hunt/target state machine.
    useEffect(() => {
        if (!battle || battle.turn !== 'ai' || gameOver) return undefined;
        const timeoutId = window.setTimeout(() => {
            setBattle((prev) => {
                if (!prev || prev.turn !== 'ai') return prev;
                const tried = new Set(Object.keys(prev.playerFleet.shots));
                const { cell, huntFallback } = chooseAiShot(prev.aiTargeting, tried);
                const [r, c] = cell;
                const key = cellKey(r, c);

                const ship = prev.playerFleet.ships.find((s) => s.cells.includes(key)) ?? null;
                const result: ShotResult = ship ? 'hit' : 'miss';
                const nextShots: ShotMap = { ...prev.playerFleet.shots, [key]: result };
                const sunk = ship ? isShipSunk(ship, nextShots) : false;

                const baseHits = huntFallback ? [] : prev.aiTargeting.hits;
                let nextMode: AIMode;
                let nextHits: [number, number][];
                if (!ship) {
                    nextMode = huntFallback ? 'hunt' : prev.aiTargeting.mode;
                    nextHits = baseHits;
                } else if (sunk) {
                    nextMode = 'hunt';
                    nextHits = [];
                } else {
                    nextMode = 'target';
                    nextHits = [...baseHits, [r, c]];
                }

                return {
                    ...prev,
                    playerFleet: { ...prev.playerFleet, shots: nextShots },
                    aiTargeting: { mode: nextMode, hits: nextHits },
                    turn: 'player',
                    lastAiShot: { row: r, col: c, result, sunk, shipName: ship ? shipName(ship.id) : null },
                };
            });
        }, AI_MOVE_DELAY);
        return () => window.clearTimeout(timeoutId);
    }, [battle, gameOver]);

    const cardRef = useRef<HTMLDivElement | null>(null);

    let statusText: string;
    if (phase === 'placement') {
        statusText = currentShip
            ? `Place your ${currentShip.name} (${currentShip.size} cells), orientation: ${orientation}`
            : 'Fleet ready. Launch when you are.';
    } else if (gameOver) {
        statusText = playerWon ? 'You sank the entire enemy fleet. Victory!' : 'Your fleet has been destroyed. Defeat.';
    } else if (battle?.turn === 'player') {
        statusText = 'Your turn. Fire at the enemy grid.';
    } else {
        statusText = 'Enemy is targeting your fleet...';
    }

    const renderPlacementBoard = () => {
        const cells: React.ReactNode[] = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const key = cellKey(row, col);
                const hasShip = occupiedDuringPlacement.has(key);
                const isPreview = previewCells?.cells.some(([r, c]) => r === row && c === col) ?? false;
                const interactive = !!currentShip;

                let bgcolor = WATER_COLOR;
                if (hasShip) bgcolor = SHIP_COLOR;
                else if (isPreview) bgcolor = previewCells!.valid ? alpha(theme.palette.success.main, 0.55) : alpha(theme.palette.error.main, 0.55);

                cells.push(
                    <Box
                        key={key}
                        role="button"
                        aria-label={`Row ${row + 1} column ${col + 1}${hasShip ? ', your ship' : ''}`}
                        onMouseEnter={() => setHoverCell([row, col])}
                        onMouseLeave={() => setHoverCell(null)}
                        onClick={() => interactive && handlePlaceClick(row, col)}
                        sx={{
                            aspectRatio: '1 / 1',
                            bgcolor,
                            border: '1px solid rgba(0,0,0,0.35)',
                            cursor: interactive ? 'pointer' : 'default',
                            transition: 'background-color 0.12s ease',
                        }}
                    />
                );
            }
        }
        return cells;
    };

    const renderEnemyBoard = () => {
        if (!battle) return null;
        const cells: React.ReactNode[] = [];
        const interactiveBoard = battle.turn === 'player' && !gameOver;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const key = cellKey(row, col);
                const shot = battle.aiFleet.shots[key];
                let sunk = false;
                if (shot === 'hit') {
                    const ship = battle.aiFleet.ships.find((s) => s.cells.includes(key));
                    sunk = ship ? isShipSunk(ship, battle.aiFleet.shots) : false;
                }
                const interactive = interactiveBoard && !shot;

                let bgcolor = WATER_COLOR;
                if (sunk) bgcolor = SUNK_COLOR;
                else if (shot === 'hit') bgcolor = HIT_COLOR;

                cells.push(
                    <Box
                        key={key}
                        role="button"
                        aria-label={`Fire at row ${row + 1} column ${col + 1}${shot ? `, ${shot}` : ''}`}
                        onClick={() => interactive && handleFireAtAi(row, col)}
                        sx={{
                            position: 'relative',
                            aspectRatio: '1 / 1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor,
                            border: '1px solid rgba(0,0,0,0.35)',
                            cursor: interactive ? 'pointer' : 'default',
                            transition: 'background-color 0.12s ease',
                            '&:hover': interactive ? { bgcolor: '#123a5c' } : undefined,
                        }}
                    >
                        {shot === 'miss' && (
                            <Box sx={{ width: '30%', height: '30%', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.5)' }} />
                        )}
                        {shot === 'hit' && !sunk && <LocalFireDepartment sx={{ color: '#fff', fontSize: '1.1rem' }} />}
                        {sunk && <Close sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.2rem' }} />}
                    </Box>
                );
            }
        }
        return cells;
    };

    const renderOwnBoard = () => {
        if (!battle) return null;
        const ownOccupied = new Set(battle.playerFleet.ships.flatMap((s) => s.cells));
        const cells: React.ReactNode[] = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const key = cellKey(row, col);
                const hasShip = ownOccupied.has(key);
                const shot = battle.playerFleet.shots[key];
                let sunk = false;
                if (shot === 'hit') {
                    const ship = battle.playerFleet.ships.find((s) => s.cells.includes(key));
                    sunk = ship ? isShipSunk(ship, battle.playerFleet.shots) : false;
                }

                let bgcolor = WATER_COLOR;
                if (sunk) bgcolor = SUNK_COLOR;
                else if (shot === 'hit') bgcolor = HIT_COLOR;
                else if (hasShip) bgcolor = SHIP_COLOR;

                cells.push(
                    <Box
                        key={key}
                        aria-label={`Row ${row + 1} column ${col + 1}${hasShip ? ', your ship' : ''}${shot ? `, ${shot}` : ''}`}
                        sx={{
                            position: 'relative',
                            aspectRatio: '1 / 1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor,
                            border: '1px solid rgba(0,0,0,0.35)',
                        }}
                    >
                        {shot === 'miss' && (
                            <Box sx={{ width: '30%', height: '30%', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.5)' }} />
                        )}
                        {shot === 'hit' && !sunk && <LocalFireDepartment sx={{ color: '#fff', fontSize: '1.1rem' }} />}
                        {sunk && <Close sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.2rem' }} />}
                    </Box>
                );
            }
        }
        return cells;
    };

    const renderFleetChips = (fleet: FleetState) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {SHIP_SPECS.map((spec) => {
                const ship = fleet.ships.find((s) => s.id === spec.id);
                const sunk = ship ? isShipSunk(ship, fleet.shots) : false;
                return (
                    <Chip
                        key={spec.id}
                        label={spec.name}
                        size="small"
                        sx={{
                            fontWeight: 700,
                            textDecoration: sunk ? 'line-through' : 'none',
                            opacity: sunk ? 0.5 : 1,
                            bgcolor: sunk ? alpha(theme.palette.error.main, 0.25) : alpha(theme.palette.text.primary, 0.08),
                        }}
                    />
                );
            })}
        </Stack>
    );

    return (
        <>
            <Seo
                title="Battleship - Play Free Online vs AI"
                description="Place your fleet and take turns firing at the enemy grid. Play classic Battleship against a computer opponent that hunts and tracks your ships, free in your browser, no sign-up."
                keywords={['battleship game', 'battleship online', 'play battleship vs computer', 'battleship ai', 'naval strategy game', 'board game online']}
            />
            <GamePlayShell
                icon={Anchor}
                title="Battleship"
                subtitle="Place your five ships, then fire at the enemy grid to sink their fleet before they sink yours."
                onRestart={resetGame}
                maxWidth="sm"
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 420, mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Shots {stats.shotsFired} · Hits {stats.hits}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                W {stats.wins} · L {stats.losses}
                            </Typography>
                        </Box>

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                mb: 2,
                                textAlign: 'center',
                                color: gameOver ? (playerWon ? 'primary.main' : 'error.main') : 'text.primary',
                            }}
                        >
                            {statusText}
                        </Typography>

                        {phase === 'placement' && (
                            <>
                                <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto', display: 'grid', gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`, borderRadius: '10px', overflow: 'hidden', border: '2px solid #051d30', userSelect: 'none', touchAction: 'manipulation' }}>
                                    {renderPlacementBoard()}
                                </Box>

                                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ mt: 2.5, rowGap: 1 }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Rotate90DegreesCcw />}
                                        onClick={() => setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'))}
                                    >
                                        {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
                                    </Button>
                                    <Button variant="outlined" startIcon={<Casino />} onClick={randomizePlacement}>
                                        {placedShips.length > 0 ? 'Re-randomize' : 'Randomize my ships'}
                                    </Button>
                                    {placedShips.length > 0 && (
                                        <Button variant="text" onClick={clearPlacement}>
                                            Clear
                                        </Button>
                                    )}
                                </Stack>

                                <Button
                                    sx={{ mt: 2 }}
                                    variant="contained"
                                    disabled={!allShipsPlaced}
                                    onClick={startBattle}
                                >
                                    Start Battle
                                </Button>
                            </>
                        )}

                        {phase === 'battle' && battle && (
                            <>
                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, alignSelf: 'flex-start', ml: { xs: 0, sm: 0.5 } }}>
                                    Enemy Waters
                                </Typography>
                                <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto', display: 'grid', gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`, borderRadius: '10px', overflow: 'hidden', border: '2px solid #051d30', userSelect: 'none', touchAction: 'manipulation', mb: 1 }}>
                                    {renderEnemyBoard()}
                                </Box>
                                <Box sx={{ mb: 2 }}>{renderFleetChips(battle.aiFleet)}</Box>

                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, alignSelf: 'flex-start', ml: { xs: 0, sm: 0.5 } }}>
                                    Your Fleet
                                </Typography>
                                <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto', display: 'grid', gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`, borderRadius: '10px', overflow: 'hidden', border: '2px solid #051d30', userSelect: 'none', touchAction: 'manipulation', mb: 1 }}>
                                    {renderOwnBoard()}
                                </Box>
                                <Box sx={{ mb: 1 }}>{renderFleetChips(battle.playerFleet)}</Box>

                                {gameOver && (
                                    <Button sx={{ mt: 2 }} variant="contained" onClick={resetGame}>
                                        New Game
                                    </Button>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default Battleship;
