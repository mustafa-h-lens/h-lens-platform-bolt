import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Plus, Download, Trash2, Clock, Store, BadgeCheck, Users, RotateCcw, MoreHorizontal, Eye, Pencil, Ban, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { MultiSelectFilter } from '../../shared/MultiSelectFilter';
import { SearchableDropdown } from '../../shared/SearchableDropdown';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { useNotification } from '../../../contexts/NotificationContext';
import { ConfirmationModal } from '../../shared/ConfirmationModal';
import { isOperationalStatus } from '../../../lib/vendorStatusMachine';
import { createPortal } from 'react-dom';
import { formatNumber } from '../../../lib/formatters';
import { COUNTRIES } from '../../../lib/shared-data';
import DocumentCropper from '../../shared/DocumentCropper';
import { autoCropDocument } from '../../../utils/autoCropDocument';

const ID_ASPECT_RATIO = 1.586;

const VendorDetails = lazy(() => import('./VendorDetails').then(m => ({ default: m.VendorDetails })));
const VendorExportModal = lazy(() => import('./VendorExportModal').then(m => ({ default: m.VendorExportModal })));
const PendingVendorRequests = lazy(() => import('./PendingVendorRequests').then(m => ({ default: m.PendingVendorRequests })));
const VendorRequestReview = lazy(() => import('./VendorRequestReview').then(m => ({ default: m.VendorRequestReview })));

const VendorLazyFallback = () => (
  <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>
);

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
  blocked_until?: string | null;
  block_reason?: string | null;
}

interface VendorsPageProps {
  initialVendorId?: string | null;
  onVendorSelect?: (vendorId: string | null) => void;
  initialTab?: string | null;
  onTabChange?: (tab: string | null) => void;
  onViewProject?: (projectId: string) => void;
  initialShowAdd?: boolean;
  onShowAddConsumed?: () => void;
}

const VENDOR_COLORS = [
  { bg: 'var(--accent-glow)', color: 'var(--accent-lighter)' },
  { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
  { bg: 'var(--warning-bg)', color: 'var(--warning-text)' },
  { bg: 'var(--success-bg)', color: 'var(--success-text)' },
  { bg: 'var(--danger-bg)', color: 'var(--danger-text)' },
  { bg: 'var(--info-bg)', color: 'var(--info-text)' },
];

const getVendorStyle = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return VENDOR_COLORS[Math.abs(hash) % VENDOR_COLORS.length];
};

const getStatusBadge = (status: string): { label: string; className: string } => {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'موثق', className: 'badge badge-green' },
    inactive: { label: 'غير نشط', className: 'badge badge-gray' },
    blocked: { label: 'معلق', className: 'badge badge-red' },
    pending_approval: { label: 'بانتظار', className: 'badge badge-amber' },
    revision_requested: { label: 'مطلوب تعديلات', className: 'badge badge-purple' },
    rejected: { label: 'مرفوض', className: 'badge badge-red' },
  };
  return map[status] || map.active;
};

const getFieldBadge = (field: string | undefined): string => {
  if (!field) return 'badge badge-gray';
  const map: Record<string, string> = {
    'تقنية': 'badge badge-blue', 'تصميم': 'badge badge-purple', 'تسويق': 'badge badge-amber',
    'استشارات': 'badge badge-cyan', 'تصوير': 'badge badge-green', 'إنتاج': 'badge badge-red',
  };
  return map[field] || 'badge badge-gray';
};

