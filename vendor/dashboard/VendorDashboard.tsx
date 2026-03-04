import { FolderOpen, Users, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { useVendor } from '../../contexts/VendorContext';
import { useVendorStats } from '../../hooks/useVendorData';
import { VCard, SkeletonCard, EmptyState, useVT } from './shared/UI';
import { formatCurrency } from '../../lib/formatters';

export function VendorDashboard() {
  const { vendor } = useVendor();
  const t = useVT();
  const { stats, loading } = useVendorStats(vendor?.id || '');

  const cards = stats ? [
    { label: 'عدد المشاريع',         value: String(stats.projectsCount),         icon: FolderOpen,    grad: 'linear-gradient(135deg,#1d4ed8,#2563eb)', shadow: 'rgba(37,99,235,0.25)' },
    { label: 'عدد العملاء',          value: String(stats.clientsCount),           icon: Users,         grad: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', shadow: 'rgba(124,58,237,0.25)' },
    { label: 'إجمالي المبالغ',       value: formatCurrency(stats.totalAmount),    icon: DollarSign,    grad: 'linear-gradient(135deg,#0891b2,#06b6d4)', shadow: 'rgba(8,145,178,0.25)' },
    { label: 'المبالغ المسددة',      value: formatCurrency(stats.paidAmount),     icon: CheckCircle,   grad: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(5,150,105,0.25)' },
    { label: 'المبالغ غير المسددة',  value: formatCurrency(stats.unpaidAmount),   icon: Clock,         grad: 'linear-gradient(135deg,#d97706,#f59e0b)', shadow: 'rgba(217,119,6,0.25)' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Welcome */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#0A2A66,#1B4FA9)',
        borderRadius: 18, padding: '1.25rem 1.5rem', color: 'white',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>
            أهلاً، {vendor?.full_name} 👋
          </div>
          <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>
            إليك نظرة سريعة على حسابك
          </div>
        </div>
        <div style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
      </div>

      {/* Stats grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : stats?.projectsCount === 0 ? (
        <VCard>
          <EmptyState
            icon={<FolderOpen size={40} />}
            title="لم يتم تعيينك على أي مشروع بعد"
            subtitle="ستظهر إحصائياتك هنا بعد إسناد مشروع إليك من قِبل الإدارة"
          />
        </VCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} style={{
                borderRadius: 14, padding: '1rem',
                background: t.background.card,
                border: `1px solid ${t.border.default}`,
                position: 'relative', overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${card.shadow}`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: card.grad, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12, boxShadow: `0 4px 12px ${card.shadow}`,
                }}>
                  <Icon size={20} color="white" />
                </div>
                <div style={{ fontSize: '0.72rem', color: t.text.muted, marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: t.text.primary, direction: 'ltr', textAlign: 'right' }}>{card.value}</div>
                <div style={{ position: 'absolute', bottom: -16, left: -16, width: 60, height: 60, background: card.grad, borderRadius: '50%', opacity: 0.06 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Account info quick view */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <VCard>
          <div style={{ fontSize: '0.72rem', color: t.text.muted, fontWeight: 700, marginBottom: 8 }}>معلومات الحساب</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'نوع الحساب', value: vendor?.vendor_type || '—' },
              { label: 'مدينة العمل', value: vendor?.primary_city || '—' },
              { label: 'الحالة', value: vendor?.status === 'active' ? '✅ نشط' : vendor?.status || '—' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: t.text.muted }}>{item.label}</span>
                <span style={{ color: t.text.primary, fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </VCard>

        <VCard>
          <div style={{ fontSize: '0.72rem', color: t.text.muted, fontWeight: 700, marginBottom: 8 }}>عضويتك منذ</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: t.primary.main }}>
            {vendor?.created_at ? new Date(vendor.created_at).getFullYear() : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: t.text.muted, marginTop: 4 }}>
            {vendor?.created_at ? new Date(vendor.created_at).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }) : ''}
          </div>
        </VCard>
      </div>
    </div>
  );
}
