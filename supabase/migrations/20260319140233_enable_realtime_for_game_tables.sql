/*
  # Enable Realtime for Game Tables

  1. Changes
    - Add `games`, `game_players`, `game_cards`, `game_moves`, `claimed_sets` tables
      to the `supabase_realtime` publication
    - This allows all realtime subscriptions in the app to receive change events

  2. Why
    - Without these tables in the publication, no postgres_changes events fire
    - The WaitingRoom, GameTable, Lobby, and other components rely on realtime
      to update player lists, game state, and team changes
*/

ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE claimed_sets;
