import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, getSuitSymbol, isCompleteSet, getSetPoints } from '../lib/gameLogic';
import type { CardSuit, CardType } from '../lib/database.types';

interface SetDeclarationProps {
  gameId: string;
  myCards: Card[];
  myTeam: 'team_a' | 'team_b';
  onClose: () => void;
}

export function SetDeclaration({ gameId, myCards, myTeam, onClose }: SetDeclarationProps) {
  const { user } = useAuth();
  const [selectedSuit, setSelectedSuit] = useState<CardSuit | null>(null);
  const [selectedType, setSelectedType] = useState<CardType | null>(null);
  const [loading, setLoading] = useState(false);

  const suits: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const types: { value: CardType; label: string; points: number }[] = [
    { value: 'minor', label: 'Minors (2-7)', points: 5 },
    { value: 'major', label: 'Majors (9-A)', points: 10 },
  ];

  const declareSet = async () => {
    if (!user || !selectedSuit || !selectedType) return;

    setLoading(true);
    try {
      const hasCompleteSet = isCompleteSet(myCards, selectedSuit, selectedType);

      if (!hasCompleteSet) {
        alert('You do not have all cards in this set!');
        setLoading(false);
        return;
      }

      const { data: existingSet } = await supabase
        .from('claimed_sets')
        .select('*')
        .eq('game_id', gameId)
        .eq('set_suit', selectedSuit)
        .eq('set_type', selectedType)
        .maybeSingle();

      if (existingSet) {
        alert('This set has already been claimed!');
        setLoading(false);
        return;
      }

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
        move_type: 'set_claim',
        card_suit: selectedSuit,
        set_type: selectedType,
        was_successful: true,
      });

      await supabase.from('claimed_sets').insert({
        game_id: gameId,
        team: myTeam,
        set_suit: selectedSuit,
        set_type: selectedType,
        claimed_by_player_id: user.id,
      });

      await supabase
        .from('game_cards')
        .update({
          is_in_claimed_set: true,
          claimed_by_team: myTeam,
        })
        .eq('game_id', gameId)
        .eq('card_suit', selectedSuit)
        .eq('card_type', selectedType);

      const { data: gameData } = await supabase
        .from('games')
        .select('team_a_score, team_b_score, team_a_points, team_b_points')
        .eq('id', gameId)
        .single();

      if (gameData) {
        const pointsToAdd = getSetPoints(selectedType);
        const newScore = myTeam === 'team_a'
          ? { team_a_score: gameData.team_a_score + 1, team_a_points: gameData.team_a_points + pointsToAdd }
          : { team_b_score: gameData.team_b_score + 1, team_b_points: gameData.team_b_points + pointsToAdd };

        await supabase
          .from('games')
          .update(newScore)
          .eq('id', gameId);

        const totalSets = (myTeam === 'team_a' ? newScore.team_a_score : newScore.team_b_score);
        if (totalSets >= 5) {
          const teamAFinalPoints = myTeam === 'team_a' ? newScore.team_a_points : gameData.team_a_points;
          const teamBFinalPoints = myTeam === 'team_b' ? newScore.team_b_points : gameData.team_b_points;
          const winningTeam = teamAFinalPoints > teamBFinalPoints ? 'team_a' :
                             teamBFinalPoints > teamAFinalPoints ? 'team_b' : myTeam;

          await supabase
            .from('games')
            .update({
              status: 'completed',
              winning_team: winningTeam,
              completed_at: new Date().toISOString(),
            })
            .eq('id', gameId);
        }
      }

      const { data: currentProfile } = await supabase
        .from('player_profiles')
        .select('sets_claimed')
        .eq('id', user.id)
        .single();

      if (currentProfile) {
        await supabase
          .from('player_profiles')
          .update({ sets_claimed: currentProfile.sets_claimed + 1 })
          .eq('id', user.id);
      }

      onClose();
    } catch (error) {
      console.error('Error declaring set:', error);
      alert('Error declaring set. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-700 rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Declare Complete Set</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Suit
            </label>
            <div className="grid grid-cols-2 gap-2">
              {suits.map((suit) => (
                <button
                  key={suit}
                  onClick={() => setSelectedSuit(suit)}
                  className={`p-4 rounded-lg text-2xl transition-all ${
                    selectedSuit === suit
                      ? 'bg-blue-600 ring-2 ring-yellow-400'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                >
                  {getSuitSymbol(suit)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {types.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`p-4 rounded-lg font-medium transition-all ${
                    selectedType === type.value
                      ? 'bg-blue-600 ring-2 ring-yellow-400'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                >
                  <div>{type.label}</div>
                  <div className="text-xs text-slate-300 mt-1">{type.points} points</div>
                </button>
              ))}
            </div>
          </div>

          {selectedSuit && selectedType && (
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-300 mb-2">You are declaring:</p>
              <p className="text-xl font-bold">
                {getSuitSymbol(selectedSuit)} {selectedType === 'minor' ? 'Minors (2-7)' : 'Majors (9-A)'}
              </p>
              <p className="text-sm text-golden-400 mt-2">
                Worth {getSetPoints(selectedType)} points
              </p>
              <p className="text-xs text-amber-400 mt-1">
                Make sure you have all 6 cards!
              </p>
            </div>
          )}

          <button
            onClick={declareSet}
            disabled={!selectedSuit || !selectedType || loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Declaring...' : 'Declare Set'}
          </button>
        </div>
      </div>
    </div>
  );
}
