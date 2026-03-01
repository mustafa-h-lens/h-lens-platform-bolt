import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ArrowRight, CreditCard as Edit2, Home, ShoppingBasket, CreditCard, Folder, Star, Bell, ChevronDown, User } from 'lucide-react';
import { ProjectBasicInfo } from './project-tabs/ProjectBasicInfo';
import { ProjectItems } from './project-tabs/ProjectItems';
import { ProjectInvoices } from './project-tabs/ProjectInvoices';
import { ProjectFiles } from './project-tabs/ProjectFiles';
import { ProjectAchievements } from './project-tabs/ProjectAchievements';
import { ProjectActivity } from './project-tabs/ProjectActivity';
import { EditProjectModal } from './EditProjectModal';

interface Project {
  id: string;
  name: string;
  project_code: string | null;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  total_cost: number;
  total_price: number;
  currency: string;
  client_id: string;
  project_manager_id: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  client_image: string | null;
}

interface ProjectDetailsProps {
  projectId: string;
  onBack: () => void;
}

type TabType = 'basic' | 'items' | 'invoices' | 'files' | 'achievements' | 'activity';

const PROJECT_STATUSES = [
  { value: 'request', label: 'طلب', gradient: 'from-[#072A52] to-[#0A2A66]' },
  { value: 'in_progress', label: 'قيد التنفيذ', gradient: 'from-[#0A2A66] to-[#143D8D]' },
  { value: 'pending_payment', label: 'بانتظار الدفع', gradient: 'from-[#0A2A66] to-[#1B4FA9]' },
  { value: 'paid', label: 'مدفوع', gradient: 'from-[#1B4FA9] to-[#47A1FF]' },
  { value: 'closed', label: 'مغلق', gradient: 'from-[#0A2A66] to-[rgba(10,42,102,0.4)]' },
];

export const EnhancedProjectDetails = ({ projectId, onBack }: ProjectDetailsProps) => {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModeKey, setEditModeKey] = useState(0);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email, client_image')
        .eq('id', projectData.client_id)
        .single();

      if (clientError) throw clientError;

      setProject(projectData);
      setClient(clientData);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', project.id);

      if (error) throw error;

      setProject({ ...project, status: newStatus });
      setShowStatusMenu(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const getCurrentStatus = () => {
    return PROJECT_STATUSES.find(s => s.value === project?.status) || PROJECT_STATUSES[0];
  };

  const tabs = [
    { id: 'basic', label: 'البيانات الأساسية', icon: Home },
    { id: 'items', label: 'البنود', icon: ShoppingBasket },
    { id: 'invoices', label: 'الفواتير', icon: CreditCard },
    { id: 'files', label: 'الملفات', icon: Folder },
    { id: 'achievements', label: 'المنجزات', icon: Star },
    { id: 'activity', label: 'النشاط', icon: Bell },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">جاري التحميل...</div>
      </div>
    );
  }

  if (!project || !client) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">المشروع غير موجود</div>
      </div>
    );
  }

  const currentStatus = getCurrentStatus();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg" dir="rtl">
      <div className="bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-[#0A2A66] mb-4 transition-colors
              hover:gap-3 duration-300"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="font-medium">العودة للمشاريع</span>
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0A2A66] to-[#1B4FA9]
                flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                {client.client_image ? (
                  <img
                    src={client.client_image}
                    alt={client.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-800 mb-2 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
                  bg-clip-text text-transparent">
                  {project.name}
                </h1>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="font-medium">{client.name}</span>
                  <span className="text-slate-400">•</span>
                  <span dir="ltr">{client.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700
                  border border-[#0A2A66]/20 dark:border-[#0A2A66]/30 rounded-xl
                  text-[#0A2A66] dark:text-[#47A1FF] hover:bg-slate-200 dark:hover:bg-slate-600
                  hover:border-[#0A2A66]/40 transition-all shadow-sm hover:shadow-md"
              >
                <Edit2 className="w-4 h-4" />
                <span className="font-medium">تعديل المشروع</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium
                    bg-gradient-to-l ${currentStatus.gradient} shadow-lg hover:shadow-xl
                    transition-all hover:scale-105`}
                >
                  <span>{currentStatus.label}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showStatusMenu && (
                  <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-dark-card
                    border border-slate-200 dark:border-dark-border rounded-2xl shadow-2xl z-50 overflow-hidden">
                    {PROJECT_STATUSES.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusChange(status.value)}
                        className={`w-full px-4 py-3 text-right text-sm font-medium transition-all
                          ${project.status === status.value
                            ? `bg-gradient-to-l ${status.gradient} text-white`
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white dark:bg-dark-card rounded-[32px] shadow-xl border border-slate-200 dark:border-dark-border overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-dark-border">
            <div className="flex gap-2 p-3 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-medium
                      transition-all duration-300 whitespace-nowrap ${
                        isActive
                          ? 'bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9] text-white shadow-lg shadow-blue-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    <div className={`p-2 rounded-xl ${
                      isActive
                        ? 'bg-white/20 border border-white/30'
                        : 'bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500'
                    }`}>
                      <Icon className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'basic' && <ProjectBasicInfo key={editModeKey} project={project} client={client} onUpdate={loadProject} startInEditMode={editModeKey > 0} />}
            {activeTab === 'items' && <ProjectItems projectId={project.id} currency={project.currency} />}
            {activeTab === 'invoices' && <ProjectInvoices projectId={project.id} />}
            {activeTab === 'files' && <ProjectFiles projectId={project.id} />}
            {activeTab === 'achievements' && <ProjectAchievements projectId={project.id} />}
            {activeTab === 'activity' && <ProjectActivity projectId={project.id} />}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditProjectModal
          projectId={project.id}
          currentData={{
            name: project.name,
            client_id: project.client_id,
            project_code: project.project_code,
            description: project.description,
            status: project.status,
            start_date: project.start_date,
            end_date: project.end_date,
            project_manager_id: project.project_manager_id,
            internal_notes: project.internal_notes,
            total_cost: project.total_cost,
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
