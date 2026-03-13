import { useState, useEffect } from 'react';
import { DollarSign, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../lib/formatters';
import type { VendorField } from '../../types/database';
import { navigate } from '../../lib/router';

interface ExpenseRow {
  id: string;
  vendor_name: string;
  project_name: string;
  project_id: string;
  category: string | null;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
  status: string;
  due_date: string | null;
  currency: string;
}

export const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [vendorFields, setVendorFields] = useState<VendorField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllExpenses();
    loadVendorFields();
  }, []);

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
      const { data, error } = await supabase
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
            currency
          )
        `)
        .order('created_at', { ascending: false });

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
              currency
            )
          `)
          .order('created_at', { ascending: false });

        if (fallback.error) throw fallback.error;
        setExpenses(mapData(fallback.data || []));
        return;
      }

      setExpenses(mapData(data || []));
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapData = (data: any[]): ExpenseRow[] =>
    data.map((item) => ({
      id: item.id,
      vendor_name: item.vendors?.full_name || '',
      project_name: item.projects?.name || '',
      project_id: item.project_id,
      category: item.category || null,
      amount: item.amount_total,
      amount_paid: item.amount_paid || 0,
      amount_remaining: item.amount_remaining || item.amount_total,
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

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
  const totalPaid = expenses.reduce((s, e) => s + e.amount_paid, 0);
  const totalRemaining = expenses.reduce((s, e) => s + e.amount_remaining, 0);

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

      {/* Expenses Table */}
      {expenses.length === 0 ? (
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
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الفريلانسر</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المشروع</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الدور</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المبلغ</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المدفوع</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المتبقي</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الاستحقاق</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, index) => {
                  const status = deriveStatus(expense);
                  return (
                    <tr
                      key={expense.id}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom: index < expenses.length - 1 ? '1px solid var(--color-table-border)' : 'none',
                      }}
                      onClick={() => navigate(`/projects/${expense.project_id}`)}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {expense.vendor_name}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-primary)' }}>
                        <span className="flex items-center gap-1">
                          {expense.project_name}
                          <ChevronLeft size={14} />
                        </span>
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
          <div className="bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9] p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">إجمالي المصروفات</span>
              <span className="text-xl font-bold text-white" dir="ltr">
                {formatCurrency(totalAll, 'SAR')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