export const VendorsPage = ({ initialVendorId, onVendorSelect, initialTab, onTabChange, onViewProject, initialShowAdd, onShowAddConsumed }: VendorsPageProps = {}) => {
  const { showSuccess, showError } = useNotification();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(initialVendorId || null);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSubset, setExportSubset] = useState<Vendor[]>([]);
  const [preparingExport, setPreparingExport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteNames, setDeleteNames] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'pending'>(initialTab === 'pending' ? 'pending' : 'all');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRefreshTrigger, setPendingRefreshTrigger] = useState(0);
  const [reviewVendorId, setReviewVendorId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [blockVendor, setBlockVendor] = useState<Vendor | null>(null);
  const [showBulkBlock, setShowBulkBlock] = useState(false);

  const [filters, setFilters] = useState({
    nationality: [] as string[], primary_city: [] as string[],
    primary_field: [] as string[], status: [] as string[],
  });

  const toggleFilter = (key: 'nationality' | 'primary_city' | 'primary_field' | 'status', value: string) => {
    setFilters(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => { fetchVendors(); fetchPendingCount(); }, [page, pageSize, debouncedSearch, filters]);
  useEffect(() => { setPage(0); }, [filters]);
  useEffect(() => { loadVendorStats(); }, []);
  useEffect(() => { if (initialTab === 'pending') setActiveSubTab('pending'); }, [initialTab]);
  useEffect(() => { if (initialShowAdd) { setShowAddModal(true); onShowAddConsumed?.(); } }, [initialShowAdd]);
  useEffect(() => {
    const handleClick = () => setOpenDropdown(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const loadVendorStats = async () => {
    try {
      const [totalRes, activeRes, pendingRes, inactiveRes] = await Promise.all([
        supabase.from('vendors').select('id', { count: 'exact', head: true }),
        supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('vendors').select('id', { count: 'exact', head: true }).in('status', ['pending_approval', 'revision_requested']),
        supabase.from('vendors').select('id', { count: 'exact', head: true }).in('status', ['inactive', 'blocked']),
      ]);
      setVendorStats({
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        pending: pendingRes.count || 0,
        inactive: inactiveRes.count || 0,
      });
    } catch (e) { console.error('Error loading vendor stats:', e); }
  };

  const fetchVendors = async () => {
    try {
      // Auto-unblock any vendors whose blocked_until has passed
      await supabase.rpc('auto_unblock_expired_vendors');
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from('vendors').select('*', { count: 'exact' })
        .in('status', ['active', 'inactive', 'blocked']);

      // Server-side search
      if (debouncedSearch.trim()) {
        query = query.or(`full_name.ilike.%${debouncedSearch.trim()}%,phone.ilike.%${debouncedSearch.trim()}%,primary_field.ilike.%${debouncedSearch.trim()}%,email.ilike.%${debouncedSearch.trim()}%`);
      }

      // Server-side filters
      if (filters.nationality.length > 0) query = query.in('nationality', filters.nationality);
      if (filters.primary_city.length > 0) query = query.in('primary_city', filters.primary_city);
      if (filters.primary_field.length > 0) query = query.in('primary_field', filters.primary_field);
      if (filters.status.length > 0) query = query.in('status', filters.status);

      const { data, error, count } = await query
        .order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;
      setVendors(data || []);
      setTotalCount(count || 0);
    } catch (error) { console.error('Error fetching vendors:', error); }
    finally { setLoading(false); }
  };

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase.from('vendors').select('*', { count: 'exact', head: true }).in('status', ['pending_approval', 'revision_requested']);
      if (!error) setPendingCount(count || 0);
    } catch (error) { console.error('Error fetching pending count:', error); }
  };

  // All filtering is now server-side
  const filteredVendors = vendors;

  const toggleVendorSelection = (vendorId: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendorId)) newSelected.delete(vendorId); else newSelected.add(vendorId);
    setSelectedVendors(newSelected);
  };

  const allCurrentPageSelected = filteredVendors.length > 0 && filteredVendors.every(v => selectedVendors.has(v.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedVendors);
    if (allCurrentPageSelected) {
      filteredVendors.forEach(v => next.delete(v.id));
    } else {
      filteredVendors.forEach(v => next.add(v.id));
    }
    setSelectedVendors(next);
  };

  const handleDelete = async () => {
    if (selectedVendors.size === 0) return;
    setDeleting(true);
    try {
      const vendorIds = Array.from(selectedVendors);
      // Force delete: vendor_invoices has ON DELETE RESTRICT, so wipe linked
      // invoices first. All other vendor_id FKs cascade automatically when the
      // vendor row is removed (vendor_documents, vendor_equipment, vendor_fields,
      // vendor_rates, vendor_approval_log, vendor_suggestions, vendor_sessions,
      // vendor_activation_tokens, etc.).
      const { error: invErr } = await supabase.from('vendor_invoices').delete().in('vendor_id', vendorIds);
      if (invErr) throw invErr;

      const { error } = await supabase.from('vendors').delete().in('id', vendorIds);
      if (error) {
        if (error.code === '23503') {
          showError('لا يمكن حذف الموردين المحددين لوجود سجلات مرتبطة بهم.');
          return;
        }
        throw error;
      }
      showSuccess(`تم حذف ${selectedVendors.size} مورد بنجاح`);
      setSelectedVendors(new Set()); setShowDeleteConfirm(false); await fetchVendors();
    } catch (error) { console.error('Error deleting vendors:', error); showError('حدث خطأ أثناء حذف الموردين'); }
    finally { setDeleting(false); }
  };

  const hasActiveFilters = filters.nationality.length > 0 || filters.primary_city.length > 0 || filters.primary_field.length > 0 || filters.status.length > 0;
  const [uniqueNationalities, setUniqueNationalities] = useState<string[]>([]);
  const [uniqueCities, setUniqueCities] = useState<string[]>([]);
  const [uniqueFields, setUniqueFields] = useState<string[]>([]);

  const fetchFilterOptions = async () => {
    const [natRes, cityRes, fieldRes] = await Promise.all([
      supabase.from('vendors').select('nationality').in('status', ['active', 'inactive', 'blocked']).not('nationality', 'is', null),
      supabase.from('vendors').select('primary_city').in('status', ['active', 'inactive', 'blocked']).not('primary_city', 'is', null),
      supabase.from('vendors').select('primary_field').in('status', ['active', 'inactive', 'blocked']).not('primary_field', 'is', null),
    ]);
    const nats = Array.from(new Set((natRes.data || []).map((v: any) => v.nationality))).sort() as string[];
    const allCities = Array.from(new Set((cityRes.data || []).map((v: any) => v.primary_city))) as string[];
    const priority = ['الرياض', 'جدة', 'الدمام'];
    const cities = [...priority.filter(c => allCities.includes(c)), ...allCities.filter(c => !priority.includes(c)).sort()];
    const fields = Array.from(new Set((fieldRes.data || []).map((v: any) => v.primary_field))).sort() as string[];
    setUniqueNationalities(nats);
    setUniqueCities(cities);
    setUniqueFields(fields);
  };

  useEffect(() => { fetchFilterOptions(); }, []);
  const [vendorStats, setVendorStats] = useState({ total: 0, active: 0, pending: 0, inactive: 0 });
  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) return <VendorLazyFallback />;

  if (selectedVendorId) {
    return (
      <Suspense fallback={<VendorLazyFallback />}>
        <VendorDetails vendorId={selectedVendorId} onBack={() => { setSelectedVendorId(null); onVendorSelect?.(null); onTabChange?.(null); fetchVendors(); }} initialTab={initialTab} onTabChange={onTabChange} onViewProject={onViewProject} />
      </Suspense>
    );
  }

  if (reviewVendorId) {
    return (
      <Suspense fallback={<VendorLazyFallback />}>
        <VendorRequestReview vendorId={reviewVendorId} onBack={() => setReviewVendorId(null)} onActionComplete={() => { setReviewVendorId(null); fetchPendingCount(); fetchVendors(); setPendingRefreshTrigger(prev => prev + 1); }} />
      </Suspense>
    );
  }

  return (
    <div style={{ padding: 28 }}>
      {/* Page Title */}
      <div className="page-title-row">
        <div>
          <div className="page-title">الموردين</div>
          <div className="page-subtitle">إدارة الموردين والمزودين</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> إضافة مورد
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="tabs-colored" style={{ marginBottom: 20, display: 'flex' }}>
        <div className={`tab tab-blue ${activeSubTab === 'all' ? 'on' : ''}`} onClick={() => setActiveSubTab('all')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Store size={14} /> جميع الموردين
        </div>
        <div className={`tab tab-blue ${activeSubTab === 'pending' ? 'on' : ''}`} onClick={() => setActiveSubTab('pending')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} /> طلبات التسجيل
          {pendingCount > 0 && <span className="sb-badge" style={{ marginRight: 0 }}>{toEnglishNumbers(pendingCount.toString())}</span>}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card sc-blue">
          <div className="stat-icon-box"><Store size={18} /></div>
          <div className="stat-sub">إجمالي الموردين</div>
          <div className="stat-val">{formatNumber(vendorStats.total)}</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><BadgeCheck size={18} /></div>
          <div className="stat-sub">موثق</div>
          <div className="stat-val">{formatNumber(vendorStats.active)}</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><Clock size={18} /></div>
          <div className="stat-sub">بانتظار الموافقة</div>
          <div className="stat-val">{formatNumber(vendorStats.pending)}</div>
        </div>
        <div className="stat-card sc-purple">
          <div className="stat-icon-box"><Users size={18} /></div>
          <div className="stat-sub">غير نشط / محظور</div>
          <div className="stat-val">{formatNumber(vendorStats.inactive)}</div>
        </div>
      </div>

      {activeSubTab === 'pending' ? (
        <Suspense fallback={<VendorLazyFallback />}>
          <PendingVendorRequests onSelectVendor={setReviewVendorId} refreshTrigger={pendingRefreshTrigger} />
        </Suspense>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="filter-bar">
            <input className="input" placeholder="بحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: 220 }} />
            <MultiSelectFilter label="الحالة" options={[{ value: 'active', label: 'موثق' }, { value: 'inactive', label: 'غير نشط' }, { value: 'blocked', label: 'معلق' }]} selected={filters.status} onToggle={v => toggleFilter('status', v)} />
            <MultiSelectFilter label="الجنسية" options={uniqueNationalities.map(n => ({ value: n, label: n }))} selected={filters.nationality} onToggle={v => toggleFilter('nationality', v)} />
            <MultiSelectFilter label="المدينة" options={uniqueCities.map(c => ({ value: c, label: c }))} selected={filters.primary_city} onToggle={v => toggleFilter('primary_city', v)} />
            <MultiSelectFilter label="الخدمة" options={uniqueFields.map(f => ({ value: f, label: f }))} selected={filters.primary_field} onToggle={v => toggleFilter('primary_field', v)} />
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ nationality: [], primary_city: [], primary_field: [], status: [] })}>
                <RotateCcw size={13} /> إعادة تعيين
              </button>
            )}
          </div>

          {/* Actions bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, direction: 'ltr' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={preparingExport}
              onClick={async () => {
                if (selectedVendors.size === 0) {
                  setExportSubset([]);
                  setShowExportModal(true);
                  return;
                }
                setPreparingExport(true);
                try {
                  const ids = Array.from(selectedVendors);
                  const localMap = new Map(vendors.map(v => [v.id, v] as const));
                  const local = ids.map(id => localMap.get(id)).filter((v): v is Vendor => !!v);
                  const missing = ids.filter(id => !localMap.has(id));
                  let combined: Vendor[] = local;
                  if (missing.length > 0) {
                    const { data, error } = await supabase
                      .from('vendors')
                      .select('*')
                      .in('id', missing);
                    if (error) throw error;
                    combined = combined.concat((data || []) as Vendor[]);
                  }
                  setExportSubset(combined);
                  setShowExportModal(true);
                } catch (e) {
                  console.error('Failed to prepare export selection', e);
                  showError('تعذّر تحضير قائمة التصدير');
                } finally {
                  setPreparingExport(false);
                }
              }}
            >
              <Download size={14} /> {preparingExport ? 'جاري التحضير…' : (selectedVendors.size > 0 ? `تصدير المحدد (${toEnglishNumbers(selectedVendors.size.toString())})` : 'تصدير الكل')}
            </button>
            {selectedVendors.size > 0 && (
              <>
                <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }} onClick={async () => {
                  const ids = Array.from(selectedVendors);
                  // Names from current page first (instant)
                  const localMap = new Map(vendors.map(v => [v.id, v.full_name]));
                  const missing = ids.filter(id => !localMap.has(id));
                  let names = ids.map(id => localMap.get(id)).filter((n): n is string => !!n);
                  if (missing.length > 0) {
                    const { data } = await supabase.from('vendors').select('id, full_name').in('id', missing);
                    if (data) names = names.concat(data.map(d => d.full_name));
                  }
                  setDeleteNames(names);
                  setShowDeleteConfirm(true);
                }}>
                  <Trash2 size={13} /> حذف المحدد ({toEnglishNumbers(selectedVendors.size.toString())})
                </button>
                <button className="btn btn-sm" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' }} onClick={() => setShowBulkBlock(true)}>
                  <Ban size={13} /> حظر المحدد ({toEnglishNumbers(selectedVendors.size.toString())})
                </button>
              </>
            )}
          </div>

          {/* Table */}
          {filteredVendors.length === 0 ? (
            <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد موردين تطابق البحث أو الفلاتر</span></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" className="tbl-check" checked={allCurrentPageSelected} onChange={toggleSelectAll} /></th>
                    <th>المورد</th>
                    <th>المجال</th>
                    <th>الجنسية</th>
                    <th>المدينة</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => {
                    const statusBadge = getStatusBadge(vendor.status);
                    const vStyle = getVendorStyle(vendor.id);
                    const isSelected = selectedVendors.has(vendor.id);
                    return (
                      <tr key={vendor.id} className={isSelected ? 'selected' : ''} onClick={() => { setSelectedVendorId(vendor.id); onVendorSelect?.(vendor.id); }} style={{ cursor: 'pointer' }}>
                        <td onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="tbl-check" checked={isSelected} onChange={() => toggleVendorSelection(vendor.id)} />
                        </td>
                        <td>
                          <div className="user-row">
                            <div className="avatar av-md" style={{ background: vStyle.bg, color: vStyle.color }}>
                              {vendor.profile_image ? (
                                <img src={vendor.profile_image} alt={vendor.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                vendor.full_name.substring(0, 2)
                              )}
                            </div>
                            <div>
                              <div className="u-name">{vendor.full_name}</div>
                              <div className="u-role">{vendor.nationality ? `${vendor.primary_city || ''}, ${vendor.nationality}` : vendor.primary_city || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className={getFieldBadge(vendor.primary_field)}>{vendor.primary_field || '-'}</span></td>
                        <td style={{ fontSize: 13 }}>{vendor.nationality || '-'}</td>
                        <td style={{ fontSize: 13 }}>{vendor.primary_city || '-'}</td>
                        <td>
                          <span className={statusBadge.className}>
                            <span className="badge-dot" style={{ background: vendor.status === 'active' ? 'var(--success)' : vendor.status === 'blocked' ? 'var(--danger)' : 'var(--warning)' }} />
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="actions-cell" onClick={e => e.stopPropagation()}>
                          <button className={`actions-btn ${openDropdown === vendor.id ? 'open' : ''}`} onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === vendor.id ? null : vendor.id); }}>
                            <MoreHorizontal size={15} />
                          </button>
                          {openDropdown === vendor.id && (
                            <div className="actions-dropdown show">
                              <button className="dd-item" onClick={() => { setSelectedVendorId(vendor.id); onVendorSelect?.(vendor.id); setOpenDropdown(null); }}><Eye size={15} /> عرض التفاصيل</button>
                              <button className="dd-item"><Pencil size={15} /> تعديل</button>
                              <div className="dd-sep" />
                              {vendor.status === 'blocked' ? (
                                <button className="dd-item" onClick={async () => {
                                  setOpenDropdown(null);
                                  const { error } = await supabase.from('vendors').update({ status: 'active', blocked_until: null, block_reason: null }).eq('id', vendor.id);
                                  if (error) showError('فشل رفع الحظر'); else { showSuccess('تم رفع الحظر عن المورد'); fetchVendors(); }
                                }}><RotateCcw size={15} /> رفع الحظر</button>
                              ) : (
                                <button className="dd-item dd-danger" onClick={() => { setBlockVendor(vendor); setOpenDropdown(null); }}><Ban size={15} /> حظر</button>
                              )}
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
              <div className="pag-info">عرض <strong>{toEnglishNumbers((page * pageSize + 1).toString())}-{toEnglishNumbers(Math.min((page + 1) * pageSize, totalCount).toString())}</strong> من <strong>{toEnglishNumbers(totalCount.toString())}</strong> مورد</div>
              <div className="pag-controls">
                <button className={`pag-btn ${page === 0 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronRight size={15} /></button>
                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => (
                  <button key={i} className={`pag-btn ${page === i ? 'active' : ''}`} onClick={() => setPage(i)}>{toEnglishNumbers((i + 1).toString())}</button>
                ))}
                {totalPages > 3 && <button className="pag-btn" style={{ fontSize: 11, letterSpacing: 1 }}>...</button>}
                {totalPages > 3 && <button className={`pag-btn ${page === totalPages - 1 ? 'active' : ''}`} onClick={() => setPage(totalPages - 1)}>{toEnglishNumbers(totalPages.toString())}</button>}
                <button className={`pag-btn ${page >= totalPages - 1 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronLeft size={15} /></button>
              </div>
              <div className="pag-per-page">عرض <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select> لكل صفحة</div>
            </div>
          )}
        </>
      )}

      {showAddModal && <AddVendorModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchVendors(); }} />}

      {showExportModal && (
        <Suspense fallback={<VendorLazyFallback />}>
          <VendorExportModal vendors={selectedVendors.size > 0 ? exportSubset : filteredVendors} onClose={() => setShowExportModal(false)} onSuccess={() => { setShowExportModal(false); setSelectedVendors(new Set()); setExportSubset([]); }} />
        </Suspense>
      )}

      {blockVendor && (
        <BlockVendorModal
          vendorIds={[blockVendor.id]}
          vendorLabel={blockVendor.full_name}
          onClose={() => setBlockVendor(null)}
          onSuccess={() => { setBlockVendor(null); fetchVendors(); }}
        />
      )}

      {showBulkBlock && selectedVendors.size > 0 && (
        <BlockVendorModal
          vendorIds={Array.from(selectedVendors)}
          vendorLabel={`${toEnglishNumbers(selectedVendors.size.toString())} مورد محدد`}
          onClose={() => setShowBulkBlock(false)}
          onSuccess={() => { setShowBulkBlock(false); setSelectedVendors(new Set()); fetchVendors(); }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="تأكيد حذف الموردين"
          message={
            <span>
              هل أنت متأكد من حذف {toEnglishNumbers(selectedVendors.size.toString())} مورد؟ هذا الإجراء لا يمكن التراجع عنه.
              {deleteNames.length > 0 && (
                <span style={{ display: 'block', marginTop: 12, padding: '10px 12px', background: 'var(--bg-overlay)', border: '1px solid var(--border-soft)', borderRadius: 8, maxHeight: 160, overflowY: 'auto', fontSize: 13, color: 'var(--text-primary)', textAlign: 'right' }}>
                  {deleteNames.map((n, i) => (
                    <span key={i} style={{ display: 'block', padding: '3px 0', borderBottom: i < deleteNames.length - 1 ? '1px dashed var(--border-soft)' : 'none' }}>
                      {n}
                    </span>
                  ))}
                </span>
              )}
            </span>
          }
          confirmText="حذف"
          cancelText="إلغاء"
          type="danger"
        />
      )}
    </div>
  );
};

