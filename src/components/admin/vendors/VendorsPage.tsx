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
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(initialVendorId || null);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  useEffect(() => { fetchVendors(); fetchPendingCount(); }, [page, pageSize]);
  useEffect(() => { setPage(0); }, [searchTerm, filters]);
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
      const { data, error, count } = await supabase
        .from('vendors').select('*', { count: 'exact' })
        .in('status', ['active', 'inactive', 'blocked'])
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

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || vendor.phone.includes(searchTerm) || vendor.primary_field?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNationality = filters.nationality.length === 0 || (vendor.nationality && filters.nationality.includes(vendor.nationality));
    const matchesCity = filters.primary_city.length === 0 || (vendor.primary_city && filters.primary_city.includes(vendor.primary_city));
    const matchesField = filters.primary_field.length === 0 || (vendor.primary_field && filters.primary_field.includes(vendor.primary_field));
    const matchesStatus = filters.status.length === 0 || filters.status.includes(vendor.status);
    return matchesSearch && matchesNationality && matchesCity && matchesField && matchesStatus;
  });

  const toggleVendorSelection = (vendorId: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendorId)) newSelected.delete(vendorId); else newSelected.add(vendorId);
    setSelectedVendors(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedVendors.size === filteredVendors.length) setSelectedVendors(new Set());
    else setSelectedVendors(new Set(filteredVendors.map(v => v.id)));
  };

  const handleDelete = async () => {
    if (selectedVendors.size === 0) return;
    setDeleting(true);
    try {
      const vendorIds = Array.from(selectedVendors);
      const { count: invoiceCount } = await supabase.from('vendor_invoices').select('*', { count: 'exact', head: true }).in('vendor_id', vendorIds);
      if (invoiceCount && invoiceCount > 0) {
        showError(`لا يمكن حذف الموردين المحددين لوجود ${invoiceCount} فاتورة مرتبطة بهم.`);
        setShowDeleteConfirm(false); setDeleting(false); return;
      }
      const { error } = await supabase.from('vendors').delete().in('id', vendorIds);
      if (error) { if (error.code === '23503') showError('لا يمكن حذف الموردين المحددين لوجود سجلات مرتبطة بهم.'); else throw error; return; }
      showSuccess(`تم حذف ${selectedVendors.size} مورد بنجاح`);
      setSelectedVendors(new Set()); setShowDeleteConfirm(false); await fetchVendors();
    } catch (error) { console.error('Error deleting vendors:', error); showError('حدث خطأ أثناء حذف الموردين'); }
    finally { setDeleting(false); }
  };

  const hasActiveFilters = filters.nationality.length > 0 || filters.primary_city.length > 0 || filters.primary_field.length > 0 || filters.status.length > 0;
  const uniqueNationalities = Array.from(new Set(vendors.filter(v => v.nationality).map(v => v.nationality!))).sort();
  const uniqueCities = (() => {
    const cities = Array.from(new Set(vendors.filter(v => v.primary_city).map(v => v.primary_city!)));
    const priority = ['الرياض', 'جدة', 'الدمام'];
    return [...priority.filter(c => cities.includes(c)), ...cities.filter(c => !priority.includes(c)).sort()];
  })();
  const uniqueFields = Array.from(new Set(vendors.filter(v => v.primary_field).map(v => v.primary_field!))).sort();
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
            <button className="btn btn-secondary btn-sm" onClick={() => setShowExportModal(true)}>
              <Download size={14} /> {selectedVendors.size > 0 ? `تصدير المحدد (${toEnglishNumbers(selectedVendors.size.toString())})` : 'تصدير الكل'}
            </button>
            {selectedVendors.size > 0 && (
              <>
                <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }} onClick={() => setShowDeleteConfirm(true)}>
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
                    <th style={{ width: 40 }}><input type="checkbox" className="tbl-check" checked={filteredVendors.length > 0 && selectedVendors.size === filteredVendors.length} onChange={toggleSelectAll} /></th>
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
          <VendorExportModal vendors={selectedVendors.size > 0 ? vendors.filter(v => selectedVendors.has(v.id)) : filteredVendors} onClose={() => setShowExportModal(false)} onSuccess={() => { setShowExportModal(false); setSelectedVendors(new Set()); }} />
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
        <ConfirmationModal isOpen={showDeleteConfirm} onCancel={() => setShowDeleteConfirm(false)} onConfirm={handleDelete} title="تأكيد حذف الموردين" message={`هل أنت متأكد من حذف ${selectedVendors.size} مورد؟ هذا الإجراء لا يمكن التراجع عنه.`} confirmText="حذف" cancelText="إلغاء" type="danger" />
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    full_name: '', phone: '', email: '', primary_field: '', primary_city: '',
    estimated_cost: '', status: 'active' as 'active' | 'inactive' | 'blocked',
    nationality: '', cr_number: '', tax_number: '', notes: '',
  });

  useEffect(() => {
    supabase.from('supplier_fields').select('*').eq('is_active', true).order('name').then(({ data, error }) => { if (error) console.error('Failed to fetch supplier_fields:', error); setAllFields(data || []); });
    supabase.from('cities').select('*').eq('is_active', true).order('name').then(({ data, error }) => { if (error) console.error('Failed to fetch cities:', error); setCities(data || []); });
  }, []);

  // Build service options with main → sub grouping
  const serviceOptions = React.useMemo(() => {
    const parents = allFields.filter(f => !f.parent_id);
    const options: { value: string; label: string }[] = [];
    parents.forEach(parent => {
      options.push({ value: parent.name, label: `◆ ${parent.name}` });
      const children = allFields.filter(f => f.parent_id === parent.id);
      children.forEach(child => {
        options.push({ value: child.name, label: `    ${child.name}` });
      });
    });
    // Add orphan fields (no parent, no children)
    const parentIds = new Set(parents.map(p => p.id));
    const childParentIds = new Set(allFields.filter(f => f.parent_id).map(f => f.parent_id!));
    allFields.filter(f => !f.parent_id && !childParentIds.has(f.id) && !parentIds.has(f.id)).forEach(f => {
      options.push({ value: f.name, label: f.name });
    });
    return options;
  }, [allFields]);

  // Nationality options with flags from shared-data
  const nationalityOptions = React.useMemo(() => {
    return COUNTRIES.map(c => ({ value: c.nameAr, label: `${c.flag} ${c.nameAr}` }));
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) { showError('يرجى إدخال الاسم الكامل'); return; }
    if (!formData.phone.trim()) { showError('يرجى إدخال رقم الجوال'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('vendors').insert([{
        full_name: formData.full_name.trim(), phone: toEnglishNumbers(formData.phone.trim()),
        email: formData.email.trim() || null, primary_field: formData.primary_field.trim() || null,
        primary_city: formData.primary_city.trim() || null, nationality: formData.nationality.trim() || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        status: formData.status, created_by: user?.id,
      }]);
      if (error) throw error;
      showSuccess('تم إضافة المورد بنجاح');
      onSuccess();
    } catch (error) { console.error('Error adding vendor:', error); showError('حدث خطأ أثناء إضافة المورد'); }
    finally { setLoading(false); }
  };

  return createPortal(
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <div>
            <div className="modal-ttl">إضافة مورد جديد</div>
            <div className="modal-sub">أدخل بيانات المورد لإضافته للنظام</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              {/* Logo Upload */}
              <div className="input-group full">
                <label className="input-label">شعار المورد</label>
                <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                  ) : (
                    <>
                      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <strong>اسحب الصورة هنا أو انقر للرفع</strong>
                      <span>PNG, JPG, SVG — حجم أقصى 5MB</span>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
              </div>

              {/* Name (full width) */}
              <div className="input-group full">
                <label className="input-label">اسم المورد / الشركة <span className="req">*</span></label>
                <input className="input" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="مثال: محمد خالد" />
              </div>

              {/* Email + Phone */}
              <div className="input-group">
                <label className="input-label">البريد الإلكتروني <span className="req">*</span></label>
                <input className="input" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="vendor@example.com" dir="ltr" style={{ textAlign: 'right' }} />
              </div>
              <div className="input-group">
                <label className="input-label">رقم الهاتف <span className="req">*</span></label>
                <input className="input" type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: toEnglishNumbers(e.target.value) })} placeholder="+966 5x xxx xxxx" dir="ltr" style={{ textAlign: 'right' }} />
              </div>

              {/* Service (with main/sub) + Nationality (with flags + search) */}
              <div className="input-group">
                <label className="input-label">الخدمة <span className="req">*</span></label>
                <SearchableDropdown value={formData.primary_field} onChange={value => setFormData({ ...formData, primary_field: value })} options={serviceOptions} placeholder="اختر نوع الخدمة" />
              </div>
              <div className="input-group">
                <label className="input-label">الجنسية</label>
                <SearchableDropdown value={formData.nationality} onChange={value => setFormData({ ...formData, nationality: value })} options={nationalityOptions} placeholder="اختر الجنسية" />
              </div>

              {/* City + Cost */}
              <div className="input-group">
                <label className="input-label">المدينة</label>
                <SearchableDropdown value={formData.primary_city} onChange={value => setFormData({ ...formData, primary_city: value })} options={cities.map(c => ({ value: c.name, label: c.name }))} placeholder="اختر المدينة" />
              </div>
              <div className="input-group">
                <label className="input-label">التكلفة التقديرية (ريال)</label>
                <input className="input" type="number" step="0.01" value={formData.estimated_cost} onChange={e => setFormData({ ...formData, estimated_cost: e.target.value })} placeholder="مثال: 5000" dir="ltr" style={{ textAlign: 'right' }} />
              </div>

              {/* CR + Tax */}
              <div className="input-group">
                <label className="input-label">رقم السجل التجاري</label>
                <input className="input" value={formData.cr_number} onChange={e => setFormData({ ...formData, cr_number: toEnglishNumbers(e.target.value) })} placeholder="10 أرقام" dir="ltr" style={{ textAlign: 'right' }} />
              </div>
              <div className="input-group">
                <label className="input-label">الرقم الضريبي</label>
                <input className="input" value={formData.tax_number} onChange={e => setFormData({ ...formData, tax_number: toEnglishNumbers(e.target.value) })} placeholder="15 رقم" dir="ltr" style={{ textAlign: 'right' }} />
              </div>

              {/* Notes */}
              <div className="input-group full">
                <label className="input-label">ملاحظات</label>
                <textarea className="input" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية عن المورد..." style={{ minHeight: 70 }} />
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
