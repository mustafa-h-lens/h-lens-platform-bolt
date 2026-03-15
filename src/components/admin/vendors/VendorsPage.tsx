import { useState, useEffect } from 'react';
import { Plus, Search, Phone, MapPin, Download, Trash2, Filter, X, ChevronDown, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { Modal } from '../../shared/Modal';
import { VendorDetails } from './VendorDetails';
import { SearchableDropdown } from '../../shared/SearchableDropdown';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { useNotification } from '../../../contexts/NotificationContext';
import { VendorExportModal } from './VendorExportModal';
import { ConfirmationModal } from '../../shared/ConfirmationModal';
import { PendingVendorRequests } from './PendingVendorRequests';
import { VendorRequestReview } from './VendorRequestReview';
import { isOperationalStatus } from '../../../lib/vendorStatusMachine';

interface Vendor {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  profile_image?: string;
  id_image?: string;
  id_number?: string;
  primary_field?: string;
  primary_city?: string;
  nationality?: string;
  estimated_cost?: number;
  status: string;
  created_at: string;
}

interface VendorsPageProps {
  initialVendorId?: string | null;
  onVendorSelect?: (vendorId: string | null) => void;
  initialTab?: string | null;
  onTabChange?: (tab: string | null) => void;
}

export const VendorsPage = ({ initialVendorId, onVendorSelect, initialTab, onTabChange }: VendorsPageProps = {}) => {
  const { showSuccess, showError } = useNotification();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(initialVendorId || null);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sub-tab: 'all' or 'pending'
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'pending'>('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRefreshTrigger, setPendingRefreshTrigger] = useState(0);
  // Review mode for pending vendors
  const [reviewVendorId, setReviewVendorId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    nationality: '',
    primary_city: '',
    primary_field: '',
    status: '',
    minCost: '',
    maxCost: '',
  });

  useEffect(() => {
    fetchVendors();
    fetchPendingCount();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .in('status', ['active', 'inactive', 'blocked'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_approval', 'revision_requested']);

      if (!error) setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch =
      vendor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone.includes(searchTerm) ||
      vendor.primary_field?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesNationality = !filters.nationality || vendor.nationality === filters.nationality;
    const matchesCity = !filters.primary_city || vendor.primary_city === filters.primary_city;
    const matchesField = !filters.primary_field || vendor.primary_field === filters.primary_field;
    const matchesStatus = !filters.status || vendor.status === filters.status;

    const matchesCost = (() => {
      if (!vendor.estimated_cost) return !filters.minCost && !filters.maxCost;
      const minCost = filters.minCost ? parseFloat(filters.minCost) : 0;
      const maxCost = filters.maxCost ? parseFloat(filters.maxCost) : Infinity;
      return vendor.estimated_cost >= minCost && vendor.estimated_cost <= maxCost;
    })();

    return matchesSearch && matchesNationality && matchesCity && matchesField && matchesStatus && matchesCost;
  });

  const toggleVendorSelection = (vendorId: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendorId)) {
      newSelected.delete(vendorId);
    } else {
      newSelected.add(vendorId);
    }
    setSelectedVendors(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedVendors.size === filteredVendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(filteredVendors.map(v => v.id)));
    }
  };


  const handleDelete = async () => {
    if (selectedVendors.size === 0) return;

    setDeleting(true);
    try {
      // Check for linked records before deleting
      const vendorIds = Array.from(selectedVendors);
      const { count: invoiceCount } = await supabase
        .from('vendor_invoices')
        .select('*', { count: 'exact', head: true })
        .in('vendor_id', vendorIds);

      if (invoiceCount && invoiceCount > 0) {
        showError(`لا يمكن حذف الموردين المحددين لوجود ${invoiceCount} فاتورة مرتبطة بهم. يمكنك تعطيل أو حظر المورد بدلاً من الحذف.`);
        setShowDeleteConfirm(false);
        setDeleting(false);
        return;
      }

      const { error } = await supabase
        .from('vendors')
        .delete()
        .in('id', vendorIds);

      if (error) {
        if (error.code === '23503') {
          showError('لا يمكن حذف الموردين المحددين لوجود سجلات مرتبطة بهم. يمكنك تعطيل أو حظر المورد بدلاً من الحذف.');
        } else {
          throw error;
        }
        return;
      }

      showSuccess(`تم حذف ${selectedVendors.size} مورد بنجاح`);
      setSelectedVendors(new Set());
      setShowDeleteConfirm(false);
      await fetchVendors();
    } catch (error) {
      console.error('Error deleting vendors:', error);
      showError('حدث خطأ أثناء حذف الموردين');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      active: { label: 'نشط', color: '#ffffff', bgColor: 'var(--color-success)' },
      inactive: { label: 'غير نشط', color: 'var(--color-text-primary)', bgColor: 'var(--color-background-hover)' },
      blocked: { label: 'محظور', color: '#ffffff', bgColor: 'var(--color-danger)' },
      pending_approval: { label: 'بانتظار الموافقة', color: '#ffffff', bgColor: '#f59e0b' },
      revision_requested: { label: 'مطلوب تعديلات', color: '#ffffff', bgColor: '#8b5cf6' },
      rejected: { label: 'مرفوض', color: '#ffffff', bgColor: '#ef4444' },
    };
    return statusMap[status] || statusMap.active;
  };

  const hasActiveFilters = filters.nationality || filters.primary_city || filters.primary_field || filters.status;

  const activeCount = filteredVendors.filter(v => v.status === 'active').length;
  const inactiveCount = filteredVendors.filter(v => v.status === 'inactive').length;
  const blockedCount = filteredVendors.filter(v => v.status === 'blocked').length;

  // Derive unique filter options from data
  const uniqueNationalities = Array.from(new Set(vendors.filter(v => v.nationality).map(v => v.nationality!))).sort();
  const uniqueCities = (() => {
    const cities = Array.from(new Set(vendors.filter(v => v.primary_city).map(v => v.primary_city!)));
    const priority = ['الرياض', 'جدة', 'الدمام'];
    return [...priority.filter(c => cities.includes(c)), ...cities.filter(c => !priority.includes(c)).sort()];
  })();
  const uniqueFields = Array.from(new Set(vendors.filter(v => v.primary_field).map(v => v.primary_field!))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل الموردين...</p>
        </div>
      </div>
    );
  }

  if (selectedVendorId) {
    return (
      <VendorDetails
        vendorId={selectedVendorId}
        onBack={() => {
          setSelectedVendorId(null);
          onVendorSelect?.(null);
          onTabChange?.(null);
        }}
        initialTab={initialTab}
        onTabChange={onTabChange}
      />
    );
  }

  // Pending vendor review mode
  if (reviewVendorId) {
    return (
      <VendorRequestReview
        vendorId={reviewVendorId}
        onBack={() => setReviewVendorId(null)}
        onActionComplete={() => {
          setReviewVendorId(null);
          fetchPendingCount();
          fetchVendors();
          setPendingRefreshTrigger(prev => prev + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          الموردين
        </h1>
        <div className="flex items-center gap-2">
          {selectedVendors.size > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border"
              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
            >
              <Trash2 size={18} />
              حذف ({toEnglishNumbers(selectedVendors.size.toString())})
            </button>
          )}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border"
            style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
          >
            <Download size={18} />
            {selectedVendors.size > 0
              ? `تصدير (${toEnglishNumbers(selectedVendors.size.toString())})`
              : 'تصدير الكل'
            }
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
            style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
          >
            <Plus size={20} />
            إضافة مورد
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-background-hover)' }}>
        <button
          onClick={() => setActiveSubTab('all')}
          className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all"
          style={{
            backgroundColor: activeSubTab === 'all' ? 'var(--color-surface)' : 'transparent',
            color: activeSubTab === 'all' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            boxShadow: activeSubTab === 'all' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          جميع الموردين
        </button>
        <button
          onClick={() => setActiveSubTab('pending')}
          className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: activeSubTab === 'pending' ? 'var(--color-surface)' : 'transparent',
            color: activeSubTab === 'pending' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            boxShadow: activeSubTab === 'pending' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Clock size={14} />
          طلبات التسجيل
          {pendingCount > 0 && (
            <span className="flex items-center justify-center rounded-full text-[11px] font-bold text-white min-w-[22px] h-[22px] px-1.5" style={{ backgroundColor: '#f59e0b' }}>
              {toEnglishNumbers(pendingCount.toString())}
            </span>
          )}
        </button>
      </div>

      {/* Pending Requests Tab */}
      {activeSubTab === 'pending' ? (
        <PendingVendorRequests
          onSelectVendor={setReviewVendorId}
          refreshTrigger={pendingRefreshTrigger}
        />
      ) : (
      <>

      {/* Insight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>إجمالي الموردين</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {toEnglishNumbers(filteredVendors.length.toString())}
          </div>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>نشط</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
            {toEnglishNumbers(activeCount.toString())}
          </div>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>غير نشط</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            {toEnglishNumbers(inactiveCount.toString())}
          </div>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>محظور</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-danger)' }}>
            {toEnglishNumbers(blockedCount.toString())}
          </div>
        </div>
        <div
          className="p-4 rounded-lg border cursor-pointer transition-all hover:opacity-80"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: pendingCount > 0 ? '#f59e0b' : 'var(--color-border)' }}
          onClick={() => setActiveSubTab('pending')}
        >
          <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>طلبات معلقة</div>
          <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
            {toEnglishNumbers(pendingCount.toString())}
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div
        className="flex items-center gap-3 flex-wrap p-4 rounded-lg border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <Filter size={18} style={{ color: 'var(--color-text-muted)' }} />

        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="appearance-none pr-3 pl-8 py-2 rounded-lg border text-sm cursor-pointer focus:outline-none focus:ring-2"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">الحالة</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="blocked">محظور</option>
          </select>
          <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>

        <div className="relative">
          <select
            value={filters.nationality}
            onChange={(e) => setFilters({ ...filters, nationality: e.target.value })}
            className="appearance-none pr-3 pl-8 py-2 rounded-lg border text-sm cursor-pointer focus:outline-none focus:ring-2"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">الجنسية</option>
            {uniqueNationalities.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>

        <div className="relative">
          <select
            value={filters.primary_city}
            onChange={(e) => setFilters({ ...filters, primary_city: e.target.value })}
            className="appearance-none pr-3 pl-8 py-2 rounded-lg border text-sm cursor-pointer focus:outline-none focus:ring-2"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">المدينة</option>
            {uniqueCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>

        <div className="relative">
          <select
            value={filters.primary_field}
            onChange={(e) => setFilters({ ...filters, primary_field: e.target.value })}
            className="appearance-none pr-3 pl-8 py-2 rounded-lg border text-sm cursor-pointer focus:outline-none focus:ring-2"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">المجال</option>
            {uniqueFields.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => setFilters({ nationality: '', primary_city: '', primary_field: '', status: '', minCost: '', maxCost: '' })}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'var(--color-danger)' }}
          >
            <X size={14} />
            مسح الفلاتر
          </button>
        )}

        <div className="relative mr-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث..."
            className="pr-9 pl-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 w-48"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>
      </div>

      {/* Table */}
      {filteredVendors.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <p className="text-lg">لا توجد موردين تطابق البحث أو الفلاتر</p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-table-header)', borderBottom: '1px solid var(--color-table-border)' }}>
              <tr>
                <th className="px-4 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={filteredVendors.length > 0 && selectedVendors.size === filteredVendors.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المورد</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المجال</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>رقم الجوال</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المدينة</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor, index) => {
                const statusBadge = getStatusBadge(vendor.status);
                return (
                  <tr
                    key={vendor.id}
                    onClick={() => {
                      setSelectedVendorId(vendor.id);
                      onVendorSelect?.(vendor.id);
                    }}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: index < filteredVendors.length - 1 ? '1px solid var(--color-table-border)' : 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-table-row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td className="px-4 py-4 w-12" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedVendors.has(vendor.id)}
                        onChange={() => toggleVendorSelection(vendor.id)}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 text-xs font-bold"
                          style={{ backgroundColor: 'var(--color-background-hover)', color: 'var(--color-text-muted)' }}
                        >
                          {vendor.profile_image ? (
                            <img src={vendor.profile_image} alt={vendor.full_name} className="w-full h-full object-cover" />
                          ) : (
                            vendor.full_name.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{vendor.full_name}</span>
                          {vendor.nationality && (
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{vendor.nationality}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{vendor.primary_field || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">{toEnglishNumbers(vendor.phone)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{vendor.primary_city || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium inline-block"
                        style={{ backgroundColor: statusBadge.bgColor, color: statusBadge.color }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredVendors.length > 0 && (
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          عرض {toEnglishNumbers(filteredVendors.length.toString())} من {toEnglishNumbers(vendors.length.toString())} مورد
        </div>
      )}

      {showAddModal && (
        <AddVendorModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchVendors();
          }}
        />
      )}

      {showExportModal && (
        <VendorExportModal
          vendors={selectedVendors.size > 0 ? vendors.filter(v => selectedVendors.has(v.id)) : filteredVendors}
          onClose={() => setShowExportModal(false)}
          onSuccess={() => {
            setShowExportModal(false);
            setSelectedVendors(new Set());
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="تأكيد حذف الموردين"
          message={`هل أنت متأكد من حذف ${selectedVendors.size} مورد؟ هذا الإجراء لا يمكن التراجع عنه.`}
          confirmText="حذف"
          cancelText="إلغاء"
          isDestructive={true}
          isLoading={deleting}
        />
      )}
      </>
      )}
    </div>
  );
};

interface AddVendorModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface VendorField {
  id: string;
  name: string;
  name_en?: string;
}

interface City {
  id: string;
  name: string;
  name_en?: string;
}

const AddVendorModal = ({ onClose, onSuccess }: AddVendorModalProps) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [vendorFields, setVendorFields] = useState<VendorField[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    primary_field: '',
    primary_city: '',
    estimated_cost: '',
    status: 'active' as 'active' | 'inactive' | 'blocked',
  });

  useEffect(() => {
    fetchVendorFields();
    fetchCities();
  }, []);

  const fetchVendorFields = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_fields')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setVendorFields(data || []);
    } catch (error) {
      console.error('Error fetching vendor fields:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      showError('يرجى إدخال الاسم الكامل');
      return;
    }
    if (!formData.phone.trim()) {
      showError('يرجى إدخال رقم الجوال');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const insertData = {
        full_name: formData.full_name.trim(),
        phone: toEnglishNumbers(formData.phone.trim()),
        email: formData.email.trim() || null,
        primary_field: formData.primary_field.trim() || null,
        primary_city: formData.primary_city.trim() || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        status: formData.status,
        created_by: user?.id,
      };

      const { error } = await supabase.from('vendors').insert([insertData]);

      if (error) throw error;
      showSuccess('تم إضافة المورد بنجاح');
      onSuccess();
    } catch (error) {
      console.error('Error adding vendor:', error);
      showError('حدث خطأ أثناء إضافة المورد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="إضافة مورد جديد">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            الاسم الكامل <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            required
            dir="rtl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            رقم الجوال <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: toEnglishNumbers(e.target.value) })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            required
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            المجال الأساسي
          </label>
          <SearchableDropdown
            value={formData.primary_field}
            onChange={(value) => setFormData({ ...formData, primary_field: value })}
            options={vendorFields.map(field => ({ value: field.name, label: field.name }))}
            placeholder="اختر المجال..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            المدينة الأساسية
          </label>
          <SearchableDropdown
            value={formData.primary_city}
            onChange={(value) => setFormData({ ...formData, primary_city: value })}
            options={cities.map(city => ({ value: city.name, label: city.name }))}
            placeholder="اختر مدينة..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            التكلفة التقديرية (ريال)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.estimated_cost}
            onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            placeholder="مثال: 5000"
            dir="ltr"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">معلومة داخلية - لن تظهر للعملاء أو الموردين</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            الحالة
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            dir="rtl"
          >
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="blocked">محظور</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-dark-border text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading ? 'جاري الإضافة...' : 'إضافة'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

