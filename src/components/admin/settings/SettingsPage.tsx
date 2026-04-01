import { useState } from 'react';
import { Settings as SettingsIcon, FolderOpen, Package, Users, Camera, Layers, ShoppingCart, Tag, FileText, Building2, Shield, ChevronDown, Briefcase } from 'lucide-react';
import { ServiceItemsCatalog } from '../ServiceItemsCatalog';
import { ItemCategoriesManagement } from '../projects/ItemCategoriesManagement';
import { ProjectStatusSettings } from './ProjectStatusSettings';
import { VendorFieldsSettings } from './VendorFieldsSettings';
import { EquipmentCategoriesSettings } from './EquipmentCategoriesSettings';
import { EquipmentBrandsSettings } from './EquipmentBrandsSettings';
import { EquipmentCatalogSettings } from './EquipmentCatalogSettings';
import { POSettings } from './POSettings';
import { TermsSettings } from './TermsSettings';
import { PrivacySettings } from './PrivacySettings';
import { BanksSettings } from './BanksSettings';
import { SectorsSettings } from './SectorsSettings';
import { ClientDocumentTypesSettings } from './ClientDocumentTypesSettings';
type TabId = 'projects' | 'items-catalog' | 'items-categories' | 'suppliers' | 'clients' | 'equipment-categories' | 'equipment-brands' | 'equipment-catalog' | 'purchase-orders' | 'terms' | 'privacy' | 'banks' | 'sectors';

interface SubTab {
  id: TabId;
  label: string;
  icon: typeof SettingsIcon;
  component: React.ComponentType;
}

interface TabGroup {
  id: string;
  label: string;
  icon: typeof SettingsIcon;
  color: string;
  tabs: SubTab[];
}

const tabGroups: TabGroup[] = [
  {
    id: 'items-group',
    label: 'البنود',
    icon: Package,
    color: '#0A2A66',
    tabs: [
      { id: 'items-catalog', label: 'كاتالوج البنود', icon: Package, component: ServiceItemsCatalog },
      { id: 'items-categories', label: 'تصنيفات البنود', icon: Layers, component: ItemCategoriesManagement }
    ]
  },
  {
    id: 'equipment-group',
    label: 'المعدات',
    icon: Camera,
    color: '#1B4FA9',
    tabs: [
      { id: 'equipment-categories', label: 'تصنيفات المعدات', icon: Layers, component: EquipmentCategoriesSettings },
      { id: 'equipment-brands', label: 'العلامات التجارية', icon: Tag, component: EquipmentBrandsSettings },
      { id: 'equipment-catalog', label: 'كتالوج المعدات', icon: Camera, component: EquipmentCatalogSettings }
    ]
  },
  {
    id: 'legal-group',
    label: 'السياسات القانونية',
    icon: FileText,
    color: '#7C3AED',
    tabs: [
      { id: 'terms', label: 'الشروط والأحكام', icon: FileText, component: TermsSettings },
      { id: 'privacy', label: 'سياسة الخصوصية', icon: Shield, component: PrivacySettings }
    ]
  },
  {
    id: 'financial-group',
    label: 'الإعدادات المالية',
    icon: Building2,
    color: '#059669',
    tabs: [
      { id: 'banks', label: 'إدارة البنوك', icon: Building2, component: BanksSettings },
      { id: 'sectors', label: 'إدارة القطاعات', icon: Briefcase, component: SectorsSettings },
      { id: 'purchase-orders', label: 'إعدادات أوامر الشراء', icon: ShoppingCart, component: POSettings }
    ]
  },
  {
    id: 'general-group',
    label: 'إعدادات عامة',
    icon: SettingsIcon,
    color: '#DC2626',
    tabs: [
      { id: 'projects', label: 'إعدادات المشاريع', icon: FolderOpen, component: ProjectStatusSettings },
      { id: 'suppliers', label: 'إعدادات الموردين', icon: Users, component: VendorFieldsSettings },
      { id: 'clients', label: 'إعدادات العملاء', icon: FileText, component: ClientDocumentTypesSettings }
    ]
  },
];

const ALL_TAB_IDS: string[] = tabGroups.flatMap(g => g.tabs.map(t => t.id));

interface SettingsPageProps {
  initialTab?: string | null;
  onTabChange?: (tab: string | null) => void;
}

export const SettingsPage = ({ initialTab, onTabChange }: SettingsPageProps) => {
  const visibleTabGroups = tabGroups;

  const [activeTab, setActiveTab] = useState<TabId>(
    initialTab && ALL_TAB_IDS.includes(initialTab) ? initialTab as TabId : 'items-catalog'
  );

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['items-group', 'equipment-group', 'legal-group', 'financial-group', 'general-group'])
  );

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getCurrentGroup = () => {
    return tabGroups.find(group =>
      group.tabs.some(tab => tab.id === activeTab)
    );
  };

  const currentGroup = getCurrentGroup();

  return (
    <div style={{ padding: 28 }} dir="rtl">
      {/* Page Title */}
      <div className="page-title-row" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="card-icon ci-blue" style={{ width: 44, height: 44 }}>
            <SettingsIcon size={20} />
          </div>
          <div className="page-title" style={{ fontSize: 26 }}>الإعدادات</div>
        </div>
      </div>

      {/* Settings Layout */}
      <div style={{ display: 'flex', gap: 20, minHeight: 600 }}>

        {/* Sidebar Nav (first = right in RTL) */}
        <nav style={{
          width: 240, flexShrink: 0,
          overflowY: 'auto', alignSelf: 'flex-start',
        }}>
          {visibleTabGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = expandedGroups.has(group.id);

            return (
              <div key={group.id} style={{
                padding: '4px 0',
              }}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 8, direction: 'ltr',
                    padding: '6px 4px', borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    color: 'var(--text-primary)', fontSize: 13, fontWeight: 700,
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <ChevronDown
                    size={12}
                    style={{
                      color: 'var(--text-muted)',
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--bg-overlay)', color: 'var(--text-muted)',
                    fontSize: 10, fontWeight: 600, flexShrink: 0,
                  }}>
                    {group.tabs.length}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right' }}>{group.label}</span>
                </button>

                {/* Sub Tabs */}
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
                    {group.tabs.map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = activeTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            gap: 8, direction: 'ltr',
                            padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: 12.5,
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? '#fff' : 'var(--text-secondary)',
                            background: isActive ? 'var(--accent)' : 'transparent',
                            boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                          onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                        >
                          <span style={{ flex: 1, textAlign: 'right' }}>{tab.label}</span>
                          <TabIcon size={13} style={{ flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Content Area (second = left in RTL) — separate card */}
        <div className="card" style={{
          cursor: 'default', flex: 1, padding: 28, overflow: 'auto',
        }}>
          {visibleTabGroups.flatMap(g => g.tabs).map(tab => (
            activeTab === tab.id && <tab.component key={tab.id} />
          ))}
        </div>
      </div>
    </div>
  );
};
