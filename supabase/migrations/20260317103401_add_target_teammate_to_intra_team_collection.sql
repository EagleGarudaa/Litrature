/*
  # Add Target Teammate Field to Intra-Team Collection

  ## Changes
  - Adds `target_teammate_id` field to track which specific teammate was called
  - This enables proper validation of the critical rule: calling a card from the wrong teammate (even on your own team) is a FAIL
  
  ## Rule Clarification
  When making an intra-team call:
  - You must specify WHICH teammate you're calling the card from
  - If that specific teammate doesn't have the card, it's a FAIL
  - Even if your OTHER teammate has the card, it's still a FAIL
  - The set and all your cards from that set go to the opponent team
  - You must call from the EXACT player who holds the card
*/

DO $$
BEGIN
  -- Add target_teammate_id field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'intra_team_collection_state' 
    AND column_name = 'target_teammate_id'
  ) THEN
    ALTER TABLE intra_team_collection_state 
    ADD COLUMN target_teammate_id uuid REFERENCES auth.users(id);
  END IF;
  
  -- Add actual_card_holder_id to track who actually had the called card (for failed calls)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'intra_team_collection_state' 
    AND column_name = 'actual_card_holder_id'
  ) THEN
    ALTER TABLE intra_team_collection_state 
    ADD COLUMN actual_card_holder_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add comment to document the critical rule
COMMENT ON COLUMN intra_team_collection_state.target_teammate_id IS 
'The specific teammate being called. If actual_card_holder_id differs from this, it is a FAIL even if both are on the same team.';

COMMENT ON COLUMN intra_team_collection_state.actual_card_holder_id IS 
'Who actually held the card when called. Used to determine if call was successful (must match target_teammate_id exactly).';
