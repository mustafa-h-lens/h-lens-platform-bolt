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
import { getTheme } from './theme/tokens';
import { useRouter, navigate } from './lib/router';

// ─────────────────────────────────────────────────────────────
// Vendor session helpers
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

    // Check expiry
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
// APP CONTENT
// ─────────────────────────────────────────────────────────────
function AppContent() {
  const { user, profile, loading } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const { pathname: currentPath } = useRouter();
  const [vendorAuth, setVendorAuth]   = useState<{ vendor: VendorData; session: VendorSession } | null>(null);

  useEffect(() => {
    // Check for stored vendor session on mount & when path changes to vendor area
    if (
      currentPath === '/vendor-login' ||
      currentPath === '/supplier-login' ||
      currentPath.startsWith('/vendor-portal')
    ) {
      const stored = getStoredVendorSession();
      setVendorAuth(stored);
    }
  }, [currentPath]);

  // ── PUBLIC ROUTES ── (checked before auth)
  if (currentPath === '/vendor-registration') {
    return <VendorRegistrationForm />;
  }

  if (currentPath === '/terms-and-conditions' || currentPath === '/terms') {
    return <TermsAndConditions />;
  }

  if (currentPath === '/privacy-policy' || currentPath === '/privacy') {
    return <PrivacyPolicy />;
  }

  // ── VENDOR AUTH ROUTES ──
  const isVendorLoginRoute = currentPath === '/supplier-login' || currentPath === '/vendor-login';
  const isVendorPortalRoute = currentPath.startsWith('/vendor-portal');

  if (isVendorLoginRoute || isVendorPortalRoute) {
    const stored = vendorAuth || getStoredVendorSession();

    if (stored) {
      // Redirect login pages to portal
      if (isVendorLoginRoute) {
        navigate('/vendor-portal', true);
      }
      return (
        <VendorProvider
          initialVendor={{
            id: stored.vendor.id,
            email: stored.vendor.email,
            full_name: stored.vendor.name,
            phone: stored.vendor.phone || '',
            status: stored.vendor.status || 'active',
            vendor_type: stored.vendor.vendor_type,
            primary_city: stored.vendor.primary_city,
            profile_image: stored.vendor.profile_image,
            nationality: stored.vendor.nationality,
            id_number: stored.vendor.id_number,
          }}
          initialSession={stored.session}
        >
          <VendorPortal />
        </VendorProvider>
      );
    }

    // Not logged in on portal route → redirect to login
    if (isVendorPortalRoute) {
      navigate('/vendor-login', true);
    }

    // Show login + handle success → render portal
    return (
      <SupplierAuth
        onSuccess={(data: any) => {
          setVendorAuth({ vendor: data.vendor, session: data.session });
          navigate('/vendor-portal', true);
        }}
      />
    );
  }

  // ── ADMIN / CLIENT LOADING ──
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

  // ── ADMIN / CLIENT AUTH ──
  if (!user || !profile) {
    return <Login />;
  }

  if (profile.role === 'admin' || profile.role === 'super_admin') {
    // If admin lands on /client/* path (client portal), redirect to dashboard
    if (currentPath === '/client' || currentPath.startsWith('/client/')) {
      navigate('/', true);
    }
    return <NewAdminDashboard />;
  }

  // Client user — ensure URL has /client prefix or redirect
  if (currentPath !== '/client' && !currentPath.startsWith('/client/') && currentPath !== '/') {
    navigate('/client', true);
  }
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