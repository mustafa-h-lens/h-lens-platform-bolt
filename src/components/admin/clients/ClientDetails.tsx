import { useState, useEffect } from 'react';
import { ArrowRight, FolderOpen, ShoppingCart, ListChecks, FileText, User, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { PurchaseOrdersTabEnhanced } from './client-tabs/PurchaseOrdersTabEnhanced';
import { ProductionTasksTab } from './client-tabs/ProductionTasksTab';
import { ClientDocuments } from './client-tabs/ClientDocuments';
import { ClientProjects } from './ClientProjects';

interface Client {
  id: string;
  name: string;
  email: string | null;
  client_image: string | null;
  invitation_status: string;
  portal_email: string | null;
}

interface ClientDetailsProps {
  clientId: string;
  onBack: () => void;
  onViewProject?: (projectId: string) => void;
  initialTab?: string | null;
  onTabChange?: (tab: string | null) => void;
}

type TabType = 'projects' | 'purchase-orders' | 'production-tasks' | 'documents';

const TABS = [
  { id: 'projects', label: 'المشاريع', icon: FolderOpen },
  { id: 'purchase-orders', label: 'أوامر الشراء', icon: ShoppingCart },
  { id: 'production-tasks', label: 'المهام الإنتاجية', icon: ListChecks },
  { id: 'documents', label: 'المستندات', icon: FileText },
] as const;

const VALID_TAB_IDS: string[] = TABS.map(t => t.id);

export const ClientDetails = ({ clientId, onBack, onViewProject, initialTab, onTabChange }: ClientDetailsProps) => {
  const { showSuccess, showError } = useNotification();
  const [client, setClient] = useState<Client | null>(null);
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab && VALID_TAB_IDS.includes(initialTab) ? initialTab as TabType : 'projects'
  );

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, client_image, invitation_status, portal_email')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteClient = async () => {
    if (!client?.email) {
      showError('يجب إضافة بريد إلكتروني للعميل أولاً');
      return;
    }
    setInviting(true);
    try {
      // Update client invitation status and portal email
      const { error } = await supabase
        .from('clients')
        .update({
          invitation_status: 'pending',
          invited_at: new Date().toISOString(),
          portal_email: client.email,
        })
        .eq('id', client.id);

      if (error) throw error;

      // Send OTP email to the client (this serves as the invitation)
      const deviceInfo = 'دعوة من لوحة التحكم';
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email: client.email, deviceInfo, portal_type: 'client', invite_only: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'حدث خطأ أثناء إرسال الدعوة');
      }

      showSuccess('تم إرسال الدعوة بنجاح');
      loadClient(); // Refresh to show updated status
    } catch (error) {
      console.error('Error inviting client:', error);
      showError(error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال الدعوة');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل بيانات العميل...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>العميل غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 font-medium transition-all hover:gap-3"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowRight size={20} />
            العودة إلى العملاء
          </button>

          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ backgroundColor: 'var(--color-background-hover)' }}
            >
              {client.client_image ? (
                <img src={client.client_image} alt={client.name} className="w-full h-full object-cover" />
              ) : (
                <User size={32} style={{ color: 'var(--color-text-muted)' }} />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {client.name}
              </h1>
              {client.email && (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                  {client.email}
                </p>
              )}
            </div>

            {/* Portal status + Invite button */}
            <div style={{ marginRight: 'auto' }}>
              {client.invitation_status === 'active' ? (
                <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)' }}>
                  <CheckCircle size={16} />
                  العميل نشط في البوابة
                </span>
              ) : client.invitation_status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', color: 'var(--color-warning)' }}>
                    <Send size={16} />
                    {client.invitation_status === 'pending' ? 'بانتظار تسجيل الدخول' : 'تم إرسال الدعوة'}
                  </span>
                  <button
                    onClick={handleInviteClient}
                    disabled={inviting}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{ background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', opacity: inviting ? 0.5 : 1 }}
                  >
                    <Send size={14} />
                    {inviting ? 'جاري الإرسال...' : 'إعادة إرسال الدعوة'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleInviteClient}
                  disabled={inviting || !client.email}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: 'var(--color-primary)', color: '#fff',
                    opacity: inviting || !client.email ? 0.5 : 1,
                  }}
                >
                  <Send size={16} />
                  {inviting ? 'جاري الإرسال...' : 'دعوة العميل للبوابة'}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as TabType)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'projects' && (
          <ClientProjects
            clientId={clientId}
            onViewProject={(projectId) => {
              if (onViewProject) {
                onViewProject(projectId);
              }
            }}
          />
        )}
        {activeTab === 'purchase-orders' && <PurchaseOrdersTabEnhanced clientId={clientId} />}
        {activeTab === 'production-tasks' && <ProductionTasksTab clientId={clientId} />}
        {activeTab === 'documents' && <ClientDocuments clientId={clientId} />}
      </div>
    </div>
  );
};
