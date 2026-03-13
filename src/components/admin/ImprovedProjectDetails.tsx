import { useState, useEffect } from 'react';
import { ArrowRight, Edit, Home, ShoppingCart, FileText, DollarSign, Users, Folder, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../lib/formatters';
import { toEnglishNumbers } from '../../lib/numberUtils';
import { ImprovedProjectBasicInfo } from './project-tabs/ImprovedProjectBasicInfo';
import { ProjectItems } from './project-tabs/ProjectItems';
import { ProjectInvoices } from './project-tabs/ProjectInvoices';
import { ProjectExpenses } from './project-tabs/ProjectExpenses';
import { ProjectVendors } from './project-tabs/ProjectVendors';
import { ProjectFiles } from './project-tabs/ProjectFiles';
import { EditProjectModal } from './EditProjectModal';

interface Project {
  id: string;
  name: string;
  description: string | null;
  project_mode: 'STANDARD' | 'FRAMEWORK';
  status: string;
  start_date: string | null;
  end_date: string | null;
  total_price: number;
  total_cost: number | null;
  currency: string;
  client_id: string;
  project_manager_id: string | null;
  internal_notes: string | null;
  project_code: string | null;
}

interface Client {
  id: string;
  name: string;
  client_image: string | null;
}

interface ProjectManager {
  id: string;
  full_name: string;
}

interface ImprovedProjectDetailsProps {
  projectId: string;
  onBack: () => void;
  onViewVendor?: (vendorId: string) => void;
}

type TabType = 'basic' | 'items' | 'invoices' | 'expenses' | 'vendors' | 'files';

const TABS = [
  { id: 'basic', label: 'البيانات الأساسية', icon: Home },
  { id: 'items', label: 'البنود', icon: ShoppingCart },
  { id: 'invoices', label: 'الفواتير', icon: FileText },
  { id: 'expenses', label: 'المصروفات', icon: DollarSign },
  { id: 'vendors', label: 'الموردين', icon: Users },
  { id: 'files', label: 'الملفات', icon: Folder },
] as const;

export const ImprovedProjectDetails = ({ projectId, onBack, onViewVendor }: ImprovedProjectDetailsProps) => {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [projectManager, setProjectManager] = useState<ProjectManager | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, client_image')
        .eq('id', projectData.client_id)
        .single();

      let managerData = null;
      if (projectData.project_manager_id) {
        const { data } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('id', projectData.project_manager_id)
          .single();
        managerData = data;
      }

      setProject(projectData);
      setClient(clientData);
      setProjectManager(managerData);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      request: { label: 'طلب', color: 'var(--color-text-primary)', bgColor: 'var(--color-background-hover)' },
      in_progress: { label: 'قيد التنفيذ', color: '#ffffff', bgColor: 'var(--color-info)' },
      pending_payment: { label: 'بانتظار الدفع', color: '#ffffff', bgColor: 'var(--color-warning)' },
      paid: { label: 'مدفوع', color: '#ffffff', bgColor: 'var(--color-success)' },
      closed: { label: 'مغلق', color: 'var(--color-text-muted)', bgColor: 'var(--color-background-hover)' },
      completed: { label: 'مكتمل', color: '#ffffff', bgColor: 'var(--color-success)' },
      pending: { label: 'قيد الانتظار', color: '#ffffff', bgColor: 'var(--color-warning)' },
      cancelled: { label: 'ملغي', color: '#ffffff', bgColor: 'var(--color-danger)' },
    };
    return statusMap[status] || statusMap.request;
  };

  const calculateMetrics = () => {
    if (!project) return { profit: 0, profitPercentage: 0, costPercentage: 0, status: 'good' as const };

    const cost = project.total_cost || 0;
    const price = project.total_price || 0;
    const profit = price - cost;
    const profitPercentage = price > 0 ? (profit / price) * 100 : 0;
    const costPercentage = price > 0 ? (cost / price) * 100 : 0;

    let status: 'good' | 'warning' | 'danger' = 'good';
    if (profitPercentage < 0) status = 'danger';
    else if (profitPercentage < 20) status = 'warning';

    return { profit, profitPercentage, costPercentage, status };
  };

  const getProfitColor = (status: 'good' | 'warning' | 'danger') => {
    switch (status) {
      case 'good': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'danger': return 'var(--color-danger)';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل المشروع...</p>
        </div>
      </div>
    );
  }

  if (!project || !client) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>المشروع غير موجود</p>
      </div>
    );
  }

  const statusBadge = getStatusBadge(project.status);
  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 font-medium transition-all hover:gap-3"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowRight size={20} />
            العودة إلى المشاريع
          </button>

          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {project.name}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  العميل: {client.name}
                </span>
                {projectManager && (
                  <>
                    <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      المدير: {projectManager.full_name}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: project.project_mode === 'STANDARD' ? '#10b981' : '#3b82f6',
                  color: '#ffffff',
                }}
              >
                {project.project_mode === 'STANDARD' ? '📋 مشروع' : '📑 عقد إطاري'}
              </span>
              <span
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: statusBadge.bgColor,
                  color: statusBadge.color,
                }}
              >
                {statusBadge.label}
              </span>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                <Edit size={18} />
                تعديل
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                ميزانية المشروع
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                {formatCurrency(project.total_price, project.currency)}
              </div>
            </div>

            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  إجمالي التكاليف
                </div>
                {metrics.costPercentage >= 80 && (
                  <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
                )}
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                {formatCurrency(project.total_cost || 0, project.currency)}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {toEnglishNumbers(metrics.costPercentage.toFixed(1))}% من الميزانية
              </div>
            </div>

            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                {metrics.status === 'good' ? (
                  <TrendingUp size={16} style={{ color: getProfitColor(metrics.status) }} />
                ) : (
                  <TrendingDown size={16} style={{ color: getProfitColor(metrics.status) }} />
                )}
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  الربح
                </div>
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color: getProfitColor(metrics.status) }} dir="ltr">
                {formatCurrency(metrics.profit, project.currency)}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {toEnglishNumbers(metrics.profitPercentage.toFixed(1))}% هامش ربح
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((tab) => {
              if (tab.id === 'items' && project.project_mode === 'FRAMEWORK') {
                return null;
              }

              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'basic' && <ImprovedProjectBasicInfo project={project} client={client} onUpdate={loadProject} />}
        {activeTab === 'items' && project.project_mode === 'STANDARD' && <ProjectItems projectId={projectId} />}
        {activeTab === 'invoices' && <ProjectInvoices projectId={projectId} />}
        {activeTab === 'expenses' && <ProjectExpenses projectId={projectId} />}
        {activeTab === 'vendors' && <ProjectVendors projectId={projectId} onViewVendor={onViewVendor} />}
        {activeTab === 'files' && <ProjectFiles projectId={projectId} />}
      </div>

      {showEditModal && (
        <EditProjectModal
          projectId={project.id}
          currentData={{
            name: project.name,
            client_id: project.client_id,
            project_code: project.project_code,
            description: project.description,
            project_mode: project.project_mode,
            status: project.status,
            start_date: project.start_date,
            end_date: project.end_date,
            project_manager_id: project.project_manager_id,
            internal_notes: project.internal_notes,
            total_cost: project.total_cost || 0,
            total_price: project.total_price,
            currency: project.currency,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadProject();
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};
