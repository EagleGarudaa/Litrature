/*
  # Add server-side join_game function

  1. New Functions
    - `join_game(p_game_id uuid)` - SECURITY DEFINER function that safely adds a player to a game
      - Checks game exists and is in 'waiting' status
      - Checks game is not full
      - Checks player is not already in the game
      - Auto-assigns team (balances teams)
      - Auto-assigns next available seat position
      - Returns the inserted game_player row as JSON

  2. Why
    - The game_players SELECT RLS policy requires the user to already be in the game
    - When joining from the lobby, the user can't see existing players to determine
      correct team assignment and seat position
    - This function runs as SECURITY DEFINER to bypass RLS for the count/check queries
      while still validating the caller is authenticated
*/

CREATE OR REPLACE FUNCTION join_game(p_game_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_game record;
  v_player_count int;
  v_team_a_count int;
  v_team_b_count int;
  v_team text;
  v_seat int;
  v_result record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Game not found');
  END IF;

  IF v_game.status != 'waiting' THEN
    RETURN json_build_object('error', 'Game already started');
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = p_game_id AND player_id = v_user_id
  ) THEN
    RETURN json_build_object('error', 'Already in game', 'already_joined', true);
  END IF;

  SELECT count(*) INTO v_player_count
  FROM game_players WHERE game_id = p_game_id;

  IF v_player_count >= v_game.team_size * 2 THEN
    RETURN json_build_object('error', 'Game is full');
  END IF;

  SELECT count(*) INTO v_team_a_count
  FROM game_players WHERE game_id = p_game_id AND team = 'team_a';

  SELECT count(*) INTO v_team_b_count
  FROM game_players WHERE game_id = p_game_id AND team = 'team_b';

  IF v_team_a_count <= v_team_b_count THEN
    v_team := 'team_a';
  ELSE
    v_team := 'team_b';
  END IF;

  SELECT COALESCE(MAX(seat_position) + 1, 0) INTO v_seat
  FROM game_players WHERE game_id = p_game_id;

  INSERT INTO game_players (game_id, player_id, team, seat_position)
  VALUES (p_game_id, v_user_id, v_team, v_seat)
  RETURNING * INTO v_result;

  RETURN json_build_object(
    'success', true,
    'game_id', v_result.game_id,
    'player_id', v_result.player_id,
    'team', v_result.team,
    'seat_position', v_result.seat_position
  );
END;
$$;
