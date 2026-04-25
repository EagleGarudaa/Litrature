import { supabase } from './supabase';
import { dealCards, generateRoomCode, isCompleteSet, getSetCards, ALL_SETS } from './gameLogic';
import type { CardSuit, CardRank, CardType } from './database.types';

type Team = 'team_a' | 'team_b';

interface PlayerInfo {
  player_id: string;
  team: Team;
  seat_position: number;
  is_ai: boolean;
  username: string;
}

interface CardInfo {
  id: string;
  player_id: string;
  card_suit: CardSuit;
  card_rank: CardRank;
  card_type: CardType;
}

const AI_NAMES = [
  'Magnus', 'Kasparov', 'Tal', 'Polgar', 'Anand',
  'Fischer', 'Karpov', 'Spassky', 'Morphy', 'Capablanca',
  'Nimzo', 'Alekhine', 'Botvinnik', 'Petrosian', 'Smyslov',
];

function pickAiName(used: string[]): string {
  const available = AI_NAMES.filter(n => !used.includes(n));
  return available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : `Bot_${Math.random().toString(36).substring(2, 6)}`;
}

// Create an anonymous auth user for an AI bot and return their user id.
async function createAiAuthUser(username: string): Promise<string | null> {
  const email = `ai_${Date.now()}_${Math.random().toString(36).substring(7)}@literature.game`;
  const password = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return null;

  await supabase.from('player_profiles').insert({ id: data.user.id, username });
  return data.user.id;
}

// ─── Quick-Play Setup ─────────────────────────────────────────────────────────
// Creates a full 6-player game (3v3) with the human as team_a seat 0 and 5 AI bots,
// deals cards, and starts the game immediately. Returns the gameId.
export async function startQuickPlayGame(humanPlayerId: string, teamSize: 3 | 4 = 3): Promise<string | null> {
  const totalPlayers = teamSize * 2;

  // Create the game
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      room_code: generateRoomCode(),
      team_size: teamSize,
      is_private: true,
      created_by: humanPlayerId,
      host_player_id: humanPlayerId,
      status: 'waiting',
    })
    .select()
    .single();

  if (gameErr || !game) return null;

  const gameId = game.id;

  // Seat the human first (team_a, seat 0)
  await supabase.from('game_players').insert({
    game_id: gameId,
    player_id: humanPlayerId,
    team: 'team_a',
    seat_position: 0,
    is_ready: true,
    is_ai: false,
  });

  // Build AI players to fill remaining seats
  const usedNames: string[] = [];
  const players: PlayerInfo[] = [
    { player_id: humanPlayerId, team: 'team_a', seat_position: 0, is_ai: false, username: 'You' },
  ];

  // Seat layout for 3v3: team_a seats 0,2,4 | team_b seats 1,3,5
  // For 4v4: team_a 0,2,4,6 | team_b 1,3,5,7
  for (let i = 1; i < totalPlayers; i++) {
    const team: Team = i % 2 === 0 ? 'team_a' : 'team_b';
    const seatInTeam = Math.floor(i / 2);
    const seatPosition = seatInTeam * 2 + (team === 'team_b' ? 1 : 0);

    const aiName = pickAiName(usedNames);
    usedNames.push(aiName);

    const aiId = await createAiAuthUser(aiName);
    if (!aiId) continue;

    await supabase.from('game_players').insert({
      game_id: gameId,
      player_id: aiId,
      team,
      seat_position: seatPosition,
      is_ready: true,
      is_ai: true,
    });

    players.push({ player_id: aiId, team, seat_position: seatPosition, is_ai: true, username: aiName });
  }

  // Deal cards
  const hands = dealCards(totalPlayers);
  const sortedPlayers = [...players].sort((a, b) => a.seat_position - b.seat_position);

  const cardInserts = sortedPlayers.flatMap((player, idx) =>
    hands[idx].map(card => ({
      game_id: gameId,
      player_id: player.player_id,
      card_suit: card.suit as CardSuit,
      card_rank: card.rank as CardRank,
      card_type: card.type as CardType,
    }))
  );

  await supabase.from('game_cards').insert(cardInserts);

  // Start the game — first turn goes to the human player
  await supabase
    .from('games')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      current_turn_player_id: humanPlayerId,
    })
    .eq('id', gameId);

  return gameId;
}

