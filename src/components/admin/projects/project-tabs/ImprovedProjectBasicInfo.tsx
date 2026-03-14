import { useState, useEffect } from 'react';
import { Save, Edit, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useNotification } from '../../../../contexts/NotificationContext';
import { formatDateArabic, formatCurrency } from '../../../../lib/formatters';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  project_manager_id: string | null;
  internal_notes: string | null;
  project_code: string | null;
  project_mode: 'STANDARD' | 'FRAMEWORK';
  client_id: string;
  total_cost: number | null;
  total_price: number;
  currency: string;
}

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface ImprovedProjectBasicInfoProps {
  project: Project;
  client: Client;
  onUpdate: () => void;
}

const PROJECT_STATUSES = [
  { value: 'request', label: 'طلب' },
  { value: 'quoted', label: 'تم عمل عرض سعر' },
  { value: 'invoiced', label: 'تم إصدار فاتورة' },
  { value: 'po_issued', label: 'تم إصدار أمر شراء' },
  { value: 'partial_paid', label: 'مدفوع جزئياً' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'closed', label: 'مغلق' },
  { value: 'cancelled', label: 'ملغى' },
];

const CURRENCIES = [
  { value: 'SAR', label: 'ر.س (SAR)' },
  { value: 'USD', label: '$ (USD)' },
  { value: 'EUR', label: '€ (EUR)' },
  { value: 'AED', label: 'د.إ (AED)' },
];

export const ImprovedProjectBasicInfo = ({ project, client, onUpdate }: ImprovedProjectBasicInfoProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    project_code: project.project_code || '',
    description: project.description || '',
    project_mode: project.project_mode || 'STANDARD',
    status: project.status,
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    client_id: project.client_id,
    project_manager_id: project.project_manager_id || '',
    internal_notes: project.internal_notes || '',
    total_cost: project.total_cost ?? 0,
    total_price: project.total_price ?? 0,
    currency: project.currency || 'SAR',
  });
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadUsers();
    loadClients();
  }, []);

  useEffect(() => {
    setFormData({
      name: project.name,
      project_code: project.project_code || '',
      description: project.description || '',
      project_mode: project.project_mode || 'STANDARD',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      client_id: project.client_id,
      project_manager_id: project.project_manager_id || '',
      internal_notes: project.internal_notes || '',
      total_cost: project.total_cost ?? 0,
      total_price: project.total_price ?? 0,
      currency: project.currency || 'SAR',
    });
  }, [project]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .order('full_name');
    setUsers(data || []);
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    setClients(data || []);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('الرجاء إدخال اسم المشروع');
      return;
    }
    if (!formData.client_id) {
      showError('الرجاء اختيار العميل');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('projects')
        .update({
          name: formData.name.trim(),
          project_code: formData.project_code.trim() || null,
          description: formData.description.trim() || null,
          project_mode: formData.project_mode,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          client_id: formData.client_id,
          project_manager_id: formData.project_manager_id || null,
          internal_notes: formData.internal_notes.trim() || null,
          total_cost: formData.total_cost,
          total_price: formData.total_price,
          currency: formData.currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (error) throw error;

      showSuccess('تم تحديث البيانات بنجاح');
      setEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating project:', error);
      if (error.code === '23505') {
        showError('اسم المشروع موجود مسبقاً لهذا العميل');
      } else {
        showError('حدث خطأ أثناء التحديث');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: project.name,
      project_code: project.project_code || '',
      description: project.description || '',
      project_mode: project.project_mode || 'STANDARD',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      client_id: project.client_id,
      project_manager_id: project.project_manager_id || '',
      internal_notes: project.internal_notes || '',
      total_cost: project.total_cost ?? 0,
      total_price: project.total_price ?? 0,
      currency: project.currency || 'SAR',
    });
    setEditing(false);
  };

  const getStatusLabel = (value: string) =>
    PROJECT_STATUSES.find(s => s.value === value)?.label || value;

  const getManagerName = (id: string | null) => {
    if (!id) return 'غير محدد';
    return users.find(u => u.id === id)?.full_name || 'غير محدد';
  };

  const getCurrencyLabel = (value: string) =>
    CURRENCIES.find(c => c.value === value)?.label || value;

  const getModeLabel = (mode: string) =>
    mode === 'STANDARD' ? 'مشروع' : 'عقد إطاري';

  const InfoField = ({ label, value, dir }: { label: string; value: string; dir?: string }) => (
    <div>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      <p className="text-sm font-medium" dir={dir} style={{ color: 'var(--color-text-primary)' }}>
        {value || '-'}
      </p>
    </div>
  );

  const inputStyle = {
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <Edit size={16} />
            تعديل
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <X size={16} />
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
              }}
            >
              <Save size={16} />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        )}
      </div>

      <div
        className="p-6 rounded-lg border"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {!editing ? (
          /* ── View Mode ── */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
              <InfoField label="اسم المشروع" value={project.name} />
              <InfoField label="رقم المشروع" value={project.project_code || '-'} />
              <InfoField label="نوع المشروع" value={getModeLabel(project.project_mode)} />
              <InfoField label="العميل" value={client.name} />
              <InfoField label="مدير المشروع" value={getManagerName(project.project_manager_id)} />
              <InfoField label="الحالة" value={getStatusLabel(project.status)} />
              <InfoField label="تاريخ البداية" value={project.start_date ? formatDateArabic(project.start_date) : '-'} />
              <InfoField label="تاريخ الانتهاء المتوقع" value={project.end_date ? formatDateArabic(project.end_date) : '-'} />
              <InfoField label="العملة" value={getCurrencyLabel(project.currency)} />
            </div>

            {/* Financial Info */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>البيانات المالية</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                <InfoField label="التكاليف" value={formatCurrency(project.total_cost ?? 0, project.currency)} dir="ltr" />
                <InfoField label="إجمالي السعر / الميزانية" value={formatCurrency(project.total_price, project.currency)} dir="ltr" />
                <InfoField
                  label="هامش الربح"
                  value={formatCurrency(project.total_price - (project.total_cost ?? 0), project.currency)}
                  dir="ltr"
                />
              </div>
            </div>

            {project.description && (
              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>الوصف</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                  {project.description}
                </p>
              </div>
            )}

            {project.internal_notes && (
              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>ملاحظات داخلية</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                  {project.internal_notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── Edit Mode ── */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  اسم المشروع <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  رقم المشروع
                </label>
                <input
                  type="text"
                  value={formData.project_code}
                  onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={inputStyle}
                  placeholder="PRJ-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  العميل <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="">اختر العميل</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  مدير المشروع
                </label>
                <select
                  value={formData.project_manager_id}
                  onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="">غير محدد</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  نوع المشروع
                </label>
                <select
                  value={formData.project_mode}
                  onChange={(e) => setFormData({ ...formData, project_mode: e.target.value as 'STANDARD' | 'FRAMEWORK' })}
                  className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="STANDARD">مشروع</option>
                  <option value="FRAMEWORK">عقد إطاري</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  الحالة <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  تاريخ الانتهاء المتوقع
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Financial fields */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>البيانات المالية</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    التكاليف
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_cost}
                    onChange={(e) => setFormData({ ...formData, total_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                    style={inputStyle}
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    إجمالي السعر / الميزانية
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_price}
                    onChange={(e) => setFormData({ ...formData, total_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                    style={inputStyle}
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    العملة
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                    style={inputStyle}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={inputStyle}
                placeholder="أضف وصفًا للمشروع..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                ملاحظات داخلية
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={inputStyle}
                placeholder="ملاحظات خاصة بالفريق..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
