import { useState, useEffect, useRef } from 'react';
import { Save, Upload, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { SearchableDropdown } from '../../../shared/SearchableDropdown';
import { toEnglishNumbers } from '../../../../lib/numberUtils';
import { useNotification } from '../../../../contexts/NotificationContext';

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

const COUNTRIES = [
  'سعودي', 'يمني', 'سوري', 'مصري',
  'إماراتي', 'كويتي', 'قطري', 'بحريني', 'عماني',
  'أردني', 'لبناني', 'عراقي', 'فلسطيني',
  'ليبي', 'تونسي', 'جزائري', 'مغربي', 'سوداني', 'صومالي', 'جيبوتي', 'موريتاني',
  'هندي', 'باكستاني', 'بنغلاديشي', 'فلبيني', 'إندونيسي',
  'تركي', 'إيراني', 'أفغاني',
  'إثيوبي', 'إريتري', 'كيني', 'نيجيري',
  'أمريكي', 'بريطاني', 'كندي', 'أسترالي',
  'فرنسي', 'ألماني', 'إيطالي', 'إسباني', 'روسي',
  'صيني', 'ياباني', 'كوري'
];

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

  const [vendorFields, setVendorFields] = useState<VendorField[]>([]);
  const [cities, setCities] = useState<City[]>([]);
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

      setIsEditing(false);
      onUpdate();
      showSuccess('تم حفظ التعديلات بنجاح');
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

  const filteredCountries = COUNTRIES.filter(country =>
    country.includes(nationalitySearch)
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
          await supabase.storage
            .from('vendor-images')
            .remove([oldFileName]);
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
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('حدث خطأ أثناء رفع الصورة');
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
          await supabase.storage
            .from('vendor-images')
            .remove([oldFileName]);
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
    } catch (error) {
      console.error('Error uploading ID image:', error);
      showError('حدث خطأ أثناء رفع صورة الهوية');
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
          await supabase.storage
            .from('vendor-images')
            .remove([oldFileName]);
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
    } catch (error) {
      console.error('Error uploading vehicle registration image:', error);
      showError('حدث خطأ أثناء رفع صورة استمارة السيارة');
    } finally {
      setUploadingVehicleRegImage(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">البيانات الشخصية</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-white rounded-lg transition-all font-medium"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            تعديل
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 font-medium"
            >
              <Save className="w-4 h-4" />
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        )}
      </div>

      <div className="md:col-span-2 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الصورة الشخصية
            </label>
            <div className="flex items-center gap-4">
              {formData.profile_image ? (
                <img
                  src={formData.profile_image}
                  alt="Profile"
                  className="w-40 h-40 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="w-40 h-40 rounded-full flex items-center justify-center border-2 border-slate-200"
                  style={{ backgroundColor: 'var(--color-primary)' }}>
                  <span className="text-white text-5xl font-bold">
                    {formData.full_name.charAt(0)}
                  </span>
                </div>
              )}
              {isEditing && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingImage ? 'جاري الرفع...' : 'رفع صورة'}
                  </button>
                  <p className="text-xs text-slate-500">JPG, PNG, WebP - حد أقصى 5MB</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              صورة الهوية الشخصية
            </label>
            <div className="flex flex-col gap-4">
              {formData.id_image ? (
                <div className="w-full max-w-sm">
                  <img
                    src={formData.id_image}
                    alt="ID"
                    className="w-full h-auto rounded-lg object-contain border-2 border-slate-200"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              ) : (
                <div className="w-full max-w-sm h-40 rounded-lg bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                  <span className="text-slate-400 text-sm text-center p-2">لا توجد صورة</span>
                </div>
              )}
              {isEditing && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={idImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleIdImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => idImageInputRef.current?.click()}
                    disabled={uploadingIdImage}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingIdImage ? 'جاري الرفع...' : 'رفع صورة الهوية'}
                  </button>
                  <p className="text-xs text-slate-500">JPG, PNG, WebP - حد أقصى 5MB</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              صورة استمارة السيارة
            </label>
            <div className="flex flex-col gap-4">
              {formData.vehicle_registration_image ? (
                <div className="w-full max-w-sm">
                  <img
                    src={formData.vehicle_registration_image}
                    alt="Vehicle Registration"
                    className="w-full h-auto rounded-lg object-contain border-2 border-slate-200"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              ) : (
                <div className="w-full max-w-sm h-40 rounded-lg bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                  <span className="text-slate-400 text-sm text-center p-2">لا توجد صورة</span>
                </div>
              )}
              {isEditing && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={vehicleRegImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleVehicleRegImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => vehicleRegImageInputRef.current?.click()}
                    disabled={uploadingVehicleRegImage}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingVehicleRegImage ? 'جاري الرفع...' : 'رفع صورة الاستمارة'}
                  </button>
                  <p className="text-xs text-slate-500">JPG, PNG, WebP - حد أقصى 5MB</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            الاسم الكامل <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            dir="rtl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            رقم الجوال <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: toEnglishNumbers(e.target.value) })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            المجال الأساسي
          </label>
          <SearchableDropdown
            value={formData.primary_field}
            onChange={(value) => setFormData({ ...formData, primary_field: value })}
            options={vendorFields.map(field => ({ value: field.name, label: field.name }))}
            placeholder="اختر المجال..."
            disabled={!isEditing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            رقم الهوية
          </label>
          <input
            type="text"
            value={formData.id_number}
            onChange={(e) => setFormData({ ...formData, id_number: toEnglishNumbers(e.target.value) })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            تاريخ انتهاء الهوية
          </label>
          <input
            type="date"
            value={formData.id_expiry_date}
            onChange={(e) => setFormData({ ...formData, id_expiry_date: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            رقم الاستمارة
          </label>
          <input
            type="text"
            value={formData.vehicle_registration_number}
            onChange={(e) => setFormData({ ...formData, vehicle_registration_number: toEnglishNumbers(e.target.value) })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            ماركة المركبة
          </label>
          <input
            type="text"
            value={formData.vehicle_brand}
            onChange={(e) => setFormData({ ...formData, vehicle_brand: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            dir="rtl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            رقم اللوحة بالإنجليزي
          </label>
          <input
            type="text"
            value={formData.vehicle_plate_number}
            onChange={(e) => setFormData({ ...formData, vehicle_plate_number: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            dir="ltr"
          />
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            الجنسية
          </label>
          {isEditing ? (
            <div className="relative">
              <input
                type="text"
                value={nationalitySearch || formData.nationality}
                onChange={(e) => {
                  setNationalitySearch(e.target.value);
                  setShowNationalityDropdown(true);
                }}
                onFocus={() => setShowNationalityDropdown(true)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
                placeholder="ابحث أو اختر..."
              />
              {showNationalityDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredCountries.map((country) => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, nationality: country });
                        setNationalitySearch('');
                        setShowNationalityDropdown(false);
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-slate-100 transition-colors"
                    >
                      {country}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={formData.nationality}
              disabled
              className="w-full px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-600"
              dir="rtl"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            مدينة العمل الأساسية
          </label>
          <SearchableDropdown
            value={formData.primary_city}
            onChange={(value) => setFormData({ ...formData, primary_city: value })}
            options={cities.map(city => ({ value: city.name, label: city.name }))}
            placeholder="اختر مدينة..."
            disabled={!isEditing}
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.available_other_cities}
              onChange={(e) => setFormData({ ...formData, available_other_cities: e.target.checked })}
              disabled={!isEditing}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">متاح للعمل في مدن أخرى</span>
          </label>
        </div>

        {formData.available_other_cities && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              المدن الأخرى
            </label>
            {isEditing && (
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
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
                  onClick={() => addCity(newCity)}
                  disabled={!newCity}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  إضافة
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {formData.other_cities.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {city}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeCity(city)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            التكلفة التقديرية (ريال)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.estimated_cost}
            onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            placeholder="مثال: 5000"
            dir="ltr"
          />
          <p className="text-xs text-slate-500 mt-1">معلومة داخلية - لن تظهر للعملاء أو الموردين</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            الحالة
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            dir="rtl"
          >
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="blocked">محظور</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            ملاحظات داخلية
          </label>
          <textarea
            value={formData.internal_notes}
            onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
            disabled={!isEditing}
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600"
            dir="rtl"
            placeholder="ملاحظات خاصة بالفريق..."
          />
        </div>
      </div>
    </div>
  );
};
