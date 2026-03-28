import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Folder, FileText,
  LogOut, Menu, X, Sun, Moon, ChevronLeft, ChevronRight, User,
} from 'lucide-react';
import { useClientPortal, ClientPage } from '../../contexts/ClientPortalContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ClientDashboardHome } from './ClientDashboardHome';
import { ClientProjectView } from './ClientProjectView';
import { ClientInvoices } from './ClientInvoices';
import { ClientProjectsList } from './ClientProjectsList';
import { ErrorBoundary } from '../shared/ErrorBoundary';

const NAV_ITEMS: { id: ClientPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'projects',  label: 'مشاريعي',  icon: Folder },
  { id: 'invoices',  label: 'الفواتير',  icon: FileText },
];

export const ClientPortal = () => {
  const { client, currentPage, navigateTo, signOut } = useClientPortal();
  const { theme: themeMode, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleNavigate = (page: ClientPage) => {
    setSelectedProjectId(null);
    navigateTo(page);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleViewProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    navigateTo('projects');
  };

  const renderPage = () => {
    if (currentPage === 'projects' && selectedProjectId) {
      return <ClientProjectView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
    }
    switch (currentPage) {
      case 'dashboard': return <ClientDashboardHome onViewProject={handleViewProject} />;
      case 'projects':  return <ClientProjectsList onViewProject={handleViewProject} />;
      case 'invoices':  return <ClientInvoices />;
      default: return <ClientDashboardHome onViewProject={handleViewProject} />;
    }
  };

  const sidebarMargin = sidebarCollapsed ? 'md:mr-[68px]' : 'md:mr-60';

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar fixed top-0 right-0 h-full z-50 transform transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'md:w-[68px]' : 'md:w-60'} w-60
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
        style={{ overflow: 'visible' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: sidebarCollapsed ? '14px 8px' : '14px 10px' }}>
          {/* Logo */}
          <div className="sb-hl-logo" style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', padding: 0, marginBottom: sidebarCollapsed ? 14 : 20 }}>
            <img
              src="/assets/logo-white.png"
              alt="Half Lens"
              className="sb-logo-img sb-logo-white"
              style={{ height: sidebarCollapsed ? 30 : 100, width: 'auto', objectFit: 'contain', maxWidth: sidebarCollapsed ? 44 : undefined }}
            />
            <img
              src="/assets/logo-blue.png"
              alt="Half Lens"
              className="sb-logo-img sb-logo-blue"
              style={{ height: sidebarCollapsed ? 30 : 100, width: 'auto', objectFit: 'contain', maxWidth: sidebarCollapsed ? 44 : undefined }}
            />
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 'auto' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex"
            style={{
              position: 'absolute', top: 56, left: -13,
              width: 26, height: 26, borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#fff',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px rgba(37,99,235,0.35), 0 2px 4px rgba(0,0,0,0.25)',
              border: '2px solid rgba(255,255,255,0.12)',
              zIndex: 60, cursor: 'pointer', transition: 'var(--transition-fast)',
            }}
          >
            {sidebarCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </button>

          {/* Navigation */}
          <nav style={{ flex: 1, overflowY: 'auto' }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id && !(item.id === 'projects' && selectedProjectId);
              return (
                <div
                  key={item.id}
                  className={`sb-item ${isActive ? 'on' : ''}`}
                  onClick={() => handleNavigate(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  style={sidebarCollapsed ? { justifyContent: 'center' } : undefined}
                >
                  <Icon />
                  {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                </div>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="sb-bottom">
            {/* Theme toggle */}
            {sidebarCollapsed ? (
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

            {/* Client info */}
            {sidebarCollapsed ? (
              <div className="sb-item" style={{ justifyContent: 'center' }} title={client?.name}>
                <div className="avatar av-sm" style={{ background: 'var(--accent-glow)', color: 'var(--accent-lighter)', fontSize: 10, width: 28, height: 28 }}>
                  {client?.name?.charAt(0) || '?'}
                </div>
              </div>
            ) : (
              <div className="sb-user-profile">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="u-name" style={{ fontSize: 13 }}>{client?.name}</div>
                  <div className="u-role">عميل</div>
                </div>
                <div className="avatar av-md" style={{ background: 'var(--accent-glow)', color: 'var(--accent-lighter)', fontSize: 12, overflow: 'hidden' }}>
                  {client?.client_image ? (
                    <img src={client.client_image} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    client?.name?.charAt(0) || '?'
                  )}
                </div>
              </div>
            )}

            {/* Sign out */}
            <div className="sb-item sb-logout" onClick={signOut} title={sidebarCollapsed ? 'تسجيل الخروج' : undefined} style={sidebarCollapsed ? { justifyContent: 'center' } : undefined}>
              <LogOut />
              {!sidebarCollapsed && <span>تسجيل الخروج</span>}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 right-4 z-30 md:hidden btn btn-secondary btn-icon"
        >
          <Menu size={20} />
        </button>

        <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-base)' }} dir="rtl">
          <div style={{ padding: 28 }}>
            <ErrorBoundary>
              {renderPage()}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
