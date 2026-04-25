/*
  # Remove Auto Host Departure Cleanup

  1. Changes
    - Drop the automatic trigger that deletes games when host navigates away
    - Keep manual cleanup function for old stale games
    - Allow players (including host) to temporarily leave without dissolving the room

  2. Purpose
    - Fix issue where room gets dissolved when host visits main menu
    - Rooms should only be dissolved via explicit actions:
      * Host clicks "Dissolve Game"
      * Host clicks "Leave Room"
      * Player clicks "Leave Room" (removes them only)
    - Temporary navigation away, accidental exits, power loss, app switch should NOT dissolve room
*/

-- Drop the automatic host departure trigger
DROP TRIGGER IF EXISTS handle_host_departure_trigger ON game_players;

-- Drop the handle_host_departure function
DROP FUNCTION IF EXISTS handle_host_departure();

-- Keep the cleanup_stale_games function for manual cleanup of old games
-- (This can be called periodically or manually to clean up truly abandoned games)
