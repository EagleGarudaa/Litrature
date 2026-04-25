/*
  # Enhanced Literature Game Schema with AI, Coaching, Voice Chat, and Spectator Features

  ## 1. New Tables
    
    ### `ai_players`
    - `id` (uuid, primary key) - AI player unique identifier
    - `game_id` (uuid, foreign key) - Reference to game
    - `player_name` (text) - AI player display name
    - `difficulty_level` (text) - beginner, intermediate, expert
    - `team` (integer) - Team assignment (1 or 2)
    - `created_at` (timestamptz) - Creation timestamp
    
    ### `ai_coach_sessions`
    - `id` (uuid, primary key) - Session unique identifier
    - `game_id` (uuid, foreign key) - Reference to game
    - `player_id` (uuid, foreign key) - Player being coached
    - `activated_at` (timestamptz) - When coaching was activated
    - `deactivated_at` (timestamptz, nullable) - When coaching was deactivated
    - `coaching_intensity` (text) - beginner, intermediate, advanced
    - `total_suggestions` (integer) - Count of suggestions given
    - `suggestions_followed` (integer) - Count of suggestions player followed
    
    ### `ai_coach_messages`
    - `id` (uuid, primary key) - Message unique identifier
    - `session_id` (uuid, foreign key) - Reference to coaching session
    - `game_id` (uuid, foreign key) - Reference to game
    - `player_id` (uuid, foreign key) - Player receiving message
    - `message_type` (text) - suggestion, explanation, warning, praise, analysis
    - `priority` (text) - urgent, important, informational
    - `content` (text) - The coaching message
    - `game_state_snapshot` (jsonb) - Game state when message was sent
    - `created_at` (timestamptz) - Message timestamp
    
    ### `player_learning_profile`
    - `id` (uuid, primary key) - Profile unique identifier
    - `player_id` (uuid, foreign key) - Reference to player
    - `skill_level` (text) - novice, beginner, intermediate, advanced, expert
    - `games_with_coaching` (integer) - Total games played with coaching
    - `total_suggestions` (integer) - Total suggestions received
    - `suggestions_followed` (integer) - Total suggestions followed
    - `common_mistakes` (jsonb) - Array of common mistake patterns
    - `improvement_areas` (jsonb) - Areas needing improvement
    - `achievements` (jsonb) - Unlocked achievements
    - `last_updated` (timestamptz) - Last update timestamp
    
    ### `player_session_state`
    - `id` (uuid, primary key) - State unique identifier
    - `game_id` (uuid, foreign key) - Reference to game
    - `player_id` (uuid, foreign key) - Reference to player
    - `connection_status` (text) - connected, disconnected, spectating
    - `last_seen_at` (timestamptz) - Last heartbeat timestamp
    - `disconnected_at` (timestamptz, nullable) - When player disconnected
    - `is_spectator` (boolean) - Whether player is spectating
    - `original_player_id` (uuid, nullable) - If AI took over, original player ID
    - `updated_at` (timestamptz) - Last update timestamp
    
    ### `game_state_snapshots`
    - `id` (uuid, primary key) - Snapshot unique identifier
    - `game_id` (uuid, foreign key) - Reference to game
    - `snapshot_data` (jsonb) - Complete game state
    - `created_at` (timestamptz) - Snapshot timestamp
    - `reason` (text) - pause, disconnection, checkpoint
    
    ### `voice_chat_state`
    - `id` (uuid, primary key) - State unique identifier
    - `game_id` (uuid, foreign key) - Reference to game
    - `player_id` (uuid, foreign key) - Reference to player
    - `is_self_muted` (boolean) - Player muted their own mic
    - `is_force_muted` (boolean) - Host muted this player
    - `is_room_silenced` (boolean) - Player silenced all incoming audio
    - `is_speaking` (boolean) - Currently speaking indicator
    - `updated_at` (timestamptz) - Last update timestamp
    
    ### `intra_team_collection_state`
    - `id` (uuid, primary key) - Collection session unique identifier
    - `game_id` (uuid, foreign key) - Reference to game
    - `caller_player_id` (uuid, foreign key) - Player initiating collection
    - `target_set` (text) - Which set is being collected
    - `cards_called` (jsonb) - Array of cards already called
    - `cards_remaining` (jsonb) - Array of cards yet to be called
    - `status` (text) - active, completed, failed
    - `failed_on_card` (text, nullable) - Card that caused failure
    - `failed_opponent_id` (uuid, nullable) - Opponent who had the card
    - `started_at` (timestamptz) - When collection started
    - `completed_at` (timestamptz, nullable) - When collection ended
    
    ### `game_analytics`
    - `id` (uuid, primary key) - Analytics entry unique identifier
    - `game_id` (uuid, foreign key) - Reference to game
    - `player_id` (uuid, foreign key) - Player who made the move
    - `move_type` (text) - ask_card, transfer_card, declare_set, intra_team_call
    - `move_data` (jsonb) - Complete move details
    - `outcome` (text) - success, failure, optimal, suboptimal
    - `ai_evaluation` (jsonb) - AI analysis of the move
    - `created_at` (timestamptz) - Move timestamp
    
    ### `help_content`
    - `id` (uuid, primary key) - Content unique identifier
    - `section` (text) - rules, tutorial, strategy, faq, intra_team, voice_chat
    - `title` (text) - Section title
    - `content` (text) - HTML or markdown content
    - `order_index` (integer) - Display order
    - `created_at` (timestamptz) - Creation timestamp

  ## 2. Modified Tables
    
    ### `games` - Added columns
    - `host_player_id` (uuid, nullable) - Player who created the game
    - `paused_at` (timestamptz, nullable) - When game was paused
    - `pause_reason` (text, nullable) - Why game is paused
    - `pause_player_name` (text, nullable) - Name of disconnected player
    - `voice_chat_enabled` (boolean) - Whether voice chat is enabled
    
    ### `game_players` - Added columns
    - `is_ai` (boolean) - Whether this is an AI player
    - `ai_difficulty` (text, nullable) - AI difficulty level
    - `ai_backup_active` (boolean) - Whether AI took over for disconnected player
    - `left_at` (timestamptz, nullable) - When player left the game
    - `is_spectator` (boolean) - Whether player is spectating
    - `original_player_id` (uuid, nullable) - Original player if AI took over
    - `last_seen_at` (timestamptz, nullable) - Last heartbeat
    - `disconnected_at` (timestamptz, nullable) - When player disconnected
    - `learner_mode_active` (boolean) - Whether player has coaching enabled
    - `ai_coach_session_id` (uuid, nullable) - Active coaching session
    - `is_self_muted` (boolean) - Player muted their mic
    - `is_force_muted` (boolean) - Host muted this player
    - `is_room_silenced` (boolean) - Player silenced incoming audio

  ## 3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to access their own data
    - Add policies for game participants to access game-related data
    - Ensure AI coach data is only visible to the coached player
    - Allow all players to see learner_mode_active status for transparency

  ## 4. Indexes
    - Add indexes on foreign keys for performance
    - Add indexes on frequently queried columns
*/

