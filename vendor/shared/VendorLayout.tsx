import { useState } from 'react';
import {
  LayoutDashboard, User, FolderOpen, FileText,
  Camera, FileArchive, LogOut, Menu, X, Sun, Moon,
} from 'lucide-react';
import { useVendor } from '../../../contexts/VendorContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getTheme } from '../../../theme/tokens';

export type VendorPage =
  | 'dashboard' | 'profile' | 'projects'
  | 'invoices'  | 'equipment' | 'documents';

interface VendorLayoutProps {
  page: VendorPage;
  onNavigate: (p: VendorPage) => void;
  children: React.ReactNode;
}

const NAV: { id: VendorPage; label: string; icon: any }[] = [
  { id: 'dashboard',  label: 'لوحة التحكم',         icon: LayoutDashboard },
  { id: 'profile',    label: 'الملف الشخصي',          icon: User            },
  { id: 'projects',   label: 'مشاريعي',               icon: FolderOpen      },
  { id: 'invoices',   label: 'الفواتير والمدفوعات',   icon: FileText        },
  { id: 'equipment',  label: 'المعدات',                icon: Camera          },
  { id: 'documents',  label: 'المستندات',              icon: FileArchive     },
];

const PAGE_TITLES: Record<VendorPage, string> = {
  dashboard:  'لوحة التحكم',
  profile:    'الملف الشخصي',
  projects:   'مشاريعي',
  invoices:   'الفواتير والمدفوعات',
  equipment:  'المعدات',
  documents:  'المستندات',
};

export const VendorLayout = ({ page, onNavigate, children }: VendorLayoutProps) => {
  const { vendor, signOut } = useVendor();
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = getTheme(isDarkMode);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = vendor?.full_name
    ?.split(' ').slice(0, 2).map(w => w[0]).join('') || '؟';

  const navigate = (p: VendorPage) => { onNavigate(p); setMobileOpen(false); };

  const sidebar = (
    <div style={{
      width: 248, height: '100%', display: 'flex', flexDirection: 'column',
      background: '#051A3A', overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <img src="/half_lens_logo_-_color.png" alt="هاف لينس" style={{ height: 28, objectFit: 'contain' }} />
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Vendor card */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {vendor?.profile_image ? (
            <img src={vendor.profile_image} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 800, color: 'white',
            }}>{initials}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {vendor?.full_name || '—'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              {vendor?.primary_city || 'مورد'}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>حساب نشط</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(item => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 9, width: '100%',
                background: active ? 'rgba(37,99,235,0.18)' : 'transparent',
                border: `1px solid ${active ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
                color: active ? '#93c5fd' : 'rgba(255,255,255,0.45)',
                fontFamily: 'Tajawal, sans-serif', fontSize: '0.84rem',
                fontWeight: active ? 700 : 400, cursor: 'pointer',
                textAlign: 'right', transition: 'all 0.18s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as any).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as any).style.background = 'transparent'; }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 9, width: '100%',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.45)', fontFamily: 'Tajawal, sans-serif',
            fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', textAlign: 'right',
          }}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          {isDarkMode ? 'الوضع المضيء' : 'الوضع الداكن'}
        </button>
        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 9, width: '100%',
            background: 'transparent', border: 'none',
            color: '#f87171', fontFamily: 'Tajawal, sans-serif',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right',
          }}
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );

  return (
    <div dir="rtl" style={{
      minHeight: '100vh', display: 'flex',
      background: theme.background.page,
      fontFamily: 'Tajawal, sans-serif', color: theme.text.primary,
    }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex" style={{ width: 248, flexShrink: 0, height: '100vh', position: 'sticky', top: 0 }}>
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }}
          />
          <aside className="md:hidden" style={{
            position: 'fixed', top: 0, right: 0, width: 248, height: '100vh', zIndex: 50, display: 'flex',
          }}>
            {sidebar}
          </aside>
        </>
      )}

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          height: '3.5rem', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: `1px solid ${theme.border.default}`,
          background: theme.background.card,
        }}>
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.secondary, display: 'flex' }}
          >
            <Menu size={22} />
          </button>
          {/* Title only on mobile - desktop shows nothing (no duplicate) */}
          <span className="md:hidden" style={{ fontSize: '0.95rem', fontWeight: 700, color: theme.text.primary }}>
            {PAGE_TITLES[page]}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.secondary, display: 'flex', padding: '6px' }}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 800, color: 'white', flexShrink: 0,
            }}>{initials}</div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
