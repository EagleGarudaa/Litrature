import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateRoomCode } from '../lib/gameLogic';
import { Plus, LogOut, Users, Trophy, CreditCard as Edit2, Bot } from 'lucide-react';
import { GlobalHeader } from './GlobalHeader';
import type { Database } from '../lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];
type PlayerProfile = Database['public']['Tables']['player_profiles']['Row'];

interface LobbyProps {
  onJoinGame: (gameId: string) => void;
  onPlayVsAI: () => void;
}

export function Lobby({ onJoinGame, onPlayVsAI }: LobbyProps) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedTeamSize, setSelectedTeamSize] = useState<3 | 4>(3);
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadAvailableGames();
      checkCurrentGame();

      const channel = supabase
        .channel('lobby-games')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games',
            filter: `status=eq.waiting`,
          },
          () => {
            loadAvailableGames();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const checkCurrentGame = async () => {
    if (!user) return;

    const { data: playerGame } = await supabase
      .from('game_players')
      .select('game_id, games(id, status, room_code, team_size)')
      .eq('player_id', user.id)
      .maybeSingle();

    if (playerGame && playerGame.games) {
      const game = Array.isArray(playerGame.games) ? playerGame.games[0] : playerGame.games;
      if (game.status === 'waiting' || game.status === 'in_progress') {
        setCurrentGame(game as Game);
      }
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  const loadAvailableGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (data) {
      setAvailableGames(data);
    }
  };

  const createGame = async () => {
    if (!user) return;

    setLoading(true);
    setCreateError('');
    try {
      const roomCode = generateRoomCode();

      const { data: game, error } = await supabase
        .from('games')
        .insert({
          room_code: roomCode,
          team_size: selectedTeamSize,
          is_private: isPrivate,
          created_by: user.id,
          host_player_id: user.id,
        })
        .select()
        .single();

      if (error) {
        setCreateError(error.message || 'Failed to create game. Please try again.');
        return;
      }

      if (game) {
        const { error: joinError } = await supabase.from('game_players').insert({
          game_id: game.id,
          player_id: user.id,
          team: 'team_a',
          seat_position: 0,
        });

        if (joinError) {
          await supabase.from('games').delete().eq('id', game.id);
          setCreateError(joinError.message || 'Failed to join created game. Please try again.');
          return;
        }

        onJoinGame(game.id);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create game. Please try again.';
      setCreateError(msg);
    } finally {
      setLoading(false);
    }
  };

  const joinGameByCode = async () => {
    if (!user || !joinCode.trim()) return;

    setLoading(true);
    try {
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'waiting')
        .maybeSingle();

      if (!game) {
        alert('Game not found or already started');
        return;
      }

      const { data, error } = await supabase.rpc('join_game', { p_game_id: game.id });

      if (error) {
        console.error('Error joining game:', error);
        alert('Failed to join game. Please try again.');
        return;
      }

      if (data?.error) {
        if (data.already_joined) {
          onJoinGame(game.id);
          return;
        }
        alert(data.error);
        return;
      }

      onJoinGame(game.id);
    } catch (error) {
      console.error('Error joining game:', error);
    } finally {
      setLoading(false);
      setJoinCode('');
    }
  };

  const joinAvailableGame = async (gameId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('join_game', { p_game_id: gameId });

      if (error) {
        console.error('Error joining game:', error);
        alert('Failed to join game. Please try again.');
        return;
      }

      if (data?.error) {
        if (data.already_joined) {
          onJoinGame(gameId);
          return;
        }
        alert(data.error);
        return;
      }

      onJoinGame(gameId);
    } catch (error) {
      console.error('Error joining game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!user || !newUsername.trim()) return;

    const trimmedUsername = newUsername.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      alert('Username must be 3-20 characters');
      return;
    }

    try {
      const { error } = await supabase
        .from('player_profiles')
        .update({ username: trimmedUsername })
        .eq('id', user.id);

      if (!error) {
        setProfile({ ...profile!, username: trimmedUsername });
        setEditingUsername(false);
        setNewUsername('');
      }
    } catch (error) {
      console.error('Error updating username:', error);
    }
  };

  return (
    <>
      <GlobalHeader />
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-amber-950 to-stone-900 bg-gothic-pattern">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-gradient-to-br from-amber-950/80 to-stone-950/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6 border-2 border-golden-900/40">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-ornate font-bold text-golden-300">Literature Game Lobby</h1>
              {editingUsername ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter new username"
                    className="px-3 py-1 border-2 border-golden-900/30 bg-stone-900/50 text-parchment-100 rounded-lg focus:ring-2 focus:ring-golden-500 focus:border-golden-500 outline-none"
                    maxLength={20}
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateUsername}
                    className="px-3 py-1 bg-gradient-to-br from-golden-600 to-golden-800 text-white rounded-lg text-sm font-ornate hover:from-golden-500 hover:to-golden-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingUsername(false);
                      setNewUsername('');
                    }}
                    className="px-3 py-1 bg-stone-800 text-parchment-300 rounded-lg text-sm font-ornate hover:bg-stone-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-parchment-400 font-display">Welcome, {profile?.username || 'Player'}!</p>
                  <button
                    onClick={() => {
                      setNewUsername(profile?.username || '');
                      setEditingUsername(true);
                    }}
                    className="text-golden-400 hover:text-golden-300 transition-colors"
                    title="Change username"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-parchment-300 hover:text-parchment-100 hover:bg-amber-900/30 rounded-lg transition-colors border border-golden-900/30 font-ornate"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>

          {profile && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-golden-900/30 to-amber-950/40 rounded-lg p-4 border border-golden-800/30">
                <div className="flex items-center gap-2 text-golden-400 mb-1">
                  <Users size={20} />
                  <span className="text-sm font-ornate">Games Played</span>
                </div>
                <p className="text-2xl font-bold text-parchment-100 font-display">{profile.games_played}</p>
              </div>
              <div className="bg-gradient-to-br from-golden-900/30 to-amber-950/40 rounded-lg p-4 border border-golden-800/30">
                <div className="flex items-center gap-2 text-golden-400 mb-1">
                  <Trophy size={20} />
                  <span className="text-sm font-ornate">Games Won</span>
                </div>
                <p className="text-2xl font-bold text-parchment-100 font-display">{profile.games_won}</p>
              </div>
              <div className="bg-gradient-to-br from-bronze-900/30 to-stone-950/40 rounded-lg p-4 border border-bronze-800/30">
                <div className="flex items-center gap-2 text-bronze-400 mb-1">
                  <Trophy size={20} />
                  <span className="text-sm font-ornate">Sets Claimed</span>
                </div>
                <p className="text-2xl font-bold text-parchment-100 font-display">{profile.sets_claimed}</p>
              </div>
            </div>
          )}
        </div>

        {currentGame && (
          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-950/60 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6 border-2 border-emerald-600/40">
            <h2 className="text-xl font-ornate font-bold text-emerald-300 mb-4">You're in a Game!</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-parchment-200 font-display mb-1">
                  Room Code: <span className="font-mono font-bold text-emerald-400">{currentGame.room_code}</span>
                </p>
                <p className="text-sm text-parchment-400 font-display">
                  {currentGame.status === 'waiting' ? 'Waiting for players' : 'Game in progress'} • {currentGame.team_size}v{currentGame.team_size}
                </p>
              </div>
              <button
                onClick={() => onJoinGame(currentGame.id)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg font-ornate"
              >
                Rejoin Game
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-amber-950/80 to-stone-950/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border-2 border-golden-900/40">
            <h2 className="text-xl font-ornate font-bold text-golden-300 mb-4">Create New Game</h2>

            <div className="mb-4">
              <label className="block text-sm font-ornate text-parchment-300 mb-2">
                Team Size
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTeamSize(3)}
                  className={`flex-1 py-3 px-4 rounded-lg font-ornate transition-all border-2 ${
                    selectedTeamSize === 3
                      ? 'bg-gradient-to-br from-golden-600 to-golden-800 text-white border-golden-400 shadow-lg'
                      : 'bg-stone-900/50 text-parchment-300 border-golden-900/30 hover:bg-stone-800/50'
                  }`}
                >
                  3v3 (6 players)
                </button>
                <button
                  onClick={() => setSelectedTeamSize(4)}
                  className={`flex-1 py-3 px-4 rounded-lg font-ornate transition-all border-2 ${
                    selectedTeamSize === 4
                      ? 'bg-gradient-to-br from-golden-600 to-golden-800 text-white border-golden-400 shadow-lg'
                      : 'bg-stone-900/50 text-parchment-300 border-golden-900/30 hover:bg-stone-800/50'
                  }`}
                >
                  4v4 (8 players)
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-ornate text-parchment-300 mb-2">
                Game Privacy
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 py-3 px-4 rounded-lg font-ornate transition-all border-2 ${
                    !isPrivate
                      ? 'bg-gradient-to-br from-golden-600 to-golden-800 text-white border-golden-400 shadow-lg'
                      : 'bg-stone-900/50 text-parchment-300 border-golden-900/30 hover:bg-stone-800/50'
                  }`}
                >
                  Public
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 py-3 px-4 rounded-lg font-ornate transition-all border-2 ${
                    isPrivate
                      ? 'bg-gradient-to-br from-golden-600 to-golden-800 text-white border-golden-400 shadow-lg'
                      : 'bg-stone-900/50 text-parchment-300 border-golden-900/30 hover:bg-stone-800/50'
                  }`}
                >
                  Private
                </button>
              </div>
              <p className="text-xs text-parchment-400 mt-2 font-display">
                {isPrivate
                  ? 'Private games only accessible via room code'
                  : 'Public games appear in the lobby for everyone'}
              </p>
            </div>

            {createError && (
              <p className="text-red-400 text-sm font-display mb-3 p-3 bg-red-950/40 border border-red-800/40 rounded-lg">{createError}</p>
            )}
            <button
              onClick={createGame}
              disabled={loading}
              className="w-full bg-gradient-to-br from-golden-600 to-golden-800 hover:from-golden-500 hover:to-golden-700 text-white font-ornate font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-golden-400 shadow-xl"
            >
              <Plus size={20} />
              Create Game Room
            </button>

            <button
              onClick={onPlayVsAI}
              className="w-full bg-gradient-to-br from-amber-700 to-orange-800 hover:from-amber-600 hover:to-orange-700 text-white font-ornate font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 border-2 border-amber-500 shadow-xl mt-2"
            >
              <Bot size={20} />
              Play vs AI (Quick Start)
            </button>

            <div className="mt-6 pt-6 border-t border-golden-900/30">
              <h3 className="text-sm font-ornate text-parchment-300 mb-2">Join with Code</h3>
              <p className="text-xs text-parchment-400 mb-3 font-display">
                Join any game (public or private) using its room code
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  className="flex-1 px-4 py-2 border-2 border-golden-900/30 bg-stone-900/50 text-parchment-100 rounded-lg focus:ring-2 focus:ring-golden-500 focus:border-golden-500 outline-none uppercase font-mono placeholder:text-parchment-600"
                  maxLength={6}
                />
                <button
                  onClick={joinGameByCode}
                  disabled={loading || !joinCode.trim()}
                  className="px-6 py-2 bg-gradient-to-br from-bronze-600 to-bronze-800 hover:from-bronze-500 hover:to-bronze-700 text-white font-ornate rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-bronze-400"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-950/80 to-stone-950/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border-2 border-golden-900/40">
            <div className="mb-4">
              <h2 className="text-xl font-ornate font-bold text-golden-300">Public Games</h2>
              <p className="text-xs text-parchment-400 mt-1 font-display">
                Private games won't appear here - use room code to join
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableGames.length === 0 ? (
                <p className="text-parchment-500 text-center py-8 font-ornate">No public games available. Create one!</p>
              ) : (
                availableGames.map((game) => (
                  <GameCard key={game.id} game={game} onJoin={() => joinAvailableGame(game.id)} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function GameCard({ game, onJoin }: { game: Game; onJoin: () => void }) {
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    loadPlayerCount();

    const channel = supabase
      .channel(`game-${game.id}-players`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${game.id}`,
        },
        () => {
          loadPlayerCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id]);

  const loadPlayerCount = async () => {
    const { data, error } = await supabase.rpc('game_player_count', { p_game_id: game.id });

    if (!error && data !== null) {
      setPlayerCount(data);
    }
  };

  const maxPlayers = game.team_size * 2;

  return (
    <div className="border-2 border-golden-900/30 bg-gradient-to-br from-stone-900/60 to-amber-950/60 rounded-lg p-4 hover:border-golden-600 transition-all shadow-md hover:shadow-xl">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-mono text-lg font-bold text-golden-400">{game.room_code}</p>
          <p className="text-sm text-parchment-400 font-ornate">{game.team_size}v{game.team_size} Game</p>
        </div>
        <button
          onClick={onJoin}
          disabled={playerCount >= maxPlayers}
          className="px-4 py-2 bg-gradient-to-br from-golden-600 to-golden-800 hover:from-golden-500 hover:to-golden-700 text-white text-sm font-ornate rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-golden-400 shadow-lg"
        >
          {playerCount >= maxPlayers ? 'Full' : 'Join'}
        </button>
      </div>
      <div className="flex items-center gap-2 text-sm text-parchment-400 font-display">
        <Users size={16} />
        <span>{playerCount} / {maxPlayers} players</span>
      </div>
    </div>
  );
}
