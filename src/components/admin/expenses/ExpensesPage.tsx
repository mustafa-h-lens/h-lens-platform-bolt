import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DollarSign, ChevronLeft, Filter, X, ChevronDown, ChevronUp, Calendar, Users, Receipt } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
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
  currency: string;
}

interface VendorSummary {
  vendor_id: string;
  vendor_name: string;
  project_count: number;
  invoice_count: number;
  total_amount: number;
  total_paid: number;
  total_remaining: number;
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
  const [filterProject, setFilterProject] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAllExpenses();
    loadVendorFields();
  }, [page]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [filterProject, filterManager, filterVendor, filterDateFrom, filterDateTo]);

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
      amount: item.amount_total,
      amount_paid: item.amount_paid ?? 0,
      amount_remaining: item.amount_remaining ?? item.amount_total,
      status: item.status,
      due_date: item.due_date,
      currency: item.projects?.currency || 'SAR',
    }));

  const deriveStatus = (row: ExpenseRow): string => {
    if (row.status === 'paid') return 'paid';
    if (row.amount_paid > 0 && row.amount_paid < row.amount) return 'partial';
    if (row.due_date && new Date(row.due_date) < new Date() && row.amount_paid === 0) return 'overdue';
    if (row.status === 'overdue') return 'overdue';
    return 'pending';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'partial': return 'جزئي';
      case 'overdue': return 'متأخر';
      default: return 'معلق';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'var(--color-success)';
      case 'partial': return 'var(--color-warning)';
      case 'overdue': return 'var(--color-danger)';
      default: return 'var(--color-text-secondary)';
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

  const hasActiveFilters = filterProject || filterManager || filterVendor || filterDateFrom || filterDateTo;

  const dateRangeLabel = useMemo(() => {
    if (filterDateFrom && filterDateTo) return `${filterDateFrom} — ${filterDateTo}`;
    if (filterDateFrom) return `من ${filterDateFrom}`;
    if (filterDateTo) return `حتى ${filterDateTo}`;
    return '';
  }, [filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterProject('');
    setFilterManager('');
    setFilterVendor('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Apply filters
  const filteredExpenses = useMemo(() =>
    expenses.filter(e => {
      if (filterProject && e.project_id !== filterProject) return false;
      if (filterManager && e.project_manager_name !== filterManager) return false;
      if (filterVendor && e.vendor_name !== filterVendor) return false;
      if (filterDateFrom && e.due_date && e.due_date < filterDateFrom) return false;
      if (filterDateTo && e.due_date && e.due_date > filterDateTo) return false;
      return true;
    }),
    [expenses, filterProject, filterManager, filterVendor, filterDateFrom, filterDateTo]
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
          projects: [],
        });
      }
      const v = map.get(e.vendor_id)!;
      v.invoice_count += 1;
      v.total_amount += e.amount;
      v.total_paid += e.amount_paid;
      v.total_remaining += e.amount_remaining;
      const existing = v.projects.find(p => p.name === e.project_name);
      if (existing) {
        existing.amount += e.amount;
        existing.paid += e.amount_paid;
      } else {
        v.projects.push({ name: e.project_name, amount: e.amount, paid: e.amount_paid });
        v.project_count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total_remaining - a.total_remaining);
  }, [filteredExpenses]);

  if (loading) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        المصروفات
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-px`}
          style={{
            borderColor: activeTab === 'expenses' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'expenses' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          }}
        >
          <DollarSign size={16} />
          المصروفات
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-px`}
          style={{
            borderColor: activeTab === 'vendors' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'vendors' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          }}
        >
          <Users size={16} />
          ملخص الموردين
          {vendorSummaries.filter(v => v.total_remaining > 0).length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
              {vendorSummaries.filter(v => v.total_remaining > 0).length}
            </span>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>إجمالي المصروفات</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
            {formatCurrency(totalAll, 'SAR')}
          </p>
        </div>
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>المدفوع</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }} dir="ltr">
            {formatCurrency(totalPaid, 'SAR')}
          </p>
        </div>
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>المتبقي</p>
          <p className="text-2xl font-bold" style={{ color: totalRemaining > 0 ? '#f97316' : 'var(--color-success)' }} dir="ltr">
            {formatCurrency(totalRemaining, 'SAR')}
          </p>
        </div>
      </div>

      {/* ═══ VENDOR SUMMARY TAB ═══ */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          {vendorSummaries.length === 0 ? (
            <div className="text-center py-16 rounded-lg border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg mb-2">لا توجد بيانات</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              {/* Table header */}
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--color-table-header)', borderBottom: '1px solid var(--color-table-border)' }}>
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المورد</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المشاريع</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الفواتير</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الإجمالي</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المدفوع</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المتبقي</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>السداد</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {vendorSummaries.map((v, idx) => {
                    const isExpanded = expandedVendor === v.vendor_id;
                    const paidPercent = v.total_amount > 0 ? Math.round((v.total_paid / v.total_amount) * 100) : 0;
                    const statusLabel = v.total_remaining === 0 ? 'مسدد' : v.total_paid > 0 ? 'جزئي' : 'معلق';
                    const statusColor = v.total_remaining === 0 ? 'var(--color-success)' : v.total_paid > 0 ? '#f97316' : 'var(--color-text-secondary)';
                    return (
                      <React.Fragment key={v.vendor_id}>
                        <tr
                          className="cursor-pointer transition-colors"
                          style={{ borderBottom: '1px solid var(--color-table-border)' }}
                          onClick={() => setExpandedVendor(isExpanded ? null : v.vendor_id)}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{v.vendor_name}</div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{v.project_count}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{v.invoice_count}</span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                            {formatCurrency(v.total_amount, 'SAR')}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-sm" style={{ color: 'var(--color-success)' }} dir="ltr">
                            {formatCurrency(v.total_paid, 'SAR')}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-sm" style={{ color: v.total_remaining > 0 ? '#f97316' : 'var(--color-success)' }} dir="ltr">
                            {formatCurrency(v.total_remaining, 'SAR')}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 h-2 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                                <div className="h-full rounded-full" style={{ width: `${paidPercent}%`, backgroundColor: paidPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                              </div>
                              <span className="text-xs font-bold" style={{ color: statusColor }}>{paidPercent}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--color-text-secondary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-secondary)' }} />}
                          </td>
                        </tr>
                        {/* Expanded: project breakdown */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ backgroundColor: 'var(--color-background-hover)', padding: 0 }}>
                              <div className="px-6 py-3">
                                <div className="text-xs font-bold mb-2" style={{ color: 'var(--color-text-secondary)' }}>تفصيل المشاريع</div>
                                <table className="w-full">
                                  <tbody>
                                    {v.projects.map((p, pi) => {
                                      const pp = p.amount > 0 ? Math.round((p.paid / p.amount) * 100) : 0;
                                      return (
                                        <tr key={pi} style={{ borderBottom: pi < v.projects.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                          <td className="py-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                            <span className="flex items-center gap-1"><Receipt size={13} style={{ color: 'var(--color-primary)' }} /> {p.name}</span>
                                          </td>
                                          <td className="py-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }} dir="ltr">{formatCurrency(p.amount, 'SAR')}</td>
                                          <td className="py-2 text-sm font-medium" style={{ color: 'var(--color-success)' }} dir="ltr">{formatCurrency(p.paid, 'SAR')}</td>
                                          <td className="py-2 text-sm font-bold" style={{ color: p.amount - p.paid > 0 ? '#f97316' : 'var(--color-success)' }} dir="ltr">{formatCurrency(p.amount - p.paid, 'SAR')}</td>
                                          <td className="py-2 w-20">
                                            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                                              <div className="h-full rounded-full" style={{ width: `${pp}%`, backgroundColor: pp === 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
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
              <div className="p-4" style={{ backgroundColor: 'var(--color-primary)' }}>
                <div className="flex items-center justify-between gap-8">
                  <span className="text-sm font-bold text-white">{vendorSummaries.length} مورد</span>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-white/70">الإجمالي: <strong className="text-white" dir="ltr">{formatCurrency(totalAll, 'SAR')}</strong></span>
                    <span className="text-sm text-white/70">المدفوع: <strong className="text-green-300" dir="ltr">{formatCurrency(totalPaid, 'SAR')}</strong></span>
                    <span className="text-sm text-white/70">المتبقي: <strong className="text-orange-300" dir="ltr">{formatCurrency(totalRemaining, 'SAR')}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ EXPENSES TAB ═══ */}
      {activeTab === 'expenses' && <>
      {/* Filters */}
      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>تصفية</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mr-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ color: 'var(--color-danger)', backgroundColor: 'rgba(239,68,68,0.1)' }}
            >
              <X size={12} />
              مسح الكل
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Project */}
          <div className="relative">
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="w-full appearance-none pr-3 pl-8 py-2.5 rounded-lg border text-sm cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: filterProject ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}
            >
              <option value="">كل المشاريع</option>
              {uniqueProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
          </div>

          {/* Project Manager */}
          <div className="relative">
            <select
              value={filterManager}
              onChange={e => setFilterManager(e.target.value)}
              className="w-full appearance-none pr-3 pl-8 py-2.5 rounded-lg border text-sm cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: filterManager ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}
            >
              <option value="">كل مديري المشاريع</option>
              {uniqueManagers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
          </div>

          {/* Vendor */}
          <div className="relative">
            <select
              value={filterVendor}
              onChange={e => setFilterVendor(e.target.value)}
              className="w-full appearance-none pr-3 pl-8 py-2.5 rounded-lg border text-sm cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: filterVendor ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}
            >
              <option value="">كل الموردين</option>
              {uniqueVendors.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
          </div>

          {/* Date Range */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full flex items-center gap-2 pr-3 pl-8 py-2.5 rounded-lg border text-sm text-right cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: dateRangeLabel ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}
            >
              <Calendar size={14} style={{ color: 'var(--color-text-secondary)' }} />
              <span className="flex-1 truncate">{dateRangeLabel || 'الفترة الزمنية'}</span>
              {dateRangeLabel && (
                <X
                  size={14}
                  className="flex-shrink-0"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onClick={e => { e.stopPropagation(); setFilterDateFrom(''); setFilterDateTo(''); }}
                />
              )}
            </button>
            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />

            {showDatePicker && (
              <div
                className="absolute top-full mt-2 left-0 z-50 rounded-xl border p-4 shadow-lg min-w-[260px]"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>من</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={e => setFilterDateFrom(e.target.value)}
                      max={filterDateTo || undefined}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>إلى</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={e => setFilterDateTo(e.target.value)}
                      min={filterDateFrom || undefined}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="w-full py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    تطبيق
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <DollarSign size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg mb-2">لا توجد مصروفات</p>
          <p className="text-sm">يمكنك إضافة مصروفات من داخل صفحة المشروع</p>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                style={{
                  backgroundColor: 'var(--color-table-header)',
                  borderBottom: '1px solid var(--color-table-border)',
                }}
              >
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المورد</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>العميل</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المشروع</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>مدير المشروع</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الدور</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المبلغ</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المدفوع</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المتبقي</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الاستحقاق</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense, index) => {
                  const status = deriveStatus(expense);
                  return (
                    <tr
                      key={expense.id}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom: index < filteredExpenses.length - 1 ? '1px solid var(--color-table-border)' : 'none',
                      }}
                      onClick={() => onViewProject?.(expense.project_id)}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {expense.vendor_name}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        <div className="flex items-center gap-2">
                          {expense.client_image ? (
                            <img
                              src={expense.client_image}
                              alt={expense.client_name}
                              className="w-7 h-7 rounded-full object-cover border"
                              style={{ borderColor: 'var(--color-border)' }}
                            />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                              {expense.client_name.charAt(0)}
                            </div>
                          )}
                          {expense.client_name}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-primary)' }}>
                        <span className="flex items-center gap-1">
                          {expense.project_name}
                          <ChevronLeft size={14} />
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                        {expense.project_manager_name}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                        {getCategoryLabel(expense.category)}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-success)' }} dir="ltr">
                        {formatCurrency(expense.amount_paid, expense.currency)}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: expense.amount_remaining > 0 ? '#f97316' : 'var(--color-success)' }} dir="ltr">
                        {formatCurrency(expense.amount_remaining, expense.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: getStatusColor(status), color: '#ffffff' }}
                        >
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                        {expense.due_date ? formatDateArabic(expense.due_date) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer total */}
          <div className="p-4" style={{ backgroundColor: 'var(--color-primary)' }}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">إجمالي المصروفات</span>
              <span className="text-xl font-bold text-white" dir="ltr">
                {formatCurrency(totalAll, 'SAR')}
              </span>
            </div>
          </div>
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
            إجمالي: {toEnglishNumbers(totalCount.toString())} مصروف
          </div>
        ) : null;
      })()}
      </>}
    </div>
  );
};
