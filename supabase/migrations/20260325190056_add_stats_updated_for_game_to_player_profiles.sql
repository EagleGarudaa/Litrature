/*
  # Add idempotency guard to player_profiles stats update

  ## Problem
  The GameComplete screen calls updatePlayerStats() which increments games_played
  and games_won. Without a guard, page reloads or race conditions (multiple
  clients on the same account) could double-count a game.

  ## Fix
  Add a `stats_updated_for_game` column to player_profiles. Before updating stats
  the client checks if this column already equals the current game_id (meaning
  stats were already recorded). After updating, the column is set to the game_id.
  The UPDATE also includes `.eq('stats_updated_for_game', <old_value>)` as an
  optimistic-lock so concurrent calls from two tabs only one will win.

  ## Tables Modified
  - player_profiles: new nullable uuid column `stats_updated_for_game`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_profiles'
    AND column_name = 'stats_updated_for_game'
  ) THEN
    ALTER TABLE player_profiles
      ADD COLUMN stats_updated_for_game uuid DEFAULT NULL;
  END IF;
END $$;
