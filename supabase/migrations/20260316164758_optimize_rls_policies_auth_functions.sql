/*
  # Optimize RLS policies to use SELECT for auth functions

  1. Changes
    - Update all RLS policies to use (SELECT auth.uid()) instead of auth.uid()
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale
  
  2. Tables Updated
    - player_profiles: INSERT and UPDATE policies
    - games: INSERT and UPDATE policies
    - game_players: INSERT, UPDATE, DELETE, and SELECT policies
    - game_cards: SELECT and INSERT policies
    - game_moves: SELECT and INSERT policies
    - claimed_sets: SELECT and INSERT policies
*/

-- ============================================================================
-- PLAYER_PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON player_profiles;
CREATE POLICY "Users can insert own profile"
  ON player_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON player_profiles;
CREATE POLICY "Users can update own profile"
  ON player_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================================
-- GAMES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create games" ON games;
CREATE POLICY "Authenticated users can create games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS "Game creator can update game" ON games;
CREATE POLICY "Game creator can update game"
  ON games
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

-- ============================================================================
-- GAME_PLAYERS
-- ============================================================================

DROP POLICY IF EXISTS "Players can join games" ON game_players;
CREATE POLICY "Players can join games"
  ON game_players
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = player_id);

DROP POLICY IF EXISTS "Players can update own game player record" ON game_players;
CREATE POLICY "Players can update own game player record"
  ON game_players
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = player_id)
  WITH CHECK ((SELECT auth.uid()) = player_id);

DROP POLICY IF EXISTS "Players can leave games" ON game_players;
CREATE POLICY "Players can leave games"
  ON game_players
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = player_id);

DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;
CREATE POLICY "Players can view players in their games"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (is_player_in_game(game_id, (SELECT auth.uid())));

-- ============================================================================
-- GAME_CARDS
-- ============================================================================

DROP POLICY IF EXISTS "Players can view own cards" ON game_cards;
CREATE POLICY "Players can view own cards"
  ON game_cards
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = player_id);

DROP POLICY IF EXISTS "System can manage cards" ON game_cards;
CREATE POLICY "System can manage cards"
  ON game_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (is_player_in_game(game_id, (SELECT auth.uid())));

-- ============================================================================
-- GAME_MOVES
-- ============================================================================

DROP POLICY IF EXISTS "Players can view moves in their games" ON game_moves;
CREATE POLICY "Players can view moves in their games"
  ON game_moves
  FOR SELECT
  TO authenticated
  USING (is_player_in_game(game_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Players can create moves in their games" ON game_moves;
CREATE POLICY "Players can create moves in their games"
  ON game_moves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = player_id 
    AND is_player_in_game(game_id, (SELECT auth.uid()))
  );

-- ============================================================================
-- CLAIMED_SETS
-- ============================================================================

DROP POLICY IF EXISTS "Players can view claimed sets in their games" ON claimed_sets;
CREATE POLICY "Players can view claimed sets in their games"
  ON claimed_sets
  FOR SELECT
  TO authenticated
  USING (is_player_in_game(game_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Players can claim sets in their games" ON claimed_sets;
CREATE POLICY "Players can claim sets in their games"
  ON claimed_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = claimed_by_player_id 
    AND is_player_in_game(game_id, (SELECT auth.uid()))
  );