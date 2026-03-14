import { useState, useEffect } from 'react';
import { ExternalLink, User } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency } from '../../../../lib/formatters';

interface Vendor {
  id: string;
  full_name: string;
  profile_image: string | null;
  primary_field: string | null;
  estimated_cost: number | null;
  status: 'active' | 'inactive' | 'blocked';
}

interface ProjectVendorsProps {
  projectId: string;
  onViewVendor?: (vendorId: string) => void;
}

export const ProjectVendors = ({ projectId, onViewVendor }: ProjectVendorsProps) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendors();
  }, [projectId]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select(`
          vendor_id,
          vendors (
            id,
            full_name,
            profile_image,
            primary_field,
            estimated_cost,
            status
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      // Deduplicate vendors (a vendor may have multiple invoices in the same project)
      const vendorMap = new Map<string, Vendor>();
      (data || []).forEach((item: any) => {
        if (item.vendors && !vendorMap.has(item.vendors.id)) {
          vendorMap.set(item.vendors.id, {
            id: item.vendors.id,
            full_name: item.vendors.full_name,
            profile_image: item.vendors.profile_image,
            primary_field: item.vendors.primary_field,
            estimated_cost: item.vendors.estimated_cost,
            status: item.vendors.status,
          });
        }
      });
      setVendors(Array.from(vendorMap.values()));
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      active: { label: 'نشط', color: '#ffffff', bgColor: 'var(--color-success)' },
      inactive: { label: 'غير نشط', color: 'var(--color-text-primary)', bgColor: 'var(--color-background-hover)' },
      blocked: { label: 'محظور', color: '#ffffff', bgColor: 'var(--color-danger)' },
    };
    return statusMap[status] || statusMap.active;
  };

  if (loading) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        الموردين المرتبطين بالمشروع
      </h2>

      {vendors.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p className="text-lg mb-2">لا توجد موردين مرتبطين</p>
          <p className="text-sm">قم بتعيين موردين في تبويب المصروفات</p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <table className="w-full">
            <thead
              style={{
                backgroundColor: 'var(--color-table-header)',
                borderBottom: '1px solid var(--color-table-border)',
              }}
            >
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المورد
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المجال
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  التكلفة التقديرية
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor, index) => {
                const statusBadge = getStatusBadge(vendor.status);
                return (
                  <tr
                    key={vendor.id}
                    style={{
                      borderBottom: index < vendors.length - 1 ? '1px solid var(--color-table-border)' : 'none',
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-background-hover)' }}
                        >
                          {vendor.profile_image ? (
                            <img
                              src={vendor.profile_image}
                              alt={vendor.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={20} style={{ color: 'var(--color-text-muted)' }} />
                          )}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {vendor.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                      {vendor.primary_field || '-'}
                    </td>
                    <td className="px-6 py-4 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                      {vendor.estimated_cost ? formatCurrency(vendor.estimated_cost, 'SAR') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusBadge.bgColor,
                          color: statusBadge.color,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onViewVendor?.(vendor.id)}
                        className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        <ExternalLink size={16} />
                        عرض الملف الشخصي
                      </button>
                    </td>
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
