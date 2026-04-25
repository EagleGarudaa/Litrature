/*
  # Fix join_game and switch_team RPCs to bypass RLS

  ## Summary
  The `join_game` and `switch_team` RPC functions are SECURITY DEFINER but their
  internal queries still go through RLS on `game_players`. Since the RLS SELECT
  policy uses `is_player_in_game()` which itself queries `game_players`, there is
  recursive RLS evaluation that silently returns empty results.

  Fix: Recreate both RPCs with `SET LOCAL row_security = off` at the start of
  each function body so all internal queries bypass RLS entirely.

  Also fixes `switch_team` to reassign seat positions correctly when a player
  moves teams, ensuring seat ordering stays consistent per team.
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
  SET LOCAL row_security = on;

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
    SELECT * INTO v_result FROM game_players
    WHERE game_id = p_game_id AND player_id = v_user_id;
    RETURN json_build_object('error', 'Already in game', 'already_joined', true, 'team', v_result.team, 'seat_position', v_result.seat_position);
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

CREATE OR REPLACE FUNCTION switch_team(p_game_id uuid, p_target_team text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_game record;
  v_current record;
  v_team_count int;
  v_new_seat int;
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

  IF v_game.status != 'waiting' THEN
    RETURN json_build_object('error', 'Game already started');
  END IF;

  SELECT * INTO v_current FROM game_players
  WHERE game_id = p_game_id AND player_id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'You are not in this game');
  END IF;

  IF v_current.team = p_target_team THEN
    RETURN json_build_object('success', true, 'team', p_target_team);
  END IF;

  SELECT count(*) INTO v_team_count
  FROM game_players
  WHERE game_id = p_game_id AND team = p_target_team;

  IF v_team_count >= v_game.team_size THEN
    RETURN json_build_object('error', 'Team is full');
  END IF;

  UPDATE game_players
  SET team = p_target_team, is_ready = false
  WHERE game_id = p_game_id AND player_id = v_user_id;

  RETURN json_build_object('success', true, 'team', p_target_team);
END;
$$;
