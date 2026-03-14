import { useState, useEffect } from 'react';
import { Plus, Link2, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency } from '../../../../lib/formatters';
import { toEnglishNumbers } from '../../../../lib/numberUtils';
import { Modal } from '../../../shared/Modal';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useAuth } from '../../../../contexts/AuthContext';

interface ProductionTask {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  allocated_amount: number;
  manager_estimated_cost: number | null;
  status: string;
  project_id: string | null;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  remaining_amount: number;
  status: string;
}

interface Allocation {
  id: string;
  po_id: string;
  po_number: string;
  allocated_amount: number;
}

interface ProductionTasksTabProps {
  clientId: string;
}

const TASK_STATUSES = [
  { value: 'quote', label: 'عرض سعر' },
  { value: 'linked_to_po', label: 'مربوطة بأمر شراء' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'ready_to_invoice', label: 'جاهزة للفوترة' },
  { value: 'invoiced', label: 'مفوترة' },
  { value: 'completed', label: 'مكتملة' },
];

export const ProductionTasksTab = ({ clientId }: ProductionTasksTabProps) => {
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [availablePOs, setAvailablePOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
  const [taskAllocations, setTaskAllocations] = useState<Allocation[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    manager_estimated_cost: '',
    project_id: '',
    status: 'quote',
  });
  const [allocationData, setAllocationData] = useState({
    po_id: '',
    allocated_amount: '',
  });
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    loadTasks();
    loadProjects();
    loadAvailablePOs();
  }, [clientId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('production_tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error loading production tasks:', error);
      const errorMessage = error?.message
        ? `خطأ في تحميل المهام الإنتاجية: ${error.message}`
        : 'حدث خطأ أثناء تحميل المهام الإنتاجية';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('client_id', clientId)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error loading projects:', error);
      const errorMessage = error?.message
        ? `خطأ في تحميل المشاريع: ${error.message}`
        : 'حدث خطأ أثناء تحميل المشاريع';
      showError(errorMessage);
    }
  };

  const loadAvailablePOs = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, remaining_amount, status')
        .eq('client_id', clientId)
        .neq('status', 'cancelled')
        .neq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailablePOs(data || []);
    } catch (error: any) {
      console.error('Error loading purchase orders:', error);
      const errorMessage = error?.message
        ? `خطأ في تحميل أوامر الشراء: ${error.message}`
        : 'حدث خطأ أثناء تحميل أوامر الشراء';
      showError(errorMessage);
    }
  };

  const loadTaskAllocations = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_po_allocations')
        .select(`
          id,
          po_id,
          allocated_amount,
          purchase_orders!inner (
            po_number
          )
        `)
        .eq('task_id', taskId);

      if (error) throw error;

      const allocations = data?.map((item: any) => ({
        id: item.id,
        po_id: item.po_id,
        po_number: item.purchase_orders.po_number,
        allocated_amount: item.allocated_amount,
      })) || [];

      setTaskAllocations(allocations);
    } catch (error: any) {
      console.error('Error loading allocations:', error);
      const errorMessage = error?.message
        ? `خطأ في تحميل التخصيصات: ${error.message}`
        : 'حدث خطأ أثناء تحميل التخصيصات';
      showError(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.amount) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const { error } = await supabase.from('production_tasks').insert({
        client_id: clientId,
        name: formData.name,
        description: formData.description || null,
        amount: parseFloat(formData.amount),
        manager_estimated_cost: formData.manager_estimated_cost ? parseFloat(formData.manager_estimated_cost) : null,
        project_id: formData.project_id || null,
        status: formData.status,
        created_by: user?.id,
      });

      if (error) throw error;

      showSuccess('تم إضافة المهمة الإنتاجية بنجاح');
      setShowAddModal(false);
      setFormData({ name: '', description: '', amount: '', manager_estimated_cost: '', project_id: '', status: 'quote' });
      loadTasks();
    } catch (error: any) {
      console.error('Error adding production task:', error);

      let errorMessage = 'حدث خطأ أثناء إضافة المهمة';

      if (error.message) {
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

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTask || !allocationData.po_id || !allocationData.allocated_amount) {
      showError('يرجى ملء جميع الحقول');
      return;
    }

    const allocatedAmount = parseFloat(allocationData.allocated_amount);
    const selectedPO = availablePOs.find(po => po.id === allocationData.po_id);

    if (!selectedPO) {
      showError('أمر الشراء غير موجود');
      return;
    }

    if (selectedPO.status === 'full') {
      showError('أمر الشراء ممتلئ ولا يمكن التخصيص عليه');
      return;
    }

    if (allocatedAmount > selectedPO.remaining_amount) {
      showError(`المبلغ المتبقي في أمر الشراء: ${formatCurrency(selectedPO.remaining_amount, 'SAR')}`);
      return;
    }

    try {
      const { error } = await supabase.from('task_po_allocations').insert({
        task_id: selectedTask.id,
        po_id: allocationData.po_id,
        allocated_amount: allocatedAmount,
      });

      if (error) throw error;

      showSuccess('تم تخصيص المهمة على أمر الشراء بنجاح');
      setAllocationData({ po_id: '', allocated_amount: '' });
      loadTasks();
      loadAvailablePOs();
      loadTaskAllocations(selectedTask.id);

      await supabase
        .from('production_tasks')
        .update({ status: 'linked_to_po' })
        .eq('id', selectedTask.id);
    } catch (error: any) {
      console.error('Error allocating task:', error);

      let errorMessage = 'حدث خطأ أثناء التخصيص';

      if (error.code === '23505') {
        errorMessage = 'المهمة مخصصة على هذا الأمر مسبقًا';
      } else if (error.message) {
        errorMessage = `خطأ: ${error.message}`;
        if (error.details) {
          errorMessage += ` - ${error.details}`;
        }
      }

      showError(errorMessage);
    }
  };

  const handleRemoveAllocation = async (allocationId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء التخصيص؟')) return;

    try {
      const { error } = await supabase
        .from('task_po_allocations')
        .delete()
        .eq('id', allocationId);

      if (error) throw error;

      showSuccess('تم إلغاء التخصيص بنجاح');
      if (selectedTask) {
        loadTaskAllocations(selectedTask.id);
      }
      loadTasks();
      loadAvailablePOs();
    } catch (error: any) {
      console.error('Error removing allocation:', error);
      const errorMessage = error?.message
        ? `خطأ في إلغاء التخصيص: ${error.message}`
        : 'حدث خطأ أثناء إلغاء التخصيص';
      showError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف المهمة؟ سيتم حذف جميع التخصيصات المرتبطة بها.')) return;

    try {
      const { error } = await supabase.from('production_tasks').delete().eq('id', id);

      if (error) throw error;

      showSuccess('تم حذف المهمة بنجاح');
      loadTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);

      let errorMessage = 'حدث خطأ أثناء حذف المهمة';

      if (error.code === '23503') {
        errorMessage = 'لا يمكن حذف المهمة لأنها مرتبطة بسجلات أخرى';
      } else if (error.message) {
        errorMessage = `خطأ: ${error.message}`;
      }

      showError(errorMessage);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      quote: { label: 'عرض سعر', color: 'var(--color-text-primary)', bgColor: 'var(--color-background-hover)' },
      linked_to_po: { label: 'مربوطة بأمر شراء', color: '#ffffff', bgColor: 'var(--color-info)' },
      in_progress: { label: 'قيد التنفيذ', color: '#ffffff', bgColor: 'var(--color-warning)' },
      ready_to_invoice: { label: 'جاهزة للفوترة', color: '#ffffff', bgColor: 'var(--color-primary)' },
      invoiced: { label: 'مفوترة', color: '#ffffff', bgColor: 'var(--color-success)' },
      completed: { label: 'مكتملة', color: '#ffffff', bgColor: 'var(--color-success)' },
    };
    return statusMap[status] || statusMap.quote;
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
          المهام الإنتاجية
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
          مهمة إنتاجية جديدة
        </button>
      </div>

      {tasks.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p className="text-lg mb-2">لا توجد مهام إنتاجية</p>
          <p className="text-sm">قم بإضافة مهمة إنتاجية للبدء</p>
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
          <table className="w-full">
            <thead
              style={{
                backgroundColor: 'var(--color-table-header)',
                borderBottom: '1px solid var(--color-table-border)',
              }}
            >
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  اسم المهمة
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المبلغ
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  التكلفة المتوقعة
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المخصص
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  أوامر الشراء
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => {
                const statusBadge = getStatusBadge(task.status);
                const isFullyAllocated = task.allocated_amount >= task.amount;

                return (
                  <tr
                    key={task.id}
                    style={{
                      borderBottom: index < tasks.length - 1 ? '1px solid var(--color-table-border)' : 'none',
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {task.name}
                      </div>
                      {task.description && (
                        <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                      {formatCurrency(task.amount, 'SAR')}
                    </td>
                    <td className="px-6 py-4">
                      {task.manager_estimated_cost !== null && task.manager_estimated_cost !== undefined ? (
                        <div className="font-semibold" style={{ color: 'var(--color-info)' }} dir="ltr">
                          {formatCurrency(task.manager_estimated_cost, 'SAR')}
                        </div>
                      ) : (
                        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          -
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                        {formatCurrency(task.allocated_amount, 'SAR')}
                      </div>
                      {task.allocated_amount > 0 && (
                        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {toEnglishNumbers(((task.allocated_amount / task.amount) * 100).toFixed(1))}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusBadge.bgColor,
                          color: statusBadge.color,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          loadTaskAllocations(task.id);
                          setShowAllocateModal(true);
                        }}
                        className="flex items-center gap-2 text-sm font-medium transition-colors"
                        style={{ color: isFullyAllocated ? 'var(--color-success)' : 'var(--color-primary)' }}
                      >
                        <Link2 size={16} />
                        {isFullyAllocated ? 'عرض التخصيصات' : 'تعيين إلى أمر شراء'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)} title="مهمة إنتاجية جديدة">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                اسم المهمة *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="اسم المهمة"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="وصف مختصر للمهمة..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                المبلغ (SAR) *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                التكلفة المتوقعة من المدير (SAR)
              </label>
              <input
                type="number"
                value={formData.manager_estimated_cost}
                onChange={(e) => setFormData({ ...formData, manager_estimated_cost: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="0"
                min="0"
                step="0.01"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                التكلفة المتوقعة للمهمة من قبل المدير (اختياري)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                المشروع المرتبط (اختياري)
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">غير مرتبط بمشروع</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                الحالة
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--color-background-hover)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                حفظ
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showAllocateModal && selectedTask && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowAllocateModal(false);
            setSelectedTask(null);
            setTaskAllocations([]);
          }}
          title={`تخصيص المهمة: ${selectedTask.name}`}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-background-hover)' }}>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  المبلغ الكلي
                </div>
                <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                  {formatCurrency(selectedTask.amount, 'SAR')}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  المخصص
                </div>
                <div className="text-sm font-bold" style={{ color: 'var(--color-success)' }} dir="ltr">
                  {formatCurrency(selectedTask.allocated_amount, 'SAR')}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  المتبقي
                </div>
                <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                  {formatCurrency(selectedTask.amount - selectedTask.allocated_amount, 'SAR')}
                </div>
              </div>
            </div>

            {taskAllocations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  التخصيصات الحالية
                </h4>
                <div className="space-y-2">
                  {taskAllocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {allocation.po_number}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }} dir="ltr">
                          {formatCurrency(allocation.allocated_amount, 'SAR')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAllocation(allocation.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTask.allocated_amount < selectedTask.amount && (
              <form onSubmit={handleAllocate} className="space-y-4">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  تخصيص جديد
                </h4>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    اختر أمر الشراء *
                  </label>
                  <select
                    value={allocationData.po_id}
                    onChange={(e) => setAllocationData({ ...allocationData, po_id: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  >
                    <option value="">اختر أمر شراء</option>
                    {availablePOs
                      .filter(po => po.status !== 'full' && po.remaining_amount > 0)
                      .map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.po_number} - متبقي: {formatCurrency(po.remaining_amount, 'SAR')}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    المبلغ المراد تخصيصه (SAR) *
                  </label>
                  <input
                    type="number"
                    value={allocationData.allocated_amount}
                    onChange={(e) => setAllocationData({ ...allocationData, allocated_amount: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    placeholder="0"
                    min="0.01"
                    max={selectedTask.amount - selectedTask.allocated_amount}
                    step="0.01"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                  }}
                >
                  تخصيص
                </button>
              </form>
            )}

            {selectedTask.allocated_amount >= selectedTask.amount && (
              <div
                className="p-4 rounded-lg flex items-center gap-3"
                style={{ backgroundColor: 'var(--color-success)', color: '#ffffff' }}
              >
                <AlertCircle size={20} />
                <span className="text-sm font-medium">تم تخصيص المهمة بالكامل</span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
