import { Database } from './database.types';
import { AIPlayer, AIDecision } from './aiPlayer';

type Card = string;
type CardTransfer = Database['public']['Tables']['card_transfers']['Row'];
type GamePlayer = Database['public']['Tables']['game_players']['Row'];

export type CoachingIntensity = 'beginner' | 'intermediate' | 'advanced';
export type MessageType = 'suggestion' | 'explanation' | 'warning' | 'praise' | 'analysis';
export type MessagePriority = 'urgent' | 'important' | 'informational';

export interface CoachingMessage {
  type: MessageType;
  priority: MessagePriority;
  content: string;
  timestamp: number;
}

export interface MoveAnalysis {
  isOptimal: boolean;
  playerDecision: {
    action: string;
    targetPlayer?: string;
    targetCard?: string;
  };
  aiRecommendation: AIDecision;
  reasoning: string;
  alternativeOptions: string[];
}

export class AICoach {
  private intensity: CoachingIntensity;
  private playerId: string;
  private teamId: number;
  private aiPlayer: AIPlayer;
  private messageHistory: CoachingMessage[];

  constructor(playerId: string, teamId: number, intensity: CoachingIntensity = 'beginner') {
    this.playerId = playerId;
    this.teamId = teamId;
    this.intensity = intensity;
    this.aiPlayer = new AIPlayer(playerId, teamId, 'expert');
    this.messageHistory = [];
  }

  public setIntensity(intensity: CoachingIntensity): void {
    this.intensity = intensity;
  }

  public updateGameState(transfers: CardTransfer[]): void {
    this.aiPlayer.updateMemory(transfers);
  }

  private addMessage(type: MessageType, priority: MessagePriority, content: string): CoachingMessage {
    const message: CoachingMessage = {
      type,
      priority,
      content,
      timestamp: Date.now(),
    };
    this.messageHistory.push(message);
    return message;
  }

  public getSuggestionForTurn(
    myCards: Card[],
    allPlayers: GamePlayer[],
    claimedSets: string[]
  ): CoachingMessage {
    const decision = this.aiPlayer.makeDecision(myCards, allPlayers, claimedSets);

    let content = '';
    let priority: MessagePriority = 'important';

    if (decision.action === 'declare_set') {
      content = `🎯 I recommend declaring ${decision.targetSet}! ${decision.reasoning}`;
      priority = 'urgent';
    } else if (decision.action === 'ask_card') {
      content = `💡 Consider asking for ${decision.targetCard} from the player holding it. ${decision.reasoning}`;
      priority = 'important';
    } else {
      content = `📊 ${decision.reasoning}`;
      priority = 'informational';
    }

    if (this.intensity === 'beginner') {
      content += '\n\n💭 This move gives you the best chance of completing a set based on the cards you hold and what we know about other players.';
    }

    return this.addMessage('suggestion', priority, content);
  }

  public analyzeOpponentMove(
    transfer: CardTransfer,
    allPlayers: GamePlayer[]
  ): CoachingMessage {
    const fromPlayer = allPlayers.find(p => p.player_id === transfer.from_player_id);
    const toPlayer = allPlayers.find(p => p.player_id === transfer.to_player_id);

    if (!fromPlayer || !toPlayer) {
      return this.addMessage('explanation', 'informational', 'Move recorded.');
    }

    let content = '';
    const isTeammate = fromPlayer.team === this.teamId;

    if (transfer.successful) {
      content = `✅ ${toPlayer.player_id === this.playerId ? 'You' : 'A player'} successfully got ${transfer.card} from ${fromPlayer.player_id === this.playerId ? 'you' : 'another player'}.\n\n`;

      if (this.intensity === 'beginner') {
        content += `📚 When a call succeeds, it means the caller knew or guessed correctly where that card was. This information helps you deduce which sets they're working on.`;
      } else if (this.intensity === 'intermediate') {
        content += `🧠 The caller likely has other cards from the same set. Watch for patterns to deduce their strategy.`;
      } else {
        content += `🎓 Advanced tip: Successful calls reveal set ownership. Cross-reference with previous moves to map out their complete hand.`;
      }
    } else {
      content = `❌ ${toPlayer.player_id === this.playerId ? 'You' : 'A player'} asked ${fromPlayer.player_id === this.playerId ? 'you' : 'another player'} for ${transfer.card} but they didn't have it.\n\n`;

      if (this.intensity === 'beginner') {
        content += `📚 Failed calls are valuable! Now you know that player doesn't have ${transfer.card}. This helps you narrow down who might have it.`;
      } else {
        content += `🧠 This failed call reveals card distribution. Update your mental map of who holds which cards.`;
      }
    }

    const priority: MessagePriority = isTeammate ? 'important' : 'informational';
    return this.addMessage('explanation', priority, content);
  }

