import { useState, useEffect, useCallback } from 'react';
import { Bell, User, Clock, Search, FolderOpen, Briefcase, Users, UserCog, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { formatDateArabic } from '../../lib/formatters';
import { AdvancedFilterBar, type FilterConfig } from '../ui/AdvancedFilterBar';
import { navigate } from '../../lib/router';

interface ActivityEntry {
  id: string;
  source_type: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  user_name: string;
  user_id: string | null;
  action_details: Record<string, unknown> | null;
  created_at: string;
}

interface UserOption {
  id: string;
  full_name: string;
}

const PAGE_SIZE = 30;

const ACTION_LABELS: Record<string, string> = {
  created: 'أنشأ',
  updated: 'عدل',
  deleted: 'حذف',
  uploaded: 'رفع',
  completed: 'أكمل',
  sent: 'أرسل',
  paid: 'دفع',
  status_changed: 'غير الحالة',
  project_created: 'أنشأ مشروع',
  item_added: 'أضاف بند',
  item_updated: 'عدل بند',
  item_deleted: 'حذف بند',
  file_uploaded: 'رفع ملف',
  file_deleted: 'حذف ملف',
  invoice_created: 'أنشأ فاتورة',
  invoice_status_changed: 'غير حالة الفاتورة',
};

const SOURCE_LABELS: Record<string, string> = {
  project: 'مشروع',
  vendor: 'مورد',
  system: 'النظام',
};

const ENTITY_LABELS: Record<string, string> = {
  project: 'مشروع',
  vendor: 'مورد',
  client: 'عميل',
  user: 'مستخدم',
  invoice: 'فاتورة',
  item: 'بند',
  file: 'ملف',
};

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  project: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  vendor: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  system: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
};