-- Add new columns to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS host_player_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS paused_at timestamptz,
ADD COLUMN IF NOT EXISTS pause_reason text,
ADD COLUMN IF NOT EXISTS pause_player_name text,
ADD COLUMN IF NOT EXISTS voice_chat_enabled boolean DEFAULT true;

-- Add new columns to game_players table
ALTER TABLE game_players
ADD COLUMN IF NOT EXISTS is_ai boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_difficulty text,
ADD COLUMN IF NOT EXISTS ai_backup_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS left_at timestamptz,
ADD COLUMN IF NOT EXISTS is_spectator boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_player_id uuid,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS disconnected_at timestamptz,
ADD COLUMN IF NOT EXISTS learner_mode_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_coach_session_id uuid,
ADD COLUMN IF NOT EXISTS is_self_muted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_force_muted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_room_silenced boolean DEFAULT false;

-- Create ai_players table
CREATE TABLE IF NOT EXISTS ai_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL,
  difficulty_level text NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'expert')),
  team integer NOT NULL CHECK (team IN (1, 2)),
  created_at timestamptz DEFAULT now()
);

-- Create ai_coach_sessions table
CREATE TABLE IF NOT EXISTS ai_coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activated_at timestamptz DEFAULT now(),
  deactivated_at timestamptz,
  coaching_intensity text DEFAULT 'beginner' CHECK (coaching_intensity IN ('beginner', 'intermediate', 'advanced')),
  total_suggestions integer DEFAULT 0,
  suggestions_followed integer DEFAULT 0
);

