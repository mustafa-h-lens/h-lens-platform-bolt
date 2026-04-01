import { useState, useEffect } from 'react';
import { FolderOpen, Users, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency, formatNumber } from '../../../../lib/formatters';

interface DashboardStats {
  projectsCount: number;
  clientsCount: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

interface VendorDashboardProps {
  vendorId: string;
}

export const VendorDashboard = ({ vendorId }: VendorDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    projectsCount: 0, clientsCount: 0, totalAmount: 0, paidAmount: 0, unpaidAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, [vendorId]);

  const fetchStats = async () => {
    try {
      const { data: invoices, error } = await supabase.from('vendor_invoices').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false });
      if (error) throw error;
      const projectIds = new Set(invoices?.map(inv => inv.project_id) || []);
      const clientIds = new Set(invoices?.map(inv => inv.client_id) || []);
      const totalAmount = invoices?.reduce((sum, inv) => sum + Number(inv.amount_total || 0), 0) || 0;
      const paidAmount = invoices?.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0) || 0;
      setStats({ projectsCount: projectIds.size, clientsCount: clientIds.size, totalAmount, paidAmount, unpaidAmount: totalAmount - paidAmount });
    } catch (error) { console.error('Error fetching stats:', error); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div>
      {/* Stat Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card sc-blue">
          <div className="stat-icon-box"><FolderOpen size={18} /></div>
          <div className="stat-sub">عدد المشاريع</div>
          <div className="stat-val">{formatNumber(stats.projectsCount)}</div>
        </div>
        <div className="stat-card sc-purple">
          <div className="stat-icon-box"><Users size={18} /></div>
          <div className="stat-sub">عدد العملاء</div>
          <div className="stat-val">{formatNumber(stats.clientsCount)}</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><DollarSign size={18} /></div>
          <div className="stat-sub">إجمالي المبالغ</div>
          <div className="stat-val" style={{ fontSize: 22 }} dir="ltr">{formatCurrency(stats.totalAmount)}</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><CheckCircle size={18} /></div>
          <div className="stat-sub">المسددة</div>
          <div className="stat-val" style={{ fontSize: 22 }} dir="ltr">{formatCurrency(stats.paidAmount)}</div>
        </div>
      </div>

      {/* Unpaid alert */}
      {stats.unpaidAmount > 0 && (
        <div className="dash-alert" style={{ marginTop: 20 }}>
          <div className="dash-alert-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <div className="card-icon ci-amber" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)' }}><Clock size={14} /></div>
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>مبالغ غير مسددة</span>
                <div style={{ fontSize: 12, color: 'var(--warning-text)', marginTop: 2 }} dir="ltr">{formatCurrency(stats.unpaidAmount)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.projectsCount === 0 && (
        <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: '32px 20px', cursor: 'default' }}>
          <div className="card-icon ci-blue" style={{ width: 48, height: 48, margin: '0 auto 12px', borderRadius: 'var(--radius-lg)' }}>
            <FolderOpen size={22} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>لم يتم تعيين هذا المورد على أي مشروع بعد</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>قم بتعيين المورد على مشروع لبدء تتبع الفواتير والمدفوعات</div>
        </div>
      )}
    </div>
  );
};
