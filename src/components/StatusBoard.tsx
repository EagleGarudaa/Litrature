import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ALL_SETS, getSetSymbol, getSetName } from '../lib/gameLogic';
import { CardSuit, CardType, Team } from '../lib/database.types';

interface ClaimedSet {
  set_suit: CardSuit;
  set_type: CardType;
  team: Team;
}

interface StatusBoardProps {
  gameId: string;
}

export function StatusBoard({ gameId }: StatusBoardProps) {
  const [claimedSets, setClaimedSets] = useState<ClaimedSet[]>([]);

  useEffect(() => {
    loadClaimedSets();

    const channel = supabase
      .channel(`game-${gameId}-sets`)
      .on(
        'postgres_changes',
        {
          event: '*',
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
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  async function loadClaimedSets() {
    const { data } = await supabase
      .from('claimed_sets')
      .select('set_suit, set_type, team')
      .eq('game_id', gameId);

    if (data) {
      setClaimedSets(data);
    }
  }

  function getSetStatus(suit: CardSuit, type: CardType): Team | null {
    const claimed = claimedSets.find(
      (s) => s.set_suit === suit && s.set_type === type
    );
    return claimed ? claimed.team : null;
  }

  function getSetColor(team: Team | null): string {
    if (!team) return 'text-gray-400';
    return team === 'team_a' ? 'text-golden-500' : 'text-bronze-600';
  }

  function getSetGlow(team: Team | null): string {
    if (!team) return '';
    return team === 'team_a'
      ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'
      : 'drop-shadow-[0_0_8px_rgba(220,38,38,0.6)]';
  }

  const redSets = ALL_SETS.filter(s => s.suit === 'hearts' || s.suit === 'diamonds');
  const blackSets = ALL_SETS.filter(s => s.suit === 'clubs' || s.suit === 'spades');

  return (
    <div className="bg-gradient-to-br from-amber-950 to-stone-900 border-2 border-golden-700 rounded-lg p-4 shadow-2xl">
      <div className="text-center mb-3">
        <h3 className="text-lg font-ornate text-golden-300 tracking-wide">Set Status Board</h3>
        <div className="text-xs text-parchment-400 font-display mt-1">Minor: 5pts • Major: 10pts</div>
        <div className="h-px bg-gradient-to-r from-transparent via-golden-600 to-transparent mt-2"></div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {redSets.map((set) => {
            const status = getSetStatus(set.suit, set.type);
            return (
              <div
                key={`${set.suit}-${set.type}`}
                className="bg-stone-950/40 border border-golden-900/30 rounded p-2 text-center transition-all duration-500"
                title={getSetName(set.suit, set.type)}
              >
                <div className={`text-3xl transition-all duration-500 ${getSetColor(status)} ${getSetGlow(status)}`}>
                  {getSetSymbol(set.suit, set.type)}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 font-display">
                  {set.suit.charAt(0).toUpperCase()}.{set.type === 'major' ? 'Maj' : 'Min'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-bronze-800 to-transparent"></div>

        <div className="grid grid-cols-2 gap-2">
          {blackSets.map((set) => {
            const status = getSetStatus(set.suit, set.type);
            return (
              <div
                key={`${set.suit}-${set.type}`}
                className="bg-stone-950/40 border border-bronze-900/30 rounded p-2 text-center transition-all duration-500"
                title={getSetName(set.suit, set.type)}
              >
                <div className={`text-3xl transition-all duration-500 ${getSetColor(status)} ${getSetGlow(status)}`}>
                  {getSetSymbol(set.suit, set.type)}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 font-display">
                  {set.suit.charAt(0).toUpperCase()}.{set.type === 'major' ? 'Maj' : 'Min'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-between text-xs font-display">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-golden-500"></div>
          <span className="text-golden-300">Gold Team</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-bronze-600"></div>
          <span className="text-bronze-300">Bronze Team</span>
        </div>
      </div>
    </div>
  );
}
