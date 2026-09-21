import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, Card, CardContent,
    Chip, Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme,
} from '@mui/material';
import {
    CheckCircle, ExpandMore, Person, RestartAlt, SkipNext, Undo, Warehouse,
} from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import DPadControls, { type Direction as PadDirection } from './shared/DPadControls';
import { useIsPlayModeDevice } from './shared/useFullscreenPlayMode';

const FAQ: { question: string; answer: string }[] = [
    {
        question: 'How does pushing a crate work?',
        answer: 'Walk into a crate and you push it one square further in the direction you were already heading, but only when the square directly behind it is clear floor or an empty goal. A crate will not shift into a wall, and it will not shift into another crate, so two crates can never be moved at once. There is no pulling in Sokoban. Crates only ever travel away from you, which is the whole difficulty of the game.',
    },
    {
        question: 'I pushed a crate into a corner and now nothing works.',
        answer: 'That crate is finished, and so is the level unless you take the move back. Pushing a crate out of a corner would mean standing inside the wall behind it, which is impossible. The same trap applies to a crate flat against a wall when no goal sits along that wall: it can slide up and down the wall forever without ever leaving it. Undo walks back through your moves one at a time, and Restart returns the level to its opening position.',
    },
    {
        question: 'What do the characters in a Sokoban level mean?',
        answer: 'These levels are written in the plain text notation that Sokoban files have used for decades, so a level you find anywhere else reads the same way. A hash is a wall, a dollar sign is a crate, a full stop is a goal square, an at sign is you, and a space is open floor. Two more characters cover the overlaps: an asterisk is a crate already sitting on a goal, and a plus sign is you standing on a goal.',
    },
    {
        question: 'Can every level here actually be finished?',
        answer: 'Yes, and each one was checked rather than assumed. Every level was run through a breadth-first search across all reachable arrangements of player and crates, which returned a shortest solution for each. The par figure shown beside the move counter is that shortest solution, so matching it means you found an optimal route.',
    },
];

interface RawLevel {
    name: string;
    /** Shortest possible solution in moves, from an exhaustive breadth-first
     * search of the level's reachable state space. */
    par: number;
    rows: string[];
}

/** Hand-designed levels in the standard Sokoban text notation:
 * `#` wall, `@` player, `+` player on goal, `$` crate, `*` crate on goal,
 * `.` goal, space for floor. Every level is rectangular, fully enclosed by
 * walls, and has been verified solvable. */
const RAW_LEVELS: RawLevel[] = [
    {
        name: 'First Push',
        par: 2,
        rows: [
            '#######',
            '#     #',
            '# @$ .#',
            '#     #',
            '#######',
        ],
    },
    {
        name: 'Two in a Row',
        par: 13,
        rows: [
            '########',
            '#      #',
            '# $  . #',
            '# $  . #',
            '#  @   #',
            '########',
        ],
    },
    {
        name: 'Three Down',
        par: 20,
        rows: [
            '#########',
            '#       #',
            '# $ $ $ #',
            '#       #',
            '# . . . #',
            '#   @   #',
            '#########',
        ],
    },
    {
        name: 'Turn Around',
        par: 11,
        rows: [
            '#######',
            '#     #',
            '# .$. #',
            '#  @  #',
            '#  $  #',
            '#     #',
            '#######',
        ],
    },
    {
        name: 'Around the Block',
        par: 24,
        rows: [
            '#########',
            '#       #',
            '#  ###  #',
            '#  $ $  #',
            '# .@.   #',
            '#       #',
            '#########',
        ],
    },
    {
        name: 'Two Rooms',
        par: 49,
        rows: [
            '##########',
            '#   #    #',
            '# $ #    #',
            '#   #    #',
            '# $     .#',
            '#   # .  #',
            '# $ #    #',
            '#@  # .  #',
            '##########',
        ],
    },
];

interface ParsedLevel {
    name: string;
    par: number;
    width: number;
    height: number;
    /** Flat row-major lookups, indexed by `row * width + col`. */
    walls: boolean[];
    goals: boolean[];
    goalCells: number[];
    crateCells: number[];
    playerCell: number;
}

