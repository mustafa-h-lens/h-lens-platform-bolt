import { useState } from 'react';
import {
  LayoutDashboard, User, FolderOpen, FileText, Camera, FileArchive, Menu, X, LogOut, Sun, Moon,
} from 'lucide-react';
import { useVendor, VendorPage } from '../../contexts/VendorContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../theme/tokens';
import { VendorDashboard } from './dashboard/VendorDashboard';
import { VendorProfile } from './profile/VendorProfile';
import { VendorProjects, VendorInvoices, VendorEquipmentPage, VendorDocumentsPage } from './pages/VendorPages';

// ─────────────────────────────────────────────────────────────
// NAV ITEMS
// ─────────────────────────────────────────────────────────────
const NAV: Array<{ id: VendorPage; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard',  label: 'لوحة التحكم',       icon: LayoutDashboard },
  { id: 'profile',    label: 'الملف الشخصي',       icon: User            },
  { id: 'projects',   label: 'مشاريعي',            icon: FolderOpen      },
  { id: 'invoices',   label: 'الفواتير والمدفوعات', icon: FileText        },
  { id: 'equipment',  label: 'معداتي',             icon: Camera          },
  { id: 'documents',  label: 'مستنداتي',           icon: FileArchive     },
];

const PAGE_TITLES: Record<VendorPage, string> = {
  dashboard: 'لوحة التحكم',
  profile:   'الملف الشخصي',
  projects:  'مشاريعي',
  invoices:  'الفواتير والمدفوعات',
  equipment: 'معداتي',
  documents: 'مستنداتي',
};

// ─────────────────────────────────────────────────────────────
// VENDOR PORTAL v2
// ─────────────────────────────────────────────────────────────
export const VendorPortal = () => {
  const { vendor, currentPage, navigateTo, signOut } = useVendor();
  const { isDarkMode, toggleTheme } = useTheme();
  const t = getTheme(isDarkMode);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = vendor?.full_name?.split(' ').slice(0,2).map(w => w[0]).join('') || 'م';

  const SidebarContent = () => (
    <>
      {/* Logo + vendor mini */}
      <div style={{ padding: '1rem', borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={15} color="white" />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>بوابة المورد</span>
        </div>
        {/* Vendor card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0, overflow: 'hidden' }}>
            {vendor?.profile_image ? <img src={vendor.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendor?.full_name || '—'}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{vendor?.primary_city || vendor?.vendor_type || ''}</div>
          </div>
          <span style={{ marginRight: 'auto', flexShrink: 0, padding: '2px 7px', borderRadius: 5, background: vendor?.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: vendor?.status === 'active' ? '#10b981' : '#f59e0b', fontSize: '0.62rem', fontWeight: 700 }}>
            {vendor?.status === 'active' ? 'نشط' : vendor?.status || ''}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { navigateTo(item.id); setMobileOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, border: 'none',
                cursor: 'pointer', width: '100%', textAlign: 'right',
                fontFamily: 'Tajawal, sans-serif', fontSize: '0.85rem', fontWeight: active ? 700 : 400,
                color: active ? 'white' : 'rgba(255,255,255,0.6)',
                background: active ? 'rgba(37,99,235,0.35)' : 'transparent',
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {active && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: '#3b82f6', borderRadius: '0 4px 4px 0' }} />}
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.75rem 8px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', width: '100%', textAlign: 'right' }}>
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          {isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
        </button>
        <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#f87171', fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', width: '100%', textAlign: 'right' }}>
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </div>
    </>
  );

  return (
    <div dir="rtl" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: t.background.page, fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside style={{
        width: 240, height: '100vh', background: '#051A3A',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', right: 0, top: 0, zIndex: 20,
      }}>
        <SidebarContent />
      </aside>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
          <aside style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 260, background: '#051A3A', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => setMobileOpen(false)} style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'white', display: 'flex', padding: 6 }}>
              <X size={16} />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginRight: 240, height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <header style={{ height: 56, background: t.background.card, borderBottom: `1px solid ${t.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
          <button onClick={() => setMobileOpen(true)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: t.text.muted, padding: 4, borderRadius: 6 }} className="md-menu-btn">
            <Menu size={20} />
          </button>
          {/* Page title — no duplication with content */}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: t.text.primary }}>{PAGE_TITLES[currentPage]}</span>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 800, overflow: 'hidden' }}>
            {vendor?.profile_image ? <img src={vendor.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {currentPage === 'dashboard'  && <VendorDashboard />}
          {currentPage === 'profile'    && <VendorProfile />}
          {currentPage === 'projects'   && <VendorProjects />}
          {currentPage === 'invoices'   && <VendorInvoices />}
          {currentPage === 'equipment'  && <VendorEquipmentPage />}
          {currentPage === 'documents'  && <VendorDocumentsPage />}
        </main>
      </div>

      {/* Mobile sidebar visibility fix */}
      <style>{`
        @media (max-width: 768px) {
          .md-menu-btn { display: flex !important; }
          aside[style*="position: fixed"][style*="right: 0"][style*="width: 240px"] { display: none !important; }
          div[style*="margin-right: 240px"] { margin-right: 0 !important; }
        }
      `}</style>
    </div>
  );
};
