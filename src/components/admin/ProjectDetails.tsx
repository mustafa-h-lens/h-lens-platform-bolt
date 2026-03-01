import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft, User } from 'lucide-react';
import { InvoicesTab } from './InvoicesTab';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  total_cost: number;
  total_price: number;
  currency: string;
  client: {
    id: string;
    name: string;
    email: string;
    client_image: string | null;
  };
  project_manager: {
    full_name: string;
  } | null;
}

interface ProjectDetailsProps {
  projectId: string;
  onBack: () => void;
  onUpdate: () => void;
}

export const ProjectDetails = ({ projectId, onBack, onUpdate }: ProjectDetailsProps) => {
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'invoices'>('details');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(id, name, email, client_image),
          project_manager:users!project_manager_id(full_name)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data as any);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">المشروع غير موجود</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'in_progress': return 'قيد التنفيذ';
      case 'pending': return 'قيد الانتظار';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>العودة للمشاريع</span>
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0A2A66] to-[#1B4FA9]
                flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                {project.client.client_image ? (
                  <img
                    src={project.client.client_image}
                    alt={project.client.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">{project.name}</h1>
                <p className="text-slate-600">العميل: {project.client.name}</p>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
              {getStatusText(project.status)}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="border-b border-slate-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                تفاصيل المشروع
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'invoices'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                الفواتير
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'details' ? (
              <div className="space-y-6">
                {project.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">الوصف</h3>
                    <p className="text-slate-600">{project.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">تاريخ البدء</h3>
                    <p className="text-slate-600">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US') : 'غير محدد'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">تاريخ الانتهاء</h3>
                    <p className="text-slate-600">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('en-US') : 'غير محدد'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">مدير المشروع</h3>
                    <p className="text-slate-600">
                      {project.project_manager?.full_name || '—'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">التكلفة</h3>
                    <p className="text-slate-600">
                      {project.total_cost.toLocaleString('en-US')} {project.currency}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">السعر</h3>
                    <p className="text-slate-600">
                      {project.total_price.toLocaleString('en-US')} {project.currency}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">معلومات العميل</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-600 mb-1"><span className="font-medium">الاسم:</span> {project.client.name}</p>
                    <p className="text-slate-600"><span className="font-medium">البريد الإلكتروني:</span> {project.client.email}</p>
                  </div>
                </div>
              </div>
            ) : (
              <InvoicesTab project={project} onUpdate={onUpdate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