-- Create ai_coach_messages table
CREATE TABLE IF NOT EXISTS ai_coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES ai_coach_sessions(id) ON DELETE CASCADE NOT NULL,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('suggestion', 'explanation', 'warning', 'praise', 'analysis')),
  priority text NOT NULL CHECK (priority IN ('urgent', 'important', 'informational')),
  content text NOT NULL,
  game_state_snapshot jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create player_learning_profile table
CREATE TABLE IF NOT EXISTS player_learning_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  skill_level text DEFAULT 'novice' CHECK (skill_level IN ('novice', 'beginner', 'intermediate', 'advanced', 'expert')),
  games_with_coaching integer DEFAULT 0,
  total_suggestions integer DEFAULT 0,
  suggestions_followed integer DEFAULT 0,
  common_mistakes jsonb DEFAULT '[]'::jsonb,
  improvement_areas jsonb DEFAULT '[]'::jsonb,
  achievements jsonb DEFAULT '[]'::jsonb,
  last_updated timestamptz DEFAULT now()
);

-- Create player_session_state table
CREATE TABLE IF NOT EXISTS player_session_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_status text NOT NULL CHECK (connection_status IN ('connected', 'disconnected', 'spectating')),
  last_seen_at timestamptz DEFAULT now(),
  disconnected_at timestamptz,
  is_spectator boolean DEFAULT false,
  original_player_id uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_id, player_id)
);

-- Create game_state_snapshots table
CREATE TABLE IF NOT EXISTS game_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  snapshot_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  reason text NOT NULL CHECK (reason IN ('pause', 'disconnection', 'checkpoint'))
);

-- Create voice_chat_state table
CREATE TABLE IF NOT EXISTS voice_chat_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_self_muted boolean DEFAULT false,
  is_force_muted boolean DEFAULT false,
  is_room_silenced boolean DEFAULT false,
  is_speaking boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_id, player_id)
);

-- Create intra_team_collection_state table
CREATE TABLE IF NOT EXISTS intra_team_collection_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  caller_player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_set text NOT NULL,
  cards_called jsonb DEFAULT '[]'::jsonb,
  cards_remaining jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (status IN ('active', 'completed', 'failed')),
  failed_on_card text,
  failed_opponent_id uuid REFERENCES auth.users(id),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create game_analytics table
CREATE TABLE IF NOT EXISTS game_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  move_type text NOT NULL CHECK (move_type IN ('ask_card', 'transfer_card', 'declare_set', 'intra_team_call')),
  move_data jsonb NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'failure', 'optimal', 'suboptimal')),
  ai_evaluation jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create help_content table
CREATE TABLE IF NOT EXISTS help_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL CHECK (section IN ('rules', 'tutorial', 'strategy', 'faq', 'intra_team', 'voice_chat')),
  title text NOT NULL,
  content text NOT NULL,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_players_game_id ON ai_players(game_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_sessions_game_id ON ai_coach_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_sessions_player_id ON ai_coach_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_messages_session_id ON ai_coach_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_messages_game_id ON ai_coach_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_messages_player_id ON ai_coach_messages(player_id);
CREATE INDEX IF NOT EXISTS idx_player_learning_profile_player_id ON player_learning_profile(player_id);
CREATE INDEX IF NOT EXISTS idx_player_session_state_game_id ON player_session_state(game_id);
CREATE INDEX IF NOT EXISTS idx_player_session_state_player_id ON player_session_state(player_id);
CREATE INDEX IF NOT EXISTS idx_game_state_snapshots_game_id ON game_state_snapshots(game_id);
CREATE INDEX IF NOT EXISTS idx_voice_chat_state_game_id ON voice_chat_state(game_id);
CREATE INDEX IF NOT EXISTS idx_voice_chat_state_player_id ON voice_chat_state(player_id);
CREATE INDEX IF NOT EXISTS idx_intra_team_collection_state_game_id ON intra_team_collection_state(game_id);
CREATE INDEX IF NOT EXISTS idx_game_analytics_game_id ON game_analytics(game_id);
CREATE INDEX IF NOT EXISTS idx_game_analytics_player_id ON game_analytics(player_id);

-- Enable RLS on all new tables
ALTER TABLE ai_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_session_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_chat_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE intra_team_collection_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_players
CREATE POLICY "Players can view AI players in their games"
  ON ai_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = ai_players.game_id
      AND game_players.player_id = auth.uid()
    )
  );

