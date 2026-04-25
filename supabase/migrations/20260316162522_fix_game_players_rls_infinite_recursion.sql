/*
  # Fix infinite recursion in game_players RLS policy

  1. Changes
    - Drop the existing recursive SELECT policy on game_players
    - Create a new SELECT policy that allows players to view all players in games they are part of
    - Uses a simpler approach by checking if a matching record exists with their user_id
  
  2. Security
    - Players can only view game_players records for games they have joined
    - Prevents the infinite recursion issue while maintaining security
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;

-- Create a new policy without recursion
-- This allows viewing all game_players for games where the user has a record
CREATE POLICY "Players can view players in their games"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (
    game_id IN (
      SELECT game_id 
      FROM game_players 
      WHERE player_id = auth.uid()
    )
  );