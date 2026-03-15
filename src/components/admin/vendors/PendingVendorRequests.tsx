import { useState, useEffect } from 'react';
import { Search, Eye, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { STATUS_LABELS, VendorStatus } from '../../../lib/vendorStatusMachine';

interface PendingVendor {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  vendor_type?: string;
  nationality?: string;
  primary_city?: string;
  primary_field?: string;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

interface PendingVendorRequestsProps {
  onSelectVendor: (vendorId: string) => void;
  refreshTrigger?: number;
}

export const PendingVendorRequests = ({ onSelectVendor, refreshTrigger }: PendingVendorRequestsProps) => {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPendingVendors();
  }, [refreshTrigger]);

  const fetchPendingVendors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .in('status', ['pending_approval', 'revision_requested'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching pending vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = vendors.filter(v =>
    v.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.phone.includes(searchTerm) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const formatted = new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return toEnglishNumbers(formatted);
  };

  const getStatusBadge = (status: VendorStatus) => {
    const s = STATUS_LABELS[status];
    return s || STATUS_LABELS.pending_approval;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو رقم الجوال أو البريد..."
            className="w-full pr-9 pl-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>
        <button
          onClick={fetchPendingVendors}
          className="p-2 rounded-lg border transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          title="تحديث"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <Clock size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">لا توجد طلبات تسجيل معلقة</p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-table-header)', borderBottom: '1px solid var(--color-table-border)' }}>
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المورد</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>النوع</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المدينة</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>تاريخ التقديم</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الحالة</th>
                <th className="px-6 py-4 text-center text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vendor, index) => {
                const badge = getStatusBadge(vendor.status);
                return (
                  <tr
                    key={vendor.id}
                    className="transition-colors"
                    style={{ borderBottom: index < filtered.length - 1 ? '1px solid var(--color-table-border)' : 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-table-row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{vendor.full_name}</span>
                        {vendor.nationality && (
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{vendor.nationality}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {vendor.vendor_type === 'company' ? 'شركة' : 'فرد'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{vendor.primary_city || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(vendor.created_at)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium inline-block"
                        style={{ backgroundColor: badge.bgColor, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onSelectVendor(vendor.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                        style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
                      >
                        <Eye size={14} />
                        مراجعة
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {toEnglishNumbers(filtered.length.toString())} طلب معلق
      </div>
    </div>
  );
};
