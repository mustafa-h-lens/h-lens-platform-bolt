import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { FolderOpen, Users, FileText, Wallet, CreditCard, Sparkles, Menu } from 'lucide-react';
import { Sidebar } from '../shared/Sidebar';
import { ProjectsList } from './projects/ProjectsList';
import { UserManagement } from './UserManagement';
import { ClientsPage } from './clients/ClientsPage';
import { VendorsPage } from './vendors/VendorsPage';
import { SettingsPage } from './settings/SettingsPage';
import { ClientDetails } from './clients/ClientDetails';
import { ImprovedProjectDetails } from './projects/ImprovedProjectDetails';
import { EnhancedProjectsPage } from './projects/EnhancedProjectsPage';
import { CreateProjectModal } from './projects/CreateProjectModal';
import { formatNumber, formatCurrency } from '../../lib/formatters';
import { ExpensesPage } from './expenses/ExpensesPage';
import { ActivityLogPage } from './ActivityLogPage';

const VALID_PAGES = ['dashboard', 'projects', 'clients', 'vendors', 'expenses', 'users', 'settings', 'activity'];

const parseHash = (): { page: string; id: string | null; tab: string | null } => {
  const hash = window.location.hash.slice(1); // remove '#'
  const segments = hash.split('/');
  const page = VALID_PAGES.includes(segments[0]) ? segments[0] : 'dashboard';

  // For settings: #settings/tab-name (no entity id)
  if (page === 'settings') {
    return { page, id: null, tab: segments[1] || null };
  }

  // For detail pages: #page/entityId/tab
  return {
    page,
    id: segments[1] || null,
    tab: segments[2] || null,
  };
};

interface Stats {
  totalProjects: number;
  activeProjects: number;
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
}

const SUPER_ADMIN_ONLY_PAGES = ['users', 'settings', 'activity'];

