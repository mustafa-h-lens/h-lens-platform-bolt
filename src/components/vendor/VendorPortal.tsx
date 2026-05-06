import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, User, Folder, FileText, Camera, Bell, AlertCircle,
  LogOut, Menu, X, Sun, Moon, ChevronLeft, ChevronRight, Lightbulb,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor, VendorPage } from '../../contexts/VendorContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useProfileCompletion } from './hooks/useProfileCompletion';
import { VendorDashboard } from './VendorDashboard';
import { VendorProfile } from './VendorProfile';
import { VendorProjects } from './VendorProjects';
import { VendorInvoices } from './VendorInvoices';
import { VendorEquipment } from './VendorEquipment';
import { VendorNotifications } from './VendorNotifications';
import { VendorSuggestions } from './VendorSuggestions';
import { VendorEditSubmission } from './VendorEditSubmission';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useDisablePullToRefresh } from '../shared/PullToRefresh';
import '../../styles/vendor-portal.css';

const NAV_ITEMS: { id: VendorPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard',      label: 'الرئيسية',              icon: LayoutDashboard },
  { id: 'profile',        label: 'الملف الشخصي',          icon: User },
  { id: 'projects',       label: 'مشاريعي',               icon: Folder },
  { id: 'invoices',       label: 'الفواتير والمدفوعات',    icon: FileText },
  { id: 'equipment',      label: 'المعدات',                icon: Camera },
  { id: 'notifications',  label: 'الإشعارات',              icon: Bell },
  { id: 'suggestions',    label: 'الاقتراحات',             icon: Lightbulb },
];

const PAGE_TITLES: Record<VendorPage, string> = {
  dashboard:        'الرئيسية',
  profile:          'الملف الشخصي',
  projects:         'مشاريعي',
  invoices:         'الفواتير والمدفوعات',
  equipment:        'المعدات',
  notifications:    'الإشعارات',
  suggestions:      'الاقتراحات',
  'edit-submission':'تعديل الطلب',
};

