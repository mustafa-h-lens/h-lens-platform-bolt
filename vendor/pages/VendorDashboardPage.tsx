import { FolderOpen, Users, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { useVendor } from '../../../contexts/VendorContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getTheme } from '../../../theme/tokens';
import { useFetch, fetchDashboardStats } from '../hooks/useVendorData';
import { PageTitle, VCard, Skeleton, EmptyState } from '../shared/VendorUI';
import { formatCurrency } from '../../../lib/formatters';

export const VendorDashboardPage = () => {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const { data: stats, loading } = useFetch(
    () => fetchDashboardStats(vendor!.id),
    [vendor?.id]
  );

  const cards = [
    { label: 'عدد المشاريع',          value: stats?.projectsCount ?? 0, icon: FolderOpen,   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    { label: 'عدد العملاء',            value: stats?.clientsCount  ?? 0, icon: Users,        color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
    { label: 'إجمالي المبالغ',         value: formatCurrency(stats?.totalAmount   ?? 0), icon: DollarSign,  color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
    { label: 'المبالغ المسددة',        value: formatCurrency(stats?.paidAmount    ?? 0), icon: CheckCircle, color: '#059669', bg: 'rgba(5,150,105,0.1)'   },
    { label: 'المبالغ غير المسددة',   value: formatCurrency(stats?.unpaidAmount  ?? 0), icon: Clock,       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  ];

  return (
    <div>
      <PageTitle
        title={`مرحباً، ${vendor?.full_name?.split(' ')[0] || 'مورد'} 👋`}
        subtitle="نظرة عامة على حسابك ومشاريعك"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {loading
          ? Array(5).fill(0).map((_, i) => (
              <VCard key={i}>
                <Skeleton h={16} w="60%" radius={4} />
                <div style={{ marginTop: 12 }}><Skeleton h={28} w="40%" radius={4} /></div>
              </VCard>
            ))
          : cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <VCard key={i} style={{ borderRight: `3px solid ${card.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.73rem', color: theme.text.muted, marginBottom: 8, fontWeight: 600 }}>{card.label}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: card.color, direction: 'ltr', display: 'inline-block' }}>
                        {card.value}
                      </div>
                    </div>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} color={card.color} />
                    </div>
                  </div>
                </VCard>
              );
            })
        }
      </div>

      {!loading && stats?.projectsCount === 0 && (
        <VCard style={{ marginTop: 20, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <EmptyState
            icon={<FolderOpen size={44} />}
            title="لم يتم تعيينك على أي مشروع بعد"
            subtitle="سيظهر هنا ملخص مشاريعك وفواتيرك عند تعيينك من قِبل الإدارة"
          />
        </VCard>
      )}
    </div>
  );
};
