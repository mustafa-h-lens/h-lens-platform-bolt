import { useState, useEffect } from 'react';
import { Plus, Search, Phone, MapPin, CheckCircle, XCircle, Ban, Download, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Modal } from '../shared/Modal';
import { VendorDetails } from './VendorDetails';
import { SearchableDropdown } from '../shared/SearchableDropdown';
import { toEnglishNumbers } from '../../lib/numberUtils';
import { useNotification } from '../../contexts/NotificationContext';
import { VendorExportModal } from './VendorExportModal';
import { ConfirmationModal } from '../shared/ConfirmationModal';

interface Vendor {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  profile_image?: string;
  id_image?: string;
  id_number?: string;
  primary_field?: string;
  primary_city?: string;
  nationality?: string;
  estimated_cost?: number;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
}

interface VendorsPageProps {
  initialVendorId?: string | null;
}

export const VendorsPage = ({ initialVendorId }: VendorsPageProps = {}) => {
  const { showSuccess, showError } = useNotification();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(initialVendorId || null);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    nationality: '',
    primary_city: '',
    primary_field: '',
    status: '',
    minCost: '',
    maxCost: '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch =
      vendor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone.includes(searchTerm) ||
      vendor.primary_field?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesNationality = !filters.nationality || vendor.nationality === filters.nationality;
    const matchesCity = !filters.primary_city || vendor.primary_city === filters.primary_city;
    const matchesField = !filters.primary_field || vendor.primary_field === filters.primary_field;
    const matchesStatus = !filters.status || vendor.status === filters.status;

    const matchesCost = (() => {
      if (!vendor.estimated_cost) return !filters.minCost && !filters.maxCost;
      const minCost = filters.minCost ? parseFloat(filters.minCost) : 0;
      const maxCost = filters.maxCost ? parseFloat(filters.maxCost) : Infinity;
      return vendor.estimated_cost >= minCost && vendor.estimated_cost <= maxCost;
    })();

    return matchesSearch && matchesNationality && matchesCity && matchesField && matchesStatus && matchesCost;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'inactive':
        return <XCircle className="w-5 h-5 text-gray-400" />;
      case 'blocked':
        return <Ban className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'inactive':
        return 'غير نشط';
      case 'blocked':
        return 'محظور';
      default:
        return status;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleVendorSelection = (vendorId: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendorId)) {
      newSelected.delete(vendorId);
    } else {
      newSelected.add(vendorId);
    }
    setSelectedVendors(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedVendors.size === filteredVendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(filteredVendors.map(v => v.id)));
    }
  };

  const handleExport = () => {
    if (selectedVendors.size === 0) {
      return;
    }
    setShowExportModal(true);
  };

  const handleDelete = async () => {
    if (selectedVendors.size === 0) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .in('id', Array.from(selectedVendors));

      if (error) throw error;

      showSuccess(`تم حذف ${selectedVendors.size} مورد بنجاح`);
      setSelectedVendors(new Set());
      setShowDeleteConfirm(false);
      await fetchVendors();
    } catch (error) {
      console.error('Error deleting vendors:', error);
      showError('حدث خطأ أثناء حذف الموردين');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600 dark:text-slate-300">جاري التحميل...</div>
      </div>
    );
  }

  if (selectedVendorId) {
    return (
      <VendorDetails
        vendorId={selectedVendorId}
        onBack={() => setSelectedVendorId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">الموردين</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">إدارة الموردين والمستقلين</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedVendors.size === 0}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl transition-all shadow-lg font-medium ${
                selectedVendors.size === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              <Trash2 className="w-5 h-5" />
              {selectedVendors.size > 0 ? `حذف (${selectedVendors.size})` : 'حذف'}
            </button>
            {selectedVendors.size === 0 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                يرجى تحديد مورد واحد على الأقل للحذف
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
              </div>
            )}
          </div>
          <div className="relative group">
            <button
              onClick={handleExport}
              disabled={selectedVendors.size === 0}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl transition-all shadow-lg font-medium ${
                selectedVendors.size === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              <Download className="w-5 h-5" />
              {selectedVendors.size > 0 ? `تصدير (${selectedVendors.size})` : 'تصدير'}
            </button>
            {selectedVendors.size === 0 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                يرجى تحديد مورد واحد على الأقل للتصدير
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0A2A66] to-[#1B4FA9]
              hover:from-[#0d3380] hover:to-[#2260c4] text-white rounded-xl transition-all
              shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
          >
            <Plus className="w-5 h-5" />
            إضافة مورد
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border">
        <div className="p-4 border-b border-slate-200 dark:border-dark-border space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الجوال أو المجال..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
              dir="rtl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={filters.nationality}
              onChange={(e) => setFilters({ ...filters, nationality: e.target.value })}
              className="px-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
              dir="rtl"
            >
              <option value="">جميع الجنسيات</option>
              <option value="سعودي">سعودي</option>
              <option value="يمني">يمني</option>
              <option value="سوري">سوري</option>
              <option value="مصري">مصري</option>
              <option value="إماراتي">إماراتي</option>
              <option value="كويتي">كويتي</option>
              <option value="قطري">قطري</option>
              <option value="بحريني">بحريني</option>
              <option value="عماني">عماني</option>
              <option value="أردني">أردني</option>
              <option value="لبناني">لبناني</option>
              <option value="عراقي">عراقي</option>
              <option value="فلسطيني">فلسطيني</option>
              <option value="ليبي">ليبي</option>
              <option value="تونسي">تونسي</option>
              <option value="جزائري">جزائري</option>
              <option value="مغربي">مغربي</option>
              <option value="سوداني">سوداني</option>
              <option value="صومالي">صومالي</option>
              <option value="جيبوتي">جيبوتي</option>
              <option value="موريتاني">موريتاني</option>
              <option value="هندي">هندي</option>
              <option value="باكستاني">باكستاني</option>
              <option value="بنغلاديشي">بنغلاديشي</option>
              <option value="فلبيني">فلبيني</option>
              <option value="إندونيسي">إندونيسي</option>
              <option value="تركي">تركي</option>
              <option value="إيراني">إيراني</option>
              <option value="أفغاني">أفغاني</option>
              <option value="إثيوبي">إثيوبي</option>
              <option value="إريتري">إريتري</option>
              <option value="كيني">كيني</option>
              <option value="نيجيري">نيجيري</option>
              <option value="أمريكي">أمريكي</option>
              <option value="بريطاني">بريطاني</option>
              <option value="كندي">كندي</option>
              <option value="أسترالي">أسترالي</option>
              <option value="فرنسي">فرنسي</option>
              <option value="ألماني">ألماني</option>
              <option value="إيطالي">إيطالي</option>
              <option value="إسباني">إسباني</option>
              <option value="روسي">روسي</option>
              <option value="صيني">صيني</option>
              <option value="ياباني">ياباني</option>
              <option value="كوري">كوري</option>
            </select>

            <select
              value={filters.primary_city}
              onChange={(e) => setFilters({ ...filters, primary_city: e.target.value })}
              className="px-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
              dir="rtl"
            >
              <option value="">جميع المدن</option>
              {(() => {
                const cities = Array.from(new Set(vendors.filter(v => v.primary_city).map(v => v.primary_city)));
                const priorityCities = ['الرياض', 'جدة', 'الدمام'];
                const sortedCities = [
                  ...priorityCities.filter(city => cities.includes(city)),
                  ...cities.filter(city => !priorityCities.includes(city)).sort()
                ];
                return sortedCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ));
              })()}
            </select>

            <select
              value={filters.primary_field}
              onChange={(e) => setFilters({ ...filters, primary_field: e.target.value })}
              className="px-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
              dir="rtl"
            >
              <option value="">جميع المجالات</option>
              {Array.from(new Set(vendors.filter(v => v.primary_field).map(v => v.primary_field))).map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
              dir="rtl"
            >
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="blocked">محظور</option>
            </select>

            <div className="flex gap-2 col-span-1 md:col-span-2 lg:col-span-2">
              <input
                type="number"
                placeholder="الحد الأدنى للتكلفة"
                value={filters.minCost}
                onChange={(e) => setFilters({ ...filters, minCost: e.target.value })}
                className="flex-1 px-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
                dir="rtl"
              />
              <input
                type="number"
                placeholder="الحد الأقصى للتكلفة"
                value={filters.maxCost}
                onChange={(e) => setFilters({ ...filters, maxCost: e.target.value })}
                className="flex-1 px-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
                dir="rtl"
              />
            </div>

            {(filters.nationality || filters.primary_city || filters.primary_field || filters.status || filters.minCost || filters.maxCost) && (
              <button
                onClick={() => setFilters({ nationality: '', primary_city: '', primary_field: '', status: '', minCost: '', maxCost: '' })}
                className="px-4 py-3 text-[#0A2A66] hover:bg-[#0A2A66]/10 rounded-lg transition-colors font-medium"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-dark-border">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={filteredVendors.length > 0 && selectedVendors.size === filteredVendors.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-[#0A2A66] focus:ring-[#0A2A66] cursor-pointer"
                  />
                </th>
                <th className="text-right px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">الاسم</th>
                <th className="text-right px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">المجال الأساسي</th>
                <th className="text-right px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">رقم الجوال</th>
                <th className="text-right px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">المدينة</th>
                <th className="text-right px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    لا توجد موردين
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedVendors.has(vendor.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleVendorSelection(vendor.id);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-[#0A2A66] focus:ring-[#0A2A66] cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedVendorId(vendor.id)}>
                      <div className="flex items-center gap-3">
                        {vendor.profile_image ? (
                          <img
                            src={vendor.profile_image}
                            alt={vendor.full_name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-slate-200">
                            <span className="text-white font-bold text-2xl">
                              {vendor.full_name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{vendor.full_name}</div>
                          {vendor.nationality && (
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{vendor.nationality}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedVendorId(vendor.id)}>
                      <span className="text-slate-700 dark:text-slate-300">{vendor.primary_field || '-'}</span>
                    </td>
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedVendorId(vendor.id)}>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300" dir="ltr">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {toEnglishNumbers(vendor.phone)}
                      </div>
                    </td>
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedVendorId(vendor.id)}>
                      {vendor.primary_city ? (
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {vendor.primary_city}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedVendorId(vendor.id)}>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(vendor.status)}`}>
                        {getStatusIcon(vendor.status)}
                        {getStatusText(vendor.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVendorId(vendor.id);
                        }}
                        className="text-[#0A2A66] dark:text-[#47A1FF] hover:text-[#1B4FA9] dark:hover:text-[#6BB6FF] font-medium text-sm"
                      >
                        عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddVendorModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchVendors();
          }}
        />
      )}

      {showExportModal && (
        <VendorExportModal
          vendors={vendors.filter(v => selectedVendors.has(v.id))}
          onClose={() => setShowExportModal(false)}
          onSuccess={() => {
            setShowExportModal(false);
            setSelectedVendors(new Set());
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="تأكيد حذف الموردين"
          message={`هل أنت متأكد من حذف ${selectedVendors.size} مورد؟ هذا الإجراء لا يمكن التراجع عنه.`}
          confirmText="حذف"
          cancelText="إلغاء"
          isDestructive={true}
          isLoading={deleting}
        />
      )}
    </div>
  );
};

interface AddVendorModalProps {
  onClose: () => void;
  onSuccess: () => void;
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

const AddVendorModal = ({ onClose, onSuccess }: AddVendorModalProps) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [vendorFields, setVendorFields] = useState<VendorField[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    primary_field: '',
    primary_city: '',
    estimated_cost: '',
    status: 'active' as 'active' | 'inactive' | 'blocked',
  });

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
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const { data: { user } } = await supabase.auth.getUser();

      const insertData = {
        full_name: formData.full_name.trim(),
        phone: toEnglishNumbers(formData.phone.trim()),
        email: formData.email.trim() || null,
        primary_field: formData.primary_field.trim() || null,
        primary_city: formData.primary_city.trim() || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        status: formData.status,
        created_by: user?.id,
      };

      const { error } = await supabase.from('vendors').insert([insertData]);

      if (error) throw error;
      showSuccess('تم إضافة المورد بنجاح');
      onSuccess();
    } catch (error) {
      console.error('Error adding vendor:', error);
      showError('حدث خطأ أثناء إضافة المورد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="إضافة مورد جديد">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            الاسم الكامل <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            required
            dir="rtl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            رقم الجوال <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: toEnglishNumbers(e.target.value) })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            required
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            المجال الأساسي
          </label>
          <SearchableDropdown
            value={formData.primary_field}
            onChange={(value) => setFormData({ ...formData, primary_field: value })}
            options={vendorFields.map(field => ({ value: field.name, label: field.name }))}
            placeholder="اختر المجال..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            المدينة الأساسية
          </label>
          <SearchableDropdown
            value={formData.primary_city}
            onChange={(value) => setFormData({ ...formData, primary_city: value })}
            options={cities.map(city => ({ value: city.name, label: city.name }))}
            placeholder="اختر مدينة..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            التكلفة التقديرية (ريال)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.estimated_cost}
            onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            placeholder="مثال: 5000"
            dir="ltr"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">معلومة داخلية - لن تظهر للعملاء أو الموردين</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            الحالة
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
            dir="rtl"
          >
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="blocked">محظور</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-dark-border text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0A2A66] to-[#1B4FA9] hover:from-[#0d3380] hover:to-[#2260c4] text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري الإضافة...' : 'إضافة'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

