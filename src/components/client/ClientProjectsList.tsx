import { useState, useEffect } from 'react';
import { FolderOpen, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import { formatCurrency, formatDateArabic } from '../../lib/formatters';

export const ClientProjectsList = ({ onViewProject }: { onViewProject: (id: string) => void }) => {
  const { client } = useClientPortal();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!client?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('projects')
          .select('id, name, description, status, start_date, end_date, total_price, currency')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false });
        setProjects(data || []);
      } catch {} finally { setLoading(false); }
    })();
  }, [client?.id]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      request: { label: 'طلب', cls: 'badge badge-gray' },
      quoted: { label: 'مسعّر', cls: 'badge badge-blue' },
      invoiced: { label: 'مفوتر', cls: 'badge badge-purple' },
      po_issued: { label: 'أمر شراء', cls: 'badge badge-green' },
      in_progress: { label: 'قيد التنفيذ', cls: 'badge badge-blue' },
      completed: { label: 'مكتمل', cls: 'badge badge-green' },
      paid: { label: 'مدفوع', cls: 'badge badge-green' },
      cancelled: { label: 'ملغي', cls: 'badge badge-red' },
    };
    return map[status] || { label: status, cls: 'badge badge-gray' };
  };

  const filtered = projects.filter(p =>
    !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <div className="page-title">مشاريعي</div>
          <div className="page-subtitle">جميع المشاريع الخاصة بك</div>
        </div>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="بحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: 260 }} />
      </div>

      {filtered.length === 0 ? (
        <div className="dash-empty" style={{ height: 200 }}>
          <FolderOpen size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد مشاريع</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المشروع</th>
                <th>الحالة</th>
                <th>تاريخ البدء</th>
                <th>القيمة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(project => {
                const badge = getStatusBadge(project.status);
                return (
                  <tr key={project.id} onClick={() => onViewProject(project.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className="td-primary">{project.name}</span>
                      {project.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.description}</div>
                      )}
                    </td>
                    <td><span className={badge.cls}>{badge.label}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{project.start_date ? formatDateArabic(project.start_date) : '-'}</td>
                    <td style={{ fontWeight: 600 }} dir="ltr">{formatCurrency(project.total_price, project.currency)}</td>
                    <td><ArrowLeft size={14} style={{ color: 'var(--text-muted)' }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
