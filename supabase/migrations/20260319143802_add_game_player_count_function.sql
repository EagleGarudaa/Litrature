/*
  # Add game_player_count function

  1. New Functions
    - `game_player_count(p_game_id uuid)` - SECURITY DEFINER function that returns
      the number of players in a game
      - Needed because game_players SELECT RLS only allows players already in the game
        to see other players
      - The lobby needs to show accurate player counts for games the user hasn't joined

  2. Why
    - Without this, the lobby game cards show 0 players for every game
    - The user can't see game_players rows for games they're not in
*/

CREATE OR REPLACE FUNCTION game_player_count(p_game_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM game_players
  WHERE game_id = p_game_id;

  RETURN v_count;
END;
$$;
