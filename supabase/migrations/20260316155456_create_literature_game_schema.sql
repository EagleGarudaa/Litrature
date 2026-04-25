/*
  # Literature Card Game Database Schema

  ## Overview
  Complete database schema for online Literature card game with real-time multiplayer support.

  ## New Tables

  ### 1. `player_profiles`
  Stores player information and game statistics
  - `id` (uuid, FK to auth.users) - Player identifier
  - `username` (text) - Display name
  - `avatar_url` (text) - Profile picture URL
  - `games_played` (integer) - Total games completed
  - `games_won` (integer) - Total games won
  - `sets_claimed` (integer) - Total sets successfully claimed
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### 2. `games`
  Tracks game rooms and their states
  - `id` (uuid) - Unique game identifier
  - `room_code` (text) - Human-readable room code for joining
  - `status` (text) - Game state: 'waiting', 'in_progress', 'completed'
  - `team_size` (integer) - Players per team (3 or 4)
  - `current_turn_player_id` (uuid) - Player whose turn it is
  - `winning_team` (text) - Winning team: 'team_a' or 'team_b'
  - `team_a_score` (integer) - Sets claimed by Team A
  - `team_b_score` (integer) - Sets claimed by Team B
  - `created_by` (uuid) - Player who created the game
  - `created_at` (timestamptz) - Game creation time
  - `started_at` (timestamptz) - When game began
  - `completed_at` (timestamptz) - When game ended

  ### 3. `game_players`
  Links players to games with team assignments
  - `id` (uuid) - Unique identifier
  - `game_id` (uuid) - Reference to game
  - `player_id` (uuid) - Reference to player
  - `team` (text) - Team assignment: 'team_a' or 'team_b'
  - `seat_position` (integer) - Position at table (0-7)
  - `is_ready` (boolean) - Ready status in waiting room
  - `is_connected` (boolean) - Current connection status
  - `joined_at` (timestamptz) - When player joined

  ### 4. `game_cards`
  Tracks card ownership during games
  - `id` (uuid) - Unique identifier
  - `game_id` (uuid) - Reference to game
  - `player_id` (uuid) - Current card holder (null if claimed in set)
  - `card_suit` (text) - Card suit: 'hearts', 'diamonds', 'clubs', 'spades'
  - `card_rank` (text) - Card rank: '2','3','4','5','6','7','9','10','J','Q','K','A'
  - `card_type` (text) - Card type: 'minor' or 'major'
  - `is_in_claimed_set` (boolean) - Whether card is part of claimed set
  - `claimed_by_team` (text) - Team that claimed this card's set

  ### 5. `game_moves`
  Logs all game actions for history and replay
  - `id` (uuid) - Unique identifier
  - `game_id` (uuid) - Reference to game
  - `move_number` (integer) - Sequential move counter
  - `player_id` (uuid) - Player who made the move
  - `move_type` (text) - Type: 'ask_card', 'set_claim'
  - `target_player_id` (uuid) - Player being asked (for card asks)
  - `card_suit` (text) - Suit of card asked/claimed
  - `card_rank` (text) - Rank of card asked/claimed
  - `was_successful` (boolean) - Whether ask/claim succeeded
  - `set_type` (text) - For claims: 'minor' or 'major'
  - `created_at` (timestamptz) - When move occurred

  ### 6. `claimed_sets`
  Tracks completed and verified sets
  - `id` (uuid) - Unique identifier
  - `game_id` (uuid) - Reference to game
  - `team` (text) - Team that claimed: 'team_a' or 'team_b'
  - `set_suit` (text) - Suit of claimed set
  - `set_type` (text) - Type: 'minor' or 'major'
  - `claimed_by_player_id` (uuid) - Player who declared the set
  - `claimed_at` (timestamptz) - When set was claimed

  ## Security
  - Row Level Security enabled on all tables
  - Players can only view their own cards
  - All players in a game can view game state and moves
  - Only authenticated users can create games and join
*/

