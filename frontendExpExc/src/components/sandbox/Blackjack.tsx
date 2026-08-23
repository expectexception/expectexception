import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Casino, Replay } from '@mui/icons-material';
import Seo from '../seo/Seo';
import GamePlayShell from './shared/GamePlayShell';

const BANKROLL_KEY = 'sandbox_blackjack_bankroll';
const STARTING_BANKROLL = 500;
const BET_STEPS = [10, 25, 50, 100] as const;
const DEALER_DRAW_DELAY_MS = 700;

type Suit = 'S' | 'H' | 'D' | 'C';
const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS: Suit[] = ['H', 'D'];
const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

interface PlayingCard {
    id: string;
    suit: Suit;
    rank: number; // 1-13 (1 = Ace, 11/12/13 = J/Q/K)
}

type Phase = 'betting' | 'player' | 'dealer' | 'settled';
type Outcome = 'player-blackjack' | 'win' | 'lose' | 'push' | 'bust' | null;

const rankLabel = (rank: number) => RANK_LABEL[rank] || String(rank);
const isRed = (suit: Suit) => RED_SUITS.includes(suit);

const buildShuffledDeck = (): PlayingCard[] => {
    const deck: PlayingCard[] = [];
    SUITS.forEach((suit) => {
        for (let rank = 1; rank <= 13; rank++) {
            deck.push({ id: `${suit}${rank}-${Math.random().toString(36).slice(2)}`, suit, rank });
        }
    });
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

/** Best total <= 21 (or the lowest bust total if every combination busts),
 * counting aces as 11 unless that would bust the hand, in which case they
 * drop to 1 one at a time. Also reports whether the hand is currently
 * "soft" (at least one ace is still being counted as 11). */
const handValue = (cards: PlayingCard[]): { total: number; soft: boolean } => {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        if (c.rank === 1) { aces += 1; total += 11; }
        else if (c.rank >= 11) total += 10;
        else total += c.rank;
    }
    let softAcesRemaining = aces;
    while (total > 21 && softAcesRemaining > 0) {
        total -= 10;
        softAcesRemaining -= 1;
    }
    return { total, soft: softAcesRemaining > 0 };
};

const isBlackjack = (cards: PlayingCard[]) => cards.length === 2 && handValue(cards).total === 21;

const loadBankroll = (): number => {
    try {
        const raw = localStorage.getItem(BANKROLL_KEY);
        // Number(null) is 0, not NaN — without this explicit null check, a
        // first-time visitor with no saved bankroll yet reads as "0 chips"
        // instead of falling through to the real starting bankroll, so the
        // game opens straight to "You're out of chips!" for every new player.
        if (raw === null) return STARTING_BANKROLL;
        const n = Number(raw);
        return Number.isFinite(n) && n >= 0 ? n : STARTING_BANKROLL;
    } catch {
        return STARTING_BANKROLL;
    }
};

const saveBankroll = (n: number) => {
    try { localStorage.setItem(BANKROLL_KEY, String(n)); } catch { /* ignore */ }
};

/** Single-deck Blackjack vs. a dealer that stands on all 17s. Bet chips before
 * each round, then Hit / Stand / Double Down. Bankroll persists in
 * localStorage across visits, mirroring the BEST_KEY pattern the other
 * sandbox games use for their best-score persistence. */
