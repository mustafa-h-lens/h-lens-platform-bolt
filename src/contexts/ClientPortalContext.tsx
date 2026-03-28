import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface ClientProfile {
  id: string;
  email: string;
  name: string;
  client_image: string | null;
}

export interface ClientSession {
  token: string;
  expiresAt: string;
}

export type ClientPage = 'dashboard' | 'projects' | 'invoices';

interface ClientPortalContextType {
  client: ClientProfile | null;
  session: ClientSession | null;
  loading: boolean;
  currentPage: ClientPage;
  navigateTo: (page: ClientPage) => void;
  signOut: () => void;
  refreshClient: () => Promise<void>;
}

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined);

export const useClientPortal = () => {
  const ctx = useContext(ClientPortalContext);
  if (!ctx) throw new Error('useClientPortal must be used within ClientPortalProvider');
  return ctx;
};

interface ClientPortalProviderProps {
  children: ReactNode;
  initialClient: ClientProfile;
  initialSession: ClientSession;
}

export const ClientPortalProvider = ({ children, initialClient, initialSession }: ClientPortalProviderProps) => {
  const [client, setClient] = useState<ClientProfile>(initialClient);
  const [session] = useState<ClientSession>(initialSession);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<ClientPage>('dashboard');

  // Check session expiry
  useEffect(() => {
    const checkExpiry = () => {
      if (session?.expiresAt) {
        if (Date.now() > new Date(session.expiresAt).getTime()) {
          signOut();
        }
      }
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, [session?.expiresAt]);

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

  // Fetch full client data on mount
  useEffect(() => {
    if (initialClient?.id) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('clients')
            .select('id, name, email, client_image')
            .eq('id', initialClient.id)
            .single();
          if (!error && data) setClient(data as ClientProfile);
        } catch (err) {
          console.error('Error fetching client data:', err);
        }
      })();
    }
  }, [initialClient?.id]);

  const navigateTo = (page: ClientPage) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  const refreshClient = async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, client_image')
        .eq('id', client.id)
        .single();
      if (!error && data) setClient(data as ClientProfile);
    } catch (err) {
      console.error('Error refreshing client:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('client_session');
    localStorage.removeItem('client_data');
    window.history.pushState({}, '', '/portal-client-hl');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <ClientPortalContext.Provider value={{
      client, session, loading, currentPage,
      navigateTo, signOut, refreshClient,
    }}>
      {children}
    </ClientPortalContext.Provider>
  );
};
