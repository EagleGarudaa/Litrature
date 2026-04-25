/*
  # Fix game_players SELECT policy - restore auth.uid() context

  ## Problem
  The current SELECT policy uses a SECURITY DEFINER function `user_is_in_game()`.
  SECURITY DEFINER functions run as the function owner (postgres), not the calling
  user, which means auth.uid() returns NULL inside the function. This causes the
  policy to always evaluate to false, blocking all reads from game_players.

  As a result:
  - loadPlayers() always returns empty
  - currentPlayer is never found
  - Team join buttons never render correctly

  ## Fix
  Replace the broken SECURITY DEFINER function policy with a direct inline
  correlated subquery. The subquery only looks at rows where player_id matches
  auth.uid() (the current user's own row), which breaks the recursion without
  needing a helper function, and auth.uid() works correctly at RLS evaluation time.

  ## Changes
  - Drop the broken SELECT policy
  - Drop the user_is_in_game() helper function
  - Recreate SELECT policy using a safe inline correlated subquery
*/

DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;

DROP FUNCTION IF EXISTS public.user_is_in_game(uuid);

CREATE POLICY "Players can view players in their games"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM game_players gp
      WHERE gp.game_id = game_players.game_id
        AND gp.player_id = auth.uid()
    )
  );
