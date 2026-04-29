import { useState, useEffect } from 'react';
import { ArrowRight, FolderOpen, ShoppingCart, FileText, User, Send, CheckCircle, Plus, Mail } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { PurchaseOrdersTabEnhanced } from './client-tabs/PurchaseOrdersTabEnhanced';
import { ClientDocuments } from './client-tabs/ClientDocuments';
import { ClientProjects } from './ClientProjects';
import { CreateProjectModal } from '../projects/CreateProjectModal';

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

type TabType = 'projects' | 'purchase-orders' | 'documents';

const TABS = [
  { id: 'projects', label: 'المشاريع', icon: FolderOpen },
  { id: 'purchase-orders', label: 'أوامر الشراء', icon: ShoppingCart },
  { id: 'documents', label: 'المستندات', icon: FileText },
] as const;

const VALID_TAB_IDS: string[] = TABS.map(t => t.id);

const CLIENT_COLORS = [
  { bg: 'var(--accent-glow)', color: 'var(--accent-lighter)' },
  { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
  { bg: 'var(--warning-bg)', color: 'var(--warning-text)' },
  { bg: 'var(--success-bg)', color: 'var(--success-text)' },
  { bg: 'var(--info-bg)', color: 'var(--info-text)' },
];

const getClientColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
};

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'active': return { label: 'نشط في البوابة', className: 'badge badge-green', dot: 'var(--success)' };
    case 'pending': return { label: 'بانتظار تسجيل الدخول', className: 'badge badge-amber', dot: 'var(--warning)' };
    default: return { label: 'غير مدعو', className: 'badge badge-gray', dot: 'var(--text-muted)' };
  }
};

export const ClientDetails = ({ clientId, onBack, onViewProject, initialTab, onTabChange }: ClientDetailsProps) => {
  const { showSuccess, showError } = useNotification();
  const [client, setClient] = useState<Client | null>(null);
  const [inviting, setInviting] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);
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
      const { error } = await supabase
        .from('clients')
        .update({
          invitation_status: 'pending',
          invited_at: new Date().toISOString(),
          portal_email: client.email,
        })
        .eq('id', client.id);

      if (error) throw error;

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
      loadClient();
    } catch (error) {
      console.error('Error inviting client:', error);
      showError(error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال الدعوة');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return <div className="dash-empty" style={{ height: 300 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري تحميل بيانات العميل...</span></div>;
  }

  if (!client) {
    return <div className="dash-empty" style={{ height: 300 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>العميل غير موجود</span></div>;
  }

  const cColor = getClientColor(clientId);
  const statusInfo = getStatusInfo(client.invitation_status);

  return (
    <div style={{ padding: 28 }}>
      {/* Back button */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ gap: 6 }}>
          <ArrowRight size={14} /> العودة إلى العملاء
        </button>
      </div>

      {/* Client Header */}
      <div className="dash-welcome" style={{ marginBottom: 20, padding: '28px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
          {/* Top row: Avatar + Name + Badge + Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {client.client_image ? (
              <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--border-soft)', flexShrink: 0 }}>
                <img src={client.client_image} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div className="avatar av-xl" style={{ width: 72, height: 72, fontSize: 22, background: cColor.bg, color: cColor.color, border: '3px solid var(--border-soft)', flexShrink: 0 }}>
                {client.name.substring(0, 2)}
              </div>
            )}
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{client.name}</div>
            <span className={statusInfo.className}>
              <span className="badge-dot" style={{ background: statusInfo.dot }} />
              {statusInfo.label}
            </span>

            {/* Invite button (pushed to the left in RTL) */}
            <div style={{ marginRight: 'auto', flexShrink: 0 }}>
              {client.invitation_status === 'active' ? null : client.invitation_status === 'pending' ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleInviteClient}
                  disabled={inviting}
                  style={{ gap: 6 }}
                >
                  <Send size={13} />
                  {inviting ? 'جاري الإرسال...' : 'إعادة إرسال الدعوة'}
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleInviteClient}
                  disabled={inviting || !client.email}
                  style={{ gap: 6 }}
                >
                  <Send size={13} />
                  {inviting ? 'جاري الإرسال...' : 'دعوة العميل للبوابة'}
                </button>
              )}
            </div>
          </div>

          {/* Info pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {client.email && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--text-secondary)' }} dir="ltr">
                <Mail size={12} /> {client.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-colored" style={{ marginBottom: 20, width: '100%', display: 'flex' }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`tab tab-blue ${activeTab === tab.id ? 'on' : ''}`}
              onClick={() => handleTabChange(tab.id as TabType)}
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
        {activeTab === 'projects' && (
          <ClientProjects
            key={projectsRefreshKey}
            clientId={clientId}
            onViewProject={(projectId) => {
              if (onViewProject) {
                onViewProject(projectId);
              }
            }}
            onAddProject={() => setShowCreateProjectModal(true)}
          />
        )}
        {activeTab === 'purchase-orders' && <PurchaseOrdersTabEnhanced clientId={clientId} />}
        {activeTab === 'documents' && <ClientDocuments clientId={clientId} />}
      </div>

      {showCreateProjectModal && (
        <CreateProjectModal
          onClose={() => setShowCreateProjectModal(false)}
          onSuccess={() => {
            setShowCreateProjectModal(false);
            setProjectsRefreshKey(prev => prev + 1);
          }}
          preSelectedClientId={clientId}
          preSelectedClientName={client?.name}
          onProjectCreated={() => {
            setProjectsRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};
