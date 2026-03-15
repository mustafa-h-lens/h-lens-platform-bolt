import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { Shield, Plus, Trash2, Save, ExternalLink } from 'lucide-react';
import { toEnglishNumbers } from '../../../lib/numberUtils';

interface Section {
  id: string;
  icon: string;
  title: string;
  body?: string;
  items?: Array<{ title: string; desc: string }>;
}

interface PrivacyContent {
  lastUpdated: string;
  sections: Section[];
}

export const PrivacySettings = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<PrivacyContent>({
    lastUpdated: toEnglishNumbers(new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })),
    sections: []
  });
  const [currentVersion, setCurrentVersion] = useState(1);

  useEffect(() => {
    loadPrivacy();
  }, []);

  async function loadPrivacy() {
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('type', 'privacy')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setContent(data.content as PrivacyContent);
        setCurrentVersion(data.version);
      }
    } catch (error) {
      console.error('Error loading privacy:', error);
      showNotification('حدث خطأ أثناء تحميل سياسة الخصوصية', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user) return;

    setSaving(true);
    try {
      await supabase
        .from('legal_pages')
        .update({ is_active: false })
        .eq('type', 'privacy');

      const newVersion = currentVersion + 1;
      const { error } = await supabase
        .from('legal_pages')
        .insert({
          type: 'privacy',
          version: newVersion,
          last_updated: new Date().toISOString().split('T')[0],
          content: {
            ...content,
            lastUpdated: toEnglishNumbers(new Date().toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }))
          },
          is_active: true,
          created_by: user.id,
          published_at: new Date().toISOString()
        });

      if (error) throw error;

      setCurrentVersion(newVersion);
      showNotification(`تم حفظ سياسة الخصوصية بنجاح! الإصدار: ${newVersion}`, 'success');
    } catch (error) {
      console.error('Error saving privacy:', error);
      showNotification('حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  }

  function addSection() {
    setContent({
      ...content,
      sections: [
        ...content.sections,
        {
          id: `section-${Date.now()}`,
          icon: '📄',
          title: 'قسم جديد',
          body: ''
        }
      ]
    });
  }

  function updateSection(index: number, updates: Partial<Section>) {
    const newSections = [...content.sections];
    newSections[index] = { ...newSections[index], ...updates };
    setContent({ ...content, sections: newSections });
  }

  function deleteSection(index: number) {
    setContent({
      ...content,
      sections: content.sections.filter((_, i) => i !== index)
    });
  }

  function addItem(sectionIndex: number) {
    const newSections = [...content.sections];
    if (!newSections[sectionIndex].items) {
      newSections[sectionIndex].items = [];
    }
    newSections[sectionIndex].items!.push({ title: '', desc: '' });
    setContent({ ...content, sections: newSections });
  }

  function updateItem(sectionIndex: number, itemIndex: number, field: 'title' | 'desc', value: string) {
    const newSections = [...content.sections];
    newSections[sectionIndex].items![itemIndex][field] = value;
    setContent({ ...content, sections: newSections });
  }

  function deleteItem(sectionIndex: number, itemIndex: number) {
    const newSections = [...content.sections];
    newSections[sectionIndex].items = newSections[sectionIndex].items!.filter((_, i) => i !== itemIndex);
    setContent({ ...content, sections: newSections });
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-600 dark:text-slate-400">جاري التحميل...</div>;
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">إدارة سياسة الخصوصية</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            الإصدار الحالي: {currentVersion} | سيتم إنشاء إصدار {currentVersion + 1} عند الحفظ
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={18} />
            {saving ? 'جاري الحفظ...' : 'حفظ و نشر'}
          </button>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ExternalLink size={18} />
            معاينة
          </a>
        </div>
      </div>

      <div className="space-y-6">
        {content.sections.map((section, sIndex) => (
          <div key={section.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-5 bg-slate-50 dark:bg-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={section.icon}
                  onChange={(e) => updateSection(sIndex, { icon: e.target.value })}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded text-center"
                  placeholder="🎯"
                  maxLength={2}
                />
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(sIndex, { title: e.target.value })}
                  className="col-span-2 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded"
                  placeholder="عنوان القسم"
                />
              </div>
              <button
                onClick={() => deleteSection(sIndex)}
                className="mr-3 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={!!section.items}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateSection(sIndex, { items: [], body: undefined });
                    } else {
                      updateSection(sIndex, { body: '', items: undefined });
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">استخدام قائمة عناصر</span>
              </label>

              {section.items ? (
                <div className="space-y-3">
                  {section.items.map((item, iIndex) => (
                    <div key={iIndex} className="flex gap-3 bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(sIndex, iIndex, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded"
                          placeholder="عنوان العنصر"
                        />
                        <textarea
                          value={item.desc}
                          onChange={(e) => updateItem(sIndex, iIndex, 'desc', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded"
                          rows={2}
                          placeholder="وصف العنصر"
                        />
                      </div>
                      <button
                        onClick={() => deleteItem(sIndex, iIndex)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addItem(sIndex)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Plus size={16} />
                    إضافة عنصر
                  </button>
                </div>
              ) : (
                <textarea
                  value={section.body || ''}
                  onChange={(e) => updateSection(sIndex, { body: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded"
                  rows={6}
                  placeholder="محتوى القسم..."
                />
              )}
            </div>
          </div>
        ))}

        <button
          onClick={addSection}
          className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          إضافة قسم جديد
        </button>
      </div>
    </div>
  );
};
