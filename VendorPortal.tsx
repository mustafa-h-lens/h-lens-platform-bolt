import { useState, useEffect, useRef } from 'react';
import {
  User, Folder, FileText, Camera, FileArchive,
  LogOut, Menu, X, Sun, Moon, ChevronDown, ChevronUp,
  Save, Plus, Trash2, Loader2, CheckCircle, AlertCircle,
  Lightbulb, Upload
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getTheme } from '../../theme/tokens';
import { toEnglishNumbers } from '../../lib/numberUtils';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface VendorField {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  subcategories?: VendorField[];
}

interface SelectedField {
  id: string;
  field_id: string;
  rate_from: number | null;
  rate_to: number | null;
  currency: string;
  vendor_fields: { name_ar: string; name_en: string };
}

interface Equipment {
  id: string;
  name: string;
  type: string;
  condition?: string;
  quantity: number;
  notes?: string;
  catalog_item_id?: string;
  equipment_catalog?: {
    name: string;
    image_url: string;
    equipment_categories?: { name: string };
  };
}

interface CatalogItem {
  id: string;
  name: string;
  name_en: string | null;
  image_url: string | null;
  equipment_categories?: { name: string };
  equipment_brands?: { name: string };
}

interface Project {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  clients?: { name: string };
  vendor_role?: string;
}

interface Invoice {
  id: string;
  amount_total: number;
  status: string;
  created_at: string;
  projects?: { name: string };
}

