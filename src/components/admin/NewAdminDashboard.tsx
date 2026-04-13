import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { supabase } from '../../lib/supabaseClient';
import { FolderOpen, Users, FileText, Wallet, CreditCard, Sparkles, Menu, Plus, AlertTriangle, ChevronLeft, Clock, UserCheck, Receipt, ArrowLeft } from 'lucide-react';
import { Sidebar } from '../shared/Sidebar';
import { ProjectsList } from './projects/ProjectsList';
import { formatNumber, formatCurrency, formatDateArabic } from '../../lib/formatters';
import { useHideAmounts } from '../../contexts/HideAmountsContext';

// Lazy-loaded section components
const UserManagement = lazy(() => import('./UserManagement').then(m => ({ default: m.UserManagement })));
const ClientsPage = lazy(() => import('./clients/ClientsPage').then(m => ({ default: m.ClientsPage })));
const VendorsPage = lazy(() => import('./vendors/VendorsPage').then(m => ({ default: m.VendorsPage })));
const SettingsPage = lazy(() => import('./settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ClientDetails = lazy(() => import('./clients/ClientDetails').then(m => ({ default: m.ClientDetails })));
const ImprovedProjectDetails = lazy(() => import('./projects/ImprovedProjectDetails').then(m => ({ default: m.ImprovedProjectDetails })));
const EnhancedProjectsPage = lazy(() => import('./projects/EnhancedProjectsPage').then(m => ({ default: m.EnhancedProjectsPage })));
const CreateProjectModal = lazy(() => import('./projects/CreateProjectModal').then(m => ({ default: m.CreateProjectModal })));
const ExpensesPage = lazy(() => import('./expenses/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const ActivityLogPage = lazy(() => import('./ActivityLogPage').then(m => ({ default: m.ActivityLogPage })));
const AdminSuggestions = lazy(() => import('./suggestions/AdminSuggestions').then(m => ({ default: m.AdminSuggestions })));
const ProfilePage = lazy(() => import('./ProfilePage').then(m => ({ default: m.ProfilePage })));

const LazyFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem', color: 'var(--text-muted)', fontSize: '1.125rem' }}>
    جاري التحميل...
  </div>
);

const VALID_PAGES = ['dashboard', 'projects', 'clients', 'vendors', 'expenses', 'users', 'settings', 'activity', 'suggestions', 'profile'];

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

interface PendingItems {
  pendingVendors: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  overdueInvoices: number;
}

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  paid_amount: number;
  currency: string;
  created_at: string;
}

interface ActivityEntry {
  id: string;
  action_type: string;
  entity_type: string;
  entity_name: string | null;
  user_name: string;
  created_at: string;
}

export const NewAdminDashboard = () => {
  const { profile } = useAuth();
  const { hasAccess, isSuperAdmin, loading: permissionsLoading } = usePermissions();
  const initialHash = parseHash();

  // Always initialize from hash — don't check permissions yet (they may still be loading)
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

  // Redirect to dashboard AFTER permissions load if user lacks access to current page
  useEffect(() => {
    if (!permissionsLoading && currentPage !== 'dashboard' && !hasAccess(currentPage as any)) {
      setCurrentPage('dashboard');
      setSelectedProjectId(null);
      setSelectedClientId(null);
      setSelectedVendorId(null);
      setActiveSubTab(null);
    }
  }, [permissionsLoading]);
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
  const [pendingItems, setPendingItems] = useState<PendingItems>({ pendingVendors: 0, unpaidInvoices: 0, unpaidAmount: 0, overdueInvoices: 0 });
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const { masked } = useHideAmounts();

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
    // Block users from pages they don't have access to
    const safePage = !hasAccess(page as any) ? 'dashboard' : page;
    setCurrentPage(safePage);
    setSelectedProjectId(safePage === 'projects' ? id : null);
    setSelectedClientId(safePage === 'clients' ? id : null);
    setSelectedVendorId(safePage === 'vendors' ? id : null);
    setActiveSubTab(tab);
    if (safePage !== 'clients') setClientView(null);
  }, [hasAccess]);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  useEffect(() => {
    loadStats();
    loadDashboardData();
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

  const handleViewProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedVendorId(null);
    setSelectedClientId(null);
    setActiveSubTab(null);
    setCurrentPage('projects');
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

  const loadDashboardData = async () => {
    try {
      const [vendorsRes, invoicesRes, activityRes] = await Promise.all([
        supabase.from('vendors').select('id', { count: 'exact', head: true }).in('status', ['pending_approval', 'revision_requested']),
        supabase.from('invoices').select('id, invoice_number, total_amount, paid_amount, status, currency, created_at, project_id, projects(client_id, clients(name))').in('status', ['draft', 'sent', 'overdue']),
        supabase.from('global_activity_log').select('id, action_type, entity_type, entity_name, user_name, created_at').order('created_at', { ascending: false }).limit(10),
      ]);

      // Pending items
      const unpaidInvs = invoicesRes.data || [];
      const overdueCount = unpaidInvs.filter((i: any) => i.status === 'overdue').length;
      const unpaidTotal = unpaidInvs.reduce((sum: number, i: any) => sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);
      setPendingItems({
        pendingVendors: vendorsRes.count || 0,
        unpaidInvoices: unpaidInvs.length,
        unpaidAmount: unpaidTotal,
        overdueInvoices: overdueCount,
      });

      // Unpaid invoices (top 5)
      const mapped: UnpaidInvoice[] = unpaidInvs.slice(0, 5).map((i: any) => ({
        id: i.id,
        invoice_number: i.invoice_number,
        client_name: i.projects?.clients?.name || '-',
        total_amount: i.total_amount || 0,
        paid_amount: i.paid_amount || 0,
        currency: i.currency || 'SAR',
        created_at: i.created_at,
      }));
      setUnpaidInvoices(mapped);

      // Activity
      setRecentActivity(activityRes.data || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const ACTION_LABELS: Record<string, string> = { created: 'أنشأ', updated: 'عدّل', deleted: 'حذف', uploaded: 'رفع', approved: 'وافق', rejected: 'رفض', sent: 'أرسل', completed: 'أكمل' };
  const ENTITY_LABELS: Record<string, string> = { project: 'مشروع', client: 'عميل', vendor: 'مورد', invoice: 'فاتورة', expense: 'مصروف', user: 'مستخدم', equipment: 'معدة', document: 'مستند' };

  const sidebarMargin = sidebarCollapsed ? 'md:mr-[68px]' : 'md:mr-60';

  const mobileMenuButton = (
    <button
      onClick={() => setSidebarOpen(true)}
      className="fixed top-4 right-4 z-30 md:hidden btn btn-secondary btn-icon"
    >
      <Menu size={20} />
    </button>
  );

  if (selectedProjectId) {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
        <Sidebar
          currentPage="projects"
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<LazyFallback />}>
              <ImprovedProjectDetails
                projectId={selectedProjectId}
                onBack={() => { setSelectedProjectId(null); setActiveSubTab(null); }}
                onViewVendor={handleViewVendor}
                initialTab={activeSubTab}
                onTabChange={setActiveSubTab}
              />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'users') {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<LazyFallback />}>
              <UserManagement onBack={() => setCurrentPage('dashboard')} />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'vendors') {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto p-6">
            <Suspense fallback={<LazyFallback />}>
              <VendorsPage
                initialVendorId={selectedVendorId}
                onVendorSelect={setSelectedVendorId}
                initialTab={activeSubTab}
                onTabChange={setActiveSubTab}
                onViewProject={handleViewProject}
              />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'profile') {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-base)' }}>
            <Suspense fallback={<LazyFallback />}>
              <ProfilePage onBack={() => handleNavigation('dashboard')} />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'settings') {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-base)' }}>
            <Suspense fallback={<LazyFallback />}>
              <SettingsPage initialTab={activeSubTab} onTabChange={setActiveSubTab} />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'activity') {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<LazyFallback />}>
              <ActivityLogPage />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'suggestions') {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto p-6">
            <Suspense fallback={<LazyFallback />}>
              <AdminSuggestions />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  if (currentPage === 'clients') {
    if (selectedClientId) {
      return (
        <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigation}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          />
          <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
            {mobileMenuButton}
            <main className="flex-1 overflow-auto">
              <Suspense fallback={<LazyFallback />}>
                <ClientDetails
                  clientId={selectedClientId}
                  onBack={() => {
                    setSelectedClientId(null);
                    setClientView(null);
                    setActiveSubTab(null);
                  }}
                  onViewProject={(projectId) => {
                    setCurrentPage('projects');
                    setSelectedProjectId(projectId);
                    setSelectedClientId(null);
                    setActiveSubTab(null);
                  }}
                  initialTab={activeSubTab}
                  onTabChange={setActiveSubTab}
                />
              </Suspense>
            </main>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
          {mobileMenuButton}
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<LazyFallback />}>
              <ClientsPage
                onViewClient={(clientId) => {
                  setSelectedClientId(clientId);
                }}
              />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      <div className={`flex-1 flex flex-col min-w-0 ${sidebarMargin}`}>
        {mobileMenuButton}

        <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-base)' }} dir="rtl">
          {currentPage === 'dashboard' && (
            <div className="page-section active" style={{ display: 'block' }}>
              {/* ═══ WELCOME BANNER ═══ */}
              <div className="dash-welcome">
                <div className="dash-welcome-content">
                  <div>
                    <div className="dash-welcome-title">مرحباً، {profile?.full_name} 👋🏻</div>
                    <div className="dash-welcome-sub">إليك نظرة سريعة على أداء المشاريع والعمليات</div>
                  </div>
                  <div className="dash-welcome-icon"><Sparkles size={28} /></div>
                </div>
              </div>

              {/* ═══ STAT CARDS ═══ */}
              <div className="stats-grid" style={{ marginTop: 20 }}>
                <div className="stat-card sc-blue">
                  <div className="stat-icon-box"><Wallet size={18} /></div>
                  <div className="stat-sub">الإيرادات</div>
                  <div className="stat-val" dir="ltr">{masked(formatCurrency(stats.totalRevenue))}</div>
                  <div style={{ fontSize: 12, color: 'var(--sc-blue-label)', marginTop: 4 }}>المحصّل</div>
                </div>
                <div className="stat-card sc-green">
                  <div className="stat-icon-box"><CreditCard size={18} /></div>
                  <div className="stat-sub">الفواتير</div>
                  <div className="stat-val" dir="ltr">{formatNumber(stats.totalInvoices)}</div>
                  <div style={{ fontSize: 12, color: 'var(--sc-green-label)', marginTop: 4 }}>إجمالي الفواتير</div>
                </div>
                <div className="stat-card sc-amber">
                  <div className="stat-icon-box"><Users size={18} /></div>
                  <div className="stat-sub">العملاء</div>
                  <div className="stat-val" dir="ltr">{formatNumber(stats.totalClients)}</div>
                  <div style={{ fontSize: 12, color: 'var(--sc-amber-label)', marginTop: 4 }}>إجمالي العملاء</div>
                </div>
                <div className="stat-card sc-purple">
                  <div className="stat-icon-box"><FolderOpen size={18} /></div>
                  <div className="stat-sub">المشاريع</div>
                  <div className="stat-val" dir="ltr">{formatNumber(stats.totalProjects)}</div>
                  <div style={{ fontSize: 12, color: 'var(--sc-purple-label)', marginTop: 4 }}>{formatNumber(stats.activeProjects)} مشروع نشط</div>
                </div>
              </div>

              {/* ═══ QUICK ACTIONS ═══ */}
              <div className="dash-quick-actions">
                {[
                  { label: 'مشروع جديد', icon: <FolderOpen size={18} />, color: 'ci-blue', action: () => setShowCreateProjectModal(true) },
                  { label: 'فاتورة جديدة', icon: <CreditCard size={18} />, color: 'ci-green', action: () => { handleNavigation('expenses'); } },
                  { label: 'مورد جديد', icon: <Users size={18} />, color: 'ci-amber', action: () => handleNavigation('vendors') },
                  { label: 'عميل جديد', icon: <UserCheck size={18} />, color: 'ci-purple', action: () => handleNavigation('clients') },
                ].map((item, i) => (
                  <div key={i} className="dash-qa-item" style={{ cursor: 'pointer' }} onClick={item.action}>
                    <div className={`dash-qa-icon ${item.color}`}>{item.icon}<span className="dash-qa-plus">+</span></div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* ═══ NEEDS ATTENTION ═══ */}
              {(pendingItems.pendingVendors > 0 || pendingItems.unpaidInvoices > 0) && (
                <div className="dash-alert">
                  <div className="dash-alert-header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={18} style={{ color: 'var(--warning-text)' }} />
                      <strong style={{ color: 'var(--text-primary)' }}>يحتاج انتباهك</strong>
                    </span>
                  </div>
                  {pendingItems.pendingVendors > 0 && (
                    <div className="dash-alert-item" onClick={() => { setCurrentPage('vendors'); setSelectedVendorId(null); setActiveSubTab('pending'); }} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <div className="card-icon ci-amber" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)' }}><Users size={14} /></div>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{pendingItems.pendingVendors} طلب تسجيل مورد بانتظار المراجعة</span>
                      </div>
                      <button className="btn btn-ghost btn-sm"><ArrowLeft size={14} /></button>
                    </div>
                  )}
                  {pendingItems.unpaidInvoices > 0 && (
                    <div className="dash-alert-item" onClick={() => handleNavigation('expenses')} style={{ cursor: 'pointer', marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <div className="card-icon ci-red" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)' }}><Receipt size={14} /></div>
                        <div>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{pendingItems.unpaidInvoices} فاتورة غير مسددة بقيمة {masked(formatCurrency(pendingItems.unpaidAmount, 'SAR'))}</span>
                          {pendingItems.overdueInvoices > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--danger-text)', marginTop: 2 }}>منها {pendingItems.overdueInvoices} متأخرة</div>
                          )}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm"><ArrowLeft size={14} /></button>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ RECENT PROJECTS ═══ */}
              <div className="dash-section">
                <div className="dash-section-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FolderOpen size={18} style={{ color: 'var(--accent-lighter)' }} />
                    <strong>المشاريع الأخيرة</strong>
                  </span>
                  <a onClick={() => handleNavigation('projects')} style={{ fontSize: 12, color: 'var(--accent-lighter)', cursor: 'pointer', textDecoration: 'none' }}>عرض الكل</a>
                </div>
                <ProjectsList
                  onSelectProject={setSelectedProjectId}
                  onLoadProjects={(loadFn) => setReloadProjectsCallback(() => loadFn)}
                  limit={5}
                />
              </div>

              {/* ═══ BOTTOM TWO COLUMNS ═══ */}
              <div className="dash-bottom-grid">
                {/* Unpaid Invoices */}
                <div className="dash-bottom-card">
                  <div className="dash-section-header" style={{ marginBottom: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CreditCard size={18} style={{ color: 'var(--warning-text)' }} />
                      <strong>فواتير غير مسددة</strong>
                    </span>
                    <a onClick={() => handleNavigation('expenses')} style={{ fontSize: 12, color: 'var(--accent-lighter)', cursor: 'pointer', textDecoration: 'none' }}>عرض الكل</a>
                  </div>
                  {unpaidInvoices.length === 0 ? (
                    <div className="dash-empty">
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد فواتير غير مسددة</span>
                    </div>
                  ) : (
                    <div className="dash-activity-list">
                      {unpaidInvoices.map((inv) => (
                        <div key={inv.id} className="dash-activity-item">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{inv.client_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>#{inv.invoice_number} · منذ {daysSince(inv.created_at)} يوم</div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning-text)' }} dir="ltr">{masked(formatCurrency(inv.total_amount - inv.paid_amount, inv.currency))}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="dash-bottom-card">
                  <div className="dash-section-header" style={{ marginBottom: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={18} style={{ color: 'var(--info-text)' }} />
                      <strong>النشاط الأخير</strong>
                    </span>
                    {isSuperAdmin && (
                      <a onClick={() => handleNavigation('activity')} style={{ fontSize: 12, color: 'var(--accent-lighter)', cursor: 'pointer', textDecoration: 'none' }}>عرض الكل</a>
                    )}
                  </div>
                  {recentActivity.length === 0 ? (
                    <div className="dash-empty">
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا يوجد نشاط</span>
                    </div>
                  ) : (
                    <div className="dash-activity-list">
                      {recentActivity.map((act) => (
                        <div key={act.id} className="dash-activity-item">
                          <div className="card-icon ci-blue" style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)' }}>
                            <FileText size={13} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                              <span className="a-user">{act.user_name}</span>{' '}
                              <span className="a-action">{ACTION_LABELS[act.action_type] || act.action_type}</span>{' '}
                              <span className="a-action">{ENTITY_LABELS[act.entity_type] || act.entity_type}</span>{' '}
                              {act.entity_name && <span className="a-target">{act.entity_name}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatDateArabic(act.created_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {currentPage === 'projects' && (
  <div style={{ padding: 28 }}>
    <Suspense fallback={<LazyFallback />}>
      <EnhancedProjectsPage
        onSelectProject={setSelectedProjectId}
        onCreateProject={() => setShowCreateProjectModal(true)}
      />
    </Suspense>
  </div>
)}

{currentPage === 'expenses' && (
  <div style={{ padding: 28 }}>
    <Suspense fallback={<LazyFallback />}>
      <ExpensesPage onViewProject={setSelectedProjectId} />
    </Suspense>
  </div>
)}
        </main>
      </div>

      {showCreateProjectModal && (
        <Suspense fallback={<LazyFallback />}>
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
        </Suspense>
      )}
    </div>
  );
};
