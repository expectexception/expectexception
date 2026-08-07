import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, Box, Typography, Button, Stack, LinearProgress, useTheme, alpha } from '@mui/material';
import { Quiz, Replay, CheckCircle, Cancel } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';
import ActionButtons from './shared/ActionButtons';

interface TriviaQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    category: string;
}

const QUESTION_BANK: TriviaQuestion[] = [
    { question: 'What is the capital of Japan?', options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'], correctIndex: 2, category: 'Geography' },
    { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1, category: 'Science' },
    { question: 'Who wrote "Romeo and Juliet"?', options: ['Charles Dickens', 'Mark Twain', 'William Shakespeare', 'Jane Austen'], correctIndex: 2, category: 'Literature' },
    { question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIndex: 3, category: 'Geography' },
    { question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctIndex: 2, category: 'Geography' },
    { question: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correctIndex: 2, category: 'Science' },
    { question: 'Which language has the most native speakers?', options: ['English', 'Hindi', 'Spanish', 'Mandarin Chinese'], correctIndex: 3, category: 'General' },
    { question: 'In what year did the Titanic sink?', options: ['1905', '1912', '1918', '1923'], correctIndex: 1, category: 'History' },
    { question: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], correctIndex: 2, category: 'Math' },
    { question: 'Which gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correctIndex: 2, category: 'Science' },
    { question: 'Who painted the Mona Lisa?', options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Claude Monet'], correctIndex: 2, category: 'Art' },
    { question: 'What is the tallest mountain in the world?', options: ['K2', 'Kangchenjunga', 'Everest', 'Lhotse'], correctIndex: 2, category: 'Geography' },
    { question: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], correctIndex: 1, category: 'Science' },
    { question: 'What is the currency of Japan?', options: ['Won', 'Yuan', 'Yen', 'Ringgit'], correctIndex: 2, category: 'General' },
    { question: 'Which organ pumps blood through the human body?', options: ['Lungs', 'Liver', 'Heart', 'Kidney'], correctIndex: 2, category: 'Science' },
    { question: 'What is the freezing point of water in Celsius?', options: ['-10', '0', '10', '32'], correctIndex: 1, category: 'Science' },
    { question: 'Which country hosted the 2016 Summer Olympics?', options: ['China', 'UK', 'Brazil', 'Japan'], correctIndex: 2, category: 'History' },
    { question: 'What does "www" stand for?', options: ['World Wide Web', 'World Web Wide', 'Wide World Web', 'Web World Wide'], correctIndex: 0, category: 'Tech' },
    { question: 'Which planet has the most moons?', options: ['Earth', 'Mars', 'Saturn', 'Mercury'], correctIndex: 2, category: 'Science' },
    { question: 'What is the largest mammal in the world?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Polar Bear'], correctIndex: 1, category: 'Science' },
];

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 15; // seconds
const BEST_SCORE_KEY = 'sandbox_trivia_best';

const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const readBest = (): number => {
    try {
        const raw = localStorage.getItem(BEST_SCORE_KEY);
        const parsed = raw ? parseInt(raw, 10) : 0;
        return Number.isFinite(parsed) ? parsed : 0;
    } catch {
        return 0;
    }
};

const writeBest = (value: number) => {
    try {
        localStorage.setItem(BEST_SCORE_KEY, String(value));
    } catch {
        // ignore storage errors
    }
};

/** Tap-to-answer multiple choice trivia. A fresh round of QUESTIONS_PER_ROUND
 * questions (order + option order shuffled) each round, a per-question
 * countdown, and a running score - entirely tap-based, no keyboard needed. */