/** Turns one notation level into flat lookup tables. Rows shorter than the
 * widest row are padded with walls, which never fires for the levels above
 * since they are all rectangular, but keeps the parser safe for ragged input. */
function parseLevel(raw: RawLevel): ParsedLevel {
    const width = raw.rows.reduce((widest, row) => Math.max(widest, row.length), 0);
    const height = raw.rows.length;
    const walls: boolean[] = [];
    const goals: boolean[] = [];
    const goalCells: number[] = [];
    const crateCells: number[] = [];
    let playerCell = 0;

    for (let r = 0; r < height; r++) {
        const row = raw.rows[r].padEnd(width, '#');
        for (let c = 0; c < width; c++) {
            const ch = row[c];
            const index = r * width + c;
            walls[index] = ch === '#';
            const isGoal = ch === '.' || ch === '*' || ch === '+';
            goals[index] = isGoal;
            if (isGoal) goalCells.push(index);
            if (ch === '$' || ch === '*') crateCells.push(index);
            if (ch === '@' || ch === '+') playerCell = index;
        }
    }

    return { name: raw.name, par: raw.par, width, height, walls, goals, goalCells, crateCells, playerCell };
}

const LEVELS: ParsedLevel[] = RAW_LEVELS.map(parseLevel);

const PROGRESS_KEY = 'sandbox_sokoban_progress';

/** Level name to the fewest moves it has been cleared in. A name with no entry
 * has never been finished. */
type Progress = Record<string, number>;

const readProgress = (): Progress => {
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return {};
        const result: Progress = {};
        Object.entries(parsed as Record<string, unknown>).forEach(([name, value]) => {
            if (typeof value === 'number' && Number.isFinite(value)) result[name] = value;
        });
        return result;
    } catch {
        return {};
    }
};

const writeProgress = (progress: Progress) => {
    try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
        // localStorage unavailable - progress stays in memory for this session.
    }
};

interface Snapshot {
    player: number;
    crates: ReadonlySet<number>;
}

const DELTAS: Record<PadDirection, { dr: number; dc: number }> = {
    UP: { dr: -1, dc: 0 },
    DOWN: { dr: 1, dc: 0 },
    LEFT: { dr: 0, dc: -1 },
    RIGHT: { dr: 0, dc: 1 },
};

const KEY_TO_DIRECTION: Record<string, PadDirection> = {
    ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
    w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
    W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
};

