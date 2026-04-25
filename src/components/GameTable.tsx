import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MessageSquare, Bot } from 'lucide-react';
import { Card as CardType, getSuitSymbol, getSuitColor, isValidCardAsk, isCompleteSet } from '../lib/gameLogic';
import type { Database, CardSuit, CardRank, CardType as CardTypeEnum } from '../lib/database.types';
import { CardHand } from './CardHand';
import { PlayerSeats } from './PlayerSeats';
import { GameLog } from './GameLog';
import { SetDeclaration } from './SetDeclaration';
import { TeamChat } from './TeamChat';
import { StatusBoard } from './StatusBoard';
import { executeAiTurn } from '../lib/aiEngine';

type Game = Database['public']['Tables']['games']['Row'];
type GamePlayer = Database['public']['Tables']['game_players']['Row'] & {
  player_profiles: { username: string } | null;
};
type GameCard = Database['public']['Tables']['game_cards']['Row'];
type GameMove = Database['public']['Tables']['game_moves']['Row'];
type ClaimedSet = Database['public']['Tables']['claimed_sets']['Row'];

interface GameTableProps {
  gameId: string;
  onLeave: () => void;
}

export function GameTable({ gameId, onLeave }: GameTableProps) {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [myCards, setMyCards] = useState<CardType[]>([]);
  const [allPlayerCards, setAllPlayerCards] = useState<Record<string, number>>({});
  const [moves, setMoves] = useState<GameMove[]>([]);
  const [claimedSets, setClaimedSets] = useState<ClaimedSet[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showSetDeclaration, setShowSetDeclaration] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [myTeam, setMyTeam] = useState<'team_a' | 'team_b'>('team_a');
  const [aiThinking, setAiThinking] = useState(false);
  const aiTurnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadGameData();

    const gameChannel = supabase
      .channel(`game-table-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          setGame(payload.new as Game);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_cards',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          loadCards();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_moves',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          loadMoves();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'claimed_sets',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          loadClaimedSets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId]);

  // Trigger AI turn whenever the current player is an AI bot
  useEffect(() => {
    if (!game || !players.length) return;

    const currentPlayer = players.find(p => p.player_id === game.current_turn_player_id);
    if (!currentPlayer?.is_ai) return;

    // Clear any pending timer
    if (aiTurnTimer.current) clearTimeout(aiTurnTimer.current);

    setAiThinking(true);

    // Brief delay so the human can see the state before the AI moves
    aiTurnTimer.current = setTimeout(async () => {
      await executeAiTurn(gameId, currentPlayer.player_id);
      setAiThinking(false);
    }, 1400);

    return () => {
      if (aiTurnTimer.current) clearTimeout(aiTurnTimer.current);
    };
  }, [game?.current_turn_player_id, players, gameId]);

  const loadGameData = async () => {
    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameData) {
      setGame(gameData);
    }

    const { data: playersData } = await supabase
      .from('game_players')
      .select(`
        *,
        player_profiles (username)
      `)
      .eq('game_id', gameId)
      .order('seat_position');

    if (playersData) {
      setPlayers(playersData as GamePlayer[]);
      const currentPlayer = playersData.find(p => p.player_id === user?.id);
      if (currentPlayer) {
        setMyTeam(currentPlayer.team);
      }
    }

    await loadCards();
    await loadMoves();
    await loadClaimedSets();
  };

  const loadCards = async () => {
    if (!user) return;

    const { data: myCardsData } = await supabase
      .from('game_cards')
      .select('*')
      .eq('game_id', gameId)
      .eq('player_id', user.id)
      .eq('is_in_claimed_set', false);

    if (myCardsData) {
      const cards: CardType[] = myCardsData.map(c => ({
        suit: c.card_suit,
        rank: c.card_rank,
        type: c.card_type,
      }));
      setMyCards(cards);
    }

    const { data: allCardsData } = await supabase
      .from('game_cards')
      .select('player_id')
      .eq('game_id', gameId)
      .eq('is_in_claimed_set', false);

    if (allCardsData) {
      const cardCounts: Record<string, number> = {};
      allCardsData.forEach(card => {
        if (card.player_id) {
          cardCounts[card.player_id] = (cardCounts[card.player_id] || 0) + 1;
        }
      });
      setAllPlayerCards(cardCounts);
    }
  };

  const loadMoves = async () => {
    const { data } = await supabase
      .from('game_moves')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setMoves(data);
    }
  };

  const loadClaimedSets = async () => {
    const { data } = await supabase
      .from('claimed_sets')
      .select('*')
      .eq('game_id', gameId);

    if (data) {
      setClaimedSets(data);
    }
  };

  // IMPORTANT: This function handles regular card asks from opponents only.
  // For intra-team collection, a separate function is needed that enforces:
  // CRITICAL RULE: When calling a card from a teammate, you must specify WHICH teammate.
  // If the WRONG teammate has it (even on your own team), it's a FAIL and the set
  // transfers to the opponent team. You must call from the EXACT player who holds the card.
  const askForCard = async () => {
    if (!user || !game || !selectedCard || !selectedPlayer) return;

    if (game.current_turn_player_id !== user.id) {
      alert("It's not your turn!");
      return;
    }

    if (!isValidCardAsk(myCards, selectedCard)) {
      alert('You can only ask for cards from sets you already have!');
      return;
    }

    const targetPlayer = players.find(p => p.player_id === selectedPlayer);
    if (!targetPlayer || targetPlayer.team === myTeam) {
      alert('You can only ask opponents for cards!');
      return;
    }

    const { data: targetCard } = await supabase
      .from('game_cards')
      .select('*')
      .eq('game_id', gameId)
      .eq('player_id', selectedPlayer)
      .eq('card_suit', selectedCard.suit)
      .eq('card_rank', selectedCard.rank)
      .maybeSingle();

    const wasSuccessful = !!targetCard;

    const { data: movesData } = await supabase
      .from('game_moves')
      .select('move_number')
      .eq('game_id', gameId)
      .order('move_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextMoveNumber = (movesData?.move_number || 0) + 1;

    await supabase.from('game_moves').insert({
      game_id: gameId,
      move_number: nextMoveNumber,
      player_id: user.id,
      move_type: 'ask_card',
      target_player_id: selectedPlayer,
      card_suit: selectedCard.suit,
      card_rank: selectedCard.rank,
      was_successful: wasSuccessful,
    });

    if (wasSuccessful && targetCard) {
      await supabase
        .from('game_cards')
        .update({ player_id: user.id })
        .eq('id', targetCard.id);

      await supabase
        .from('games')
        .update({ current_turn_player_id: user.id })
        .eq('id', gameId);
    } else {
      await supabase
        .from('games')
        .update({ current_turn_player_id: selectedPlayer })
        .eq('id', gameId);
    }

    setSelectedCard(null);
    setSelectedPlayer(null);
  };

  // TODO: Implement intra-team card collection
  // CRITICAL RULE ENFORCEMENT:
  // When a player calls a card from a specific teammate:
  // 1. Record the caller_player_id, target_teammate_id, and the card being called
  // 2. Check who actually has the card (actual_card_holder_id)
  // 3. SUCCESS only if: actual_card_holder_id === target_teammate_id
  // 4. FAIL if: actual_card_holder_id !== target_teammate_id (even if on same team!)
  // 5. On FAIL: Transfer ALL caller's cards from that set to opponent team
  // 6. The set now belongs to the opponent team
  //
  // Example FAIL scenario:
  // - Player A (Team 1) has 9♣, 10♣, J♣
  // - Player B (Team 1) has Q♣
  // - Player C (Team 1) has K♣, A♣
  // - Player A calls "Q♣ from Player C" -> FAIL! (Player B has it)
  // - Result: 9♣, 10♣, J♣ transfer to Team 2, set goes to Team 2
  const callCardFromTeammate = async (
    targetTeammateId: string,
    card: CardType
  ) => {
    // Implementation needed
    console.warn('Intra-team collection not yet implemented - MUST enforce exact player matching rule');
  };

  const opponentPlayers = players.filter(p => p.team !== myTeam);
  const isMyTurn = game?.current_turn_player_id === user?.id;
  const teamAPoints = game?.team_a_points || 0;
  const teamBPoints = game?.team_b_points || 0;

  if (!game) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-amber-950 to-stone-900 bg-gothic-pattern text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onLeave}
            className="flex items-center gap-2 text-parchment-300 hover:text-parchment-100 transition-colors font-ornate"
          >
            <ArrowLeft size={20} />
            Leave Game
          </button>

          <div className="flex items-center gap-6">
            <div className="flex gap-4">
              <div className="bg-gradient-to-br from-golden-600 to-golden-800 px-6 py-2 rounded-lg border-2 border-golden-400 shadow-lg">
                <span className="text-sm font-ornate text-golden-50">Golden Team: {teamAPoints} pts</span>
              </div>
              <div className="bg-gradient-to-br from-bronze-600 to-bronze-800 px-6 py-2 rounded-lg border-2 border-bronze-400 shadow-lg">
                <span className="text-sm font-ornate text-bronze-50">Bronze Team: {teamBPoints} pts</span>
              </div>
            </div>

            <button
              onClick={() => setShowChat(!showChat)}
              className="flex items-center gap-2 bg-gradient-to-br from-amber-900 to-stone-900 hover:from-amber-800 hover:to-stone-800 px-4 py-2 rounded-lg transition-colors border border-golden-700 font-ornate"
            >
              <MessageSquare size={20} />
              Team Chat
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-9">
            <div className="bg-gradient-to-br from-amber-950/50 to-stone-950/50 backdrop-blur-sm rounded-2xl p-6 mb-4 border-2 border-golden-900/30" style={{ minHeight: '500px' }}>
              <PlayerSeats
                players={players}
                currentPlayerId={game.current_turn_player_id}
                myId={user?.id || ''}
                myTeam={myTeam}
                cardCounts={allPlayerCards}
                selectedPlayerId={selectedPlayer}
                onSelectPlayer={setSelectedPlayer}
              />

              <div className="mt-8 text-center">
                {isMyTurn ? (
                  <div className="bg-gradient-to-r from-golden-600 to-golden-700 inline-block px-8 py-3 rounded-lg font-ornate font-bold border-2 border-golden-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                    Your Turn
                  </div>
                ) : aiThinking ? (
                  <div className="bg-gradient-to-br from-stone-800 to-stone-900 inline-flex items-center gap-3 px-6 py-3 rounded-lg border border-amber-700 font-ornate">
                    <Bot size={18} className="text-amber-400 animate-pulse" />
                    <span className="text-amber-300">
                      {players.find(p => p.player_id === game.current_turn_player_id)?.player_profiles?.username} is thinking...
                    </span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-stone-800 to-stone-900 inline-block px-6 py-2 rounded-lg border border-stone-700 font-ornate">
                    Waiting for {players.find(p => p.player_id === game.current_turn_player_id)?.player_profiles?.username}'s turn
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-950/50 to-stone-950/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-golden-900/30">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-ornate font-bold text-parchment-200">Your Cards ({myCards.length})</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSetDeclaration(true)}
                    className="bg-gradient-to-br from-golden-600 to-golden-800 hover:from-golden-500 hover:to-golden-700 px-4 py-2 rounded-lg font-ornate border border-golden-400 transition-all shadow-lg"
                  >
                    Declare Set
                  </button>
                  <button
                    onClick={askForCard}
                    disabled={!isMyTurn || !selectedCard || !selectedPlayer}
                    className="bg-gradient-to-br from-bronze-600 to-bronze-800 hover:from-bronze-500 hover:to-bronze-700 px-6 py-2 rounded-lg font-ornate border border-bronze-400 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ask for Card
                  </button>
                </div>
              </div>

              <CardHand
                cards={myCards}
                selectedCard={selectedCard}
                onSelectCard={setSelectedCard}
              />
            </div>
          </div>

          <div className="col-span-3 space-y-4">
            <StatusBoard gameId={gameId} />

            {showChat ? (
              <TeamChat gameId={gameId} team={myTeam} />
            ) : (
              <GameLog moves={moves} players={players} claimedSets={claimedSets} />
            )}
          </div>
        </div>
      </div>

      {showSetDeclaration && (
        <SetDeclaration
          gameId={gameId}
          myCards={myCards}
          myTeam={myTeam}
          onClose={() => setShowSetDeclaration(false)}
        />
      )}
    </div>
  );
}
