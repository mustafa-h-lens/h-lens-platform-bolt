import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ShoppingBasket, Eye, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useNotification } from '../../../../contexts/NotificationContext';
import { formatNumber, formatCurrency } from '../../../../lib/formatters';
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
  // Computed from expenses
  consumed_amount: number;
  consumed_qty: number;
}

interface ProjectItemsProps {
  projectId: string;
  currency: string;
}

export const ProjectItems = ({ projectId, currency }: ProjectItemsProps) => {
  const { showError } = useNotification();
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

      // Load items
      const { data: itemsData, error: itemsError } = await supabase
        .from('project_items')
        .select(`
          *,
          item_categories (
            name
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      // Load expenses grouped by project_item_id
      const { data: expenseSums, error: expError } = await supabase
        .from('vendor_invoices')
        .select('project_item_id, amount_total')
        .eq('project_id', projectId)
        .not('project_item_id', 'is', null);

      if (expError) throw expError;

      // Aggregate consumed amounts per item
      const consumedMap: Record<string, { amount: number; count: number }> = {};
      (expenseSums || []).forEach((e: any) => {
        if (!e.project_item_id) return;
        if (!consumedMap[e.project_item_id]) consumedMap[e.project_item_id] = { amount: 0, count: 0 };
        consumedMap[e.project_item_id].amount += e.amount_total || 0;
        consumedMap[e.project_item_id].count += 1;
      });

      const enriched: ProjectItem[] = (itemsData || []).map((item: any) => ({
        ...item,
        consumed_amount: consumedMap[item.id]?.amount || 0,
        consumed_qty: consumedMap[item.id]?.count || 0,
      }));

      setItems(enriched);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item && item.consumed_qty > 0) {
      showError(`لا يمكن حذف هذا البند لأنه مرتبط بـ ${item.consumed_qty} مصروف`);
      return;
    }
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
      showError('حدث خطأ أثناء حذف البند');
    }
  };

  // Totals
  const totalBudget = items.reduce((sum, item) => sum + item.total_price, 0);
  const totalConsumed = items.reduce((sum, item) => sum + item.consumed_amount, 0);
  const totalRemaining = totalBudget - totalConsumed;
  const overallCompletion = totalBudget > 0 ? (totalConsumed / totalBudget) * 100 : 0;

  const getCompletionColor = (pct: number) => {
    if (pct > 100) return 'var(--color-danger)';
    if (pct > 80) return '#f97316';
    if (pct > 50) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  if (loading) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
        >
          <Plus size={18} />
          إضافة بند
        </button>
      </div>

      {items.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ShoppingBasket size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p className="text-lg mb-2">لا توجد بنود في هذا المشروع</p>
          <p className="text-sm">قم بإضافة بنود نطاق العمل للمشروع</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>ميزانية البنود</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                {formatCurrency(totalBudget, currency)}
              </p>
            </div>
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>المصروف</p>
              <p className="text-2xl font-bold" style={{ color: getCompletionColor(overallCompletion) }} dir="ltr">
                {formatCurrency(totalConsumed, currency)}
              </p>
            </div>
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>المتبقي</p>
              <p className="text-2xl font-bold" style={{ color: totalRemaining >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }} dir="ltr">
                {formatCurrency(totalRemaining, currency)}
              </p>
            </div>
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>نسبة الاستهلاك</p>
              <p className="text-2xl font-bold" style={{ color: getCompletionColor(overallCompletion) }} dir="ltr">
                {overallCompletion.toFixed(1)}%
              </p>
              <div className="mt-2">
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(overallCompletion, 100)}%`, backgroundColor: getCompletionColor(overallCompletion) }} />
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
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
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>البند</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>التصنيف</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الكمية</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>سعر الوحدة</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الميزانية</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المصروف</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المتبقي</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الإنجاز</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const remaining = item.total_price - item.consumed_amount;
                    const completionPct = item.total_price > 0 ? (item.consumed_amount / item.total_price) * 100 : 0;
                    return (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid var(--color-table-border)' }}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.name}</span>
                          {item.consumed_qty > 0 && (
                            <span className="text-xs mr-2" style={{ color: 'var(--color-text-muted)' }}>({item.consumed_qty} مصروف)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.item_categories?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                          {formatCurrency(item.unit_price, currency)}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                          {formatCurrency(item.total_price, currency)}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: getCompletionColor(completionPct) }} dir="ltr">
                          {formatCurrency(item.consumed_amount, currency)}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: remaining >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }} dir="ltr">
                          {formatCurrency(remaining, currency)}
                        </td>
                        <td className="px-4 py-3" style={{ minWidth: 100 }}>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(completionPct, 100)}%`, backgroundColor: getCompletionColor(completionPct) }}
                              />
                            </div>
                            <span className="text-xs font-medium" style={{ color: getCompletionColor(completionPct), minWidth: 36, textAlign: 'left' }} dir="ltr">
                              {completionPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingItem(item)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--color-primary)' }}
                              title="عرض"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--color-primary)' }}
                              title="تعديل"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--color-danger)' }}
                              title="حذف"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer total */}
            <div style={{ padding: 16, background: 'var(--color-primary)', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>إجمالي ميزانية البنود</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }} dir="ltr">
                  {formatCurrency(totalBudget, currency)}
                </span>
              </div>
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
          <div className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="sticky top-0 border-b p-6 flex items-center justify-between z-10"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                تفاصيل البند
              </h2>
              <button
                onClick={() => setViewingItem(null)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>اسم البند</label>
                <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>{viewingItem.name}</p>
              </div>

              {viewingItem.item_categories && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>التصنيف</label>
                  <p style={{ color: 'var(--color-text-primary)' }}>{viewingItem.item_categories.name}</p>
                </div>
              )}

              {viewingItem.description && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>الوصف</label>
                  <p className="whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>{viewingItem.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>الكمية</label>
                  <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }} dir="ltr">{formatNumber(viewingItem.quantity)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>سعر الوحدة</label>
                  <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }} dir="ltr">{formatCurrency(viewingItem.unit_price, currency)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>الميزانية</label>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">{formatCurrency(viewingItem.total_price, currency)}</p>
                </div>
              </div>

              {/* Budget tracking in detail view */}
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>تتبع الميزانية</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>المصروف</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">{formatCurrency(viewingItem.consumed_amount, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>المتبقي</p>
                    <p className="text-lg font-bold" style={{ color: (viewingItem.total_price - viewingItem.consumed_amount) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }} dir="ltr">
                      {formatCurrency(viewingItem.total_price - viewingItem.consumed_amount, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>عدد المصروفات</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{viewingItem.consumed_qty}</p>
                  </div>
                </div>
                {viewingItem.total_price > 0 && (
                  <div className="mt-3">
                    <div className="w-full h-3 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                      <div className="h-3 rounded-full transition-all" style={{
                        width: `${Math.min((viewingItem.consumed_amount / viewingItem.total_price) * 100, 100)}%`,
                        backgroundColor: getCompletionColor((viewingItem.consumed_amount / viewingItem.total_price) * 100),
                      }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                      {((viewingItem.consumed_amount / viewingItem.total_price) * 100).toFixed(1)}% مستهلك
                    </p>
                  </div>
                )}
              </div>

              {viewingItem.notes && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>ملاحظات</label>
                  <p className="whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>{viewingItem.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t p-6" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setViewingItem(null)}
                className="w-full px-6 py-3 border rounded-xl transition-colors font-medium"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
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
