import { useState, useEffect } from 'react';
import { ArrowRight, FolderOpen, ShoppingCart, ListChecks, User } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { PurchaseOrdersTabEnhanced } from './client-tabs/PurchaseOrdersTabEnhanced';
import { ProductionTasksTab } from './client-tabs/ProductionTasksTab';
import { ClientProjects } from './ClientProjects';

interface Client {
  id: string;
  name: string;
  email: string | null;
  client_image: string | null;
}

interface ClientDetailsProps {
  clientId: string;
  onBack: () => void;
  onViewProject?: (projectId: string) => void;
}

type TabType = 'projects' | 'purchase-orders' | 'production-tasks';

const TABS = [
  { id: 'projects', label: 'المشاريع', icon: FolderOpen },
  { id: 'purchase-orders', label: 'أوامر الشراء', icon: ShoppingCart },
  { id: 'production-tasks', label: 'المهام الإنتاجية', icon: ListChecks },
] as const;

export const ClientDetails = ({ clientId, onBack, onViewProject }: ClientDetailsProps) => {
  const [client, setClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, client_image')
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
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
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
      </div>
    </div>
  );
};
