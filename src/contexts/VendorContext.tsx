import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

interface VendorProfile {
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
}

interface VendorSession {
  token: string;
  expiresAt: string;
}

interface VendorContextType {
  vendor: VendorProfile | null;
  session: VendorSession | null;
  loading: boolean;
  signOut: () => void;
  refreshVendor: () => Promise<void>;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const useVendor = () => {
  const context = useContext(VendorContext);
  if (!context) throw new Error('useVendor must be used within VendorProvider');
  return context;
};

interface VendorProviderProps {
  children: ReactNode;
  initialVendor: VendorProfile;
  initialSession: VendorSession;
}

export const VendorProvider = ({ children, initialVendor, initialSession }: VendorProviderProps) => {
  const [vendor, setVendor] = useState<VendorProfile | null>(initialVendor);
  const [session] = useState<VendorSession | null>(initialSession);
  const [loading, setLoading] = useState(false);

  const refreshVendor = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, full_name, phone, email, status, primary_city, profile_image, nationality, id_number')
        .eq('id', vendor.id)
        .single();
      if (!error && data) setVendor(data);
    } catch (err) {
      console.error('Error refreshing vendor:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('vendor_session');
    localStorage.removeItem('vendor_data');
    window.history.pushState({}, '', '/vendor-login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <VendorContext.Provider value={{ vendor, session, loading, signOut, refreshVendor }}>
      {children}
    </VendorContext.Provider>
  );
};