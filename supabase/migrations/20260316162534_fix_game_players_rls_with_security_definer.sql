/*
  # Fix game_players RLS using security definer function

  1. Changes
    - Create a security definer function to check if user is in a game
    - Update the SELECT policy to use this function instead of recursive query
  
  2. Security
    - Function runs with elevated privileges to avoid recursion
    - Policy still ensures users can only see players in their games
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;

-- Create a security definer function to check if user is in a game
CREATE OR REPLACE FUNCTION is_player_in_game(p_game_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM game_players 
    WHERE game_id = p_game_id 
      AND player_id = p_user_id
  );
END;
$$;

-- Create new policy using the security definer function
CREATE POLICY "Players can view players in their games"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (is_player_in_game(game_id, auth.uid()));