const Blackjack: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    const [bankroll, setBankroll] = useState<number>(() => loadBankroll());
    const [bet, setBet] = useState(25);
    const [phase, setPhase] = useState<Phase>('betting');
    const [deck, setDeck] = useState<PlayingCard[]>([]);
    const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
    const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
    const [dealerHidden, setDealerHidden] = useState(true);
    const [outcome, setOutcome] = useState<Outcome>(null);
    const [roundBet, setRoundBet] = useState(0);
    const [message, setMessage] = useState<string>('');
    const dealerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (dealerTimerRef.current) clearTimeout(dealerTimerRef.current);
    }, []);

    const persistBankroll = useCallback((n: number) => {
        setBankroll(n);
        saveBankroll(n);
    }, []);

    const clampBet = useCallback((value: number) => Math.max(10, Math.min(value, bankroll || 10)), [bankroll]);

    const adjustBet = (amount: number) => {
        setBet((b) => Math.max(10, Math.min(b + amount, bankroll)));
    };

    const dealRound = useCallback(() => {
        if (bankroll <= 0) return;
        const wager = clampBet(bet);
        const freshDeck = buildShuffledDeck();
        const pHand = [freshDeck.pop()!, freshDeck.pop()!];
        const dHand = [freshDeck.pop()!, freshDeck.pop()!];
        setDeck(freshDeck);
        setPlayerHand(pHand);
        setDealerHand(dHand);
        setDealerHidden(true);
        setOutcome(null);
        setMessage('');
        setRoundBet(wager);
        setBet(wager);

        if (isBlackjack(pHand)) {
            // Natural blackjack resolves immediately (still reveal the
            // dealer's hole card so the player can see whether it pushed).
            setDealerHidden(false);
            const dealerAlsoBlackjack = isBlackjack(dHand);
            if (dealerAlsoBlackjack) {
                setOutcome('push');
                setMessage('Both have Blackjack — push. Bet returned.');
                persistBankroll(bankroll);
            } else {
                const payout = Math.floor(wager * 1.5);
                setOutcome('player-blackjack');
                setMessage(`Blackjack! You win ${payout} chips (3:2).`);
                persistBankroll(bankroll + payout);
            }
            setPhase('settled');
            return;
        }

        setPhase('player');
    }, [bankroll, bet, clampBet, persistBankroll]);

    const settleRound = useCallback((finalDealerHand: PlayingCard[], wager: number, playerBusted: boolean) => {
        const p = handValue(playerHand);
        const d = handValue(finalDealerHand);
        if (playerBusted) {
            setOutcome('bust');
            setMessage(`Bust with ${p.total}! You lose ${wager} chips.`);
            persistBankroll(bankroll - wager);
        } else if (d.total > 21) {
            setOutcome('win');
            setMessage(`Dealer busts with ${d.total}! You win ${wager} chips.`);
            persistBankroll(bankroll + wager);
        } else if (p.total > d.total) {
            setOutcome('win');
            setMessage(`${p.total} beats ${d.total}. You win ${wager} chips.`);
            persistBankroll(bankroll + wager);
        } else if (p.total < d.total) {
            setOutcome('lose');
            setMessage(`${d.total} beats ${p.total}. You lose ${wager} chips.`);
            persistBankroll(bankroll - wager);
        } else {
            setOutcome('push');
            setMessage(`Push at ${p.total}. Bet returned.`);
            persistBankroll(bankroll);
        }
        setPhase('settled');
    }, [playerHand, bankroll, persistBankroll]);

    const runDealerTurn = useCallback((startingDeck: PlayingCard[], startingHand: PlayingCard[], wager: number, playerBusted: boolean) => {
        setDealerHidden(false);
        setPhase('dealer');

        if (playerBusted) {
            // No need to draw further — player already lost the hand.
            dealerTimerRef.current = setTimeout(() => {
                settleRound(startingHand, wager, true);
            }, DEALER_DRAW_DELAY_MS);
            return;
        }

        let workingDeck = [...startingDeck];
        let workingHand = [...startingHand];

        const step = () => {
            const { total } = handValue(workingHand);
            if (total < 17) {
                const card = workingDeck.pop();
                if (card) {
                    workingHand = [...workingHand, card];
                    setDeck([...workingDeck]);
                    setDealerHand(workingHand);
                    dealerTimerRef.current = setTimeout(step, DEALER_DRAW_DELAY_MS);
                    return;
                }
            }
            settleRound(workingHand, wager, false);
        };
        dealerTimerRef.current = setTimeout(step, DEALER_DRAW_DELAY_MS);
    }, [settleRound]);

    const hit = () => {
        if (phase !== 'player') return;
        const nextDeck = [...deck];
        const card = nextDeck.pop();
        if (!card) return;
        const nextHand = [...playerHand, card];
        setDeck(nextDeck);
        setPlayerHand(nextHand);
        const { total } = handValue(nextHand);
        if (total > 21) {
            runDealerTurn(nextDeck, dealerHand, roundBet, true);
        }
    };

    const stand = () => {
        if (phase !== 'player') return;
        runDealerTurn(deck, dealerHand, roundBet, false);
    };

    const doubleDown = () => {
        if (phase !== 'player' || playerHand.length !== 2 || bankroll < roundBet * 2) return;
        const doubledBet = roundBet * 2;
        const nextDeck = [...deck];
        const card = nextDeck.pop();
        if (!card) return;
        const nextHand = [...playerHand, card];
        setDeck(nextDeck);
        setPlayerHand(nextHand);
        setRoundBet(doubledBet);
        const { total } = handValue(nextHand);
        runDealerTurn(nextDeck, dealerHand, doubledBet, total > 21);
    };

    const newRound = () => {
        setPhase('betting');
        setPlayerHand([]);
        setDealerHand([]);
        setOutcome(null);
        setMessage('');
        setDealerHidden(true);
        setBet((b) => clampBet(b));
    };

    const resetBankroll = () => {
        persistBankroll(STARTING_BANKROLL);
        setBet(25);
        newRound();
    };

    const playerValue = handValue(playerHand);
    const dealerVisibleCards = dealerHidden ? dealerHand.slice(0, 1) : dealerHand;
    const dealerValue = handValue(dealerVisibleCards);
    const canDouble = phase === 'player' && playerHand.length === 2 && bankroll >= roundBet * 2;
    const isPlayerTurn = phase === 'player';
    const isBusted = phase === 'settled' && outcome === 'bust';

    const outcomeColor = () => {
        if (outcome === 'win' || outcome === 'player-blackjack') return theme.palette.success.main;
        if (outcome === 'lose' || outcome === 'bust') return theme.palette.error.main;
        return theme.palette.text.secondary;
    };

    const renderCard = (card: PlayingCard | null, key: string) => {
        const faceDown = card === null;
        return (
            <Box
                key={key}
                sx={{
                    width: 56,
                    height: 78,
                    borderRadius: '8px',
                    bgcolor: faceDown ? alpha(primary, 0.35) : '#f4f4f4',
                    border: '1px solid rgba(0,0,0,0.4)',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: faceDown ? 'transparent' : (card && isRed(card.suit) ? '#c62828' : '#111111'),
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    lineHeight: 1.1,
                    userSelect: 'none',
                    flexShrink: 0,
                }}
            >
                {card ? (
                    <>
                        <span>{rankLabel(card.rank)}</span>
                        <span style={{ fontSize: '1.2rem' }}>{SUIT_SYMBOL[card.suit]}</span>
                    </>
                ) : null}
            </Box>
        );
    };

    const cardRef = useRef<HTMLDivElement | null>(null);
    const bankrollOut = bankroll <= 0 && phase === 'betting';

    return (
        <>
            <Seo
                title="Blackjack - Free Online Casino Card Game"
                description="Play free online Blackjack against a dealer AI. Hit, stand, or double down, manage your chip bankroll, and try to beat the dealer to 21. No sign-up, no real money."
                keywords={['blackjack online', 'blackjack game free', 'play 21 online', 'casino card game', 'blackjack vs dealer', 'free blackjack no download']}
            />
            <GamePlayShell
                icon={Casino}
                title="Blackjack"
                subtitle="Beat the dealer without going over 21. Hit, stand, or double down — dealer stands on all 17s."
                onRestart={newRound}
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
                    }}
                >
                    <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                            <Typography variant="body1" sx={{ fontWeight: 800 }}>
                                Bankroll: <span style={{ color: primary }}>{bankroll}</span> chips
                            </Typography>
                            {phase !== 'betting' && (
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Bet: {roundBet} chips
                                </Typography>
                            )}
                        </Stack>

                        {/* Dealer area */}
                        <Box sx={{ mb: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="body2" fontWeight={800} color="text.secondary">
                                    Dealer {phase === 'dealer' ? '(drawing…)' : ''}
                                </Typography>
                                {dealerHand.length > 0 && (
                                    <Chip
                                        size="small"
                                        label={dealerHidden ? '?' : `${dealerValue.total}${dealerValue.soft ? ' (soft)' : ''}`}
                                        sx={{ bgcolor: alpha(theme.palette.text.primary, 0.08), fontWeight: 800 }}
                                    />
                                )}
                            </Stack>
                            <Box sx={{ display: 'flex', gap: 1, minHeight: 78, flexWrap: 'wrap' }}>
                                {dealerHand.map((card, idx) =>
                                    idx === 1 && dealerHidden
                                        ? renderCard(null, `dealer-hidden-${idx}`)
                                        : renderCard(card, card.id)
                                )}
                            </Box>
                        </Box>

                        {/* Player area */}
                        <Box sx={{ mb: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="body2" fontWeight={800} color="text.secondary">
                                    Your Hand {isPlayerTurn ? '(your turn)' : ''}
                                </Typography>
                                {playerHand.length > 0 && (
                                    <Chip
                                        size="small"
                                        label={`${playerValue.total}${playerValue.soft ? ' (soft)' : ''}`}
                                        sx={{
                                            bgcolor: alpha(isBusted ? theme.palette.error.main : primary, 0.15),
                                            color: isBusted ? theme.palette.error.main : primary,
                                            fontWeight: 800,
                                        }}
                                    />
                                )}
                            </Stack>
                            <Box sx={{ display: 'flex', gap: 1, minHeight: 78, flexWrap: 'wrap' }}>
                                {playerHand.map((card) => renderCard(card, card.id))}
                            </Box>
                        </Box>

                        {/* Outcome banner */}
                        {phase === 'settled' && message && (
                            <Box
                                sx={{
                                    mb: 2,
                                    p: 1.5,
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    bgcolor: alpha(outcomeColor(), 0.12),
                                    border: `1px solid ${alpha(outcomeColor(), 0.4)}`,
                                }}
                            >
                                <Typography variant="body1" fontWeight={800} sx={{ color: outcomeColor() }}>
                                    {outcome === 'player-blackjack' ? 'Blackjack! 🎉' :
                                        outcome === 'win' ? 'You Win! 🎉' :
                                            outcome === 'push' ? 'Push' :
                                                outcome === 'bust' ? 'Bust!' : 'Dealer Wins'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">{message}</Typography>
                            </Box>
                        )}

                        {/* Betting controls */}
                        {phase === 'betting' && !bankrollOut && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
                                    Choose your bet
                                </Typography>
                                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
                                    {BET_STEPS.map((amount) => (
                                        <Button
                                            key={amount}
                                            variant={bet === amount ? 'contained' : 'outlined'}
                                            disabled={amount > bankroll}
                                            onClick={() => setBet(Math.min(amount, bankroll))}
                                            sx={{ minWidth: 64, borderRadius: '10px', fontWeight: 800 }}
                                        >
                                            {amount}
                                        </Button>
                                    ))}
                                </Stack>
                                <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
                                    <Button size="small" variant="outlined" onClick={() => adjustBet(-10)} disabled={bet <= 10} sx={{ minWidth: 40, borderRadius: '8px' }}>−</Button>
                                    <Chip label={`Bet: ${bet}`} sx={{ fontWeight: 800, px: 1 }} />
                                    <Button size="small" variant="outlined" onClick={() => adjustBet(10)} disabled={bet >= bankroll} sx={{ minWidth: 40, borderRadius: '8px' }}>+</Button>
                                </Stack>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={dealRound}
                                    sx={{ py: 1.2, fontWeight: 800, borderRadius: '12px', fontSize: '1rem' }}
                                >
                                    Deal
                                </Button>
                            </Box>
                        )}

                        {bankrollOut && (
                            <Box sx={{ textAlign: 'center', mb: 2 }}>
                                <Typography variant="body1" fontWeight={800} color="error.main" sx={{ mb: 1.5 }}>
                                    You're out of chips!
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<Replay />}
                                    onClick={resetBankroll}
                                    sx={{ fontWeight: 800, borderRadius: '12px' }}
                                >
                                    Reset Bankroll
                                </Button>
                            </Box>
                        )}

                        {/* Action buttons */}
                        {isPlayerTurn && (
                            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" gap={1}>
                                <Button variant="contained" onClick={hit} sx={{ minWidth: 100, fontWeight: 800, borderRadius: '12px' }}>
                                    Hit
                                </Button>
                                <Button variant="outlined" onClick={stand} sx={{ minWidth: 100, fontWeight: 800, borderRadius: '12px' }}>
                                    Stand
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={doubleDown}
                                    disabled={!canDouble}
                                    sx={{ minWidth: 100, fontWeight: 800, borderRadius: '12px' }}
                                >
                                    Double Down
                                </Button>
                            </Stack>
                        )}

                        {phase === 'settled' && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                <Button
                                    variant="contained"
                                    onClick={newRound}
                                    sx={{ px: 4, py: 1.2, fontWeight: 800, borderRadius: '12px', fontSize: '1rem' }}
                                >
                                    Next Round
                                </Button>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </GamePlayShell>
        </>
    );
};

export default Blackjack;