interface VendorDoc {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

interface FinancialData {
  id?: string;
  payment_method: 'bank_transfer' | 'cash' | 'other';
  price_includes_tax: boolean;
  bank_name: string;
  beneficiary_name: string;
  iban: string;
  account_number: string;
}

const SAUDI_BANKS = [
  'البنك الأهلي السعودي', 'بنك الرياض', 'بنك الراجحي', 'بنك ساب',
  'البنك السعودي الفرنسي', 'بنك البلاد', 'بنك الجزيرة', 'بنك الإنماء',
  'البنك العربي الوطني', 'مصرف الراجحي',
];

const CONDITIONS = ['ممتازة', 'جيدة', 'مقبولة', 'تحتاج صيانة'];

const NAV_ITEMS = [
  { id: 'profile',   label: 'الملف الشخصي',       icon: User       },
  { id: 'projects',  label: 'مشاريعي',              icon: Folder     },
  { id: 'invoices',  label: 'الفواتير والمدفوعات', icon: FileText   },
  { id: 'equipment', label: 'المعدات',               icon: Camera     },
  { id: 'documents', label: 'المستندات',             icon: FileArchive },
];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:     { label: 'نشط',          color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  in_progress:{ label: 'جارٍ',         color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  completed:  { label: 'مكتمل',        color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  cancelled:  { label: 'ملغي',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  pending:    { label: 'قيد الانتظار', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  paid:       { label: 'مدفوعة',       color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  unpaid:     { label: 'غير مدفوعة',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  partial:    { label: 'جزئية',        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
};

// ─────────────────────────────────────────────────────────────
// MAIN PORTAL
// ─────────────────────────────────────────────────────────────
export const VendorPortal = () => {
  const { vendor, signOut } = useVendor();
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = getTheme(isDarkMode);

  const [page, setPage]         = useState('profile');
  const [drawerOpen, setDrawer] = useState(false);

  const pageTitles: Record<string, string> = {
    profile:   'الملف الشخصي',
    projects:  'مشاريعي',
    invoices:  'الفواتير والمدفوعات',
    equipment: 'المعدات',
    documents: 'المستندات',
  };

  const navigate = (id: string) => { setPage(id); setDrawer(false); };

  // Avatar initials
  const initials = vendor?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('') || '?';

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: theme.background.page,
        fontFamily: 'Tajawal, sans-serif',
        color: theme.text.primary,
      }}
    >
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="hidden md:flex"
        style={{
          width: 240,
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          flexDirection: 'column',
          backgroundColor: '#051A3A',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <SidebarContent page={page} navigate={navigate} initials={initials} vendor={vendor} signOut={signOut} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      </aside>

      {/* ── MOBILE DRAWER ── */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden"
            onClick={() => setDrawer(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }}
          />
          <aside
            className="md:hidden"
            style={{
              position: 'fixed', top: 0, right: 0, width: 240, height: '100vh', zIndex: 50,
              flexDirection: 'column', display: 'flex',
              backgroundColor: '#051A3A',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              animation: 'slideIn 0.25s ease',
            }}
          >
            <SidebarContent page={page} navigate={navigate} initials={initials} vendor={vendor} signOut={signOut} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onClose={() => setDrawer(false)} />
          </aside>
        </>
      )}

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          height: '3.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          borderBottom: `1px solid ${theme.border.default}`,
          backgroundColor: theme.background.card,
          flexShrink: 0,
        }}>
          {/* Mobile menu */}
          <button
            className="md:hidden"
            onClick={() => setDrawer(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.secondary, display: 'flex' }}
          >
            <Menu size={22} />
          </button>

          <h1 style={{ fontSize: '1rem', fontWeight: 600, color: theme.text.primary }} className="hidden md:block">
            {pageTitles[page]}
          </h1>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.secondary, display: 'flex', padding: '0.4rem' }}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700, color: 'white',
            }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {page === 'profile'   && <PageProfile   />}
          {page === 'projects'  && <PageProjects  />}
          {page === 'invoices'  && <PageInvoices  />}
          {page === 'equipment' && <PageEquipment />}
          {page === 'documents' && <PageDocuments />}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SIDEBAR CONTENT
// ─────────────────────────────────────────────────────────────
function SidebarContent({ page, navigate, initials, vendor, signOut, isDarkMode, toggleTheme, onClose }: any) {
  return (
    <>
      {/* Logo + close */}
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <img src="/half_lens_logo_-_color.png" alt="هاف لينس" style={{ height: 28, objectFit: 'contain' }} />
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Vendor mini card */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.72rem', fontWeight: 800, color: 'white',
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {vendor?.full_name || '—'}
            </div>
            <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              {vendor?.primary_city || 'مورد'}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>حساب نشط</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.625rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.625rem 0.75rem', borderRadius: 9, width: '100%',
                background: isActive ? 'rgba(37,99,235,0.18)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
                color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.45)',
                fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 400, cursor: 'pointer',
                textAlign: 'right', transition: 'all 0.18s',
              }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '0.625rem 0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.625rem 0.75rem', borderRadius: 9, width: '100%',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.45)', fontFamily: 'Tajawal, sans-serif',
            fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', textAlign: 'right',
          }}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          {isDarkMode ? 'الوضع المضيء' : 'الوضع الداكن'}
        </button>
        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.625rem 0.75rem', borderRadius: 9, width: '100%',
            background: 'transparent', border: 'none',
            color: '#f87171', fontFamily: 'Tajawal, sans-serif',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right',
          }}
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────
function PageCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <div style={{
      borderRadius: 14, background: theme.background.card,
      border: `1px solid ${theme.border.default}`,
      padding: '1.125rem', ...style,
    }}>
      {children}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 0.875rem',
        borderRadius: '8px 8px 0 0',
        background: active ? theme.background.card : 'transparent',
        border: `1px solid ${active ? theme.border.default : 'transparent'}`,
        borderBottom: 'none',
        color: active ? theme.primary.main : theme.text.muted,
        fontFamily: 'Tajawal, sans-serif', fontSize: '0.8rem',
        fontWeight: active ? 700 : 400, cursor: 'pointer',
        transition: 'all 0.18s', marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 6,
      background: s.bg, color: s.color,
      fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: theme.text.muted, marginBottom: 5 }}>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, dir = 'rtl', type = 'text', disabled = false }: any) {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      dir={dir}
      type={type}
      disabled={disabled}
      style={{
        width: '100%', padding: '0.5625rem 0.75rem',
        borderRadius: 9, background: theme.background.input,
        border: `1px solid ${theme.border.default}`,
        color: theme.text.primary, fontFamily: 'Tajawal, sans-serif',
        fontSize: '0.83rem', outline: 'none', transition: 'border 0.2s',
        opacity: disabled ? 0.6 : 1,
      }}
      onFocus={e => { if (!disabled) e.target.style.borderColor = theme.primary.main; }}
      onBlur={e => { e.target.style.borderColor = theme.border.default; }}
    />
  );
}

