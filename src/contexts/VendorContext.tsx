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

export interface VendorSession {
  token: string;
  expiresAt: string;
}

export type VendorPage =
  | 'dashboard'
  | 'profile'
  | 'projects'
  | 'invoices'
  | 'equipment'
  | 'notifications'
  | 'suggestions';

interface VendorContextType {
  vendor: VendorProfile | null;
  session: VendorSession | null;
  loading: boolean;
  currentPage: VendorPage;
  navigateTo: (page: VendorPage) => void;
  signOut: () => void;
  refreshVendor: () => Promise<void>;
  setVendor: (v: VendorProfile) => void;
}

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
interface VendorProviderProps {
  children: ReactNode;
  initialVendor: VendorProfile;
  initialSession: VendorSession;
}

export const VendorProvider = ({ children, initialVendor, initialSession }: VendorProviderProps) => {
  const [vendor, setVendorState]   = useState<VendorProfile>(initialVendor);
  const [session]                  = useState<VendorSession>(initialSession);
  const [loading, setLoading]      = useState(false);
  const [currentPage, setCurrentPage] = useState<VendorPage>('dashboard');

  // Check session expiry
  useEffect(() => {
    const checkExpiry = () => {
      if (session?.expiresAt) {
        const expiresAt = new Date(session.expiresAt).getTime();
        if (Date.now() > expiresAt) {
          signOut();
        }
      }
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 60000); // check every minute
    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  // Sync page with URL hash
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '') as VendorPage;
      const valid: VendorPage[] = ['dashboard','profile','projects','invoices','equipment','notifications','suggestions'];
      if (valid.includes(hash)) setCurrentPage(hash);
      else setCurrentPage('dashboard');
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  // Fetch full vendor data from DB on mount (localStorage may have partial data)
  useEffect(() => {
    if (initialVendor?.id) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('vendors')
            .select('id, full_name, phone, email, status, vendor_type, primary_city, profile_image, nationality, id_number, id_expiry_date, available_other_cities, other_cities, portfolio_url, primary_field, created_at, id_image, country_code, vehicle_registration_image')
            .eq('id', initialVendor.id)
            .single();
          if (!error && data) setVendorState(data as VendorProfile);
        } catch (err) {
          console.error('Error fetching full vendor data:', err);
        }
      })();
    }
  }, [initialVendor?.id]);

  const navigateTo = (page: VendorPage) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  const refreshVendor = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, full_name, phone, email, status, vendor_type, primary_city, profile_image, nationality, id_number, id_expiry_date, available_other_cities, other_cities, portfolio_url, primary_field, created_at, id_image, country_code, vehicle_registration_image')
        .eq('id', vendor.id)
        .single();
      if (!error && data) setVendorState(data as VendorProfile);
    } catch (err) {
      console.error('Error refreshing vendor:', err);
    } finally {
      setLoading(false);
    }
  };

  const setVendor = (v: VendorProfile) => setVendorState(v);

  const signOut = async () => {
    await runWithNavReveal(async () => {
      localStorage.removeItem('vendor_session');
      localStorage.removeItem('vendor_data');
      await supabase.auth.signOut();
      window.history.pushState({}, '', '/vendor/login');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __programmatic: true } }));
    }, { targetPath: '/vendor/login', forceDark: true });
  };

  return (
    <VendorContext.Provider value={{
      vendor, session, loading, currentPage,
      navigateTo, signOut, refreshVendor, setVendor,
    }}>
      {children}
    </VendorContext.Provider>
  );
};
