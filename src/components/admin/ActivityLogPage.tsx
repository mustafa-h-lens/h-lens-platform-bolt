import { useState, useEffect, useCallback } from 'react';
import { Bell, User, Clock, FolderOpen, Briefcase, UserCog, ChevronLeft, ChevronRight, RotateCcw, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { formatDateArabic, formatNumber } from '../../lib/formatters';
import { toEnglishNumbers } from '../../lib/numberUtils';
import { MultiSelectFilter } from '../shared/MultiSelectFilter';
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
  // Projects
  project_created: 'أنشأ مشروع',
  project_updated: 'عدل مشروع',
  project_deleted: 'حذف مشروع',
  project_status_changed: 'غير حالة مشروع',
  // Project Items
  item_added: 'أضاف بند',
  item_updated: 'عدل بند',
  item_deleted: 'حذف بند',
  project_item_added: 'أضاف بند مشروع',
  project_item_updated: 'عدل بند مشروع',
  project_item_deleted: 'حذف بند مشروع',
  // Project Files
  file_uploaded: 'رفع ملف',
  file_deleted: 'حذف ملف',
  project_file_uploaded: 'رفع ملف مشروع',
  project_file_deleted: 'حذف ملف مشروع',
  // Invoices
  invoice_created: 'أنشأ فاتورة',
  invoice_updated: 'عدل فاتورة',
  invoice_deleted: 'حذف فاتورة',
  invoice_status_changed: 'غير حالة الفاتورة',
  invoice_payment_recorded: 'سجل دفعة فاتورة',
  // Vendors
  vendor_created: 'أنشأ مورد',
  vendor_updated: 'عدل بيانات مورد',
  vendor_deleted: 'حذف مورد',
  vendor_status_changed: 'غير حالة مورد',
  vendor_approved: 'وافق على مورد',
  vendor_rejected: 'رفض مورد',
  vendor_revision_requested: 'طلب تعديلات من مورد',
  vendor_submitted: 'تقدم بطلب تسجيل',
  vendor_resubmitted: 'أعاد تقديم طلب التسجيل',
  // Vendor Equipment
  equipment_added: 'أضاف معدة',
  equipment_updated: 'عدل معدة',
  equipment_deleted: 'حذف معدة',
  // Vendor Documents
  document_uploaded: 'رفع مستند',
  document_deleted: 'حذف مستند',
  // Vendor Financial Data
  financial_data_added: 'أضاف بيانات مالية',
  financial_data_updated: 'عدل بيانات مالية',
  financial_data_deleted: 'حذف بيانات مالية',
  // Vendor Travel Documents
  travel_doc_added: 'أضاف وثيقة سفر',
  travel_doc_updated: 'عدل وثيقة سفر',
  travel_doc_deleted: 'حذف وثيقة سفر',
  // Vendor Suggestions
  suggestion_submitted: 'قدم اقتراح',
  suggestion_status_changed: 'غير حالة اقتراح',
  suggestion_updated: 'عدل اقتراح',
  suggestion_deleted: 'حذف اقتراح',
  // Expenses
  expense_created: 'أنشأ مصروف',
  expense_status_changed: 'غير حالة مصروف',
  expense_deleted: 'حذف مصروف',
  payment_added: 'أضاف دفعة',
  payment_deleted: 'حذف دفعة',
  // Purchase Orders
  po_created: 'أنشأ أمر شراء',
  po_status_changed: 'غير حالة أمر شراء',
  po_deleted: 'حذف أمر شراء',
  // Production Tasks
  task_created: 'أنشأ مهمة إنتاجية',
  task_status_changed: 'غير حالة مهمة',
  task_deleted: 'حذف مهمة',
  // Task-PO Allocations
  allocation_created: 'أنشأ تخصيص مهمة-أمر شراء',
  allocation_updated: 'عدل تخصيص مهمة-أمر شراء',
  allocation_deleted: 'حذف تخصيص مهمة-أمر شراء',
  // Service Items
  service_item_created: 'أنشأ بند خدمة',
  service_item_updated: 'عدل بند خدمة',
  service_item_deactivated: 'أوقف بند خدمة',
  service_item_deleted: 'حذف بند خدمة',
  // Equipment Brands & Categories
  equipment_brand_created: 'أنشأ علامة تجارية للمعدات',
  equipment_brand_updated: 'عدل علامة تجارية للمعدات',
  equipment_brand_deleted: 'حذف علامة تجارية للمعدات',
  equipment_category_created: 'أنشأ فئة معدات',
  equipment_category_updated: 'عدل فئة معدات',
  equipment_category_deleted: 'حذف فئة معدات',
  // Settings
  settings_updated: 'عدل الإعدادات',
  po_settings_created: 'أنشأ إعدادات أوامر الشراء',
  po_settings_updated: 'عدل إعدادات أوامر الشراء',
  terms_privacy_created: 'أنشأ شروط/خصوصية',
  terms_privacy_updated: 'عدل شروط/خصوصية',
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
  project_item: 'بند مشروع',
  file: 'ملف',
  project_file: 'ملف مشروع',
  equipment: 'معدة',
  document: 'مستند',
  financial_data: 'بيانات مالية',
  travel_document: 'وثيقة سفر',
  suggestion: 'اقتراح',
  expense: 'مصروف',
  payment: 'دفعة',
  purchase_order: 'أمر شراء',
  production_task: 'مهمة إنتاجية',
  task_po_allocation: 'تخصيص مهمة',
  service_item: 'بند خدمة',
  equipment_brand: 'علامة تجارية',
  equipment_category: 'فئة معدات',
  settings: 'إعدادات',
  po_settings: 'إعدادات أوامر الشراء',
  terms_privacy: 'شروط وخصوصية',
};