  public evaluatePlayerMove(
    playerMove: { action: string; targetPlayer?: string; targetCard?: string },
    myCards: Card[],
    allPlayers: GamePlayer[],
    claimedSets: string[]
  ): CoachingMessage {
    const aiDecision = this.aiPlayer.makeDecision(myCards, allPlayers, claimedSets);

    const isOptimal =
      playerMove.action === aiDecision.action &&
      playerMove.targetCard === aiDecision.targetCard &&
      playerMove.targetPlayer === aiDecision.targetPlayer;

    let content = '';
    let priority: MessagePriority = 'informational';
    let type: MessageType = 'analysis';

    if (isOptimal) {
      content = `🌟 Excellent move! You chose the optimal play. ${aiDecision.reasoning}`;
      type = 'praise';
      priority = 'informational';
    } else {
      content = `🤔 That's an interesting choice. Here's what I would have recommended:\n\n`;

      if (aiDecision.action === 'ask_card') {
        content += `💡 Ask for ${aiDecision.targetCard} instead. ${aiDecision.reasoning}\n\n`;
      } else if (aiDecision.action === 'declare_set') {
        content += `💡 Consider declaring ${aiDecision.targetSet}. ${aiDecision.reasoning}\n\n`;
      }

      content += `Your move might still work out, but this alternative could have been more strategic.`;
      type = 'explanation';
      priority = 'important';
    }

    return this.addMessage(type, priority, content);
  }

  public explainIntraTeamCollection(
    setName: string,
    cardsToCollect: Card[],
    risk: number
  ): CoachingMessage {
    let content = `🎯 Intra-Team Collection for ${setName}\n\n`;

    if (risk < 0.3) {
      content += `✅ Low Risk: You have high confidence that your teammate holds these cards: ${cardsToCollect.join(', ')}.\n\n`;
      content += `This is a good time to initiate intra-team collection.`;
    } else if (risk < 0.6) {
      content += `⚠️ Medium Risk: There's some uncertainty about card locations.\n\n`;
      content += `If you're wrong about any card, the entire set transfers to the opponent team as a penalty!`;
    } else {
      content += `🚨 High Risk: You don't have strong evidence that your teammate holds all these cards.\n\n`;
      content += `Consider waiting until you have more information before attempting intra-team collection.`;
    }

    if (this.intensity === 'beginner') {
      content += `\n\n📚 Remember: During intra-team collection, you call cards from your teammate one by one. If any card is actually held by an opponent, they reveal it and claim your entire set!`;
    }

    const priority: MessagePriority = risk > 0.6 ? 'urgent' : risk > 0.3 ? 'important' : 'informational';
    return this.addMessage('analysis', priority, content);
  }

  public highlightStrategicSignal(
    transfer: CardTransfer,
    signalType: 'intentional_fail' | 'information_sharing' | 'blocking',
    explanation: string
  ): CoachingMessage {
    let content = '';

    if (signalType === 'intentional_fail') {
      content = `👀 Strategic Signal Detected!\n\n`;
      content += `That failed call might have been intentional to communicate information to their teammate.\n\n`;
      content += explanation;
    } else if (signalType === 'information_sharing') {
      content = `🤝 Team Coordination Spotted!\n\n`;
      content += `The players are using their calls to share information about card locations.\n\n`;
      content += explanation;
    } else {
      content = `🛡️ Blocking Strategy!\n\n`;
      content += `That move was designed to prevent opponents from completing their set.\n\n`;
      content += explanation;
    }

    if (this.intensity === 'advanced') {
      content += `\n\n🎓 This is an advanced technique. Watch for similar patterns in future games.`;
    }

    return this.addMessage('explanation', 'important', content);
  }

  public warnAboutMistake(
    mistakeType: 'too_many_sets' | 'revealing_info' | 'risky_declaration' | 'poor_targeting',
    details: string
  ): CoachingMessage {
    let content = '⚠️ Watch Out!\n\n';

    switch (mistakeType) {
      case 'too_many_sets':
        content += `You're pursuing too many different sets at once. This makes it harder to remember card locations and coordinate with your teammate.\n\n`;
        content += `💡 Tip: Focus on 2-3 sets maximum for better memory management.`;
        break;
      case 'revealing_info':
        content += `That move revealed information about your hand to opponents.\n\n`;
        content += details;
        break;
      case 'risky_declaration':
        content += `Declaring this set is risky! You might not have all the cards.\n\n`;
        content += details;
        break;
      case 'poor_targeting':
        content += `Asking that player for that card has a low probability of success.\n\n`;
        content += details;
        break;
    }

    return this.addMessage('warning', 'urgent', content);
  }

  public provideMemoryAssistance(
    activeCards: Map<Card, string | null>,
    knownLocations: Map<Card, string>
  ): CoachingMessage {
    let content = '🧠 Card Tracking Update\n\n';

    const knownCount = knownLocations.size;
    const unknownCount = activeCards.size - knownCount;

    content += `📊 You're tracking ${activeCards.size} cards:\n`;
    content += `  ✅ ${knownCount} with known locations\n`;
    content += `  ❓ ${unknownCount} with unknown locations\n\n`;

    if (unknownCount > 10 && this.intensity === 'beginner') {
      content += `💡 Tip: That's a lot of cards to remember! Try focusing on fewer sets to reduce mental load.`;
    } else if (knownCount > 5) {
      content += `🌟 Great job tracking card locations! Use this knowledge to make strategic calls.`;
    }

    return this.addMessage('analysis', 'informational', content);
  }

  public getMessageHistory(): CoachingMessage[] {
    return [...this.messageHistory];
  }

  public clearHistory(): void {
    this.messageHistory = [];
  }
}

export function createAICoach(playerId: string, teamId: number, intensity: CoachingIntensity): AICoach {
  return new AICoach(playerId, teamId, intensity);
}
