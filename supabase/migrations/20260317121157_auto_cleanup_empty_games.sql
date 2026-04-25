/*
  # Auto-cleanup Empty Games

  1. Changes
    - Add database function to auto-delete games when last player leaves
    - Add trigger to execute cleanup when players are removed

  2. Security
    - Function runs with security definer to bypass RLS
    - Only affects games with no players
*/

-- Function to delete games with no players
CREATE OR REPLACE FUNCTION cleanup_empty_games()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  -- Delete games that have no players
  DELETE FROM games
  WHERE id = OLD.game_id
    AND NOT EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = OLD.game_id
    );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run cleanup after player deletion
DROP TRIGGER IF EXISTS cleanup_empty_games_trigger ON game_players;

CREATE TRIGGER cleanup_empty_games_trigger
AFTER DELETE ON game_players
FOR EACH ROW
EXECUTE FUNCTION cleanup_empty_games();
