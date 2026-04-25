import { Database } from './database.types';

type Card = string;
type GameStatus = Database['public']['Tables']['games']['Row'];
type GamePlayer = Database['public']['Tables']['game_players']['Row'];
type CardTransfer = Database['public']['Tables']['card_transfers']['Row'];

export type DifficultyLevel = 'beginner' | 'intermediate' | 'expert';

export interface CardLocation {
  card: Card;
  probableHolder: string | null;
  probability: number;
  knownLocation: boolean;
}

export interface SetAnalysis {
  setName: string;
  cards: Card[];
  cardsHeld: Card[];
  cardsKnown: CardLocation[];
  cardsUnknown: CardLocation[];
  completionProbability: number;
  worthPursuing: boolean;
}

export interface AIDecision {
  action: 'ask_card' | 'declare_set' | 'intra_team_call';
  targetPlayer?: string;
  targetCard?: Card;
  targetSet?: string;
  reasoning: string;
  confidence: number;
}

const CARD_SETS = {
  'Low Clubs': ['3C', '4C', '5C', '6C', '7C', '8C'],
  'Low Diamonds': ['3D', '4D', '5D', '6D', '7D', '8D'],
  'Low Hearts': ['3H', '4H', '5H', '6H', '7H', '8H'],
  'Low Spades': ['3S', '4S', '5S', '6S', '7S', '8S'],
  'High Clubs': ['9C', 'TC', 'JC', 'QC', 'KC', 'AC'],
  'High Diamonds': ['9D', 'TD', 'JD', 'QD', 'KD', 'AD'],
  'High Hearts': ['9H', 'TH', 'JH', 'QH', 'KH', 'AH'],
  'High Spades': ['9S', 'TS', 'JS', 'QS', 'KS', 'AS'],
};

const SET_POINTS: Record<string, number> = {
  'Low Clubs': 5,
  'Low Diamonds': 5,
  'Low Hearts': 5,
  'Low Spades': 5,
  'High Clubs': 10,
  'High Diamonds': 10,
  'High Hearts': 10,
  'High Spades': 10,
};

export class AIPlayer {
  private difficulty: DifficultyLevel;
  private playerId: string;
  private teamId: number;
  private memory: Map<Card, CardLocation>;
  private transferHistory: CardTransfer[];

  constructor(playerId: string, teamId: number, difficulty: DifficultyLevel = 'intermediate') {
    this.playerId = playerId;
    this.teamId = teamId;
    this.difficulty = difficulty;
    this.memory = new Map();
    this.transferHistory = [];
  }

  public updateMemory(transfers: CardTransfer[]): void {
    this.transferHistory = transfers;

    transfers.forEach(transfer => {
      if (transfer.successful) {
        this.memory.set(transfer.card, {
          card: transfer.card,
          probableHolder: transfer.to_player_id,
          probability: 1.0,
          knownLocation: true,
        });
      } else {
        this.memory.set(transfer.card, {
          card: transfer.card,
          probableHolder: null,
          probability: 0,
          knownLocation: true,
        });
      }
    });
  }

  private analyzeSet(setName: string, myCards: Card[], allPlayers: GamePlayer[]): SetAnalysis {
    const setCards = CARD_SETS[setName as keyof typeof CARD_SETS] || [];
    const cardsHeld = setCards.filter(card => myCards.includes(card));
    const cardsNeeded = setCards.filter(card => !myCards.includes(card));

    const cardsKnown: CardLocation[] = [];
    const cardsUnknown: CardLocation[] = [];

    cardsNeeded.forEach(card => {
      const location = this.memory.get(card);
      if (location && location.knownLocation) {
        cardsKnown.push(location);
      } else {
        const probability = this.calculateCardProbability(card, allPlayers);
        cardsUnknown.push({
          card,
          probableHolder: probability.mostLikelyPlayer,
          probability: probability.confidence,
          knownLocation: false,
        });
      }
    });

    const completionProbability = this.calculateSetCompletionProbability(cardsHeld, cardsKnown, cardsUnknown);
    const worthPursuing = cardsHeld.length > 0 && completionProbability > 0.3;

    return {
      setName,
      cards: setCards,
      cardsHeld,
      cardsKnown,
      cardsUnknown,
      completionProbability,
      worthPursuing,
    };
  }

  private calculateCardProbability(card: Card, allPlayers: GamePlayer[]): { mostLikelyPlayer: string; confidence: number } {
    const opponents = allPlayers.filter(p => p.team !== this.teamId && !p.is_ai);

    if (opponents.length === 0) {
      return { mostLikelyPlayer: '', confidence: 0 };
    }

    const equalProbability = 1 / opponents.length;
    return {
      mostLikelyPlayer: opponents[0].player_id,
      confidence: equalProbability,
    };
  }

