import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Modal } from '../../shared/Modal';
import { useNotification } from '../../../contexts/NotificationContext';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Vendor {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  profile_image?: string;
  id_image?: string;
  vehicle_registration_image?: string;
  id_number?: string;
  vehicle_registration_number?: string;
  vehicle_brand?: string;
  vehicle_plate_number?: string;
  primary_field?: string;
  primary_city?: string;
  nationality?: string;
  estimated_cost?: number;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
}

interface VendorExportModalProps {
  vendors: Vendor[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ExportFields {
  full_name: boolean;
  phone: boolean;
  id_number: boolean;
  vehicle_registration_number: boolean;
  vehicle_brand: boolean;
  vehicle_plate_number: boolean;
  profile_image: boolean;
  id_image: boolean;
  vehicle_registration_image: boolean;
  equipment: boolean;
  equipment_images: boolean;
  email: boolean;
  nationality: boolean;
  primary_field: boolean;
  primary_city: boolean;
  estimated_cost: boolean;
  status: boolean;
}

interface VendorEquipment {
  id: string;
  name: string;
  vendor_id: string;
  quantity: number;
  image?: string;
}

const STORAGE_KEY = 'vendor_export_preferences';

const defaultFields: ExportFields = {
  full_name: true,
  phone: true,
  id_number: true,
  vehicle_registration_number: true,
  vehicle_brand: true,
  vehicle_plate_number: true,
  profile_image: true,
  id_image: true,
  vehicle_registration_image: true,
  equipment: false,
  equipment_images: false,
  email: false,
  nationality: false,
  primary_field: false,
  primary_city: false,
  estimated_cost: false,
  status: false,
};

export const VendorExportModal = ({ vendors, onClose, onSuccess }: VendorExportModalProps) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<ExportFields>(defaultFields);
  const [separatePages, setSeparatePages] = useState(false);
  const [equipmentData, setEquipmentData] = useState<Record<string, VendorEquipment[]>>({});
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedFields({ ...defaultFields, ...parsed });
      } catch (e) {
        console.error('Error loading saved preferences:', e);
      }
    }
  }, []);

  useEffect(() => {
    fetchEquipmentData();
  }, [vendors]);

  const fetchEquipmentData = async () => {
    if (vendors.length === 0) return;

    try {
      const vendorIds = vendors.map(v => v.id);
      const { data } = await supabase
        .from('vendor_equipment')
        .select('vendor_id, name, id, quantity, image')
        .in('vendor_id', vendorIds);

      if (data) {
        const grouped = data.reduce((acc, item) => {
          if (!acc[item.vendor_id]) {
            acc[item.vendor_id] = [];
          }
          acc[item.vendor_id].push(item);
          return acc;
        }, {} as Record<string, VendorEquipment[]>);
        setEquipmentData(grouped);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const toggleField = (field: keyof ExportFields) => {
    setSelectedFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const savePreferences = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedFields));
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'inactive': return 'غير نشط';
      case 'blocked': return 'محظور';
      default: return status;
    }
  };

  const convertImageToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image:', error);
      return '';
    }
  };

  const handleExport = async () => {
    if (Object.values(selectedFields).every(v => !v)) {
      showError('يرجى اختيار حقل واحد على الأقل');
      return;
    }

    setLoading(true);
    savePreferences();

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      if (separatePages) {
        for (let i = 0; i < vendors.length; i++) {
          const vendor = vendors[i];

          if (printRef.current) {
            printRef.current.innerHTML = '';
            const template = await createSingleVendorTemplate(vendor);
            printRef.current.appendChild(template);

            await new Promise(resolve => setTimeout(resolve, 200));

            const canvas = await html2canvas(printRef.current, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
            });

            const imgWidth = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const imgData = canvas.toDataURL('image/png');

            if (i > 0) {
              doc.addPage();
            }

            doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          }
        }
      } else {
        if (printRef.current) {
          printRef.current.innerHTML = '';
          const template = await createAllVendorsTemplate();
          printRef.current.appendChild(template);

          await new Promise(resolve => setTimeout(resolve, 500));

          const canvas = await html2canvas(printRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
          });

          const imgWidth = 297;
          const pageHeight = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const imgData = canvas.toDataURL('image/png');

          let heightLeft = imgHeight;
          let position = 0;

          doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
        }
      }

      doc.save(`vendors_export_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccess('تم تصدير البيانات بنجاح');
      onSuccess();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showError('حدث خطأ أثناء تصدير البيانات');
    } finally {
      setLoading(false);
    }
  };

  const createAllVendorsTemplate = async (): Promise<HTMLElement> => {
    const container = document.createElement('div');
    container.style.cssText = `
      direction: rtl;
      font-family: 'Cairo', 'Arial', sans-serif;
      padding: 40px;
      background: white;
      min-width: 1200px;
    `;

    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const logoBase64 = await convertImageToBase64('/assets/logo-blue.png');

    const header = document.createElement('div');
    header.style.cssText = `
      position: relative;
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
    `;

    if (logoBase64) {
      const logoImg = document.createElement('img');
      logoImg.src = logoBase64;
      logoImg.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        width: 120px;
        height: auto;
        object-fit: contain;
      `;
      header.appendChild(logoImg);
    }

    const titleDiv = document.createElement('div');
    titleDiv.innerHTML = `
      <h1 style="font-size: 36px; font-weight: 700; color: #1e293b; margin: 0 0 15px 0;">فريق Half Lens</h1>
      <p style="font-size: 15px; color: #64748b; margin: 0;">تاريخ التصدير: ${new Date().toLocaleDateString('en-US')} | عدد الفريق: ${vendors.length}</p>
    `;
    header.appendChild(titleDiv);

    container.appendChild(header);

    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;

    const columns: { key: keyof ExportFields; label: string }[] = [];
    if (selectedFields.full_name) columns.push({ key: 'full_name', label: 'الاسم الثلاثي' });
    if (selectedFields.id_image) columns.push({ key: 'id_image', label: 'صورة الهوية' });
    if (selectedFields.vehicle_registration_image) columns.push({ key: 'vehicle_registration_image', label: 'صورة الاستمارة' });
    if (selectedFields.profile_image) columns.push({ key: 'profile_image', label: 'الصورة الشخصية' });
    if (selectedFields.phone) columns.push({ key: 'phone', label: 'رقم الجوال' });
    if (selectedFields.id_number) columns.push({ key: 'id_number', label: 'رقم الهوية' });
    if (selectedFields.vehicle_registration_number) columns.push({ key: 'vehicle_registration_number', label: 'رقم الاستمارة' });
    if (selectedFields.vehicle_brand) columns.push({ key: 'vehicle_brand', label: 'ماركة المركبة' });
    if (selectedFields.vehicle_plate_number) columns.push({ key: 'vehicle_plate_number', label: 'رقم اللوحة' });
    if (selectedFields.equipment) columns.push({ key: 'equipment', label: 'المعدات' });
    if (selectedFields.equipment_images) columns.push({ key: 'equipment_images', label: 'صور المعدات' });
    if (selectedFields.email) columns.push({ key: 'email', label: 'البريد الإلكتروني' });
    if (selectedFields.nationality) columns.push({ key: 'nationality', label: 'الجنسية' });
    if (selectedFields.primary_field) columns.push({ key: 'primary_field', label: 'المجال الأساسي' });
    if (selectedFields.primary_city) columns.push({ key: 'primary_city', label: 'المدينة' });
    if (selectedFields.estimated_cost) columns.push({ key: 'estimated_cost', label: 'التكلفة التقديرية' });
    if (selectedFields.status) columns.push({ key: 'status', label: 'الحالة' });

    const thead = document.createElement('thead');
    thead.style.cssText = 'background: #3b82f6;';
    const headerRow = document.createElement('tr');

    columns.forEach(col => {
      const th = document.createElement('th');
      th.style.cssText = `
        padding: 12px;
        text-align: center;
        color: white;
        font-weight: 600;
        font-size: 13px;
        border: 1px solid #2563eb;
        vertical-align: middle;
      `;
      th.textContent = col.label;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (let i = 0; i < vendors.length; i++) {
      const vendor = vendors[i];
      const dataRow = document.createElement('tr');
      dataRow.style.cssText = `
        ${i % 2 === 0 ? 'background: #f8fafc;' : 'background: white;'}
        height: 110px;
      `;

      for (const col of columns) {
        const td = document.createElement('td');
        td.style.cssText = `
          padding: 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
          font-size: 12px;
          color: #334155;
          vertical-align: middle;
        `;

        if (col.key === 'profile_image' && vendor.profile_image) {
          const base64 = await convertImageToBase64(vendor.profile_image);
          if (base64) {
            const img = document.createElement('img');
            img.src = base64;
            img.style.cssText = `
              width: 95px;
              height: 95px;
              object-fit: cover;
              border-radius: 8px;
              border: 2px solid #cbd5e1;
              margin: 0 auto;
              display: block;
            `;
            td.appendChild(img);
          } else {
            td.textContent = '-';
          }
        } else if (col.key === 'id_image' && vendor.id_image) {
          const base64 = await convertImageToBase64(vendor.id_image);
          if (base64) {
            const img = document.createElement('img');
            img.src = base64;
            img.style.cssText = `
              max-width: 100%;
              max-height: 95px;
              object-fit: contain;
              border-radius: 4px;
              border: 1px solid #cbd5e1;
              margin: 0 auto;
              display: block;
            `;
            td.appendChild(img);
          } else {
            td.textContent = '-';
          }
        } else if (col.key === 'vehicle_registration_image' && vendor.vehicle_registration_image) {
          const base64 = await convertImageToBase64(vendor.vehicle_registration_image);
          if (base64) {
            const img = document.createElement('img');
            img.src = base64;
            img.style.cssText = `
              max-width: 100%;
              max-height: 95px;
              object-fit: contain;
              border-radius: 4px;
              border: 1px solid #cbd5e1;
              margin: 0 auto;
              display: block;
            `;
            td.appendChild(img);
          } else {
            td.textContent = '-';
          }
        } else if (col.key === 'phone') {
          td.textContent = toEnglishNumbers(vendor.phone);
          td.style.direction = 'ltr';
        } else if (col.key === 'id_number') {
          td.textContent = vendor.id_number ? toEnglishNumbers(vendor.id_number) : '-';
          td.style.direction = 'ltr';
        } else if (col.key === 'vehicle_registration_number') {
          td.textContent = vendor.vehicle_registration_number ? toEnglishNumbers(vendor.vehicle_registration_number) : '-';
          td.style.direction = 'ltr';
        } else if (col.key === 'vehicle_brand') {
          td.textContent = vendor.vehicle_brand || '-';
        } else if (col.key === 'vehicle_plate_number') {
          td.textContent = vendor.vehicle_plate_number || '-';
          td.style.direction = 'ltr';
        } else if (col.key === 'equipment') {
          const equipment = equipmentData[vendor.id] || [];
          if (equipment.length > 0) {
            td.style.textAlign = 'right';
            td.style.padding = '12px';
            td.style.lineHeight = '1.8';
            td.innerHTML = equipment.map(e => `${toEnglishNumbers(e.quantity.toString())} ${e.name}`).join('<br>');
          } else {
            td.textContent = '-';
          }
        } else if (col.key === 'equipment_images') {
          const equipment = equipmentData[vendor.id] || [];
          const equipmentWithImages = equipment.filter(e => e.image);
          if (equipmentWithImages.length > 0) {
            const imagesContainer = document.createElement('div');
            imagesContainer.style.cssText = `
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              justify-content: center;
              align-items: center;
              padding: 4px;
            `;

            for (const eq of equipmentWithImages) {
              if (eq.image) {
                const base64 = await convertImageToBase64(eq.image);
                if (base64) {
                  const img = document.createElement('img');
                  img.src = base64;
                  img.style.cssText = `
                    width: 60px;
                    height: 60px;
                    object-fit: cover;
                    border-radius: 4px;
                    border: 1px solid #cbd5e1;
                  `;
                  img.title = eq.name;
                  imagesContainer.appendChild(img);
                }
              }
            }

            td.appendChild(imagesContainer);
          } else {
            td.textContent = '-';
          }
        } else if (col.key === 'status') {
          td.textContent = getStatusText(vendor.status);
        } else if (col.key === 'estimated_cost') {
          td.textContent = vendor.estimated_cost ? `${toEnglishNumbers(vendor.estimated_cost.toString())} ريال` : '-';
          td.style.direction = 'ltr';
        } else {
          td.textContent = (vendor[col.key as keyof Vendor] as string) || '-';
        }

        dataRow.appendChild(td);
      }

      tbody.appendChild(dataRow);
    }

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  };

  const createSingleVendorTemplate = async (vendor: Vendor): Promise<HTMLElement> => {
    const container = document.createElement('div');
    container.style.cssText = `
      direction: rtl;
      font-family: 'Cairo', 'Arial', sans-serif;
      padding: 40px;
      background: white;
      min-width: 1000px;
    `;

    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const logoBase64 = await convertImageToBase64('/assets/logo-blue.png');

    const header = document.createElement('div');
    header.style.cssText = `
      position: relative;
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
    `;

    if (logoBase64) {
      const logoImg = document.createElement('img');
      logoImg.src = logoBase64;
      logoImg.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        width: 120px;
        height: auto;
        object-fit: contain;
      `;
      header.appendChild(logoImg);
    }

    const titleDiv = document.createElement('div');
    titleDiv.innerHTML = `
      <h1 style="font-size: 36px; font-weight: 700; color: #1e293b; margin: 0 0 15px 0;">فريق Half Lens</h1>
      <p style="font-size: 15px; color: #64748b; margin: 0;">تاريخ التصدير: ${new Date().toLocaleDateString('en-US')}</p>
    `;
    header.appendChild(titleDiv);

    container.appendChild(header);

    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;

    const thead = document.createElement('thead');
    thead.style.cssText = 'background: #3b82f6;';
    const headerRow = document.createElement('tr');

    const columns: { key: keyof ExportFields; label: string }[] = [];
    if (selectedFields.full_name) columns.push({ key: 'full_name', label: 'الاسم الثلاثي' });
    if (selectedFields.id_image) columns.push({ key: 'id_image', label: 'صورة الهوية' });
    if (selectedFields.vehicle_registration_image) columns.push({ key: 'vehicle_registration_image', label: 'صورة الاستمارة' });
    if (selectedFields.profile_image) columns.push({ key: 'profile_image', label: 'الصورة الشخصية' });
    if (selectedFields.phone) columns.push({ key: 'phone', label: 'رقم الجوال' });
    if (selectedFields.id_number) columns.push({ key: 'id_number', label: 'رقم الهوية' });
    if (selectedFields.vehicle_registration_number) columns.push({ key: 'vehicle_registration_number', label: 'رقم الاستمارة' });
    if (selectedFields.vehicle_brand) columns.push({ key: 'vehicle_brand', label: 'ماركة المركبة' });
    if (selectedFields.vehicle_plate_number) columns.push({ key: 'vehicle_plate_number', label: 'رقم اللوحة' });
    if (selectedFields.equipment) columns.push({ key: 'equipment', label: 'المعدات' });
    if (selectedFields.equipment_images) columns.push({ key: 'equipment_images', label: 'صور المعدات' });
    if (selectedFields.email) columns.push({ key: 'email', label: 'البريد الإلكتروني' });
    if (selectedFields.nationality) columns.push({ key: 'nationality', label: 'الجنسية' });
    if (selectedFields.primary_field) columns.push({ key: 'primary_field', label: 'المجال الأساسي' });
    if (selectedFields.primary_city) columns.push({ key: 'primary_city', label: 'المدينة' });
    if (selectedFields.estimated_cost) columns.push({ key: 'estimated_cost', label: 'التكلفة التقديرية' });
    if (selectedFields.status) columns.push({ key: 'status', label: 'الحالة' });

    columns.forEach(col => {
      const th = document.createElement('th');
      th.style.cssText = `
        padding: 12px;
        text-align: center;
        color: white;
        font-weight: 600;
        font-size: 14px;
        border: 1px solid #2563eb;
        vertical-align: middle;
      `;
      th.textContent = col.label;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const dataRow = document.createElement('tr');
    dataRow.style.cssText = 'background: #f8fafc; height: 110px;';

    for (const col of columns) {
      const td = document.createElement('td');
      td.style.cssText = `
        padding: 10px;
        text-align: center;
        border: 1px solid #e2e8f0;
        font-size: 13px;
        color: #334155;
        vertical-align: middle;
      `;

      if (col.key === 'profile_image' && vendor.profile_image) {
        const base64 = await convertImageToBase64(vendor.profile_image);
        if (base64) {
          const img = document.createElement('img');
          img.src = base64;
          img.style.cssText = `
            width: 95px;
            height: 95px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #cbd5e1;
            margin: 0 auto;
            display: block;
          `;
          td.appendChild(img);
        } else {
          td.textContent = '-';
        }
      } else if (col.key === 'id_image' && vendor.id_image) {
        const base64 = await convertImageToBase64(vendor.id_image);
        if (base64) {
          const img = document.createElement('img');
          img.src = base64;
          img.style.cssText = `
            max-width: 100%;
            max-height: 95px;
            object-fit: contain;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            margin: 0 auto;
            display: block;
          `;
          td.appendChild(img);
        } else {
          td.textContent = '-';
        }
      } else if (col.key === 'phone') {
        td.textContent = toEnglishNumbers(vendor.phone);
        td.style.direction = 'ltr';
      } else if (col.key === 'id_number') {
        td.textContent = vendor.id_number ? toEnglishNumbers(vendor.id_number) : '-';
        td.style.direction = 'ltr';
      } else if (col.key === 'equipment') {
        const equipment = equipmentData[vendor.id] || [];
        if (equipment.length > 0) {
          td.style.textAlign = 'right';
          td.style.padding = '12px';
          td.style.lineHeight = '1.8';
          td.innerHTML = equipment.map(e => `${toEnglishNumbers(e.quantity.toString())} ${e.name}`).join('<br>');
        } else {
          td.textContent = '-';
        }
      } else if (col.key === 'equipment_images') {
        const equipment = equipmentData[vendor.id] || [];
        const equipmentWithImages = equipment.filter(e => e.image);
        if (equipmentWithImages.length > 0) {
          const imagesContainer = document.createElement('div');
          imagesContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            justify-content: center;
            align-items: center;
            padding: 4px;
          `;

          for (const eq of equipmentWithImages) {
            if (eq.image) {
              const base64 = await convertImageToBase64(eq.image);
              if (base64) {
                const img = document.createElement('img');
                img.src = base64;
                img.style.cssText = `
                  width: 60px;
                  height: 60px;
                  object-fit: cover;
                  border-radius: 4px;
                  border: 1px solid #cbd5e1;
                `;
                img.title = eq.name;
                imagesContainer.appendChild(img);
              }
            }
          }

          td.appendChild(imagesContainer);
        } else {
          td.textContent = '-';
        }
      } else if (col.key === 'status') {
        td.textContent = getStatusText(vendor.status);
      } else if (col.key === 'estimated_cost') {
        td.textContent = vendor.estimated_cost ? `${toEnglishNumbers(vendor.estimated_cost.toString())} ريال` : '-';
        td.style.direction = 'ltr';
      } else {
        td.textContent = (vendor[col.key as keyof Vendor] as string) || '-';
      }

      dataRow.appendChild(td);
    }

    tbody.appendChild(dataRow);
    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="تصدير بيانات الموردين إلى PDF">
        <div className="space-y-6">
          <div>
            <p className="text-sm text-slate-600 mb-4">
              اختر الحقول التي تريد تصديرها ({vendors.length} مورد محدد)
            </p>

            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.full_name}
                  onChange={() => toggleField('full_name')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">الاسم الثلاثي</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.phone}
                  onChange={() => toggleField('phone')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">رقم الجوال</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.id_number}
                  onChange={() => toggleField('id_number')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">رقم الهوية</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.profile_image}
                  onChange={() => toggleField('profile_image')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">الصورة الشخصية</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.id_image}
                  onChange={() => toggleField('id_image')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">صورة الهوية</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.vehicle_registration_image}
                  onChange={() => toggleField('vehicle_registration_image')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">صورة استمارة السيارة</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.vehicle_registration_number}
                  onChange={() => toggleField('vehicle_registration_number')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">رقم الاستمارة</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.vehicle_brand}
                  onChange={() => toggleField('vehicle_brand')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">ماركة المركبة</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.vehicle_plate_number}
                  onChange={() => toggleField('vehicle_plate_number')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">رقم اللوحة</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.equipment}
                  onChange={() => toggleField('equipment')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">المعدات</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.equipment_images}
                  onChange={() => toggleField('equipment_images')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">صور المعدات</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.email}
                  onChange={() => toggleField('email')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">البريد الإلكتروني</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.nationality}
                  onChange={() => toggleField('nationality')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">الجنسية</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.primary_field}
                  onChange={() => toggleField('primary_field')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">المجال الأساسي</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.primary_city}
                  onChange={() => toggleField('primary_city')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">المدينة</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.estimated_cost}
                  onChange={() => toggleField('estimated_cost')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">التكلفة التقديرية</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedFields.status}
                  onChange={() => toggleField('status')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium text-sm">الحالة</span>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">إعدادات التصدير</h3>

            <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
              <input
                type="checkbox"
                checked={separatePages}
                onChange={() => setSeparatePages(!separatePages)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-slate-800 font-medium text-sm block">كل مورد في صفحة مستقلة</span>
                <span className="text-slate-600 text-xs">إذا لم تحدد، سيتم عرض جميع الموردين في صفحات متتالية</span>
              </div>
            </label>

            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">
                <strong>حجم الورق:</strong> A4 (أفقي - Landscape)
              </p>
              <p className="text-xs text-slate-600 mt-1">
                <strong>الهوامش:</strong> قياسية (40px من جميع الجوانب)
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleExport}
              disabled={loading || Object.values(selectedFields).every(v => !v)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري التصدير...' : 'تصدير PDF'}
            </button>
          </div>
        </div>
      </Modal>

      <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0 }} />
    </>
  );
};
