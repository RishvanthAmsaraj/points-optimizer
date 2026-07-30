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
          alerts_enabled: boolean;
          onboarded_at: string | null;
          display_name: string | null;
          home_airport: string | null;
          preferred_cabin: string;
          created_at: string;
          subscription_tier: string;
          subscription_expires_at: string | null;
        };
        Insert: {
          id: string;
          alerts_enabled?: boolean;
          onboarded_at?: string | null;
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
          last_activity_at: string | null;
          id: string;
          user_id: string;
          program_id: string;
          balance: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          last_activity_at?: string | null;
          user_id: string;
          program_id: string;
          balance?: number;
          last_updated?: string;
        };
        Update: {
          id?: string;
          last_activity_at?: string | null;
          user_id?: string;
          program_id?: string;
          balance?: number;
          last_updated?: string;
        };
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          destination: string | null;
          start_date: string | null;
          end_date: string | null;
          plan: Json;
          total_points: number;
          total_cash_usd: number;
          value_captured_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          destination?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          plan?: Json;
          total_points?: number;
          total_cash_usd?: number;
          value_captured_usd?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          destination?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          plan?: Json;
          total_points?: number;
          total_cash_usd?: number;
          value_captured_usd?: number;
          created_at?: string;
        };
      };
      experience_cache: {
        Row: {
          id: string;
          city_code: string;
          category: string;
          results: Json;
          provider: string | null;
          cached_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          city_code: string;
          category?: string;
          results?: Json;
          provider?: string | null;
          cached_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          city_code?: string;
          category?: string;
          results?: Json;
          provider?: string | null;
          cached_at?: string;
          expires_at?: string;
        };
      };
      hotel_cache: {
        Row: {
          id: string;
          city_code: string;
          check_in: string;
          check_out: string;
          rooms: number;
          guests: number;
          results: Json;
          cash_price_usd: number | null;
          provider: string | null;
          cached_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          city_code: string;
          check_in: string;
          check_out: string;
          rooms?: number;
          guests?: number;
          results?: Json;
          cash_price_usd?: number | null;
          provider?: string | null;
          cached_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          city_code?: string;
          check_in?: string;
          check_out?: string;
          rooms?: number;
          guests?: number;
          results?: Json;
          cash_price_usd?: number | null;
          provider?: string | null;
          cached_at?: string;
          expires_at?: string;
        };
      };
      experiences: {
        Row: {
          id: string;
          name: string;
          category: string;
          city: string | null;
          city_code: string | null;
          country: string | null;
          program_name: string;
          channel: string;
          points_required: number | null;
          cash_price_usd: number | null;
          fixed_cpp: number | null;
          booking_url: string | null;
          notes: string | null;
          is_active: boolean;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          city?: string | null;
          city_code?: string | null;
          country?: string | null;
          program_name: string;
          channel: string;
          points_required?: number | null;
          cash_price_usd?: number | null;
          fixed_cpp?: number | null;
          booking_url?: string | null;
          notes?: string | null;
          is_active?: boolean;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          city?: string | null;
          city_code?: string | null;
          country?: string | null;
          program_name?: string;
          channel?: string;
          points_required?: number | null;
          cash_price_usd?: number | null;
          fixed_cpp?: number | null;
          booking_url?: string | null;
          notes?: string | null;
          is_active?: boolean;
          verified_at?: string | null;
          created_at?: string;
        };
      };
      watches: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          origin: string | null;
          destination: string | null;
          city_code: string | null;
          program_id: string | null;
          cabin: string | null;
          target_cpp: number | null;
          max_points: number | null;
          earliest_date: string | null;
          latest_date: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind?: string;
          origin?: string | null;
          destination?: string | null;
          city_code?: string | null;
          program_id?: string | null;
          cabin?: string | null;
          target_cpp?: number | null;
          max_points?: number | null;
          earliest_date?: string | null;
          latest_date?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: string;
          origin?: string | null;
          destination?: string | null;
          city_code?: string | null;
          program_id?: string | null;
          cabin?: string | null;
          target_cpp?: number | null;
          max_points?: number | null;
          earliest_date?: string | null;
          latest_date?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      alert_log: {
        Row: {
          id: string;
          user_id: string;
          alert_type: string;
          dedupe_key: string;
          payload: Json;
          delivered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          alert_type: string;
          dedupe_key: string;
          payload?: Json;
          delivered_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          alert_type?: string;
          dedupe_key?: string;
          payload?: Json;
          delivered_at?: string;
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
          promo_name: string | null;
          promo_starts_at: string | null;
          promo_ends_at: string | null;
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
          promo_name?: string | null;
          promo_starts_at?: string | null;
          promo_ends_at?: string | null;
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
          promo_name?: string | null;
          promo_starts_at?: string | null;
          promo_ends_at?: string | null;
        };
      };
      playbooks: {
        Row: {
          id: string;
          type: string;
          user_id: string;
          query: string;
          steps: Json;
          best_option: Json;
          alternatives: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          type?: string;
          user_id: string;
          query: string;
          steps?: Json;
          best_option?: Json;
          alternatives?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
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
