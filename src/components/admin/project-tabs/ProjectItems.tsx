import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ShoppingBasket, Eye, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatNumber, formatCurrency } from '../../../lib/formatters';
import { AddItemModal } from '../AddItemModal';

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  category_id: string | null;
  notes: string | null;
  created_at: string;
  item_categories?: {
    name: string;
  } | null;
}

interface ProjectItemsProps {
  projectId: string;
  currency: string;
}

export const ProjectItems = ({ projectId, currency }: ProjectItemsProps) => {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null);
  const [viewingItem, setViewingItem] = useState<ProjectItem | null>(null);

  useEffect(() => {
    loadItems();
  }, [projectId]);

  const loadItems = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('project_items')
        .select(`
          *,
          item_categories (
            name
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البند؟')) return;

    try {
      const { error } = await supabase
        .from('project_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('حدث خطأ أثناء حذف البند');
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  if (loading) {
    return (
      <div className="text-center text-slate-600 py-8">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#0A2A66]/10 to-[#1B4FA9]/10
            border border-[#0A2A66]/20">
            <ShoppingBasket className="w-5 h-5 text-[#0A2A66]" />
          </div>
          بنود المشروع
        </h2>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
            text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة بند</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700
            flex items-center justify-center">
            <ShoppingBasket className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">لا توجد بنود في هذا المشروع</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-dark-border">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">الاسم</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">التصنيف</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">
                      <span dir="ltr">الكمية</span>
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">
                      <span dir="ltr">السعر</span>
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">
                      <span dir="ltr">الإجمالي</span>
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-100 font-medium">{item.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                        {item.item_categories?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300" dir="ltr">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300" dir="ltr">
                        {formatCurrency(item.unit_price, currency)}
                      </td>
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-100 font-bold" dir="ltr">
                        {formatCurrency(item.total_price, currency)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingItem(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="عرض"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-2 text-[#0A2A66] hover:bg-[#0A2A66]/10 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
            rounded-2xl border border-[#0A2A66]/20 p-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">إجمالي قيمة المشروع</span>
              <span className="text-2xl font-bold text-white" dir="ltr">
                {formatCurrency(calculateTotal(), currency)}
              </span>
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <AddItemModal
          projectId={projectId}
          currency={currency}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadItems}
        />
      )}

      {editingItem && (
        <AddItemModal
          projectId={projectId}
          currency={currency}
          editItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={loadItems}
        />
      )}

      {viewingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                تفاصيل البند
              </h2>
              <button
                onClick={() => setViewingItem(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  اسم البند
                </label>
                <p className="text-lg font-medium text-slate-800 dark:text-slate-100">
                  {viewingItem.name}
                </p>
              </div>

              {viewingItem.item_categories && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    التصنيف
                  </label>
                  <p className="text-slate-800 dark:text-slate-100">
                    {viewingItem.item_categories.name}
                  </p>
                </div>
              )}

              {viewingItem.description && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    الوصف
                  </label>
                  <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                    {viewingItem.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    الكمية
                  </label>
                  <p className="text-lg font-medium text-slate-800 dark:text-slate-100" dir="ltr">
                    {formatNumber(viewingItem.quantity)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    السعر
                  </label>
                  <p className="text-lg font-medium text-slate-800 dark:text-slate-100" dir="ltr">
                    {formatCurrency(viewingItem.unit_price, currency)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    الإجمالي
                  </label>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                    {formatCurrency(viewingItem.total_price, currency)}
                  </p>
                </div>
              </div>

              {viewingItem.notes && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    ملاحظات
                  </label>
                  <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                    {viewingItem.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 p-6">
              <button
                onClick={() => setViewingItem(null)}
                className="w-full px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700
                  dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl
                  transition-colors font-medium"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