export const NewAdminDashboard = () => {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
  const initialHash = parseHash();

  // Redirect project_manager away from super_admin-only pages
  if (!isSuperAdmin && SUPER_ADMIN_ONLY_PAGES.includes(initialHash.page)) {
    initialHash.page = 'dashboard';
  }
  const [currentPage, setCurrentPage] = useState(initialHash.page);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialHash.page === 'projects' ? initialHash.id : null
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initialHash.page === 'clients' ? initialHash.id : null
  );
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    initialHash.page === 'vendors' ? initialHash.id : null
  );
  const [activeSubTab, setActiveSubTab] = useState<string | null>(initialHash.tab);
  const [clientView, setClientView] = useState<'dashboard' | 'projects' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [reloadProjectsCallback, setReloadProjectsCallback] = useState<(() => void) | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeProjects: 0,
    totalClients: 0,
    totalInvoices: 0,
    totalRevenue: 0,
  });

  // Sync hash to URL whenever navigation state changes
  useEffect(() => {
    let hash = currentPage;
    if (currentPage === 'settings' && activeSubTab) {
      hash = `settings/${activeSubTab}`;
    } else if (currentPage === 'projects' && selectedProjectId) {
      hash = activeSubTab
        ? `projects/${selectedProjectId}/${activeSubTab}`
        : `projects/${selectedProjectId}`;
    } else if (currentPage === 'clients' && selectedClientId) {
      hash = activeSubTab
        ? `clients/${selectedClientId}/${activeSubTab}`
        : `clients/${selectedClientId}`;
    } else if (currentPage === 'vendors' && selectedVendorId) {
      hash = activeSubTab
        ? `vendors/${selectedVendorId}/${activeSubTab}`
        : `vendors/${selectedVendorId}`;
    }
    const newHash = `#${hash}`;
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  }, [currentPage, selectedProjectId, selectedClientId, selectedVendorId, activeSubTab]);

  // Listen for browser back/forward
  const handleHashChange = useCallback(() => {
    const { page, id, tab } = parseHash();
    // Block project_manager from super_admin-only pages
    const safePage = (!isSuperAdmin && SUPER_ADMIN_ONLY_PAGES.includes(page)) ? 'dashboard' : page;
    setCurrentPage(safePage);
    setSelectedProjectId(safePage === 'projects' ? id : null);
    setSelectedClientId(safePage === 'clients' ? id : null);
    setSelectedVendorId(safePage === 'vendors' ? id : null);
    setActiveSubTab(tab);
    if (safePage !== 'clients') setClientView(null);
  }, [isSuperAdmin]);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  useEffect(() => {
    loadStats();
  }, []);

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
    setSelectedProjectId(null);
    setSelectedClientId(null);
    setSelectedVendorId(null);
    setActiveSubTab(null);
    setClientView(null);
  };

  const handleViewVendor = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setSelectedProjectId(null);
    setCurrentPage('vendors');
  };

  const loadStats = async () => {
    try {
      const [projectsRes, clientsRes, invoicesRes] = await Promise.all([
        supabase.from('projects').select('id, status', { count: 'exact' }),
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('invoices').select('total_amount, paid_amount'),
      ]);

      const activeProjects = projectsRes.data?.filter(p =>
        ['request', 'quoted', 'invoiced', 'po_issued', 'in_progress'].includes(p.status)
      ).length || 0;

      const totalRevenue = invoicesRes.data?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;

      setStats({
        totalProjects: projectsRes.count || 0,
        activeProjects,
        totalClients: clientsRes.count || 0,
        totalInvoices: invoicesRes.data?.length || 0,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const sidebarMargin = sidebarCollapsed ? 'md:mr-20' : 'md:mr-64';

  const mobileMenuButton = (
    <button
      onClick={() => setSidebarOpen(true)}
      className="fixed top-4 right-4 z-30 md:hidden p-2 rounded-xl bg-white dark:bg-dark-card shadow-lg border border-slate-200 dark:border-dark-border"
    >
      <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
    </button>
  );

  if (selectedProjectId) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
        <Sidebar
          currentPage="projects"
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto">
            <ImprovedProjectDetails
              projectId={selectedProjectId}
              onBack={() => { setSelectedProjectId(null); setActiveSubTab(null); }}
              onViewVendor={handleViewVendor}
              initialTab={activeSubTab}
              onTabChange={setActiveSubTab}
            />
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'users') {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto">
            <UserManagement onBack={() => setCurrentPage('dashboard')} />
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'vendors') {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto p-6">
            <VendorsPage
              initialVendorId={selectedVendorId}
              onVendorSelect={setSelectedVendorId}
              initialTab={activeSubTab}
              onTabChange={setActiveSubTab}
            />
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'settings') {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto bg-slate-50 dark:bg-dark-bg">
            <SettingsPage initialTab={activeSubTab} onTabChange={setActiveSubTab} />
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'activity') {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto">
            <ActivityLogPage />
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'clients') {
    if (selectedClientId) {
      return (
        <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigation}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          />
          <div className={`flex-1 flex flex-col ${sidebarMargin}`}>
            {mobileMenuButton}
            <main className="flex-1 overflow-auto">
              <ClientDetails
                clientId={selectedClientId}
                onBack={() => {
                  setSelectedClientId(null);
                  setClientView(null);
                  setActiveSubTab(null);
                }}
                onViewProject={(projectId) => {
                  setSelectedProjectId(projectId);
                  setActiveSubTab(null);
                }}
                initialTab={activeSubTab}
                onTabChange={setActiveSubTab}
              />
            </main>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto">
            <ClientsPage
              onViewClient={(clientId) => {
                setSelectedClientId(clientId);
              }}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      <div className={`flex-1 flex flex-col ${sidebarMargin}`}>
        {mobileMenuButton}

        <main className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-dark-bg" dir="rtl">
          {currentPage === 'dashboard' && (
            <div className="space-y-6">
              <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9] rounded-[32px] p-8 text-white shadow-2xl border border-white/20">
                <div className="relative z-10 flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm
                    border border-white/30 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-1">مرحباً، {profile?.full_name}</h2>
                    <p className="text-white/90 text-base">إليك نظرة سريعة على أداء المشاريع والعمليات</p>
                  </div>
                </div>
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                  <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white rounded-full blur-3xl"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="group relative overflow-hidden backdrop-blur-xl bg-white/60 dark:bg-dark-card dark:backdrop-blur-none
                  rounded-[24px] p-6 shadow-xl border border-white/60 dark:border-dark-border
                  hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl border flex items-center justify-center
                        group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
                        <Wallet className="w-7 h-7" style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">الإيرادات</p>
                      <p className="text-3xl font-bold bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9] bg-clip-text text-transparent" dir="ltr">
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-200 dark:border-dark-border pt-3">المحصّل</p>
                  </div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)' }}></div>
                </div>

                <div className="group relative overflow-hidden backdrop-blur-xl bg-white/60 dark:bg-dark-card dark:backdrop-blur-none
                  rounded-[24px] p-6 shadow-xl border border-white/60 dark:border-dark-border
                  hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl border flex items-center justify-center
                        group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
                        <CreditCard className="w-7 h-7" style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">الفواتير</p>
                      <p className="text-3xl font-bold bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9] bg-clip-text text-transparent" dir="ltr">
                        {formatNumber(stats.totalInvoices)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-200 dark:border-dark-border pt-3">إجمالي الفواتير</p>
                  </div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)' }}></div>
                </div>

                <div className="group relative overflow-hidden backdrop-blur-xl bg-white/60 dark:bg-dark-card dark:backdrop-blur-none
                  rounded-[24px] p-6 shadow-xl border border-white/60 dark:border-dark-border
                  hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl border flex items-center justify-center
                        group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
                        <Users className="w-7 h-7" style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">العملاء</p>
                      <p className="text-3xl font-bold bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9] bg-clip-text text-transparent" dir="ltr">
                        {formatNumber(stats.totalClients)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-200 dark:border-dark-border pt-3">إجمالي العملاء</p>
                  </div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)' }}></div>
                </div>

                <div className="group relative overflow-hidden backdrop-blur-xl bg-white/60 dark:bg-dark-card dark:backdrop-blur-none
                  rounded-[24px] p-6 shadow-xl border border-white/60 dark:border-dark-border
                  hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl border flex items-center justify-center
                        group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
                        <FolderOpen className="w-7 h-7" style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">المشاريع</p>
                      <p className="text-3xl font-bold bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9] bg-clip-text text-transparent" dir="ltr">
                        {formatNumber(stats.totalProjects)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-200 dark:border-dark-border pt-3">
                      {formatNumber(stats.activeProjects)} مشروع نشط
                    </p>
                  </div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)' }}></div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl border"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
                      <FolderOpen className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">المشاريع الأخيرة</h2>
                  </div>
                  <button
                    onClick={() => setCurrentPage('projects')}
                    className="text-sm font-medium transition-all hover:opacity-70"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    عرض جميع المشاريع
                  </button>
                </div>

                <div className="backdrop-blur-xl bg-white/60 dark:bg-dark-card dark:backdrop-blur-none rounded-[32px] shadow-xl border border-white/60 dark:border-dark-border
                  overflow-hidden hover:shadow-2xl transition-all duration-300">
                  <div className="p-6">
                    <ProjectsList
                      onSelectProject={setSelectedProjectId}
                      onCreateProject={() => setShowCreateProjectModal(true)}
                      onLoadProjects={(loadFn) => setReloadProjectsCallback(() => loadFn)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        {currentPage === 'projects' && (
  <div className="space-y-6">
    <EnhancedProjectsPage
      onSelectProject={setSelectedProjectId}
      onCreateProject={() => setShowCreateProjectModal(true)}
    />
  </div>
)}

{currentPage === 'expenses' && (
  <div className="space-y-6">
    <ExpensesPage onViewProject={setSelectedProjectId} />
  </div>
)}
        </main>
      </div>

      {showCreateProjectModal && (
        <CreateProjectModal
          onClose={() => setShowCreateProjectModal(false)}
          onSuccess={() => {
            setShowCreateProjectModal(false);
            if (reloadProjectsCallback) {
              reloadProjectsCallback();
            }
            loadStats();
          }}
        />
      )}
    </div>
  );
};
