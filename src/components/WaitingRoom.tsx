import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Copy, Check, Play, Users, Crown, Trash2 } from 'lucide-react';
import { dealCards } from '../lib/gameLogic';
import { GlobalHeader } from './GlobalHeader';
import { TraineeBadge } from './TraineeBadge';
import type { Database } from '../lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];
type GamePlayer = Database['public']['Tables']['game_players']['Row'] & {
  player_profiles: { username: string } | null;
};

interface WaitingRoomProps {
  gameId: string;
  onGameStart: () => void;
  onLeave: () => void;
  onNavigateToLobby?: () => void;
}

export function WaitingRoom({ gameId, onGameStart, onLeave, onNavigateToLobby }: WaitingRoomProps) {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [learnerModeActive, setLearnerModeActive] = useState(false);
  const [switchingTeam, setSwitchingTeam] = useState(false);
  const [hostUsername, setHostUsername] = useState<string>('Unknown');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    loadGameData();

    const gameChannel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          const updatedGame = payload.new as Game;
          setGame(updatedGame);
          if (updatedGame.status === 'in_progress') {
            onGameStart();
          }
          if (updatedGame.host_player_id) {
            const { data: hostData } = await supabase
              .from('player_profiles')
              .select('username')
              .eq('id', updatedGame.host_player_id)
              .maybeSingle();
            if (hostData?.username) {
              setHostUsername(hostData.username);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          loadPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId]);

  const loadGameData = async () => {
    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameData) {
      setGame(gameData);
      if (gameData.status === 'in_progress') {
        onGameStart();
      }
      if (gameData.host_player_id) {
        const { data: hostData } = await supabase
          .from('player_profiles')
          .select('username')
          .eq('id', gameData.host_player_id)
          .maybeSingle();
        if (hostData?.username) {
          setHostUsername(hostData.username);
        }
      }
    }

    await loadPlayers();
  };

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('game_players')
      .select(`
        *,
        player_profiles (username)
      `)
      .eq('game_id', gameId)
      .order('seat_position');

    if (error) {
      console.error('Error loading players:', error);
    }

    if (data) {
      const missingProfiles = data.some(p => !p.player_profiles);
      if (missingProfiles) {
        const playerIds = data.map(p => p.player_id);
        const { data: profiles } = await supabase
          .from('player_profiles')
          .select('id, username')
          .in('id', playerIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        const enriched = data.map(p => ({
          ...p,
          player_profiles: p.player_profiles || (profileMap.get(p.player_id) ? { username: profileMap.get(p.player_id)!.username } : null),
        }));
        setPlayers(enriched as GamePlayer[]);
        const currentPlayer = enriched.find(p => p.player_id === user?.id);
        if (currentPlayer) {
          setIsReady(currentPlayer.is_ready);
          setLearnerModeActive(currentPlayer.learner_mode_active || false);
        }
      } else {
        setPlayers(data as GamePlayer[]);
        const currentPlayer = data.find(p => p.player_id === user?.id);
        if (currentPlayer) {
          setIsReady(currentPlayer.is_ready);
          setLearnerModeActive(currentPlayer.learner_mode_active || false);
        }
      }
    }
  };

  const toggleReady = async () => {
    if (!user) return;

    const newReadyState = !isReady;
    const { error } = await supabase
      .from('game_players')
      .update({ is_ready: newReadyState })
      .eq('game_id', gameId)
      .eq('player_id', user.id);

    if (!error) {
      setIsReady(newReadyState);
      await loadPlayers();
    }
  };

  const switchToTeam = async (targetTeam: 'team_a' | 'team_b') => {
    if (!user || !game || switchingTeam) return;

    setJoinError(null);
    const teamLabel = targetTeam === 'team_a' ? 'Gold' : 'Bronze';
    const currentPlayer = players.find(p => p.player_id === user.id);

    if (!currentPlayer) {
      const teamCount = players.filter(p => p.team === targetTeam).length;
      if (teamCount >= game.team_size) {
        setJoinError(`Team ${teamLabel} is full. Please join the other team.`);
        return;
      }

      setSwitchingTeam(true);
      const { data, error } = await supabase.rpc('join_game', { p_game_id: gameId });

      if (error) {
        console.error('Error joining game:', error);
        setJoinError(`Failed to join: ${error.message}`);
        setSwitchingTeam(false);
        return;
      }

      if (data?.error && !data?.already_joined) {
        setJoinError(data.error);
        setSwitchingTeam(false);
        return;
      }

      const joinedTeam = data?.team;
      if (joinedTeam && joinedTeam !== targetTeam) {
        const { data: switchData, error: switchError } = await supabase.rpc('switch_team', {
          p_game_id: gameId,
          p_target_team: targetTeam,
        });
        if (switchError) {
          console.error('Error switching to preferred team:', switchError);
        } else if (switchData?.error) {
          setJoinError(switchData.error);
        }
      }

      await loadPlayers();
      setSwitchingTeam(false);
      return;
    }

    if (currentPlayer.team === targetTeam) return;

    const teamCount = players.filter(p => p.team === targetTeam).length;
    if (teamCount >= game.team_size) {
      setJoinError(`Team ${teamLabel} is full. Please join the other team.`);
      return;
    }

    setSwitchingTeam(true);

    const { data, error } = await supabase.rpc('switch_team', {
      p_game_id: gameId,
      p_target_team: targetTeam,
    });

    if (error) {
      console.error('Error switching team:', error);
      setJoinError(`Failed to switch team: ${error.message}`);
    } else if (data?.error) {
      setJoinError(data.error);
    } else {
      setIsReady(false);
      await loadPlayers();
    }

    setSwitchingTeam(false);
  };

  const startGame = async () => {
    if (!user || !game) return;

    const maxPlayers = game.team_size * 2;
    if (players.length !== maxPlayers) {
      alert(`Need ${maxPlayers} players to start`);
      return;
    }

    const teamAPlayers = players.filter(p => p.team === 'team_a');
    const teamBPlayers = players.filter(p => p.team === 'team_b');

    if (teamAPlayers.length !== game.team_size || teamBPlayers.length !== game.team_size) {
      alert('Teams must be equal');
      return;
    }

    if (!players.every(p => p.is_ready)) {
      alert('All players must be ready');
      return;
    }

    const hands = dealCards(players.length);

    const hostPlayer = players.find(p => p.player_id === game.host_player_id) ?? players[0];

    await supabase.from('games').update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      current_turn_player_id: hostPlayer.player_id,
    }).eq('id', gameId);

    const cardInserts = players.flatMap((player, playerIndex) =>
      hands[playerIndex].map(card => ({
        game_id: gameId,
        player_id: player.player_id,
        card_suit: card.suit,
        card_rank: card.rank,
        card_type: card.type,
      }))
    );

    await supabase.from('game_cards').insert(cardInserts);
  };

  const copyRoomCode = () => {
    if (game) {
      navigator.clipboard.writeText(game.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = async () => {
    if (!user) return;

    await supabase
      .from('game_players')
      .delete()
      .eq('game_id', gameId)
      .eq('player_id', user.id);

    onLeave();
  };

  const dissolveGame = async () => {
    if (!user || !isCreator) return;

    if (!confirm('Are you sure you want to dissolve this game? All players will be removed.')) {
      return;
    }

    const { data, error } = await supabase.rpc('dissolve_game', { p_game_id: gameId });

    if (error || data?.error) {
      console.error('Error dissolving game:', error || data?.error);
      alert('Failed to dissolve game. Please try again.');
      return;
    }

    onLeave();
  };

  const toggleLearnerMode = async () => {
    if (!user) return;

    const newLearnerState = !learnerModeActive;
    await supabase
      .from('game_players')
      .update({ learner_mode_active: newLearnerState })
      .eq('game_id', gameId)
      .eq('player_id', user.id);

    setLearnerModeActive(newLearnerState);
  };

  if (!game) return null;

  const maxPlayers = game.team_size * 2;
  const teamAPlayers = players.filter(p => p.team === 'team_a');
  const teamBPlayers = players.filter(p => p.team === 'team_b');
  const allReady = players.length === maxPlayers && players.every(p => p.is_ready);
  const isHost = game.host_player_id === user?.id || game.created_by === user?.id;
  const isCreator = isHost;

  const currentPlayer = players.find(p => p.player_id === user?.id);
  const currentTeam = currentPlayer?.team;

  return (
    <>
      <GlobalHeader
        showHomeButton={true}
        showLearnerModeToggle={true}
        learnerModeActive={learnerModeActive}
        onHomeClick={onNavigateToLobby || onLeave}
        onLearnerModeToggle={toggleLearnerMode}
      />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {!isCreator && (
            <button
              onClick={handleLeave}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
            >
              <ArrowLeft size={20} />
              Leave Room
            </button>
          )}

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Game Room</h1>
              {game.host_player_id && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="text-slate-600 font-medium">Host: {hostUsername}</span>
                </div>
              )}
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-mono font-bold text-blue-600">{game.room_code}</p>
              <button
                onClick={copyRoomCode}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} className="text-slate-600" />}
              </button>
            </div>
            <p className="text-slate-600 mt-2">
              {players.length} / {maxPlayers} players ({game.team_size}v{game.team_size})
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <TeamCard
              teamName="Gold"
              teamKey="team_a"
              players={teamAPlayers}
              maxSize={game.team_size}
              isCurrentTeam={currentTeam === 'team_a'}
              isSwitching={switchingTeam}
              currentUserId={user?.id}
              onSwitch={() => switchToTeam('team_a')}
            />

            <TeamCard
              teamName="Bronze"
              teamKey="team_b"
              players={teamBPlayers}
              maxSize={game.team_size}
              isCurrentTeam={currentTeam === 'team_b'}
              isSwitching={switchingTeam}
              currentUserId={user?.id}
              onSwitch={() => switchToTeam('team_b')}
            />
          </div>

          {joinError && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-center justify-between gap-3">
              <p className="text-sm text-red-700 font-medium">{joinError}</p>
              <button
                onClick={() => setJoinError(null)}
                className="text-red-400 hover:text-red-600 flex-shrink-0 text-lg leading-none"
              >
                &times;
              </button>
            </div>
          )}

          <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>Instructions:</strong> Use the "Join Team" button to switch teams. Your current team is highlighted with a ring.
              Click "Ready Up\" when satisfied with your team. When all {maxPlayers} players are in and ready, the host can start the game.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={toggleReady}
              className={`w-full px-6 py-3 font-semibold rounded-lg transition-colors ${
                isReady
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-800 text-white'
              }`}
            >
              {isReady ? 'Ready!' : 'Ready Up'}
            </button>
          </div>

          {isCreator && (
            <div className="mt-4 space-y-3">
              <button
                onClick={startGame}
                disabled={!allReady}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={24} />
                Start Game
              </button>
              <button
                onClick={dissolveGame}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={20} />
                Dissolve Game
              </button>
            </div>
          )}

          {!isCreator && (
            <p className="text-center text-slate-500 mt-4">
              Waiting for host to start the game...
            </p>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

interface TeamCardProps {
  teamName: string;
  teamKey: 'team_a' | 'team_b';
  players: GamePlayer[];
  maxSize: number;
  isCurrentTeam: boolean;
  isSwitching: boolean;
  currentUserId: string | undefined;
  onSwitch: () => void;
}

function TeamCard({ teamName, teamKey, players, maxSize, isCurrentTeam, isSwitching, currentUserId, onSwitch }: TeamCardProps) {
  const isGold = teamKey === 'team_a';
  const isFull = players.length >= maxSize;
  const canJoin = !isCurrentTeam && !isFull && !isSwitching;

  const borderColor = isCurrentTeam
    ? isGold ? 'border-golden-700 ring-4 ring-golden-300' : 'border-bronze-700 ring-4 ring-bronze-300'
    : isGold ? 'border-golden-500' : 'border-bronze-500';

  const bgGradient = isGold
    ? 'bg-gradient-to-br from-golden-100 to-amber-50'
    : 'bg-gradient-to-br from-bronze-100 to-orange-50';

  const headerGradient = isGold
    ? 'bg-gradient-to-r from-golden-600 to-golden-700'
    : 'bg-gradient-to-r from-bronze-600 to-bronze-700';

  const emptyBorderColor = isGold ? 'border-golden-300' : 'border-bronze-300';
  const teamColor: 'gold' | 'bronze' = isGold ? 'gold' : 'bronze';

  return (
    <div className={`border-4 rounded-xl p-6 ${bgGradient} shadow-lg transition-all ${borderColor}`}>
      <h2 className={`text-2xl font-bold flex items-center gap-2 ${headerGradient} text-white px-4 py-2 rounded-lg -mt-2 -mx-2 mb-4`}>
        <Users size={24} />
        Team {teamName}
        <span className="text-sm ml-auto">
          {players.length}/{maxSize}
        </span>
      </h2>

      {isCurrentTeam && (
        <div className={`mb-3 px-3 py-1.5 rounded-md text-sm font-semibold text-center ${
          isGold ? 'bg-golden-200 text-golden-800' : 'bg-bronze-200 text-bronze-800'
        }`}>
          You are on this team
        </div>
      )}

      <div className="space-y-2 mb-4">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isCurrentUser={player.player_id === currentUserId}
            teamColor={teamColor}
          />
        ))}
        {Array.from({ length: maxSize - players.length }).map((_, i) => (
          <div
            key={`empty-${teamKey}-${i}`}
            className={`p-3 bg-white/60 border-2 border-dashed ${emptyBorderColor} rounded-lg text-center text-slate-400`}
          >
            Empty seat
          </div>
        ))}
      </div>

      {!isCurrentTeam && (
        <button
          onClick={onSwitch}
          disabled={!canJoin}
          className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
            canJoin
              ? isGold
                ? 'bg-golden-600 hover:bg-golden-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]'
                : 'bg-bronze-600 hover:bg-bronze-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isSwitching ? 'Switching...' : isFull ? 'Team Full' : `Join Team ${teamName}`}
        </button>
      )}
    </div>
  );
}

