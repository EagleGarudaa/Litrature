import { CardSuit, CardRank, CardType } from './database.types';

export interface Card {
  suit: CardSuit;
  rank: CardRank;
  type: CardType;
}

const MINOR_RANKS: CardRank[] = ['2', '3', '4', '5', '6', '7'];
const MAJOR_RANKS: CardRank[] = ['9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export function generateDeck(): Card[] {
  const deck: Card[] = [];

  SUITS.forEach(suit => {
    MINOR_RANKS.forEach(rank => {
      deck.push({ suit, rank, type: 'minor' });
    });
    MAJOR_RANKS.forEach(rank => {
      deck.push({ suit, rank, type: 'major' });
    });
  });

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(playerCount: number): Card[][] {
  const deck = shuffleDeck(generateDeck());
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);

  deck.forEach((card, index) => {
    hands[index % playerCount].push(card);
  });

  return hands;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function isValidCardAsk(
  playerCards: Card[],
  askedCard: Card
): boolean {
  const hasSameSet = playerCards.some(
    card => card.suit === askedCard.suit && card.type === askedCard.type
  );

  const alreadyHasCard = playerCards.some(
    card => card.suit === askedCard.suit && card.rank === askedCard.rank
  );

  return hasSameSet && !alreadyHasCard;
}

export function isCompleteSet(cards: Card[], suit: CardSuit, type: CardType): boolean {
  const setCards = cards.filter(card => card.suit === suit && card.type === type);
  const requiredRanks = type === 'minor' ? MINOR_RANKS : MAJOR_RANKS;

  if (setCards.length !== requiredRanks.length) {
    return false;
  }

  const cardRanks = setCards.map(card => card.rank).sort();
  const sortedRequiredRanks = [...requiredRanks].sort();

  return cardRanks.every((rank, index) => rank === sortedRequiredRanks[index]);
}

export function getSetCards(suit: CardSuit, type: CardType): Card[] {
  const ranks = type === 'minor' ? MINOR_RANKS : MAJOR_RANKS;
  return ranks.map(rank => ({ suit, rank, type }));
}

export function getSuitSymbol(suit: CardSuit): string {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  return symbols[suit];
}

export function getSuitColor(suit: CardSuit): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-slate-800';
}

export function getCardDisplayName(card: Card): string {
  return `${card.rank}${getSuitSymbol(card.suit)}`;
}

export function getSetSymbol(suit: CardSuit, type: CardType): string {
  const suitSymbol = getSuitSymbol(suit);
  const typeSymbol = type === 'major' ? '🔺' : '🔻';
  return `${suitSymbol}${typeSymbol}`;
}

export function getSetName(suit: CardSuit, type: CardType): string {
  const suitName = suit.charAt(0).toUpperCase() + suit.slice(1);
  const typeName = type.charAt(0).toUpperCase() + type.slice(1);
  return `${suitName} ${typeName}`;
}

export const ALL_SETS: Array<{ suit: CardSuit; type: CardType }> = [
  { suit: 'hearts', type: 'major' },
  { suit: 'hearts', type: 'minor' },
  { suit: 'diamonds', type: 'major' },
  { suit: 'diamonds', type: 'minor' },
  { suit: 'clubs', type: 'major' },
  { suit: 'clubs', type: 'minor' },
  { suit: 'spades', type: 'major' },
  { suit: 'spades', type: 'minor' },
];

export function getSetPoints(type: CardType): number {
  return type === 'minor' ? 5 : 10;
}

export function calculateTeamPoints(claimedSets: Array<{ set_type: CardType }>): number {
  return claimedSets.reduce((total, set) => total + getSetPoints(set.set_type), 0);
}

export function checkGameCompletion(
  teamAClaimedSets: number,
  teamBClaimedSets: number
): boolean {
  const totalSets = 8;
  return teamAClaimedSets + teamBClaimedSets === totalSets;
}

export function determineWinner(
  teamAPoints: number,
  teamBPoints: number
): 'team_a' | 'team_b' | 'draw' {
  if (teamAPoints > teamBPoints) return 'team_a';
  if (teamBPoints > teamAPoints) return 'team_b';
  return 'draw';
}
