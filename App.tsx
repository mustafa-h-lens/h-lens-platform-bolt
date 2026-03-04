import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { VendorProvider } from './contexts/VendorContext';
import { Login } from './components/Login';
import { NewAdminDashboard } from './components/admin/NewAdminDashboard';
import { ClientDashboard } from './components/client/ClientDashboard';
import { VendorPortal } from './components/vendor/VendorPortal';
import { VendorRegistrationForm } from './components/vendor-registration/VendorRegistrationForm';
import { TermsAndConditions } from './components/TermsAndConditions';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import SupplierAuth from './components/SupplierAuth';
import ClientAuth from './components/ClientAuth';
import { getTheme } from './theme/tokens';

// ─────────────────────────────────────────────────────────────
// ROUTE CONSTANTS
// ─────────────────────────────────────────────────────────────
const ROUTES = {
  // Public
  VENDOR_REGISTRATION: '/vendor-registration',
  VENDOR_LOGIN:        '/vendor-login',
  VENDOR_PORTAL:       '/vendor',
  CLIENT_LOGIN:        '/client-login',
  CLIENT_PORTAL:       '/client',
  TERMS:               '/terms-and-conditions',
  PRIVACY:             '/privacy-policy',

  // Protected (obfuscated)
  ADMIN_LOGIN:         '/portal-admin-hl',
  ADMIN_DASHBOARD:     '/portal-admin-hl/dashboard',
} as const;

// ─────────────────────────────────────────────────────────────
// SESSION HELPERS
// ─────────────────────────────────────────────────────────────
interface VendorSession { token: string; expiresAt: string; }
interface VendorData {
  id: string; email: string; name: string;
  vendor_type?: string; primary_city?: string;
  profile_image?: string; nationality?: string;
  id_number?: string; phone?: string; status?: string;
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
  } catch { return null; }
}

function getStoredClientSession(): any | null {
  try {
    const sessionRaw = localStorage.getItem('client_session');
    const clientRaw  = localStorage.getItem('client_data');
    if (!sessionRaw || !clientRaw) return null;
    const session = JSON.parse(sessionRaw);
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem('client_session');
      localStorage.removeItem('client_data');
      return null;
    }
    return { client: JSON.parse(clientRaw), session };
  } catch { return null; }
}

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// ─────────────────────────────────────────────────────────────
// APP CONTENT
// ─────────────────────────────────────────────────────────────
function AppContent() {
  const { user, profile, loading } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handler = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

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
  if (currentPath === ROUTES.VENDOR_REGISTRATION) return <VendorRegistrationForm />;
  if (currentPath === ROUTES.TERMS  || currentPath === '/terms')   return <TermsAndConditions />;
  if (currentPath === ROUTES.PRIVACY || currentPath === '/privacy') return <PrivacyPolicy />;

  // ── VENDOR ROUTES ──
  if (currentPath === ROUTES.VENDOR_PORTAL) {
    const stored = getStoredVendorSession();
    if (stored) return renderVendorPortal(stored);
    navigate(ROUTES.VENDOR_LOGIN); return null;
  }
  if (currentPath === ROUTES.VENDOR_LOGIN) {
    const stored = getStoredVendorSession();
    if (stored) { navigate(ROUTES.VENDOR_PORTAL); return null; }
    return <SupplierAuth onSuccess={() => navigate(ROUTES.VENDOR_PORTAL)} />;
  }

  // ── CLIENT ROUTES ──
  if (currentPath === ROUTES.CLIENT_PORTAL) {
    const stored = getStoredClientSession();
    if (stored) return <ClientDashboard />;
    navigate(ROUTES.CLIENT_LOGIN); return null;
  }
  if (currentPath === ROUTES.CLIENT_LOGIN) {
    const stored = getStoredClientSession();
    if (stored) { navigate(ROUTES.CLIENT_PORTAL); return null; }
    return <ClientAuth onSuccess={() => navigate(ROUTES.CLIENT_PORTAL)} />;
  }

  // ── ADMIN ROUTES ──
  const isAdminPath =
    currentPath === ROUTES.ADMIN_LOGIN ||
    currentPath.startsWith('/portal-admin-hl') ||
    currentPath.startsWith('/portal-client-hl');

  if (!isAdminPath) { navigate(ROUTES.ADMIN_LOGIN); return null; }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', backgroundColor:theme.background.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:theme.text.secondary }}>جارٍ التحميل...</div>
      </div>
    );
  }

  if (!user || !profile) return <Login />;
  if (profile.role === 'admin' || profile.role === 'super_admin') return <NewAdminDashboard />;
  return <ClientDashboard />;
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
