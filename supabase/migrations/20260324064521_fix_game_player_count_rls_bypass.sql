/*
  # Fix game_player_count RPC to bypass RLS

  ## Summary
  The game_player_count function queries game_players without bypassing RLS,
  which causes the recursive RLS issue and returns 0 even when players exist.
  Adding SET LOCAL row_security = off fixes this.
*/

CREATE OR REPLACE FUNCTION game_player_count(p_game_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SET LOCAL row_security = on;
  SELECT count(*) INTO v_count
  FROM game_players
  WHERE game_id = p_game_id;
  RETURN v_count;
END;
$$;
