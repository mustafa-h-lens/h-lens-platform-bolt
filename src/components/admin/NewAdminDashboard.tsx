import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { FolderOpen, Users, FileText, Wallet, CreditCard, Sparkles } from 'lucide-react';
import { Sidebar } from '../shared/Sidebar';
import { Header } from '../shared/Header';
import { ProjectsList } from './ProjectsList';
import { ProjectDetails } from './ProjectDetails';
import { UserManagement } from './UserManagement';
import { ClientsPage } from './ClientsPage';
import { VendorsPage } from './VendorsPage';
import { SettingsPage } from './SettingsPage';
import { ClientDetails } from './ClientDetails';
import { ImprovedProjectDetails } from './ImprovedProjectDetails';
import { EnhancedProjectsPage } from './EnhancedProjectsPage';
import { ActivityLogPage } from './ActivityLogPage';
import { ExpensesPage } from './ExpensesPage';
import { CreateProjectModal } from './CreateProjectModal';
import { formatNumber, formatCurrency } from '../../lib/formatters';
import { useRouter, navigate, parsePath } from '../../lib/router';

interface Stats {
  totalProjects: number;
  activeProjects: number;
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
}

export const NewAdminDashboard = () => {
  const { profile } = useAuth();
  const { pathname } = useRouter();
  const segments = parsePath(pathname);

  // Derive all navigation state from URL
  const currentPage = segments[0] || 'dashboard';
  const selectedProjectId = currentPage === 'projects' && segments[1] ? segments[1] : null;
  const selectedClientId = currentPage === 'clients' && segments[1] ? segments[1] : null;
  const selectedVendorId = currentPage === 'vendors' && segments[1] ? segments[1] : null;
  const settingsTab = currentPage === 'settings' ? segments[1] || undefined : undefined;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [reloadProjectsCallback, setReloadProjectsCallback] = useState<(() => void) | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeProjects: 0,
    totalClients: 0,
    totalInvoices: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const handleNavigation = (page: string) => {
    const path = page === 'dashboard' ? '/' : '/' + page;
    navigate(path);
  };

  const handleViewVendor = (vendorId: string) => {
    navigate('/vendors/' + vendorId);
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

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'الرئيسية';
      case 'clients': return 'العملاء';
      case 'vendors': return 'الموردين';
      case 'projects': return 'المشاريع';
      case 'invoices': return 'الفواتير';
      case 'expenses': return 'المصروفات';
      case 'reports': return 'التقارير';
      case 'files': return 'الملفات';
      case 'activity': return 'سجل النشاط';
      case 'settings': return 'الإعدادات';
      case 'users': return 'إدارة المستخدمين';
      default: return 'لوحة التحكم';
    }
  };

  if (selectedProjectId) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
        <Sidebar
          currentPage="projects"
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col md:mr-64">
          <Header
            currentPageTitle="تفاصيل المشروع"
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-auto">
            <ImprovedProjectDetails
              projectId={selectedProjectId}
              onBack={() => navigate('/projects')}
              onViewVendor={handleViewVendor}
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
        />
        <div className="flex-1 flex flex-col md:mr-64">
          <Header
            currentPageTitle={getPageTitle()}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-auto">
            <UserManagement onBack={() => navigate('/')} />
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
        />
        <div className="flex-1 flex flex-col md:mr-64">
          <Header
            currentPageTitle={getPageTitle()}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-auto p-6">
            <ActivityLogPage />
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
        />
        <div className="flex-1 flex flex-col md:mr-64">
          <Header
            currentPageTitle={getPageTitle()}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-auto p-6">
            <VendorsPage
              initialVendorId={selectedVendorId}
              onSelectVendor={(id) => {
                if (id) {
                  navigate('/vendors/' + id);
                } else {
                  navigate('/vendors');
                }
              }}
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
        />
        <div className="flex-1 flex flex-col md:mr-64">
          <Header
            currentPageTitle={getPageTitle()}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-auto bg-slate-50 dark:bg-dark-bg">
            <SettingsPage
              initialTab={settingsTab}
              onTabChange={(tab) => navigate('/settings/' + tab)}
            />
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'expenses') {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-dark-bg">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col md:mr-64">
          <Header
            currentPageTitle={getPageTitle()}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-auto p-6">
            <ExpensesPage />
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
          />
          <div className="flex-1 flex flex-col md:mr-64">
            <Header
              currentPageTitle="تفاصيل العميل"
              onMenuClick={() => setSidebarOpen(true)}
            />
            <main className="flex-1 overflow-auto">
              <ClientDetails
                clientId={selectedClientId}
                onBack={() => navigate('/clients')}
                onViewProject={(projectId) => navigate('/projects/' + projectId)}
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
        />
        <div className="flex-1 flex flex-col md:mr-64">
          <Header
            currentPageTitle={getPageTitle()}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-auto">
            <ClientsPage
              onViewClient={(clientId) => navigate('/clients/' + clientId)}
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
      />

      <div className="flex-1 flex flex-col md:mr-64">
        <Header
          currentPageTitle={getPageTitle()}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-dark-bg" dir="rtl">
          {currentPage === 'dashboard' && (
            <div className="space-y-6">
              <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
                rounded-[32px] p-8 text-white shadow-2xl border border-white/20">
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
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0A2A66]/10 to-[#143D8D]/10
                        dark:from-[#0A2A66]/20 dark:to-[#143D8D]/20
                        border border-[#0A2A66]/20 dark:border-[#0A2A66]/30 flex items-center justify-center
                        group-hover:scale-110 transition-transform">
                        <Wallet className="w-7 h-7 text-[#0A2A66] dark:text-[#47A1FF]" strokeWidth={2} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Revenue</p>
                      <p className="text-3xl font-bold bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
                        dark:from-[#47A1FF] dark:to-[#6BB6FF]
                        bg-clip-text text-transparent" dir="ltr">
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-200 dark:border-dark-border pt-3">Collected</p>
                  </div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-[#0A2A66]/5 to-[#1B4FA9]/5
                    rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                </div>

                <div className="group relative overflow-hidden backdrop-blur-xl bg-white/60 dark:bg-dark-card dark:backdrop-blur-none
                  rounded-[24px] p-6 shadow-xl border border-white/60 dark:border-dark-border
                  hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0A2A66]/10 to-[#1B4FA9]/10
                        dark:from-[#0A2A66]/20 dark:to-[#1B4FA9]/20
                        border border-[#0A2A66]/20 dark:border-[#0A2A66]/30 flex items-center justify-center
                        group-hover:scale-110 transition-transform">
                        <CreditCard className="w-7 h-7 text-[#0A2A66] dark:text-[#47A1FF]" strokeWidth={2} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Invoices</p>
                      <p className="text-3xl font-bold bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
                        dark:from-[#47A1FF] dark:to-[#6BB6FF]
                        bg-clip-text text-transparent" dir="ltr">
                        {formatNumber(stats.totalInvoices)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-200 dark:border-dark-border pt-3">Total Invoices</p>
                  </div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-[#0A2A66]/5 to-[#1B4FA9]/5
                    rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                </div>

                <div className="group relative overflow-hidden backdrop-blur-xl bg-white/60 dark:bg-dark-card dark:backdrop-blur-none
                  rounded-[24px] p-6 shadow-xl border border-white/60 dark:border-dark-border
                  hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0A2A66]/10 to-[#143D8D]/10
                        dark:from-[#0A2A66]/20 dark:to-[#143D8D]/20
                        border border-[#0A2A66]/20 dark:border-[#0A2A66]/30 flex items-center justify-center
                        group-hover:scale-110 transition-transform">
                        <Users className="w-7 h-7 text-[#0A2A66] dark:text-[#47A1FF]" strokeWidth={2} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Clients</p>
                      <p className="text-3xl font-bold bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
                        dark:from-[#47A1FF] dark:to-[#6BB6FF]
                        bg-clip-text text-transparent" dir="ltr">
                        {formatNumber(stats.totalClients)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-200 dark:border-dark-border pt-3">Total Clients</p>
                  </div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-[#0A2A66]/5 to-[#143D8D]/5
                    rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                </div>

                <div className="group relative overflow-hidden backdrop-blur-xl bg-white/60 dark:bg-dark-card dark:backdrop-blur-none
                  rounded-[24px] p-6 shadow-xl border border-white/60 dark:border-dark-border
                  hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#143D8D]/10 to-[#47A1FF]/10
                        dark:from-[#143D8D]/20 dark:to-[#47A1FF]/20
                        border border-[#143D8D]/20 dark:border-[#143D8D]/30 flex items-center justify-center
                        group-hover:scale-110 transition-transform">
                        <FolderOpen className="w-7 h-7 text-[#143D8D] dark:text-[#47A1FF]" strokeWidth={2} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Projects</p>
                      <p className="text-3xl font-bold bg-gradient-to-l from-[#143D8D] to-[#47A1FF]
                        dark:from-[#47A1FF] dark:to-[#6BB6FF]
                        bg-clip-text text-transparent" dir="ltr">
                        {formatNumber(stats.totalProjects)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-200 dark:border-dark-border pt-3" dir="ltr">
                      {formatNumber(stats.activeProjects)} Active Projects
                    </p>
                  </div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-[#143D8D]/5 to-[#47A1FF]/5
                    rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-[#0A2A66]/10 to-[#1B4FA9]/10
                      dark:from-[#0A2A66]/20 dark:to-[#1B4FA9]/20
                      border border-[#0A2A66]/20 dark:border-[#0A2A66]/30">
                      <FolderOpen className="w-5 h-5 text-[#0A2A66] dark:text-[#47A1FF]" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">المشاريع الأخيرة</h2>
                  </div>
                </div>

                <div className="backdrop-blur-xl bg-white/60 dark:bg-dark-card dark:backdrop-blur-none rounded-[32px] shadow-xl border border-white/60 dark:border-dark-border
                  overflow-hidden hover:shadow-2xl transition-all duration-300">
                  <div className="p-6">
                    <ProjectsList
                      onSelectProject={(id) => navigate('/projects/' + id)}
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
                onSelectProject={(id) => navigate('/projects/' + id)}
                onCreateProject={() => setShowCreateProjectModal(true)}
              />
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
