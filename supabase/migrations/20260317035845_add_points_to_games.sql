/*
  # Add Points Tracking to Games

  1. Changes
    - Add `team_a_points` column to track Golden Team's total points
    - Add `team_b_points` column to track Bronze Team's total points
    - Minor sets are worth 5 points
    - Major sets are worth 10 points
    - Winner is determined by highest points (not just set count)

  2. Notes
    - Default values set to 0 for new games
    - Existing games will have points set to 0
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'team_a_points'
  ) THEN
    ALTER TABLE games ADD COLUMN team_a_points integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'team_b_points'
  ) THEN
    ALTER TABLE games ADD COLUMN team_b_points integer DEFAULT 0 NOT NULL;
  END IF;
END $$;
