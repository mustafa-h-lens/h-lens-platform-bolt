import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// ─────────────────────────────────────────────────────────────
// Portal access token (vendor / client portals)
// ─────────────────────────────────────────────────────────────
// The vendor and client portals do not use Supabase Auth (gotrue). Instead,
// `verify-otp` mints a Supabase-compatible JWT (role=authenticated, with a
// vendor_id/client_id claim) that RLS uses to scope every read/write. When a
// portal session is active we inject that token as the Authorization bearer on
// every request below, replacing the anon bearer. The `apikey` header stays the
// anon key (PostgREST/Kong need it for routing). The admin app never sets a
// portal token, so it keeps using its real gotrue session unchanged.
let portalAccessToken: string | null = null;

export function setPortalAccessToken(token: string | null): void {
  portalAccessToken = token;
}

const portalFetch: typeof fetch = (input, init = {}) => {
  if (portalAccessToken) {
    const headers = new Headers(init.headers ?? {});
    headers.set('Authorization', `Bearer ${portalAccessToken}`);
    init = { ...init, headers };
  }
  return fetch(input, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: portalFetch },
});

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'super_admin' | 'project_manager' | 'client';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'super_admin' | 'project_manager' | 'client';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'super_admin' | 'project_manager' | 'client';
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
