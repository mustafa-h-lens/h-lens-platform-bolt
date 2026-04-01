import { useState, useEffect, useRef } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { Modal } from '../../shared/Modal';
import { ClientModal } from '../clients/ClientModal';

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preSelectedClientId?: string;
  preSelectedClientName?: string;
  onProjectCreated?: () => void;
}

export const CreateProjectModal = ({ onClose, onSuccess, preSelectedClientId, preSelectedClientName, onProjectCreated }: CreateProjectModalProps) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    client_id: preSelectedClientId || '',
    name: '',
    description: '',
    project_mode: 'STANDARD',
    status: 'pending',
    start_date: '',
    end_date: '',
    project_manager_id: '',
    total_cost: '',
    total_price: '',
    currency: 'SAR',
  });

  useEffect(() => {
    loadClients();
    loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
    };
    if (clientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [clientDropdownOpen]);

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    setClients(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .in('role', ['project_manager', 'super_admin'])
      .eq('is_active', true)
      .order('full_name');
    setUsers(data || []);
  };

  const handleClientSelect = (clientId: string) => {
    setFormData({ ...formData, client_id: clientId });
    setClientDropdownOpen(false);
    setClientSearch('');
  };

  const handleClientCreated = async () => {
    // Reload clients and close the modal
    await loadClients();
    setShowClientModal(false);
    // The newly created client should be auto-selected
    // We'll handle this in the ClientModal's onSuccess callback
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id || !formData.name) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('projects').insert({
        client_id: formData.client_id,
        name: formData.name,
        description: formData.description || null,
        project_mode: formData.project_mode,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        project_manager_id: formData.project_manager_id || null,
        total_cost: parseFloat(formData.total_cost) || 0,
        total_price: parseFloat(formData.total_price) || 0,
        currency: formData.currency,
        created_by: user!.id,
      });

      if (error) throw error;

      showSuccess('تم إنشاء المشروع بنجاح');
      onProjectCreated?.();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating project:', error);

      let errorMessage = 'حدث خطأ أثناء إنشاء المشروع';

      if (error.code === '23505') {
        errorMessage = 'اسم المشروع موجود مسبقاً لهذا العميل';
      } else if (error.code === '23503') {
        errorMessage = 'العميل أو مدير المشروع المحدد غير موجود';
      } else if (error.code === '22007') {
        errorMessage = 'تنسيق التاريخ غير صحيح. يرجى التحقق من التواريخ المدخلة';
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="مشروع جديد" maxWidth="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Searchable Client Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              العميل <span className="text-red-500">*</span>
            </label>
            <div ref={clientDropdownRef} className="relative">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  value={clientSearch || (formData.client_id && clients.find(c => c.id === formData.client_id)?.name) || ''}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setClientDropdownOpen(true);
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                  placeholder="ابحث عن عميل..."
                  className="w-full pr-10 pl-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: formData.client_id ? 'var(--color-primary)' : 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  required
                />
                {formData.client_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, client_id: '' });
                      setClientSearch('');
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {clientDropdownOpen && (
                <div
                  className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    maxHeight: 240,
                  }}
                >
                  <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
                    {(() => {
                      const filtered = clients.filter(
                        c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())
                      );

                      if (filtered.length === 0) {
                        return (
                          <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                            لا توجد نتائج
                          </div>
                        );
                      }

                      return filtered.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleClientSelect(client.id)}
                          className="w-full text-right px-4 py-2.5 transition-colors"
                          style={{
                            color: formData.client_id === client.id ? 'var(--color-primary)' : 'var(--color-text-primary)',
                            backgroundColor:
                              formData.client_id === client.id
                                ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
                                : 'transparent',
                          }}
                          onMouseEnter={e => {
                            if (formData.client_id !== client.id) {
                              e.currentTarget.style.backgroundColor = 'var(--color-background-hover)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (formData.client_id !== client.id) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <span className="font-medium text-sm">{client.name}</span>
                        </button>
                      ));
                    })()}
                  </div>

                  {/* Add new client button */}
                  <div
                    className="border-t p-2"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowClientModal(true)}
                      className="w-full flex items-center justify-end gap-2 px-3 py-2 rounded text-sm font-medium transition-all"
                      style={{
                        color: 'var(--color-primary)',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <Plus size={14} />
                      عميل جديد
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">اسم المشروع</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">نوع المشروع</label>
            <select
              value={formData.project_mode}
              onChange={(e) => setFormData({ ...formData, project_mode: e.target.value as 'STANDARD' | 'FRAMEWORK' | 'CONTRACT' })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="STANDARD">مشروع (Standard Project)</option>
              <option value="FRAMEWORK">عقد إطاري (Framework Contract)</option>
              <option value="CONTRACT">عقد (Contract)</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {formData.project_mode === 'STANDARD'
                ? 'مشروع محدد بنطاق واضح يحتوي على بنود ومهام'
                : formData.project_mode === 'CONTRACT'
                ? 'عقد بمبلغ ثابت ونطاق محدد بدون بنود تفصيلية'
                : 'عقد تشغيل مستمر يعتمد على أوامر شراء بدون بنود'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">مدير المشروع</label>
            <select
              value={formData.project_manager_id}
              onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">لا يوجد مدير</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ البدء</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ الانتهاء</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">السعر</label>
              <input
                type="number"
                step="0.01"
                value={formData.total_price}
                onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء المشروع'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 rounded-lg transition-colors"
            >
              إلغاء
            </button>
        </div>
      </form>
    </Modal>

    {showClientModal && (
      <ClientModal
        client={null}
        onClose={() => setShowClientModal(false)}
        onSuccess={async () => {
          await loadClients();
          const newClients = await supabase
            .from('clients')
            .select('id, name')
            .order('name');
          if (newClients.data && newClients.data.length > 0) {
            const latestClient = newClients.data[newClients.data.length - 1];
            setFormData({ ...formData, client_id: latestClient.id });
            setClientSearch('');
            setShowClientModal(false);
          }
        }}
      />
    )}
    </>
  );
};
