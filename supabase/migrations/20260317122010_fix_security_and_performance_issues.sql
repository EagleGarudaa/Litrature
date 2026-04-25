/*
  # Fix Security and Performance Issues

  1. Changes
    - Add missing foreign key indexes for intra_team_collection_state table
    - Remove unused indexes to reduce overhead
    - Fix function search_path security issue

  2. Performance Improvements
    - Add indexes for actual_card_holder_id and target_teammate_id
    - Remove indexes that are never used by queries

  3. Security
    - Set immutable search_path for cleanup_empty_games function
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_intra_team_collection_actual_card_holder 
  ON intra_team_collection_state(actual_card_holder_id);

CREATE INDEX IF NOT EXISTS idx_intra_team_collection_target_teammate 
  ON intra_team_collection_state(target_teammate_id);

-- Remove unused indexes to reduce write overhead
DROP INDEX IF EXISTS idx_games_host_player_id;
DROP INDEX IF EXISTS idx_intra_team_collection_caller_player_id;
DROP INDEX IF EXISTS idx_intra_team_collection_failed_opponent_id;
DROP INDEX IF EXISTS idx_claimed_sets_claimed_by_player_id;
DROP INDEX IF EXISTS idx_game_moves_player_id;
DROP INDEX IF EXISTS idx_game_moves_target_player_id;
DROP INDEX IF EXISTS idx_games_created_by;
DROP INDEX IF EXISTS idx_game_cards_player_id_fk;
DROP INDEX IF EXISTS idx_game_moves_game_id_fk;
DROP INDEX IF EXISTS idx_game_players_player_id_fk;
DROP INDEX IF EXISTS idx_ai_players_game_id;
DROP INDEX IF EXISTS idx_ai_coach_sessions_game_id;
DROP INDEX IF EXISTS idx_ai_coach_sessions_player_id;
DROP INDEX IF EXISTS idx_ai_coach_messages_session_id;
DROP INDEX IF EXISTS idx_ai_coach_messages_game_id;
DROP INDEX IF EXISTS idx_ai_coach_messages_player_id;
DROP INDEX IF EXISTS idx_player_learning_profile_player_id;
DROP INDEX IF EXISTS idx_player_session_state_game_id;
DROP INDEX IF EXISTS idx_player_session_state_player_id;
DROP INDEX IF EXISTS idx_game_state_snapshots_game_id;
DROP INDEX IF EXISTS idx_voice_chat_state_game_id;
DROP INDEX IF EXISTS idx_voice_chat_state_player_id;
DROP INDEX IF EXISTS idx_intra_team_collection_state_game_id;
DROP INDEX IF EXISTS idx_game_analytics_game_id;
DROP INDEX IF EXISTS idx_game_analytics_player_id;

-- Fix search_path security issue in cleanup_empty_games function
CREATE OR REPLACE FUNCTION cleanup_empty_games()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Recreate trigger to use updated function
DROP TRIGGER IF EXISTS cleanup_empty_games_trigger ON game_players;

CREATE TRIGGER cleanup_empty_games_trigger
AFTER DELETE ON game_players
FOR EACH ROW
EXECUTE FUNCTION cleanup_empty_games();
