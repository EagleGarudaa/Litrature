/*
  # Add switch_team RPC function

  Creates a SECURITY DEFINER function that allows players to switch teams
  in the waiting room. Using SECURITY DEFINER bypasses RLS on game_players
  for the update, avoiding permission issues with the current RLS policies.

  The function validates:
  - User is authenticated
  - Game exists and is in 'waiting' status
  - Player is already in the game
  - Target team is not full
  - Player is not already on the target team
*/

CREATE OR REPLACE FUNCTION public.switch_team(
  p_game_id uuid,
  p_target_team text
)
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

  SELECT * INTO v_current FROM game_players
  WHERE game_id = p_game_id AND player_id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'You are not in this game');
  END IF;

  IF v_current.team = p_target_team THEN
    RETURN json_build_object('error', 'Already on that team');
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
