/*
  # Add Draw Support to Games Table

  ## Changes
  - Updates the winning_team column constraint to allow 'draw' as a valid value
  - This enables games to end in a draw when both teams have equal points
  
  ## Game End Conditions
  - Game ends when all 8 sets have been claimed (no cards remain in players' possession)
  - Winner is determined by highest total points
  - If points are equal, the game is a draw
*/

-- Drop the existing constraint
ALTER TABLE games 
DROP CONSTRAINT IF EXISTS games_winning_team_check;

-- Add new constraint that includes 'draw'
ALTER TABLE games 
ADD CONSTRAINT games_winning_team_check 
CHECK (winning_team IN ('team_a', 'team_b', 'draw'));
