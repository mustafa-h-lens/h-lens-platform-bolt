import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { formatCurrency } from '../../../lib/formatters';
import { Modal } from '../../shared/Modal';

interface ItemCategory {
  id: string;
  name: string;
}

interface AddItemModalProps {
  projectId: string;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: {
    id: string;
    name: string;
    category_id: string | null;
    description: string | null;
    unit_price: number;
    quantity: number;
    notes: string | null;
  } | null;
}

export const AddItemModal = ({ projectId, currency, onClose, onSuccess, editItem }: AddItemModalProps) => {
  const { showError } = useNotification();
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: editItem?.name || '',
    category_id: editItem?.category_id || '',
    description: editItem?.description || '',
    unit_price: editItem?.unit_price || 0,
    quantity: editItem?.quantity || 1,
    notes: editItem?.notes || '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('item_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setCategories(data || []);
  };

  const calculateTotal = () => {
    return formData.unit_price * formData.quantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('الرجاء إدخال اسم البند');
      return;
    }

    if (formData.unit_price <= 0) {
      showError('الرجاء إدخال سعر صحيح');
      return;
    }

    if (formData.quantity <= 0) {
      showError('الرجاء إدخال كمية صحيحة');
      return;
    }

    try {
      setSaving(true);

      const itemData = {
        project_id: projectId,
        name: formData.name.trim(),
        category_id: formData.category_id || null,
        description: formData.description.trim() || null,
        unit_price: formData.unit_price,
        quantity: formData.quantity,
        notes: formData.notes.trim() || null,
        currency,
      };

      if (editItem) {
        const { error } = await supabase
          .from('project_items')
          .update(itemData)
          .eq('id', editItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_items')
          .insert(itemData);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      showError('حدث خطأ أثناء حفظ البند');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={editItem ? 'تعديل البند' : 'إضافة بند جديد'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              اسم البند <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: تطوير موقع إلكتروني"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              التصنيف
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">بدون تصنيف</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              الوصف
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="وصف تفصيلي للبند..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                السعر ({currency}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                الكمية <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
                required
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800
            rounded-xl p-4 border border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                الإجمالي
              </span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                {formatCurrency(calculateTotal(), currency)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? 'جاري الحفظ...' : editItem ? 'حفظ التعديلات' : 'حفظ البند'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700
                dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl
                transition-colors font-medium"
            >
              إلغاء
            </button>
        </div>
      </form>
    </Modal>
  );
};