function PlayerCard({ player, isCurrentUser, teamColor }: { player: GamePlayer; isCurrentUser: boolean; teamColor: 'gold' | 'bronze' }) {
  const teamBgColor = teamColor === 'gold' ? 'bg-gradient-to-r from-golden-600 to-golden-700' : 'bg-gradient-to-r from-bronze-600 to-bronze-700';
  const teamRingColor = teamColor === 'gold' ? 'ring-golden-400' : 'ring-bronze-400';

  return (
    <div
      className={`p-3 rounded-lg transition-all ${
        isCurrentUser ? `${teamBgColor} text-white shadow-lg scale-[1.02]` : 'bg-white text-slate-700'
      } ${player.is_ready ? `ring-4 ${teamRingColor}` : ''} border-2 ${teamColor === 'gold' ? 'border-golden-300' : 'border-bronze-300'}`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {player.player_profiles?.username || 'Player'}
            {isCurrentUser && <span className="ml-1 font-bold">(YOU)</span>}
          </span>
          {player.learner_mode_active && <TraineeBadge />}
        </div>
        <div className="flex items-center gap-2">
          {player.is_ready ? (
            <span className="flex items-center gap-1">
              <Check size={18} className={isCurrentUser ? 'text-green-400' : 'text-green-600'} />
              <span className="text-xs font-medium">{isCurrentUser ? 'Ready!' : 'Ready'}</span>
            </span>
          ) : (
            isCurrentUser && <span className="text-xs opacity-75">Not Ready</span>
          )}
        </div>
      </div>
    </div>
  );
}
