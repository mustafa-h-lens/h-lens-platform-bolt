import { useState, useEffect } from 'react';
import { ArrowRight, LayoutDashboard, User, Plane, Package, DollarSign, FileText, FolderOpen, Lightbulb } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { VendorDashboard } from './vendor-tabs/VendorDashboard';
import { VendorPersonalInfo } from './vendor-tabs/VendorPersonalInfo';
import { VendorTravelDocs } from './vendor-tabs/VendorTravelDocs';
import { VendorEquipment } from './vendor-tabs/VendorEquipment';
import { VendorFinancialData } from './vendor-tabs/VendorFinancialData';
import { VendorInvoices } from './vendor-tabs/VendorInvoices';
import { VendorDocuments } from './vendor-tabs/VendorDocuments';
import { VendorSuggestionsTab } from './vendor-tabs/VendorSuggestionsTab';

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

const VALID_VENDOR_TABS = ['dashboard', 'personal', 'travel', 'equipment', 'financial', 'invoices', 'documents', 'suggestions'];

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
    { id: 'suggestions', label: 'الاقتراحات', icon: Lightbulb },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">لم يتم العثور على المورد</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-4">
          {vendor.profile_image ? (
            <img
              src={vendor.profile_image}
              alt={vendor.full_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xl">
                {vendor.full_name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{vendor.full_name}</h1>
            <p className="text-slate-600">{vendor.primary_field || 'مورد'}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {activeTab === 'dashboard' && <VendorDashboard vendorId={vendorId} />}
        {activeTab === 'personal' && <VendorPersonalInfo vendor={vendor} onUpdate={fetchVendor} />}
        {activeTab === 'travel' && <VendorTravelDocs vendorId={vendorId} />}
        {activeTab === 'equipment' && <VendorEquipment vendorId={vendorId} />}
        {activeTab === 'financial' && <VendorFinancialData vendorId={vendorId} />}
        {activeTab === 'invoices' && <VendorInvoices vendorId={vendorId} />}
        {activeTab === 'documents' && <VendorDocuments vendorId={vendorId} />}
        {activeTab === 'suggestions' && <VendorSuggestionsTab vendorId={vendorId} />}
      </div>
    </div>
  );
};