const getSourceBadge = (sourceType: string): string => {
  switch (sourceType) {
    case 'project': return 'badge badge-blue';
    case 'vendor': return 'badge badge-amber';
    case 'system': return 'badge badge-purple';
    default: return 'badge badge-gray';
  }
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
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<string[]>([]);

  const toggleFilter = (key: 'source' | 'action' | 'user', value: string) => {
    const setter = key === 'source' ? setSourceFilter : key === 'action' ? setActionFilter : setUserFilter;
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, sourceFilter, actionFilter, userFilter]);

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
      if (sourceFilter.length > 0) {
        query = query.in('source_type', sourceFilter);
      }
      if (actionFilter.length > 0) {
        query = query.in('action_type', actionFilter);
      }
      if (userFilter.length > 0) {
        query = query.in('user_id', userFilter);
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
  }, [page, searchQuery, sourceFilter, actionFilter, userFilter]);

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
    const details = activity.action_details || {};
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
        } else if (activity.entity_type === 'project') {
          navigate(`/projects/${activity.entity_id}`);
        } else if (activity.entity_type === 'project_item' || activity.entity_type === 'project_file') {
          const projectId = details.project_id as string;
          if (projectId) navigate(`/projects/${projectId}`);
        } else if (activity.entity_type === 'invoice') {
          const projectId = details.project_id as string;
          if (projectId) navigate(`/projects/${projectId}`);
        }
        break;
    }
  };

  const isClickable = (activity: ActivityEntry) => {
    if (!activity.entity_id) return false;
    if (activity.source_type === 'project' || activity.source_type === 'vendor') return true;
    if (activity.source_type === 'system') {
      const clickableTypes = ['client', 'project', 'project_item', 'project_file', 'invoice'];
      return clickableTypes.includes(activity.entity_type);
    }
    return false;
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSourceFilter([]);
    setActionFilter([]);
    setUserFilter([]);
  };

  const hasActiveFilters = sourceFilter.length > 0 || actionFilter.length > 0 || userFilter.length > 0;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && activities.length === 0) {
    return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ padding: 28 }}>
      {/* Page Title */}
      <div className="page-title-row">
        <div>
          <div className="page-title">سجل النشاط</div>
          <div className="page-subtitle">متابعة جميع العمليات والتغييرات في النظام</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card sc-blue">
          <div className="stat-icon-box"><Activity size={18} /></div>
          <div className="stat-sub">إجمالي الأنشطة</div>
          <div className="stat-val">{formatNumber(totalCount)}</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><FolderOpen size={18} /></div>
          <div className="stat-sub">أنشطة المشاريع</div>
          <div className="stat-val">{formatNumber(activities.filter(a => a.source_type === 'project').length)}</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><Briefcase size={18} /></div>
          <div className="stat-sub">أنشطة الموردين</div>
          <div className="stat-val">{formatNumber(activities.filter(a => a.source_type === 'vendor').length)}</div>
        </div>
        <div className="stat-card sc-purple">
          <div className="stat-icon-box"><UserCog size={18} /></div>
          <div className="stat-sub">أنشطة النظام</div>
          <div className="stat-val">{formatNumber(activities.filter(a => a.source_type === 'system').length)}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input className="input" placeholder="بحث باسم العنصر..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ maxWidth: 220 }} />

        <MultiSelectFilter
          label="المصدر"
          options={[
            { value: 'project', label: 'مشاريع' },
            { value: 'vendor', label: 'موردين' },
            { value: 'system', label: 'النظام' },
          ]}
          selected={sourceFilter}
          onToggle={v => toggleFilter('source', v)}
        />

        <MultiSelectFilter
          label="الإجراء"
          options={Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))}
          selected={actionFilter}
          onToggle={v => toggleFilter('action', v)}
        />

        <MultiSelectFilter
          label="المستخدم"
          options={users.map(u => ({ value: u.id, label: u.full_name }))}
          selected={userFilter}
          onToggle={v => toggleFilter('user', v)}
        />

        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
            <RotateCcw size={13} /> إعادة تعيين
          </button>
        )}
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="dash-empty" style={{ height: 200 }}>
          <Bell size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد أنشطة مسجلة</span>
        </div>
      ) : (
        <div className="card" style={{ cursor: 'default', padding: 24 }}>
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute', right: 15, top: 0, bottom: 0, width: 2,
              background: 'linear-gradient(to bottom, var(--accent-glow-md), transparent)',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {activities.map((activity) => {
                const SourceIcon = getSourceIcon(activity.source_type);
                const sourceBadgeCls = getSourceBadge(activity.source_type);
                const clickable = isClickable(activity);

                return (
                  <div key={activity.id} style={{ position: 'relative', display: 'flex', gap: 16 }}>
                    {/* Timeline dot */}
                    <div style={{
                      flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                      border: '3px solid var(--bg-surface)',
                      background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1, boxShadow: 'var(--shadow-sm)',
                    }}>
                      <User size={14} style={{ color: '#fff' }} strokeWidth={2.5} />
                    </div>

                    {/* Content card */}
                    <div style={{
                      flex: 1, paddingBottom: 4,
                      background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-soft)', padding: '14px 16px',
                      transition: 'background var(--transition-fast)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1, fontSize: 13, lineHeight: 1.7 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{activity.user_name}</span>
                          <span style={{ color: 'var(--text-secondary)', margin: '0 4px' }}>
                            {ACTION_LABELS[activity.action_type] || activity.action_type}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {ENTITY_LABELS[activity.entity_type] || activity.entity_type}
                          </span>
                          {activity.entity_name && (
                            clickable ? (
                              <button
                                onClick={() => handleEntityClick(activity)}
                                style={{
                                  fontWeight: 500, color: 'var(--accent-lighter)', margin: '0 4px',
                                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                  fontSize: 13, textDecoration: 'none',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                "{activity.entity_name}"
                              </button>
                            ) : (
                              <span style={{ fontWeight: 500, color: 'var(--accent-lighter)', margin: '0 4px' }}>
                                "{activity.entity_name}"
                              </span>
                            )
                          )}
                        </div>

                        {/* Source badge */}
                        <span className={sourceBadgeCls} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <SourceIcon size={11} />
                          {SOURCE_LABELS[activity.source_type] || activity.source_type}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                        <Clock size={11} />
                        <span>{formatActivityTime(activity.created_at)}</span>
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
      {totalPages > 0 && (
        <div className="pagination">
          <div className="pag-info">عرض <strong>{toEnglishNumbers((page * PAGE_SIZE + 1).toString())}-{toEnglishNumbers(Math.min((page + 1) * PAGE_SIZE, totalCount).toString())}</strong> من <strong>{toEnglishNumbers(totalCount.toString())}</strong> نشاط</div>
          <div className="pag-controls">
            <button className={`pag-btn ${page === 0 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronRight size={15} /></button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => (
              <button key={i} className={`pag-btn ${page === i ? 'active' : ''}`} onClick={() => setPage(i)}>{toEnglishNumbers((i + 1).toString())}</button>
            ))}
            {totalPages > 3 && <button className="pag-btn" style={{ fontSize: 11, letterSpacing: 1 }}>...</button>}
            {totalPages > 3 && <button className={`pag-btn ${page === totalPages - 1 ? 'active' : ''}`} onClick={() => setPage(totalPages - 1)}>{toEnglishNumbers(totalPages.toString())}</button>}
            <button className={`pag-btn ${page >= totalPages - 1 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronLeft size={15} /></button>
          </div>
          <div className="pag-per-page">إجمالي: {toEnglishNumbers(totalCount.toString())}</div>
        </div>
      )}
    </div>
  );
};
