/*
  # Fix circular RLS dependency between games and game_players

  ## Root Cause
  Two policies form a mutual recursion loop:
  1. `games` SELECT policy "Users can view public games or games they are in"
     queries `game_players` to check if the user is a member.
  2. `game_players` SELECT policy "game_players_select_non_recursive"
     queries `games` to check `games.status`.

  PostgreSQL detects this cycle and raises:
  "infinite recursion detected in policy for relation 'games'"

  ## Fix Strategy
  Break the cycle at both ends:

  A) Rewrite the `game_players` SELECT policy to NEVER query `games`.
     Instead, allow:
     - Own row (player_id = auth.uid()) — always safe, no cross-table reference
     - Rows where the game_id appears in a SECURITY DEFINER function that
       checks game_players directly with row_security disabled

  B) Replace the `games` SELECT membership check with a SECURITY DEFINER function
     `is_game_member(game_id uuid)` that queries `game_players` with row_security
     bypassed, eliminating the recursive policy evaluation.

  ## Tables Modified
  - game_players: SELECT policy rebuilt without any reference to games table
  - games: SELECT policy rebuilt using SECURITY DEFINER function

  ## Functions Added
  - `is_game_member(game_id uuid)` — SECURITY DEFINER, checks game_players
    membership for the current user without triggering RLS on either table
  - `get_user_game_ids()` — SECURITY DEFINER, returns all game_ids for
    the current user from game_players without RLS evaluation
*/

-- -----------------------------------------------------------------------
-- Step 1: Create SECURITY DEFINER helper functions
-- These functions bypass RLS on game_players so neither policy can loop
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_game_member(p_game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM game_players
    WHERE game_players.game_id = p_game_id
    AND game_players.player_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION get_user_game_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT game_id FROM game_players
  WHERE player_id = auth.uid();
$$;

-- -----------------------------------------------------------------------
-- Step 2: Fix game_players SELECT policy
-- Rewrite to NEVER reference the games table directly
-- Uses SECURITY DEFINER function for cross-game visibility
-- -----------------------------------------------------------------------

DROP POLICY IF EXISTS "game_players_select_non_recursive" ON game_players;

CREATE POLICY "game_players_select_policy_v3"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (
    -- Always see your own row
    (SELECT auth.uid()) = player_id
    OR
    -- See all rows in any game you are a member of (via SECURITY DEFINER fn, no RLS loop)
    game_id IN (SELECT get_user_game_ids())
  );

-- -----------------------------------------------------------------------
-- Step 3: Fix games SELECT policy
-- Replace the game_players subquery with a SECURITY DEFINER function call
-- -----------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view public games or games they are in" ON games;

CREATE POLICY "Users can view public or member games"
  ON games
  FOR SELECT
  TO authenticated
  USING (
    is_private = false
    OR
    is_game_member(id)
  );

-- -----------------------------------------------------------------------
-- Step 4: Revoke public execute on helper functions (security hygiene)
-- Only the RLS system (running as the table owner) should call these
-- -----------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION is_game_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_game_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_game_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_game_ids() TO authenticated;