const getSourceIcon = (sourceType: string) => {
  switch (sourceType) {
    case 'project': return FolderOpen;
    case 'vendor': return Briefcase;
    case 'system': return UserCog;
    default: return Bell;
  }
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

export const ActivityLogPage = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, sourceFilter, actionFilter, userFilter, dateFrom, dateTo]);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('global_activity_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.ilike('entity_name', `%${searchQuery.trim()}%`);
      }
      if (sourceFilter) {
        query = query.eq('source_type', sourceFilter);
      }
      if (actionFilter) {
        query = query.eq('action_type', actionFilter);
      }
      if (userFilter) {
        query = query.eq('user_id', userFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setActivities(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, sourceFilter, actionFilter, userFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name');
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleEntityClick = (activity: ActivityEntry) => {
    if (!activity.entity_id) return;
    switch (activity.source_type) {
      case 'project':
        navigate(`/projects/${activity.entity_id}`);
        break;
      case 'vendor':
        navigate(`/vendors/${activity.entity_id}`);
        break;
      case 'system':
        if (activity.entity_type === 'client') {
          navigate(`/clients/${activity.entity_id}`);
        }
        break;
    }
  };

  const isClickable = (activity: ActivityEntry) => {
    if (!activity.entity_id) return false;
    if (activity.source_type === 'project' || activity.source_type === 'vendor') return true;
    if (activity.source_type === 'system' && activity.entity_type === 'client') return true;
    return false;
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSourceFilter('');
    setActionFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = sourceFilter || actionFilter || userFilter || dateFrom || dateTo;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const actionOptions = [
    { label: 'الكل', value: '' },
    { label: 'إنشاء', value: 'created' },
    { label: 'تعديل', value: 'updated' },
    { label: 'حذف', value: 'deleted' },
    { label: 'رفع', value: 'uploaded' },
    { label: 'تغيير حالة', value: 'status_changed' },
    { label: 'إنشاء مشروع', value: 'project_created' },
    { label: 'إضافة بند', value: 'item_added' },
    { label: 'تعديل بند', value: 'item_updated' },
    { label: 'حذف بند', value: 'item_deleted' },
    { label: 'رفع ملف', value: 'file_uploaded' },
    { label: 'حذف ملف', value: 'file_deleted' },
    { label: 'إنشاء فاتورة', value: 'invoice_created' },
    { label: 'تغيير حالة فاتورة', value: 'invoice_status_changed' },
    { label: 'دفع', value: 'paid' },
    { label: 'إرسال', value: 'sent' },
    { label: 'إكمال', value: 'completed' },
  ];

  const filters: FilterConfig[] = [
    {
      type: 'select',
      label: 'نوع المصدر',
      value: sourceFilter,
      options: [
        { label: 'الكل', value: '' },
        { label: 'مشاريع', value: 'project' },
        { label: 'موردين', value: 'vendor' },
        { label: 'النظام', value: 'system' },
      ],
      onChange: setSourceFilter,
    },
    {
      type: 'select',
      label: 'نوع الإجراء',
      value: actionFilter,
      options: actionOptions,
      onChange: setActionFilter,
    },
    {
      type: 'select',
      label: 'المستخدم',
      value: userFilter,
      options: [
        { label: 'الكل', value: '' },
        ...users.map((u) => ({ label: u.full_name, value: u.id })),
      ],
      onChange: setUserFilter,
    },
    {
      type: 'dateRange',
      label: 'الفترة',
      fromValue: dateFrom,
      toValue: dateTo,
      onFromChange: setDateFrom,
      onToChange: setDateTo,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="بحث باسم العنصر..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-12 pl-4 py-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border
            rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-[#1B4FA9]/30 focus:border-[#1B4FA9]
            transition-all"
        />
      </div>

      {/* Filter bar */}
      <AdvancedFilterBar
        filters={filters}
        onReset={hasActiveFilters ? resetFilters : undefined}
      />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {totalCount > 0 ? `${totalCount} نشاط` : 'لا توجد نتائج'}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            صفحة {page + 1} من {totalPages}
          </p>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-center text-slate-600 dark:text-slate-400 py-12">
          جاري التحميل...
        </div>
      ) : activities.length === 0 ? (
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
            <div className="absolute right-[15px] top-0 bottom-0 w-0.5"
              style={{ background: `linear-gradient(to bottom, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent)` }}></div>

            <div className="space-y-6">
              {activities.map((activity) => {
                const SourceIcon = getSourceIcon(activity.source_type);
                const colors = SOURCE_COLORS[activity.source_type] || SOURCE_COLORS.system;
                const clickable = isClickable(activity);

                return (
                  <div key={activity.id} className="relative flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border-4 border-white dark:border-dark-card flex items-center justify-center z-10 shadow-lg"
                      style={{ backgroundColor: 'var(--color-primary)' }}>
                      <User className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>

                    <div className="flex-1 pb-6">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-dark-border p-4
                        hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{activity.user_name}</span>
                            <span className="text-slate-600 dark:text-slate-400 mx-1">
                              {ACTION_LABELS[activity.action_type] || activity.action_type}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              {ENTITY_LABELS[activity.entity_type] || activity.entity_type}
                            </span>
                            {activity.entity_name && (
                              clickable ? (
                                <button
                                  onClick={() => handleEntityClick(activity)}
                                  className="font-medium text-[#0A2A66] dark:text-[#47A1FF] mx-1
                                    hover:underline cursor-pointer"
                                >
                                  "{activity.entity_name}"
                                </button>
                              ) : (
                                <span className="font-medium text-[#0A2A66] dark:text-[#47A1FF] mx-1">
                                  "{activity.entity_name}"
                                </span>
                              )
                            )}
                          </div>

                          {/* Source badge */}
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                            border ${colors.bg} ${colors.text} ${colors.border}`}>
                            <SourceIcon className="w-3 h-3" />
                            {SOURCE_LABELS[activity.source_type] || activity.source_type}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatActivityTime(activity.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
              border border-slate-200 dark:border-dark-border
              bg-white dark:bg-dark-card text-slate-700 dark:text-slate-200
              hover:bg-slate-50 dark:hover:bg-slate-700
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all"
          >
            <ChevronRight className="w-4 h-4" />
            السابق
          </button>

          <span className="text-sm text-slate-600 dark:text-slate-400">
            {page + 1} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
              border border-slate-200 dark:border-dark-border
              bg-white dark:bg-dark-card text-slate-700 dark:text-slate-200
              hover:bg-slate-50 dark:hover:bg-slate-700
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all"
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