// ═══════════════════ ADD VENDOR MODAL ═══════════════════
interface AddVendorModalProps { onClose: () => void; onSuccess: () => void; }
interface SupplierField { id: string; name: string; name_en?: string; parent_id: string | null; }
interface City { id: string; name: string; name_en?: string; }

const AddVendorModal = ({ onClose, onSuccess }: AddVendorModalProps) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [allFields, setAllFields] = useState<SupplierField[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const profileInputRef = React.useRef<HTMLInputElement>(null);
  const idInputRef = React.useRef<HTMLInputElement>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState('');
  const [pendingIdFile, setPendingIdFile] = useState<File | null>(null);
  const [autoCropping, setAutoCropping] = useState(false);
  const [smartText, setSmartText] = useState('');
  const [showSmartParse, setShowSmartParse] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', phone: '', email: '', primary_field: '', primary_city: '',
    id_number: '', nationality: '', status: 'active' as 'active' | 'inactive' | 'blocked',
  });

  useEffect(() => {
    supabase.from('supplier_fields').select('*').eq('is_active', true).order('name').then(({ data }) => setAllFields(data || []));
    supabase.from('cities').select('*').eq('is_active', true).order('name').then(({ data }) => setCities(data || []));
  }, []);

  const serviceOptions = React.useMemo(() => {
    const parents = allFields.filter(f => !f.parent_id);
    const options: { value: string; label: string }[] = [];
    parents.forEach(parent => {
      const children = allFields.filter(f => f.parent_id === parent.id);
      if (children.length > 0) {
        children.forEach(child => options.push({ value: child.name, label: `${parent.name} — ${child.name}` }));
      } else {
        options.push({ value: parent.name, label: parent.name });
      }
    });
    return options;
  }, [allFields]);

  const nationalityOptions = React.useMemo(() => COUNTRIES.map(c => ({ value: c.nameAr, label: `${c.flag} ${c.nameAr}` })), []);

  // Smart text parser
  const parseSmartText = () => {
    const text = smartText.trim();
    if (!text) return;
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    const allText = lines.join(' ');
    const updates: Partial<typeof formData> = {};

    // Phone: 05xxxxxxxx or +966 xx xxx xxxx
    const phoneMatch = allText.match(/(?:\+?966\s*)?0?5\d[\d\s]{7,10}/);
    if (phoneMatch) {
      updates.phone = phoneMatch[0].replace(/\s+/g, '').replace(/^\+?966/, '0');
    }

    // Email
    const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w+/i);
    if (emailMatch) updates.email = emailMatch[0];

    // ID number: 10 digits starting with 1 or 2
    const idMatch = allText.match(/\b[12]\d{9}\b/);
    if (idMatch) updates.id_number = idMatch[0];

    // City detection
    const cityNames = cities.map(c => c.name);
    const foundCity = cityNames.find(c => allText.includes(c));
    if (foundCity) updates.primary_city = foundCity;

    // Field detection
    const fieldNames = serviceOptions.map(f => f.value);
    const foundField = fieldNames.find(f => allText.includes(f));
    if (foundField) updates.primary_field = foundField;

    // Nationality detection
    const natKeywords: Record<string, string> = {
      'سعودي': 'سعودي', 'سوري': 'سوري', 'يمني': 'يمني', 'مصري': 'مصري',
      'مغربي': 'مغربي', 'مغربية': 'مغربية', 'أردني': 'أردني', 'فلسطيني': 'فلسطيني',
      'لبناني': 'لبناني', 'عراقي': 'عراقي', 'سوداني': 'سوداني', 'تونسي': 'تونسي',
      'جزائري': 'جزائري', 'باكستاني': 'باكستاني', 'هندي': 'هندي',
    };
    const foundNat = Object.keys(natKeywords).find(k => allText.includes(k));
    if (foundNat) updates.nationality = natKeywords[foundNat];

    // Name: first Arabic-only line that isn't a known keyword
    const usedTokens = new Set([
      updates.phone, updates.email, updates.id_number,
      updates.primary_city, updates.primary_field, foundNat,
    ].filter(Boolean));
    for (const line of lines) {
      const clean = line.replace(/[0-9@+._\-]/g, '').trim();
      if (clean.length > 3 && /[\u0600-\u06FF]/.test(clean) && !usedTokens.has(line)) {
        // Check it's not a known city/field/nationality
        if (!cityNames.includes(clean) && !fieldNames.includes(clean) && !Object.keys(natKeywords).includes(clean)) {
          updates.full_name = clean;
          break;
        }
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));
    setShowSmartParse(false);
    setSmartText('');
    showSuccess(`تم استخراج ${Object.keys(updates).length} حقل تلقائياً`);
  };

  const handleFileSelect = async (file: File, type: 'profile' | 'id') => {
    if (file.size > 5 * 1024 * 1024) { showError('حجم الصورة يجب أن يكون أقل من 5MB'); return; }
    if (type === 'id') {
      setAutoCropping(true);
      try {
        const cropped = await autoCropDocument(file, { aspectWidth: 1.586, aspectHeight: 1 });
        if (cropped) {
          commitIdFile(cropped);
          return;
        }
      } finally {
        setAutoCropping(false);
      }
      setPendingIdFile(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfileFile(file);
      setProfilePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const commitIdFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      setIdFile(file);
      setIdPreview(ev.target?.result as string);
      setPendingIdFile(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, type: 'profile' | 'id') => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.style.borderColor = 'var(--border-soft)';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file, type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) { showError('يرجى إدخال الاسم الكامل'); return; }
    if (!formData.phone.trim()) { showError('يرجى إدخال رقم الجوال'); return; }
    setLoading(true);
    try {
      const { data: vendor, error } = await supabase.from('vendors').insert([{
        full_name: formData.full_name.trim(),
        phone: toEnglishNumbers(formData.phone.trim()),
        email: formData.email.trim() || null,
        primary_field: formData.primary_field.trim() || null,
        primary_city: formData.primary_city.trim() || null,
        nationality: formData.nationality.trim() || null,
        id_number: formData.id_number ? toEnglishNumbers(formData.id_number.trim()) : null,
        status: formData.status,
      }]).select('id').single();
      if (error) throw error;

      // Upload images
      if (profileFile && vendor) {
        const buf = await profileFile.arrayBuffer();
        const ext = profileFile.name.split('.').pop() || 'jpg';
        const path = `${vendor.id}-profile-${Date.now()}.${ext}`;
        await supabase.storage.from('vendor-images').upload(path, new Uint8Array(buf), { contentType: profileFile.type, cacheControl: '3600', upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(path);
        await supabase.from('vendors').update({ profile_image: publicUrl }).eq('id', vendor.id);
      }
      if (idFile && vendor) {
        const buf = await idFile.arrayBuffer();
        const ext = idFile.name.split('.').pop() || 'jpg';
        const path = `${vendor.id}-id-${Date.now()}.${ext}`;
        await supabase.storage.from('vendor-images').upload(path, new Uint8Array(buf), { contentType: idFile.type, cacheControl: '3600', upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(path);
        await supabase.from('vendors').update({ id_image: publicUrl }).eq('id', vendor.id);
      }

      showSuccess('تم إضافة المورد بنجاح');
      onSuccess();
    } catch (error: any) {
      console.error('Error adding vendor:', error);
      showError(error.message || 'حدث خطأ أثناء إضافة المورد');
    } finally { setLoading(false); }
  };

  const dropZoneStyle = (hasPreview: boolean): React.CSSProperties => ({
    border: `2px dashed ${hasPreview ? 'var(--accent)' : 'var(--border-soft)'}`,
    borderRadius: 'var(--radius-md)', padding: hasPreview ? 0 : 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
    gap: 6, cursor: 'pointer', transition: 'border-color 0.2s', overflow: 'hidden',
    minHeight: hasPreview ? 0 : 100, position: 'relative',
  });

  return createPortal(
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <div>
            <div className="modal-ttl">إضافة مورد جديد</div>
            <div className="modal-sub">أدخل البيانات يدوياً أو الصق النص لاستخراجها تلقائياً</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>

            {/* Smart Paste */}
            {!showSmartParse ? (
              <button type="button" onClick={() => setShowSmartParse(true)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--accent)', background: 'var(--accent-glow)', color: 'var(--accent-lighter)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                <span style={{ fontSize: 18 }}>⚡</span> لصق ذكي — الصق بيانات المورد واستخرجها تلقائياً
              </button>
            ) : (
              <div style={{ marginBottom: 16, padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--accent-glow)', border: '1px solid var(--accent-glow-md)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-lighter)', marginBottom: 8 }}>⚡ لصق ذكي</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>الصق الاسم، الجوال، الإيميل، رقم الهوية، الجنسية، المدينة، المجال — كل منها في سطر أو مختلطة</div>
                <textarea className="input" value={smartText} onChange={e => setSmartText(e.target.value)}
                  rows={4} placeholder={'مثال:\nمحمد أحمد الغامدي\n0551234567\ntest@email.com\n1089915647\nسعودي\nجدة\nمصور فيديو'} style={{ fontSize: 13, marginBottom: 8 }} dir="auto" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-sm" onClick={parseSmartText} style={{ background: 'var(--accent)', color: '#fff', gap: 6 }}>
                    استخراج البيانات
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowSmartParse(false); setSmartText(''); }}>إلغاء</button>
                </div>
              </div>
            )}

            {/* Images row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              {/* Profile Image */}
              <div>
                <label className="input-label" style={{ marginBottom: 6 }}>الصورة الشخصية</label>
                <div style={dropZoneStyle(!!profilePreview)}
                  onClick={() => profileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = profilePreview ? 'var(--accent)' : 'var(--border-soft)'; }}
                  onDrop={e => handleDrop(e, 'profile')}>
                  {profilePreview ? (
                    <img src={profilePreview} alt="Profile" style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                  ) : (
                    <>
                      <span style={{ fontSize: 24, opacity: 0.3 }}>📷</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>اسحب أو انقر</span>
                    </>
                  )}
                </div>
                <input ref={profileInputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, 'profile'); e.target.value = ''; }} style={{ display: 'none' }} />
              </div>

              {/* ID Image */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="input-label" style={{ marginBottom: 6 }}>صورة الهوية</label>
                <div style={dropZoneStyle(!!idPreview)}
                  onClick={() => idInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = idPreview ? 'var(--accent)' : 'var(--border-soft)'; }}
                  onDrop={e => handleDrop(e, 'id')}>
                  {idPreview ? (
                    <img src={idPreview} alt="ID" style={{ width: '100%', height: 120, objectFit: 'contain' }} />
                  ) : (
                    <>
                      <span style={{ fontSize: 24, opacity: 0.3 }}>🪪</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>اسحب صورة الهوية أو انقر</span>
                    </>
                  )}
                </div>
                <input ref={idInputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, 'id'); e.target.value = ''; }} style={{ display: 'none' }} />
              </div>
            </div>

            <div className="form-grid">
              {/* Name */}
              <div className="input-group full">
                <label className="input-label">الاسم الكامل <span className="req">*</span></label>
                <input className="input" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="مثال: محمد أحمد الغامدي" />
              </div>

              {/* Phone + Email */}
              <div className="input-group">
                <label className="input-label">رقم الجوال <span className="req">*</span></label>
                <input className="input" type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: toEnglishNumbers(e.target.value) })} placeholder="05xxxxxxxx" dir="ltr" />
              </div>
              <div className="input-group">
                <label className="input-label">البريد الإلكتروني</label>
                <input className="input" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" dir="ltr" />
              </div>

              {/* ID Number + Nationality */}
              <div className="input-group">
                <label className="input-label">رقم الهوية</label>
                <input className="input" value={formData.id_number} onChange={e => setFormData({ ...formData, id_number: toEnglishNumbers(e.target.value) })} placeholder="10 أرقام" dir="ltr" maxLength={10} />
              </div>
              <div className="input-group">
                <label className="input-label">الجنسية</label>
                <SearchableDropdown value={formData.nationality} onChange={value => setFormData({ ...formData, nationality: value })} options={nationalityOptions} placeholder="اختر الجنسية" />
              </div>

              {/* Field + City */}
              <div className="input-group">
                <label className="input-label">المجال</label>
                <SearchableDropdown value={formData.primary_field} onChange={value => setFormData({ ...formData, primary_field: value })} options={serviceOptions} placeholder="اختر المجال" />
              </div>
              <div className="input-group">
                <label className="input-label">المدينة</label>
                <SearchableDropdown value={formData.primary_city} onChange={value => setFormData({ ...formData, primary_city: value })} options={cities.map(c => ({ value: c.name, label: c.name }))} placeholder="اختر المدينة" />
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الإضافة...' : <><Plus size={15} /> إضافة المورد</>}
            </button>
          </div>
        </form>
      </div>
      <DocumentCropper
        open={!!pendingIdFile}
        file={pendingIdFile}
        aspect={ID_ASPECT_RATIO}
        docLabel="صورة الهوية"
        onSave={commitIdFile}
        onSkip={commitIdFile}
        onCancel={() => setPendingIdFile(null)}
      />
      {autoCropping && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#e2e8f0', fontFamily: 'Tajawal, sans-serif', fontSize: 14, gap: 10,
        }}>
          <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'ac-spin 0.8s linear infinite' }} />
          جاري الاقتطاع التلقائي…
          <style>{`@keyframes ac-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>,
    document.body
  );
};

// ═══════════════════ BLOCK VENDOR MODAL ═══════════════════
interface BlockVendorModalProps {
  vendorIds: string[];
  vendorLabel: string;
  onClose: () => void;
  onSuccess: () => void;
}

const BlockVendorModal = ({ vendorIds, vendorLabel, onClose, onSuccess }: BlockVendorModalProps) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'permanent' | 'period'>('period');
  const [days, setDays] = useState<number>(7);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const blockedUntil = mode === 'period'
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const { error } = await supabase.from('vendors').update({
        status: 'blocked',
        blocked_until: blockedUntil,
        block_reason: reason.trim() || null,
      }).in('id', vendorIds);
      if (error) throw error;
      const countLabel = vendorIds.length > 1 ? `${toEnglishNumbers(vendorIds.length.toString())} مورد` : 'المورد';
      showSuccess(mode === 'period' ? `تم حظر ${countLabel} لمدة ${toEnglishNumbers(days.toString())} يوم` : `تم حظر ${countLabel} بشكل دائم`);
      onSuccess();
    } catch (err: any) {
      console.error('Block vendor error:', err);
      showError(err.message || 'حدث خطأ أثناء حظر المورد');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-hdr">
          <div>
            <div className="modal-ttl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ban size={18} style={{ color: 'var(--danger-text)' }} /> حظر المورد
            </div>
            <div className="modal-sub">{vendorLabel}</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">نوع الحظر <span className="req">*</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: mode === 'period' ? 'var(--accent-glow)' : 'transparent' }}>
                  <input type="radio" name="blockMode" checked={mode === 'period'} onChange={() => setMode('period')} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>حظر لفترة محددة</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>يتم رفع الحظر تلقائياً بعد انتهاء المدة</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: mode === 'permanent' ? 'var(--accent-glow)' : 'transparent' }}>
                  <input type="radio" name="blockMode" checked={mode === 'permanent'} onChange={() => setMode('permanent')} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>حظر دائم</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>يظل المورد محظوراً حتى يتم رفع الحظر يدوياً</div>
                  </div>
                </label>
              </div>
            </div>

            {mode === 'period' && (
              <div className="input-group">
                <label className="input-label">مدة الحظر (بالأيام) <span className="req">*</span></label>
                <input type="number" className="input" min={1} max={365} value={days} onChange={e => setDays(Math.max(1, parseInt(e.target.value) || 1))} dir="ltr" required />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  سيتم رفع الحظر تلقائياً في: {toEnglishNumbers(new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SA'))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {[3, 7, 14, 30, 90].map(d => (
                    <button key={d} type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12, background: days === d ? 'var(--accent-glow)' : undefined }} onClick={() => setDays(d)}>
                      {toEnglishNumbers(d.toString())} يوم
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">سبب الحظر <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(سيظهر للمورد عند محاولة تسجيل الدخول)</span></label>
              <textarea className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: مخالفة شروط الخدمة، عدم الالتزام بالمواعيد..." style={{ minHeight: 70 }} />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'جاري الحظر...' : <><Ban size={15} /> تأكيد الحظر</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
