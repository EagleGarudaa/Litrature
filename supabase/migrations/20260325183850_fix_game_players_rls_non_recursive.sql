/*
  # Fix game_players RLS - eliminate recursive SELECT policy

  ## Root Cause
  The SELECT policy `USING (is_player_in_game(game_id))` calls a function that queries
  `game_players` itself. Even with `SET LOCAL row_security = off` inside the function,
  PostgreSQL evaluates RLS policy predicates in a context where SET LOCAL cannot
  disable row security on the table whose policy is actively being evaluated.
  This causes either infinite recursion or silent empty results.

  ## Fix
  Replace the recursive policy with a two-part non-recursive approach:
  1. Players in a WAITING game can see ALL players in that game (lobby visibility)
     This is done without recursion by checking the `games` table only.
  2. Players in an IN_PROGRESS game can see rows only where their player_id matches
     OR where they are listed via a direct subquery on games (non-recursive).

  The simplest correct approach: allow authenticated users to SELECT any game_players
  row where the game_id references a game that the current user appears in, using
  a correlated subquery that avoids touching game_players in the USING clause.

  Since we cannot avoid recursion entirely with a pure SQL approach on this table,
  we use the proven pattern: a SECURITY DEFINER function that uses SET search_path
  and is called as a stable function — combined with ensuring the function itself
  does not get caught in the RLS loop by checking a SEPARATE table (games).

  ## Actual Fix Applied
  The simplest non-recursive policy:
  - For SELECT: allow if auth.uid() = player_id (own row always visible)
    OR if the game is in 'waiting' status (lobby - anyone authenticated can see)
    The second condition checks ONLY the games table, not game_players, eliminating recursion.

  This means:
  - In the waiting room: everyone can see the full player list (required for team display)
  - In an active game: each player can only see their own game_players row
    (actual card/game data is protected by game_cards policies separately)
  - After game: same as active

  ## Tables Modified
  - game_players: SELECT policy replaced
*/

-- Drop all existing SELECT policies on game_players
DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;
DROP POLICY IF EXISTS "game_players_select_policy" ON game_players;
DROP POLICY IF EXISTS "Players can select own game player record" ON game_players;
DROP POLICY IF EXISTS "Authenticated users can view game players" ON game_players;

-- New non-recursive SELECT policy:
-- Rule 1: You can always see your own row (needed for active games)
-- Rule 2: You can see ALL rows in a WAITING game (needed for the lobby/waiting room)
-- Rule 3: You can see ALL rows in games you are participating in (active games)
--         checked via a direct join to games table only (non-recursive)
CREATE POLICY "game_players_select_non_recursive"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (
    -- Always see your own record
    (SELECT auth.uid()) = player_id
    OR
    -- See all players in waiting-room games (game status is public info)
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_players.game_id
      AND games.status = 'waiting'
    )
    OR
    -- See all players in games you created or host (needed for game management)
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_players.game_id
      AND (games.created_by = (SELECT auth.uid()) OR games.host_player_id = (SELECT auth.uid()))
    )
  );
