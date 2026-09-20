import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, Card, CardContent,
    Chip, Stack, Typography, useTheme,
} from '@mui/material';
import { ExpandMore, RestartAlt, Traffic } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import DPadControls, { type Direction } from './shared/DPadControls';
import { useIsPlayModeDevice } from './shared/useFullscreenPlayMode';

const FAQ: { question: string; answer: string }[] = [
    {
        question: 'How does riding a log work?',
        answer: 'On the water rows, standing still is not an option: there is no floor, only logs drifting across. Land on a log and you drift along with it automatically, so watch where it is heading, not just where it is right now. If the log you are on carries you into the edge of the board, or you step into water with no log under you at all, that costs a life.',
    },
    {
        question: 'Why do vehicles and logs get faster over time?',
        answer: 'Every successful crossing raises the difficulty a notch, so the road and river both pick up speed as your score climbs. It levels off after a handful of crossings rather than climbing forever, so a long run stays hard but not unfair.',
    },
    {
        question: 'How is a run scored, and what does filling every landing pad do?',
        answer: 'Each landing pad you reach for the first time is worth a point. Landing on a pad that is already filled, or missing the pads entirely, costs a life the same as getting hit. Filling all of the pads at once clears the wave: it hands you a score bonus, refills one lost life (up to a small cap), and opens all the pads back up for the next, faster wave.',
    },
    {
        question: 'What happens when I lose a life?',
        answer: 'You respawn at the start row and get a brief window where nothing on the board can hurt you, shown as a quick flicker on your character, so a bad crossing does not immediately chain into a second one. Three lives are shared across the whole run - once the last one is gone, the run ends and your score is compared against your best.',
    },
    {
        question: 'What are the controls?',
        answer: 'Arrow keys or WASD move you one row or column at a time on desktop. On touch devices, use the on-screen pad. Every hop is a single step, including while you are drifting on a log, so tapping a direction always snaps you to the nearest column first.',
    },
];

const COLS = 9;
const PADS = [1, 4, 7];
const START_COL = 4;
const LIVES_START = 3;
const LIVES_MAX = 5;
const TICK_MS = 50;
const DT = TICK_MS / 1000;
const INVULN_MS = 1200;

type LaneType = 'start' | 'road' | 'median' | 'water' | 'goal';

interface LaneConfig {
    type: LaneType;
    dir?: 1 | -1;
    baseSpeed?: number;
    width?: number;
    count?: number;
}

/** Row 0 is the start; row LANES.length - 1 is the goal. Road and water lanes
 * alternate direction and vary in speed/obstacle width so no two rows feel
 * the same. Every lane's spacing (COLS / count) is kept comfortably wider
 * than its obstacle width, so a gap always exists somewhere to move into. */
const LANES: LaneConfig[] = [
    { type: 'start' },
    { type: 'road', dir: 1, baseSpeed: 1.6, width: 1.2, count: 3 },
    { type: 'road', dir: -1, baseSpeed: 2.0, width: 1.0, count: 3 },
    { type: 'road', dir: 1, baseSpeed: 1.3, width: 1.5, count: 2 },
    { type: 'road', dir: -1, baseSpeed: 2.4, width: 1.0, count: 4 },
    { type: 'median' },
    { type: 'water', dir: 1, baseSpeed: 1.4, width: 2.0, count: 3 },
    { type: 'water', dir: -1, baseSpeed: 1.1, width: 1.8, count: 3 },
    { type: 'water', dir: 1, baseSpeed: 1.7, width: 2.2, count: 2 },
    { type: 'water', dir: -1, baseSpeed: 1.3, width: 2.4, count: 2 },
    { type: 'goal' },
];
const ROWS = LANES.length;
const GOAL_ROW = ROWS - 1;

function initObstacles(): Record<number, number[]> {
    const obstacles: Record<number, number[]> = {};
    LANES.forEach((lane, index) => {
        if (!lane.count || !lane.width) return;
        const spacing = COLS / lane.count;
        const jitterMax = Math.min(0.6, (spacing - lane.width) * 0.4);
        obstacles[index] = Array.from({ length: lane.count }, (_, i) => {
            const jitter = jitterMax > 0 ? (Math.random() - 0.5) * jitterMax : 0;
            return i * spacing + jitter;
        });
    });
    return obstacles;
}

interface Player { row: number; col: number }

interface GameState {
    player: Player;
    obstacles: Record<number, number[]>;
    lives: number;
    score: number;
    level: number;
    occupiedPads: Set<number>;
    gameOver: boolean;
    invulnerableUntil: number;
    message: string | null;
    messageUntil: number;
    best: number | null;
}

const BEST_KEY = 'sandbox_road_hop_best';