CREATE POLICY "Game hosts can insert AI players"
  ON ai_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_id
      AND games.host_player_id = auth.uid()
    )
  );

CREATE POLICY "Game hosts can delete AI players"
  ON ai_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_id
      AND games.host_player_id = auth.uid()
    )
  );

-- RLS Policies for ai_coach_sessions
CREATE POLICY "Players can view their own coaching sessions"
  ON ai_coach_sessions FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "Players can create their own coaching sessions"
  ON ai_coach_sessions FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Players can update their own coaching sessions"
  ON ai_coach_sessions FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- RLS Policies for ai_coach_messages
CREATE POLICY "Players can view their own coaching messages"
  ON ai_coach_messages FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "System can insert coaching messages"
  ON ai_coach_messages FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

-- RLS Policies for player_learning_profile
CREATE POLICY "Players can view their own learning profile"
  ON player_learning_profile FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "Players can insert their own learning profile"
  ON player_learning_profile FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Players can update their own learning profile"
  ON player_learning_profile FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- RLS Policies for player_session_state
CREATE POLICY "Players can view session state in their games"
  ON player_session_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = player_session_state.game_id
      AND game_players.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can insert their own session state"
  ON player_session_state FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Players can update their own session state"
  ON player_session_state FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- RLS Policies for game_state_snapshots
CREATE POLICY "Players can view snapshots of their games"
  ON game_state_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_state_snapshots.game_id
      AND game_players.player_id = auth.uid()
    )
  );

CREATE POLICY "System can insert game state snapshots"
  ON game_state_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_state_snapshots.game_id
      AND game_players.player_id = auth.uid()
    )
  );

-- RLS Policies for voice_chat_state
CREATE POLICY "Players can view voice state in their games"
  ON voice_chat_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = voice_chat_state.game_id
      AND game_players.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can insert their own voice state"
  ON voice_chat_state FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Players can update voice state in their games"
  ON voice_chat_state FOR UPDATE
  TO authenticated
  USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = voice_chat_state.game_id
      AND games.host_player_id = auth.uid()
    )
  )
  WITH CHECK (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = voice_chat_state.game_id
      AND games.host_player_id = auth.uid()
    )
  );

-- RLS Policies for intra_team_collection_state
CREATE POLICY "Players can view intra-team collection in their games"
  ON intra_team_collection_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = intra_team_collection_state.game_id
      AND game_players.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can insert intra-team collection sessions"
  ON intra_team_collection_state FOR INSERT
  TO authenticated
  WITH CHECK (caller_player_id = auth.uid());

CREATE POLICY "Players can update intra-team collection sessions"
  ON intra_team_collection_state FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = intra_team_collection_state.game_id
      AND game_players.player_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = intra_team_collection_state.game_id
      AND game_players.player_id = auth.uid()
    )
  );

-- RLS Policies for game_analytics
CREATE POLICY "Players can view analytics from their games"
  ON game_analytics FOR SELECT
  TO authenticated
  USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_analytics.game_id
      AND game_players.player_id = auth.uid()
    )
  );

CREATE POLICY "System can insert game analytics"
  ON game_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_analytics.game_id
      AND game_players.player_id = auth.uid()
    )
  );

-- RLS Policies for help_content
CREATE POLICY "Anyone can view help content"
  ON help_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify help content"
  ON help_content FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);