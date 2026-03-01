import { useState, useEffect } from 'react';
import { Plus, Star, Link as LinkIcon, ExternalLink, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatDateArabic } from '../../../lib/formatters';

interface Achievement {
  id: string;
  title: string;
  description: string | null;
  link_url: string;
  completed_at: string;
  created_at: string;
}

interface ProjectAchievementsProps {
  projectId: string;
}

export const ProjectAchievements = ({ projectId }: ProjectAchievementsProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, [projectId]);

  const loadAchievements = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('project_achievements')
        .select('*')
        .eq('project_id', projectId)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      setAchievements(data || []);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (achievementId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنجز؟')) return;

    try {
      const { error } = await supabase
        .from('project_achievements')
        .delete()
        .eq('id', achievementId);

      if (error) throw error;

      loadAchievements();
    } catch (error) {
      console.error('Error deleting achievement:', error);
      alert('حدث خطأ أثناء حذف المنجز');
    }
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
            <Star className="w-5 h-5 text-[#0A2A66]" />
          </div>
          منجزات المشروع
        </h2>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
            text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منجز</span>
        </button>
      </div>

      {achievements.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700
            flex items-center justify-center">
            <Star className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">لا توجد منجزات في هذا المشروع</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border divide-y divide-slate-200 dark:divide-dark-border">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#0A2A66]/10 to-[#1B4FA9]/10
                  dark:from-[#0A2A66]/20 dark:to-[#1B4FA9]/20
                  border border-[#0A2A66]/20 dark:border-[#0A2A66]/30 flex items-center justify-center
                  group-hover:scale-110 transition-transform">
                  <LinkIcon className="w-6 h-6 text-[#0A2A66] dark:text-[#47A1FF]" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                    {achievement.title}
                  </h3>

                  {achievement.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {achievement.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mb-3">
                    <a
                      href={achievement.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#0A2A66] dark:text-[#47A1FF] hover:text-[#1B4FA9] dark:hover:text-[#6BB6FF]
                        text-sm font-medium transition-colors"
                      dir="ltr"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="truncate max-w-xs">{achievement.link_url}</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                      مكتمل في {formatDateArabic(achievement.completed_at)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(achievement.id)}
                  className="flex-shrink-0 p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300
                    hover:bg-slate-100 dark:hover:bg-slate-700
                    rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
