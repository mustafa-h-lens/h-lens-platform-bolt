import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DollarSign, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, Calendar, Users, Receipt, Wallet, CreditCard, RotateCcw } from 'lucide-react';
import { MultiSelectFilter } from '../../shared/MultiSelectFilter';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic, formatNumber } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import type { VendorField } from '../../../types/database';

interface ExpenseRow {
  id: string;
  vendor_id: string;
  client_name: string;
  client_image: string | null;
  vendor_name: string;
  project_name: string;
  project_id: string;
  project_manager_name: string;
  category: string | null;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
  status: string;
  due_date: string | null;
  project_item_name: string | null;
  currency: string;
  created_at: string;
}

interface VendorSummary {
  vendor_id: string;
  vendor_name: string;
  project_count: number;
  invoice_count: number;
  total_amount: number;
  total_paid: number;
  total_remaining: number;
  latest_activity: string;
  projects: { name: string; amount: number; paid: number }[];
}

interface ExpensesPageProps {
  onViewProject?: (projectId: string) => void;
}
export const ExpensesPage = ({ onViewProject }: ExpensesPageProps) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'vendors'>('expenses');
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [vendorFields, setVendorFields] = useState<VendorField[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string[]>([]);
  const [filterManager, setFilterManager] = useState<string[]>([]);
  const [filterVendor, setFilterVendor] = useState<string[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const toggleFilter = (key: 'project' | 'manager' | 'vendor', value: string) => {
    const setter = key === 'project' ? setFilterProject : key === 'manager' ? setFilterManager : setFilterVendor;
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  useEffect(() => {
    loadAllExpenses();
    loadVendorFields();
  }, [page]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filterProject, filterManager, filterVendor, filterDateFrom, filterDateTo]);

  // Close date picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const loadVendorFields = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_fields')
        .select('id, name_ar, name_en, parent_id, display_order, is_active')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setVendorFields(data || []);
    } catch (error) {
      console.error('Error loading vendor fields:', error);
    }
  };

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return '-';
    const field = vendorFields.find(f => f.id === category);
    if (field) return field.name_ar;
    return category;
  };

  const loadAllExpenses = async () => {
    try {
      setLoading(true);
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from('vendor_invoices')
        .select(`
          id,
          vendor_id,
          project_id,
          amount_total,
          amount_paid,
          amount_remaining,
          status,
          due_date,
          category,
          project_item_id,
          created_at,
          vendors (
            full_name
          ),
          project_items (
            name
          ),
          projects (
            name,
            currency,
            client_id,
            project_manager_id,
            clients (
              name,
              client_image
            ),
            project_manager:users!projects_project_manager_id_fkey (
              full_name
            )
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        // Fallback without new columns
        const fallback = await supabase
          .from('vendor_invoices')
          .select(`
            id,
            vendor_id,
            project_id,
            amount_total,
            amount_paid,
            amount_remaining,
            status,
            due_date,
            created_at,
            vendors (
              full_name
            ),
            projects (
              name,
              currency,
              client_id,
              project_manager_id,
              clients (
                name,
                client_image
              ),
              project_manager:users!projects_project_manager_id_fkey (
                full_name
              )
            )
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (fallback.error) throw fallback.error;
        setExpenses(mapData(fallback.data || []));
        setTotalCount(fallback.count || 0);
        return;
      }

      setExpenses(mapData(data || []));
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapData = (data: any[]): ExpenseRow[] =>
    data.map((item) => ({
      id: item.id,
      vendor_id: item.vendor_id || '',
      client_name: item.projects?.clients?.name || '-',
      client_image: item.projects?.clients?.client_image || null,
      vendor_name: item.vendors?.full_name || '',
      project_name: item.projects?.name || '',
      project_id: item.project_id,
      project_manager_name: item.projects?.project_manager?.full_name || '-',
      category: item.category || null,
      project_item_name: item.project_items?.name || null,
      amount: item.amount_total,
      amount_paid: item.amount_paid ?? 0,
      amount_remaining: item.amount_remaining ?? item.amount_total,
      status: item.status,
      due_date: item.due_date,
      currency: item.projects?.currency || 'SAR',
      created_at: item.created_at || '',
    }));

  const deriveStatus = (row: ExpenseRow): string => {
    if (row.status === 'paid') return 'paid';
    if (row.amount_paid > 0 && row.amount_paid < row.amount) return 'partial';
    if (row.due_date && new Date(row.due_date) < new Date() && row.amount_paid === 0) return 'overdue';
    if (row.status === 'overdue') return 'overdue';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return { label: 'مدفوع', cls: 'badge badge-green' };
      case 'partial': return { label: 'جزئي', cls: 'badge badge-amber' };
      case 'overdue': return { label: 'متأخر', cls: 'badge badge-red' };
      default: return { label: 'معلق', cls: 'badge badge-gray' };
    }
  };

  // Derive unique filter options from data
  const uniqueProjects = useMemo(() =>
    [...new Map(expenses.map(e => [e.project_id, e.project_name])).entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [expenses]
  );
  const uniqueManagers = useMemo(() =>
    [...new Set(expenses.map(e => e.project_manager_name).filter(n => n !== '-'))].sort(),
    [expenses]
  );
  const uniqueVendors = useMemo(() =>
    [...new Set(expenses.map(e => e.vendor_name).filter(Boolean))].sort(),
    [expenses]
  );

  const hasActiveFilters = searchTerm || filterProject.length > 0 || filterManager.length > 0 || filterVendor.length > 0 || filterDateFrom || filterDateTo;

  const dateRangeLabel = useMemo(() => {
    if (filterDateFrom && filterDateTo) return `${filterDateFrom} — ${filterDateTo}`;
    if (filterDateFrom) return `من ${filterDateFrom}`;
    if (filterDateTo) return `حتى ${filterDateTo}`;
    return '';
  }, [filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterProject([]);
    setFilterManager([]);
    setFilterVendor([]);
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Apply filters
  const filteredExpenses = useMemo(() =>
    expenses.filter(e => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!e.vendor_name.toLowerCase().includes(s) && !e.project_name.toLowerCase().includes(s) && !e.client_name.toLowerCase().includes(s)) return false;
      }
      if (filterProject.length > 0 && !filterProject.includes(e.project_id)) return false;
      if (filterManager.length > 0 && !filterManager.includes(e.project_manager_name)) return false;
      if (filterVendor.length > 0 && !filterVendor.includes(e.vendor_name)) return false;
      if (filterDateFrom && e.due_date && e.due_date < filterDateFrom) return false;
      if (filterDateTo && e.due_date && e.due_date > filterDateTo) return false;
      return true;
    }),
    [expenses, searchTerm, filterProject, filterManager, filterVendor, filterDateFrom, filterDateTo]
  );

  const totalAll = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalPaid = filteredExpenses.reduce((s, e) => s + e.amount_paid, 0);
  const totalRemaining = filteredExpenses.reduce((s, e) => s + e.amount_remaining, 0);

  // Vendor summary aggregation
  const vendorSummaries = useMemo<VendorSummary[]>(() => {
    const map = new Map<string, VendorSummary>();
    filteredExpenses.forEach(e => {
      if (!map.has(e.vendor_id)) {
        map.set(e.vendor_id, {
          vendor_id: e.vendor_id,
          vendor_name: e.vendor_name,
          project_count: 0,
          invoice_count: 0,
          total_amount: 0,
          total_paid: 0,
          total_remaining: 0,
          latest_activity: e.created_at || '',
          projects: [],
        });
      }
      const v = map.get(e.vendor_id)!;
      v.invoice_count += 1;
      v.total_amount += e.amount;
      v.total_paid += e.amount_paid;
      v.total_remaining += e.amount_remaining;
      if (e.created_at && e.created_at > v.latest_activity) {
        v.latest_activity = e.created_at;
      }
      const existing = v.projects.find(p => p.name === e.project_name);
      if (existing) {
        existing.amount += e.amount;
        existing.paid += e.amount_paid;
      } else {
        v.projects.push({ name: e.project_name, amount: e.amount, paid: e.amount_paid });
        v.project_count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.latest_activity.localeCompare(a.latest_activity));
  }, [filteredExpenses]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div>
      {/* Page Title */}
      <div className="page-title-row">
        <div>
          <div className="page-title">المصروفات</div>
          <div className="page-subtitle">إدارة المصروفات والمدفوعات</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-colored" style={{ marginBottom: 20, display: 'flex' }}>
        <div className={`tab tab-blue ${activeTab === 'expenses' ? 'on' : ''}`} onClick={() => setActiveTab('expenses')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DollarSign size={14} />
          المصروفات
        </div>
        <div className={`tab tab-blue ${activeTab === 'vendors' ? 'on' : ''}`} onClick={() => setActiveTab('vendors')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={14} />
          ملخص الموردين
          {vendorSummaries.filter(v => v.total_remaining > 0).length > 0 && (
            <span className="sb-badge" style={{ marginRight: 0 }}>{vendorSummaries.filter(v => v.total_remaining > 0).length}</span>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card sc-blue">
          <div className="stat-icon-box"><DollarSign size={18} /></div>
          <div className="stat-sub">إجمالي المصروفات</div>
          <div className="stat-val" dir="ltr">{formatCurrency(totalAll, 'SAR')}</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><Wallet size={18} /></div>
          <div className="stat-sub">المدفوع</div>
          <div className="stat-val" dir="ltr">{formatCurrency(totalPaid, 'SAR')}</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><CreditCard size={18} /></div>
          <div className="stat-sub">المتبقي</div>
          <div className="stat-val" dir="ltr">{formatCurrency(totalRemaining, 'SAR')}</div>
        </div>
      </div>

      {/* ═══ VENDOR SUMMARY TAB ═══ */}
      {activeTab === 'vendors' && (
        <>
          {vendorSummaries.length === 0 ? (
            <div className="dash-empty" style={{ height: 200 }}>
              <Users size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد بيانات</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>المورد</th>
                    <th style={{ textAlign: 'center' }}>المشاريع</th>
                    <th style={{ textAlign: 'center' }}>الفواتير</th>
                    <th>الإجمالي</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                    <th style={{ textAlign: 'center' }}>السداد</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {vendorSummaries.map((v) => {
                    const isExpanded = expandedVendor === v.vendor_id;
                    const paidPercent = v.total_amount > 0 ? Math.round((v.total_paid / v.total_amount) * 100) : 0;
                    return (
                      <React.Fragment key={v.vendor_id}>
                        <tr
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpandedVendor(isExpanded ? null : v.vendor_id)}
                        >
                          <td><span className="td-primary">{v.vendor_name}</span></td>
                          <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{v.project_count}</td>
                          <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{v.invoice_count}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }} dir="ltr">{formatCurrency(v.total_amount, 'SAR')}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success-text)', fontSize: 13 }} dir="ltr">{formatCurrency(v.total_paid, 'SAR')}</td>
                          <td style={{ fontWeight: 700, color: v.total_remaining > 0 ? 'var(--warning-text)' : 'var(--success-text)', fontSize: 13 }} dir="ltr">{formatCurrency(v.total_remaining, 'SAR')}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                              <div style={{ width: 64, height: 6, borderRadius: 99, background: 'var(--border-soft)', overflow: 'hidden' }}>
                                <div style={{ width: `${paidPercent}%`, height: '100%', borderRadius: 99, background: paidPercent === 100 ? 'var(--success)' : 'var(--accent)' }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: paidPercent === 100 ? 'var(--success-text)' : 'var(--warning-text)' }}>{paidPercent}%</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ background: 'var(--bg-overlay)', padding: 0 }}>
                              <div style={{ padding: '12px 24px' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>تفصيل المشاريع</div>
                                <table style={{ width: '100%' }}>
                                  <tbody>
                                    {v.projects.map((p, pi) => {
                                      const pp = p.amount > 0 ? Math.round((p.paid / p.amount) * 100) : 0;
                                      return (
                                        <tr key={pi} style={{ borderBottom: pi < v.projects.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                                          <td style={{ padding: '8px 0', fontSize: 13, color: 'var(--text-primary)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Receipt size={12} style={{ color: 'var(--accent-lighter)' }} /> {p.name}</span>
                                          </td>
                                          <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }} dir="ltr">{formatCurrency(p.amount, 'SAR')}</td>
                                          <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 500, color: 'var(--success-text)' }} dir="ltr">{formatCurrency(p.paid, 'SAR')}</td>
                                          <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700, color: p.amount - p.paid > 0 ? 'var(--warning-text)' : 'var(--success-text)' }} dir="ltr">{formatCurrency(p.amount - p.paid, 'SAR')}</td>
                                          <td style={{ padding: '8px 0', width: 80 }}>
                                            <div style={{ width: '100%', height: 4, borderRadius: 99, background: 'var(--border-soft)', overflow: 'hidden' }}>
                                              <div style={{ width: `${pp}%`, height: '100%', borderRadius: 99, background: pp === 100 ? 'var(--success)' : 'var(--accent)' }} />
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div style={{ padding: 16, background: 'var(--accent)', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{vendorSummaries.length} مورد</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>الإجمالي: <strong style={{ color: '#fff' }} dir="ltr">{formatCurrency(totalAll, 'SAR')}</strong></span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>المدفوع: <strong style={{ color: '#86efac' }} dir="ltr">{formatCurrency(totalPaid, 'SAR')}</strong></span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>المتبقي: <strong style={{ color: '#fdba74' }} dir="ltr">{formatCurrency(totalRemaining, 'SAR')}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ EXPENSES TAB ═══ */}
      {activeTab === 'expenses' && <>
      {/* Filter Bar */}
      <div className="filter-bar">
        <input className="input" placeholder="بحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: 220 }} />

        <MultiSelectFilter
          label="المشروع"
          options={uniqueProjects.map(p => ({ value: p.id, label: p.name }))}
          selected={filterProject}
          onToggle={v => toggleFilter('project', v)}
        />

        <MultiSelectFilter
          label="مدير المشروع"
          options={uniqueManagers.map(m => ({ value: m, label: m }))}
          selected={filterManager}
          onToggle={v => toggleFilter('manager', v)}
        />

        <MultiSelectFilter
          label="المورد"
          options={uniqueVendors.map(v => ({ value: v, label: v }))}
          selected={filterVendor}
          onToggle={v => toggleFilter('vendor', v)}
        />

        {/* Date Range */}
        <div style={{ position: 'relative' }} ref={datePickerRef}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{ gap: 6 }}
          >
            <Calendar size={13} />
            <span style={{ fontSize: 12 }}>{dateRangeLabel || 'الفترة الزمنية'}</span>
            {dateRangeLabel && (
              <X
                size={12}
                style={{ flexShrink: 0 }}
                onClick={e => { e.stopPropagation(); setFilterDateFrom(''); setFilterDateTo(''); }}
              />
            )}
          </button>

          {showDatePicker && (
            <div style={{
              position: 'absolute', top: '100%', marginTop: 8, left: 0, zIndex: 50,
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)',
              padding: 16, boxShadow: 'var(--shadow-lg)', minWidth: 260,
              background: 'var(--bg-surface)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">من</label>
                  <input type="date" className="input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} max={filterDateTo || undefined} />
                </div>
                <div className="input-group">
                  <label className="input-label">إلى</label>
                  <input type="date" className="input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} min={filterDateFrom || undefined} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowDatePicker(false)}>تطبيق</button>
              </div>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            <RotateCcw size={13} /> إعادة تعيين
          </button>
        )}
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
        <div className="dash-empty" style={{ height: 200 }}>
          <DollarSign size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد مصروفات</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>يمكنك إضافة مصروفات من داخل صفحة المشروع</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المورد</th>
                <th>العميل</th>
                <th>المشروع</th>
                <th>مدير المشروع</th>
                <th>الدور</th>
                <th>البند</th>
                <th>المبلغ</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th>الاستحقاق</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const status = deriveStatus(expense);
                const badge = getStatusBadge(status);
                return (
                  <tr
                    key={expense.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewProject?.(expense.project_id)}
                  >
                    <td><span className="td-primary">{expense.vendor_name}</span></td>
                    <td>
                      <div className="user-row">
                        <div className="client-logo" style={{ width: 28, height: 28 }}>
                          {expense.client_image ? (
                            <img src={expense.client_image} alt={expense.client_name} />
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{expense.client_name.charAt(0)}</span>
                          )}
                        </div>
                        <span className="u-name">{expense.client_name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-lighter)', fontSize: 13 }}>
                        {expense.project_name}
                        <ChevronLeft size={12} />
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{expense.project_manager_name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{getCategoryLabel(expense.category)}</td>
                    <td style={{ color: expense.project_item_name ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 13 }}>{expense.project_item_name || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }} dir="ltr">{formatCurrency(expense.amount, expense.currency)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success-text)', fontSize: 13 }} dir="ltr">{formatCurrency(expense.amount_paid, expense.currency)}</td>
                    <td style={{ fontWeight: 600, color: expense.amount_remaining > 0 ? 'var(--warning-text)' : 'var(--success-text)', fontSize: 13 }} dir="ltr">{formatCurrency(expense.amount_remaining, expense.currency)}</td>
                    <td><span className={badge.cls}>{badge.label}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }} dir="ltr">{expense.due_date ? formatDateArabic(expense.due_date) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer total */}
          <div style={{ padding: 16, background: 'var(--accent)', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>إجمالي المصروفات</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }} dir="ltr">{formatCurrency(totalAll, 'SAR')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="pagination">
          <div className="pag-info">عرض <strong>{toEnglishNumbers((page * pageSize + 1).toString())}-{toEnglishNumbers(Math.min((page + 1) * pageSize, totalCount).toString())}</strong> من <strong>{toEnglishNumbers(totalCount.toString())}</strong> مصروف</div>
          <div className="pag-controls">
            <button className={`pag-btn ${page === 0 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronRight size={15} /></button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => (
              <button key={i} className={`pag-btn ${page === i ? 'active' : ''}`} onClick={() => setPage(i)}>{toEnglishNumbers((i + 1).toString())}</button>
            ))}
            {totalPages > 3 && <button className="pag-btn" style={{ fontSize: 11, letterSpacing: 1 }}>...</button>}
            {totalPages > 3 && <button className={`pag-btn ${page === totalPages - 1 ? 'active' : ''}`} onClick={() => setPage(totalPages - 1)}>{toEnglishNumbers(totalPages.toString())}</button>}
            <button className={`pag-btn ${page >= totalPages - 1 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronLeft size={15} /></button>
          </div>
          <div className="pag-per-page">إجمالي: {toEnglishNumbers(totalCount.toString())}</div>
        </div>
      )}
      </>}
    </div>
  );
};
