import { useState, useEffect } from 'react';
import { Plus, Search, Users, UserCheck, UserPlus, HeartHandshake, Globe, Eye, Pencil, FolderPlus, Trash2, MoreHorizontal, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import { MultiSelectFilter } from '../../shared/MultiSelectFilter';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { ClientModal } from './ClientModal';
import { formatNumber, formatDateArabic } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import type { Client } from '../../../types/database';

interface ClientWithProjects extends Client {
  projects_count?: number;
}

interface ClientsPageProps {
  onViewClient?: (clientId: string) => void;
}

const CLIENT_ICONS = [Users, UserCheck, UserPlus, HeartHandshake];
const CLIENT_COLORS = [
  { bg: 'var(--accent-glow)', color: 'var(--accent-lighter)' },
  { bg: 'var(--success-bg)', color: 'var(--success-text)' },
  { bg: 'var(--warning-bg)', color: 'var(--warning-text)' },
  { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
  { bg: 'var(--info-bg)', color: 'var(--info-text)' },
  { bg: 'var(--danger-bg)', color: 'var(--danger-text)' },
];

const getClientStyle = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
};

export const ClientsPage = ({ onViewClient }: ClientsPageProps) => {
  const { showError } = useNotification();
  const [clients, setClients] = useState<ClientWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('updated');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, newThisQuarter: 0, retention: 0 });

  useEffect(() => { loadClients(); }, [page, sortBy, pageSize]);
  useEffect(() => { setPage(0); }, [searchQuery, statusFilter]);

  useEffect(() => {
    const handleClick = () => setOpenDropdown(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' });

      // Apply sort
      if (sortBy === 'name') {
        query = query.order('name', { ascending: true });
      } else if (sortBy === 'projects') {
        query = query.order('created_at', { ascending: false }); // sort by projects done client-side
      } else {
        query = query.order('created_at', { ascending: false }); // default: newest first
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      setTotalCount(count || 0);

      const clientsWithCounts = await Promise.all(
        (data || []).map(async (client) => {
          const { count } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', client.id);
          return { ...client, projects_count: count || 0 };
        })
      );

      // Client-side sort for project count
      if (sortBy === 'projects') {
        clientsWithCounts.sort((a, b) => (b.projects_count || 0) - (a.projects_count || 0));
      }
      setClients(clientsWithCounts);

      // Calculate stats
      const totalClients = count || 0;

      // New this quarter: clients created in current quarter
      const now = new Date();
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3; // 0, 3, 6, 9
      const quarterStart = new Date(now.getFullYear(), quarterMonth, 1).toISOString();
      const { count: newQ } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', quarterStart);

      // Retention: clients with at least 2 projects / clients with at least 1 project
      const { data: projectCounts } = await supabase
        .from('projects')
        .select('client_id');
      const clientProjectMap = new Map<string, number>();
      (projectCounts || []).forEach((p: any) => {
        clientProjectMap.set(p.client_id, (clientProjectMap.get(p.client_id) || 0) + 1);
      });
      const returningClients = [...clientProjectMap.values()].filter(c => c >= 2).length;
      const retentionRate = totalClients > 0 ? Math.round((returningClients / totalClients) * 100) : 0;

      const activeClients = clientProjectMap.size; // clients with at least 1 project
      setStats({
        total: totalClients,
        active: Math.max(0, activeClients),
        newThisQuarter: Math.max(0, newQ || 0),
        retention: Math.max(0, Math.min(100, retentionRate)),
      });
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`هل أنت متأكد من حذف العميل "${client.name}"؟`)) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', client.id);
      if (error) throw error;
      loadClients();
    } catch (error: any) {
      if (error.code === '23503') {
        showError('لا يمكن حذف هذا العميل لأنه مرتبط بمشاريع أخرى');
      } else {
        showError('حدث خطأ أثناء حذف العميل');
      }
    }
  };

  const filtered = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.website && (c as any).website.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes((c as any).invitation_status || 'not_invited');
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div style={{ padding: 28 }}>
      {/* Page Title */}
      <div className="page-title-row">
        <div>
          <div className="page-title">العملاء</div>
          <div className="page-subtitle">إدارة وتتبع جميع العملاء</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedClient(null); setShowModal(true); }}>
          <Plus size={16} /> إضافة عميل
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card sc-blue">
          <div className="stat-icon-box"><Users size={18} /></div>
          <div className="stat-sub">إجمالي العملاء</div>
          <div className="stat-val">{formatNumber(stats.total)}</div>
          <div className="stat-hint">جميع العملاء المسجلين في النظام</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><UserCheck size={18} /></div>
          <div className="stat-sub">العملاء النشطون</div>
          <div className="stat-val">{formatNumber(stats.active)}</div>
          <div className="stat-hint">عملاء لديهم مشاريع نشطة</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><UserPlus size={18} /></div>
          <div className="stat-sub">عملاء جدد هذا الربع</div>
          <div className="stat-val">{formatNumber(stats.newThisQuarter)}</div>
          <div className="stat-hint">تم إضافتهم منذ بداية الربع الحالي</div>
        </div>
        <div className="stat-card sc-purple">
          <div className="stat-icon-box"><HeartHandshake size={18} /></div>
          <div className="stat-sub">معدل الاحتفاظ</div>
          <div className="stat-val">{stats.retention}%</div>
          <div className="stat-hint">عملاء لديهم أكثر من مشروع واحد</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          className="input"
          placeholder="بحث بالاسم أو الموقع..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <MultiSelectFilter
          label="حالة البوابة"
          options={[
            { value: 'active', label: 'نشط' },
            { value: 'pending', label: 'بانتظار الدخول' },
            { value: 'not_invited', label: 'غير مدعو' },
          ]}
          selected={statusFilter}
          onToggle={(v) => setStatusFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
        />
        <select className="input select" style={{ maxWidth: 180 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="updated">ترتيب حسب: الأحدث</option>
          <option value="name">الاسم</option>
          <option value="projects">عدد المشاريع</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setStatusFilter([]); setSortBy('updated'); }}>
          <RotateCcw size={13} /> إعادة تعيين
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>
      ) : filtered.length === 0 ? (
        <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد عملاء'}</span></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>العميل</th>
                <th>الموقع الإلكتروني</th>
                <th>الحالة</th>
                <th>تاريخ الانضمام</th>
                <th>المشاريع</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const cStyle = getClientStyle(client.id);
                return (
                  <tr key={client.id} onClick={() => onViewClient?.(client.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="user-row">
                        {client.client_image ? (
                          <div className="client-logo">
                            <img src={client.client_image} alt={client.name} />
                          </div>
                        ) : (
                          <div className="client-logo" style={{ background: cStyle.bg, color: cStyle.color, border: 'none' }}>
                            <Users size={18} />
                          </div>
                        )}
                        <div className="u-name">{client.name}</div>
                      </div>
                    </td>
                    <td>
                      {client.website ? (
                        <span className="client-website"><Globe size={12} /> {client.website}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const status = (client as any).invitation_status || 'not_invited';
                        switch (status) {
                          case 'active':
                            return <span className="badge badge-green"><span className="badge-dot" style={{ background: 'var(--success)' }} /> نشط</span>;
                          case 'pending':
                            return <span className="badge badge-amber"><span className="badge-dot" style={{ background: 'var(--warning)' }} /> بانتظار الدخول</span>;
                          default:
                            return <span className="badge badge-gray"><span className="badge-dot" style={{ background: 'var(--text-muted)' }} /> غير مدعو</span>;
                        }
                      })()}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {client.created_at ? client.created_at.split('T')[0] : '-'}
                    </td>
                    <td className="td-primary">{formatNumber(client.projects_count || 0)}</td>
                    <td className="actions-cell" onClick={e => e.stopPropagation()}>
                      <button
                        className={`actions-btn ${openDropdown === client.id ? 'open' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === client.id ? null : client.id); }}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {openDropdown === client.id && (
                        <div className="actions-dropdown show">
                          <button className="dd-item" onClick={() => { onViewClient?.(client.id); setOpenDropdown(null); }}><Eye size={15} /> عرض التفاصيل</button>
                          <button className="dd-item" onClick={() => { setSelectedClient(client); setShowModal(true); setOpenDropdown(null); }}><Pencil size={15} /> تعديل العميل</button>
                          <button className="dd-item"><FolderPlus size={15} /> إضافة مشروع</button>
                          <div className="dd-sep" />
                          <button className="dd-item dd-danger" onClick={() => { handleDelete(client); setOpenDropdown(null); }}><Trash2 size={15} /> حذف العميل</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="pagination">
          <div className="pag-info">عرض <strong>{toEnglishNumbers((page * pageSize + 1).toString())}-{toEnglishNumbers(Math.min((page + 1) * pageSize, totalCount).toString())}</strong> من <strong>{toEnglishNumbers(totalCount.toString())}</strong> عميل</div>
          <div className="pag-controls">
            <button className={`pag-btn ${page === 0 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronRight size={15} /></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
              <button key={i} className={`pag-btn ${page === i ? 'active' : ''}`} onClick={() => setPage(i)}>{toEnglishNumbers((i + 1).toString())}</button>
            ))}
            {totalPages > 5 && <>
              <button className="pag-btn" style={{ fontSize: 11, letterSpacing: 1 }}>...</button>
              <button className={`pag-btn ${page === totalPages - 1 ? 'active' : ''}`} onClick={() => setPage(totalPages - 1)}>{toEnglishNumbers(totalPages.toString())}</button>
            </>}
            <button className={`pag-btn ${page >= totalPages - 1 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronLeft size={15} /></button>
          </div>
          <div className="pag-per-page">عرض <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select> لكل صفحة</div>
        </div>
      )}

      {showModal && (
        <ClientModal
          client={selectedClient}
          onClose={() => { setShowModal(false); setSelectedClient(null); }}
          onSuccess={loadClients}
        />
      )}
    </div>
  );
};
