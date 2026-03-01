import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { LogOut, FolderOpen, Users, FileText, DollarSign, Settings, Package } from 'lucide-react';
import { ProjectsList } from './ProjectsList';
import { ProjectDetails } from './ProjectDetails';
import { UserManagement } from './UserManagement';
import { ServiceItemsCatalog } from './ServiceItemsCatalog';

interface Stats {
  totalProjects: number;
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
}

type View = 'dashboard' | 'users' | 'catalog';

export const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    totalClients: 0,
    totalInvoices: 0,
    totalRevenue: 0,
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [projectsRes, clientsRes, invoicesRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact' }),
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('invoices').select('total_amount, paid_amount'),
      ]);

      const totalRevenue = invoicesRes.data?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;

      setStats({
        totalProjects: projectsRes.count || 0,
        totalClients: clientsRes.count || 0,
        totalInvoices: invoicesRes.data?.length || 0,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (currentView === 'users') {
    return <UserManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'catalog') {
    return <ServiceItemsCatalog onBack={() => setCurrentView('dashboard')} />;
  }

  if (selectedProjectId) {
    return (
      <ProjectDetails
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
        onUpdate={loadStats}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">لوحة التحكم</h1>
              <p className="text-slate-600 text-sm">مرحباً، {profile?.full_name}</p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <span>تسجيل الخروج</span>
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>المشاريع</span>
            </button>
            <button
              onClick={() => setCurrentView('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'users'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>المستخدمون</span>
            </button>
            <button
              onClick={() => setCurrentView('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'catalog'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>كاتالوج البنود</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FolderOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-1">إجمالي المشاريع</p>
            <p className="text-3xl font-bold text-slate-800">{stats.totalProjects}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-1">إجمالي العملاء</p>
            <p className="text-3xl font-bold text-slate-800">{stats.totalClients}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-1">إجمالي الفواتير</p>
            <p className="text-3xl font-bold text-slate-800">{stats.totalInvoices}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-amber-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-1">الإيرادات المحصلة</p>
            <p className="text-3xl font-bold text-slate-800">
              {stats.totalRevenue.toLocaleString('en-US')} <span className="text-lg">ر.س</span>
            </p>
          </div>
        </div>

        <ProjectsList onSelectProject={setSelectedProjectId} />
      </main>
    </div>
  );
};
