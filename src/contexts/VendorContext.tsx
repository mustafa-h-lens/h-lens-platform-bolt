import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { runWithNavReveal } from '../lib/navTransition';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface VendorProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  status: string;
  vendor_type?: string;
  primary_city?: string;
  profile_image?: string;
  nationality?: string;
  id_number?: string;
  id_expiry_date?: string;
  available_other_cities?: boolean;
  other_cities?: string[];
  portfolio_url?: string;
  primary_field?: string;
  created_at?: string;
}

export type VendorPage =
  | 'dashboard'
  | 'profile'
  | 'projects'
  | 'invoices'
  | 'equipment'
  | 'notifications'
  | 'suggestions'
  | 'edit-submission';

interface VendorContextType {
  vendor: VendorProfile | null;
  loading: boolean;
  currentPage: VendorPage;
  navigateTo: (page: VendorPage) => void;
  signOut: () => void;
  refreshVendor: () => Promise<void>;
  setVendor: (v: VendorProfile) => void;
}

const VENDOR_COLS =
  'id, full_name, phone, email, status, vendor_type, primary_city, profile_image, nationality, id_number, id_expiry_date, available_other_cities, other_cities, portfolio_url, primary_field, created_at, id_image, country_code, vehicle_registration_image';

// ─────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────
const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const useVendor = () => {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error('useVendor must be used within VendorProvider');
  return ctx;
};

// ─────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────
// Native auth: the vendor is identified by the Supabase session's
// app_metadata.vendor_id (passed in as `vendorId`). We load the vendor row
// under that authenticated session and don't render the portal until it's ready
// (consumers assume `vendor` is non-null).
export const VendorProvider = ({ children, vendorId }: { children: ReactNode; vendorId: string }) => {
  const [vendor, setVendorState]      = useState<VendorProfile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [currentPage, setCurrentPage] = useState<VendorPage>('dashboard');

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.from('vendors').select(VENDOR_COLS).eq('id', vendorId).single();
        if (active && !error && data) setVendorState(data as VendorProfile);
      } catch (err) {
        console.error('Error loading vendor:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [vendorId]);

  // Sync page with URL hash
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '') as VendorPage;
      const valid: VendorPage[] = ['dashboard','profile','projects','invoices','equipment','notifications','suggestions'];
      setCurrentPage(valid.includes(hash) ? hash : 'dashboard');
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const navigateTo = (page: VendorPage) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  const refreshVendor = async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('vendors').select(VENDOR_COLS).eq('id', vendorId).single();
      if (!error && data) setVendorState(data as VendorProfile);
    } catch (err) {
      console.error('Error refreshing vendor:', err);
    } finally {
      setLoading(false);
    }
  };

  const setVendor = (v: VendorProfile) => setVendorState(v);

  const signOut = () => {
    void runWithNavReveal(async () => {
      await supabase.auth.signOut();
      window.history.pushState({}, '', '/vendor/login');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __programmatic: true } }));
    }, { targetPath: '/vendor/login', forceDark: true });
  };

  // Hold the portal until the vendor row is loaded.
  if (loading || !vendor) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: 'var(--bg-page, #050d1e)' }}>
        <div className="page-loading-placeholder" />
        <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: 14 }}>جارٍ التحميل...</span>
      </div>
    );
  }

  return (
    <VendorContext.Provider value={{ vendor, loading, currentPage, navigateTo, signOut, refreshVendor, setVendor }}>
      {children}
    </VendorContext.Provider>
  );
};
