import { getSuitSymbol } from '../lib/gameLogic';
import type { Database } from '../lib/database.types';

type GameMove = Database['public']['Tables']['game_moves']['Row'];
type GamePlayer = Database['public']['Tables']['game_players']['Row'] & {
  player_profiles: { username: string } | null;
};
type ClaimedSet = Database['public']['Tables']['claimed_sets']['Row'];

interface GameLogProps {
  moves: GameMove[];
  players: GamePlayer[];
  claimedSets: ClaimedSet[];
}

export function GameLog({ moves, players, claimedSets }: GameLogProps) {
  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return 'Unknown';
    const player = players.find(p => p.player_id === playerId);
    return player?.player_profiles?.username || 'Player';
  };

  return (
    <div className="bg-slate-700 rounded-2xl p-4 h-full">
      <h2 className="text-xl font-bold mb-4">Game Log</h2>

      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
        {claimedSets.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Claimed Sets</h3>
            {claimedSets.map((set) => (
              <div
                key={set.id}
                className={`p-2 rounded-lg mb-2 ${
                  set.team === 'team_a' ? 'bg-blue-600' : 'bg-red-600'
                }`}
              >
                <div className="text-sm font-medium">
                  Team {set.team === 'team_a' ? 'A' : 'B'}
                </div>
                <div className="text-xs">
                  {getSuitSymbol(set.set_suit)} {set.set_type === 'minor' ? 'Minors' : 'Majors'}
                </div>
              </div>
            ))}
          </div>
        )}

        {moves.map((move) => {
          if (move.move_type === 'ask_card') {
            const asker = getPlayerName(move.player_id);
            const target = getPlayerName(move.target_player_id);
            const card = `${move.card_rank}${getSuitSymbol(move.card_suit as any)}`;

            return (
              <div
                key={move.id}
                className={`p-3 rounded-lg text-sm ${
                  move.was_successful
                    ? 'bg-green-600 bg-opacity-20 border border-green-600'
                    : 'bg-red-600 bg-opacity-20 border border-red-600'
                }`}
              >
                <div className="font-medium">{asker}</div>
                <div className="text-xs text-slate-300">
                  asked {target} for {card}
                </div>
                <div className={`text-xs font-medium mt-1 ${
                  move.was_successful ? 'text-green-400' : 'text-red-400'
                }`}>
                  {move.was_successful ? 'Got the card!' : 'No card'}
                </div>
              </div>
            );
          }

          if (move.move_type === 'set_claim') {
            const claimer = getPlayerName(move.player_id);
            const set = `${getSuitSymbol(move.card_suit as any)} ${move.set_type === 'minor' ? 'Minors' : 'Majors'}`;

            return (
              <div
                key={move.id}
                className={`p-3 rounded-lg text-sm ${
                  move.was_successful
                    ? 'bg-amber-600 bg-opacity-20 border border-amber-600'
                    : 'bg-red-600 bg-opacity-20 border border-red-600'
                }`}
              >
                <div className="font-medium">{claimer}</div>
                <div className="text-xs text-slate-300">
                  declared {set}
                </div>
                <div className={`text-xs font-medium mt-1 ${
                  move.was_successful ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {move.was_successful ? 'Valid set!' : 'Invalid claim'}
                </div>
              </div>
            );
          }

          return null;
        })}

        {moves.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            No moves yet. Start asking for cards!
          </div>
        )}
      </div>
    </div>
  );
}
