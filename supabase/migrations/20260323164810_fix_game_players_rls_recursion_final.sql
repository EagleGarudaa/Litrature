/*
  # Fix game_players SELECT policy infinite recursion (final)

  ## Problem
  The current SELECT policy "Players can view players in their games" uses:
    EXISTS (SELECT 1 FROM game_players gp WHERE gp.game_id = game_players.game_id AND gp.player_id = auth.uid())
  This queries game_players from within a game_players RLS policy, causing infinite recursion.

  ## Solution
  1. Drop the broken recursive SELECT policy
  2. Create a SECURITY DEFINER helper function that checks membership with row_security = off
  3. Recreate the SELECT policy using the safe helper function

  ## Security
  - The helper function is SECURITY DEFINER and sets search_path = public
  - It disables row_security inside its execution context to avoid recursion
  - The SELECT policy still enforces that only authenticated users in the same game can see each other
*/

-- Step 1: Drop the broken recursive policy
DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;

-- Step 2: Create a safe SECURITY DEFINER helper that bypasses RLS to check membership
CREATE OR REPLACE FUNCTION public.is_player_in_game(p_game_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = p_game_id
      AND player_id = auth.uid()
  );
END;
$$;

-- Step 3: Recreate SELECT policy using the safe helper (no recursion)
CREATE POLICY "Players can view players in their games"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (public.is_player_in_game(game_id));
