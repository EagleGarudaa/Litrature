/*
  # Fix remaining database security and performance issues

  1. Changes
    - Add missing foreign key indexes for game_cards, game_moves, and game_players
    - Consolidate overlapping RLS policies on game_cards table
    - Remove redundant policies to avoid multiple permissive policy warnings
  
  2. Performance Improvements
    - Indexes on foreign keys improve join performance
    - Cleaner policy structure improves query planning
  
  3. Security
    - Maintains all security guarantees with simplified policy structure
    - Players can only view their own cards
    - Players in a game can insert cards (for game setup)
    - Players in a game can update/delete cards (for game moves)
*/

-- ============================================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Add index for game_cards.player_id foreign key
CREATE INDEX IF NOT EXISTS idx_game_cards_player_id_fk 
  ON game_cards(player_id);

-- Add index for game_moves.game_id foreign key
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id_fk 
  ON game_moves(game_id);

-- Add index for game_players.player_id foreign key
CREATE INDEX IF NOT EXISTS idx_game_players_player_id_fk 
  ON game_players(player_id);

-- ============================================================================
-- CONSOLIDATE game_cards RLS POLICIES
-- ============================================================================

-- Drop all existing game_cards policies
DROP POLICY IF EXISTS "Players can manage cards" ON game_cards;
DROP POLICY IF EXISTS "System can manage cards" ON game_cards;
DROP POLICY IF EXISTS "Players can view cards in their games" ON game_cards;
DROP POLICY IF EXISTS "Players can view own cards" ON game_cards;

-- Create consolidated policies - one per operation type

-- SELECT: Players can only view their own cards
CREATE POLICY "Players can view own cards"
  ON game_cards
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = player_id);

-- INSERT: Players in the game can insert cards (for initial deal)
CREATE POLICY "Players can insert cards in their games"
  ON game_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (is_player_in_game(game_id, (SELECT auth.uid())));

-- UPDATE: Players in the game can update cards (for transfers during gameplay)
CREATE POLICY "Players can update cards in their games"
  ON game_cards
  FOR UPDATE
  TO authenticated
  USING (is_player_in_game(game_id, (SELECT auth.uid())))
  WITH CHECK (is_player_in_game(game_id, (SELECT auth.uid())));

-- DELETE: Players in the game can delete cards (for claimed sets)
CREATE POLICY "Players can delete cards in their games"
  ON game_cards
  FOR DELETE
  TO authenticated
  USING (is_player_in_game(game_id, (SELECT auth.uid())));