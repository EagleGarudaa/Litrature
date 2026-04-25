import { useEffect, useState } from 'react';
import { Trophy, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];
type GamePlayer = Database['public']['Tables']['game_players']['Row'] & {
  player_profiles: { username: string } | null;
};
type ClaimedSet = Database['public']['Tables']['claimed_sets']['Row'];

interface GameCompleteProps {
  gameId: string;
  onReturnToLobby: () => void;
}

export function GameComplete({ gameId, onReturnToLobby }: GameCompleteProps) {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [claimedSets, setClaimedSets] = useState<ClaimedSet[]>([]);
  const [myTeam, setMyTeam] = useState<'team_a' | 'team_b'>('team_a');

  useEffect(() => {
    const init = async () => {
      const { gameData, playersData } = await loadGameResults();
      if (user && gameData && playersData) {
        await updatePlayerStats(gameData, playersData);
      }
    };
    init();
  }, [gameId, user]);

  const loadGameResults = async () => {
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
      .eq('game_id', gameId);

    if (playersData) {
      setPlayers(playersData as GamePlayer[]);
      const currentPlayer = playersData.find(p => p.player_id === user?.id);
      if (currentPlayer) {
        setMyTeam(currentPlayer.team);
      }
    }

    const { data: setsData } = await supabase
      .from('claimed_sets')
      .select('*')
      .eq('game_id', gameId);

    if (setsData) {
      setClaimedSets(setsData);
    }

    return { gameData: gameData ?? null, playersData: playersData ?? null };
  };

  const updatePlayerStats = async (gameData: Game, playersData: GamePlayer[]) => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('player_profiles')
      .select('games_played, games_won, stats_updated_for_game')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) return;

    if (profile.stats_updated_for_game === gameId) return;

    const currentPlayer = playersData.find(p => p.player_id === user.id);
    const isWinner = currentPlayer && gameData.winning_team === currentPlayer.team;

    await supabase
      .from('player_profiles')
      .update({
        games_played: profile.games_played + 1,
        games_won: isWinner ? profile.games_won + 1 : profile.games_won,
        stats_updated_for_game: gameId,
      })
      .eq('id', user.id)
      .eq('stats_updated_for_game', profile.stats_updated_for_game);
  };

  if (!game) return null;

  const teamAPlayers = players.filter(p => p.team === 'team_a');
  const teamBPlayers = players.filter(p => p.team === 'team_b');
  const teamASets = claimedSets.filter(s => s.team === 'team_a');
  const teamBSets = claimedSets.filter(s => s.team === 'team_b');
  const teamAPoints = game.team_a_points || 0;
  const teamBPoints = game.team_b_points || 0;
  const isDraw = game.winning_team === 'draw';
  const didIWin = !isDraw && game.winning_team === myTeam;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-amber-950 to-stone-900 bg-gothic-pattern text-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-gradient-to-br from-amber-950/80 to-stone-950/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border-2 border-golden-900/40">
          <div className="text-center mb-8">
            <div className={`inline-block p-4 rounded-full mb-4 border-4 ${
              isDraw
                ? 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-400 shadow-[0_0_30px_rgba(148,163,184,0.5)]'
                : didIWin
                ? 'bg-gradient-to-br from-golden-600 to-golden-800 border-golden-400 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
                : 'bg-gradient-to-br from-stone-800 to-stone-900 border-stone-700'
            }`}>
              <Trophy size={64} />
            </div>
            <h1 className="text-4xl font-ornate font-bold mb-2 text-golden-300">
              {isDraw ? 'Draw!' : didIWin ? 'Victory!' : 'Game Over'}
            </h1>
            <p className="text-xl text-parchment-300 font-display">
              {isDraw
                ? 'Both Teams Tied!'
                : `${game.winning_team === 'team_a' ? 'Golden Team' : 'Bronze Team'} Wins!`
              }
            </p>
            <p className="text-2xl font-bold text-golden-400 mt-2">
              {isDraw ? `${teamAPoints} - ${teamBPoints}` : `${game.winning_team === 'team_a' ? teamAPoints : teamBPoints} Points`}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className={`rounded-xl p-6 border-2 ${
              isDraw
                ? 'bg-gradient-to-br from-golden-600 to-golden-800 ring-4 ring-slate-400 border-slate-300 shadow-[0_0_30px_rgba(148,163,184,0.4)]'
                : game.winning_team === 'team_a'
                ? 'bg-gradient-to-br from-golden-600 to-golden-800 ring-4 ring-golden-400 border-golden-300 shadow-[0_0_30px_rgba(245,158,11,0.4)]'
                : 'bg-gradient-to-br from-golden-700 to-golden-900 opacity-75 border-golden-700'
            }`}>
              <h2 className="text-2xl font-ornate font-bold mb-2 flex items-center justify-between">
                <span>Golden Team</span>
                <span className="text-3xl">{teamAPoints}</span>
              </h2>
              <p className="text-sm text-golden-100 mb-4">{teamASets.length} sets claimed</p>
              <div className="space-y-2">
                {teamAPlayers.map(player => (
                  <div key={player.id} className="bg-golden-900/50 rounded-lg p-3 border border-golden-600/30">
                    <p className="font-ornate">
                      {player.player_profiles?.username || 'Player'}
                      {player.player_id === user?.id && ' (You)'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-xl p-6 border-2 ${
              isDraw
                ? 'bg-gradient-to-br from-bronze-600 to-bronze-800 ring-4 ring-slate-400 border-slate-300 shadow-[0_0_30px_rgba(148,163,184,0.4)]'
                : game.winning_team === 'team_b'
                ? 'bg-gradient-to-br from-bronze-600 to-bronze-800 ring-4 ring-bronze-400 border-bronze-300 shadow-[0_0_30px_rgba(220,38,38,0.4)]'
                : 'bg-gradient-to-br from-bronze-700 to-bronze-900 opacity-75 border-bronze-700'
            }`}>
              <h2 className="text-2xl font-ornate font-bold mb-2 flex items-center justify-between">
                <span>Bronze Team</span>
                <span className="text-3xl">{teamBPoints}</span>
              </h2>
              <p className="text-sm text-bronze-100 mb-4">{teamBSets.length} sets claimed</p>
              <div className="space-y-2">
                {teamBPlayers.map(player => (
                  <div key={player.id} className="bg-bronze-900/50 rounded-lg p-3 border border-bronze-600/30">
                    <p className="font-ornate">
                      {player.player_profiles?.username || 'Player'}
                      {player.player_id === user?.id && ' (You)'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-stone-900/80 to-amber-950/60 rounded-xl p-6 mb-6 border border-golden-900/30">
            <h3 className="text-lg font-ornate font-bold mb-3 text-golden-300">Final Score</h3>
            <div className="flex justify-around text-center">
              <div>
                <p className="text-4xl font-bold text-golden-400 font-display">{teamAPoints}</p>
                <p className="text-sm text-parchment-400 font-ornate">Golden Team</p>
                <p className="text-xs text-parchment-600 mt-1">{teamASets.length} sets</p>
              </div>
              <div className="text-parchment-500 text-2xl">vs</div>
              <div>
                <p className="text-4xl font-bold text-bronze-400 font-display">{teamBPoints}</p>
                <p className="text-sm text-parchment-400 font-ornate">Bronze Team</p>
                <p className="text-xs text-parchment-600 mt-1">{teamBSets.length} sets</p>
              </div>
            </div>
          </div>

          <button
            onClick={onReturnToLobby}
            className="w-full bg-gradient-to-br from-golden-600 to-golden-800 hover:from-golden-500 hover:to-golden-700 text-white font-ornate font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2 border-2 border-golden-400 shadow-xl"
          >
            <ArrowLeft size={24} />
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
