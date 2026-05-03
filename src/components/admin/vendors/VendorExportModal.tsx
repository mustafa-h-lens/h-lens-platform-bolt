import { useState, useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';

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
  passport_image: boolean;
  visa_image: boolean;
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
  passport_image: false,
  visa_image: false,
  equipment: false,
  equipment_images: false,
  email: false,
  nationality: false,
  primary_field: false,
  primary_city: false,
  status: false,
};

export const VendorExportModal = ({ vendors: initialVendors, onClose, onSuccess }: VendorExportModalProps) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [loadingAll, setLoadingAll] = useState(false);
  const isSelectedSubset = initialVendors.length > 0 && initialVendors.length <= 20;
  const [selectedFields, setSelectedFields] = useState<ExportFields>(defaultFields);
  const [separatePages, setSeparatePages] = useState(false);
  const [equipmentData, setEquipmentData] = useState<Record<string, VendorEquipment[]>>({});
  const [travelDocs, setTravelDocs] = useState<Record<string, { passport_file?: string; visa_file?: string }>>({});
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
    // Only fetch ALL if no specific selection was made (export all)
    if (!isSelectedSubset) {
      fetchAllVendors();
    }
  }, []);

  const fetchAllVendors = async () => {
    setLoadingAll(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .in('status', ['active', 'inactive', 'blocked'])
        .order('created_at', { ascending: false });
      if (!error && data) setVendors(data);
    } catch (e) {
      console.error('Error fetching all vendors:', e);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    fetchEquipmentData();
    fetchTravelDocs();
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

  const fetchTravelDocs = async () => {
    if (vendors.length === 0) return;
    try {
      const vendorIds = vendors.map(v => v.id);
      const grouped: Record<string, { passport_file?: string; visa_file?: string }> = {};

      // Source 1: vendor_travel_documents (admin-entered)
      const { data: travelData } = await supabase
        .from('vendor_travel_documents')
        .select('vendor_id, document_type, passport_file, visa_file')
        .in('vendor_id', vendorIds);
      if (travelData) {
        travelData.forEach(doc => {
          if (!grouped[doc.vendor_id]) grouped[doc.vendor_id] = {};
          if (doc.document_type === 'passport' && doc.passport_file) grouped[doc.vendor_id].passport_file = doc.passport_file;
          if (doc.document_type === 'visa' && doc.visa_file) grouped[doc.vendor_id].visa_file = doc.visa_file;
        });
      }

      // Source 2: vendor_documents (uploaded files) — fill gaps
      const { data: docData } = await supabase
        .from('vendor_documents')
        .select('vendor_id, document_type, file_url')
        .in('vendor_id', vendorIds)
        .in('document_type', ['passport', 'other', 'visa_usa']);
      if (docData) {
        docData.forEach(doc => {
          if (!grouped[doc.vendor_id]) grouped[doc.vendor_id] = {};
          if (doc.document_type === 'passport' && !grouped[doc.vendor_id].passport_file) {
            grouped[doc.vendor_id].passport_file = doc.file_url;
          }
          if ((doc.document_type === 'other' || doc.document_type === 'visa_usa') && !grouped[doc.vendor_id].visa_file) {
            grouped[doc.vendor_id].visa_file = doc.file_url;
          }
        });
      }

      setTravelDocs(grouped);
    } catch (error) {
      console.error('Error fetching travel docs:', error);
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) return '';
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

  const formatDate = () => new Date().toISOString().split('T')[0];

  const csvVisibleColumns = () =>
    fieldLabelsOrder.filter(
      f =>
        selectedFields[f.key] &&
        f.key !== 'profile_image' &&
        f.key !== 'id_image' &&
        f.key !== 'vehicle_registration_image' &&
        f.key !== 'passport_image' &&
        f.key !== 'visa_image' &&
        f.key !== 'equipment_images',
    );

  const cellValue = (v: Vendor, key: keyof ExportFields): string => {
    if (key === 'status') return getStatusText(v.status);
    if (key === 'equipment') {
      const eq = equipmentData[v.id] || [];
      if (eq.length === 0) return '-';
      return eq.map(e => `${toEnglishNumbers(String(e.quantity))} × ${e.name}`).join('\n');
    }
    if (key === 'phone') return toEnglishNumbers(v.phone || '') || '-';
    if (key === 'id_number') return v.id_number ? toEnglishNumbers(v.id_number) : '-';
    if (key === 'vehicle_registration_number')
      return v.vehicle_registration_number ? toEnglishNumbers(v.vehicle_registration_number) : '-';
    if (key === 'vehicle_plate_number')
      return v.vehicle_plate_number ? toEnglishNumbers(v.vehicle_plate_number) : '-';
    return ((v as unknown as Record<string, string | undefined>)[key] as string) || '-';
  };

  const exportCsv = () => {
    const cols = csvVisibleColumns();
    const BOM = '﻿';
    const meta = [
      [`فريق Half Lens`],
      [`تاريخ التصدير: ${formatDate()}`],
      [`عدد السجلات: ${toEnglishNumbers(String(vendors.length))}`],
      [],
    ];
    const header = cols.map(c => c.label);
    const dataRows = vendors.map(v => cols.map(c => cellValue(v, c.key)));
    const all = [...meta, header, ...dataRows];
    const csv =
      BOM +
      all
        .map(row =>
          row
            .map(cell => {
              const s = String(cell ?? '');
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(','),
        )
        .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `فريق هاف لينس_${formatDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchAsBuffer = async (
    url: string,
  ): Promise<{ buffer: ArrayBuffer; ext: 'png' | 'jpeg' | 'gif' } | null> => {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const ext: 'png' | 'jpeg' | 'gif' = ct.includes('png')
        ? 'png'
        : ct.includes('gif')
          ? 'gif'
          : 'jpeg';
      const buf = await r.arrayBuffer();
      return { buffer: buf, ext };
    } catch {
      return null;
    }
  };

  const exportXlsx = async () => {
    const allCols = fieldLabelsOrder.filter(f => selectedFields[f.key]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Half Lens';
    wb.created = new Date();

    const ws = wb.addWorksheet('فريق Half Lens', {
      views: [{ state: 'frozen', ySplit: 5, rightToLeft: true }],
      properties: { defaultRowHeight: 22 },
    });

    const widthFor = (key: keyof ExportFields): number => {
      switch (key) {
        case 'profile_image':
        case 'id_image':
        case 'vehicle_registration_image':
        case 'passport_image':
        case 'visa_image':
          return 18;
        case 'equipment_images':
          return 50;
        case 'equipment':
          return 36;
        case 'full_name':
        case 'email':
          return 28;
        case 'phone':
        case 'id_number':
        case 'vehicle_plate_number':
        case 'vehicle_registration_number':
          return 18;
        default:
          return 20;
      }
    };
    ws.columns = allCols.map(c => ({ key: c.key, width: widthFor(c.key) }));

    const lastColLetter = ws.getColumn(allCols.length).letter;
    ws.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = ws.getCell('A1');
    titleCell.value = 'فريق Half Lens';
    titleCell.font = { name: 'Cairo', size: 22, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
    ws.getRow(1).height = 36;

    ws.mergeCells(`A2:${lastColLetter}2`);
    const subCell = ws.getCell('A2');
    subCell.value = `تاريخ التصدير: ${formatDate()}    |    عدد الفريق: ${toEnglishNumbers(String(vendors.length))}`;
    subCell.font = { name: 'Cairo', size: 11, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
    ws.getRow(2).height = 22;

    ws.mergeCells(`A3:${lastColLetter}3`);
    const ruleCell = ws.getCell('A3');
    ruleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    ws.getRow(3).height = 4;

    ws.getRow(4).height = 8;

    const headerRow = ws.getRow(5);
    allCols.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.label;
      cell.font = { name: 'Cairo', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        readingOrder: 'rtl',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1E3A5F' } },
        bottom: { style: 'thin', color: { argb: 'FF1E3A5F' } },
        left: { style: 'thin', color: { argb: 'FF1E3A5F' } },
        right: { style: 'thin', color: { argb: 'FF1E3A5F' } },
      };
    });
    headerRow.height = 30;

    const hasImages =
      selectedFields.profile_image ||
      selectedFields.id_image ||
      selectedFields.vehicle_registration_image ||
      selectedFields.equipment_images;

    const imageUrls = new Set<string>();
    for (const v of vendors) {
      if (selectedFields.profile_image && v.profile_image) imageUrls.add(v.profile_image);
      if (selectedFields.id_image && v.id_image) imageUrls.add(v.id_image);
      if (selectedFields.vehicle_registration_image && v.vehicle_registration_image)
        imageUrls.add(v.vehicle_registration_image);
      if (selectedFields.passport_image && travelDocs[v.id]?.passport_file)
        imageUrls.add(travelDocs[v.id].passport_file!);
      if (selectedFields.visa_image && travelDocs[v.id]?.visa_file)
        imageUrls.add(travelDocs[v.id].visa_file!);
      if (selectedFields.equipment_images) {
        (equipmentData[v.id] || []).forEach(e => {
          if (e.image) imageUrls.add(e.image);
        });
      }
    }
    const imageMap = new Map<string, { buffer: ArrayBuffer; ext: 'png' | 'jpeg' | 'gif' }>();
    await Promise.all(
      Array.from(imageUrls).map(async url => {
        const r = await fetchAsBuffer(url);
        if (r) imageMap.set(url, r);
      }),
    );

    const DATA_START_ROW = 6;
    for (let i = 0; i < vendors.length; i++) {
      const v = vendors[i];
      const rowIdx = DATA_START_ROW + i;
      const row = ws.getRow(rowIdx);
      const isAlt = i % 2 === 1;

      row.height = hasImages ? 78 : 24;

      for (let c = 0; c < allCols.length; c++) {
        const col = allCols[c];
        const cell = row.getCell(c + 1);

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
          readingOrder: 'rtl',
        };
        cell.font = { name: 'Cairo', size: 11, color: { argb: 'FF334155' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isAlt ? 'FFFFFFFF' : 'FFF8FAFC' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (col.key === 'status') {
          cell.value = getStatusText(v.status);
          const statusColor =
            v.status === 'active'
              ? 'FF10B981'
              : v.status === 'blocked'
                ? 'FFEF4444'
                : 'FF64748B';
          cell.font = { name: 'Cairo', size: 11, bold: true, color: { argb: statusColor } };
        } else if (col.key === 'profile_image' && v.profile_image && imageMap.has(v.profile_image)) {
          const img = imageMap.get(v.profile_image)!;
          const id = wb.addImage({ buffer: img.buffer, extension: img.ext });
          ws.addImage(id, {
            tl: { col: c + 0.1, row: rowIdx - 1 + 0.05 },
            ext: { width: 70, height: 70 },
            editAs: 'oneCell',
          });
          cell.value = '';
        } else if (col.key === 'id_image' && v.id_image && imageMap.has(v.id_image)) {
          const img = imageMap.get(v.id_image)!;
          const id = wb.addImage({ buffer: img.buffer, extension: img.ext });
          ws.addImage(id, {
            tl: { col: c + 0.05, row: rowIdx - 1 + 0.05 },
            ext: { width: 110, height: 70 },
            editAs: 'oneCell',
          });
          cell.value = '';
        } else if (
          col.key === 'vehicle_registration_image' &&
          v.vehicle_registration_image &&
          imageMap.has(v.vehicle_registration_image)
        ) {
          const img = imageMap.get(v.vehicle_registration_image)!;
          const id = wb.addImage({ buffer: img.buffer, extension: img.ext });
          ws.addImage(id, {
            tl: { col: c + 0.05, row: rowIdx - 1 + 0.05 },
            ext: { width: 110, height: 70 },
            editAs: 'oneCell',
          });
          cell.value = '';
        } else if (col.key === 'passport_image' && travelDocs[v.id]?.passport_file && imageMap.has(travelDocs[v.id].passport_file!)) {
          const img = imageMap.get(travelDocs[v.id].passport_file!)!;
          const id = wb.addImage({ buffer: img.buffer, extension: img.ext });
          ws.addImage(id, {
            tl: { col: c + 0.05, row: rowIdx - 1 + 0.05 },
            ext: { width: 110, height: 70 },
            editAs: 'oneCell',
          });
          cell.value = '';
        } else if (col.key === 'visa_image' && travelDocs[v.id]?.visa_file && imageMap.has(travelDocs[v.id].visa_file!)) {
          const img = imageMap.get(travelDocs[v.id].visa_file!)!;
          const id = wb.addImage({ buffer: img.buffer, extension: img.ext });
          ws.addImage(id, {
            tl: { col: c + 0.05, row: rowIdx - 1 + 0.05 },
            ext: { width: 110, height: 70 },
            editAs: 'oneCell',
          });
          cell.value = '';
        } else if (col.key === 'equipment_images') {
          const eq = (equipmentData[v.id] || []).filter(e => e.image && imageMap.has(e.image!));
          if (eq.length === 0) {
            cell.value = '-';
          } else {
            const slot = 60;
            const gap = 4;
            for (let k = 0; k < Math.min(eq.length, 5); k++) {
              const e = eq[k];
              const img = imageMap.get(e.image!)!;
              const id = wb.addImage({ buffer: img.buffer, extension: img.ext });
              ws.addImage(id, {
                tl: {
                  col: c + 0.05 + (k * (slot + gap)) / 320,
                  row: rowIdx - 1 + 0.05,
                },
                ext: { width: slot, height: slot },
                editAs: 'oneCell',
              });
            }
            cell.value = eq.length > 5 ? `+${eq.length - 5}` : '';
          }
        } else if (col.key === 'equipment') {
          const eq = equipmentData[v.id] || [];
          if (eq.length === 0) {
            cell.value = '-';
          } else {
            cell.value = eq
              .map(e => `${toEnglishNumbers(String(e.quantity))} × ${e.name}`)
              .join('\n');
            row.height = Math.max(row.height || 24, 18 + eq.length * 16);
          }
        } else if (col.key === 'phone') {
          cell.value = toEnglishNumbers(v.phone || '') || '-';
          cell.alignment = { ...cell.alignment, readingOrder: 'ltr' };
        } else if (col.key === 'id_number') {
          cell.value = v.id_number ? toEnglishNumbers(v.id_number) : '-';
          cell.alignment = { ...cell.alignment, readingOrder: 'ltr' };
        } else if (col.key === 'vehicle_registration_number') {
          cell.value = v.vehicle_registration_number
            ? toEnglishNumbers(v.vehicle_registration_number)
            : '-';
          cell.alignment = { ...cell.alignment, readingOrder: 'ltr' };
        } else if (col.key === 'vehicle_plate_number') {
          cell.value = v.vehicle_plate_number ? toEnglishNumbers(v.vehicle_plate_number) : '-';
          cell.alignment = { ...cell.alignment, readingOrder: 'ltr' };
        } else if (
          col.key === 'profile_image' ||
          col.key === 'id_image' ||
          col.key === 'vehicle_registration_image' ||
          col.key === 'passport_image' ||
          col.key === 'visa_image'
        ) {
          cell.value = '-';
        } else {
          cell.value = ((v as unknown as Record<string, string | undefined>)[col.key] as string) || '-';
        }
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `فريق هاف لينس_${formatDate()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (Object.values(selectedFields).every(v => !v)) {
      showError('يرجى اختيار حقل واحد على الأقل');
      return;
    }
    if (loadingAll || vendors.length === 0) {
      showError('جاري تحميل البيانات، يرجى الانتظار...');
      return;
    }

    setLoading(true);
    savePreferences();

    try {
      // ── CSV / XLSX export ──
      if (exportFormat === 'csv' || exportFormat === 'xlsx') {
        if (exportFormat === 'xlsx') {
          await exportXlsx();
        } else {
          exportCsv();
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
      const hasImages = selectedFields.profile_image || selectedFields.id_image || selectedFields.vehicle_registration_image || selectedFields.passport_image || selectedFields.visa_image || selectedFields.equipment_images;
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
            img.style.cssText = `max-width:100%;max-height:95px;object-fit:contain;border-radius:4px;border:1px solid #cbd5e1;margin:0 auto;display:block;`;
            td.appendChild(img);
          } else {
            td.textContent = '-';
          }
        } else if (col.key === 'passport_image' && travelDocs[vendor.id]?.passport_file) {
          const base64 = await convertImageToBase64(travelDocs[vendor.id].passport_file!);
          if (base64) {
            const img = document.createElement('img');
            img.src = base64;
            img.style.cssText = `max-width:100%;max-height:95px;object-fit:contain;border-radius:4px;border:1px solid #cbd5e1;margin:0 auto;display:block;`;
            td.appendChild(img);
          } else {
            td.textContent = '-';
          }
        } else if (col.key === 'visa_image' && travelDocs[vendor.id]?.visa_file) {
          const base64 = await convertImageToBase64(travelDocs[vendor.id].visa_file!);
          if (base64) {
            const img = document.createElement('img');
            img.src = base64;
            img.style.cssText = `max-width:100%;max-height:95px;object-fit:contain;border-radius:4px;border:1px solid #cbd5e1;margin:0 auto;display:block;`;
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
    container.style.cssText = `direction:rtl;font-family:Tahoma,Arial,sans-serif;padding:40px;background:white;min-width:900px;max-width:1000px;`;

    const logoBase64 = await convertImageToBase64('/assets/logo-blue.png');
    const columns = fieldLabelsOrder.filter(f => selectedFields[f.key]);

    // Helper to render an image or return null
    const renderImg = async (url: string | undefined, w: string, h: string, round = '6px') => {
      if (!url) return null;
      const b64 = await convertImageToBase64(url);
      if (!b64) return null;
      const img = document.createElement('img');
      img.src = b64;
      img.style.cssText = `width:${w};height:${h};object-fit:cover;border-radius:${round};border:1px solid #e2e8f0;`;
      return img;
    };

    // ── Header with logo ──
    const header = document.createElement('div');
    header.style.cssText = `display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1e3a5f;`;
    const titleDiv = document.createElement('div');
    titleDiv.innerHTML = `<div style="font-size:28px;font-weight:700;color:#1e293b;">ملف المورد</div><div style="font-size:12px;color:#94a3b8;margin-top:4px;">تاريخ التصدير: ${new Date().toLocaleDateString('en-US')}</div>`;
    header.appendChild(titleDiv);
    if (logoBase64) {
      const logoImg = document.createElement('img');
      logoImg.src = logoBase64;
      logoImg.style.cssText = `width:100px;height:auto;object-fit:contain;`;
      header.appendChild(logoImg);
    }
    container.appendChild(header);

    // ── Profile section: photo + basic info ──
    const profileSection = document.createElement('div');
    profileSection.style.cssText = `display:flex;gap:24px;align-items:flex-start;margin-bottom:24px;padding:20px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;`;

    // Profile image
    if (selectedFields.profile_image) {
      const profileImg = await renderImg(vendor.profile_image, '110px', '110px', '10px');
      if (profileImg) {
        profileImg.style.flexShrink = '0';
        profileSection.appendChild(profileImg);
      }
    }

    // Info grid
    const infoGrid = document.createElement('div');
    infoGrid.style.cssText = `flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:12px 24px;`;

    const textFields: { key: keyof ExportFields; label: string }[] = columns.filter(c =>
      !['profile_image','id_image','vehicle_registration_image','passport_image','visa_image','equipment','equipment_images'].includes(c.key)
    );

    for (const field of textFields) {
      const cell = document.createElement('div');
      let value = '-';
      if (field.key === 'phone') value = toEnglishNumbers(vendor.phone || '');
      else if (field.key === 'id_number') value = vendor.id_number ? toEnglishNumbers(vendor.id_number) : '-';
      else if (field.key === 'status') value = getStatusText(vendor.status);
      else if (field.key === 'vehicle_registration_number') value = vendor.vehicle_registration_number ? toEnglishNumbers(vendor.vehicle_registration_number) : '-';
      else if (field.key === 'vehicle_plate_number') value = vendor.vehicle_plate_number ? toEnglishNumbers(vendor.vehicle_plate_number) : '-';
      else value = (vendor[field.key as keyof Vendor] as string) || '-';

      cell.innerHTML = `<div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">${field.label}</div><div style="font-size:14px;font-weight:600;color:#1e293b;direction:${['phone','id_number','vehicle_registration_number','vehicle_plate_number'].includes(field.key) ? 'ltr;text-align:left' : 'rtl'}">${value}</div>`;
      infoGrid.appendChild(cell);
    }
    profileSection.appendChild(infoGrid);
    container.appendChild(profileSection);

    // ── Documents section: ID, Passport, Visa side by side ──
    const docKeys = ['id_image', 'passport_image', 'visa_image', 'vehicle_registration_image'] as const;
    const activeDocKeys = docKeys.filter(k => selectedFields[k]);

    if (activeDocKeys.length > 0) {
      const docsSection = document.createElement('div');
      docsSection.style.cssText = `margin-bottom:24px;`;
      const docsTitle = document.createElement('div');
      docsTitle.style.cssText = `font-size:15px;font-weight:700;color:#1e3a5f;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;`;
      docsTitle.textContent = 'الوثائق والمستندات';
      docsSection.appendChild(docsTitle);

      const docsGrid = document.createElement('div');
      docsGrid.style.cssText = `display:grid;grid-template-columns:repeat(${Math.min(activeDocKeys.length, 3)},1fr);gap:16px;`;

      const docLabels: Record<string, string> = {
        id_image: 'الهوية الوطنية',
        passport_image: 'جواز السفر',
        visa_image: 'التأشيرة',
        vehicle_registration_image: 'استمارة المركبة',
      };

      for (const key of activeDocKeys) {
        let url: string | undefined;
        if (key === 'id_image') url = vendor.id_image;
        else if (key === 'passport_image') url = travelDocs[vendor.id]?.passport_file;
        else if (key === 'visa_image') url = travelDocs[vendor.id]?.visa_file;
        else if (key === 'vehicle_registration_image') url = vendor.vehicle_registration_image;

        const card = document.createElement('div');
        card.style.cssText = `background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;`;
        const label = document.createElement('div');
        label.style.cssText = `font-size:12px;font-weight:600;color:#475569;margin-bottom:10px;`;
        label.textContent = docLabels[key] || key;
        card.appendChild(label);

        if (url) {
          const b64 = await convertImageToBase64(url);
          if (b64) {
            const img = document.createElement('img');
            img.src = b64;
            img.style.cssText = `width:100%;height:160px;object-fit:contain;border-radius:6px;`;
            card.appendChild(img);
          } else {
            card.innerHTML += `<div style="height:160px;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:13px;">غير متوفر</div>`;
          }
        } else {
          card.innerHTML += `<div style="height:160px;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:13px;">غير متوفر</div>`;
        }
        docsGrid.appendChild(card);
      }
      docsSection.appendChild(docsGrid);
      container.appendChild(docsSection);
    }

    // ── Equipment section ──
    if (selectedFields.equipment || selectedFields.equipment_images) {
      const equipment = equipmentData[vendor.id] || [];
      if (equipment.length > 0) {
        const eqSection = document.createElement('div');
        const eqTitle = document.createElement('div');
        eqTitle.style.cssText = `font-size:15px;font-weight:700;color:#1e3a5f;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;`;
        eqTitle.textContent = `المعدات (${toEnglishNumbers(equipment.length.toString())})`;
        eqSection.appendChild(eqTitle);

        if (selectedFields.equipment_images) {
          const eqGrid = document.createElement('div');
          eqGrid.style.cssText = `display:grid;grid-template-columns:repeat(6,1fr);gap:10px;`;
          for (const eq of equipment) {
            const eqCard = document.createElement('div');
            eqCard.style.cssText = `text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;`;
            if (eq.image) {
              const b64 = await convertImageToBase64(eq.image);
              if (b64) {
                const img = document.createElement('img');
                img.src = b64;
                img.style.cssText = `width:100%;height:70px;object-fit:contain;border-radius:4px;margin-bottom:4px;`;
                eqCard.appendChild(img);
              }
            }
            const name = document.createElement('div');
            name.style.cssText = `font-size:10px;color:#475569;line-height:1.3;overflow:hidden;`;
            name.textContent = eq.name;
            eqCard.appendChild(name);
            eqGrid.appendChild(eqCard);
          }
          eqSection.appendChild(eqGrid);
        } else {
          const eqList = document.createElement('div');
          eqList.style.cssText = `display:grid;grid-template-columns:repeat(3,1fr);gap:6px 16px;font-size:13px;color:#334155;line-height:1.8;`;
          equipment.forEach(e => {
            const item = document.createElement('div');
            item.textContent = `• ${e.name}`;
            eqList.appendChild(item);
          });
          eqSection.appendChild(eqList);
        }
        container.appendChild(eqSection);
      }
    }

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
    { key: 'passport_image', label: 'صورة الجواز' },
    { key: 'visa_image', label: 'صورة الفيزا' },
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
