import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { VendorProvider } from './contexts/VendorContext';
import { ClientPortalProvider } from './contexts/ClientPortalContext';
import { getTheme } from './theme/tokens';
import { useRouteTracking, getLastVisitedPage } from './lib/router';
import { supabase } from './lib/supabaseClient';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

// ─────────────────────────────────────────────────────────────
// LAZY-LOADED PAGE COMPONENTS (code splitting)
// ─────────────────────────────────────────────────────────────
const NewAdminDashboard = lazy(() =>
  import('./components/admin/NewAdminDashboard').then(m => ({ default: m.NewAdminDashboard }))
);
const ClientDashboard = lazy(() =>
  import('./components/client/ClientDashboard').then(m => ({ default: m.ClientDashboard }))
);
const VendorPortal = lazy(() =>
  import('./components/vendor/VendorPortal').then(m => ({ default: m.VendorPortal }))
);
const VendorRegistrationForm = lazy(() =>
  import('./components/vendor-registration/VendorRegistrationForm').then(m => ({ default: m.VendorRegistrationForm }))
);
const Login = lazy(() =>
  import('./components/auth/Login').then(m => ({ default: m.Login }))
);
const SupplierAuth = lazy(() => import('./components/auth/SupplierAuth'));
const ClientAuth = lazy(() => import('./components/client/ClientAuth'));
const ClientPortal = lazy(() =>
  import('./components/client/ClientPortal').then(m => ({ default: m.ClientPortal }))
);
const TermsAndConditions = lazy(() =>
  import('./components/legal/TermsAndConditions').then(m => ({ default: m.TermsAndConditions }))
);
const PrivacyPolicy = lazy(() =>
  import('./components/legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy }))
);

// ─────────────────────────────────────────────────────────────
// ROUTE CONSTANTS
// ─────────────────────────────────────────────────────────────
const ROUTES = {
  // Public
  VENDOR_REGISTRATION: '/vendor-registration',
  VENDOR_LOGIN:        '/vendor-login',
  VENDOR_PORTAL:       '/vendor',
  TERMS:               '/terms-and-conditions',
  PRIVACY:             '/privacy-policy',

  // Client Portal
  CLIENT_LOGIN:        '/portal-client-hl',
  CLIENT_PORTAL:       '/portal-client-hl/dashboard',

  // Protected (obfuscated)
  ADMIN_LOGIN:         '/portal-admin-hl',
  ADMIN_DASHBOARD:     '/portal-admin-hl/dashboard',
} as const;

// ─────────────────────────────────────────────────────────────
// VENDOR SESSION HELPERS
// ─────────────────────────────────────────────────────────────
interface VendorSession {
  token: string;
  expiresAt: string;
}

interface VendorData {
  id: string;
  email: string;
  name: string;
  vendor_type?: string;
  primary_city?: string;
  profile_image?: string;
  nationality?: string;
  id_number?: string;
  phone?: string;
  status?: string;
}

function getStoredVendorSession(): { vendor: VendorData; session: VendorSession } | null {
  try {
    const sessionRaw = localStorage.getItem('vendor_session');
    const vendorRaw  = localStorage.getItem('vendor_data');
    if (!sessionRaw || !vendorRaw) return null;

    const session: VendorSession = JSON.parse(sessionRaw);
    const vendor: VendorData     = JSON.parse(vendorRaw);

    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem('vendor_session');
      localStorage.removeItem('vendor_data');
      return null;
    }

    return { vendor, session };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// CLIENT SESSION HELPERS
// ─────────────────────────────────────────────────────────────
interface ClientData {
  id: string;
  email: string;
  name: string;
  client_image?: string | null;
}

interface ClientSession {
  token: string;
  expiresAt: string;
}

function getStoredClientSession(): { client: ClientData; session: ClientSession } | null {
  try {
    const sessionRaw = localStorage.getItem('client_session');
    const clientRaw = localStorage.getItem('client_data');
    if (!sessionRaw || !clientRaw) return null;

    const session: ClientSession = JSON.parse(sessionRaw);
    const client: ClientData = JSON.parse(clientRaw);

    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem('client_session');
      localStorage.removeItem('client_data');
      return null;
    }

    return { client, session };
  } catch {
    return null;
  }
}

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// ─────────────────────────────────────────────────────────────
// LOADING FALLBACK FOR SUSPENSE
// ─────────────────────────────────────────────────────────────
function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#6b7280', fontSize: '15px', fontFamily: 'sans-serif' }}>
          جاري التحميل...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// APP CONTENT
// ─────────────────────────────────────────────────────────────
function AppContent() {
  const { user, profile, loading } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [hasRestoredRoute, setHasRestoredRoute] = useState(false);

  // Track route changes and save to localStorage
  useRouteTracking();

  useEffect(() => {
    const handlePathChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  // Restore last visited page on initial load
  useEffect(() => {
    if (hasRestoredRoute || loading) return;

    const lastVisitedPage = getLastVisitedPage();
    const currentPathname = window.location.pathname;

    // Only restore if:
    // 1. We have a last visited page
    // 2. User is authenticated (for admin/client routes) OR it's a vendor route
    // 3. Current path is a login page or root
    const isLoginPage = currentPathname === ROUTES.ADMIN_LOGIN ||
                        currentPathname === ROUTES.VENDOR_LOGIN ||
                        currentPathname === '/';

    if (lastVisitedPage && isLoginPage) {
      const storedVendorSession = getStoredVendorSession();
      const storedClientSession = getStoredClientSession();
      const isVendorRoute = lastVisitedPage.startsWith('/vendor') && !lastVisitedPage.includes('login');
      const isClientPortalRoute = lastVisitedPage.startsWith('/portal-client-hl');
      const isAdminRoute = lastVisitedPage.startsWith('/portal-admin-hl');

      // Restore vendor route if vendor is logged in
      if (isVendorRoute && storedVendorSession) {
        navigate(lastVisitedPage);
        setHasRestoredRoute(true);
        return;
      }

      // Restore client portal route if client is logged in
      if (isClientPortalRoute && storedClientSession) {
        navigate(lastVisitedPage);
        setHasRestoredRoute(true);
        return;
      }

      // Restore admin route if user is logged in
      if (isAdminRoute && user && profile) {
        navigate(lastVisitedPage);
        setHasRestoredRoute(true);
        return;
      }
    }

    setHasRestoredRoute(true);
  }, [loading, user, profile, hasRestoredRoute]);

  const renderVendorPortal = (stored: { vendor: VendorData; session: VendorSession }) => (
    <VendorProvider
      initialVendor={{
        id:            stored.vendor.id,
        email:         stored.vendor.email,
        full_name:     stored.vendor.name,
        phone:         stored.vendor.phone || '',
        status:        stored.vendor.status || 'active',
        vendor_type:   stored.vendor.vendor_type,
        primary_city:  stored.vendor.primary_city,
        profile_image: stored.vendor.profile_image,
        nationality:   stored.vendor.nationality,
        id_number:     stored.vendor.id_number,
      }}
      initialSession={stored.session}
    >
      <VendorPortal />
    </VendorProvider>
  );

  // ── PUBLIC ROUTES ──

  if (currentPath === ROUTES.VENDOR_REGISTRATION) {
    return <ErrorBoundary><VendorRegistrationForm /></ErrorBoundary>;
  }

  if (currentPath === ROUTES.TERMS || currentPath === '/terms') {
    return <TermsAndConditions />;
  }

  if (currentPath === ROUTES.PRIVACY || currentPath === '/privacy') {
    return <PrivacyPolicy />;
  }

  // ── VENDOR ROUTES ──

  // /vendor → has session? show portal : redirect to login
  if (currentPath === ROUTES.VENDOR_PORTAL) {
    const stored = getStoredVendorSession();
    if (stored) {
      // Clear admin session if switching from admin to vendor
      if (user) {
        supabase.auth.signOut().catch(() => {});
      }
      return <ErrorBoundary>{renderVendorPortal(stored)}</ErrorBoundary>;
    }
    navigate(ROUTES.VENDOR_LOGIN);
    return null;
  }

  // /vendor-login → has session? go to portal : show login
  if (currentPath === ROUTES.VENDOR_LOGIN) {
    const stored = getStoredVendorSession();
    if (stored) {
      navigate(ROUTES.VENDOR_PORTAL);
      return null;
    }
    // Clear vendor session if accessing vendor login
    localStorage.removeItem('vendor_session');
    localStorage.removeItem('vendor_data');
    return (
      <SupplierAuth
        onSuccess={() => navigate(ROUTES.VENDOR_PORTAL)}
      />
    );
  }

  // ── CLIENT PORTAL ROUTES ──

  // /portal-client-hl/dashboard → has session? show portal : redirect to login
  if (currentPath === ROUTES.CLIENT_PORTAL) {
    const stored = getStoredClientSession();
    if (stored) {
      return (
        <ErrorBoundary>
          <ClientPortalProvider
            initialClient={{
              id: stored.client.id,
              email: stored.client.email,
              name: stored.client.name,
              client_image: stored.client.client_image || null,
            }}
            initialSession={stored.session}
          >
            <ClientPortal />
          </ClientPortalProvider>
        </ErrorBoundary>
      );
    }
    navigate(ROUTES.CLIENT_LOGIN);
    return null;
  }

  // /portal-client-hl → has session? go to portal : show OTP login
  if (currentPath === ROUTES.CLIENT_LOGIN) {
    const stored = getStoredClientSession();
    if (stored) {
      navigate(ROUTES.CLIENT_PORTAL);
      return null;
    }
    localStorage.removeItem('client_session');
    localStorage.removeItem('client_data');
    return (
      <ClientAuth
        onSuccess={() => navigate(ROUTES.CLIENT_PORTAL)}
      />
    );
  }

  // ── ADMIN ROUTES ──

  const isAdminPath =
    currentPath === ROUTES.ADMIN_LOGIN ||
    currentPath.startsWith('/portal-admin-hl');

  if (!isAdminPath) {
    navigate(ROUTES.ADMIN_LOGIN);
    return null;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.background.page,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: theme.text.secondary }}>جارٍ التحميل...</div>
      </div>
    );
  }

  if (!user || !profile) {
    // Clear vendor session if accessing admin portal
    localStorage.removeItem('vendor_session');
    localStorage.removeItem('vendor_data');
    return <Login />;
  }

  return <ErrorBoundary><NewAdminDashboard /></ErrorBoundary>;
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionsProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AppContent />
            </Suspense>
          </ErrorBoundary>
        </NotificationProvider>
        </PermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
