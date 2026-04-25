/*
  # Add First Join Timeout to Games

  1. Changes
    - Add `first_join_timeout_hours` column to games table (default 48 hours)
    - Add `first_player_joined_at` column to track when first player joins
    - Add function to cleanup games that exceed first join timeout with no players
    - Timer stops immediately after first player joins

  2. Purpose
    - Allow host to set custom timeout for first player to join
    - Automatically cleanup abandoned rooms after timeout
    - Prevent killing rooms with players or active games (fatal mistake prevention)
*/

-- Add timeout configuration columns to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'first_join_timeout_hours'
  ) THEN
    ALTER TABLE games ADD COLUMN first_join_timeout_hours integer DEFAULT 48;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'first_player_joined_at'
  ) THEN
    ALTER TABLE games ADD COLUMN first_player_joined_at timestamptz;
  END IF;
END $$;

-- Function to mark first player join time
CREATE OR REPLACE FUNCTION mark_first_player_join()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- When a player joins a game, mark the first join time if not already set
  UPDATE games
  SET first_player_joined_at = NOW()
  WHERE id = NEW.game_id
    AND first_player_joined_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to mark first player join
DROP TRIGGER IF EXISTS mark_first_player_join_trigger ON game_players;

CREATE TRIGGER mark_first_player_join_trigger
AFTER INSERT ON game_players
FOR EACH ROW
EXECUTE FUNCTION mark_first_player_join();

-- Update cleanup function to respect first join timeout
CREATE OR REPLACE FUNCTION cleanup_stale_games()
RETURNS void
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delete games in waiting status where:
  -- 1. No players have joined AND timeout exceeded
  -- 2. Do NOT delete if first_player_joined_at is set (someone joined, timer stops)
  DELETE FROM games
  WHERE status = 'waiting'
    AND first_player_joined_at IS NULL
    AND created_at < NOW() - (first_join_timeout_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
