import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import type { Client, ClientContact } from '../../../types/database';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { createPortal } from 'react-dom';
import { FileUploader } from '../../ui/FileUploader';

const CONTACT_ROLES = [
  { value: 'مسؤول التواصل', label: 'مسؤول التواصل' },
  { value: 'مدير عام', label: 'مدير عام' },
  { value: 'مدير مشاريع', label: 'مدير مشاريع' },
  { value: 'مدير مالي', label: 'مدير مالي' },
  { value: 'مسؤول مشتريات', label: 'مسؤول مشتريات' },
  { value: 'custom', label: 'أخرى...' },
];

interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface Sector {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

export const ClientModal = ({ client, onClose, onSuccess }: ClientModalProps) => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [sendInvite, setSendInvite] = useState(!client); // Default ON for new clients
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [formData, setFormData] = useState({
    name: '', code: '', email: '', phone: '', address: '', notes: '', client_image: '', website: '', city: '', sector: '',
  });

  useEffect(() => {
    fetchSectors();
  }, []);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '', code: client.code || '', email: client.email || '',
        phone: client.phone || '', address: client.address || '', notes: client.notes || '',
        client_image: (client as any).client_image || '', website: (client as any).website || '',
        city: (client as any).city || '', sector: (client as any).sector || '',
      });
      if ((client as any).client_image) setImagePreview((client as any).client_image);
      setContacts(client.contacts || []);
    }
  }, [client]);

  const fetchSectors = async () => {
    try {
      const { data, error } = await supabase
        .from('sectors')
        .select('id, name_ar, name_en, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  };

  const addContact = () => {
    setContacts([...contacts, { id: crypto.randomUUID(), name: '', phone: '', email: '', role: 'مسؤول التواصل' }]);
  };

  const updateContact = (id: string, field: keyof ClientContact, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleImageSelect = (file: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) { showError('يرجى اختيار صورة بصيغة JPG أو PNG فقط'); return; }
    if (file.size > 3 * 1024 * 1024) { showError('حجم الصورة يجب أن يكون أقل من 3 ميجابايت'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => { setImagePreview(e.target?.result as string); setShowCropModal(true); };
    reader.readAsDataURL(file);
  };

  const cropImage = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const size = Math.min(img.width, img.height);
        canvas.width = 400; canvas.height = 400;
        // Fill white background first so PNG transparency doesn't become black
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 400, 400);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageUrl;
    });
  };

  const handleCropConfirm = async () => {
    if (!imagePreview || !imageFile) return;
    setUploadingImage(true);
    try {
      const croppedImageDataUrl = await cropImage(imagePreview);
      const blob = await (await fetch(croppedImageDataUrl)).blob();
      const fileName = `client-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('vendor-images').upload(fileName, blob, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(fileName);
      setFormData({ ...formData, client_image: publicUrl });
      setImagePreview(publicUrl);
      setShowCropModal(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const validContacts = contacts.filter(c => c.name.trim());
      const payload: Record<string, any> = {
        name: formData.name, code: formData.code || null, email: formData.email.trim() || null,
        phone: formData.phone || null, address: formData.address || null, notes: formData.notes || null,
        client_image: formData.client_image || null, website: formData.website || null,
        city: formData.city || null, sector: formData.sector || null,
        contacts: validContacts.length > 0 ? validContacts : null,
      };
      if (client) {
        const { error } = await supabase.from('clients').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', client.id);
        if (error) throw error;
      } else {
        // Add invitation fields if sending invite
        if (sendInvite && formData.email) {
          payload.invitation_status = 'pending';
          payload.invited_at = new Date().toISOString();
          payload.portal_email = formData.email;
        }
        const { error } = await supabase.from('clients').insert({ ...payload, created_by: user.id });
        if (error) throw error;

        // Send invitation email
        if (sendInvite && formData.email) {
          try {
            const deviceInfo = 'دعوة من لوحة التحكم';
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
              body: JSON.stringify({ email: formData.email, deviceInfo, portal_type: 'client', invite_only: true }),
            });
          } catch (emailErr) {
            console.error('Error sending invitation email:', emailErr);
            // Don't block client creation if email fails
          }
        }
      }
      onSuccess(); onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      showError('حدث خطأ أثناء حفظ بيانات العميل');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <div>
            <div className="modal-ttl">{client ? 'تعديل عميل' : 'إضافة عميل جديد'}</div>
            <div className="modal-sub">أدخل بيانات العميل لإضافته للنظام</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              {/* Logo Upload */}
              <div className="full">
                <FileUploader
                  label="شعار العميل"
                  value={imagePreview || formData.client_image}
                  onChange={(url) => {
                    if (!url) {
                      setImagePreview('');
                      setFormData({ ...formData, client_image: '' });
                    }
                  }}
                  onFile={handleImageSelect}
                  accept="image/jpeg,image/png,image/jpg"
                  maxSizeMB={3}
                  preview="image"
                  uploading={uploadingImage}
                />
              </div>

              {/* Name */}
              <div className="input-group">
                <label className="input-label">اسم الشركة <span className="req">*</span></label>
                <input className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: مجموعة السعودية" />
              </div>

              {/* Website */}
              <div className="input-group">
                <label className="input-label">الموقع الإلكتروني</label>
                <input className="input" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="example.com" dir="ltr" style={{ textAlign: 'right' }} />
              </div>

              {/* Email */}
              <div className="input-group">
                <label className="input-label">البريد الإلكتروني <span className="req">*</span></label>
                <input className="input" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@example.com" dir="ltr" style={{ textAlign: 'right' }} />
              </div>

              {/* Phone */}
              <div className="input-group">
                <label className="input-label">رقم الهاتف</label>
                <input className="input" type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: toEnglishNumbers(e.target.value) })} placeholder="+966 5x xxx xxxx" dir="ltr" style={{ textAlign: 'right' }} />
              </div>

              {/* City */}
              <div className="input-group">
                <label className="input-label">المدينة</label>
                <select className="input select" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })}>
                  <option value="">اختر المدينة</option>
                  <option>الرياض</option><option>جدة</option><option>الدمام</option><option>مكة</option><option>المدينة</option><option>أبها</option>
                </select>
              </div>

              {/* Sector */}
              <div className="input-group">
                <label className="input-label">القطاع</label>
                <select className="input select" value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })}>
                  <option value="">اختر القطاع</option>
                  {sectors.map(sector => <option key={sector.id} value={sector.name_ar}>{sector.name_ar}</option>)}
                </select>
              </div>

              {/* Address */}
              <div className="input-group full">
                <label className="input-label">العنوان</label>
                <input className="input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="العنوان الكامل" />
              </div>

              {/* Notes */}
              <div className="input-group full">
                <label className="input-label">ملاحظات</label>
                <textarea className="input" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية عن العميل..." style={{ minHeight: 80 }} />
              </div>

              {/* Contacts Section */}
              <div className="input-group full contacts-section">
                <div className="contacts-header">
                  <span className="contacts-header-title">جهات الاتصال</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addContact}>
                    <Plus size={13} /> إضافة جهة اتصال
                  </button>
                </div>

                {contacts.map((contact, idx) => (
                  <div key={contact.id} className="contact-card">
                    <div className="contact-card-hdr">
                      <span className="contact-card-title">جهة اتصال {idx + 1}</span>
                      <button type="button" className="contact-remove" onClick={() => removeContact(contact.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="contact-grid">
                      <input className="input" value={contact.name} onChange={e => updateContact(contact.id, 'name', e.target.value)} placeholder="الاسم" />
                      <input className="input" value={contact.phone} onChange={e => updateContact(contact.id, 'phone', toEnglishNumbers(e.target.value))} placeholder="رقم الجوال" dir="ltr" style={{ textAlign: 'right' }} />
                      <input className="input" value={contact.email} onChange={e => updateContact(contact.id, 'email', e.target.value)} placeholder="البريد الإلكتروني" dir="ltr" style={{ textAlign: 'right' }} />
                      <select
                        className="input select"
                        style={{ height: 36, fontSize: 13 }}
                        value={CONTACT_ROLES.some(r => r.value === contact.role) ? contact.role : 'custom'}
                        onChange={e => updateContact(contact.id, 'role', e.target.value === 'custom' ? '' : e.target.value)}
                      >
                        {CONTACT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Invite toggle (new clients only) */}
          {!client && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>دعوة العميل</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>إرسال دعوة عبر البريد الإلكتروني</div>
              </div>
              <button
                type="button"
                onClick={() => setSendInvite(!sendInvite)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: sendInvite ? 'var(--accent)' : 'var(--border-soft)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  right: sendInvite ? 3 : 'auto',
                  left: sendInvite ? 'auto' : 3,
                  transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          )}

          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الحفظ...' : <><Plus size={15} /> {client ? 'تحديث العميل' : (sendInvite ? 'إضافة ودعوة العميل' : 'إضافة العميل')}</>}
            </button>
          </div>
        </form>

        {showCropModal && (
          <div className="modal-overlay show" style={{ zIndex: 210 }} onClick={() => { setShowCropModal(false); setImagePreview(formData.client_image || ''); }}>
            <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="modal-hdr">
                <div className="modal-ttl">معاينة الصورة</div>
                <button className="modal-close" onClick={() => { setShowCropModal(false); setImagePreview(formData.client_image || ''); }}><X size={16} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 200, height: 200, borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '2px solid var(--border-soft)' }}>
                  {imagePreview && <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>سيتم قص الصورة بشكل مربع تلقائياً</p>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCropModal(false); setImagePreview(formData.client_image || ''); }} disabled={uploadingImage}>إلغاء</button>
                <button type="button" className="btn btn-primary" onClick={handleCropConfirm} disabled={uploadingImage}>
                  {uploadingImage ? 'جاري الرفع...' : 'تأكيد'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
