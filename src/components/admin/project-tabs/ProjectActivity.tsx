import { useState, useEffect } from 'react';
import { Bell, User, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatDateArabic } from '../../../lib/formatters';

interface Activity {
  id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
}

interface ProjectActivityProps {
  projectId: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'أنشأ',
  updated: 'عدل',
  deleted: 'حذف',
  uploaded: 'رفع',
  completed: 'أكمل',
  sent: 'أرسل',
  paid: 'دفع',
};

const ENTITY_LABELS: Record<string, string> = {
  project: 'المشروع',
  invoice: 'الفاتورة',
  item: 'البند',
  file: 'الملف',
  achievement: 'المنجز',
  payment: 'الدفعة',
};

export const ProjectActivity = ({ projectId }: ProjectActivityProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [projectId]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('project_activity_log')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string): string => {
    return ACTION_LABELS[action] || action;
  };

  const getEntityLabel = (entityType: string): string => {
    return ENTITY_LABELS[entityType] || entityType;
  };

  const formatActivityTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    if (diffInMinutes < 1440) return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
    return formatDateArabic(dateString);
  };

  if (loading) {
    return (
      <div className="text-center text-slate-600 py-8">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#0A2A66]/10 to-[#1B4FA9]/10
            border border-[#0A2A66]/20">
            <Bell className="w-5 h-5 text-[#0A2A66]" />
          </div>
          سجل النشاط
        </h2>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700
            flex items-center justify-center">
            <Bell className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">لا توجد أنشطة مسجلة</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-6">
          <div className="relative">
            <div className="absolute right-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0A2A66]/20
              via-[#1B4FA9]/20 to-transparent dark:from-[#47A1FF]/20 dark:via-[#6BB6FF]/20"></div>

            <div className="space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#0A2A66] to-[#1B4FA9]
                    border-4 border-white dark:border-dark-card flex items-center justify-center z-10 shadow-lg">
                    <User className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-dark-border p-4
                      hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{activity.user_name}</span>
                          <span className="text-slate-600 dark:text-slate-400 mx-1">{getActionLabel(activity.action)}</span>
                          <span className="text-slate-600 dark:text-slate-400">{getEntityLabel(activity.entity_type)}</span>
                          {activity.entity_name && (
                            <span className="font-medium text-[#0A2A66] dark:text-[#47A1FF] mx-1">
                              "{activity.entity_name}"
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatActivityTime(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
