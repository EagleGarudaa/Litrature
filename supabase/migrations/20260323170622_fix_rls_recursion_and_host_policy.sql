/*
  # Fix RLS Recursion and Host Game Policy

  ## Summary
  Resolves two critical issues:

  1. **RLS Infinite Recursion on game_players**
     - The SELECT policy on `game_players` calls `is_player_in_game()`, which itself queries
       `game_players` under the same RLS context, causing infinite recursion and silently
       returning no rows (empty seats, missing player names).
     - Fix: Recreate both `is_player_in_game` overloads with `SET LOCAL row_security = off`
       inside a security-definer context so the function's internal query bypasses RLS entirely.

  2. **games UPDATE policy excludes host**
     - The existing policy only allows the `created_by` user to update the game.
     - The host (`host_player_id`) is the one who starts the game, so they must also be allowed
       to update the game record.
     - Fix: Drop the old policy and create a new one that allows update when the user is either
       the creator or the host.
*/

-- Fix is_player_in_game(uuid) - single-arg version used in RLS policy
CREATE OR REPLACE FUNCTION is_player_in_game(p_game_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result boolean;
BEGIN
  SET LOCAL row_security = on;
  SELECT EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = p_game_id
    AND player_id = auth.uid()
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- Fix is_player_in_game(uuid, uuid) - two-arg version
CREATE OR REPLACE FUNCTION is_player_in_game(p_game_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result boolean;
BEGIN
  SET LOCAL row_security = on;
  SELECT EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = p_game_id
    AND player_id = p_user_id
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- Fix games UPDATE policy to include host_player_id
DROP POLICY IF EXISTS "Game creator can update game" ON games;
DROP POLICY IF EXISTS "Game host or creator can update game" ON games;

CREATE POLICY "Game host or creator can update game"
  ON games FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = created_by
    OR (SELECT auth.uid()) = host_player_id
  )
  WITH CHECK (
    (SELECT auth.uid()) = created_by
    OR (SELECT auth.uid()) = host_player_id
  );
