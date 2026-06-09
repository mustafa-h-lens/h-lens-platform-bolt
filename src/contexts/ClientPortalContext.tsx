import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface ClientProfile {
  id: string;
  email: string;
  name: string;
  client_image: string | null;
}

export type ClientPage = 'dashboard' | 'projects' | 'invoices';

interface ClientPortalContextType {
  client: ClientProfile | null;
  loading: boolean;
  currentPage: ClientPage;
  navigateTo: (page: ClientPage) => void;
  signOut: () => void;
  refreshClient: () => Promise<void>;
}

const CLIENT_COLS = 'id, name, email, client_image';

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined);

export const useClientPortal = () => {
  const ctx = useContext(ClientPortalContext);
  if (!ctx) throw new Error('useClientPortal must be used within ClientPortalProvider');
  return ctx;
};

// Native auth: the client is identified by the Supabase session's
// app_metadata.client_id (passed in as `clientId`). We load the client row under
// that authenticated session and hold the portal until it's ready.
export const ClientPortalProvider = ({ children, clientId }: { children: ReactNode; clientId: string }) => {
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<ClientPage>('dashboard');

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.from('clients').select(CLIENT_COLS).eq('id', clientId).single();
        if (active && !error && data) setClient(data as ClientProfile);
      } catch (err) {
        console.error('Error loading client:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [clientId]);

  // Sync page with URL hash
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '') as ClientPage;
      const valid: ClientPage[] = ['dashboard', 'projects', 'invoices'];
      setCurrentPage(valid.includes(hash) ? hash : 'dashboard');
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const navigateTo = (page: ClientPage) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  const refreshClient = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('clients').select(CLIENT_COLS).eq('id', clientId).single();
      if (!error && data) setClient(data as ClientProfile);
    } catch (err) {
      console.error('Error refreshing client:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    // Hard redirect (full reload) on logout: tears down the portal instantly so no
    // component keeps fetching profile/storage under the cleared session, and avoids
    // the nav-reveal overlay getting stuck on a lingering loading placeholder.
    await supabase.auth.signOut();
    window.location.replace('/client');
  };

  if (loading || !client) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: 'var(--bg-page, #050d1e)' }}>
        <div className="page-loading-placeholder" />
        <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: 14 }}>جارٍ التحميل...</span>
      </div>
    );
  }

  return (
    <ClientPortalContext.Provider value={{ client, loading, currentPage, navigateTo, signOut, refreshClient }}>
      {children}
    </ClientPortalContext.Provider>
  );
};