const Sokoban: React.FC = () => {
    const theme = useTheme();
    const isPlayMode = useIsPlayModeDevice();
    const [levelIndex, setLevelIndex] = useState(0);
    const level = LEVELS[levelIndex];

    const [player, setPlayer] = useState<number>(level.playerCell);
    const [crates, setCrates] = useState<ReadonlySet<number>>(() => new Set(level.crateCells));
    const [history, setHistory] = useState<Snapshot[]>([]);
    const [moves, setMoves] = useState(0);
    const [won, setWon] = useState(false);
    const [progress, setProgress] = useState<Progress>(() => readProgress());

    const loadLevel = useCallback((index: number) => {
        const next = LEVELS[index];
        setLevelIndex(index);
        setPlayer(next.playerCell);
        setCrates(new Set(next.crateCells));
        setHistory([]);
        setMoves(0);
        setWon(false);
    }, []);

    const restartLevel = useCallback(() => loadLevel(levelIndex), [loadLevel, levelIndex]);

    /**
     * One step in a direction. Walking into a wall does nothing at all, not
     * even a wasted move. Walking into a crate pushes it one square the same
     * way, and only when the square beyond it is free floor or an empty goal,
     * so a crate never enters a wall and never shoves a second crate.
     */
    const move = useCallback((direction: PadDirection) => {
        if (won) return;
        const { dr, dc } = DELTAS[direction];
        const { width, height, walls } = level;
        const row = Math.floor(player / width);
        const col = player % width;

        const nextRow = row + dr;
        const nextCol = col + dc;
        if (nextRow < 0 || nextRow >= height || nextCol < 0 || nextCol >= width) return;
        const target = nextRow * width + nextCol;
        if (walls[target]) return;

        let nextCrates = crates;
        if (crates.has(target)) {
            const beyondRow = nextRow + dr;
            const beyondCol = nextCol + dc;
            if (beyondRow < 0 || beyondRow >= height || beyondCol < 0 || beyondCol >= width) return;
            const beyond = beyondRow * width + beyondCol;
            if (walls[beyond] || crates.has(beyond)) return;
            const moved = new Set(crates);
            moved.delete(target);
            moved.add(beyond);
            nextCrates = moved;
        }

        setHistory((prev) => [...prev, { player, crates }]);
        setPlayer(target);
        if (nextCrates !== crates) setCrates(nextCrates);
        setMoves((prev) => prev + 1);
    }, [won, level, player, crates]);

    const undo = useCallback(() => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        setPlayer(last.player);
        setCrates(last.crates);
        setHistory(history.slice(0, -1));
        setMoves((count) => Math.max(0, count - 1));
        setWon(false);
    }, [history]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const direction = KEY_TO_DIRECTION[event.key];
            if (direction) {
                event.preventDefault();
                move(direction);
                return;
            }
            if (event.key === 'z' || event.key === 'Z' || event.key === 'u' || event.key === 'U') {
                event.preventDefault();
                undo();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [move, undo]);

    // The level is cleared the moment every goal square holds a crate.
    useEffect(() => {
        if (won || level.goalCells.length === 0) return;
        if (!level.goalCells.every((cell) => crates.has(cell))) return;

        setWon(true);
        const existing = progress[level.name];
        if (existing === undefined || moves < existing) {
            const next = { ...progress, [level.name]: moves };
            setProgress(next);
            writeProgress(next);
        }
    }, [crates, level, moves, won, progress]);

    const cellPx = useMemo(() => {
        const longestSide = Math.max(level.width, level.height);
        const budget = isPlayMode ? 300 : 440;
        return Math.max(24, Math.min(52, Math.floor(budget / longestSide)));
    }, [level.width, level.height, isPlayMode]);

    const handlePadDirection = useCallback((direction: PadDirection) => move(direction), [move]);

    const controllerDock = (
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
            <DPadControls onDirection={handlePadDirection} accentColor={theme.palette.primary.main} />
            <Stack spacing={1}>
                <Button size="small" variant="outlined" startIcon={<Undo />} onClick={undo} disabled={history.length === 0}>
                    Undo
                </Button>
                <Button size="small" variant="outlined" startIcon={<RestartAlt />} onClick={restartLevel}>
                    Restart
                </Button>
            </Stack>
        </Stack>
    );

    const bestForLevel = progress[level.name];
    const hasNextLevel = levelIndex < LEVELS.length - 1;

    return (
        <>
            <Seo
                gameId={45}
                title="Sokoban - Play the Classic Crate Pushing Puzzle Free"
                description="Play Sokoban online for free. Push every crate onto a goal square across six hand-built levels, from a two move opener to a chokepoint puzzle that needs planning. Undo, restart and per level best scores included, with arrow keys, WASD or on-screen controls."
                keywords={['sokoban online', 'play sokoban free', 'crate pushing puzzle', 'warehouse puzzle game', 'box pushing game', 'sokoban levels browser']}
            />
            <GamePlayShell
                icon={Warehouse}
                title="Sokoban"
                subtitle="Push every crate onto a goal square. Crates only move away from you, so think a step ahead before you shove."
                onRestart={restartLevel}
                controls={controllerDock}
                maxWidth="md"
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
                                value={levelIndex}
                                exclusive
                                onChange={(_, value: number | null) => value !== null && value !== levelIndex && loadLevel(value)}
                            >
                                {LEVELS.map((item, index) => (
                                    <ToggleButton key={item.name} value={index} sx={{ minWidth: 44, gap: 0.5 }}>
                                        {index + 1}
                                        {progress[item.name] !== undefined && (
                                            <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                                        )}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Stack>

                        <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="center"
                            alignItems="center"
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="body2" fontWeight={700}>
                                {levelIndex + 1}. {level.name}
                            </Typography>
                            <Chip size="small" label={`Moves: ${moves}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip size="small" label={`Par: ${level.par}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip
                                size="small"
                                label={bestForLevel === undefined ? 'Best: none yet' : `Best: ${bestForLevel}`}
                                sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
                            />
                        </Stack>

                        {won && (
                            <Stack spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ textAlign: 'center' }}>
                                    {moves === level.par
                                        ? `Cleared in ${moves} moves, matching par!`
                                        : `Cleared in ${moves} moves.`}
                                </Typography>
                                {hasNextLevel && (
                                    <Button size="small" variant="contained" endIcon={<SkipNext />} onClick={() => loadLevel(levelIndex + 1)}>
                                        Next level
                                    </Button>
                                )}
                            </Stack>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', mb: 2 }}>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${level.width}, ${cellPx}px)`,
                                    gridAutoRows: `${cellPx}px`,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    bgcolor: 'rgba(0,0,0,0.35)',
                                }}
                            >
                                {level.walls.map((isWall, index) => {
                                    const isGoal = level.goals[index];
                                    const hasCrate = crates.has(index);
                                    const hasPlayer = player === index;
                                    const crateSatisfied = hasCrate && isGoal;
                                    const row = Math.floor(index / level.width) + 1;
                                    const col = (index % level.width) + 1;
                                    const description = isWall
                                        ? 'wall'
                                        : `${hasPlayer ? 'player' : hasCrate ? (crateSatisfied ? 'crate on goal' : 'crate') : 'floor'}${isGoal && !hasCrate ? ' goal' : ''}`;

                                    return (
                                        <Box
                                            key={index}
                                            aria-label={`Row ${row}, column ${col}, ${description}`}
                                            sx={{
                                                position: 'relative',
                                                width: cellPx,
                                                height: cellPx,
                                                boxSizing: 'border-box',
                                                bgcolor: isWall ? '#232833' : 'rgba(255,255,255,0.025)',
                                                borderRight: '1px solid rgba(0,0,0,0.35)',
                                                borderBottom: '1px solid rgba(0,0,0,0.35)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {isGoal && !hasCrate && (
                                                <Box
                                                    sx={{
                                                        width: cellPx * 0.32,
                                                        height: cellPx * 0.32,
                                                        borderRadius: '50%',
                                                        border: `2px solid ${alpha(theme.palette.secondary.main, 0.85)}`,
                                                        bgcolor: alpha(theme.palette.secondary.main, 0.2),
                                                    }}
                                                />
                                            )}

                                            {hasCrate && (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        inset: cellPx * 0.1,
                                                        borderRadius: '4px',
                                                        bgcolor: crateSatisfied
                                                            ? alpha(theme.palette.success.main, 0.85)
                                                            : '#c08b52',
                                                        border: `2px solid ${crateSatisfied ? alpha(theme.palette.success.light, 0.9) : '#8a5e33'}`,
                                                        boxShadow: crateSatisfied
                                                            ? `0 0 12px ${alpha(theme.palette.success.main, 0.6)}`
                                                            : 'inset 0 0 0 2px rgba(0,0,0,0.15)',
                                                    }}
                                                />
                                            )}

                                            {hasPlayer && (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        inset: cellPx * 0.12,
                                                        borderRadius: '50%',
                                                        bgcolor: theme.palette.primary.main,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: theme.palette.getContrastText(theme.palette.primary.main),
                                                    }}
                                                >
                                                    <Person sx={{ fontSize: cellPx * 0.55 }} />
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>

                        <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
                            <Button size="small" variant="outlined" startIcon={<Undo />} onClick={undo} disabled={history.length === 0}>
                                Undo
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<RestartAlt />} onClick={restartLevel}>
                                Restart level
                            </Button>
                        </Stack>

                        {!isPlayMode && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                                Arrow keys or WASD to move, Z or U to undo.
                            </Typography>
                        )}
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

export default Sokoban;
