/*
  # Add missing foreign key indexes for performance

  1. Changes
    - Add index on claimed_sets.claimed_by_player_id
    - Add index on game_moves.player_id
    - Add index on game_moves.target_player_id
    - Add index on games.created_by
  
  2. Performance
    - These indexes improve query performance for foreign key lookups
    - Prevents full table scans when joining on these columns
*/

-- Add index for claimed_sets foreign key
CREATE INDEX IF NOT EXISTS idx_claimed_sets_claimed_by_player_id 
  ON claimed_sets(claimed_by_player_id);

-- Add indexes for game_moves foreign keys
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id 
  ON game_moves(player_id);

CREATE INDEX IF NOT EXISTS idx_game_moves_target_player_id 
  ON game_moves(target_player_id);

-- Add index for games foreign key
CREATE INDEX IF NOT EXISTS idx_games_created_by 
  ON games(created_by);