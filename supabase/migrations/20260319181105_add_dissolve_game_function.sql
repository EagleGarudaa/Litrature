/*
  # Add dissolve_game Security Definer Function

  ## Problem
  The WaitingRoom's dissolveGame() does two direct DELETE operations:
    1. DELETE FROM game_players WHERE game_id = X
    2. DELETE FROM games WHERE id = X

  The first DELETE on game_players works (RLS allows DELETE where player_id = auth.uid()),
  but it only deletes the host's OWN row. Other players' rows are not deleted because
  the RLS DELETE policy only allows deleting your own row.

  The second DELETE on games can fail if the RLS policy doesn't allow it.

  ## Fix
  Create a SECURITY DEFINER function that:
  - Verifies the caller is the game creator (auth.uid() = created_by)
  - Deletes ALL game_players rows for that game
  - Deletes the game itself
  This runs as the function owner (postgres) bypassing RLS.

  ## Changes
  - Add dissolve_game(p_game_id uuid) function as SECURITY DEFINER
*/

CREATE OR REPLACE FUNCTION dissolve_game(p_game_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_game record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Game not found');
  END IF;

  IF v_game.created_by != v_user_id THEN
    RETURN json_build_object('error', 'Only the game creator can dissolve the game');
  END IF;

  DELETE FROM game_players WHERE game_id = p_game_id;
  DELETE FROM games WHERE id = p_game_id;

  RETURN json_build_object('success', true);
END;
$$;
