import { useState, useEffect } from 'react';
import { Camera, Lightbulb, Plus, X, CheckCircle, Trash2, Hash, ChevronLeft, Pencil, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { useNotification } from '../../contexts/NotificationContext';
import { FieldLabel, TextInput, SelectInput, EmptyState, LoadingSpinner } from './shared';
import type { Equipment, CatalogItem } from './shared/types';
import { ConfirmationModal } from '../shared/ConfirmationModal';

interface EqCategory { id: string; name: string; }
interface EqBrand { id: string; name: string; }

export function VendorEquipment() {
  const { vendor } = useVendor();
  const { showSuccess, showError } = useNotification();

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<EqCategory[]>([]);
  const [brands, setBrands] = useState<EqBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  // 3-step selection state
  const [selCategory, setSelCategory] = useState('');
  const [selBrand, setSelBrand] = useState('');
  const [selItem, setSelItem] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newSerial, setNewSerial] = useState('');

  // Suggest form
  const [suggForm, setSuggForm] = useState({ name: '', category: '', brand: '' });
  const [suggSent, setSuggSent] = useState(false);

  // Edit equipment
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 1, serial_number: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (eq: Equipment) => {
    setEditingId(eq.id);
    setEditForm({ quantity: eq.quantity, serial_number: (eq as any).serial_number || '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('vendor_equipment').update({
        quantity: editForm.quantity, serial_number: editForm.serial_number || null,
      }).eq('id', editingId);
      if (error) throw error;
      showSuccess('تم تحديث المعدة');
      setEditingId(null);
      await fetchEquipment();
    } catch { showError('حدث خطأ أثناء التحديث'); }
    finally { setSavingEdit(false); }
  };

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; equipmentId: string | null }>({
    isOpen: false,
    equipmentId: null,
  });

  useEffect(() => { if (vendor?.id) { fetchEquipment(); fetchCatalog(); fetchCategories(); fetchBrands(); } }, [vendor?.id]);

  const fetchEquipment = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vendor_equipment')
      .select('*, equipment_catalog(name, image_url, equipment_categories(name), equipment_brands(name))')
      .eq('vendor_id', vendor!.id)
      .order('created_at', { ascending: false });
    if (data) setEquipment(data);
    setLoading(false);
  };

  const fetchCatalog = async () => {
    const { data } = await supabase
      .from('equipment_catalog')
      .select('id, name, name_en, image_url, category_id, brand_id, equipment_categories(name), equipment_brands(name)')
      .eq('is_active', true).order('name');
    if (data) setCatalog(data as any);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('equipment_categories').select('id, name').eq('is_active', true).order('name');
    if (data) setCategories(data);
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from('equipment_brands').select('id, name').eq('is_active', true).order('name');
    if (data) setBrands(data);
  };

  // Filtered options based on selection
  const filteredBrands = selCategory
    ? brands.filter(b => catalog.some(c => (c as any).category_id === selCategory && (c as any).brand_id === b.id))
    : brands;

  const filteredItems = catalog.filter(c => {
    if (!selCategory) return true;
    if ((c as any).category_id !== selCategory) return false;
    if (selBrand && (c as any).brand_id !== selBrand) return false;
    return true;
  }).filter(c => !equipment.find(e => e.catalog_item_id === c.id));

  const resetAddForm = () => {
    setSelCategory(''); setSelBrand(''); setSelItem('');
    setNewQuantity(1); setNewSerial('');
  };

  const addEquipment = async () => {
    if (!selItem) { showError('اختر المعدة أولاً'); return; }
    try {
      const catalogItem = catalog.find(c => c.id === selItem);
      const { error } = await supabase.from('vendor_equipment').insert({
        vendor_id: vendor!.id, catalog_item_id: selItem,
        name: catalogItem?.name || '', type: catalogItem?.equipment_categories?.name || '',
        quantity: newQuantity, serial_number: newSerial || null,
      });
      if (error) throw error;
      showSuccess('تمت إضافة المعدة');
      setAdding(false); resetAddForm();
      await fetchEquipment();
    } catch { showError('حدث خطأ أثناء الإضافة'); }
  };

  const deleteEquipment = (id: string) => {
    setDeleteConfirm({ isOpen: true, equipmentId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.equipmentId) return;

    const { error } = await supabase.from('vendor_equipment').delete().eq('id', deleteConfirm.equipmentId);
    if (!error) {
      showSuccess('تم الحذف');
      setEquipment(prev => prev.filter(e => e.id !== deleteConfirm.equipmentId));
    } else {
      showError('حدث خطأ أثناء الحذف');
    }

    setDeleteConfirm({ isOpen: false, equipmentId: null });
  };

  const sendSuggestion = async () => {
    if (!suggForm.name.trim()) { showError('أدخل اسم المعدة'); return; }
    try {
      const { error } = await supabase.from('equipment_suggestions').insert({
        vendor_id: vendor!.id,
        suggestion_text: `${suggForm.name}${suggForm.brand ? ` | الماركة: ${suggForm.brand}` : ''}${suggForm.category ? ` | التصنيف: ${suggForm.category}` : ''}`,
        status: 'pending',
      });
      if (error) {
        console.error('Error inserting equipment suggestion:', error);
        showError('حدث خطأ أثناء إرسال الاقتراح. يرجى المحاولة لاحقاً.');
        return;
      }
    } catch (err) {
      console.error('Equipment suggestion table error:', err);
      showError('حدث خطأ أثناء إرسال الاقتراح. يرجى المحاولة لاحقاً.');
      return;
    }
    setSuggSent(true);
    setSuggForm({ name: '', category: '', brand: '' });
    setTimeout(() => { setSuggSent(false); setSuggesting(false); }, 2500);
  };

  // Step indicator
  const addStep = !selCategory ? 1 : !selBrand ? 2 : !selItem ? 3 : 4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--textPri)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Camera size={18} /> المعدات
        </span>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button onClick={() => { setSuggesting(v => !v); setAdding(false); resetAddForm(); }} className="vp-btn-ghost">
            <Lightbulb size={15} /> اقتراح معدة
          </button>
          <button onClick={() => { setAdding(v => !v); setSuggesting(false); resetAddForm(); }} className="vp-btn-primary" style={{ padding: '8px 16px' }}>
            {adding ? <X size={15} /> : <Plus size={15} />}
            {adding ? 'إلغاء' : 'إضافة معدة'}
          </button>
        </div>
      </div>

      {/* Suggest form */}
      {suggesting && (
        <div className="vp-card" style={{ padding: '18px 20px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: 'rgba(245,158,11,0.08)', filter: 'blur(16px)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', fontWeight: 700, color: '#f59e0b', marginBottom: 14, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lightbulb size={16} style={{ color: '#f59e0b' }} />
            </div>
            اقتراح معدة غير موجودة في القائمة
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>
            <div>
              <FieldLabel>اسم المعدة *</FieldLabel>
              <TextInput value={suggForm.name} onChange={(e: any) => setSuggForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: كاميرا Sony FX6" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <FieldLabel>الماركة (اختياري)</FieldLabel>
                <TextInput value={suggForm.brand} onChange={(e: any) => setSuggForm(f => ({ ...f, brand: e.target.value }))} placeholder="مثال: Sony" />
              </div>
              <div>
                <FieldLabel>التصنيف (اختياري)</FieldLabel>
                <TextInput value={suggForm.category} onChange={(e: any) => setSuggForm(f => ({ ...f, category: e.target.value }))} placeholder="مثال: كاميرات" />
              </div>
            </div>
            <button onClick={sendSuggestion} className="vp-btn-primary" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', boxShadow: '0 2px 12px rgba(245,158,11,0.3)', alignSelf: 'flex-start' }}>
              <CheckCircle size={15} /> إرسال الاقتراح
            </button>
          </div>
          {suggSent && <div style={{ fontSize: '.78rem', color: '#10b981', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, position: 'relative', zIndex: 1 }}><CheckCircle size={14} /> تم إرسال الاقتراح — شكراً!</div>}
        </div>
      )}

      {/* Add form — 3 step cascading */}
      {adding && (
        <div className="vp-card" style={{ padding: '18px 20px', background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(59,130,246,0.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', fontWeight: 700, color: 'var(--tagC)', marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--tagBg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} style={{ color: 'var(--tagC)' }} />
            </div>
            إضافة معدة
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            {['التصنيف', 'الماركة', 'المعدة'].map((label, i) => {
              const stepNum = i + 1;
              const isActive = addStep === stepNum;
              const isDone = addStep > stepNum;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: isDone ? '#10b981' : isActive ? 'var(--tagC)' : 'var(--sortBg)',
                    border: `1px solid ${isDone ? '#10b981' : isActive ? 'var(--borderHi)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.65rem', fontWeight: 700,
                    color: isDone || isActive ? 'white' : 'var(--textMut)',
                    transition: 'all .2s',
                  }}>
                    {isDone ? '✓' : stepNum}
                  </div>
                  <span style={{ fontSize: '.73rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--tagC)' : 'var(--textMut)' }}>{label}</span>
                  {i < 2 && <ChevronLeft size={12} style={{ color: 'var(--textMut)', opacity: 0.4 }} />}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Step 1: Category */}
            <div>
              <FieldLabel>1. التصنيف</FieldLabel>
              <SelectInput value={selCategory} onChange={(e: any) => { setSelCategory(e.target.value); setSelBrand(''); setSelItem(''); }}>
                <option value="">اختر التصنيف</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectInput>
            </div>

            {/* Step 2: Brand — only after category */}
            {selCategory && (
              <div style={{ animation: 'fadeUp .2s ease' }}>
                <FieldLabel>2. الماركة</FieldLabel>
                <SelectInput value={selBrand} onChange={(e: any) => { setSelBrand(e.target.value); setSelItem(''); }}>
                  <option value="">اختر الماركة</option>
                  {filteredBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </SelectInput>
              </div>
            )}

            {/* Step 3: Item name — only after brand */}
            {selBrand && (
              <div style={{ animation: 'fadeUp .2s ease' }}>
                <FieldLabel>3. اسم المعدة</FieldLabel>
                <SelectInput value={selItem} onChange={(e: any) => setSelItem(e.target.value)}>
                  <option value="">اختر المعدة</option>
                  {filteredItems.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectInput>
                {filteredItems.length === 0 && (
                  <div style={{ fontSize: '.72rem', color: '#f59e0b', marginTop: 4 }}>لا توجد معدات متاحة في هذا التصنيف والماركة</div>
                )}
              </div>
            )}

            {/* Quantity + Serial — only after item selected */}
            {selItem && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, animation: 'fadeUp .2s ease' }}>
                <div>
                  <FieldLabel>الكمية</FieldLabel>
                  <TextInput value={newQuantity} onChange={(e: any) => setNewQuantity(Math.max(1, Number(e.target.value)))} type="number" dir="ltr" />
                </div>
                <div>
                  <FieldLabel icon={Hash}>الرقم التسلسلي (اختياري)</FieldLabel>
                  <TextInput value={newSerial} onChange={(e: any) => setNewSerial(e.target.value)} placeholder="S/N" dir="ltr" />
                </div>
              </div>
            )}

            {/* Submit */}
            {selItem && (
              <button onClick={addEquipment} className="vp-btn-primary" style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 2px 12px rgba(16,185,129,0.3)', alignSelf: 'flex-start', animation: 'fadeUp .2s ease' }}>
                <CheckCircle size={15} /> إضافة المعدة
              </button>
            )}
          </div>
        </div>
      )}

      {/* Equipment grid */}
      {loading ? <LoadingSpinner /> : equipment.length === 0 ? (
        <EmptyState icon={Camera} message="لا توجد معدات بعد" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {equipment.map(eq => {
            const cat = eq.equipment_catalog;
            return (
              <div key={eq.id} className="vp-card sc" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
                <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--rowHover)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {cat?.image_url ? (
                    <img src={cat.image_url} alt={eq.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={32} style={{ color: 'var(--textMut)', opacity: 0.3 }} />
                  )}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--textPri)', marginBottom: 4 }}>{eq.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                    {cat?.equipment_categories?.name && (
                      <span style={{ padding: '2px 8px', borderRadius: 5, background: 'var(--tagBg)', color: 'var(--tagC)', fontSize: '.68rem', fontWeight: 700 }}>{cat.equipment_categories.name}</span>
                    )}
                    {(cat as any)?.equipment_brands?.name && (
                      <span style={{ padding: '2px 8px', borderRadius: 5, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', fontSize: '.68rem', fontWeight: 700 }}>{(cat as any).equipment_brands.name}</span>
                    )}
                  </div>
                  {/* View or Edit mode */}
                  {editingId === eq.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '.65rem', color: 'var(--textMut)', marginBottom: 2 }}>الكمية</div>
                          <input value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))} type="number" dir="ltr" className="vp-inp" style={{ padding: '6px 8px', fontSize: '.78rem' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '.65rem', color: 'var(--textMut)', marginBottom: 2 }}>S/N</div>
                          <input value={editForm.serial_number} onChange={e => setEditForm(f => ({ ...f, serial_number: e.target.value }))} dir="ltr" className="vp-inp" style={{ padding: '6px 8px', fontSize: '.78rem' }} placeholder="اختياري" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={saveEdit} disabled={savingEdit} className="vp-btn-primary" style={{ flex: 1, padding: '6px', fontSize: '.72rem' }}>
                          {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} حفظ
                        </button>
                        <button onClick={() => setEditingId(null)} className="vp-btn-ghost" style={{ flex: 1, padding: '6px', fontSize: '.72rem' }}>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '.72rem', color: 'var(--textMut)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>الكمية: {eq.quantity}</span>
                      {(eq as any).serial_number && <span>S/N: {(eq as any).serial_number}</span>}
                    </div>
                  )}
                </div>
                {/* Action buttons */}
                <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
                  {editingId !== eq.id && (
                    <button onClick={() => startEdit(eq)} style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: 'rgba(59,130,246,0.9)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'white', transition: 'all .2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button onClick={() => deleteEquipment(eq.id)} style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(239,68,68,0.9)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white', transition: 'all .2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذه المعدة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, equipmentId: null })}
      />
    </div>
  );
}
