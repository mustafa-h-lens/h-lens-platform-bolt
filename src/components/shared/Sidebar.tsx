import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Settings,
  UserCog,
  LogOut,
  X,
  Briefcase,
  DollarSign,
  Activity,
  Lightbulb,
  Lock,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { supabase } from '../../lib/supabaseClient';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  comingSoon?: boolean;
  badge?: number;
}

export const Sidebar = ({ currentPage, onNavigate, isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) => {
  const { profile, signOut } = useAuth();
  const { theme: themeMode, toggleTheme } = useTheme();
  const { hasAccess, isSuperAdmin, roleName } = usePermissions();
  const [pendingVendorCount, setPendingVendorCount] = useState(0);
  const [newSuggestionsCount, setNewSuggestionsCount] = useState(0);

  useEffect(() => {
    if (hasAccess('vendors')) {
      fetchPendingVendorCount();
    }
    if (hasAccess('suggestions')) {
      fetchNewSuggestionsCount();
    }
    const interval = setInterval(() => {
      if (hasAccess('vendors')) fetchPendingVendorCount();
      if (hasAccess('suggestions')) fetchNewSuggestionsCount();
    }, 60000);
    return () => clearInterval(interval);
  }, [hasAccess]);

  const fetchPendingVendorCount = async () => {
    try {
      const { count } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_approval', 'revision_requested']);
      setPendingVendorCount(count || 0);
    } catch {}
  };

  const fetchNewSuggestionsCount = async () => {
    try {
      const { count } = await supabase
        .from('vendor_suggestions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'under_review']);
      setNewSuggestionsCount(count || 0);
    } catch {}
  };

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'clients', label: 'العملاء', icon: Users, adminOnly: false },
    { id: 'vendors', label: 'الموردين', icon: Briefcase, adminOnly: false, badge: pendingVendorCount },
    { id: 'projects', label: 'المشاريع', icon: FolderOpen },
    { id: 'expenses', label: 'المصروفات', icon: DollarSign },
    { id: 'suggestions', label: 'الاقتراحات', icon: Lightbulb, badge: newSuggestionsCount },
    { id: 'reports', label: 'التقارير', icon: BarChart3, comingSoon: true },
  ];

  const adminItems: MenuItem[] = [
    { id: 'activity', label: 'سجل النشاط', icon: Activity },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
    { id: 'users', label: 'إدارة المستخدمين', icon: UserCog },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getRoleLabel = () => {
    return roleName || '';
  };

  const renderNavItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    const isLocked = item.comingSoon;

    return (
      <div
        key={item.id}
        className={`sb-item ${isActive ? 'on' : ''}`}
        onClick={() => !isLocked && handleItemClick(item.id)}
        title={collapsed ? item.label : undefined}
        style={collapsed ? {
          justifyContent: 'center', position: 'relative',
          opacity: isLocked ? 0.5 : 1, cursor: isLocked ? 'not-allowed' : 'pointer',
        } : {
          opacity: isLocked ? 0.5 : 1, cursor: isLocked ? 'not-allowed' : 'pointer',
        }}
      >
        <Icon />
        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
        {!collapsed && isLocked && <Lock style={{ width: 12, height: 12, opacity: 0.4 }} />}
        {!collapsed && !isLocked && item.badge && item.badge > 0 && (
          <span className="sb-badge">{item.badge}</span>
        )}
        {collapsed && item.badge && item.badge > 0 && (
          <span className="sb-badge" style={{
            position: 'absolute', top: -2, left: -2,
            fontSize: 9, padding: '0 5px', minWidth: 16, height: 16,
          }}>
            {item.badge}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar fixed top-0 right-0 h-full z-50 transform transition-all duration-300 ease-in-out
          ${collapsed ? 'md:w-[68px]' : 'md:w-60'} w-60
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
        style={{ overflow: 'visible' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: collapsed ? '14px 8px' : '14px 10px' }}>
        {/* Logo */}
        <div className="sb-hl-logo" style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', padding: 0, marginBottom: collapsed ? 14 : 20 }}>
          <img
            src="/assets/logo-white.png"
            alt="Half Lens"
            className="sb-logo-img sb-logo-white"
            style={{ height: collapsed ? 30 : 100, width: 'auto', objectFit: 'contain', maxWidth: collapsed ? 44 : undefined }}
          />
          <img
            src="/assets/logo-blue.png"
            alt="Half Lens"
            className="sb-logo-img sb-logo-blue"
            style={{ height: collapsed ? 30 : 100, width: 'auto', objectFit: 'contain', maxWidth: collapsed ? 44 : undefined }}
          />
          {!collapsed && (
            <button
              onClick={onClose}
              className="md:hidden"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 'auto' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex"
          style={{
            position: 'absolute', top: 56, left: -13,
            width: 26, height: 26, borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#fff',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 10px rgba(37,99,235,0.35), 0 2px 4px rgba(0,0,0,0.25)',
            border: '2px solid rgba(255,255,255,0.12)',
            zIndex: 60, cursor: 'pointer',
            transition: 'var(--transition-fast)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {collapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {menuItems.map((item) => {
            if (!hasAccess(item.id as any)) return null;
            return renderNavItem(item);
          })}

          {/* Admin section: show if user has access to any admin item */}
          {adminItems.some(item => hasAccess(item.id as any)) && (
            <>
              {collapsed ? (
                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '8px 4px' }} />
              ) : (
                <div className="sb-grp">إدارة</div>
              )}
              {adminItems.map((item) => {
                if (!hasAccess(item.id as any)) return null;
                return renderNavItem(item);
              })}
            </>
          )}
        </nav>

        {/* Bottom section */}
        <div className="sb-bottom">
          {/* Theme toggle */}
          {collapsed ? (
            <div className="sb-item" onClick={toggleTheme} title={themeMode === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'} style={{ justifyContent: 'center' }}>
              {themeMode === 'light' ? <Moon /> : <Sun />}
            </div>
          ) : (
            <div className="sb-theme-toggle-row">
              <div className="theme-toggle">
                <button className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`} onClick={() => themeMode !== 'light' && toggleTheme()}>
                  <Sun size={13} />
                </button>
                <button className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`} onClick={() => themeMode !== 'dark' && toggleTheme()}>
                  <Moon size={13} />
                </button>
              </div>
            </div>
          )}

          {/* User profile */}
          {collapsed ? (
            <div className="sb-item" style={{ justifyContent: 'center', cursor: 'pointer' }} title={profile?.full_name} onClick={() => onNavigate('profile')}>
              <div className="avatar av-sm" style={{ background: 'var(--accent-glow)', color: 'var(--accent-lighter)', fontSize: 10, width: 28, height: 28 }}>
                {getInitials(profile?.full_name)}
              </div>
            </div>
          ) : (
            <div className="sb-user-profile" style={{ cursor: 'pointer' }} onClick={() => onNavigate('profile')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="u-name" style={{ fontSize: 13 }}>{profile?.full_name}</div>
                <div className="u-role">{getRoleLabel()}</div>
              </div>
              <div className="avatar av-md" style={{ background: 'var(--accent-glow)', color: 'var(--accent-lighter)', fontSize: 12 }}>
                {getInitials(profile?.full_name)}
              </div>
            </div>
          )}

          {/* Sign out */}
          <div className="sb-item sb-logout" onClick={signOut} title={collapsed ? 'تسجيل الخروج' : undefined} style={collapsed ? { justifyContent: 'center' } : undefined}>
            <LogOut />
            {!collapsed && <span>تسجيل الخروج</span>}
          </div>
        </div>
        </div>
      </aside>
    </>
  );
};
