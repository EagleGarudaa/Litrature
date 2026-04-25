/*
  # Fix Security and Performance Issues

  ## 1. Add Missing Indexes for Foreign Keys
    - Add index on `games.host_player_id`
    - Add index on `intra_team_collection_state.caller_player_id`
    - Add index on `intra_team_collection_state.failed_opponent_id`

  ## 2. Optimize RLS Policies
    - Replace `auth.uid()` with `(select auth.uid())` in all policies
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  ## 3. Fix Multiple Permissive Policies
    - Remove duplicate policy on `help_content` table
    - Keep only the SELECT policy for authenticated users

  ## 4. Performance Improvements
    - Optimized policies run auth function once per query instead of per row
    - Foreign key indexes improve join performance
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_games_host_player_id ON games(host_player_id);
CREATE INDEX IF NOT EXISTS idx_intra_team_collection_caller_player_id ON intra_team_collection_state(caller_player_id);
CREATE INDEX IF NOT EXISTS idx_intra_team_collection_failed_opponent_id ON intra_team_collection_state(failed_opponent_id);

-- Drop and recreate optimized RLS policies for ai_players
DROP POLICY IF EXISTS "Players can view AI players in their games" ON ai_players;
DROP POLICY IF EXISTS "Game hosts can insert AI players" ON ai_players;
DROP POLICY IF EXISTS "Game hosts can delete AI players" ON ai_players;

CREATE POLICY "Players can view AI players in their games"
  ON ai_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = ai_players.game_id
      AND game_players.player_id = (select auth.uid())
    )
  );

CREATE POLICY "Game hosts can insert AI players"
  ON ai_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_id
      AND games.host_player_id = (select auth.uid())
    )
  );

CREATE POLICY "Game hosts can delete AI players"
  ON ai_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_id
      AND games.host_player_id = (select auth.uid())
    )
  );

-- Drop and recreate optimized RLS policies for ai_coach_sessions
DROP POLICY IF EXISTS "Players can view their own coaching sessions" ON ai_coach_sessions;
DROP POLICY IF EXISTS "Players can create their own coaching sessions" ON ai_coach_sessions;
DROP POLICY IF EXISTS "Players can update their own coaching sessions" ON ai_coach_sessions;

CREATE POLICY "Players can view their own coaching sessions"
  ON ai_coach_sessions FOR SELECT
  TO authenticated
  USING (player_id = (select auth.uid()));

CREATE POLICY "Players can create their own coaching sessions"
  ON ai_coach_sessions FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (select auth.uid()));

CREATE POLICY "Players can update their own coaching sessions"
  ON ai_coach_sessions FOR UPDATE
  TO authenticated
  USING (player_id = (select auth.uid()))
  WITH CHECK (player_id = (select auth.uid()));

-- Drop and recreate optimized RLS policies for ai_coach_messages
DROP POLICY IF EXISTS "Players can view their own coaching messages" ON ai_coach_messages;
DROP POLICY IF EXISTS "System can insert coaching messages" ON ai_coach_messages;

CREATE POLICY "Players can view their own coaching messages"
  ON ai_coach_messages FOR SELECT
  TO authenticated
  USING (player_id = (select auth.uid()));

CREATE POLICY "System can insert coaching messages"
  ON ai_coach_messages FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (select auth.uid()));

-- Drop and recreate optimized RLS policies for player_learning_profile
DROP POLICY IF EXISTS "Players can view their own learning profile" ON player_learning_profile;
DROP POLICY IF EXISTS "Players can insert their own learning profile" ON player_learning_profile;
DROP POLICY IF EXISTS "Players can update their own learning profile" ON player_learning_profile;

CREATE POLICY "Players can view their own learning profile"
  ON player_learning_profile FOR SELECT
  TO authenticated
  USING (player_id = (select auth.uid()));

CREATE POLICY "Players can insert their own learning profile"
  ON player_learning_profile FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (select auth.uid()));

CREATE POLICY "Players can update their own learning profile"
  ON player_learning_profile FOR UPDATE
  TO authenticated
  USING (player_id = (select auth.uid()))
  WITH CHECK (player_id = (select auth.uid()));

-- Drop and recreate optimized RLS policies for player_session_state
DROP POLICY IF EXISTS "Players can view session state in their games" ON player_session_state;
DROP POLICY IF EXISTS "Players can insert their own session state" ON player_session_state;
DROP POLICY IF EXISTS "Players can update their own session state" ON player_session_state;

CREATE POLICY "Players can view session state in their games"
  ON player_session_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = player_session_state.game_id
      AND game_players.player_id = (select auth.uid())
    )
  );

CREATE POLICY "Players can insert their own session state"
  ON player_session_state FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (select auth.uid()));

CREATE POLICY "Players can update their own session state"
  ON player_session_state FOR UPDATE
  TO authenticated
  USING (player_id = (select auth.uid()))
  WITH CHECK (player_id = (select auth.uid()));

-- Drop and recreate optimized RLS policies for game_state_snapshots
DROP POLICY IF EXISTS "Players can view snapshots of their games" ON game_state_snapshots;
DROP POLICY IF EXISTS "System can insert game state snapshots" ON game_state_snapshots;

CREATE POLICY "Players can view snapshots of their games"
  ON game_state_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_state_snapshots.game_id
      AND game_players.player_id = (select auth.uid())
    )
  );

CREATE POLICY "System can insert game state snapshots"
  ON game_state_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_state_snapshots.game_id
      AND game_players.player_id = (select auth.uid())
    )
  );

-- Drop and recreate optimized RLS policies for voice_chat_state
DROP POLICY IF EXISTS "Players can view voice state in their games" ON voice_chat_state;
DROP POLICY IF EXISTS "Players can insert their own voice state" ON voice_chat_state;
DROP POLICY IF EXISTS "Players can update voice state in their games" ON voice_chat_state;

CREATE POLICY "Players can view voice state in their games"
  ON voice_chat_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = voice_chat_state.game_id
      AND game_players.player_id = (select auth.uid())
    )
  );

CREATE POLICY "Players can insert their own voice state"
  ON voice_chat_state FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (select auth.uid()));

CREATE POLICY "Players can update voice state in their games"
  ON voice_chat_state FOR UPDATE
  TO authenticated
  USING (
    player_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = voice_chat_state.game_id
      AND games.host_player_id = (select auth.uid())
    )
  )
  WITH CHECK (
    player_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = voice_chat_state.game_id
      AND games.host_player_id = (select auth.uid())
    )
  );

-- Drop and recreate optimized RLS policies for intra_team_collection_state
DROP POLICY IF EXISTS "Players can view intra-team collection in their games" ON intra_team_collection_state;
DROP POLICY IF EXISTS "Players can insert intra-team collection sessions" ON intra_team_collection_state;
DROP POLICY IF EXISTS "Players can update intra-team collection sessions" ON intra_team_collection_state;

CREATE POLICY "Players can view intra-team collection in their games"
  ON intra_team_collection_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = intra_team_collection_state.game_id
      AND game_players.player_id = (select auth.uid())
    )
  );

CREATE POLICY "Players can insert intra-team collection sessions"
  ON intra_team_collection_state FOR INSERT
  TO authenticated
  WITH CHECK (caller_player_id = (select auth.uid()));

CREATE POLICY "Players can update intra-team collection sessions"
  ON intra_team_collection_state FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = intra_team_collection_state.game_id
      AND game_players.player_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = intra_team_collection_state.game_id
      AND game_players.player_id = (select auth.uid())
    )
  );

-- Drop and recreate optimized RLS policies for game_analytics
DROP POLICY IF EXISTS "Players can view analytics from their games" ON game_analytics;
DROP POLICY IF EXISTS "System can insert game analytics" ON game_analytics;

CREATE POLICY "Players can view analytics from their games"
  ON game_analytics FOR SELECT
  TO authenticated
  USING (
    player_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_analytics.game_id
      AND game_players.player_id = (select auth.uid())
    )
  );

CREATE POLICY "System can insert game analytics"
  ON game_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_analytics.game_id
      AND game_players.player_id = (select auth.uid())
    )
  );

-- Fix multiple permissive policies on help_content
DROP POLICY IF EXISTS "Only admins can modify help content" ON help_content;

-- Keep only the view policy for help_content
-- The "Anyone can view help content" policy already exists and is correct