import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  File,
  Settings,
  UserCog,
  LogOut,
  X,
  Briefcase,
  Lock,
  DollarSign,
  BarChart3,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  comingSoon?: boolean;
}

export const Sidebar = ({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) => {
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'clients', label: 'العملاء', icon: Users, adminOnly: false },
    { id: 'vendors', label: 'الموردين', icon: Briefcase, adminOnly: false },
    { id: 'projects', label: 'المشاريع', icon: FolderOpen },
    { id: 'invoices', label: 'الفواتير', icon: FileText, comingSoon: true },
    { id: 'expenses', label: 'المصروفات', icon: DollarSign, comingSoon: true },
    { id: 'reports', label: 'التقارير', icon: BarChart3, comingSoon: true },
    { id: 'files', label: 'الملفات', icon: File, comingSoon: true },
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

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 right-0 h-full w-64 bg-[#051A3A] dark:bg-[#0A0F1A] text-white z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1B4FA9] rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">نظام الفواتير</span>
            </div>
            <button
              onClick={onClose}
              className="md:hidden text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6">
            <div className="space-y-1 px-3">
              {menuItems.map((item) => {
                if (item.adminOnly && !isAdmin) return null;

                const Icon = item.icon;
                const isActive = currentPage === item.id;
                const isLocked = item.comingSoon;

                return (
                  <button
                    key={item.id}
                    onClick={() => !isLocked && handleItemClick(item.id)}
                    disabled={isLocked}
                    className={`
                      w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-right
                      transition-all duration-200 group relative
                      ${isLocked
                        ? 'opacity-40 cursor-not-allowed'
                        : isActive
                          ? 'bg-[#113975] text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {isActive && !isLocked && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1B4FA9] rounded-r-full" />
                      )}
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {isLocked && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">Coming Soon</span>
                        <Lock className="w-4 h-4 text-white/50" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <>
                <div className="px-6 py-3 mt-4">
                  <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">
                    إدارة
                  </p>
                </div>
                <div className="space-y-1 px-3">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    const isLocked = item.comingSoon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => !isLocked && handleItemClick(item.id)}
                        disabled={isLocked}
                        className={`
                          w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-right
                          transition-all duration-200 group relative
                          ${isLocked
                            ? 'opacity-40 cursor-not-allowed'
                            : isActive
                              ? 'bg-[#113975] text-white'
                              : 'text-white/70 hover:text-white hover:bg-white/5'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {isActive && !isLocked && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1B4FA9] rounded-r-full" />
                          )}
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {isLocked && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/50">Coming Soon</span>
                            <Lock className="w-4 h-4 text-white/50" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right
                text-red-400 hover:bg-red-500/10 transition-colors duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
