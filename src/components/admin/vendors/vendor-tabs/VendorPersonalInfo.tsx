import { useState, useEffect, useRef } from 'react';
import { Save, Upload, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { SearchableDropdown } from '../../../shared/SearchableDropdown';
import { toEnglishNumbers } from '../../../../lib/numberUtils';
import { useNotification } from '../../../../contexts/NotificationContext';
import { getNationalityOptions } from '../../../../lib/countries';
import { DatePicker } from '../../../ui/DatePicker';

interface Vendor {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  profile_image?: string;
  id_image?: string;
  vehicle_registration_image?: string;
  id_number?: string;
  extracted_id_number?: string;
  vehicle_registration_number?: string;
  vehicle_brand?: string;
  vehicle_plate_number?: string;
  id_expiry_date?: string;
  nationality?: string;
  primary_city?: string;
  available_other_cities?: boolean;
  other_cities?: string[];
  status: string;
  internal_notes?: string;
  primary_field?: string;
  estimated_cost?: number;
}

interface VendorPersonalInfoProps {
  vendor: Vendor;
  onUpdate: () => void;
}

interface VendorField {
  id: string;
  name: string;
  name_en?: string;
}

interface City {
  id: string;
  name: string;
  name_en?: string;
}

export const VendorPersonalInfo = ({ vendor, onUpdate }: VendorPersonalInfoProps) => {
  const { showSuccess, showError } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: vendor.full_name,
    phone: vendor.phone,
    email: vendor.email || '',
    profile_image: vendor.profile_image || '',
    id_image: vendor.id_image || '',
    vehicle_registration_image: vendor.vehicle_registration_image || '',
    id_number: vendor.id_number || '',
    extracted_id_number: vendor.extracted_id_number || '',
    vehicle_registration_number: vendor.vehicle_registration_number || '',
    vehicle_brand: vendor.vehicle_brand || '',
    vehicle_plate_number: vendor.vehicle_plate_number || '',
    id_expiry_date: vendor.id_expiry_date || '',
    nationality: vendor.nationality || '',
    primary_city: vendor.primary_city || '',
    available_other_cities: vendor.available_other_cities || false,
    other_cities: vendor.other_cities || [],
    status: vendor.status,
    internal_notes: vendor.internal_notes || '',
    primary_field: vendor.primary_field || '',
    estimated_cost: vendor.estimated_cost?.toString() || '',
  });

  const [notifyEmailChange, setNotifyEmailChange] = useState(false);
  const [vendorFields, setVendorFields] = useState<VendorField[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countries, setCountries] = useState<Array<{ value: string; label: string }>>([]);
  const [newCity, setNewCity] = useState('');
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingIdImage, setUploadingIdImage] = useState(false);
  const [uploadingVehicleRegImage, setUploadingVehicleRegImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idImageInputRef = useRef<HTMLInputElement>(null);
  const vehicleRegImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    const options = await getNationalityOptions('ar');
    setCountries(options);
  };

  useEffect(() => {
    fetchVendorFields();
    fetchCities();
  }, []);

  const fetchVendorFields = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_fields')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setVendorFields(data || []);
    } catch (error) {
      console.error('Error fetching vendor fields:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const priorityCities = ['الرياض', 'جدة', 'الدمام'];
      const sortedCities = [
        ...(data || []).filter(city => priorityCities.includes(city.name)),
        ...(data || []).filter(city => !priorityCities.includes(city.name))
      ];

      setCities(sortedCities);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      showError('يرجى إدخال الاسم الكامل');
      return;
    }
    if (!formData.phone.trim()) {
      showError('يرجى إدخال رقم الجوال');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        full_name: formData.full_name.trim(),
        phone: toEnglishNumbers(formData.phone.trim()),
        email: formData.email.trim() || null,
        profile_image: formData.profile_image || null,
        id_image: formData.id_image || null,
        vehicle_registration_image: formData.vehicle_registration_image || null,
        id_number: formData.id_number ? toEnglishNumbers(formData.id_number.trim()) : null,
        extracted_id_number: formData.extracted_id_number ? toEnglishNumbers(formData.extracted_id_number.trim()) : null,
        vehicle_registration_number: formData.vehicle_registration_number ? toEnglishNumbers(formData.vehicle_registration_number.trim()) : null,
        vehicle_brand: formData.vehicle_brand ? formData.vehicle_brand.trim() : null,
        vehicle_plate_number: formData.vehicle_plate_number ? formData.vehicle_plate_number.trim() : null,
        id_expiry_date: formData.id_expiry_date || null,
        nationality: formData.nationality.trim() || null,
        primary_city: formData.primary_city.trim() || null,
        available_other_cities: formData.available_other_cities,
        other_cities: formData.available_other_cities ? formData.other_cities : [],
        status: formData.status,
        internal_notes: formData.internal_notes.trim() || null,
        primary_field: formData.primary_field.trim() || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendor.id);

      if (error) throw error;

      const trimmedEmail = formData.email.trim();
      const oldEmail = (vendor.email || '').trim();
      const emailChanged = trimmedEmail && trimmedEmail.toLowerCase() !== oldEmail.toLowerCase();
      if (emailChanged && notifyEmailChange) {
        try {
          const { error: emailErr } = await supabase.functions.invoke('send-vendor-status-email', {
            body: {
              vendor_id: vendor.id,
              email_type: 'email_changed',
              new_email: trimmedEmail,
              old_email: oldEmail || undefined,
              portal_type: 'vendor',
            },
          });
          if (emailErr) {
            console.error('Notify-email error:', emailErr);
            showError('تم حفظ التعديلات لكن فشل إرسال إشعار البريد الجديد');
          } else {
            showSuccess('تم حفظ التعديلات وإرسال إشعار للبريد الجديد');
          }
        } catch (emailErr) {
          console.error('Notify-email exception:', emailErr);
          showError('تم حفظ التعديلات لكن فشل إرسال إشعار البريد الجديد');
        }
      } else {
        showSuccess('تم حفظ التعديلات بنجاح');
      }

      setIsEditing(false);
      setNotifyEmailChange(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating vendor:', error);
      showError('حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: vendor.full_name,
      phone: vendor.phone,
      email: vendor.email || '',
      profile_image: vendor.profile_image || '',
      id_image: vendor.id_image || '',
      vehicle_registration_image: vendor.vehicle_registration_image || '',
      id_number: vendor.id_number || '',
      extracted_id_number: vendor.extracted_id_number || '',
      vehicle_registration_number: vendor.vehicle_registration_number || '',
      vehicle_brand: vendor.vehicle_brand || '',
      vehicle_plate_number: vendor.vehicle_plate_number || '',
      id_expiry_date: vendor.id_expiry_date || '',
      nationality: vendor.nationality || '',
      primary_city: vendor.primary_city || '',
      available_other_cities: vendor.available_other_cities || false,
      other_cities: vendor.other_cities || [],
      status: vendor.status,
      internal_notes: vendor.internal_notes || '',
      primary_field: vendor.primary_field || '',
      estimated_cost: vendor.estimated_cost?.toString() || '',
    });
    setIsEditing(false);
  };

  const addCity = (city: string) => {
    if (city && !formData.other_cities.includes(city)) {
      setFormData({
        ...formData,
        other_cities: [...formData.other_cities, city],
      });
      setNewCity('');
    }
  };

  const removeCity = (city: string) => {
    setFormData({
      ...formData,
      other_cities: formData.other_cities.filter(c => c !== city),
    });
  };

  const filteredCountries = countries.filter(country =>
    country.label.includes(nationalitySearch) || country.value.includes(nationalitySearch)
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor.id}-profile-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      if (formData.profile_image) {
        const oldFileName = formData.profile_image.split('/').pop();
        if (oldFileName) {
          try {
            await supabase.storage.from('vendor-images').remove([oldFileName]);
          } catch (e) { console.warn('old profile image remove failed:', e); }
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          profile_image: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendor.id);

      if (updateError) throw updateError;

      setFormData({ ...formData, profile_image: publicUrl });
      onUpdate();
      showSuccess('تم رفع الصورة بنجاح');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError(error?.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleIdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setUploadingIdImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor.id}-id-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      if (formData.id_image) {
        const oldFileName = formData.id_image.split('/').pop();
        if (oldFileName) {
          try {
            await supabase.storage.from('vendor-images').remove([oldFileName]);
          } catch (e) { console.warn('old id image remove failed:', e); }
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          id_image: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendor.id);

      if (updateError) throw updateError;

      setFormData({ ...formData, id_image: publicUrl });
      onUpdate();
      showSuccess('تم رفع صورة الهوية بنجاح');
    } catch (error: any) {
      console.error('Error uploading ID image:', error);
      showError(error?.message || 'حدث خطأ أثناء رفع صورة الهوية');
    } finally {
      setUploadingIdImage(false);
    }
  };

  const handleVehicleRegImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setUploadingVehicleRegImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor.id}-vehicle-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      if (formData.vehicle_registration_image) {
        const oldFileName = formData.vehicle_registration_image.split('/').pop();
        if (oldFileName) {
          try {
            await supabase.storage.from('vendor-images').remove([oldFileName]);
          } catch (e) { console.warn('old vehicle image remove failed:', e); }
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          vehicle_registration_image: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendor.id);

      if (updateError) throw updateError;

      setFormData({ ...formData, vehicle_registration_image: publicUrl });
      onUpdate();
      showSuccess('تم رفع صورة استمارة السيارة بنجاح');
    } catch (error: any) {
      console.error('Error uploading vehicle registration image:', error);
      showError(error?.message || 'حدث خطأ أثناء رفع صورة استمارة السيارة');
    } finally {
      setUploadingVehicleRegImage(false);
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>البيانات الشخصية</h2>
        {!isEditing ? (
          <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)}>
            تعديل
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
              إلغاء
            </button>
            <button
              className="btn btn-sm"
              onClick={handleSave}
              disabled={loading}
              style={{ background: 'var(--success)', color: '#fff', gap: 6 }}
            >
              <Save size={14} />
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ cursor: 'default' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Profile Image */}
          <div className="input-group" style={{ textAlign: 'center' }}>
            <label className="input-label">الصورة الشخصية</label>
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
              onDragOver={isEditing ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
              onDrop={isEditing ? (e) => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files[0]; if (file) { const dt = new DataTransfer(); dt.items.add(file); if (fileInputRef.current) { fileInputRef.current.files = dt.files; fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true })); } } } : undefined}
            >
              <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border-soft)', flexShrink: 0 }}>
                {formData.profile_image ? (
                  <img
                    src={formData.profile_image}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, background: 'var(--accent)', color: '#fff' }}>
                    {formData.full_name.charAt(0)}
                  </div>
                )}
              </div>
              {isEditing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{ gap: 6 }}
                  >
                    <Upload size={14} />
                    {uploadingImage ? 'جاري الرفع...' : 'رفع صورة'}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG, WebP - حد أقصى 5MB</span>
                </>
              )}
            </div>
          </div>

          {/* ID Image */}
          <div className="input-group">
            <label className="input-label">صورة الهوية الشخصية</label>
            <div
              style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                ...(isEditing ? { border: '2px dashed var(--border-soft)', borderRadius: 'var(--radius-md)', padding: 12, transition: 'border-color 0.2s' } : {}),
              }}
              onDragOver={isEditing ? (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = 'var(--accent)'; } : undefined}
              onDragLeave={isEditing ? (e) => { e.currentTarget.style.borderColor = 'var(--border-soft)'; } : undefined}
              onDrop={isEditing ? (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = 'var(--border-soft)'; const file = e.dataTransfer.files[0]; if (file) { const dt = new DataTransfer(); dt.items.add(file); if (idImageInputRef.current) { idImageInputRef.current.files = dt.files; idImageInputRef.current.dispatchEvent(new Event('change', { bubbles: true })); } } } : undefined}
            >
              {formData.id_image ? (
                <img
                  src={formData.id_image}
                  alt="ID"
                  style={{ width: '100%', maxHeight: 160, borderRadius: 'var(--radius-md)', objectFit: 'contain', border: '2px solid var(--border-soft)' }}
                />
              ) : (
                <div style={{ width: '100%', height: 120, borderRadius: 'var(--radius-md)', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-soft)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد صورة</span>
                </div>
              )}
              {isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    ref={idImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleIdImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => idImageInputRef.current?.click()}
                    disabled={uploadingIdImage}
                    style={{ gap: 6, flex: 1 }}
                  >
                    <Upload size={14} />
                    {uploadingIdImage ? 'جاري الرفع...' : 'رفع صورة الهوية'}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>JPG, PNG, WebP - حد أقصى 5MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Registration Image */}
          <div className="input-group">
            <label className="input-label">صورة استمارة السيارة</label>
            <div
              style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                ...(isEditing ? { border: '2px dashed var(--border-soft)', borderRadius: 'var(--radius-md)', padding: 12, transition: 'border-color 0.2s' } : {}),
              }}
              onDragOver={isEditing ? (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = 'var(--accent)'; } : undefined}
              onDragLeave={isEditing ? (e) => { e.currentTarget.style.borderColor = 'var(--border-soft)'; } : undefined}
              onDrop={isEditing ? (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = 'var(--border-soft)'; const file = e.dataTransfer.files[0]; if (file) { const dt = new DataTransfer(); dt.items.add(file); if (vehicleRegImageInputRef.current) { vehicleRegImageInputRef.current.files = dt.files; vehicleRegImageInputRef.current.dispatchEvent(new Event('change', { bubbles: true })); } } } : undefined}
            >
              {formData.vehicle_registration_image ? (
                <img
                  src={formData.vehicle_registration_image}
                  alt="Vehicle Registration"
                  style={{ width: '100%', maxHeight: 160, borderRadius: 'var(--radius-md)', objectFit: 'contain', border: '2px solid var(--border-soft)' }}
                />
              ) : (
                <div style={{ width: '100%', height: 120, borderRadius: 'var(--radius-md)', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-soft)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد صورة</span>
                </div>
              )}
              {isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    ref={vehicleRegImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleVehicleRegImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => vehicleRegImageInputRef.current?.click()}
                    disabled={uploadingVehicleRegImage}
                    style={{ gap: 6, flex: 1 }}
                  >
                    <Upload size={14} />
                    {uploadingVehicleRegImage ? 'جاري الرفع...' : 'رفع صورة الاستمارة'}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>JPG, PNG, WebP - حد أقصى 5MB</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ cursor: 'default' }}>
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">الاسم الكامل <span className="req">*</span></label>
            <input
              type="text"
              className="input"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={!isEditing}
              dir="rtl"
            />
          </div>

          <div className="input-group">
            <label className="input-label">رقم الجوال <span className="req">*</span></label>
            <input
              type="tel"
              className="input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: toEnglishNumbers(e.target.value) })}
              disabled={!isEditing}
              dir="ltr"
            />
          </div>

          <div className="input-group">
            <label className="input-label">البريد الإلكتروني</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing}
              dir="ltr"
            />
            {isEditing && formData.email.trim() && formData.email.trim().toLowerCase() !== (vendor.email || '').trim().toLowerCase() && (
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginTop: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'var(--accent-glow)', border: '1px solid var(--accent-glow-md)',
                  fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={notifyEmailChange}
                  onChange={(e) => setNotifyEmailChange(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <span>
                  إشعار المورد بالبريد الجديد عبر إيميل يحتوي على رابط تسجيل الدخول
                </span>
              </label>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">المجال الأساسي</label>
            <SearchableDropdown
              value={formData.primary_field}
              onChange={(value) => setFormData({ ...formData, primary_field: value })}
              options={vendorFields.map(field => ({ value: field.name, label: field.name }))}
              placeholder="اختر المجال..."
              disabled={!isEditing}
            />
          </div>

          <div className="input-group">
            <label className="input-label">رقم الهوية</label>
            <input
              type="text"
              className="input"
              value={formData.id_number}
              onChange={(e) => setFormData({ ...formData, id_number: toEnglishNumbers(e.target.value) })}
              disabled={!isEditing}
              dir="ltr"
            />
          </div>

          {isEditing ? (
            <DatePicker
              label="تاريخ انتهاء الهوية"
              value={formData.id_expiry_date}
              onChange={(date) => setFormData({ ...formData, id_expiry_date: date })}
            />
          ) : (
            <div className="input-group">
              <label className="input-label">تاريخ انتهاء الهوية</label>
              <input
                type="text"
                className="input"
                value={formData.id_expiry_date}
                disabled
                dir="ltr"
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">رقم الاستمارة</label>
            <input
              type="text"
              className="input"
              value={formData.vehicle_registration_number}
              onChange={(e) => setFormData({ ...formData, vehicle_registration_number: toEnglishNumbers(e.target.value) })}
              disabled={!isEditing}
              dir="ltr"
            />
          </div>

          <div className="input-group">
            <label className="input-label">ماركة المركبة</label>
            <input
              type="text"
              className="input"
              value={formData.vehicle_brand}
              onChange={(e) => setFormData({ ...formData, vehicle_brand: e.target.value })}
              disabled={!isEditing}
              dir="rtl"
            />
          </div>

          <div className="input-group">
            <label className="input-label">رقم اللوحة بالإنجليزي</label>
            <input
              type="text"
              className="input"
              value={formData.vehicle_plate_number}
              onChange={(e) => setFormData({ ...formData, vehicle_plate_number: e.target.value })}
              disabled={!isEditing}
              dir="ltr"
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">الجنسية</label>
            {isEditing ? (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input"
                  value={nationalitySearch || formData.nationality}
                  onChange={(e) => {
                    setNationalitySearch(e.target.value);
                    setShowNationalityDropdown(true);
                  }}
                  onFocus={() => setShowNationalityDropdown(true)}
                  dir="rtl"
                  placeholder="ابحث أو اختر..."
                />
                {showNationalityDropdown && (
                  <div style={{
                    position: 'absolute', zIndex: 10, width: '100%', marginTop: 4,
                    background: 'var(--bg-surface)', border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                    maxHeight: 240, overflowY: 'auto'
                  }}>
                    {filteredCountries.map((country) => (
                      <button
                        key={country.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, nationality: country.value });
                          setNationalitySearch('');
                          setShowNationalityDropdown(false);
                        }}
                        style={{
                          width: '100%', textAlign: 'right', padding: '8px 16px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-primary)', fontSize: 13,
                          transition: 'background var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        {country.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                className="input"
                value={formData.nationality}
                disabled
                dir="rtl"
              />
            )}
          </div>

          <div className="input-group">
            <label className="input-label">مدينة العمل الأساسية</label>
            <SearchableDropdown
              value={formData.primary_city}
              onChange={(value) => setFormData({ ...formData, primary_city: value })}
              options={cities.map(city => ({ value: city.name, label: city.name }))}
              placeholder="اختر مدينة..."
              disabled={!isEditing}
            />
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                className="tbl-check"
                checked={formData.available_other_cities}
                onChange={(e) => setFormData({ ...formData, available_other_cities: e.target.checked })}
                disabled={!isEditing}
              />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>متاح للعمل في مدن أخرى</span>
            </label>
          </div>

          {formData.available_other_cities && (
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label className="input-label">المدن الأخرى</label>
              {isEditing && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <SearchableDropdown
                      value={newCity}
                      onChange={(value) => setNewCity(value)}
                      options={cities
                        .filter(city => !formData.other_cities.includes(city.name))
                        .map(city => ({ value: city.name, label: city.name }))}
                      placeholder="اختر مدينة..."
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => addCity(newCity)}
                    disabled={!newCity}
                  >
                    إضافة
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {formData.other_cities.map((city) => (
                  <span
                    key={city}
                    className="badge badge-blue"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {city}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeCity(city)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">التكلفة التقديرية (ريال)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.estimated_cost}
              onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
              disabled={!isEditing}
              placeholder="مثال: 5000"
              dir="ltr"
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>معلومة داخلية - لن تظهر للعملاء أو الموردين</span>
          </div>

          <div className="input-group">
            <label className="input-label">الحالة</label>
            <select
              className="input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              disabled={!isEditing}
              dir="rtl"
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="blocked">محظور</option>
            </select>
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label">ملاحظات داخلية</label>
            <textarea
              className="input"
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              disabled={!isEditing}
              rows={4}
              dir="rtl"
              placeholder="ملاحظات خاصة بالفريق..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};
