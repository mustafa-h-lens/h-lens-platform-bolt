import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { FileText, Plus, Trash2, Save, ExternalLink, History, CheckCircle, AlertTriangle } from 'lucide-react';
import { toEnglishNumbers } from '../../../lib/numberUtils';

interface Section {
  id: string;
  icon: string;
  title: string;
  body?: string;
  items?: Array<{ title: string; desc: string }>;
}

interface TermsContent {
  lastUpdated: string;
  sections: Section[];
}

interface VersionRecord {
  id: string;
  version: string;
  is_active: boolean;
  content_ar: string;
  created_at: string;
  updated_at: string;
}

export const TermsSettings = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<TermsContent>({
    lastUpdated: toEnglishNumbers(new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })),
    sections: []
  });
  const [currentVersion, setCurrentVersion] = useState(1);
  const [versionHistory, setVersionHistory] = useState<VersionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadTerms();
    loadVersionHistory();
  }, []);

  async function loadTerms() {
    try {
      const { data, error } = await supabase
        .from('terms_and_privacy_settings')
        .select('*')
        .eq('type', 'terms')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        try {
          const parsed = JSON.parse(data.content_ar);
          setContent(parsed as TermsContent);
        } catch {
          // Legacy plain-text content — wrap it in sections format
          setContent({
            lastUpdated: data.updated_at || '',
            sections: [{ id: 'legacy', icon: '📄', title: 'الشروط والأحكام', body: data.content_ar }]
          });
        }
        setCurrentVersion(parseInt(data.version) || 1);
      }
    } catch (error) {
      console.error('Error loading terms:', error);
      showNotification('حدث خطأ أثناء تحميل الشروط والأحكام', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadVersionHistory() {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('terms_and_privacy_settings')
        .select('id, version, is_active, content_ar, created_at, updated_at')
        .eq('type', 'terms')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory(data || []);
    } catch (error) {
      console.error('Error loading version history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleLoadVersion(record: VersionRecord) {
    const confirmed = window.confirm('سيتم استبدال المحتوى الحالي بمحتوى هذا الإصدار. هل تريد المتابعة؟ (التغييرات غير المحفوظة ستضيع)');
    if (!confirmed) return;

    try {
      const parsed = JSON.parse(record.content_ar);
      setContent(parsed as TermsContent);
      showNotification(`تم تحميل محتوى الإصدار ${record.version}`, 'success');
    } catch {
      setContent({
        lastUpdated: record.updated_at || '',
        sections: [{ id: 'legacy', icon: '\u{1F4C4}', title: 'الشروط والأحكام', body: record.content_ar }]
      });
      showNotification(`تم تحميل محتوى الإصدار ${record.version}`, 'success');
    }
  }

  async function handleSave() {
    if (!user) return;

    setSaving(true);
    try {
      // Deactivate old versions
      await supabase
        .from('terms_and_privacy_settings')
        .update({ is_active: false })
        .eq('type', 'terms');

      const newVersion = currentVersion + 1;
      const updatedContent: TermsContent = {
        ...content,
        lastUpdated: toEnglishNumbers(new Date().toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }))
      };

      const { error } = await supabase
        .from('terms_and_privacy_settings')
        .insert({
          type: 'terms',
          title_ar: 'الشروط والأحكام',
          content_ar: JSON.stringify(updatedContent),
          version: String(newVersion),
          is_active: true,
          updated_by: user.id,
        });

      if (error) throw error;

      setCurrentVersion(newVersion);
      showNotification(`تم حفظ الشروط والأحكام بنجاح! الإصدار: ${newVersion}`, 'success');
      loadVersionHistory();
    } catch (error) {
      console.error('Error saving terms:', error);
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
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">إدارة الشروط والأحكام</h2>
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
            href="/terms"
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

      {/* Version History */}
      <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">سجل الإصدارات</h3>
        </div>

        {loadingHistory ? (
          <div className="text-center py-4 text-slate-600 dark:text-slate-400">جاري التحميل...</div>
        ) : versionHistory.length === 0 ? (
          <div className="text-center py-4 text-slate-500 dark:text-slate-400">لا توجد إصدارات سابقة</div>
        ) : (
          <div className="space-y-2">
            {versionHistory.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    الإصدار {record.version}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(record.created_at).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {record.is_active && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                      <CheckCircle size={12} />
                      نشط
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleLoadVersion(record)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <AlertTriangle size={12} />
                  تحميل في المحرر
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
