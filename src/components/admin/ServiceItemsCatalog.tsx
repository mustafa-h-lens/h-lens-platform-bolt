import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { ServiceItem } from '../../types/database';
import { useNotification } from '../../contexts/NotificationContext';
import { Modal } from '../shared/Modal';

interface ServiceItemsCatalogProps {
  onBack?: () => void;
}

export const ServiceItemsCatalog = ({ onBack }: ServiceItemsCatalogProps) => {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('service_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.item_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البند؟')) return;

    try {
      const { error } = await supabase
        .from('service_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>كاتالوج البنود</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>إدارة البنود والخدمات — أسماء ثنائية اللغة، أسعار، تصنيفات</p>
        </div>
        <button
          className="btn btn-sm"
          onClick={() => { setEditingItem(null); setShowModal(true); }}
          style={{ gap: 6, flexShrink: 0, background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={15} /> إضافة بند
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>
      ) : filteredItems.length === 0 ? (
        <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد بنود</span></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>البند (عربي)</th>
                <th>البند (ENGLISH)</th>
                <th>التصنيف</th>
                <th>السعر</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td><span className="td-primary">{item.name}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.description || '-'}</td>
                  <td>
                    <span className="badge badge-blue">{item.item_number || '-'}</span>
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
                    {item.unit_price.toLocaleString('en-US')} {item.currency}
                  </td>
                  <td>
                    {item.is_active ? (
                      <span className="badge badge-green">
                        <span className="badge-dot" style={{ background: 'var(--success)' }} />
                        نشط
                      </span>
                    ) : (
                      <span className="badge badge-amber">
                        <span className="badge-dot" style={{ background: 'var(--warning)' }} />
                        معلق
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setEditingItem(item); setShowModal(true); }}
                        style={{ color: 'var(--accent-lighter)', padding: 6 }}
                      >
                        <Edit2 size={14} />
                      </button>
                      {item.is_active && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(item.id)}
                          style={{ color: 'var(--danger-text)', padding: 6 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ItemModal
          item={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            loadItems();
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

interface ItemModalProps {
  item: ServiceItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ItemModal = ({ item, onClose, onSuccess }: ItemModalProps) => {
  const { showError } = useNotification();
  const [formData, setFormData] = useState({
    item_number: item?.item_number || '',
    name: item?.name || '',
    description: item?.description || '',
    default_quantity: item?.default_quantity || 1,
    unit_price: item?.unit_price || 0,
    currency: item?.currency || 'ر.س',
    is_active: item?.is_active ?? true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      if (item) {
        const { error } = await supabase
          .from('service_items')
          .update({
            item_number: formData.item_number,
            name: formData.name,
            description: formData.description || null,
            default_quantity: formData.default_quantity,
            unit_price: formData.unit_price,
            currency: formData.currency,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('service_items')
          .insert([{
            ...formData,
            description: formData.description || null,
            created_by: user.id
          }]);

        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving item:', error);
      showError(error.message || 'حدث خطأ أثناء حفظ البند');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={item ? 'تعديل بند' : 'إضافة بند جديد'}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, marginTop: -8 }}>
        {item ? 'تعديل بيانات البند أو الخدمة' : 'أدخل بيانات البند أو الخدمة'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Row 1: Name AR + Name EN */}
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">اسم البند (عربي) <span className="req">*</span></label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: تصوير فوتوغرافي"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">اسم البند (English)</label>
            <input
              type="text"
              className="input"
              value={formData.item_number}
              onChange={(e) => setFormData({ ...formData, item_number: e.target.value })}
              placeholder="e.g. Photography"
              dir="ltr"
            />
          </div>
        </div>

        {/* Row 2: Category + Price */}
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">التصنيف <span className="req">*</span></label>
            <input
              type="text"
              className="input"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              placeholder="اختر التصنيف"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">السعر الافتراضي</label>
            <input
              type="number"
              className="input"
              step="0.01"
              min="0"
              value={formData.unit_price}
              onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
              placeholder="0.00 ر.س"
              dir="ltr"
            />
          </div>
        </div>

        {/* Row 3: Unit + Status */}
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">الوحدة</label>
            <input
              type="number"
              className="input"
              step="0.01"
              min="0"
              value={formData.default_quantity}
              onChange={(e) => setFormData({ ...formData, default_quantity: parseFloat(e.target.value) })}
              placeholder="لكل مشروع"
            />
          </div>

          <div className="input-group">
            <label className="input-label">الحالة</label>
            <select
              className="input"
              value={formData.is_active ? 'active' : 'inactive'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
            >
              <option value="active">نشط</option>
              <option value="inactive">معلق</option>
            </select>
          </div>
        </div>

        {/* Row 4: Description */}
        <div className="input-group">
          <label className="input-label">الوصف</label>
          <textarea
            className="input"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="وصف تفصيلي للبند أو الخدمة.."
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
          <button type="submit" className="btn btn-sm" disabled={loading} style={{ gap: 6, background: 'var(--accent)', color: '#fff' }}>
            {loading ? 'جاري الحفظ...' : (
              <><Plus size={15} /> {item ? 'حفظ التعديلات' : 'إضافة البند'}</>
            )}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
};
