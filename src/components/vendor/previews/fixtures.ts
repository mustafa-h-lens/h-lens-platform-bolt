// Client-side demo fixtures shown to pending / revision vendors so they can
// learn the platform before approval. These are NOT inserted into any DB
// table — no is_demo column, no seeded rows. The IDs start with `demo-` so
// any accidental use with a real query would obviously fail.

export interface DemoProject {
  id: string;
  code: string;
  name: string;
  client: string;
  city: string;
  status: 'قيد التنفيذ' | 'مكتمل' | 'مجدول';
  startDate: string;
  endDate: string;
  budget: number; // SAR
  role: string;
}

export interface DemoInvoice {
  id: string;
  number: string;
  projectName: string;
  amount: number;
  vat: number;
  total: number;
  status: 'مدفوعة' | 'معلقة' | 'مرفوضة';
  issuedAt: string;
  dueAt: string;
}

export interface DemoEquipment {
  id: string;
  name: string;
  brand: string;
  category: string;
  serial: string;
  dailyRate: number;
  available: boolean;
}

export interface DemoPurchaseOrder {
  id: string;
  number: string;
  projectName: string;
  items: number;
  total: number;
  status: 'قيد التحضير' | 'مُعتمد' | 'مستلم';
  issuedAt: string;
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'demo-project-1',
    code: 'PRJ-2026-014',
    name: 'تصوير حفل افتتاح معرض الرياض الدولي',
    client: 'وزارة الثقافة (مثال)',
    city: 'الرياض',
    status: 'قيد التنفيذ',
    startDate: '2026-05-12',
    endDate: '2026-05-14',
    budget: 48500,
    role: 'مصور فوتوغرافي',
  },
  {
    id: 'demo-project-2',
    code: 'PRJ-2026-011',
    name: 'فيديو ترويجي لموسم الرياض',
    client: 'هيئة الترفيه (مثال)',
    city: 'الرياض',
    status: 'مجدول',
    startDate: '2026-06-04',
    endDate: '2026-06-07',
    budget: 72000,
    role: 'مخرج فيديو',
  },
  {
    id: 'demo-project-3',
    code: 'PRJ-2026-008',
    name: 'تغطية مؤتمر التحول الرقمي',
    client: 'شركة الاتصالات (مثال)',
    city: 'جدة',
    status: 'مكتمل',
    startDate: '2026-03-18',
    endDate: '2026-03-20',
    budget: 26750,
    role: 'مصور فيديو',
  },
];

export const DEMO_INVOICES: DemoInvoice[] = [
  {
    id: 'demo-invoice-1',
    number: 'INV-2026-0321',
    projectName: 'تغطية مؤتمر التحول الرقمي',
    amount: 23260.87,
    vat: 3489.13,
    total: 26750,
    status: 'مدفوعة',
    issuedAt: '2026-03-22',
    dueAt: '2026-04-05',
  },
  {
    id: 'demo-invoice-2',
    number: 'INV-2026-0344',
    projectName: 'تصوير حفل افتتاح معرض الرياض الدولي',
    amount: 13478.26,
    vat: 2021.74,
    total: 15500,
    status: 'معلقة',
    issuedAt: '2026-04-15',
    dueAt: '2026-05-01',
  },
  {
    id: 'demo-invoice-3',
    number: 'INV-2026-0350',
    projectName: 'فيديو ترويجي لموسم الرياض',
    amount: 20869.57,
    vat: 3130.43,
    total: 24000,
    status: 'معلقة',
    issuedAt: '2026-04-18',
    dueAt: '2026-05-15',
  },
];

export const DEMO_EQUIPMENT: DemoEquipment[] = [
  { id: 'demo-eq-1', name: 'كاميرا سينما 6K', brand: 'Sony FX6', category: 'كاميرات', serial: 'SN-FX6-00124', dailyRate: 1800, available: true },
  { id: 'demo-eq-2', name: 'عدسة زاوية واسعة', brand: 'Canon 16-35mm f/2.8', category: 'عدسات', serial: 'LN-1635-0441', dailyRate: 450, available: true },
  { id: 'demo-eq-3', name: 'إضاءة LED لوحية', brand: 'Aputure 600D', category: 'إضاءة', serial: 'LT-A600-0277', dailyRate: 380, available: false },
  { id: 'demo-eq-4', name: 'ميكروفون لاسلكي', brand: 'Sennheiser G4', category: 'صوت', serial: 'AU-G4-1902', dailyRate: 220, available: true },
];

export const DEMO_PURCHASE_ORDERS: DemoPurchaseOrder[] = [
  {
    id: 'demo-po-1',
    number: 'PO-2026-0112',
    projectName: 'تصوير حفل افتتاح معرض الرياض الدولي',
    items: 6,
    total: 12400,
    status: 'مُعتمد',
    issuedAt: '2026-05-08',
  },
  {
    id: 'demo-po-2',
    number: 'PO-2026-0119',
    projectName: 'فيديو ترويجي لموسم الرياض',
    items: 4,
    total: 8600,
    status: 'قيد التحضير',
    issuedAt: '2026-05-28',
  },
];
