import { useState, useEffect } from 'react';
import { ArrowRight, LayoutDashboard, User, Plane, Package, DollarSign, FileText, FolderOpen, Pencil } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { VendorDashboard } from './vendor-tabs/VendorDashboard';
import { VendorPersonalInfo } from './vendor-tabs/VendorPersonalInfo';
import { VendorTravelDocs } from './vendor-tabs/VendorTravelDocs';
import { VendorEquipment } from './vendor-tabs/VendorEquipment';
import { VendorFinancialData } from './vendor-tabs/VendorFinancialData';
import { VendorInvoices } from './vendor-tabs/VendorInvoices';
import { VendorDocuments } from './vendor-tabs/VendorDocuments';

interface Vendor {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  profile_image?: string;
  id_number?: string;
  id_expiry_date?: string;
  nationality?: string;
  primary_city?: string;
  available_other_cities?: boolean;
  other_cities?: string[];
  status: string;
  internal_notes?: string;
  primary_field?: string;
  created_at: string;
  updated_at: string;
}

interface VendorDetailsProps {
  vendorId: string;
  onBack: () => void;
  initialTab?: string | null;
  onTabChange?: (tab: string | null) => void;
}

const VALID_VENDOR_TABS = ['dashboard', 'personal', 'travel', 'equipment', 'financial', 'invoices', 'documents'];

const getStatusBadge = (status: string): { label: string; className: string } => {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'موثق', className: 'badge badge-green' },
    inactive: { label: 'غير نشط', className: 'badge badge-gray' },
    blocked: { label: 'محظور', className: 'badge badge-red' },
    pending_approval: { label: 'بانتظار الموافقة', className: 'badge badge-amber' },
  };
  return map[status] || map.active;
};

const VENDOR_COLORS = [
  { bg: 'var(--accent-glow)', color: 'var(--accent-lighter)' },
  { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
  { bg: 'var(--warning-bg)', color: 'var(--warning-text)' },
  { bg: 'var(--success-bg)', color: 'var(--success-text)' },
  { bg: 'var(--info-bg)', color: 'var(--info-text)' },
];

const getVendorColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return VENDOR_COLORS[Math.abs(hash) % VENDOR_COLORS.length];
};

export const VendorDetails = ({ vendorId, onBack, initialTab, onTabChange }: VendorDetailsProps) => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    initialTab && VALID_VENDOR_TABS.includes(initialTab) ? initialTab : 'dashboard'
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    fetchVendor();
  }, [vendorId]);

  const fetchVendor = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();
      if (error) throw error;
      setVendor(data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'personal', label: 'البيانات الشخصية', icon: User },
    { id: 'travel', label: 'بيانات السفر', icon: Plane },
    { id: 'equipment', label: 'المعدات', icon: Package },
    { id: 'financial', label: 'البيانات المالية', icon: DollarSign },
    { id: 'invoices', label: 'الفواتير', icon: FileText },
    { id: 'documents', label: 'المستندات', icon: FolderOpen },
  ];

  if (loading) {
    return <div className="dash-empty" style={{ height: 300 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  if (!vendor) {
    return <div className="dash-empty" style={{ height: 300 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لم يتم العثور على المورد</span></div>;
  }

  const vColor = getVendorColor(vendorId);
  const statusBadge = getStatusBadge(vendor.status);

  return (
    <div style={{ padding: 28 }}>
      {/* Back button */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ gap: 6 }}>
          <ArrowRight size={14} /> العودة للموردين
        </button>
      </div>

      {/* Vendor Header Card */}
      <div className="card" style={{ cursor: 'default', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {vendor.profile_image ? (
              <div className="avatar av-xl" style={{ overflow: 'hidden' }}>
                <img src={vendor.profile_image} alt={vendor.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div className="avatar av-xl" style={{ background: vColor.bg, color: vColor.color, fontSize: 22 }}>
                {vendor.full_name.substring(0, 2)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{vendor.full_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {[vendor.primary_field, vendor.primary_city, vendor.nationality].filter(Boolean).join(' · ') || 'مورد'}
              </div>
              {vendor.email && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, direction: 'ltr', textAlign: 'right' }}>{vendor.email}</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={statusBadge.className}>
              <span className="badge-dot" style={{ background: vendor.status === 'active' ? 'var(--success)' : vendor.status === 'blocked' ? 'var(--danger)' : 'var(--warning)' }} />
              {statusBadge.label}
            </span>
            <button className="btn btn-secondary btn-sm"><Pencil size={13} /> تعديل</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20, width: '100%' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'on' : ''}`}
              onClick={() => handleTabChange(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}
            >
              <Icon size={14} />
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && <VendorDashboard vendorId={vendorId} />}
        {activeTab === 'personal' && <VendorPersonalInfo vendor={vendor} onUpdate={fetchVendor} />}
        {activeTab === 'travel' && <VendorTravelDocs vendorId={vendorId} />}
        {activeTab === 'equipment' && <VendorEquipment vendorId={vendorId} />}
        {activeTab === 'financial' && <VendorFinancialData vendorId={vendorId} />}
        {activeTab === 'invoices' && <VendorInvoices vendorId={vendorId} />}
        {activeTab === 'documents' && <VendorDocuments vendorId={vendorId} />}
      </div>
    </div>
  );
};