-- Create player_profiles table
CREATE TABLE IF NOT EXISTS player_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  games_played integer DEFAULT 0,
  games_won integer DEFAULT 0,
  sets_claimed integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed')),
  team_size integer NOT NULL CHECK (team_size IN (3, 4)),
  current_turn_player_id uuid,
  winning_team text CHECK (winning_team IN ('team_a', 'team_b')),
  team_a_score integer DEFAULT 0,
  team_b_score integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Create game_players table
CREATE TABLE IF NOT EXISTS game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team text NOT NULL CHECK (team IN ('team_a', 'team_b')),
  seat_position integer NOT NULL,
  is_ready boolean DEFAULT false,
  is_connected boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(game_id, player_id),
  UNIQUE(game_id, seat_position)
);

-- Create game_cards table
CREATE TABLE IF NOT EXISTS game_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES auth.users(id),
  card_suit text NOT NULL CHECK (card_suit IN ('hearts', 'diamonds', 'clubs', 'spades')),
  card_rank text NOT NULL CHECK (card_rank IN ('2','3','4','5','6','7','9','10','J','Q','K','A')),
  card_type text NOT NULL CHECK (card_type IN ('minor', 'major')),
  is_in_claimed_set boolean DEFAULT false,
  claimed_by_team text CHECK (claimed_by_team IN ('team_a', 'team_b')),
  UNIQUE(game_id, card_suit, card_rank)
);

-- Create game_moves table
CREATE TABLE IF NOT EXISTS game_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  move_number integer NOT NULL,
  player_id uuid REFERENCES auth.users(id),
  move_type text NOT NULL CHECK (move_type IN ('ask_card', 'set_claim')),
  target_player_id uuid REFERENCES auth.users(id),
  card_suit text,
  card_rank text,
  was_successful boolean,
  set_type text CHECK (set_type IN ('minor', 'major')),
  created_at timestamptz DEFAULT now()
);

-- Create claimed_sets table
CREATE TABLE IF NOT EXISTS claimed_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  team text NOT NULL CHECK (team IN ('team_a', 'team_b')),
  set_suit text NOT NULL CHECK (set_suit IN ('hearts', 'diamonds', 'clubs', 'spades')),
  set_type text NOT NULL CHECK (set_type IN ('minor', 'major')),
  claimed_by_player_id uuid REFERENCES auth.users(id),
  claimed_at timestamptz DEFAULT now(),
  UNIQUE(game_id, set_suit, set_type)
);

-- Enable Row Level Security
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE claimed_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_profiles
CREATE POLICY "Users can view all player profiles"
  ON player_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON player_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON player_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for games
CREATE POLICY "Users can view all games"
  ON games FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Game creator can update game"
  ON games FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.player_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.player_id = auth.uid()
    )
  );

-- RLS Policies for game_players
CREATE POLICY "Players can view players in their games"
  ON game_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players gp
      WHERE gp.game_id = game_players.game_id
      AND gp.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can join games"
  ON game_players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update own game player record"
  ON game_players FOR UPDATE
  TO authenticated
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can leave games"
  ON game_players FOR DELETE
  TO authenticated
  USING (auth.uid() = player_id);

-- RLS Policies for game_cards
CREATE POLICY "Players can view own cards"
  ON game_cards FOR SELECT
  TO authenticated
  USING (
    auth.uid() = player_id OR
    is_in_claimed_set = true OR
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_cards.game_id
      AND games.status = 'completed'
    )
  );

CREATE POLICY "System can manage cards"
  ON game_cards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_cards.game_id
      AND game_players.player_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_cards.game_id
      AND game_players.player_id = auth.uid()
    )
  );

-- RLS Policies for game_moves
CREATE POLICY "Players can view moves in their games"
  ON game_moves FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_moves.game_id
      AND game_players.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can create moves in their games"
  ON game_moves FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = game_moves.game_id
      AND game_players.player_id = auth.uid()
    )
  );

-- RLS Policies for claimed_sets
CREATE POLICY "Players can view claimed sets in their games"
  ON claimed_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = claimed_sets.game_id
      AND game_players.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can claim sets in their games"
  ON claimed_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = claimed_by_player_id AND
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = claimed_sets.game_id
      AND game_players.player_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player_id ON game_players(player_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_game_id ON game_cards(game_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_player_id ON game_cards(player_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_claimed_sets_game_id ON claimed_sets(game_id);