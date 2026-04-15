import { useState, useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
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
  status: boolean;
}

interface VendorEquipment {
  id: string;
  name: string;
  vendor_id: string;
  quantity: number;
  image?: string | null;
  catalog_item?: { image_url?: string | null } | null;
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
        .select('vendor_id, name, id, quantity, image, catalog_item:equipment_catalog(image_url)')
        .in('vendor_id', vendorIds);

      if (data) {
        const normalized = data.map(item => ({
          ...item,
          image: item.image || item.catalog_item?.image_url || null,
        }));
        const grouped = normalized.reduce((acc, item) => {
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

  // Preload Arabic font for PDF rendering
  const ensureFontLoaded = async () => {
    // Add font link if not already in document
    if (!document.querySelector('link[href*="Cairo"]')) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    // Wait for the font to be ready
    try {
      await document.fonts.load('400 16px Cairo');
      await document.fonts.load('600 16px Cairo');
      await document.fonts.load('700 16px Cairo');
    } catch {
      // Fallback: wait a fixed time
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      // ── CSV / XLSX export ──
      if (exportFormat === 'csv' || exportFormat === 'xlsx') {
        const columns: { key: string; label: string }[] = fieldLabelsOrder
          .filter(f => selectedFields[f.key] && f.key !== 'profile_image' && f.key !== 'id_image' && f.key !== 'vehicle_registration_image' && f.key !== 'equipment_images')
          .map(f => ({ key: f.key, label: f.label }));

        const header = columns.map(c => c.label);
        const rows = vendors.map(v => columns.map(c => {
          if (c.key === 'status') return getStatusText(v.status);
          if (c.key === 'equipment') {
            const eq = equipmentData[v.id] || [];
            return eq.map(e => `${e.quantity} ${e.name}`).join(' | ') || '-';
          }
          return (v as any)[c.key] || '-';
        }));

        // BOM for UTF-8 Arabic support
        const BOM = '\uFEFF';
        const csvContent = BOM + [header.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

        if (exportFormat === 'csv') {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `فريق هاف لينس_${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // XLSX: generate as TSV (opens in Excel with proper columns)
          const tsvContent = BOM + [header.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
          const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `فريق هاف لينس_${new Date().toISOString().split('T')[0]}.xls`;
          a.click();
          URL.revokeObjectURL(url);
        }

        showSuccess('تم تصدير البيانات بنجاح');
        onSuccess();
        return;
      }

      // ── PDF export ──
      // Ensure Arabic font is loaded before rendering
      await ensureFontLoaded();
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Calculate rows per page based on content: images need ~110px height, text ~45px
      const hasImages = selectedFields.profile_image || selectedFields.id_image || selectedFields.vehicle_registration_image || selectedFields.equipment_images;
      const ROWS_PER_PAGE = separatePages ? 1 : (hasImages ? 4 : 8);

      if (printRef.current) {
        // Pre-warm: render a test Arabic element to force font rasterization
        printRef.current.innerHTML = '';
        const warmup = document.createElement('div');
        warmup.style.cssText = 'font-family: Tahoma, Arial, sans-serif; font-size: 14px; font-weight: 700; direction: rtl; position: absolute; white-space: nowrap;';
        warmup.textContent = 'الاسم الثلاثي صورة الهوية رقم الجوال المعدات الجنسية المدينة الحالة البريد الإلكتروني';
        printRef.current.appendChild(warmup);
        await new Promise(r => setTimeout(r, 300));
        // Capture warmup to force font rasterization in html2canvas
        await html2canvas(warmup, { scale: 1, backgroundColor: '#ffffff' });

        for (let pageIdx = 0; pageIdx < Math.ceil(vendors.length / ROWS_PER_PAGE); pageIdx++) {
          const pageVendors = vendors.slice(pageIdx * ROWS_PER_PAGE, (pageIdx + 1) * ROWS_PER_PAGE);

          printRef.current.innerHTML = '';

          if (separatePages) {
            const template = await createSingleVendorTemplate(pageVendors[0]);
            printRef.current.appendChild(template);
          } else {
            const template = await createAllVendorsTemplate(pageVendors, pageIdx === 0);
            printRef.current.appendChild(template);
          }

          await new Promise(resolve => setTimeout(resolve, 400));

          const canvas = await html2canvas(printRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            letterRendering: true,
          });

          const imgWidth = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const imgData = canvas.toDataURL('image/png');

          if (pageIdx > 0) doc.addPage();
          doc.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, 210));
        }
      }

      doc.save(`فريق هاف لينس_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccess('تم تصدير البيانات بنجاح');
      onSuccess();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showError('حدث خطأ أثناء تصدير البيانات');
    } finally {
      setLoading(false);
    }
  };

  const createAllVendorsTemplate = async (pageVendors?: Vendor[], showHeader: boolean = true): Promise<HTMLElement> => {
    const vendorsToRender = pageVendors || vendors;
    const container = document.createElement('div');
    container.style.cssText = `
      direction: rtl;
      font-family: 'Tahoma', 'Arial', 'Cairo', sans-serif;
      padding: 40px;
      background: white;
      min-width: 1200px;
    `;

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

    if (showHeader) container.appendChild(header);

    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin-top: ${showHeader ? '20px' : '0'};
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;

    const columns: { key: keyof ExportFields; label: string }[] = fieldLabelsOrder.filter(f => selectedFields[f.key]);

    // Always show table header on every page
    const thead = document.createElement('thead');
    thead.style.cssText = 'background: #1e3a5f;';
    const headerRow = document.createElement('tr');

    columns.forEach(col => {
      const th = document.createElement('th');
      th.style.cssText = `
        padding: 14px 12px;
        text-align: center;
        color: white;
        font-weight: 700;
        font-size: 14px;
        border: 1px solid #1e3a5f;
        vertical-align: middle;
        font-family: Tahoma, Arial, sans-serif;
        direction: rtl;
        unicode-bidi: embed;
        letter-spacing: 0;
        word-spacing: 0;
      `;
      th.textContent = col.label;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (let i = 0; i < vendorsToRender.length; i++) {
      const vendor = vendorsToRender[i];
      const dataRow = document.createElement('tr');
      dataRow.style.cssText = `
        ${i % 2 === 0 ? 'background: #f8fafc;' : 'background: white;'}
        height: 110px;
      `;

      for (const col of columns) {
        const td = document.createElement('td');
        td.style.cssText = `
          padding: 10px 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          color: #334155;
          vertical-align: middle;
          font-family: Tahoma, Arial, sans-serif;
          direction: rtl;
          unicode-bidi: embed;
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
      font-family: 'Tahoma', 'Arial', 'Cairo', sans-serif;
      padding: 40px;
      background: white;
      min-width: 1000px;
    `;

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

    const columns: { key: keyof ExportFields; label: string }[] = fieldLabelsOrder.filter(f => selectedFields[f.key]);

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
        font-family: Tahoma, Arial, sans-serif;
        direction: rtl;
        unicode-bidi: embed;
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

  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('all');

  const selectedFieldCount = Object.values(selectedFields).filter(Boolean).length;
  const selectAllFields = () => setSelectedFields(Object.fromEntries(Object.keys(selectedFields).map(k => [k, true])) as ExportFields);
  const clearAllFields = () => setSelectedFields(Object.fromEntries(Object.keys(selectedFields).map(k => [k, false])) as ExportFields);

  const fieldLabelsOrder: { key: keyof ExportFields; label: string }[] = [
    { key: 'full_name', label: 'اسم المورد' },
    { key: 'phone', label: 'رقم الهاتف' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'primary_field', label: 'التصنيف / الخدمة' },
    { key: 'nationality', label: 'الجنسية' },
    { key: 'primary_city', label: 'المدينة' },
    { key: 'status', label: 'الحالة' },
    { key: 'id_number', label: 'رقم الهوية' },
    { key: 'profile_image', label: 'الصورة الشخصية' },
    { key: 'id_image', label: 'صورة الهوية' },
    { key: 'vehicle_registration_number', label: 'رقم الاستمارة' },
    { key: 'vehicle_brand', label: 'ماركة المركبة' },
    { key: 'vehicle_plate_number', label: 'رقم اللوحة' },
    { key: 'vehicle_registration_image', label: 'صورة الاستمارة' },
    { key: 'equipment', label: 'المعدات' },
    { key: 'equipment_images', label: 'صور المعدات' },
  ];
  const fieldLabels = Object.fromEntries(fieldLabelsOrder.map(f => [f.key, f.label])) as Record<keyof ExportFields, string>;

  const scopeCount = exportScope === 'all' ? vendors.length : exportScope === 'selected' ? 0 : vendors.length;

  return (
    <>
      <div className="modal-overlay show" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
          <div className="modal-hdr">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="card-icon ci-green"><Download size={18} /></div>
              <div>
                <div className="modal-ttl">تصدير الموردين</div>
                <div className="modal-sub">اختر صيغة التصدير والحقول المطلوبة</div>
              </div>
            </div>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>

          <div className="modal-body">
            {/* File Format */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textAlign: 'right' }}>صيغة الملف</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {([
                  { id: 'pdf' as const, label: 'PDF', sub: 'تقرير جاهز للطباعة', color: '#ef4444' },
                  { id: 'csv' as const, label: 'CSV', sub: 'نص مفصول بفواصل', color: '#10b981' },
                  { id: 'xlsx' as const, label: 'Excel', sub: 'جداول بيانات مع تنسيق', color: '#2563eb' },
                ]).map(fmt => (
                  <div
                    key={fmt.id}
                    onClick={() => setExportFormat(fmt.id)}
                    style={{
                      padding: '16px 12px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                      textAlign: 'center', transition: 'var(--transition-fast)',
                      border: `2px solid ${exportFormat === fmt.id ? 'var(--accent)' : 'var(--border-soft)'}`,
                      background: exportFormat === fmt.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 'var(--radius-md)', margin: '0 auto 8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${fmt.color}20`, color: fmt.color, fontSize: 11, fontWeight: 800,
                      border: `1px solid ${fmt.color}40`,
                    }}>{fmt.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmt.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PDF Layout (only when PDF) */}
            {exportFormat === 'pdf' && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textAlign: 'right' }}>تخطيط PDF</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <div
                    onClick={() => setSeparatePages(false)}
                    style={{
                      padding: '18px 14px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'center',
                      border: `2px solid ${!separatePages ? 'var(--accent)' : 'var(--border-soft)'}`,
                      background: !separatePages ? 'var(--accent-glow)' : 'var(--bg-card)',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.5 }}>☰</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>جدول موحد</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>جميع الموردين في جدول واحد</div>
                  </div>
                  <div
                    onClick={() => setSeparatePages(true)}
                    style={{
                      padding: '18px 14px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'center',
                      border: `2px solid ${separatePages ? 'var(--accent)' : 'var(--border-soft)'}`,
                      background: separatePages ? 'var(--accent-glow)' : 'var(--bg-card)',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.5 }}>☷</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>صفحة لكل مورد</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>تفاصيل كاملة لكل مورد في صفحة مستقلة</div>
                  </div>
                </div>
              </div>
            )}

            {/* Fields Selection */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>الحقول المطلوبة</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={selectAllFields} style={{ fontSize: 12, color: 'var(--accent-lighter)', background: 'none', border: 'none', cursor: 'pointer' }}>تحديد الكل</button>
                  <button onClick={clearAllFields} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء الكل</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {fieldLabelsOrder.map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <input type="checkbox" className="tbl-check" checked={selectedFields[key]} onChange={() => toggleField(key)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Summary */}
            <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>◉</span> ملخص التصدير
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span>الصيغة: <strong style={{ color: 'var(--text-primary)' }}>{exportFormat === 'pdf' ? 'PDF' : exportFormat === 'csv' ? 'CSV' : 'Excel (XLSX)'}</strong></span>
                <span>السجلات: <strong style={{ color: 'var(--text-primary)' }}>{toEnglishNumbers(vendors.length.toString())} مورد</strong></span>
                <span>الحقول: <strong style={{ color: 'var(--text-primary)' }}>{toEnglishNumbers(selectedFieldCount.toString())} حقل</strong></span>
              </div>
            </div>
          </div>

          <div className="modal-foot">
            <button className="btn btn-secondary" onClick={onClose} disabled={loading}>إلغاء</button>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={loading || selectedFieldCount === 0}
              style={{ background: 'var(--success)', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}
            >
              {loading ? 'جاري التصدير...' : <><Download size={15} /> بدء التصدير</>}
            </button>
          </div>
        </div>
      </div>

      <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0 }} />
    </>
  );
};
