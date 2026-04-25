/*
  # Add is_ai flag to game_players

  ## Purpose
  Marks bot players in a game so the client can identify them and the AI engine
  can skip them during human-turn logic. AI players are created as real auth users
  (anonymous sign-up) so they satisfy FK constraints on player_id, but they are
  flagged here so the UI and game loop can treat them differently.

  ## Tables Modified
  - game_players: new boolean column `is_ai` (default false)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_players'
    AND column_name = 'is_ai'
  ) THEN
    ALTER TABLE game_players
      ADD COLUMN is_ai boolean NOT NULL DEFAULT false;
  END IF;
END $$;
