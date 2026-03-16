import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, CreditCard, ChevronDown, ChevronUp, Upload, FileText, Download, X, Search } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../../../lib/formatters';
import { toEnglishNumbers } from '../../../../lib/numberUtils';
import { Modal } from '../../../shared/Modal';
import { ConfirmationModal } from '../../../shared/ConfirmationModal';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { PAYMENT_METHODS } from '../../../../types/database';
import type { VendorField } from '../../../../types/database';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

interface Expense {
  id: string;
  vendor_id: string;
  vendor_name: string;
  category: string | null;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  invoice_file_url: string | null;
  created_at: string;
  payments: Payment[];
}

interface Vendor {
  id: string;
  full_name: string;
  primary_field: string | null;
  default_category_id?: string | null;
  default_rate?: number | null;
}

interface ProjectExpensesProps {
  projectId: string;
  currency: string;
}

export const ProjectExpenses = ({ projectId, currency }: ProjectExpensesProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorFields, setVendorFields] = useState<VendorField[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectTotalPrice, setProjectTotalPrice] = useState(0);

  // UI state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentExpense, setPaymentExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    vendor_id: '',
    category: '',
    amount: '',
    due_date: '',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Close vendor dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(e.target as Node)) {
        setVendorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fill category & amount when vendor is selected
  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    setExpenseForm(prev => ({
      ...prev,
      vendor_id: vendorId,
      category: vendor?.default_category_id || prev.category,
      amount: vendor?.default_rate ? String(vendor.default_rate) : prev.amount,
    }));
    setVendorSearch(vendor?.full_name || '');
    setVendorDropdownOpen(false);
  };

  useEffect(() => {
    loadExpenses();
    loadVendors();
    loadVendorFields();
    loadProjectData();
  }, [projectId]);

  const loadExpenses = async () => {
    try {
      setLoading(true);

      // Try full query with payments join first; fall back without it if table doesn't exist yet
      let data: any[] | null = null;
      const fullQuery = supabase
        .from('vendor_invoices')
        .select(`
          id,
          vendor_id,
          amount_total,
          amount_paid,
          amount_remaining,
          status,
          due_date,
          category,
          notes,
          invoice_file_url,
          created_at,
          vendors (
            full_name,
            primary_field
          ),
          expense_payments (
            id,
            amount,
            payment_method,
            payment_date,
            notes,
            created_at
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      const fullResult = await fullQuery;

      if (fullResult.error) throw fullResult.error;
      data = fullResult.data;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        vendor_id: item.vendor_id,
        vendor_name: item.vendors?.full_name || '',
        category: item.category || null,
        amount: item.amount_total,
        amount_paid: item.amount_paid ?? 0,
        amount_remaining: item.amount_remaining ?? item.amount_total,
        due_date: item.due_date,
        status: item.status,
        notes: item.notes || null,
        invoice_file_url: item.invoice_file_url || null,
        created_at: item.created_at,
        payments: (item.expense_payments || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }));
      setExpenses(mapped);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, full_name, primary_field')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;

      // Fetch default category & rate for each vendor from vendor_selected_fields
      const vendorIds = (data || []).map(v => v.id);
      let fieldsMap: Record<string, { field_id: string; rate_from: number | null }> = {};
      if (vendorIds.length > 0) {
        const { data: selectedFields } = await supabase
          .from('vendor_selected_fields')
          .select('vendor_id, field_id, rate_from, vendor_fields(name_ar)')
          .in('vendor_id', vendorIds)
          .order('created_at', { ascending: true });
        // Use the first selected field per vendor as default
        (selectedFields || []).forEach(sf => {
          if (!fieldsMap[sf.vendor_id]) {
            fieldsMap[sf.vendor_id] = { field_id: sf.field_id, rate_from: sf.rate_from };
          }
        });
      }

      setVendors((data || []).map(v => ({
        ...v,
        default_category_id: fieldsMap[v.id]?.field_id || null,
        default_rate: fieldsMap[v.id]?.rate_from || null,
      })));
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

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

  // Get grouped fields: parent categories with their children
  const parentFields = vendorFields.filter(f => f.parent_id === null);
  const getChildren = (parentId: string) => vendorFields.filter(f => f.parent_id === parentId);

  // Resolve category name from vendor_fields
  const getCategoryLabel = (category: string | null): string => {
    if (!category) return '-';
    const field = vendorFields.find(f => f.id === category);
    if (field) return field.name_ar;
    return category;
  };

  const loadProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('total_price')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProjectTotalPrice(data?.total_price || 0);
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  };

  // Derived status with overdue detection
  const deriveStatus = (expense: Expense): string => {
    if (expense.status === 'paid') return 'paid';
    if (expense.amount_paid > 0 && expense.amount_paid < expense.amount) return 'partial';
    if (expense.due_date && new Date(expense.due_date) < new Date() && expense.amount_paid === 0) return 'overdue';
    if (expense.status === 'overdue') return 'overdue';
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

  // Summary calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.reduce((sum, e) => sum + e.amount_paid, 0);
  const totalRemaining = expenses.reduce((sum, e) => sum + e.amount_remaining, 0);
  const profit = projectTotalPrice - totalExpenses;
  const margin = projectTotalPrice > 0 ? (profit / projectTotalPrice) * 100 : 0;
  const costRatio = projectTotalPrice > 0 ? (totalExpenses / projectTotalPrice) * 100 : 0;

  const getMarginColor = () => {
    if (totalExpenses > projectTotalPrice) return 'var(--color-danger)';
    if (costRatio > 70) return '#f97316';
    if (costRatio > 50) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Upload invoice file
  const uploadFile = async (file: File): Promise<string | null> => {
    const filePath = `projects/${projectId}/invoices/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('vendor-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('vendor-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  // Remove old file from storage
  const removeOldFile = async (fileUrl: string) => {
    const bucketName = 'vendor-images';
    const urlParts = fileUrl.split(`/storage/v1/object/public/${bucketName}/`);
    if (urlParts.length === 2) {
      const storagePath = decodeURIComponent(urlParts[1]);
      await supabase.storage.from(bucketName).remove([storagePath]);
    }
  };

  // Open add modal
  const openAddModal = () => {
    setEditingExpense(null);
    setExpenseForm({ vendor_id: '', category: '', amount: '', due_date: '', notes: '' });
    setSelectedFile(null);
    setVendorSearch('');
    setVendorDropdownOpen(false);
    setShowExpenseModal(true);
  };

  // Open edit modal
  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      vendor_id: expense.vendor_id,
      category: expense.category || '',
      amount: String(expense.amount),
      due_date: expense.due_date || '',
      notes: expense.notes || '',
    });
    setSelectedFile(null);
    setVendorSearch(vendors.find(v => v.id === expense.vendor_id)?.full_name || '');
    setVendorDropdownOpen(false);
    setShowExpenseModal(true);
  };

  // Open payment modal
  const openPaymentModal = (expense: Expense) => {
    setPaymentExpense(expense);
    setPaymentForm({
      amount: '',
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowPaymentModal(true);
  };

  // Submit expense (add or edit)
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.vendor_id || !expenseForm.amount) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const amount = parseFloat(toEnglishNumbers(expenseForm.amount));
    if (isNaN(amount) || amount <= 0) {
      showError('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (editingExpense && amount < editingExpense.amount_paid) {
      showError(`لا يمكن تقليل المبلغ عن المدفوع (${formatCurrency(editingExpense.amount_paid, currency)})`);
      return;
    }

    setSaving(true);
    try {
      let fileUrl = editingExpense?.invoice_file_url || null;

      // Handle file upload
      if (selectedFile) {
        // Remove old file if replacing
        if (fileUrl) await removeOldFile(fileUrl);
        fileUrl = await uploadFile(selectedFile);
      }

      if (editingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from('vendor_invoices')
          .update({
            category: expenseForm.category || null,
            amount_total: amount,
            amount_remaining: amount - editingExpense.amount_paid,
            due_date: expenseForm.due_date || null,
            notes: expenseForm.notes || null,
            invoice_file_url: fileUrl,
          })
          .eq('id', editingExpense.id);

        if (error) throw error;
        showSuccess('تم تحديث المصروف بنجاح');
      } else {
        // Insert new expense
        const { error } = await supabase
          .from('vendor_invoices')
          .insert({
            vendor_id: expenseForm.vendor_id,
            project_id: projectId,
            category: expenseForm.category || null,
            amount_total: amount,
            amount_remaining: amount,
            due_date: expenseForm.due_date || null,
            notes: expenseForm.notes || null,
            invoice_file_url: fileUrl,
            status: 'pending',
          });

        if (error) throw error;
        showSuccess('تم إضافة المصروف بنجاح');
      }

      setShowExpenseModal(false);
      loadExpenses();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      showError(`حدث خطأ أثناء حفظ المصروف: ${error?.message || error?.code || ''}`);
    } finally {
      setSaving(false);
    }
  };

  // Submit payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentExpense || !paymentForm.amount) return;

    const amount = parseFloat(toEnglishNumbers(paymentForm.amount));
    if (isNaN(amount) || amount <= 0) {
      showError('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (amount > paymentExpense.amount_remaining) {
      showError(`المبلغ يتجاوز المتبقي (${formatCurrency(paymentExpense.amount_remaining, currency)})`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('expense_payments')
        .insert({
          expense_id: paymentExpense.id,
          amount,
          payment_method: paymentForm.payment_method,
          payment_date: paymentForm.payment_date,
          notes: paymentForm.notes || null,
          created_by: user?.id,
        });

      if (error) throw error;
      showSuccess('تم تسجيل الدفعة بنجاح');
      setShowPaymentModal(false);
      loadExpenses();
    } catch (error) {
      console.error('Error recording payment:', error);
      showError('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setSaving(false);
    }
  };

  // Delete expense
  const handleDelete = async (expenseId: string) => {
    try {
      // Remove file from storage if exists
      const expense = expenses.find(e => e.id === expenseId);
      if (expense?.invoice_file_url) {
        await removeOldFile(expense.invoice_file_url);
      }

      const { error } = await supabase
        .from('vendor_invoices')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      showSuccess('تم حذف المصروف بنجاح');
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      showError('حدث خطأ أثناء الحذف');
    } finally {
      setDeleteExpenseId(null);
    }
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
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
        >
          <Plus size={18} />
          إضافة مصروف
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>إجمالي تكاليف الفريق</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
            {formatCurrency(totalExpenses, currency)}
          </p>
        </div>
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>المدفوع</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }} dir="ltr">
            {formatCurrency(totalPaid, currency)}
          </p>
        </div>
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>المتبقي</p>
          <p className="text-2xl font-bold" style={{ color: totalRemaining > 0 ? '#f97316' : 'var(--color-success)' }} dir="ltr">
            {formatCurrency(totalRemaining, currency)}
          </p>
        </div>
      </div>

      {/* Budget vs Actual */}
      {projectTotalPrice > 0 && (
        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>الميزانية مقابل الفعلي</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>إيرادات المشروع</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                {formatCurrency(projectTotalPrice, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>تكاليف الفريق</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                {formatCurrency(totalExpenses, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>الربح المتوقع</p>
              <p className="text-lg font-bold" style={{ color: getMarginColor() }} dir="ltr">
                {formatCurrency(profit, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>نسبة الربح</p>
              <p className="text-lg font-bold" style={{ color: getMarginColor() }} dir="ltr">
                {margin.toFixed(1)}%
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full h-3 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(costRatio, 100)}%`,
                  backgroundColor: getMarginColor(),
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
              {costRatio.toFixed(1)}% من الإيرادات
            </p>
          </div>
        </div>
      )}

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
          <p className="text-lg mb-2">لا توجد مصروفات</p>
          <p className="text-sm">قم بإضافة تكاليف فريق العمل للمشروع</p>
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
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)', width: '32px' }}></th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المورد</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الدور</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المبلغ</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المدفوع</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المتبقي</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الاستحقاق</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>فاتورة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, index) => {
                  const status = deriveStatus(expense);
                  const isExpanded = expandedRows.has(expense.id);
                  return (
                    <>
                      <tr
                        key={expense.id}
                        style={{
                          borderBottom: (isExpanded || index < expenses.length - 1) ? '1px solid var(--color-table-border)' : 'none',
                        }}
                      >
                        {/* Expand toggle */}
                        <td className="px-4 py-3">
                          {expense.payments.length > 0 && (
                            <button
                              onClick={() => toggleRow(expense.id)}
                              className="p-1 rounded hover:bg-black/5 transition-colors"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {expense.vendor_name}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                          {getCategoryLabel(expense.category)}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                          {formatCurrency(expense.amount, currency)}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-success)' }} dir="ltr">
                          {formatCurrency(expense.amount_paid, currency)}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: expense.amount_remaining > 0 ? '#f97316' : 'var(--color-success)' }} dir="ltr">
                          {formatCurrency(expense.amount_remaining, currency)}
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
                        <td className="px-4 py-3">
                          {expense.invoice_file_url ? (
                            <button
                              onClick={() => window.open(expense.invoice_file_url!, '_blank')}
                              className="p-1 rounded transition-colors"
                              style={{ color: 'var(--color-primary)' }}
                              title="عرض الفاتورة"
                            >
                              <FileText size={18} />
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {status !== 'paid' && (
                              <button
                                onClick={() => openPaymentModal(expense)}
                                className="p-1.5 rounded transition-colors hover:bg-black/5"
                                style={{ color: 'var(--color-success)' }}
                                title="تسجيل دفعة"
                              >
                                <CreditCard size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(expense)}
                              className="p-1.5 rounded transition-colors hover:bg-black/5"
                              style={{ color: 'var(--color-primary)' }}
                              title="تعديل"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteExpenseId(expense.id)}
                              className="p-1.5 rounded transition-colors hover:bg-black/5"
                              style={{ color: 'var(--color-danger)' }}
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded payments row */}
                      {isExpanded && (
                        <tr key={`${expense.id}-payments`} style={{ borderBottom: index < expenses.length - 1 ? '1px solid var(--color-table-border)' : 'none' }}>
                          <td colSpan={10} className="px-8 py-3" style={{ backgroundColor: 'var(--color-background-hover)' }}>
                            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                              سجل الدفعات ({expense.payments.length})
                            </p>
                            <table className="w-full">
                              <thead>
                                <tr>
                                  <th className="px-3 py-2 text-right text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>المبلغ</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>طريقة الدفع</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>تاريخ الدفع</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>ملاحظات</th>
                                </tr>
                              </thead>
                              <tbody>
                                {expense.payments.map((payment) => (
                                  <tr key={payment.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                                    <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--color-success)' }} dir="ltr">
                                      {formatCurrency(payment.amount, currency)}
                                    </td>
                                    <td className="px-3 py-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                      {PAYMENT_METHODS[payment.payment_method] || payment.payment_method}
                                    </td>
                                    <td className="px-3 py-2 text-sm" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                                      {formatDateArabic(payment.payment_date)}
                                    </td>
                                    <td className="px-3 py-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                      {payment.notes || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer total */}
          <div className="p-4" style={{ backgroundColor: 'var(--color-primary)' }}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">إجمالي تكاليف الفريق</span>
              <span className="text-xl font-bold text-white" dir="ltr">
                {formatCurrency(totalExpenses, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteExpenseId}
        title="حذف المصروف"
        message="هل أنت متأكد من حذف هذا المصروف؟ سيتم حذف جميع الدفعات المرتبطة. هذا الإجراء لا يمكن التراجع عنه."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        onConfirm={() => deleteExpenseId && handleDelete(deleteExpenseId)}
        onCancel={() => setDeleteExpenseId(null)}
      />

      {/* Add/Edit Expense Modal */}
      {showExpenseModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowExpenseModal(false)}
          title={editingExpense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}
        >
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            {/* Vendor select with search */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                المورد <span className="text-red-500">*</span>
              </label>
              {editingExpense ? (
                <div
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    opacity: 0.6,
                  }}
                >
                  {vendors.find(v => v.id === expenseForm.vendor_id)?.full_name || 'غير معروف'}
                </div>
              ) : (
                <div ref={vendorDropdownRef} className="relative">
                  <div className="relative">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
                    <input
                      type="text"
                      value={vendorSearch}
                      onChange={(e) => { setVendorSearch(e.target.value); setVendorDropdownOpen(true); }}
                      onFocus={() => setVendorDropdownOpen(true)}
                      placeholder="ابحث عن مورد..."
                      className="w-full pr-10 pl-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: expenseForm.vendor_id ? 'var(--color-primary)' : 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    {expenseForm.vendor_id && (
                      <button
                        type="button"
                        onClick={() => { setExpenseForm(prev => ({ ...prev, vendor_id: '', category: '', amount: '' })); setVendorSearch(''); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {vendorDropdownOpen && (
                    <div
                      className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: 240 }}
                    >
                      <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
                        {vendors
                          .filter(v => !vendorSearch || v.full_name.includes(vendorSearch) || (v.primary_field || '').includes(vendorSearch))
                          .map(vendor => (
                            <button
                              key={vendor.id}
                              type="button"
                              onClick={() => handleVendorSelect(vendor.id)}
                              className="w-full text-right px-4 py-2.5 transition-colors flex items-center justify-between"
                              style={{
                                color: expenseForm.vendor_id === vendor.id ? 'var(--color-primary)' : 'var(--color-text-primary)',
                                backgroundColor: expenseForm.vendor_id === vendor.id ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'transparent',
                              }}
                              onMouseEnter={e => { if (expenseForm.vendor_id !== vendor.id) e.currentTarget.style.backgroundColor = 'var(--color-background-hover)'; }}
                              onMouseLeave={e => { if (expenseForm.vendor_id !== vendor.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <span className="font-medium text-sm">{vendor.full_name}</span>
                              {vendor.primary_field && (
                                <span className="text-xs opacity-50">{vendor.primary_field}</span>
                              )}
                            </button>
                          ))}
                        {vendors.filter(v => !vendorSearch || v.full_name.includes(vendorSearch) || (v.primary_field || '').includes(vendorSearch)).length === 0 && (
                          <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>لا توجد نتائج</div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Hidden required input for form validation */}
                  <input type="text" value={expenseForm.vendor_id} required className="sr-only" tabIndex={-1} onChange={() => {}} />
                </div>
              )}
            </div>

            {/* Category select */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                الدور / التصنيف
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">اختر التصنيف</option>
                {parentFields.map((parent) => (
                  <optgroup key={parent.id} label={parent.name_ar}>
                    {getChildren(parent.id).map((child) => (
                      <option key={child.id} value={child.id}>{child.name_ar}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                المبلغ ({currency}) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="0"
                required
                dir="ltr"
              />
              {editingExpense && editingExpense.amount_paid > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  الحد الأدنى: {formatCurrency(editingExpense.amount_paid, currency)} (المبلغ المدفوع)
                </p>
              )}
            </div>

            {/* Due date */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                تاريخ الاستحقاق
              </label>
              <input
                type="date"
                value={expenseForm.due_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                ملاحظات
              </label>
              <textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 resize-none"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                rows={2}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            {/* Invoice file upload */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                فاتورة (PDF)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Upload size={18} />
                {selectedFile ? selectedFile.name : editingExpense?.invoice_file_url ? 'استبدال الملف الحالي' : 'اضغط لاختيار ملف'}
              </button>
              {selectedFile && (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs" style={{ color: 'var(--color-success)' }}>
                    تم اختيار: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                  <button type="button" onClick={() => setSelectedFile(null)} className="text-xs" style={{ color: 'var(--color-danger)' }}>
                    <X size={14} />
                  </button>
                </div>
              )}
              {!selectedFile && editingExpense?.invoice_file_url && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  ملف فاتورة موجود بالفعل
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{ backgroundColor: 'var(--color-background-hover)', color: 'var(--color-text-secondary)' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
              >
                {saving ? 'جاري الحفظ...' : editingExpense ? 'تحديث' : 'حفظ'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && paymentExpense && (
        <Modal
          isOpen={true}
          onClose={() => setShowPaymentModal(false)}
          title="تسجيل دفعة"
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {/* Read-only info */}
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-background-hover)' }}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>المورد: </span>
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{paymentExpense.vendor_name}</span>
                </div>
                <div dir="ltr" className="text-right">
                  <span style={{ color: 'var(--color-text-secondary)' }}>الإجمالي: </span>
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(paymentExpense.amount, currency)}</span>
                </div>
                <div dir="ltr" className="text-right">
                  <span style={{ color: 'var(--color-text-secondary)' }}>المدفوع: </span>
                  <span className="font-medium" style={{ color: 'var(--color-success)' }}>{formatCurrency(paymentExpense.amount_paid, currency)}</span>
                </div>
                <div dir="ltr" className="text-right">
                  <span style={{ color: 'var(--color-text-secondary)' }}>المتبقي: </span>
                  <span className="font-medium" style={{ color: '#f97316' }}>{formatCurrency(paymentExpense.amount_remaining, currency)}</span>
                </div>
              </div>
            </div>

            {/* Payment amount */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                مبلغ الدفعة ({currency}) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder={`الحد الأقصى: ${paymentExpense.amount_remaining}`}
                required
                dir="ltr"
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                طريقة الدفع
              </label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Payment date */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                تاريخ الدفع
              </label>
              <input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                ملاحظات
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 resize-none"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                rows={2}
                placeholder="ملاحظات عن الدفعة..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{ backgroundColor: 'var(--color-background-hover)', color: 'var(--color-text-secondary)' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-success)', color: '#ffffff' }}
              >
                {saving ? 'جاري التسجيل...' : 'تسجيل الدفعة'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