// ─── AI Turn Execution ────────────────────────────────────────────────────────
// Called by GameTable whenever current_turn_player_id is an AI.
// Reads full game state from DB, decides a move, executes it, then updates the turn.
export async function executeAiTurn(gameId: string, aiPlayerId: string): Promise<void> {
  // Load AI's cards
  const { data: aiCards } = await supabase
    .from('game_cards')
    .select('*')
    .eq('game_id', gameId)
    .eq('player_id', aiPlayerId)
    .eq('is_in_claimed_set', false);

  if (!aiCards || aiCards.length === 0) {
    // No cards — pass turn to a random opponent
    await passToNextPlayer(gameId, aiPlayerId);
    return;
  }

  // Load all players
  const { data: allPlayers } = await supabase
    .from('game_players')
    .select('*, player_profiles(username)')
    .eq('game_id', gameId);

  if (!allPlayers) return;

  const aiPlayer = allPlayers.find(p => p.player_id === aiPlayerId);
  if (!aiPlayer) return;

  const myTeam = aiPlayer.team as Team;
  const opponents = allPlayers.filter(p => p.team !== myTeam);
  const teammates = allPlayers.filter(p => p.team === myTeam && p.player_id !== aiPlayerId);

  // Load all unclaimed cards (to know how many each player has)
  const { data: allCards } = await supabase
    .from('game_cards')
    .select('player_id, card_suit, card_rank, card_type')
    .eq('game_id', gameId)
    .eq('is_in_claimed_set', false);

  // Load claimed sets to know what's off the table
  const { data: claimedSets } = await supabase
    .from('claimed_sets')
    .select('set_suit, set_type')
    .eq('game_id', gameId);

  const claimedSetKeys = new Set(
    (claimedSets ?? []).map(s => `${s.set_suit}_${s.set_type}`)
  );

  // Decide: can we declare any complete set?
  for (const setDef of ALL_SETS) {
    if (claimedSetKeys.has(`${setDef.suit}_${setDef.type}`)) continue;

    const setCards = getSetCards(setDef.suit, setDef.type);
    const mySetCards = aiCards.filter(c =>
      setCards.some(sc => sc.suit === c.card_suit && sc.rank === c.card_rank)
    );

    if (mySetCards.length === 6) {
      // We have the full set — declare it!
      await declareSet(gameId, aiPlayerId, myTeam, setDef.suit, setDef.type, mySetCards.map(c => c.id));
      return;
    }
  }

  // Pick a suit+type group we have at least one card from and ask an opponent for a card
  const cardsBySuit: Record<string, CardInfo[]> = {};
  for (const c of aiCards) {
    const key = `${c.card_suit}_${c.card_type}`;
    if (!cardsBySuit[key]) cardsBySuit[key] = [];
    cardsBySuit[key].push(c as CardInfo);
  }

  // Find a group with potential (we hold ≥1 card, set not already claimed)
  const viableGroups = Object.entries(cardsBySuit).filter(([key]) => !claimedSetKeys.has(key));

  if (viableGroups.length === 0 || opponents.length === 0) {
    await passToNextPlayer(gameId, aiPlayerId);
    return;
  }

  // Pick the group where we hold the most cards (greediest strategy)
  viableGroups.sort(([, a], [, b]) => b.length - a.length);
  const [bestKey, myGroupCards] = viableGroups[0];
  const [suit, type] = bestKey.split('_') as [CardSuit, CardType];

  const setCards = getSetCards(suit, type);
  const myRanks = new Set(myGroupCards.map(c => c.card_rank));
  const neededCards = setCards.filter(sc => !myRanks.has(sc.rank));

  if (neededCards.length === 0) {
    // Somehow have all cards but didn't declare — shouldn't happen, pass
    await passToNextPlayer(gameId, aiPlayerId);
    return;
  }

  // Pick a needed card — check if we know who has it from allCards
  const cardCandidates = allCards ?? [];
  let targetCard = neededCards[0];
  let targetPlayerId: string | null = null;

  for (const needed of neededCards) {
    const knownHolder = cardCandidates.find(
      c => c.card_suit === suit && c.card_rank === needed.rank && opponents.some(op => op.player_id === c.player_id)
    );
    if (knownHolder?.player_id) {
      targetCard = needed;
      targetPlayerId = knownHolder.player_id;
      break;
    }
  }

  // If no known holder, pick a random opponent who still has cards
  if (!targetPlayerId) {
    const opponentsWithCards = opponents.filter(op =>
      cardCandidates.some(c => c.player_id === op.player_id)
    );
    if (opponentsWithCards.length > 0) {
      targetPlayerId = opponentsWithCards[Math.floor(Math.random() * opponentsWithCards.length)].player_id;
    }
  }

  if (!targetPlayerId) {
    await passToNextPlayer(gameId, aiPlayerId);
    return;
  }

  await askForCard(gameId, aiPlayerId, targetPlayerId, suit, targetCard.rank, myTeam);
}

