/*
  # Add SELECT visibility for in-progress game participants

  ## Summary
  The previous migration only allows seeing all players in WAITING games.
  For IN_PROGRESS games, players need to see their teammates and opponents.
  
  We extend the SELECT policy by adding a condition: if you have a game_players
  row where player_id = auth.uid() and the game is in_progress, you should see
  all rows for that game.

  This is done non-recursively by checking game_cards table (which stores player
  assignments) or by using a session variable approach.

  Simplest safe approach: allow seeing all players in ANY game where the game's
  created_by or host matches you, OR where the game is waiting (already covered).
  For in_progress games, we rely on the fact that game_cards has player_id stored
  and we can check participation through that table (no recursion).

  Actually the cleanest fix: store a denormalized "participant_ids" array on the
  games table, or simply make the policy: allow SELECT if game status is 'waiting'
  OR if player_id = auth.uid() (own row). For in-progress games, the game table
  itself can tell us who is playing via current_turn_player_id, but that's just one player.

  Best non-recursive solution for in-progress: use game_cards to detect participation.
  If auth.uid() has any game_cards rows for this game_id, they are a participant.
  game_cards has its own RLS that allows players to see their own cards, so checking
  it from here would also be recursive.

  ## Final Decision
  The safest and most correct approach without any recursion:
  Extend the existing policy to ALSO allow viewing all players in games where
  the game status is 'in_progress' - game participation is not sensitive info,
  knowing who is playing in an active game is expected behavior.

  Drop and recreate the policy with all three status conditions covered.
*/

DROP POLICY IF EXISTS "game_players_select_non_recursive" ON game_players;

CREATE POLICY "game_players_select_non_recursive"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (
    -- Always see your own record in any game
    (SELECT auth.uid()) = player_id
    OR
    -- See all players in waiting OR in_progress games
    -- (checking games table only - no recursion)
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_players.game_id
      AND games.status IN ('waiting', 'in_progress')
    )
  );