function SelectInput({ value, onChange, children, disabled = false }: any) {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      dir="rtl"
      style={{
        width: '100%', padding: '0.5625rem 0.75rem',
        borderRadius: 9, background: theme.background.input,
        border: `1px solid ${theme.border.default}`,
        color: theme.text.primary, fontFamily: 'Tajawal, sans-serif',
        fontSize: '0.83rem', outline: 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </select>
  );
}

function SaveButton({ loading, saved, onClick, label = 'حفظ التغييرات' }: any) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '0.5625rem 1.25rem', borderRadius: 9,
        background: saved
          ? 'linear-gradient(135deg,#059669,#10b981)'
          : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
        border: 'none', color: 'white',
        fontFamily: 'Tajawal, sans-serif', fontSize: '0.83rem',
        fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, transition: 'all 0.25s',
        boxShadow: saved
          ? '0 3px 14px rgba(16,185,129,0.3)'
          : '0 3px 14px rgba(37,99,235,0.3)',
      }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
      {loading ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ' : label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE: PROFILE
// ─────────────────────────────────────────────────────────────
function PageProfile() {
  const { vendor, refreshVendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showSuccess, showError } = useNotification();

  const [tab, setTab] = useState<'info' | 'services' | 'financial'>('info');

  // ── Info state ──
  const [infoForm, setInfoForm] = useState({
    full_name: vendor?.full_name || '',
    phone: vendor?.phone || '',
    email: vendor?.email || '',
    nationality: vendor?.nationality || '',
    primary_city: vendor?.primary_city || '',
    id_number: vendor?.id_number || '',
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);

  // ── Services state ──
  const [allFields, setAllFields] = useState<VendorField[]>([]);
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [savingFields, setSavingFields] = useState(false);
  const [savedFields, setSavedFields] = useState(false);

  // ── Financial state ──
  const [financial, setFinancial] = useState<FinancialData>({
    payment_method: 'bank_transfer',
    price_includes_tax: false,
    bank_name: '', beneficiary_name: '', iban: '', account_number: '',
  });
  const [savingFin, setSavingFin] = useState(false);
  const [savedFin, setSavedFin] = useState(false);

  useEffect(() => {
    if (vendor?.id) {
      fetchFields();
      fetchFinancial();
    }
  }, [vendor?.id]);

  const fetchFields = async () => {
    setLoadingFields(true);
    try {
      const [fieldsRes, selectedRes] = await Promise.all([
        supabase.from('vendor_fields').select('*').is('parent_id', null).eq('is_active', true).order('display_order'),
        supabase.from('vendor_selected_fields').select('*, vendor_fields(name_ar, name_en)').eq('vendor_id', vendor!.id),
      ]);

      if (fieldsRes.data) {
        // Fetch subcategories
        const { data: subs } = await supabase
          .from('vendor_fields')
          .select('*')
          .not('parent_id', 'is', null)
          .eq('is_active', true)
          .order('display_order');

        const withSubs = fieldsRes.data.map(f => ({
          ...f,
          subcategories: subs?.filter(s => s.parent_id === f.id) || [],
        }));
        setAllFields(withSubs);
      }
      if (selectedRes.data) setSelectedFields(selectedRes.data as SelectedField[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFields(false);
    }
  };

  const fetchFinancial = async () => {
    const { data } = await supabase
      .from('vendor_financial_data')
      .select('*')
      .eq('vendor_id', vendor!.id)
      .maybeSingle();
    if (data) setFinancial(data);
  };

  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ ...infoForm, updated_at: new Date().toISOString() })
        .eq('id', vendor!.id);
      if (error) throw error;
      showSuccess('تم حفظ البيانات الشخصية');
      setSavedInfo(true);
      setTimeout(() => setSavedInfo(false), 2500);
      await refreshVendor();
    } catch (err) {
      showError('حدث خطأ أثناء الحفظ');
    } finally {
      setSavingInfo(false);
    }
  };

  const toggleField = (fieldId: string) => {
    const exists = selectedFields.find(sf => sf.field_id === fieldId);
    if (exists) {
      setSelectedFields(prev => prev.filter(sf => sf.field_id !== fieldId));
    } else {
      setSelectedFields(prev => [...prev, {
        id: '', field_id: fieldId, rate_from: null, rate_to: null,
        currency: 'SAR', vendor_fields: { name_ar: '', name_en: '' },
      }]);
    }
  };

  const updateRate = (fieldId: string, key: 'rate_from' | 'rate_to', val: string) => {
    setSelectedFields(prev => prev.map(sf =>
      sf.field_id === fieldId ? { ...sf, [key]: val ? Number(toEnglishNumbers(val)) : null } : sf
    ));
  };

  const saveServices = async () => {
    setSavingFields(true);
    try {
      // Delete old, insert new
      await supabase.from('vendor_selected_fields').delete().eq('vendor_id', vendor!.id);
      if (selectedFields.length > 0) {
        const inserts = selectedFields.map(sf => ({
          vendor_id: vendor!.id,
          field_id: sf.field_id,
          rate_from: sf.rate_from,
          rate_to: sf.rate_to,
          currency: sf.currency || 'SAR',
        }));
        const { error } = await supabase.from('vendor_selected_fields').insert(inserts);
        if (error) throw error;
      }
      showSuccess('تم حفظ الخدمات والتسعير');
      setSavedFields(true);
      setTimeout(() => setSavedFields(false), 2500);
      await fetchFields();
    } catch (err) {
      showError('حدث خطأ أثناء الحفظ');
    } finally {
      setSavingFields(false);
    }
  };

  const saveFinancial = async () => {
    setSavingFin(true);
    try {
      const payload = { ...financial, vendor_id: vendor!.id, updated_at: new Date().toISOString() };
      if (financial.id) {
        const { error } = await supabase.from('vendor_financial_data').update(payload).eq('id', financial.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('vendor_financial_data').insert(payload).select().single();
        if (error) throw error;
        if (data) setFinancial(data);
      }
      showSuccess('تم حفظ البيانات المالية');
      setSavedFin(true);
      setTimeout(() => setSavedFin(false), 2500);
    } catch (err) {
      showError('حدث خطأ أثناء الحفظ');
    } finally {
      setSavingFin(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', borderBottom: `1px solid ${theme.border.default}` }}>
        <TabButton active={tab === 'info'}      onClick={() => setTab('info')}>      👤 البيانات الشخصية</TabButton>
        <TabButton active={tab === 'services'}  onClick={() => setTab('services')}>  🛠 الخدمات والتسعير</TabButton>
        <TabButton active={tab === 'financial'} onClick={() => setTab('financial')}> 💳 البيانات المالية</TabButton>
      </div>

      {/* ── INFO ── */}
      {tab === 'info' && (
        <PageCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <FieldLabel>👤 الاسم الكامل</FieldLabel>
                <TextInput value={infoForm.full_name} onChange={(e: any) => setInfoForm(f => ({ ...f, full_name: e.target.value }))} placeholder="الاسم كما في الهوية" />
              </div>
              <div>
                <FieldLabel>📱 رقم الجوال</FieldLabel>
                <TextInput value={infoForm.phone} onChange={(e: any) => setInfoForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="05XXXXXXXX" dir="ltr" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <FieldLabel>✉️ البريد الإلكتروني</FieldLabel>
                <TextInput value={infoForm.email} onChange={(e: any) => setInfoForm(f => ({ ...f, email: e.target.value }))} placeholder="name@email.com" dir="ltr" />
              </div>
              <div>
                <FieldLabel>🪪 رقم الهوية</FieldLabel>
                <TextInput value={infoForm.id_number} onChange={(e: any) => setInfoForm(f => ({ ...f, id_number: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="1XXXXXXXXX" dir="ltr" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <FieldLabel>🌍 الجنسية</FieldLabel>
                <TextInput value={infoForm.nationality} onChange={(e: any) => setInfoForm(f => ({ ...f, nationality: e.target.value }))} placeholder="الجنسية" />
              </div>
              <div>
                <FieldLabel>🏙️ مدينة الإقامة</FieldLabel>
                <TextInput value={infoForm.primary_city} onChange={(e: any) => setInfoForm(f => ({ ...f, primary_city: e.target.value }))} placeholder="المدينة" />
              </div>
            </div>
            <SaveButton loading={savingInfo} saved={savedInfo} onClick={saveInfo} />
          </div>
        </PageCard>
      )}

      {/* ── SERVICES ── */}
      {tab === 'services' && (
        <PageCard>
          {loadingFields ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: theme.text.muted }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allFields.map(cat => (
                <div key={cat.id}>
                  {/* Category header */}
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.text.muted, marginBottom: 6, padding: '4px 0', borderBottom: `1px solid ${theme.border.divider}` }}>
                    {cat.name_ar}
                  </div>
                  {/* Subcategories */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 8 }}>
                    {(cat.subcategories || []).map(sub => {
                      const selected = selectedFields.find(sf => sf.field_id === sub.id);
                      return (
                        <div key={sub.id} style={{
                          borderRadius: 10,
                          border: `1px solid ${selected ? 'rgba(59,130,246,0.3)' : theme.border.default}`,
                          background: selected ? 'rgba(37,99,235,0.05)' : theme.background.filter,
                          overflow: 'hidden', transition: 'all 0.18s',
                        }}>
                          <div
                            onClick={() => toggleField(sub.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.625rem 0.75rem', cursor: 'pointer' }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                              background: selected ? theme.primary.main : 'transparent',
                              border: `1.5px solid ${selected ? theme.primary.main : theme.border.hover}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}>
                              {selected && <span style={{ color: 'white', fontSize: '0.6rem' }}>✓</span>}
                            </div>
                            <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: selected ? 600 : 400, color: selected ? theme.primary.main : theme.text.secondary }}>
                              {sub.name_ar}
                            </span>
                            {selected && selected.rate_from && (
                              <span style={{ fontSize: '0.71rem', color: '#10b981', fontWeight: 600 }}>
                                {selected.rate_from}{selected.rate_to ? `–${selected.rate_to}` : ''} ﷼
                              </span>
                            )}
                          </div>
                          {selected && (
                            <div style={{ padding: '0 0.75rem 0.625rem', display: 'flex', gap: 8, borderTop: `1px solid ${theme.border.divider}` }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.68rem', color: theme.text.muted, marginBottom: 3 }}>من (﷼)</div>
                                <TextInput
                                  value={selected.rate_from ?? ''}
                                  onChange={(e: any) => { e.stopPropagation(); updateRate(sub.id, 'rate_from', e.target.value); }}
                                  placeholder="0"
                                  dir="ltr"
                                  type="number"
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.68rem', color: theme.text.muted, marginBottom: 3 }}>إلى (﷼)</div>
                                <TextInput
                                  value={selected.rate_to ?? ''}
                                  onChange={(e: any) => { e.stopPropagation(); updateRate(sub.id, 'rate_to', e.target.value); }}
                                  placeholder="0"
                                  dir="ltr"
                                  type="number"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: 4 }}>
                <SaveButton loading={savingFields} saved={savedFields} onClick={saveServices} />
              </div>
            </div>
          )}
        </PageCard>
      )}

      {/* ── FINANCIAL ── */}
      {tab === 'financial' && (
        <PageCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div>
              <FieldLabel>🏦 اسم البنك</FieldLabel>
              <SelectInput value={financial.bank_name} onChange={(e: any) => setFinancial(f => ({ ...f, bank_name: e.target.value }))}>
                <option value="">اختر البنك</option>
                {SAUDI_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>👤 اسم المستفيد</FieldLabel>
              <TextInput value={financial.beneficiary_name} onChange={(e: any) => setFinancial(f => ({ ...f, beneficiary_name: e.target.value }))} placeholder="كما في كشف الحساب" />
            </div>
            <div>
              <FieldLabel>🔢 رقم الآيبان (SA + 22 رقم)</FieldLabel>
              <div style={{
                display: 'flex', borderRadius: 9, overflow: 'hidden',
                border: `1px solid ${theme.border.default}`, direction: 'ltr',
              }}>
                <div style={{
                  padding: '0 11px', background: 'rgba(37,99,235,0.12)',
                  borderLeft: '1px solid rgba(59,130,246,0.25)',
                  display: 'flex', alignItems: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: theme.primary.main }}>SA</span>
                </div>
                <input
                  value={financial.iban.startsWith('SA') ? financial.iban.slice(2) : financial.iban}
                  maxLength={22}
                  onChange={e => setFinancial(f => ({ ...f, iban: 'SA' + e.target.value.replace(/\D/g, '').slice(0, 22) }))}
                  placeholder="0380000000608010167519"
                  dir="ltr"
                  style={{
                    flex: 1, padding: '0.5625rem 0.75rem',
                    background: theme.background.input, border: 'none',
                    color: theme.text.primary, fontFamily: 'Tajawal, sans-serif',
                    fontSize: '0.82rem', outline: 'none', letterSpacing: '0.04em',
                  }}
                />
              </div>
            </div>
            <div>
              <FieldLabel>💳 طريقة الدفع</FieldLabel>
              <SelectInput value={financial.payment_method} onChange={(e: any) => setFinancial(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="cash">نقدي</option>
                <option value="other">أخرى</option>
              </SelectInput>
            </div>
            <SaveButton loading={savingFin} saved={savedFin} onClick={saveFinancial} />
          </div>
        </PageCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE: PROJECTS
// ─────────────────────────────────────────────────────────────
function PageProjects() {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [expanded, setExpanded]   = useState<string | null>(null);

  useEffect(() => { fetchProjects(); }, [vendor?.id]);

  const fetchProjects = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      // Get projects linked via production_tasks or project_vendors if that table exists
      const { data, error } = await supabase
        .from('production_tasks')
        .select(`
          id, name, status, created_at,
          projects(id, name, status, start_date, end_date),
          clients(name)
        `)
        .eq('assigned_vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Map to project shape
        const mapped = data
          .filter((t: any) => t.projects)
          .map((t: any) => ({
            id: t.projects.id,
            name: t.projects.name,
            status: t.projects.status || t.status,
            start_date: t.projects.start_date,
            end_date: t.projects.end_date,
            vendor_role: t.name,
            clients: t.clients,
          }));
        // Deduplicate by project id
        const unique = mapped.filter((p: Project, i: number, arr: Project[]) => arr.findIndex(x => x.id === p.id) === i);
        setProjects(unique);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);
  const stats = {
    active: projects.filter(p => ['in_progress', 'active'].includes(p.status)).length,
    done:   projects.filter(p => p.status === 'completed').length,
    total:  projects.length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
        {[
          { l: 'جارية',   v: stats.active, c: '#3b82f6' },
          { l: 'مكتملة',  v: stats.done,   c: '#10b981' },
          { l: 'الإجمالي',v: stats.total,  c: theme.text.muted },
        ].map((s, i) => (
          <PageCard key={i} style={{ padding: '0.75rem 0.875rem', borderRight: `3px solid ${s.c}` }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: '0.71rem', color: theme.text.muted, marginTop: 2 }}>{s.l}</div>
          </PageCard>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[{ k: 'all', l: 'الكل' }, { k: 'in_progress', l: '⚡ جارية' }, { k: 'completed', l: '✅ مكتملة' }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{
              padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Tajawal, sans-serif', fontSize: '0.78rem',
              fontWeight: filter === f.k ? 700 : 400, transition: 'all 0.15s',
              background: filter === f.k ? 'rgba(37,99,235,0.12)' : theme.background.filter,
              border: `1px solid ${filter === f.k ? 'rgba(59,130,246,0.3)' : theme.border.default}`,
              color: filter === f.k ? theme.primary.main : theme.text.muted,
            }}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: theme.text.muted }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <div>جارٍ التحميل...</div>
        </div>
      ) : filtered.length === 0 ? (
        <PageCard style={{ textAlign: 'center', padding: '2rem', color: theme.text.muted }}>
          <Folder size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          <div>لا توجد مشاريع بعد</div>
        </PageCard>
      ) : (
        filtered.map(p => (
          <PageCard key={p.id} style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}
            onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: theme.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: theme.text.muted, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {p.clients && <span>👤 {p.clients.name}</span>}
                  {p.start_date && <span>📅 {new Date(p.start_date).toLocaleDateString('ar-SA')}</span>}
                  {p.vendor_role && (
                    <span style={{ padding: '1px 7px', borderRadius: 5, background: 'rgba(37,99,235,0.08)', color: theme.primary.main, fontWeight: 600 }}>
                      🎭 {p.vendor_role}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={p.status} />
              {expanded === p.id ? <ChevronUp size={16} style={{ color: theme.text.muted, flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: theme.text.muted, flexShrink: 0 }} />}
            </div>
            {expanded === p.id && (
              <div style={{ padding: '0.625rem 1rem', borderTop: `1px solid ${theme.border.default}`, background: theme.background.filter }}>
                <span style={{ fontSize: '0.74rem', color: theme.text.muted }}>
                  تم إسناد هذا المشروع إليك — دورك: <strong style={{ color: theme.primary.main }}>{p.vendor_role || 'مورد'}</strong>
                </span>
              </div>
            )}
          </PageCard>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE: INVOICES
// ─────────────────────────────────────────────────────────────
function PageInvoices() {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { fetchInvoices(); }, [vendor?.id]);

  const fetchInvoices = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select('*, projects(name)')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });
      if (!error && data) setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount_total, 0);
  const totalPending = invoices.filter(i => i.status !== 'paid').reduce((a, i) => a + i.amount_total, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { l: '💰 إجمالي المحصّل', v: totalPaid,    c: '#10b981' },
          { l: '⏳ قيد الانتظار',   v: totalPending, c: '#f59e0b' },
        ].map((s, i) => (
          <PageCard key={i} style={{ borderRight: `3px solid ${s.c}` }}>
            <div style={{ fontSize: '0.7rem', color: theme.text.muted, marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: s.c, direction: 'ltr' }}>
              {s.v.toLocaleString('ar-SA')} ﷼
            </div>
          </PageCard>
        ))}
      </div>

      {/* List */}
      <PageCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '0.625rem 0.875rem', borderBottom: `1px solid ${theme.border.default}`,
          fontSize: '0.71rem', fontWeight: 700, color: theme.text.muted,
          display: 'grid', gridTemplateColumns: '1fr auto',
        }}>
          <span>المشروع</span>
          <span>الحالة</span>
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: theme.text.muted }}>
            <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto' }} />
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: theme.text.muted }}>لا توجد فواتير بعد</div>
        ) : (
          invoices.map(inv => (
            <div key={inv.id} style={{
              padding: '0.75rem 0.875rem',
              borderBottom: `1px solid ${theme.border.default}`,
              display: 'grid', gridTemplateColumns: '1fr auto',
              alignItems: 'center', gap: 10, transition: 'background 0.14s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.background.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: theme.text.primary }}>{inv.projects?.name || '—'}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.text.secondary, direction: 'ltr', marginTop: 1 }}>
                  {inv.amount_total?.toLocaleString('ar-SA')} ﷼
                </div>
                <div style={{ fontSize: '0.67rem', color: theme.text.muted, marginTop: 1 }}>
                  {new Date(inv.created_at).toLocaleDateString('ar-SA')}
                </div>
              </div>
              <StatusBadge status={inv.status} />
            </div>
          ))
        )}
      </PageCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE: EQUIPMENT
// ─────────────────────────────────────────────────────────────
function PageEquipment() {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showSuccess, showError } = useNotification();

  const [equipment, setEquipment]   = useState<Equipment[]>([]);
  const [catalog, setCatalog]       = useState<CatalogItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [adding, setAdding]         = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggText, setSuggText]     = useState('');
  const [suggSent, setSuggSent]     = useState(false);

  const [newEq, setNewEq] = useState({
    catalog_item_id: '',
    condition: 'ممتازة',
    quantity: 1,
    notes: '',
  });

  useEffect(() => {
    if (vendor?.id) { fetchEquipment(); fetchCatalog(); }
  }, [vendor?.id]);

  const fetchEquipment = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vendor_equipment')
      .select(`*, equipment_catalog(name, image_url, equipment_categories(name))`)
      .eq('vendor_id', vendor!.id)
      .order('created_at', { ascending: false });
    if (data) setEquipment(data);
    setLoading(false);
  };

  const fetchCatalog = async () => {
    const { data } = await supabase
      .from('equipment_catalog')
      .select(`id, name, name_en, image_url, equipment_categories(name), equipment_brands(name)`)
      .eq('is_active', true)
      .order('name');
    if (data) setCatalog(data as CatalogItem[]);
  };

  const addEquipment = async () => {
    if (!newEq.catalog_item_id) { showError('اختر المعدة أولاً'); return; }
    try {
      const catalogItem = catalog.find(c => c.id === newEq.catalog_item_id);
      const { error } = await supabase.from('vendor_equipment').insert({
        vendor_id: vendor!.id,
        catalog_item_id: newEq.catalog_item_id,
        name: catalogItem?.name || '',
        type: catalogItem?.equipment_categories?.name || '',
        condition: newEq.condition,
        quantity: newEq.quantity,
        notes: newEq.notes || null,
      });
      if (error) throw error;
      showSuccess('تمت إضافة المعدة');
      setAdding(false);
      setNewEq({ catalog_item_id: '', condition: 'ممتازة', quantity: 1, notes: '' });
      await fetchEquipment();
    } catch (err) {
      showError('حدث خطأ أثناء الإضافة');
    }
  };

  const deleteEquipment = async (id: string) => {
    const { error } = await supabase.from('vendor_equipment').delete().eq('id', id);
    if (!error) { showSuccess('تم الحذف'); setEquipment(prev => prev.filter(e => e.id !== id)); }
    else showError('حدث خطأ أثناء الحذف');
  };

  const sendSuggestion = () => {
    if (!suggText.trim()) return;
    // TODO: send to admin notification or supabase
    setSuggSent(true); setSuggText('');
    setTimeout(() => { setSuggSent(false); setSuggesting(false); }, 2500);
  };

  const availableCatalog = catalog.filter(c => !equipment.find(e => e.catalog_item_id === c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: theme.text.primary }}>📷 المعدات</span>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button onClick={() => { setSuggesting(v => !v); setAdding(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, background: theme.background.filter, border: `1px solid ${theme.border.default}`, color: theme.text.secondary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            <Lightbulb size={15} /> اقتراح معدة
          </button>
          <button onClick={() => { setAdding(v => !v); setSuggesting(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 12px rgba(37,99,235,0.3)' }}>
            {adding ? <X size={15} /> : <Plus size={15} />}
            {adding ? 'إلغاء' : 'إضافة معدة'}
          </button>
        </div>
      </div>

      {/* Suggest form */}
      {suggesting && (
        <PageCard style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', marginBottom: 10 }}>💡 اقتراح معدة غير موجودة في القائمة</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <TextInput value={suggText} onChange={(e: any) => setSuggText(e.target.value)} placeholder="اكتب اسم المعدة أو تفاصيلها..." />
            <button onClick={sendSuggestion} style={{ padding: '0.5625rem 0.875rem', borderRadius: 9, background: 'linear-gradient(135deg,#d97706,#f59e0b)', border: 'none', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.79rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>إرسال</button>
          </div>
          {suggSent && <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={14} /> تم إرسال الاقتراح — شكراً!</div>}
        </PageCard>
      )}

      {/* Add form */}
      {adding && (
        <PageCard style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.primary.main, marginBottom: 11 }}>➕ إضافة معدة من قائمة المنصة</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div>
              <FieldLabel>المعدة</FieldLabel>
              <SelectInput value={newEq.catalog_item_id} onChange={(e: any) => setNewEq(n => ({ ...n, catalog_item_id: e.target.value }))}>
                <option value="">اختر المعدة</option>
                {availableCatalog.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.equipment_categories?.name ? `${c.equipment_categories.name} — ` : ''}{c.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <div>
                <FieldLabel>الحالة</FieldLabel>
                <SelectInput value={newEq.condition} onChange={(e: any) => setNewEq(n => ({ ...n, condition: e.target.value }))}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </SelectInput>
              </div>
              <div>
                <FieldLabel>الكمية</FieldLabel>
                <TextInput value={newEq.quantity} onChange={(e: any) => setNewEq(n => ({ ...n, quantity: Math.max(1, Number(e.target.value)) }))} type="number" dir="ltr" />
              </div>
            </div>
            <div>
              <FieldLabel>ملاحظات (اختياري)</FieldLabel>
              <TextInput value={newEq.notes} onChange={(e: any) => setNewEq(n => ({ ...n, notes: e.target.value }))} placeholder="أي تفاصيل إضافية..." />
            </div>
            <button onClick={addEquipment} style={{ padding: '0.625rem', borderRadius: 9, background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer' }}>
              ✅ إضافة
            </button>
          </div>
        </PageCard>
      )}

      {/* Equipment list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: theme.text.muted }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} />
        </div>
      ) : equipment.length === 0 ? (
        <PageCard style={{ textAlign: 'center', padding: '2rem', color: theme.text.muted }}>
          <Camera size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          <div>لا توجد معدات بعد</div>
        </PageCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {equipment.map(eq => (
            <PageCard key={eq.id} style={{ padding: '0.75rem 0.875rem', display: 'flex', alignItems: 'center', gap: 11 }}>
              {eq.equipment_catalog?.image_url ? (
                <img src={eq.equipment_catalog.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>📷</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: theme.text.primary }}>{eq.name}</div>
                <div style={{ fontSize: '0.69rem', color: theme.text.muted, marginTop: 2, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {eq.type && <span>{eq.type}</span>}
                  {eq.condition && <span>· {eq.condition}</span>}
                  {eq.quantity > 1 && <span>· الكمية: {eq.quantity}</span>}
                </div>
              </div>
              <button onClick={() => deleteEquipment(eq.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.status.error.main, padding: '4px 7px', borderRadius: 6, display: 'flex' }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.status.error.light)}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <Trash2 size={16} />
              </button>
            </PageCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE: DOCUMENTS
// ─────────────────────────────────────────────────────────────
function PageDocuments() {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showSuccess, showError } = useNotification();

  const [docs, setDocs]       = useState<VendorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>('contract');

  const DOC_TYPES = [
    { k: 'contract',    l: 'عقد',        ic: '📄' },
    { k: 'nda',         l: 'NDA',        ic: '🔒' },
    { k: 'certificate', l: 'شهادة',      ic: '🏅' },
    { k: 'other',       l: 'أخرى',       ic: '📎' },
  ];

  useEffect(() => { fetchDocs(); }, [vendor?.id]);

  const fetchDocs = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendor_documents')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });
    if (data) setDocs(data);
    setLoading(false);
  };

  const uploadDoc = async (file: File) => {
    if (!vendor?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `vendor-docs/${vendor.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('vendor-documents').upload(path, file);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('vendor-documents').getPublicUrl(path);

      const { error: dbErr } = await supabase.from('vendor_documents').insert({
        vendor_id: vendor.id,
        document_type: docType,
        file_url: publicUrl,
        file_name: file.name,
        uploaded_by: vendor.id, // using vendor id; adjust if you have a separate auth user id
      });
      if (dbErr) throw dbErr;
      showSuccess('تم رفع المستند بنجاح');
      await fetchDocs();
    } catch (err) {
      showError('حدث خطأ أثناء رفع المستند');
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id: string) => {
    const { error } = await supabase.from('vendor_documents').delete().eq('id', id);
    if (!error) { showSuccess('تم الحذف'); setDocs(prev => prev.filter(d => d.id !== id)); }
    else showError('حدث خطأ أثناء الحذف');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Upload section */}
      <PageCard>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: theme.text.secondary, marginBottom: 10 }}>رفع مستند جديد</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {DOC_TYPES.map(dt => (
            <button key={dt.k} onClick={() => setDocType(dt.k)}
              style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: '0.78rem', fontWeight: docType === dt.k ? 700 : 400, transition: 'all 0.15s', background: docType === dt.k ? 'rgba(37,99,235,0.1)' : theme.background.filter, border: `1px solid ${docType === dt.k ? 'rgba(59,130,246,0.3)' : theme.border.default}`, color: docType === dt.k ? theme.primary.main : theme.text.muted }}>
              {dt.ic} {dt.l}
            </button>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.625rem 1.25rem', borderRadius: 9, background: uploading ? theme.background.filter : 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: uploading ? theme.text.muted : 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer' }}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'جارٍ الرفع...' : 'اختر ملفاً لرفعه'}
        </button>
      </PageCard>

      {/* Docs list */}
      <PageCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid ${theme.border.default}`, fontSize: '0.74rem', fontWeight: 700, color: theme.text.muted }}>
          المستندات المرفوعة ({docs.length})
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: theme.text.muted }}>
            <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto' }} />
          </div>
        ) : docs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: theme.text.muted }}>لا توجد مستندات بعد</div>
        ) : (
          docs.map(doc => {
            const dt = DOC_TYPES.find(d => d.k === doc.document_type);
            return (
              <div key={doc.id} style={{ padding: '0.75rem 0.875rem', borderBottom: `1px solid ${theme.border.default}`, display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.14s' }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.background.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                  {dt?.ic || '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: theme.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</div>
                  <div style={{ fontSize: '0.67rem', color: theme.text.muted, marginTop: 1 }}>{dt?.l} · {new Date(doc.created_at).toLocaleDateString('ar-SA')}</div>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: theme.primary.main, display: 'flex', padding: '4px 6px' }} title="تحميل">
                  <FileText size={16} />
                </a>
                <button onClick={() => deleteDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.status.error.main, padding: '4px 6px', borderRadius: 5, display: 'flex' }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.status.error.light)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </PageCard>
    </div>
  );
}
