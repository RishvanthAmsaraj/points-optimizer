export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          home_airport: string | null;
          preferred_cabin: string;
          created_at: string;
          subscription_tier: string;
          subscription_expires_at: string | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          home_airport?: string | null;
          preferred_cabin?: string;
          created_at?: string;
          subscription_tier?: string;
          subscription_expires_at?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          home_airport?: string | null;
          preferred_cabin?: string;
          created_at?: string;
          subscription_tier?: string;
          subscription_expires_at?: string | null;
        };
      };
      cards: {
        Row: {
          id: string;
          name: string;
          issuer: string;
          network: string | null;
          annual_fee: number | null;
          signup_bonus_points: number | null;
          signup_bonus_spend_required: number | null;
          category_multipliers: Json;
          transfer_partners: Json;
          affiliate_link: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          issuer: string;
          network?: string | null;
          annual_fee?: number | null;
          signup_bonus_points?: number | null;
          signup_bonus_spend_required?: number | null;
          category_multipliers?: Json;
          transfer_partners?: Json;
          affiliate_link?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          issuer?: string;
          network?: string | null;
          annual_fee?: number | null;
          signup_bonus_points?: number | null;
          signup_bonus_spend_required?: number | null;
          category_multipliers?: Json;
          transfer_partners?: Json;
          affiliate_link?: string | null;
          is_active?: boolean;
        };
      };
      user_cards: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          date_opened: string | null;
          annual_fee_posted: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          date_opened?: string | null;
          annual_fee_posted?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          date_opened?: string | null;
          annual_fee_posted?: string | null;
          is_active?: boolean;
        };
      };
      loyalty_programs: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          alliance: string | null;
          point_valuation_cents: number | null;
          transfer_partners: Json;
          expiration_policy: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string | null;
          alliance?: string | null;
          point_valuation_cents?: number | null;
          transfer_partners?: Json;
          expiration_policy?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          alliance?: string | null;
          point_valuation_cents?: number | null;
          transfer_partners?: Json;
          expiration_policy?: string | null;
        };
      };
      points_balances: {
        Row: {
          id: string;
          user_id: string;
          program_id: string;
          balance: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_id: string;
          balance?: number;
          last_updated?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          program_id?: string;
          balance?: number;
          last_updated?: string;
        };
      };
      award_cache: {
        Row: {
          id: string;
          origin: string;
          destination: string;
          departure_date: string;
          cabin: string;
          results: Json;
          provider: string | null;
          cached_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          origin: string;
          destination: string;
          departure_date: string;
          cabin?: string;
          results?: Json;
          provider?: string | null;
          cached_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          origin?: string;
          destination?: string;
          departure_date?: string;
          cabin?: string;
          results?: Json;
          provider?: string | null;
          cached_at?: string;
          expires_at?: string;
        };
      };
      transfer_rates: {
        Row: {
          id: string;
          from_program_id: string;
          to_program_id: string;
          ratio: number;
          is_reversible: boolean;
          typical_timing: string | null;
          minimum_transfer: number;
          bonus_multiplier: number;
          block_size: number;
          block_bonus: number;
          increment: number;
        };
        Insert: {
          id?: string;
          from_program_id: string;
          to_program_id: string;
          ratio?: number;
          is_reversible?: boolean;
          typical_timing?: string | null;
          minimum_transfer?: number;
          bonus_multiplier?: number;
          block_size?: number;
          block_bonus?: number;
          increment?: number;
        };
        Update: {
          id?: string;
          from_program_id?: string;
          to_program_id?: string;
          ratio?: number;
          is_reversible?: boolean;
          typical_timing?: string | null;
          minimum_transfer?: number;
          bonus_multiplier?: number;
          block_size?: number;
          block_bonus?: number;
          increment?: number;
        };
      };
      playbooks: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          steps: Json;
          best_option: Json;
          alternatives: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          query: string;
          steps?: Json;
          best_option?: Json;
          alternatives?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          query?: string;
          steps?: Json;
          best_option?: Json;
          alternatives?: Json;
          created_at?: string;
        };
      };
    };
  };
}