export const VendorPortal = () => {
  const { vendor, currentPage, navigateTo, signOut } = useVendor();
  const { isDarkMode, toggleTheme } = useTheme();
  const LOGO = isDarkMode ? '/assets/logo-white.png' : '/assets/logo-blue.png';
  const { showSuccess, showError } = useNotification();
  const completion = useProfileCompletion();

  const isRevisionMode = vendor?.status === 'revision_requested';
  const [drawerOpen, setDrawer] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [primaryService, setPrimaryService] = useState('');
  const [revisionNotes, setRevisionNotes] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<VendorPage | null>(null);

  const [notifCount, setNotifCount] = useState(0);
  const markDirty = useCallback(() => setIsDirty(true), []);
  const clearDirty = useCallback(() => setIsDirty(false), []);

  // Warn on browser close/refresh with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Fetch vendor's primary service name
  useEffect(() => {
    if (!vendor?.id) return;
    (async () => {
      const { data } = await supabase
        .from('vendor_selected_fields')
        .select('vendor_fields(name_ar)')
        .eq('vendor_id', vendor.id)
        .limit(1);
      if (data?.[0]?.vendor_fields) setPrimaryService((data[0].vendor_fields as any).name_ar || '');
    })();
  }, [vendor?.id]);

  // Fetch unread notification count (items newer than the user's last visit
  // to the notifications page, capped to a 7-day window). Opening the
  // notifications page records "seen now" in localStorage and zeroes the
  // badge immediately.
  useEffect(() => {
    if (!vendor?.id) return;
    const LAST_SEEN_KEY = `vendor-last-notif-seen-${vendor.id}`;

    if (currentPage === 'notifications') {
      try { localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString()); } catch { /* no-op */ }
      setNotifCount(0);
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let lastSeen: string | null = null;
    try { lastSeen = localStorage.getItem(LAST_SEEN_KEY); } catch { /* no-op */ }
    const cutoff = lastSeen && lastSeen > sevenDaysAgo ? lastSeen : sevenDaysAgo;

    (async () => {
      const [sugRes, approvalRes] = await Promise.all([
        supabase
          .from('vendor_suggestions')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .not('admin_response', 'is', null)
          .gte('responded_at', cutoff),
        supabase
          .from('vendor_approval_log')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .gte('created_at', cutoff),
      ]);
      setNotifCount((sugRes.count || 0) + (approvalRes.count || 0));
    })();
  }, [vendor?.id, currentPage]);

  // Fetch revision notes if in revision mode
  useEffect(() => {
    if (isRevisionMode && vendor?.id) {
      (async () => {
        const { data } = await supabase
          .from('vendor_approval_log')
          .select('reason')
          .eq('vendor_id', vendor.id)
          .eq('action', 'revision_requested')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.reason) setRevisionNotes(data.reason);
      })();
    }
  }, [isRevisionMode, vendor?.id]);

  // While the mobile drawer is open: disable our app-level PullToRefresh
  // (its translateY moves the wrapper out from under the fixed drawer) and
  // pin body so iOS-native rubber-band can't shift the layout viewport.
  useDisablePullToRefresh(drawerOpen);
  useEffect(() => {
    if (!drawerOpen) return;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      overscroll: body.style.overscrollBehavior,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      body.style.overscrollBehavior = prev.overscroll;
      window.scrollTo(0, scrollY);
    };
  }, [drawerOpen]);

  const navigate = (id: VendorPage) => {
    if (id === currentPage) return;
    if (isDirty) {
      setPendingNav(id);
      return;
    }
    navigateTo(id);
    setDrawer(false);
  };

  const confirmNavigation = () => {
    if (pendingNav) {
      setIsDirty(false);
      navigateTo(pendingNav);
      setDrawer(false);
      setPendingNav(null);
    }
  };

  const cancelNavigation = () => setPendingNav(null);

  const initials = vendor?.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '?';

  const AvatarEl = ({ size = 38 }: { size?: number }) => (
    vendor?.profile_image ? (
      <img src={vendor.profile_image} alt="" style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
    ) : (
      <div style={{
        width: size, height: size, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: `${Math.max(0.65, size * 0.021)}rem`, fontWeight: 800, color: 'white',
      }}>{initials}</div>
    )
  );

  // Sidebar — always dark theme regardless of mode
  const SidebarInner = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isOpen = isMobile ? true : sideOpen;

    return (
      <>
        {/* Logo */}
        <div style={{
          padding: isOpen ? '18px 14px' : '18px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          justifyContent: isOpen ? 'flex-start' : 'center',
        }}>
          <img src={LOGO} alt="Half Lens" onClick={() => navigateTo('dashboard')} style={{
            height: isOpen ? 42 : 24, objectFit: 'contain', flexShrink: 0,
            minWidth: isOpen ? 'auto' : 24, transition: 'height 0.25s ease', cursor: 'pointer',
          }} />
          {isMobile && (
            <button onClick={() => setDrawer(false)} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Vendor card — expanded */}
        {isOpen && (
          <div style={{ padding: '12px 14px', flexShrink: 0 }}>
            <div style={{
              padding: '9px 12px', borderRadius: 12,
              background: 'var(--pillBg)', border: '1px solid var(--pillBorder)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.62rem', fontWeight: 700, color: 'white',
              }}>
                {vendor?.profile_image ? (
                  <img src={vendor.profile_image} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
                ) : initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vendor?.full_name || '—'}</div>
                <div style={{ fontSize: '.67rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{primaryService || vendor?.vendor_type || 'مورد'}</div>
              </div>
            </div>
            <div style={{ marginTop: 8, paddingRight: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              {isRevisionMode ? (
                <>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: '.68rem', color: '#fbbf24', fontWeight: 600 }}>مطلوب تعديلات</span>
                </>
              ) : (
                <>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: '.68rem', color: '#6ee7b7', fontWeight: 600 }}>
                    {vendor?.status === 'active' ? 'حساب نشط' : 'قيد المراجعة'}
                  </span>
                </>
              )}
            </div>
            {!completion.loading && completion.percentage < 100 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '.6rem', color: 'rgba(255,255,255,0.25)' }}>اكتمال الملف</span>
                  <span style={{ fontSize: '.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{completion.percentage}%</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${completion.percentage}%`, background: completion.percentage >= 80 ? '#10b981' : '#f59e0b', transition: 'width 0.5s' }} />
                </div>
              </div>
            )}
          </div>
        )}
        {/* Collapsed avatar */}
        {!isOpen && (
          <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
            <AvatarEl size={32} />
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                title={!isOpen ? item.label : undefined}
                className={`vp-nav-item${isActive ? ' active' : ''}${!isOpen ? ' collapsed' : ''}`}
              >
                <div className="vp-nav-icon" style={{
                  background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                  position: 'relative',
                }}>
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {item.id === 'notifications' && notifCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16,
                      borderRadius: 99, background: '#ef4444', color: '#fff',
                      fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', padding: '0 4px', lineHeight: 1,
                    }}>{notifCount > 9 ? '9+' : notifCount}</span>
                  )}
                </div>
                {isOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`vp-nav-item${!isOpen ? ' collapsed' : ''}`}
            title={!isOpen ? (isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن') : undefined}
          >
            {isDarkMode ? <Sun size={18} style={{ flexShrink: 0 }} /> : <Moon size={18} style={{ flexShrink: 0 }} />}
            {isOpen && <span style={{ fontSize: '.78rem' }}>{isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>}
          </button>
          {/* Sign out */}
          <button
            onClick={signOut}
            className={`vp-nav-item${!isOpen ? ' collapsed' : ''}`}
            style={{ color: 'rgba(239,68,68,0.6)' }}
            title={!isOpen ? 'تسجيل الخروج' : undefined}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {isOpen && <span style={{ fontSize: '.78rem' }}>تسجيل الخروج</span>}
          </button>
        </div>
      </>
    );
  };

  return (
    <div dir="rtl" className={`vp-root${isDarkMode ? '' : ' light'}`} style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: 'Cairo, sans-serif',
      background: 'var(--bg)',
      color: 'var(--textPri)',
    }}>
      {/* ── Desktop Sidebar (always dark) ── */}
      <aside className="hidden md:flex" style={{
        width: sideOpen ? 220 : 64,
        flexShrink: 0, height: '100vh', position: 'relative',
        flexDirection: 'column',
        background: 'var(--sideBg)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 0.25s ease',
        overflow: 'visible',
      }}>
        {/* Sidebar glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130, background: 'radial-gradient(ellipse at 50% -10%, rgba(29,78,216,0.22) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <SidebarInner />
        </div>
        {/* Collapse/expand floating button */}
        <button
          onClick={() => setSideOpen(v => !v)}
          style={{
            position: 'absolute',
            top: 28,
            left: -14,
            zIndex: 60,
            width: 28, height: 28, borderRadius: '50%',
            background: isDarkMode ? '#1e293b' : 'white',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: isDarkMode ? '#94a3b8' : '#475569',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = isDarkMode ? '0 3px 12px rgba(0,0,0,0.5)' : '0 3px 12px rgba(0,0,0,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = isDarkMode ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.12)'; }}
        >
          {sideOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </aside>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden"
            onClick={() => setDrawer(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40, touchAction: 'none', overscrollBehavior: 'none' }}
          />
          <aside
            className="md:hidden"
            data-drawer-scroll="true"
            style={{
              position: 'fixed', top: 0, right: 0, width: 260, height: '100dvh', zIndex: 50,
              display: 'flex', flexDirection: 'column',
              background: isDarkMode ? 'rgba(4,10,24,0.98)' : 'linear-gradient(175deg, #1a3a6b 0%, #0e2247 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              animation: 'slideIn 0.25s ease',
              overscrollBehavior: 'contain',
              overflowY: 'auto',
              touchAction: 'pan-y',
            }}
          >
            <SidebarInner isMobile />
          </aside>
        </>
      )}

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Mobile header — 3-column grid keeps the title visually centered and
            the side icons baseline-aligned regardless of RTL/LTR. */}
        <header className="md:hidden" style={{
          height: 56,
          display: 'grid',
          gridTemplateColumns: '44px 1fr 44px',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--hdr)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setDrawer(true)}
            aria-label="القائمة"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--textSec)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <Menu size={22} />
          </button>
          <span style={{
            fontSize: '.95rem', fontWeight: 700, color: 'var(--textPri)',
            textAlign: 'right',
            paddingInlineStart: 12,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {PAGE_TITLES[currentPage]}
          </span>
          <img
            src={LOGO}
            alt="Half Lens"
            onClick={() => navigateTo('dashboard')}
            style={{
              height: 30, width: 'auto', objectFit: 'contain', cursor: 'pointer',
              justifySelf: 'end',
            }}
          />
        </header>

        {/* Page content */}
        <div className="vp-page-scroll" style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <div key={currentPage} className="vp-page-enter">
            {/* Desktop page title */}
            <h1 className="hidden md:block" style={{
              fontSize: '1.3rem', fontWeight: 900,
              color: 'var(--textPri)',
              marginBottom: 22,
            }}>
              {PAGE_TITLES[currentPage]}
            </h1>

            {/* Revision Banner */}
            {isRevisionMode && (
              <div style={{
                backgroundColor: '#fef3c7', border: '1px solid #f59e0b',
                borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 22,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: '#92400e', marginBottom: 4, fontSize: '0.95rem' }}>
                      مطلوب تعديلات على طلب التسجيل
                    </p>
                    <p style={{ color: '#a16207', fontSize: '0.85rem', lineHeight: 1.7 }}>
                      يرجى مراجعة الملاحظات أدناه وتعديل بياناتك ثم إعادة تقديم الطلب.
                    </p>
                    {revisionNotes && (
                      <div style={{
                        backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8,
                        padding: '0.75rem 1rem', marginTop: '0.75rem',
                        border: '1px solid rgba(245,158,11,0.3)',
                      }}>
                        <p style={{ fontWeight: 600, color: '#92400e', fontSize: '0.8rem', marginBottom: 4 }}>ملاحظات المراجع:</p>
                        <p style={{ color: '#78350f', fontSize: '0.85rem', lineHeight: 1.8 }}>{revisionNotes}</p>
                      </div>
                    )}
                    <button
                      onClick={() => navigateTo('edit-submission')}
                      style={{
                        marginTop: '0.75rem', backgroundColor: '#2563eb', color: 'white',
                        border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem',
                        fontWeight: 600, fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      ابدأ التعديل وأعد التقديم ←
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ErrorBoundary key={currentPage}>
              {currentPage === 'dashboard'        && <VendorDashboard />}
              {currentPage === 'profile'          && <VendorProfile onDirtyChange={markDirty} onSaved={clearDirty} />}
              {currentPage === 'projects'         && <VendorProjects />}
              {currentPage === 'invoices'         && <VendorInvoices />}
              {currentPage === 'equipment'        && <VendorEquipment />}
              {currentPage === 'notifications'    && <VendorNotifications />}
              {currentPage === 'suggestions'      && <VendorSuggestions />}
              {currentPage === 'edit-submission'  && <VendorEditSubmission />}
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Unsaved changes confirmation modal */}
      {pendingNav && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={cancelNavigation}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--cardSolid, var(--card))',
            border: '1px solid var(--border)',
            borderRadius: 16, padding: '24px 28px',
            maxWidth: 380, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertCircle size={22} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--textPri)', margin: 0 }}>تغييرات غير محفوظة</h3>
            </div>
            <p style={{ fontSize: '.85rem', color: 'var(--textSec)', lineHeight: 1.7, marginBottom: 20 }}>
              لديك تعديلات لم يتم حفظها. هل تريد المغادرة بدون حفظ؟
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={cancelNavigation} style={{
                padding: '8px 20px', borderRadius: 8, fontSize: '.82rem', fontWeight: 600,
                background: 'var(--inp)', border: '1px solid var(--border)',
                color: 'var(--textSec)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
              }}>
                البقاء والحفظ
              </button>
              <button onClick={confirmNavigation} style={{
                padding: '8px 20px', borderRadius: 8, fontSize: '.82rem', fontWeight: 600,
                background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
              }}>
                مغادرة بدون حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
