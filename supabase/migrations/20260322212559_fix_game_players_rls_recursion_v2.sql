/*
  # Fix infinite recursion in game_players RLS SELECT policy

  The existing SELECT policy checks game_players to verify if the current user
  is in the same game, which causes infinite recursion. This replaces it with
  a security definer function that bypasses RLS for the membership check.

  Changes:
  - Drop the recursive SELECT policy on game_players
  - Create a security definer helper function to check game membership
  - Recreate the SELECT policy using the helper function
*/

CREATE OR REPLACE FUNCTION public.user_is_in_game(gid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = gid AND player_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;

CREATE POLICY "Players can view players in their games"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (public.user_is_in_game(game_id));