const readBest = (): number | null => {
    try {
        const raw = localStorage.getItem(BEST_KEY);
        if (!raw) return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
};

const writeBest = (score: number) => {
    try {
        localStorage.setItem(BEST_KEY, String(score));
    } catch {
        // localStorage unavailable - the record just stays in memory for this session.
    }
};

function makeInitialState(best: number | null): GameState {
    return {
        player: { row: 0, col: START_COL },
        obstacles: initObstacles(),
        lives: LIVES_START,
        score: 0,
        level: 0,
        occupiedPads: new Set(),
        gameOver: false,
        invulnerableUntil: 0,
        message: null,
        messageUntil: 0,
        best,
    };
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
    ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
    w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT', W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
};

const RoadHop: React.FC = () => {
    const theme = useTheme();
    const isPlayMode = useIsPlayModeDevice();
    const stateRef = useRef<GameState>(makeInitialState(readBest()));
    const [, setTick] = useState(0);
    const rerender = useCallback(() => setTick((t) => t + 1), []);

    const loseLife = useCallback(() => {
        const s = stateRef.current;
        if (Date.now() < s.invulnerableUntil) return;
        s.lives -= 1;
        if (s.lives <= 0) {
            s.gameOver = true;
            if (s.best === null || s.score > s.best) {
                s.best = s.score;
                writeBest(s.score);
            }
            return;
        }
        s.player = { row: 0, col: START_COL };
        s.invulnerableUntil = Date.now() + INVULN_MS;
    }, []);

    const move = useCallback((direction: Direction) => {
        const s = stateRef.current;
        if (s.gameOver) return;
        const baseCol = Math.round(s.player.col);
        let nextRow = s.player.row;
        let nextCol = baseCol;
        if (direction === 'UP') nextRow = Math.min(ROWS - 1, s.player.row + 1);
        else if (direction === 'DOWN') nextRow = Math.max(0, s.player.row - 1);
        else if (direction === 'LEFT') nextCol = Math.max(0, baseCol - 1);
        else if (direction === 'RIGHT') nextCol = Math.min(COLS - 1, baseCol + 1);

        if (nextRow === s.player.row && Math.abs(nextCol - s.player.col) < 0.001) return;

        if (nextRow === GOAL_ROW) {
            if (PADS.includes(nextCol) && !s.occupiedPads.has(nextCol)) {
                s.occupiedPads.add(nextCol);
                s.score += 1;
                s.level = Math.min(s.level + 1, 8);
                if (s.occupiedPads.size === PADS.length) {
                    s.occupiedPads = new Set();
                    s.score += 5;
                    s.lives = Math.min(s.lives + 1, LIVES_MAX);
                    s.message = 'Wave clear! +1 life';
                    s.messageUntil = Date.now() + 2000;
                }
                s.player = { row: 0, col: START_COL };
            } else {
                s.player = { row: nextRow, col: nextCol };
                loseLife();
            }
            rerender();
            return;
        }

        s.player = { row: nextRow, col: nextCol };
        rerender();
    }, [loseLife, rerender]);

    const resetGame = useCallback(() => {
        stateRef.current = makeInitialState(readBest());
        rerender();
    }, [rerender]);

    // Fixed-interval game loop: obstacles advance, then hazards are checked
    // against the player's row. Everything reads/writes stateRef directly, so
    // this effect never needs to restart and never sees stale state.
    useEffect(() => {
        const interval = setInterval(() => {
            const s = stateRef.current;
            if (s.gameOver) return;
            const multiplier = 1 + Math.min(s.level, 8) * 0.07;
            const lane = LANES[s.player.row];
            const invulnerable = Date.now() < s.invulnerableUntil;

            let wasOnLog = false;
            let logDelta = 0;
            if (lane.type === 'water' && lane.dir && lane.baseSpeed && lane.width) {
                const delta = lane.baseSpeed * lane.dir * multiplier * DT;
                const arr = s.obstacles[s.player.row] ?? [];
                for (const x of arr) {
                    if (s.player.col + 1 > x && s.player.col < x + lane.width) {
                        wasOnLog = true;
                        logDelta = delta;
                        break;
                    }
                }
            }

            Object.keys(s.obstacles).forEach((key) => {
                const index = Number(key);
                const laneCfg = LANES[index];
                if (!laneCfg.dir || !laneCfg.baseSpeed || !laneCfg.width) return;
                const delta = laneCfg.baseSpeed * laneCfg.dir * multiplier * DT;
                s.obstacles[index] = s.obstacles[index].map((x) => {
                    let next = x + delta;
                    if (laneCfg.dir === 1 && next > COLS) next = -laneCfg.width!;
                    if (laneCfg.dir === -1 && next + laneCfg.width! < 0) next = COLS;
                    return next;
                });
            });

            if (!invulnerable) {
                if (lane.type === 'road' && lane.width) {
                    const arr = s.obstacles[s.player.row] ?? [];
                    const hit = arr.some((x) => s.player.col + 1 > x && s.player.col < x + lane.width!);
                    if (hit) loseLife();
                } else if (lane.type === 'water') {
                    if (wasOnLog) {
                        s.player.col += logDelta;
                        if (s.player.col < 0 || s.player.col > COLS - 1) loseLife();
                    } else {
                        loseLife();
                    }
                }
            }

            setTick((t) => t + 1);
        }, TICK_MS);
        return () => clearInterval(interval);
    }, [loseLife]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const direction = KEY_TO_DIRECTION[event.key];
            if (direction) {
                event.preventDefault();
                move(direction);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [move]);

    const s = stateRef.current;
    const now = Date.now();
    const invulnerable = now < s.invulnerableUntil;
    const blinkHidden = invulnerable && Math.floor(now / 150) % 2 === 0;
    const displayMessage = now < s.messageUntil ? s.message : null;

    const cellPx = isPlayMode ? 32 : 38;
    const boardWidth = COLS * cellPx;
    const boardHeight = ROWS * cellPx;

    const laneBg = (type: LaneType) => {
        if (type === 'road') return '#20242c';
        if (type === 'water') return alpha(theme.palette.info.main, 0.16);
        if (type === 'goal') return alpha(theme.palette.success.main, 0.1);
        return alpha(theme.palette.success.main, 0.06);
    };

    const dpad = <DPadControls onDirection={move} accentColor={theme.palette.primary.main} />;

    return (
        <>
            <Seo
                gameId={48}
                title="Road Hop - Play a Free Lane-Crossing Arcade Game"
                description="Play Road Hop online for free, a lane-crossing arcade game. Dodge traffic, ride logs across the water, and fill every landing pad before your lives run out. Speed ramps up with every wave you clear, with arrow keys, WASD, or on-screen controls and a best-score record."
                keywords={['lane crossing arcade game', 'road and river crossing game', 'retro arcade hopping game', 'dodge traffic game online', 'log riding arcade game', 'play road hop free']}
            />
            <GamePlayShell
                icon={Traffic}
                title="Road Hop"
                subtitle="Cross the road, ride the logs, and fill every landing pad. Watch where things are heading, not just where they are."
                onRestart={resetGame}
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
                        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                            <Chip size="small" label={`Score: ${s.score}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip size="small" label={`Lives: ${s.lives}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Chip
                                size="small"
                                label={s.best === null ? 'Best: none yet' : `Best: ${s.best}`}
                                sx={{ bgcolor: 'rgba(255,255,255,0.08)' }}
                            />
                        </Stack>

                        {displayMessage && (
                            <Typography variant="body2" fontWeight={800} color="success.main" sx={{ textAlign: 'center', mb: 1.5 }}>
                                {displayMessage}
                            </Typography>
                        )}

                        {s.gameOver && (
                            <Stack spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ textAlign: 'center' }}>
                                    Run over - final score {s.score}!
                                </Typography>
                                <Button size="small" variant="contained" startIcon={<RestartAlt />} onClick={resetGame}>
                                    Play again
                                </Button>
                            </Stack>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: boardWidth,
                                    height: boardHeight,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                            >
                                {LANES.map((lane, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            width: boardWidth,
                                            height: cellPx,
                                            top: (ROWS - 1 - index) * cellPx,
                                            bgcolor: laneBg(lane.type),
                                            borderTop: '1px solid rgba(0,0,0,0.25)',
                                        }}
                                    >
                                        {lane.type === 'goal' && PADS.map((padCol) => (
                                            <Box
                                                key={padCol}
                                                sx={{
                                                    position: 'absolute',
                                                    left: padCol * cellPx + cellPx * 0.15,
                                                    top: cellPx * 0.15,
                                                    width: cellPx * 0.7,
                                                    height: cellPx * 0.7,
                                                    borderRadius: '6px',
                                                    bgcolor: s.occupiedPads.has(padCol)
                                                        ? alpha(theme.palette.success.main, 0.85)
                                                        : alpha(theme.palette.success.main, 0.2),
                                                    border: `2px solid ${alpha(theme.palette.success.main, 0.7)}`,
                                                }}
                                            />
                                        ))}

                                        {lane.dir && lane.width && (s.obstacles[index] ?? []).map((x, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    position: 'absolute',
                                                    left: x * cellPx,
                                                    top: cellPx * 0.12,
                                                    width: lane.width! * cellPx,
                                                    height: cellPx * 0.76,
                                                    borderRadius: lane.type === 'water' ? '8px' : '4px',
                                                    bgcolor: lane.type === 'water' ? '#8d6748' : theme.palette.error.main,
                                                    border: `1px solid ${lane.type === 'water' ? '#6b4d34' : alpha(theme.palette.error.dark, 0.8)}`,
                                                }}
                                            />
                                        ))}
                                    </Box>
                                ))}

                                {!blinkHidden && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: s.player.col * cellPx + cellPx * 0.12,
                                            top: (ROWS - 1 - s.player.row) * cellPx + cellPx * 0.12,
                                            width: cellPx * 0.76,
                                            height: cellPx * 0.76,
                                            borderRadius: '50%',
                                            bgcolor: theme.palette.primary.main,
                                            boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.7)}`,
                                            transition: 'left 0.08s linear, top 0.08s ease',
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>

                        {!isPlayMode && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                                Arrow keys or WASD to hop one square at a time.
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

export default RoadHop;
