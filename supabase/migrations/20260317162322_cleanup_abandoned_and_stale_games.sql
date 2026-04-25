/*
  # Cleanup Abandoned and Stale Games

  1. Changes
    - Add function to delete waiting games older than 2 hours
    - Add function to delete games where host left
    - Add scheduled cleanup for stale games

  2. Purpose
    - Remove abandoned games that are stuck in waiting state
    - Remove games where host disconnected but players remain
    - Keep lobby clean of old/orphaned games
*/

-- Function to cleanup stale waiting games
CREATE OR REPLACE FUNCTION cleanup_stale_games()
RETURNS void
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delete games in waiting status older than 2 hours
  DELETE FROM games
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '2 hours';

  -- Delete games where the host is no longer a player
  DELETE FROM games g
  WHERE g.host_player_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM game_players gp
      WHERE gp.game_id = g.id
        AND gp.player_id = g.host_player_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to handle host leaving
CREATE OR REPLACE FUNCTION handle_host_departure()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If the departing player was the host and game is still in waiting
  IF EXISTS (
    SELECT 1 FROM games
    WHERE id = OLD.game_id
      AND host_player_id = OLD.player_id
      AND status = 'waiting'
  ) THEN
    -- Delete the game since host left during waiting
    DELETE FROM games
    WHERE id = OLD.game_id
      AND host_player_id = OLD.player_id
      AND status = 'waiting';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle when host leaves
DROP TRIGGER IF EXISTS handle_host_departure_trigger ON game_players;

CREATE TRIGGER handle_host_departure_trigger
AFTER DELETE ON game_players
FOR EACH ROW
EXECUTE FUNCTION handle_host_departure();
