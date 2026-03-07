import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Allow running without Supabase for UI development
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'super_admin' | 'client';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'super_admin' | 'client';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'super_admin' | 'client';
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          address: string | null;
          user_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          description: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          start_date: string | null;
          end_date: string | null;
          total_cost: number;
          total_price: number;
          currency: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          project_id: string;
          client_id: string;
          invoice_number: string;
          issue_date: string;
          due_date: string;
          status: 'paid' | 'unpaid' | 'partial' | 'cancelled';
          total_amount: number;
          paid_amount: number;
          currency: string;
          notes: string | null;
          file_url: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}
