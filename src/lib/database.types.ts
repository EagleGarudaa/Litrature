export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      player_profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          games_played: number
          games_won: number
          sets_claimed: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          games_played?: number
          games_won?: number
          sets_claimed?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          games_played?: number
          games_won?: number
          sets_claimed?: number
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          room_code: string
          status: 'waiting' | 'in_progress' | 'completed'
          team_size: 3 | 4
          current_turn_player_id: string | null
          winning_team: 'team_a' | 'team_b' | null
          team_a_score: number
          team_b_score: number
          team_a_points: number
          team_b_points: number
          created_by: string | null
          host_player_id: string | null
          is_private: boolean
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          room_code: string
          status?: 'waiting' | 'in_progress' | 'completed'
          team_size: 3 | 4
          current_turn_player_id?: string | null
          winning_team?: 'team_a' | 'team_b' | null
          team_a_score?: number
          team_b_score?: number
          team_a_points?: number
          team_b_points?: number
          created_by?: string | null
          host_player_id?: string | null
          is_private?: boolean
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          room_code?: string
          status?: 'waiting' | 'in_progress' | 'completed'
          team_size?: 3 | 4
          current_turn_player_id?: string | null
          winning_team?: 'team_a' | 'team_b' | null
          team_a_score?: number
          team_b_score?: number
          team_a_points?: number
          team_b_points?: number
          created_by?: string | null
          host_player_id?: string | null
          is_private?: boolean
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          team: 'team_a' | 'team_b'
          seat_position: number
          is_ready: boolean
          is_connected: boolean
          learner_mode_active: boolean
          is_ai: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          team: 'team_a' | 'team_b'
          seat_position: number
          is_ready?: boolean
          is_connected?: boolean
          learner_mode_active?: boolean
          is_ai?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          team?: 'team_a' | 'team_b'
          seat_position?: number
          is_ready?: boolean
          is_connected?: boolean
          learner_mode_active?: boolean
          is_ai?: boolean
          joined_at?: string
        }
      }
      game_cards: {
        Row: {
          id: string
          game_id: string
          player_id: string | null
          card_suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
          card_rank: '2' | '3' | '4' | '5' | '6' | '7' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
          card_type: 'minor' | 'major'
          is_in_claimed_set: boolean
          claimed_by_team: 'team_a' | 'team_b' | null
        }
        Insert: {
          id?: string
          game_id: string
          player_id?: string | null
          card_suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
          card_rank: '2' | '3' | '4' | '5' | '6' | '7' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
          card_type: 'minor' | 'major'
          is_in_claimed_set?: boolean
          claimed_by_team?: 'team_a' | 'team_b' | null
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string | null
          card_suit?: 'hearts' | 'diamonds' | 'clubs' | 'spades'
          card_rank?: '2' | '3' | '4' | '5' | '6' | '7' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
          card_type?: 'minor' | 'major'
          is_in_claimed_set?: boolean
          claimed_by_team?: 'team_a' | 'team_b' | null
        }
      }
      game_moves: {
        Row: {
          id: string
          game_id: string
          move_number: number
          player_id: string | null
          move_type: 'ask_card' | 'set_claim'
          target_player_id: string | null
          card_suit: string | null
          card_rank: string | null
          was_successful: boolean | null
          set_type: 'minor' | 'major' | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          move_number: number
          player_id?: string | null
          move_type: 'ask_card' | 'set_claim'
          target_player_id?: string | null
          card_suit?: string | null
          card_rank?: string | null
          was_successful?: boolean | null
          set_type?: 'minor' | 'major' | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          move_number?: number
          player_id?: string | null
          move_type?: 'ask_card' | 'set_claim'
          target_player_id?: string | null
          card_suit?: string | null
          card_rank?: string | null
          was_successful?: boolean | null
          set_type?: 'minor' | 'major' | null
          created_at?: string
        }
      }
      claimed_sets: {
        Row: {
          id: string
          game_id: string
          team: 'team_a' | 'team_b'
          set_suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
          set_type: 'minor' | 'major'
          claimed_by_player_id: string | null
          claimed_at: string
        }
        Insert: {
          id?: string
          game_id: string
          team: 'team_a' | 'team_b'
          set_suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
          set_type: 'minor' | 'major'
          claimed_by_player_id?: string | null
          claimed_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          team?: 'team_a' | 'team_b'
          set_suit?: 'hearts' | 'diamonds' | 'clubs' | 'spades'
          set_type?: 'minor' | 'major'
          claimed_by_player_id?: string | null
          claimed_at?: string
        }
      }
    }
  }
}

export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type CardType = 'minor' | 'major';
export type Team = 'team_a' | 'team_b';
export type GameStatus = 'waiting' | 'in_progress' | 'completed';
