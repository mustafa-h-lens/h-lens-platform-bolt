import { useState, useEffect } from 'react';
import { ArrowRight, Home, ShoppingCart, FileText, DollarSign, Users, Folder, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { ImprovedProjectBasicInfo } from './project-tabs/ImprovedProjectBasicInfo';
import { ProjectItems } from './project-tabs/ProjectItems';
import { ProjectInvoices } from './project-tabs/ProjectInvoices';
import { ProjectExpenses } from './project-tabs/ProjectExpenses';
import { ProjectVendors } from './project-tabs/ProjectVendors';
import { ProjectFiles } from './project-tabs/ProjectFiles';

interface Project {
  id: string;
  name: string;
  description: string | null;
  project_mode: 'STANDARD' | 'FRAMEWORK' | 'CONTRACT';
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
  initialTab?: string | null;
  onTabChange?: (tab: string | null) => void;
}

type TabType = 'basic' | 'items' | 'invoices' | 'expenses' | 'vendors' | 'files';

const TABS = [
  { id: 'basic', label: 'البيانات الأساسية', icon: Home },
  { id: 'vendors', label: 'الموردين', icon: Users },
  { id: 'expenses', label: 'المصروفات', icon: DollarSign },
  { id: 'invoices', label: 'الفواتير', icon: FileText },
  { id: 'items', label: 'البنود', icon: ShoppingCart },
  { id: 'files', label: 'الملفات', icon: Folder },
] as const;

const VALID_TAB_IDS: string[] = TABS.map(t => t.id);

export const ImprovedProjectDetails = ({ projectId, onBack, onViewVendor, initialTab, onTabChange }: ImprovedProjectDetailsProps) => {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [projectManager, setProjectManager] = useState<ProjectManager | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab && VALID_TAB_IDS.includes(initialTab) ? initialTab as TabType : 'basic'
  );

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  const [loading, setLoading] = useState(true);

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
        className="border-b"
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

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {project.name}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: project.project_mode === 'STANDARD' ? 'rgba(16,185,129,0.12)' : project.project_mode === 'CONTRACT' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)',
                  color: project.project_mode === 'STANDARD' ? '#059669' : project.project_mode === 'CONTRACT' ? '#7c3aed' : '#2563eb',
                }}
              >
                {project.project_mode === 'STANDARD' ? 'مشروع' : project.project_mode === 'CONTRACT' ? 'عقد' : 'عقد إطاري'}
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: statusBadge.bgColor,
                  color: statusBadge.color,
                }}
              >
                {statusBadge.label}
              </span>
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

              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as TabType)}
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
        {activeTab === 'items' && <ProjectItems projectId={projectId} currency={project.currency} />}
        {activeTab === 'invoices' && <ProjectInvoices projectId={projectId} />}
        {activeTab === 'expenses' && <ProjectExpenses projectId={projectId} currency={project.currency} />}
        {activeTab === 'vendors' && <ProjectVendors projectId={projectId} onViewVendor={onViewVendor} />}
        {activeTab === 'files' && <ProjectFiles projectId={projectId} />}
      </div>

    </div>
  );
};
