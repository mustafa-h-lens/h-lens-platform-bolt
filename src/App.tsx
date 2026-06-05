import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { VendorProvider } from './contexts/VendorContext';
import { ClientPortalProvider } from './contexts/ClientPortalContext';
import { HideAmountsProvider } from './contexts/HideAmountsContext';
import { getTheme } from './theme/tokens';
import { useRouteTracking, getLastVisitedPage, navigate } from './lib/router';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { NavTransitionOverlay } from './components/NavTransitionOverlay';
import { BootSplash } from './components/BootSplash';

// ─────────────────────────────────────────────────────────────
// LAZY-LOADED PAGE COMPONENTS (code splitting)
// ─────────────────────────────────────────────────────────────
const NewAdminDashboard = lazy(() =>
  import('./components/admin/NewAdminDashboard').then(m => ({ default: m.NewAdminDashboard }))
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
const LandingPage = lazy(() =>
  import('./components/landing/LandingPage').then(m => ({ default: m.LandingPage }))
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
  VENDOR_REGISTRATION: '/join',
  VENDOR_LOGIN:        '/vendor/login',
  VENDOR_PORTAL:       '/vendor',
  TERMS:               '/terms-and-conditions',
  PRIVACY:             '/privacy-policy',
  CLIENT_LOGIN:        '/client',
  CLIENT_PORTAL:       '/client/dashboard',
  ADMIN_LOGIN:         '/admin',
  ADMIN_DASHBOARD:     '/admin',
} as const;

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
      <div className="page-loading-placeholder" />
      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px', height: '36px',
          border: '3px solid #e5e7eb', borderTopColor: '#6366f1',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#6b7280', fontSize: '15px', fontFamily: 'sans-serif' }}>جاري التحميل...</span>
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
  const [refreshKey, setRefreshKey] = useState(0);

  // Native portal identity comes from the Supabase session's app_metadata.
  const appMeta = (user?.app_metadata ?? {}) as { portal?: 'vendor' | 'client'; vendor_id?: string; client_id?: string };
  const vendorId = appMeta.portal === 'vendor' ? appMeta.vendor_id : undefined;
  const clientId = appMeta.portal === 'client' ? appMeta.client_id : undefined;
  const isVendorSession = !!user && !!vendorId;
  const isClientSession = !!user && !!clientId;

  // Track route changes and save to localStorage
  useRouteTracking();

  useEffect(() => {
    const handlePathChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  // Pull-to-refresh: remount page components to reload data without killing sessions
  useEffect(() => {
    const handleRefresh = () => setRefreshKey(k => k + 1);
    window.addEventListener('pull-to-refresh', handleRefresh);
    return () => window.removeEventListener('pull-to-refresh', handleRefresh);
  }, []);

  // NOTE: the old "sign out the admin session when on /vendor" effect was
  // removed — with native auth the vendor IS a Supabase session and must not be
  // signed out. Portal vs admin is decided by app_metadata.portal below.

  // Restore last visited page on initial load (any portal, not just admin)
  useEffect(() => {
    if (hasRestoredRoute || loading) return;

    const lastVisitedPage = getLastVisitedPage();
    const currentPathname = window.location.pathname;
    const currentHash = window.location.hash;

    if (!lastVisitedPage || lastVisitedPage === currentPathname + window.location.search + currentHash) {
      setHasRestoredRoute(true);
      return;
    }

    let savedPathname = lastVisitedPage;
    let savedHash = '';
    const hashIdx = lastVisitedPage.indexOf('#');
    if (hashIdx !== -1) {
      savedPathname = lastVisitedPage.slice(0, hashIdx);
      savedHash = lastVisitedPage.slice(hashIdx);
    }

    const onPlainAdmin = currentPathname === ROUTES.ADMIN_LOGIN && !currentHash;
    if (onPlainAdmin && user && profile) {
      const isDeepAdminPage = lastVisitedPage.startsWith('/admin#') || lastVisitedPage.startsWith('/admin/');
      if (isDeepAdminPage) window.history.replaceState({}, '', lastVisitedPage);
      setHasRestoredRoute(true);
      return;
    }

    if (currentPathname === '/' && !currentHash) {
      if (savedPathname.startsWith('/admin') && user && profile) {
        window.history.replaceState({}, '', lastVisitedPage);
        setCurrentPath(savedPathname);
      } else if (savedPathname.startsWith('/vendor') && isVendorSession) {
        window.history.replaceState({}, '', lastVisitedPage);
        setCurrentPath(savedPathname);
      } else if (savedPathname.startsWith('/client') && isClientSession) {
        window.history.replaceState({}, '', lastVisitedPage);
        setCurrentPath(savedPathname);
      }
      setHasRestoredRoute(true);
      return;
    }

    const onVendorRoot = currentPathname === ROUTES.VENDOR_PORTAL && !currentHash;
    if (onVendorRoot && savedPathname === ROUTES.VENDOR_PORTAL && savedHash && isVendorSession) {
      window.history.replaceState({}, '', lastVisitedPage);
      setHasRestoredRoute(true);
      return;
    }

    const onClientRoot = currentPathname === ROUTES.CLIENT_PORTAL && !currentHash;
    if (onClientRoot && savedPathname === ROUTES.CLIENT_PORTAL && savedHash && isClientSession) {
      window.history.replaceState({}, '', lastVisitedPage);
      setHasRestoredRoute(true);
      return;
    }

    setHasRestoredRoute(true);
  }, [loading, user, profile, hasRestoredRoute, isVendorSession, isClientSession]);

  const portalLoading = (
    <div style={{ minHeight: '100vh', backgroundColor: theme.background.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="page-loading-placeholder" />
      <div style={{ color: theme.text.secondary }}>جارٍ التحميل...</div>
    </div>
  );

  // ── PUBLIC ROUTES ──
  if (currentPath === '/') {
    return <Suspense fallback={<div className="page-loading-placeholder" />}><LandingPage onNavigate={(path) => navigate(path)} /></Suspense>;
  }
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
  if (currentPath === ROUTES.VENDOR_PORTAL) {
    if (loading) return portalLoading;
    if (isVendorSession) {
      return (
        <ErrorBoundary key={refreshKey}>
          <VendorProvider vendorId={vendorId!}>
            <VendorPortal />
          </VendorProvider>
        </ErrorBoundary>
      );
    }
    navigate(ROUTES.VENDOR_LOGIN);
    return null;
  }

  if (currentPath === ROUTES.VENDOR_LOGIN) {
    if (loading) return portalLoading;
    if (isVendorSession) {
      navigate(ROUTES.VENDOR_PORTAL);
      return null;
    }
    return (
      <SupplierAuth
        onSuccess={() => navigate(ROUTES.VENDOR_PORTAL, false, { reveal: true, forceDark: true })}
      />
    );
  }

  // ── CLIENT PORTAL ROUTES (catch all /client* before admin) ──
  if (currentPath.startsWith('/client')) {
    if (loading) return portalLoading;
    if (isClientSession) {
      if (currentPath === ROUTES.CLIENT_LOGIN) {
        navigate(ROUTES.CLIENT_PORTAL);
        return null;
      }
      return (
        <ErrorBoundary key={refreshKey}>
          <ClientPortalProvider clientId={clientId!}>
            <ClientPortal />
          </ClientPortalProvider>
        </ErrorBoundary>
      );
    }
    if (currentPath !== ROUTES.CLIENT_LOGIN) {
      navigate(ROUTES.CLIENT_LOGIN);
      return null;
    }
    return (
      <ClientAuth
        onSuccess={() => navigate(ROUTES.CLIENT_PORTAL, false, { reveal: true, forceDark: true })}
      />
    );
  }

  // ── ADMIN ROUTES ──
  const isAdminPath = currentPath === ROUTES.ADMIN_LOGIN || currentPath.startsWith('/admin');
  if (!isAdminPath) {
    if (currentPath === '/' || currentPath === '') {
      return <Suspense fallback={<div className="page-loading-placeholder" />}><LandingPage onNavigate={(path) => navigate(path)} /></Suspense>;
    }
    navigate(ROUTES.ADMIN_LOGIN);
    return null;
  }

  if (loading) return portalLoading;

  if (!user || !profile) {
    return <Login />;
  }

  return <ErrorBoundary key={refreshKey}><NewAdminDashboard /></ErrorBoundary>;
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionsProvider>
        <HideAmountsProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AppContent />
            </Suspense>
          </ErrorBoundary>
          <NavTransitionOverlay />
          <BootSplash />
        </NotificationProvider>
        </HideAmountsProvider>
        </PermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
