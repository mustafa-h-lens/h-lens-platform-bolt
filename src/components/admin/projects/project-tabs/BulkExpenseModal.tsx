import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Modal } from '../../../shared/Modal';
import { supabase } from '../../../../lib/supabaseClient';
import { useNotification } from '../../../../contexts/NotificationContext';
import { toEnglishNumbers } from '../../../../lib/numberUtils';
import { formatCurrency } from '../../../../lib/formatters';
import type { VendorField } from '../../../../types/database';

interface Vendor {
  id: string;
  full_name: string;
  primary_field: string | null;
  default_category_id?: string | null;
  default_rate?: number | null;
}

interface BulkExpenseRow {
  key: string;
  vendor_id: string;
  category: string;
  project_item_id: string;
  amount: string;
  notes: string;
}

interface ProjectItem {
  id: string;
  name: string;
  total_price: number;
}

interface BulkExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  currency: string;
  vendors: Vendor[];
  vendorFields: VendorField[];
  projectItems?: ProjectItem[];
}

const emptyRow = (): BulkExpenseRow => ({
  key: crypto.randomUUID(),
  vendor_id: '',
  category: '',
  project_item_id: '',
  amount: '',
  notes: '',
});

export const BulkExpenseModal = ({ isOpen, onClose, onSuccess, projectId, currency, vendors, vendorFields, projectItems = [] }: BulkExpenseModalProps) => {
  const { showSuccess, showError } = useNotification();
  const [rows, setRows] = useState<BulkExpenseRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows([...rows, emptyRow()]);

  const removeRow = (key: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter(r => r.key !== key));
  };

  const updateRow = (key: string, field: keyof BulkExpenseRow, value: string) => {
    setRows(rows.map(r => r.key === key ? { ...r, [field]: value } : r));
  };

  const validRows = rows.filter(r => r.vendor_id && r.amount && parseFloat(toEnglishNumbers(r.amount)) > 0);

  const totalAmount = validRows.reduce((sum, r) => {
    const amt = parseFloat(toEnglishNumbers(r.amount));
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const handleSubmit = async () => {
    if (validRows.length === 0) {
      showError('يرجى إدخال مصروف واحد على الأقل (مورد + مبلغ)');
      return;
    }

    setSaving(true);
    try {
      const insertData = validRows.map(r => ({
        expense_type: 'vendor',
        vendor_id: r.vendor_id,
        project_id: projectId,
        category: r.category || null,
        project_item_id: r.project_item_id || null,
        amount_total: parseFloat(toEnglishNumbers(r.amount)),
        amount_remaining: parseFloat(toEnglishNumbers(r.amount)),
        notes: r.notes || null,
        status: 'pending',
      }));

      const { error } = await supabase
        .from('vendor_invoices')
        .insert(insertData);

      if (error) throw error;

      showSuccess(`تم إضافة ${validRows.length} مصروف بنجاح`);
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Bulk expense error:', error);
      showError(`حدث خطأ أثناء الإضافة: ${error?.message || ''}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة مصاريف بالجملة" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          أضف عدة مصاريف دفعة واحدة. يجب تحديد المورد والمبلغ لكل صف.
        </p>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '23%' }}>المورد *</th>
                <th style={{ ...thStyle, width: '19%' }}>التصنيف</th>
                {projectItems.length > 0 && (
                  <th style={{ ...thStyle, width: '19%' }}>البند</th>
                )}
                <th style={{ ...thStyle, width: '15%' }}>المبلغ *</th>
                <th style={{ ...thStyle, width: '19%' }}>ملاحظات</th>
                <th style={{ ...thStyle, width: '5%' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.key}>
                  <td style={tdStyle}>
                    <select
                      className="input select"
                      value={row.vendor_id}
                      onChange={e => updateRow(row.key, 'vendor_id', e.target.value)}
                      style={{ fontSize: 12, height: 36 }}
                    >
                      <option value="">اختر المورد</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.full_name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <select
                      className="input select"
                      value={row.category}
                      onChange={e => updateRow(row.key, 'category', e.target.value)}
                      style={{ fontSize: 12, height: 36 }}
                    >
                      <option value="">بدون تصنيف</option>
                      {vendorFields.map(f => (
                        <option key={f.id} value={f.id}>{f.name_ar}</option>
                      ))}
                    </select>
                  </td>
                  {projectItems.length > 0 && (
                    <td style={tdStyle}>
                      <select
                        className="input select"
                        value={row.project_item_id}
                        onChange={e => updateRow(row.key, 'project_item_id', e.target.value)}
                        style={{ fontSize: 12, height: 36 }}
                      >
                        <option value="">بدون بند</option>
                        {projectItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td style={tdStyle}>
                    <input
                      className="input"
                      type="text"
                      inputMode="decimal"
                      value={row.amount}
                      onChange={e => updateRow(row.key, 'amount', toEnglishNumbers(e.target.value))}
                      placeholder="0"
                      dir="ltr"
                      style={{ fontSize: 12, height: 36, textAlign: 'right' }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      className="input"
                      type="text"
                      value={row.notes}
                      onChange={e => updateRow(row.key, 'notes', e.target.value)}
                      placeholder="اختياري"
                      style={{ fontSize: 12, height: 36 }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length <= 1}
                      style={{ color: 'var(--danger-text)', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} style={{ alignSelf: 'flex-start', gap: 6 }}>
          <Plus size={14} /> إضافة صف
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong>{validRows.length}</strong> مصروف · الإجمالي: <strong>{formatCurrency(totalAmount, currency)}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving || validRows.length === 0}
            >
              {saving ? 'جاري الحفظ...' : `إضافة ${validRows.length} مصروف`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const thStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  padding: '8px 4px',
  textAlign: 'right',
  borderBottom: '1px solid var(--border-soft)',
};

const tdStyle: React.CSSProperties = {
  padding: '4px',
  verticalAlign: 'middle',
};
