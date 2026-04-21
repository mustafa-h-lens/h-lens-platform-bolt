import { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, TrendingUp, DollarSign, Package, FolderOpen } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency } from '../../../../lib/formatters';
import { Modal } from '../../../shared/Modal';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useAuth } from '../../../../contexts/AuthContext';
import type { PurchaseOrder, TaskPOAllocation, POSettings } from '../../../../types/database';
import {
  calculatePOUsage,
  getPOStatusBadgeColor,
  getPOStatusText,
} from '../../../../lib/poCalculations';

interface POWithDetails extends PurchaseOrder {
  allocations?: TaskPOAllocation[];
  task_count?: number;
  project_count?: number;
}

interface PurchaseOrdersTabEnhancedProps {
  clientId: string;
}

export const PurchaseOrdersTabEnhanced = ({
  clientId,
}: PurchaseOrdersTabEnhancedProps) => {
  const [orders, setOrders] = useState<POWithDetails[]>([]);
  const [settings, setSettings] = useState<POSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<POWithDetails | null>(null);
  const [detailsData, setDetailsData] = useState<{
    projects: any[];
    tasks: any[];
  } | null>(null);
  const [formData, setFormData] = useState({
    po_number: '',
    title: '',
    description: '',
    total_amount: '',
    issue_date: '',
    expiry_date: '',
    notes: '',
  });
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    loadOrders();
    loadSettings();
  }, [clientId]);

  useEffect(() => {
    if (showAddModal && !formData.po_number) {
      supabase.rpc('generate_po_number').then(({ data, error }) => {
        if (data && !error) {
          setFormData(prev => ({ ...prev, po_number: data }));
        } else {
          // Fallback: timestamp-based number so the form never blocks on RPC failure
          const fallback = `PO-${Date.now().toString().slice(-6)}`;
          setFormData(prev => ({ ...prev, po_number: fallback }));
          if (error) console.warn('generate_po_number RPC failed, using fallback:', error);
        }
      });
    }
  }, [showAddModal]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('po_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error loading PO settings:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);

      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: allocationsData, error: allocationsError } = await supabase
        .from('task_po_allocations')
        .select('*, production_tasks!inner(client_id, project_id)')
        .eq('production_tasks.client_id', clientId);

      if (allocationsError) throw allocationsError;

      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (order) => {
          const orderAllocations =
            allocationsData?.filter((a) => a.po_id === order.id) || [];

          const uniqueProjects = new Set(
            orderAllocations
              .map((a: any) => a.production_tasks?.project_id)
              .filter(Boolean)
          );

          return {
            ...order,
            allocations: orderAllocations,
            task_count: orderAllocations.length,
            project_count: uniqueProjects.size,
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error: any) {
      console.error('Error loading purchase orders:', error);
      const errorMessage = error?.message
        ? `خطأ في تحميل أوامر الشراء: ${error.message}`
        : 'حدث خطأ أثناء تحميل أوامر الشراء';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.po_number || !formData.title || !formData.total_amount) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('purchase_orders').insert({
        client_id: clientId,
        po_number: formData.po_number,
        title: formData.title,
        description: formData.description || null,
        total_amount: parseFloat(formData.total_amount),
        currency: 'SAR',
        issue_date: formData.issue_date || new Date().toISOString().split('T')[0],
        expiry_date: formData.expiry_date || null,
        status: 'active',
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      showSuccess('تم إضافة أمر الشراء بنجاح');
      setShowAddModal(false);
      setFormData({
        po_number: '',
        title: '',
        description: '',
        total_amount: '',
        issue_date: '',
        expiry_date: '',
        notes: '',
      });
      loadOrders();
    } catch (error: any) {
      console.error('Error adding purchase order:', error);

      let errorMessage = 'حدث خطأ أثناء إضافة أمر الشراء';

      if (error.code === '23505') {
        errorMessage = 'رقم أمر الشراء موجود مسبقاً. يرجى استخدام رقم مختلف';
      } else if (error.message) {
        errorMessage = `خطأ: ${error.message}`;
        if (error.details) {
          errorMessage += ` - ${error.details}`;
        }
        if (error.hint) {
          errorMessage += ` (${error.hint})`;
        }
      }

      showError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف أمر الشراء؟ سيتم حذف جميع التخصيصات المرتبطة به.')) {
      return;
    }

    try {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);

      if (error) throw error;

      showSuccess('تم حذف أمر الشراء بنجاح');
      loadOrders();
    } catch (error: any) {
      console.error('Error deleting purchase order:', error);

      let errorMessage = 'حدث خطأ أثناء حذف أمر الشراء';

      if (error.code === '23503') {
        errorMessage = 'لا يمكن حذف أمر الشراء لأنه مرتبط بمهام إنتاجية';
      } else if (error.message) {
        errorMessage = `خطأ: ${error.message}`;
      }

      showError(errorMessage);
    }
  };

  const handleViewDetails = async (order: POWithDetails) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('production_tasks')
        .select('*, task_po_allocations!inner(allocated_amount, po_id)')
        .eq('task_po_allocations.po_id', order.id)
        .eq('client_id', clientId);

      if (tasksError) throw tasksError;

      const projectIds = [
        ...new Set(tasksData?.map((t) => t.project_id).filter(Boolean)),
      ];

      let projectsData: any[] = [];
      if (projectIds.length > 0) {
        const { data, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds);
        if (projectsError) throw projectsError;
        projectsData = data || [];
      }

      const projectsWithTasks = (projectsData || []).map((project) => {
        const projectTasks = tasksData?.filter((t) => t.project_id === project.id) || [];
        const totalAllocated = projectTasks.reduce(
          (sum: number, t: any) =>
            sum +
            (t.task_po_allocations?.reduce(
              (s: number, a: any) => s + (a.allocated_amount || 0),
              0
            ) || 0),
          0
        );

        return {
          ...project,
          task_count: projectTasks.length,
          total_allocated: totalAllocated,
        };
      });

      setDetailsData({
        projects: projectsWithTasks,
        tasks: tasksData || [],
      });
    } catch (error: any) {
      console.error('Error loading PO details:', error);
      const errorMessage = error?.message
        ? `خطأ في تحميل التفاصيل: ${error.message}`
        : 'حدث خطأ أثناء تحميل التفاصيل';
      showError(errorMessage);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'var(--color-danger)';
    if (percentage >= (settings?.warning_threshold || 80))
      return 'var(--color-warning)';
    return 'var(--color-success)';
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          أوامر الشراء
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          <Plus size={18} />
          <span>إضافة أمر شراء</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: 'var(--color-background-hover)' }}
        >
          <Package
            size={48}
            style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>لا توجد أوامر شراء</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const calculation = calculatePOUsage(
              order,
              order.allocations || [],
              settings || undefined
            );
            const statusBadge = getPOStatusBadgeColor(calculation.status);

            return (
              <div
                key={order.id}
                className="p-6 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className="text-lg font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {order.title}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.text,
                        }}
                      >
                        {getPOStatusText(calculation.status)}
                      </span>
                    </div>
                    <p
                      className="text-sm mb-1"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      رقم الأمر: {order.po_number}
                    </p>
                    {order.description && (
                      <p
                        className="text-sm"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {order.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="p-2 rounded-lg transition-all"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="p-2 rounded-lg transition-all"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      القيمة الإجمالية
                    </p>
                    <p
                      className="text-lg font-bold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {formatCurrency(order.total_amount)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      المستخدم
                    </p>
                    <p
                      className="text-lg font-bold"
                      style={{ color: 'var(--color-warning)' }}
                    >
                      {formatCurrency(calculation.usedAmount)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      المتبقي
                    </p>
                    <p
                      className="text-lg font-bold"
                      style={{ color: 'var(--color-success)' }}
                    >
                      {formatCurrency(calculation.remainingAmount)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      نسبة الاستخدام
                    </p>
                    <p
                      className="text-lg font-bold"
                      style={{ color: getProgressColor(calculation.usagePercentage) }}
                    >
                      {calculation.usagePercentage.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div
                  className="w-full h-2 rounded-full mb-4"
                  style={{ backgroundColor: 'var(--color-background-hover)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, calculation.usagePercentage)}%`,
                      backgroundColor: getProgressColor(calculation.usagePercentage),
                    }}
                  />
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Package
                      size={16}
                      style={{ color: 'var(--color-text-muted)' }}
                    />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {order.task_count || 0} مهمة
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderOpen
                      size={16}
                      style={{ color: 'var(--color-text-muted)' }}
                    />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {order.project_count || 0} مشروع
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="إضافة أمر شراء جديد"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--color-surface)',
                border: '1px dashed var(--color-border)',
              }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                رقم أمر الشراء
              </span>
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: '#60a5fa',
                  background: 'rgba(96, 165, 250, 0.12)',
                  border: '1px solid rgba(96, 165, 250, 0.3)',
                  padding: '4px 10px',
                  borderRadius: 8,
                }}
                dir="ltr"
              >
                {formData.po_number || 'جاري التوليد…'}
              </span>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                عنوان أمر الشراء <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="مثال: أمر شراء معدات 2024"
                required
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                rows={3}
                placeholder="وصف اختياري..."
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                القيمة الإجمالية (ريال) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) =>
                  setFormData({ ...formData, total_amount: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  تاريخ الإصدار
                </label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) =>
                    setFormData({ ...formData, issue_date: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  تاريخ الانتهاء
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expiry_date: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ملاحظات
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                rows={3}
                placeholder="ملاحظات اختيارية..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium border"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showDetailsModal && selectedOrder && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={`تفاصيل ${selectedOrder.title}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {detailsData && (
              <>
                <div>
                  <h3
                    className="text-lg font-bold mb-4"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    المشاريع المغطاة ({detailsData.projects.length})
                  </h3>
                  <div className="space-y-2">
                    {detailsData.projects.map((project) => (
                      <div
                        key={project.id}
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-background-hover)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <div className="flex justify-between">
                          <div>
                            <p
                              className="font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {project.name}
                            </p>
                            <p
                              className="text-sm"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              {project.task_count} مهام
                            </p>
                          </div>
                          <p
                            className="text-lg font-bold"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {formatCurrency(project.total_allocated)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3
                    className="text-lg font-bold mb-4"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    المهام الإنتاجية ({detailsData.tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {detailsData.tasks.map((task) => {
                      const taskAllocation = task.task_po_allocations?.[0]?.allocated_amount || 0;
                      return (
                        <div
                          key={task.id}
                          className="p-4 rounded-lg border"
                          style={{
                            backgroundColor: 'var(--color-background-hover)',
                            borderColor: 'var(--color-border)',
                          }}
                        >
                          <div className="flex justify-between">
                            <p
                              className="font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {task.task_name}
                            </p>
                            <p
                              className="font-bold"
                              style={{ color: 'var(--color-success)' }}
                            >
                              {formatCurrency(taskAllocation)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