const TriviaQuiz: React.FC = () => {
    const theme = useTheme();
    const [round, setRound] = useState<TriviaQuestion[]>(() => shuffle(QUESTION_BANK).slice(0, QUESTIONS_PER_ROUND));
    const [index, setIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(readBest);
    const [selected, setSelected] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
    const [finished, setFinished] = useState(false);
    const answeredRef = useRef(false);

    const current = round[index];

    const nextQuestion = useCallback(() => {
        setSelected(null);
        answeredRef.current = false;
        setTimeLeft(TIME_PER_QUESTION);
        setIndex((i) => {
            const next = i + 1;
            if (next >= round.length) {
                setFinished(true);
                return i;
            }
            return next;
        });
    }, [round.length]);

    const handleAnswer = useCallback((optionIndex: number | null) => {
        if (answeredRef.current || finished) return;
        answeredRef.current = true;
        setSelected(optionIndex);
        if (optionIndex !== null && optionIndex === current?.correctIndex) {
            setScore((s) => s + 1);
        }
        window.setTimeout(nextQuestion, 900);
    }, [current, finished, nextQuestion]);

    // Per-question countdown timer.
    useEffect(() => {
        if (finished) return undefined;
        if (timeLeft <= 0) {
            handleAnswer(null);
            return undefined;
        }
        const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
        return () => window.clearTimeout(t);
    }, [timeLeft, finished, handleAnswer]);

    useEffect(() => {
        if (finished && score > best) {
            setBest(score);
            writeBest(score);
        }
    }, [finished, score, best]);

    const newRound = useCallback(() => {
        setRound(shuffle(QUESTION_BANK).slice(0, QUESTIONS_PER_ROUND));
        setIndex(0);
        setScore(0);
        setSelected(null);
        setTimeLeft(TIME_PER_QUESTION);
        setFinished(false);
        answeredRef.current = false;
    }, []);

    const optionLetters = useMemo(() => ['A', 'B', 'C', 'D'], []);
    const cardRef = useRef<HTMLDivElement | null>(null);

    const skipButton = !finished && current ? (
        <ActionButtons
            buttons={[{ key: 'skip', label: 'SKIP', onPress: () => handleAnswer(null), accentColor: theme.palette.warning.main, size: 'small' }]}
        />
    ) : undefined;

    return (
        <>
            <Seo title="Trivia Quiz - Free Multiple Choice Knowledge Game" gameId={31} />
            <GamePlayShell
                icon={Quiz}
                title="Trivia Quiz"
                subtitle="Tap the correct answer before time runs out. 10 questions a round, mixed categories, new order every time."
                onRestart={newRound}
                controls={skipButton}
            >
                <Card
                    ref={cardRef}
                    sx={{
                        background: 'rgba(13, 14, 18, 0.5)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: { xs: '16px', sm: '24px' },
                        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                        p: { xs: 1.5, sm: 3 },
                        width: '100%',
                        maxWidth: 460,
                        mx: 'auto',
                    }}
                >
                    <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="body2" fontWeight={800}>
                                Score: <span style={{ color: theme.palette.primary.main }}>{score}</span>
                            </Typography>
                            <Typography variant="body2" fontWeight={800} color="text.secondary">
                                Best: {best}
                            </Typography>
                        </Stack>

                        {!finished && current ? (
                            <>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Question {index + 1} / {round.length} · {current.category}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={800} color={timeLeft <= 5 ? 'error.main' : 'text.secondary'}>
                                        {timeLeft}s
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={(timeLeft / TIME_PER_QUESTION) * 100}
                                    sx={{
                                        height: 5,
                                        borderRadius: 3,
                                        mb: 2.5,
                                        bgcolor: 'rgba(255,255,255,0.08)',
                                        '& .MuiLinearProgress-bar': { bgcolor: timeLeft <= 5 ? theme.palette.error.main : theme.palette.primary.main },
                                    }}
                                />

                                <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5, minHeight: 64 }}>
                                    {current.question}
                                </Typography>

                                <Stack spacing={1.25}>
                                    {current.options.map((option, optIdx) => {
                                        const isCorrect = optIdx === current.correctIndex;
                                        const isPicked = selected === optIdx;
                                        const showResult = selected !== null;
                                        let bg = 'rgba(255,255,255,0.04)';
                                        let border = '1px solid rgba(255,255,255,0.1)';
                                        if (showResult && isCorrect) {
                                            bg = alpha(theme.palette.success.main, 0.18);
                                            border = `1px solid ${theme.palette.success.main}`;
                                        } else if (showResult && isPicked && !isCorrect) {
                                            bg = alpha(theme.palette.error.main, 0.18);
                                            border = `1px solid ${theme.palette.error.main}`;
                                        }
                                        return (
                                            <Box
                                                key={optIdx}
                                                onClick={() => handleAnswer(optIdx)}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.5,
                                                    px: 2,
                                                    py: 1.25,
                                                    borderRadius: '12px',
                                                    bgcolor: bg,
                                                    border,
                                                    cursor: showResult ? 'default' : 'pointer',
                                                    transition: 'background-color 0.2s ease',
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={900} color="text.secondary">
                                                    {optionLetters[optIdx]}
                                                </Typography>
                                                <Typography variant="body1" fontWeight={700} sx={{ flex: 1 }}>
                                                    {option}
                                                </Typography>
                                                {showResult && isCorrect && <CheckCircle sx={{ color: theme.palette.success.main }} fontSize="small" />}
                                                {showResult && isPicked && !isCorrect && <Cancel sx={{ color: theme.palette.error.main }} fontSize="small" />}
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 3 }}>
                                <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
                                    Round Complete
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                    You scored {score} / {round.length}
                                </Typography>
                                <Button variant="contained" startIcon={<Replay />} onClick={newRound} sx={{ borderRadius: '12px', px: 3, fontWeight: 800 }}>
                                    Play Again
                                </Button>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default TriviaQuiz;
