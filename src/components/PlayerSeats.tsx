import type { Database } from '../lib/database.types';

type GamePlayer = Database['public']['Tables']['game_players']['Row'] & {
  player_profiles: { username: string } | null;
};

interface PlayerSeatsProps {
  players: GamePlayer[];
  currentPlayerId: string | null;
  myId: string;
  myTeam: 'team_a' | 'team_b';
  cardCounts: Record<string, number>;
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
}

export function PlayerSeats({
  players,
  currentPlayerId,
  myId,
  myTeam,
  cardCounts,
  selectedPlayerId,
  onSelectPlayer,
}: PlayerSeatsProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.player_id === myId) return -1;
    if (b.player_id === myId) return 1;
    return a.seat_position - b.seat_position;
  });

  const positions = [
    { top: '80%', left: '50%', transform: 'translateX(-50%)' },
    { top: '60%', left: '15%' },
    { top: '30%', left: '10%' },
    { top: '10%', left: '30%' },
    { top: '5%', left: '50%', transform: 'translateX(-50%)' },
    { top: '10%', right: '30%' },
    { top: '30%', right: '10%' },
    { top: '60%', right: '15%' },
  ];

  return (
    <div className="relative" style={{ height: '400px' }}>
      {sortedPlayers.map((player, index) => {
        const isMe = player.player_id === myId;
        const isCurrentTurn = player.player_id === currentPlayerId;
        const isOpponent = player.team !== myTeam;
        const isSelected = selectedPlayerId === player.player_id;
        const cardCount = cardCounts[player.player_id] || 0;

        return (
          <button
            key={player.id}
            onClick={() => isOpponent && !isMe && onSelectPlayer(player.player_id)}
            disabled={!isOpponent || isMe}
            style={positions[index]}
            className={`absolute transition-all ${
              isMe
                ? 'cursor-default'
                : isOpponent
                ? 'cursor-pointer hover:scale-110'
                : 'cursor-default opacity-75'
            } ${isSelected ? 'scale-110' : ''}`}
          >
            <div
              className={`rounded-2xl p-4 min-w-[140px] shadow-2xl transition-all border-2 ${
                isCurrentTurn
                  ? 'ring-4 ring-golden-400 animate-pulse shadow-[0_0_30px_rgba(245,158,11,0.5)]'
                  : ''
              } ${
                isSelected
                  ? 'ring-4 ring-golden-300 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                  : ''
              } ${
                player.team === 'team_a'
                  ? 'bg-gradient-to-br from-golden-600 to-golden-800 border-golden-400'
                  : 'bg-gradient-to-br from-bronze-600 to-bronze-800 border-bronze-400'
              } ${
                isMe
                  ? 'bg-gradient-to-br from-amber-900 to-stone-900 border-parchment-600'
                  : ''
              }`}
            >
              <div className="text-center">
                <div className="font-ornate font-bold text-white mb-1">
                  {player.player_profiles?.username || 'Player'}
                </div>
                {isMe && (
                  <div className="text-xs text-golden-300 font-ornate mb-1">You</div>
                )}
                <div className="text-sm text-white opacity-90 font-display">
                  {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                </div>
                <div className="text-xs text-white opacity-75 mt-1 font-display">
                  {player.team === 'team_a' ? 'Gold Team' : 'Bronze Team'}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
