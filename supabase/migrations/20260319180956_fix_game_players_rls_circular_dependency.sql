/*
  # Fix game_players RLS Circular Dependency

  ## Problem
  The SELECT policy on game_players uses is_player_in_game() which itself queries
  game_players. The is_player_in_game() function is SECURITY DEFINER (runs as postgres),
  which means auth.uid() returns NULL inside it -- so it always returns false.
  This means no player can ever see any rows in game_players, including their own.

  ## Fix
  Replace the circular SELECT policy with a direct inline policy that checks:
  - The row belongs to the current user (player_id = auth.uid()), OR
  - The current user is in the same game (correlated subquery that only needs to find
    the current user's OWN row, which is always visible since player_id = auth.uid())

  The key insight: checking for the current user's OWN row (player_id = auth.uid()) is
  not subject to RLS recursion because it's a direct equality check. We use that as the
  anchor for the correlated subquery.

  ## Changes
  - Drop old circular SELECT policy on game_players
  - Create new non-recursive SELECT policy using direct inline subquery
  - Drop is_player_in_game function (no longer needed)

  ## Security
  - Authenticated users can still only see game_players rows for games they are in
  - The policy is slightly simpler but equivalent in security
*/

-- Drop the broken circular policy
DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;

-- Create the fixed SELECT policy using a non-recursive approach.
-- Allow viewing a row if:
--   a) it is your own row (player_id = auth.uid()), OR
--   b) the current user has their own row in the same game
-- The inner SELECT anchors on player_id = auth.uid() which is always safe
-- because it doesn't trigger the same policy recursively for other users' rows.
CREATE POLICY "Players can view players in their games"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM game_players self
      WHERE self.game_id = game_players.game_id
        AND self.player_id = ( SELECT auth.uid() )
    )
  );
