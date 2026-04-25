/*
  # Fix Database Security and Performance Issues

  1. Add Missing Indexes on Foreign Keys
    - Add indexes for claimed_sets.claimed_by_player_id
    - Add indexes for game_moves.player_id and target_player_id
    - Add index for games.created_by

  2. Optimize RLS Policies with SELECT Wrapper
    - Update all RLS policies to use (SELECT auth.uid()) instead of auth.uid()
    - This prevents re-evaluation of auth functions for each row

  3. Clean Up Unused Indexes
    - Remove indexes that are not being used

  4. Fix Multiple Permissive Policies
    - Consolidate game_cards SELECT policies into a single policy
*/

-- =====================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_claimed_sets_claimed_by_player_id 
  ON claimed_sets(claimed_by_player_id);

CREATE INDEX IF NOT EXISTS idx_game_moves_player_id 
  ON game_moves(player_id);

CREATE INDEX IF NOT EXISTS idx_game_moves_target_player_id 
  ON game_moves(target_player_id);

CREATE INDEX IF NOT EXISTS idx_games_created_by 
  ON games(created_by);

-- =====================================================
-- 2. DROP UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_game_players_player_id;
DROP INDEX IF EXISTS idx_game_cards_game_id;
DROP INDEX IF EXISTS idx_game_cards_player_id;
DROP INDEX IF EXISTS idx_game_moves_game_id;
DROP INDEX IF EXISTS idx_claimed_sets_game_id;

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - PLAYER_PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON player_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON player_profiles;

CREATE POLICY "Users can insert own profile"
  ON player_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON player_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - GAMES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can create games" ON games;
DROP POLICY IF EXISTS "Game creator can update game" ON games;

CREATE POLICY "Authenticated users can create games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Game creator can update game"
  ON games
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - GAME_PLAYERS
-- =====================================================

DROP POLICY IF EXISTS "Players can join games" ON game_players;
DROP POLICY IF EXISTS "Players can update own game player record" ON game_players;
DROP POLICY IF EXISTS "Players can leave games" ON game_players;
DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;

CREATE POLICY "Players can join games"
  ON game_players
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = player_id);

CREATE POLICY "Players can update own game player record"
  ON game_players
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = player_id)
  WITH CHECK ((SELECT auth.uid()) = player_id);

CREATE POLICY "Players can leave games"
  ON game_players
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = player_id);

CREATE POLICY "Players can view players in their games"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (is_player_in_game(game_id, (SELECT auth.uid())));

-- =====================================================
-- 6. OPTIMIZE RLS POLICIES - GAME_CARDS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Players can view own cards" ON game_cards;
DROP POLICY IF EXISTS "System can manage cards" ON game_cards;

-- Create consolidated SELECT policy (fixes multiple permissive policies issue)
CREATE POLICY "Players can view cards in their games"
  ON game_cards
  FOR SELECT
  TO authenticated
  USING (
    player_id = (SELECT auth.uid()) 
    OR is_player_in_game(game_id, (SELECT auth.uid()))
  );

CREATE POLICY "Players can manage cards"
  ON game_cards
  FOR ALL
  TO authenticated
  USING (is_player_in_game(game_id, (SELECT auth.uid())))
  WITH CHECK (is_player_in_game(game_id, (SELECT auth.uid())));

-- =====================================================
-- 7. OPTIMIZE RLS POLICIES - GAME_MOVES
-- =====================================================

DROP POLICY IF EXISTS "Players can view moves in their games" ON game_moves;
DROP POLICY IF EXISTS "Players can create moves in their games" ON game_moves;

CREATE POLICY "Players can view moves in their games"
  ON game_moves
  FOR SELECT
  TO authenticated
  USING (is_player_in_game(game_id, (SELECT auth.uid())));

CREATE POLICY "Players can create moves in their games"
  ON game_moves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_player_in_game(game_id, (SELECT auth.uid())) 
    AND player_id = (SELECT auth.uid())
  );

-- =====================================================
-- 8. OPTIMIZE RLS POLICIES - CLAIMED_SETS
-- =====================================================

DROP POLICY IF EXISTS "Players can view claimed sets in their games" ON claimed_sets;
DROP POLICY IF EXISTS "Players can claim sets in their games" ON claimed_sets;

CREATE POLICY "Players can view claimed sets in their games"
  ON claimed_sets
  FOR SELECT
  TO authenticated
  USING (is_player_in_game(game_id, (SELECT auth.uid())));

CREATE POLICY "Players can claim sets in their games"
  ON claimed_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_player_in_game(game_id, (SELECT auth.uid())) 
    AND claimed_by_player_id = (SELECT auth.uid())
  );