async function askForCard(
  gameId: string,
  askerId: string,
  targetId: string,
  suit: CardSuit,
  rank: CardRank,
  askerTeam: Team,
): Promise<void> {
  const { data: targetCard } = await supabase
    .from('game_cards')
    .select('id')
    .eq('game_id', gameId)
    .eq('player_id', targetId)
    .eq('card_suit', suit)
    .eq('card_rank', rank)
    .eq('is_in_claimed_set', false)
    .maybeSingle();

  const wasSuccessful = !!targetCard;

  const { data: lastMove } = await supabase
    .from('game_moves')
    .select('move_number')
    .eq('game_id', gameId)
    .order('move_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextMoveNumber = (lastMove?.move_number ?? 0) + 1;

  await supabase.from('game_moves').insert({
    game_id: gameId,
    move_number: nextMoveNumber,
    player_id: askerId,
    move_type: 'ask_card',
    target_player_id: targetId,
    card_suit: suit,
    card_rank: rank,
    was_successful: wasSuccessful,
  });

  if (wasSuccessful && targetCard) {
    await supabase.from('game_cards').update({ player_id: askerId }).eq('id', targetCard.id);
    // AI keeps the turn on success
    await supabase.from('games').update({ current_turn_player_id: askerId }).eq('id', gameId);
  } else {
    // Turn passes to the player who was asked
    await supabase.from('games').update({ current_turn_player_id: targetId }).eq('id', gameId);
  }
}

async function declareSet(
  gameId: string,
  declarerId: string,
  team: Team,
  suit: CardSuit,
  type: CardType,
  cardIds: string[],
): Promise<void> {
  const { data: lastMove } = await supabase
    .from('game_moves')
    .select('move_number')
    .eq('game_id', gameId)
    .order('move_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextMoveNumber = (lastMove?.move_number ?? 0) + 1;

  await supabase.from('game_moves').insert({
    game_id: gameId,
    move_number: nextMoveNumber,
    player_id: declarerId,
    move_type: 'set_claim',
    card_suit: suit,
    set_type: type,
    was_successful: true,
  });

  // Mark cards as claimed
  await supabase
    .from('game_cards')
    .update({ is_in_claimed_set: true, claimed_by_team: team })
    .in('id', cardIds);

  // Record the claimed set
  await supabase.from('claimed_sets').insert({
    game_id: gameId,
    team,
    set_suit: suit,
    set_type: type,
    claimed_by_player_id: declarerId,
  });

  // Update team points
  const points = type === 'major' ? 10 : 5;
  const pointsCol = team === 'team_a' ? 'team_a_points' : 'team_b_points';

  const { data: currentGame } = await supabase
    .from('games')
    .select('team_a_points, team_b_points')
    .eq('id', gameId)
    .single();

  if (currentGame) {
    await supabase
      .from('games')
      .update({ [pointsCol]: (currentGame[pointsCol as keyof typeof currentGame] as number) + points })
      .eq('id', gameId);
  }

  // Check if game is over — all 8 sets claimed
  const { count } = await supabase
    .from('claimed_sets')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId);

  if (count !== null && count >= 8) {
    const { data: finalGame } = await supabase
      .from('games')
      .select('team_a_points, team_b_points')
      .eq('id', gameId)
      .single();

    if (finalGame) {
      const winner: Team | 'draw' =
        finalGame.team_a_points > finalGame.team_b_points
          ? 'team_a'
          : finalGame.team_b_points > finalGame.team_a_points
          ? 'team_b'
          : 'draw';

      await supabase
        .from('games')
        .update({ status: 'completed', completed_at: new Date().toISOString(), winning_team: winner === 'draw' ? null : winner })
        .eq('id', gameId);
    }
    return;
  }

  // AI keeps the turn after a successful declaration
  await supabase.from('games').update({ current_turn_player_id: declarerId }).eq('id', gameId);
}

async function passToNextPlayer(gameId: string, currentPlayerId: string): Promise<void> {
  const { data: players } = await supabase
    .from('game_players')
    .select('player_id, seat_position')
    .eq('game_id', gameId)
    .order('seat_position');

  if (!players || players.length === 0) return;

  const currentIdx = players.findIndex(p => p.player_id === currentPlayerId);
  const nextIdx = (currentIdx + 1) % players.length;
  const nextPlayerId = players[nextIdx].player_id;

  await supabase.from('games').update({ current_turn_player_id: nextPlayerId }).eq('id', gameId);
}
