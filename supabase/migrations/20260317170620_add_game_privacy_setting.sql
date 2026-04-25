/*
  # Add Game Privacy Setting

  1. Changes
    - Add `is_private` column to games table (default: false for public games)
    - Update RLS policies to respect privacy settings
    - Public games appear in lobby for all users
    - Private games only accessible via room code

  2. Purpose
    - Allow hosts to create private games that don't appear in public lobby
    - Enable signin users to control game visibility
    - Private games only joinable by room code, not from lobby list
*/

-- Add is_private column to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE games ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;

-- Update the games RLS policy to allow viewing public games or games the user is in
DROP POLICY IF EXISTS "Anyone can view waiting games" ON games;

CREATE POLICY "Users can view public games or games they are in"
  ON games FOR SELECT
  TO authenticated
  USING (
    is_private = false 
    OR 
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.player_id = auth.uid()
    )
  );

-- Allow anonymous users to view only public games
CREATE POLICY "Anonymous users can view public games"
  ON games FOR SELECT
  TO anon
  USING (is_private = false);
