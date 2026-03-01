import { useState } from 'react';
import { Settings as SettingsIcon, FolderOpen, Package, Users, Camera, Layers, ShoppingCart, Sparkles, Tag, FileText, Building2, Shield, ChevronDown } from 'lucide-react';
import { ServiceItemsCatalog } from './ServiceItemsCatalog';
import { ItemCategoriesManagement } from './ItemCategoriesManagement';
import { ProjectStatusSettings } from './settings/ProjectStatusSettings';
import { VendorFieldsSettings } from './settings/VendorFieldsSettings';
import { EquipmentCategoriesSettings } from './settings/EquipmentCategoriesSettings';
import { EquipmentBrandsSettings } from './settings/EquipmentBrandsSettings';
import { EquipmentCatalogSettings } from './settings/EquipmentCatalogSettings';
import { POSettings } from './settings/POSettings';
import { TermsSettings } from './settings/TermsSettings';
import { PrivacySettings } from './settings/PrivacySettings';
import { BanksSettings } from './settings/BanksSettings';
import AIExtractionTest from './settings/AIExtractionTest';

type TabId = 'projects' | 'items-catalog' | 'items-categories' | 'suppliers' | 'equipment-categories' | 'equipment-brands' | 'equipment-catalog' | 'purchase-orders' | 'terms' | 'privacy' | 'banks' | 'ai-test';

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
      { id: 'suppliers', label: 'إعدادات الموردين', icon: Users, component: VendorFieldsSettings }
    ]
  },
  {
    id: 'ai-group',
    label: 'الذكاء الاصطناعي',
    icon: Sparkles,
    color: '#F59E0B',
    tabs: [
      { id: 'ai-test', label: 'اختبار الذكاء الاصطناعي', icon: Sparkles, component: AIExtractionTest }
    ]
  }
];

export const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('items-catalog');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['items-group', 'equipment-group', 'legal-group', 'financial-group', 'general-group', 'ai-group'])
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
    <div className="p-6 space-y-6" dir="rtl">
      <div className="bg-white dark:bg-dark-card rounded-[32px] shadow-xl border border-slate-200 dark:border-dark-border overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-dark-border p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#0A2A66]/10 to-[#1B4FA9]/10
              dark:from-[#0A2A66]/20 dark:to-[#1B4FA9]/20
              border border-[#0A2A66]/20 dark:border-[#0A2A66]/30">
              <SettingsIcon className="w-5 h-5 text-[#0A2A66] dark:text-[#47A1FF]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الإعدادات</h1>
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-l border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800">
            <nav className="p-4 space-y-2">
              {tabGroups.map((group) => {
                const GroupIcon = group.icon;
                const isExpanded = expandedGroups.has(group.id);

                return (
                  <div key={group.id} className="space-y-1">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                        text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700
                        font-bold text-sm transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <GroupIcon className="w-4 h-4" style={{ color: group.color }} />
                        <span>{group.label}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">({group.tabs.length})</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Sub Tabs */}
                    {isExpanded && (
                      <div className="pr-4 space-y-1">
                        {group.tabs.map((tab) => {
                          const TabIcon = tab.icon;
                          const isActive = activeTab === tab.id;

                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`
                                w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-right
                                transition-all duration-200 text-sm
                                ${isActive
                                  ? 'text-white shadow-md font-medium'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-normal'
                                }
                              `}
                              style={isActive ? {
                                background: `linear-gradient(to left, ${group.color}, ${group.color}dd)`
                              } : {}}
                            >
                              <TabIcon className="w-4 h-4" />
                              <span>{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 p-6 bg-white dark:bg-dark-bg">
            {tabGroups.flatMap(g => g.tabs).map(tab => (
              activeTab === tab.id && <tab.component key={tab.id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
