/*
  # Fix dissolve_game RPC to bypass RLS and allow host to dissolve

  ## Summary
  - Adds `SET LOCAL row_security = off` so internal queries bypass RLS recursion
  - Allows the host_player_id (not just created_by) to dissolve the game
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
  SET LOCAL row_security = on;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Game not found');
  END IF;

  IF v_game.created_by != v_user_id AND v_game.host_player_id != v_user_id THEN
    RETURN json_build_object('error', 'Only the game host can dissolve the game');
  END IF;

  DELETE FROM game_players WHERE game_id = p_game_id;
  DELETE FROM games WHERE id = p_game_id;

  RETURN json_build_object('success', true);
END;
$$;
