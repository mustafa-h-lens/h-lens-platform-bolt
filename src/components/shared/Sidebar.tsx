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
  Lock,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
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
  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
  const [pendingVendorCount, setPendingVendorCount] = useState(0);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPendingVendorCount();
      const interval = setInterval(fetchPendingVendorCount, 60000); // refresh every minute
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin]);

  const fetchPendingVendorCount = async () => {
    try {
      const { count } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_approval', 'revision_requested']);
      setPendingVendorCount(count || 0);
    } catch {}
  };

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'clients', label: 'العملاء', icon: Users, adminOnly: false },
    { id: 'vendors', label: 'الموردين', icon: Briefcase, adminOnly: false, badge: pendingVendorCount },
    { id: 'projects', label: 'المشاريع', icon: FolderOpen },
    { id: 'expenses', label: 'المصروفات', icon: DollarSign },
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

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin': return 'مدير عام';
      case 'project_manager': return 'مدير مشاريع';
      default: return '';
    }
  };

  const renderNavItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    const isLocked = item.comingSoon;

    return (
      <button
        key={item.id}
        onClick={() => !isLocked && handleItemClick(item.id)}
        disabled={isLocked}
        title={collapsed ? item.label : undefined}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right
          transition-all duration-200 group relative
          ${collapsed ? 'justify-center px-0' : 'justify-between'}
          ${isLocked
            ? 'opacity-60 cursor-not-allowed'
            : isActive
              ? 'bg-[#113975] text-white'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }
        `}
      >
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          {isActive && !isLocked && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1B4FA9] rounded-r-full" />
          )}
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">{item.label}</span>}
        </div>
        {!collapsed && isLocked && (
          <span className="px-2.5 py-1 rounded-full text-[9px] leading-none font-semibold bg-white/10 text-white/40">
            قريباً
          </span>
        )}
        {!collapsed && !isLocked && item.badge && item.badge > 0 ? (
          <span className="flex items-center justify-center rounded-full text-[11px] font-bold bg-amber-500 text-white min-w-[22px] h-[22px] px-1.5">
            {item.badge}
          </span>
        ) : null}
        {collapsed && item.badge && item.badge > 0 ? (
          <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center justify-center">
            {item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 right-0 h-full bg-[#051A3A] dark:bg-[#0A0F1A] text-white z-50
        transform transition-all duration-300 ease-in-out
        ${collapsed ? 'md:w-20' : 'md:w-64'} w-64
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo section */}
          <div className={`flex items-center border-b border-white/10 ${collapsed ? 'justify-center p-4' : 'justify-between p-6'}`}>
            <div className="flex items-center gap-3">
              <img
                src="/assets/logo-white.png"
                alt="Half Lens Production"
                className={`w-auto object-contain ${collapsed ? 'h-8' : 'h-14'}`}
              />
            </div>
            <button
              onClick={onClose}
              className="md:hidden text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex absolute top-20 -left-3 w-6 h-6 rounded-full bg-white text-slate-600
              items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.2)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:text-slate-800 transition-all z-50"
          >
            {collapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6">
            <div className={`space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
              {menuItems.map((item) => {
                if (item.adminOnly && !isSuperAdmin) return null;
                return renderNavItem(item);
              })}
            </div>

            {isSuperAdmin && (
              <>
                <div className={`py-3 mt-4 ${collapsed ? 'px-2' : 'px-6'}`}>
                  {collapsed ? (
                    <div className="border-t border-white/10" />
                  ) : (
                    <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">
                      إدارة
                    </p>
                  )}
                </div>
                <div className={`space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
                  {adminItems.map((item) => renderNavItem(item))}
                </div>
              </>
            )}
          </nav>

          {/* Bottom section: dark mode + user info + sign out */}
          <div className="border-t border-white/10 p-3 space-y-1">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              title={collapsed ? (themeMode === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح') : undefined}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                text-white/70 hover:text-white hover:bg-white/5
                transition-colors duration-200
                ${collapsed ? 'justify-center px-0' : ''}
              `}
            >
              {themeMode === 'light' ? (
                <Moon className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Sun className="w-5 h-5 flex-shrink-0" />
              )}
              {!collapsed && <span className="font-medium text-sm">{themeMode === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}</span>}
            </button>

            {/* User info */}
            <div className={`
              flex items-center gap-3 px-4 py-3 rounded-lg
              ${collapsed ? 'justify-center px-0' : ''}
            `}>
              <div className="w-9 h-9 rounded-full bg-[#1B4FA9] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{getInitials(profile?.full_name)}</span>
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
                  <p className="text-xs text-white/50 truncate">{getRoleLabel(profile?.role)}</p>
                  <p className="text-xs text-white/40 truncate">{profile?.email}</p>
                </div>
              )}
            </div>

            {/* Sign out */}
            <button
              onClick={signOut}
              title={collapsed ? 'تسجيل الخروج' : undefined}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right
                text-red-400 hover:bg-red-500/10 transition-colors duration-200
                ${collapsed ? 'justify-center px-0' : ''}
              `}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">تسجيل الخروج</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
