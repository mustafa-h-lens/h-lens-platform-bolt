import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Plus, Search, Phone, MapPin, Download, Trash2, Filter, X, ChevronDown, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { Modal } from '../../shared/Modal';
import { SearchableDropdown } from '../../shared/SearchableDropdown';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { useNotification } from '../../../contexts/NotificationContext';
import { ConfirmationModal } from '../../shared/ConfirmationModal';
import { isOperationalStatus } from '../../../lib/vendorStatusMachine';

// Lazy-load heavy sub-components
const VendorDetails = lazy(() => import('./VendorDetails').then(m => ({ default: m.VendorDetails })));
const VendorExportModal = lazy(() => import('./VendorExportModal').then(m => ({ default: m.VendorExportModal })));
const PendingVendorRequests = lazy(() => import('./PendingVendorRequests').then(m => ({ default: m.PendingVendorRequests })));
const VendorRequestReview = lazy(() => import('./VendorRequestReview').then(m => ({ default: m.VendorRequestReview })));

const VendorLazyFallback = () => (
  <div className="flex items-center justify-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
    جاري التحميل...
  </div>
);

// Multi-select dropdown filter component
function MultiSelectFilter({ label, options, selected, onToggle }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all"
        style={{
          backgroundColor: selected.length > 0 ? 'var(--color-primary)' : 'var(--color-surface)',
          borderColor: selected.length > 0 ? 'var(--color-primary)' : 'var(--color-border)',
          color: selected.length > 0 ? '#ffffff' : 'var(--color-text-primary)',
        }}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#ffffff' }}
          >
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 z-50 rounded-lg border shadow-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            minWidth: '200px',
            maxHeight: '280px',
          }}
        >
          {options.length > 6 && (
            <div className="p-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث..."
                className="w-full px-2 py-1.5 rounded border text-sm focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                autoFocus
              />
            </div>
          )}
          <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
            {filtered.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => onToggle(opt.value)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-right transition-colors"
                  style={{
                    color: 'var(--color-text-primary)',
                    backgroundColor: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-background-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? 'rgba(37,99,235,0.08)' : 'transparent'; }}
                >
                  <div
                    className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center"
                    style={{
                      borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                    }}
                  >
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="flex-1">{opt.label}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                لا توجد نتائج
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Sub-tab: 'all' or 'pending'
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'pending'>('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRefreshTrigger, setPendingRefreshTrigger] = useState(0);
  // Review mode for pending vendors
  const [reviewVendorId, setReviewVendorId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    nationality: [] as string[],
    primary_city: [] as string[],
    primary_field: [] as string[],
    status: [] as string[],
    minCost: '',
    maxCost: '',
  });

  // Multi-select filter toggle helper
  const toggleFilter = (key: 'nationality' | 'primary_city' | 'primary_field' | 'status', value: string) => {
    setFilters(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  useEffect(() => {
    fetchVendors();
    fetchPendingCount();
  }, [page]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filters]);

  const fetchVendors = async () => {
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from('vendors')
        .select('*', { count: 'exact' })
        .in('status', ['active', 'inactive', 'blocked'])
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setVendors(data || []);
      setTotalCount(count || 0);
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

    const matchesNationality = filters.nationality.length === 0 || (vendor.nationality && filters.nationality.includes(vendor.nationality));
    const matchesCity = filters.primary_city.length === 0 || (vendor.primary_city && filters.primary_city.includes(vendor.primary_city));
    const matchesField = filters.primary_field.length === 0 || (vendor.primary_field && filters.primary_field.includes(vendor.primary_field));
    const matchesStatus = filters.status.length === 0 || filters.status.includes(vendor.status);

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

  const hasActiveFilters = filters.nationality.length > 0 || filters.primary_city.length > 0 || filters.primary_field.length > 0 || filters.status.length > 0;

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
      <Suspense fallback={<VendorLazyFallback />}>
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
      </Suspense>
    );
  }

  // Pending vendor review mode
  if (reviewVendorId) {
    return (
      <Suspense fallback={<VendorLazyFallback />}>
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
      </Suspense>
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
        <Suspense fallback={<VendorLazyFallback />}>
          <PendingVendorRequests
            onSelectVendor={setReviewVendorId}
            refreshTrigger={pendingRefreshTrigger}
          />
        </Suspense>
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
        <Filter size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />

        {/* Status multi-select */}
        <MultiSelectFilter
          label="الحالة"
          options={[
            { value: 'active', label: 'نشط' },
            { value: 'inactive', label: 'غير نشط' },
            { value: 'blocked', label: 'محظور' },
          ]}
          selected={filters.status}
          onToggle={(v) => toggleFilter('status', v)}
        />

        {/* Nationality multi-select */}
        <MultiSelectFilter
          label="الجنسية"
          options={uniqueNationalities.map(n => ({ value: n, label: n }))}
          selected={filters.nationality}
          onToggle={(v) => toggleFilter('nationality', v)}
        />

        {/* City multi-select */}
        <MultiSelectFilter
          label="المدينة"
          options={uniqueCities.map(c => ({ value: c, label: c }))}
          selected={filters.primary_city}
          onToggle={(v) => toggleFilter('primary_city', v)}
        />

        {/* Field multi-select */}
        <MultiSelectFilter
          label="المجال"
          options={uniqueFields.map(f => ({ value: f, label: f }))}
          selected={filters.primary_field}
          onToggle={(v) => toggleFilter('primary_field', v)}
        />

        {hasActiveFilters && (
          <button
            onClick={() => setFilters({ nationality: [], primary_city: [], primary_field: [], status: [], minCost: '', maxCost: '' })}
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

      {/* Pagination */}
      {(() => {
        const totalPages = Math.ceil(totalCount / pageSize);
        return totalPages > 1 ? (
          <div
            className="flex items-center justify-between p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}
            >
              السابق
            </button>
            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span>صفحة {toEnglishNumbers((page + 1).toString())} من {toEnglishNumbers(totalPages.toString())}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>|</span>
              <span>إجمالي: {toEnglishNumbers(totalCount.toString())}</span>
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}
            >
              التالي
            </button>
          </div>
        ) : totalCount > 0 ? (
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            إجمالي: {toEnglishNumbers(totalCount.toString())} مورد
          </div>
        ) : null;
      })()}

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
        <Suspense fallback={<VendorLazyFallback />}>
        <VendorExportModal
          vendors={selectedVendors.size > 0 ? vendors.filter(v => selectedVendors.has(v.id)) : filteredVendors}
          onClose={() => setShowExportModal(false)}
          onSuccess={() => {
            setShowExportModal(false);
            setSelectedVendors(new Set());
          }}
        />
        </Suspense>
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