  private calculateSetCompletionProbability(cardsHeld: Card[], cardsKnown: CardLocation[], cardsUnknown: CardLocation[]): number {
    if (cardsHeld.length === 0) return 0;

    const totalCards = cardsHeld.length + cardsKnown.length + cardsUnknown.length;
    if (totalCards < 6) return 0;

    const knownProbability = cardsKnown.reduce((sum, loc) => sum + loc.probability, 0) / Math.max(1, cardsKnown.length);
    const unknownProbability = cardsUnknown.reduce((sum, loc) => sum + loc.probability, 0) / Math.max(1, cardsUnknown.length);

    const weightedProbability = (
      (cardsHeld.length * 1.0 + cardsKnown.length * knownProbability + cardsUnknown.length * unknownProbability) / 6
    );

    return weightedProbability;
  }

  private selectBestSet(myCards: Card[], allPlayers: GamePlayer[]): SetAnalysis | null {
    const setAnalyses = Object.keys(CARD_SETS).map(setName =>
      this.analyzeSet(setName, myCards, allPlayers)
    );

    const pursuableSets = setAnalyses.filter(analysis => analysis.worthPursuing);

    if (pursuableSets.length === 0) return null;

    pursuableSets.sort((a, b) => {
      const scoreA = a.cardsHeld.length * 2 + a.completionProbability * 10;
      const scoreB = b.cardsHeld.length * 2 + b.completionProbability * 10;
      return scoreB - scoreA;
    });

    return pursuableSets[0];
  }

  private shouldDeclareSet(analysis: SetAnalysis, myCards: Card[], teammates: GamePlayer[]): boolean {
    const allCardsCollected = analysis.cards.every(card => myCards.includes(card));

    if (allCardsCollected) return true;

    if (this.difficulty === 'beginner') {
      return allCardsCollected;
    }

    const hasAllKnownCards = analysis.cardsKnown.every(loc =>
      myCards.includes(loc.card)
    );
    const highConfidenceInCompletion = analysis.completionProbability > 0.95;

    return hasAllKnownCards && highConfidenceInCompletion;
  }

  private selectTargetPlayer(card: Card, allPlayers: GamePlayer[]): string | null {
    const location = this.memory.get(card);

    if (location && location.knownLocation && location.probableHolder) {
      return location.probableHolder;
    }

    const opponents = allPlayers.filter(p =>
      p.team !== this.teamId &&
      p.player_id !== this.playerId &&
      !p.is_ai
    );

    if (opponents.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * opponents.length);
    return opponents[randomIndex].player_id;
  }

  public makeDecision(
    myCards: Card[],
    allPlayers: GamePlayer[],
    claimedSets: string[]
  ): AIDecision {
    const availableSets = Object.keys(CARD_SETS).filter(set => !claimedSets.includes(set));
    const myAvailableCards = myCards.filter(card => {
      const cardSet = this.getCardSet(card);
      return cardSet && availableSets.includes(cardSet);
    });

    const bestSet = this.selectBestSet(myAvailableCards, allPlayers);

    if (!bestSet) {
      return {
        action: 'ask_card',
        reasoning: 'No viable sets available, making random move',
        confidence: 0.1,
      };
    }

    if (this.shouldDeclareSet(bestSet, myCards, allPlayers.filter(p => p.team === this.teamId))) {
      return {
        action: 'declare_set',
        targetSet: bestSet.setName,
        reasoning: `Declaring ${bestSet.setName} with high confidence of completion`,
        confidence: bestSet.completionProbability,
      };
    }

    const targetCard = bestSet.cardsUnknown[0] || bestSet.cardsKnown[0];
    if (!targetCard) {
      return {
        action: 'ask_card',
        reasoning: 'No target card identified',
        confidence: 0.1,
      };
    }

    const targetPlayer = this.selectTargetPlayer(targetCard.card, allPlayers);

    if (!targetPlayer) {
      return {
        action: 'ask_card',
        reasoning: 'No valid target player found',
        confidence: 0.1,
      };
    }

    return {
      action: 'ask_card',
      targetPlayer,
      targetCard: targetCard.card,
      reasoning: `Asking for ${targetCard.card} from ${bestSet.setName} with ${Math.round(targetCard.probability * 100)}% confidence`,
      confidence: targetCard.probability,
    };
  }

  private getCardSet(card: Card): string | null {
    for (const [setName, cards] of Object.entries(CARD_SETS)) {
      if (cards.includes(card)) {
        return setName;
      }
    }
    return null;
  }

  public applyDifficultyAdjustments(decision: AIDecision): AIDecision {
    if (this.difficulty === 'beginner') {
      if (Math.random() < 0.3) {
        return {
          ...decision,
          reasoning: decision.reasoning + ' (Beginner: suboptimal choice)',
          confidence: decision.confidence * 0.7,
        };
      }
    } else if (this.difficulty === 'expert') {
      return {
        ...decision,
        confidence: Math.min(1.0, decision.confidence * 1.2),
      };
    }

    return decision;
  }
}

export function createAIPlayer(playerId: string, teamId: number, difficulty: DifficultyLevel): AIPlayer {
  return new AIPlayer(playerId, teamId, difficulty);
}
