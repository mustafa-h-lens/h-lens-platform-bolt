import { useState, useEffect } from 'react';
import { FolderOpen, Users, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency } from '../../../../lib/formatters';

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
    projectsCount: 0,
    clientsCount: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [vendorId]);

  const fetchStats = async () => {
    try {
      const { data: invoices, error } = await supabase
        .from('vendor_invoices')
        .select('*')
        .eq('vendor_id', vendorId);

      if (error) throw error;

      const projectIds = new Set(invoices?.map(inv => inv.project_id) || []);
      const clientIds = new Set(invoices?.map(inv => inv.client_id) || []);

      const totalAmount = invoices?.reduce((sum, inv) => sum + Number(inv.amount_total || 0), 0) || 0;
      const paidAmount = invoices?.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0) || 0;
      const unpaidAmount = totalAmount - paidAmount;

      setStats({
        projectsCount: projectIds.size,
        clientsCount: clientIds.size,
        totalAmount,
        paidAmount,
        unpaidAmount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'عدد المشاريع',
      value: stats.projectsCount,
      icon: FolderOpen,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'عدد العملاء',
      value: stats.clientsCount,
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'إجمالي المبالغ',
      value: formatCurrency(stats.totalAmount),
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'المبالغ المسددة',
      value: formatCurrency(stats.paidAmount),
      icon: CheckCircle,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'المبالغ غير المسددة',
      value: formatCurrency(stats.unpaidAmount),
      icon: Clock,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">نظرة عامة</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-2">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {stats.projectsCount === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-900 font-medium">لم يتم تعيين هذا المورد على أي مشروع بعد</p>
          <p className="text-blue-700 text-sm mt-2">قم بتعيين المورد على مشروع لبدء تتبع الفواتير والمدفوعات</p>
        </div>
      )}
    </div>
  );
};
