import { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { toEnglishNumbers } from '../../../lib/numberUtils';

interface POSettingsData {
  id: string;
  warning_threshold: number;
  allow_split_task: boolean;
  allow_po_exceed: boolean;
}

export const POSettings = () => {
  const [settings, setSettings] = useState<POSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [formData, setFormData] = useState({
    warning_threshold: 80,
    allow_split_task: true,
    allow_po_exceed: false,
  });
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('po_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setFormData({
          warning_threshold: data.warning_threshold,
          allow_split_task: data.allow_split_task,
          allow_po_exceed: data.allow_po_exceed,
        });
      }
    } catch (error) {
      console.error('Error loading PO settings:', error);
      showError('حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (formData.warning_threshold < 0 || formData.warning_threshold > 100) {
        showError('النسبة يجب أن تكون بين 0 و 100');
        return;
      }

      const { error } = await supabase
        .from('po_settings')
        .update({
          warning_threshold: formData.warning_threshold,
          allow_split_task: formData.allow_split_task,
          allow_po_exceed: formData.allow_po_exceed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings?.id);

      if (error) throw error;

      showSuccess('تم حفظ الإعدادات بنجاح');
      setSuccessAnimation(true);
      setTimeout(() => setSuccessAnimation(false), 600);
      loadSettings();
    } catch (error) {
      console.error('Error saving PO settings:', error);
      showError('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            إعدادات أوامر الشراء
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            إدارة إعدادات أوامر الشراء والتخصيصات
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${successAnimation ? 'animate-success-flash' : ''}`}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      <div
        className="p-6 rounded-lg border space-y-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="p-4 rounded-lg flex items-start gap-3"
          style={{
            backgroundColor: 'var(--color-background-hover)',
          }}
        >
          <AlertCircle size={20} style={{ color: 'var(--color-info)', marginTop: '2px' }} />
          <div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
              ملاحظة هامة
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              هذه الإعدادات تؤثر على جميع أوامر الشراء في النظام. التغييرات تُطبق فورًا على الحالات الجديدة.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              نسبة التنبيه لقرب امتلاء أمر الشراء (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={formData.warning_threshold}
                onChange={(e) => setFormData({ ...formData, warning_threshold: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                min="0"
                max="100"
                step="1"
              />
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {toEnglishNumbers(formData.warning_threshold.toString())}%
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              عند وصول المبلغ المستخدم إلى هذه النسبة، سيتم تغيير حالة أمر الشراء إلى "شارف على الانتهاء"
            </p>
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="allow_split_task"
                checked={formData.allow_split_task}
                onChange={(e) => setFormData({ ...formData, allow_split_task: e.target.checked })}
                className="w-5 h-5 rounded mt-0.5"
                style={{
                  accentColor: 'var(--color-primary)',
                }}
              />
              <div className="flex-1">
                <label
                  htmlFor="allow_split_task"
                  className="text-sm font-medium cursor-pointer block mb-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  السماح بتقسيم المهمة على أكثر من أمر شراء
                </label>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  عند تفعيل هذا الخيار، يمكن ربط مهمة واحدة بأكثر من أمر شراء
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="allow_po_exceed"
                checked={formData.allow_po_exceed}
                onChange={(e) => setFormData({ ...formData, allow_po_exceed: e.target.checked })}
                className="w-5 h-5 rounded mt-0.5"
                style={{
                  accentColor: 'var(--color-primary)',
                }}
              />
              <div className="flex-1">
                <label
                  htmlFor="allow_po_exceed"
                  className="text-sm font-medium cursor-pointer block mb-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  السماح بتجاوز قيمة أمر الشراء
                </label>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  عند إيقاف هذا الخيار، لن يمكن تخصيص مبالغ تتجاوز القيمة المتبقية في أمر الشراء
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="p-4 rounded-lg space-y-2"
          style={{
            backgroundColor: 'var(--color-background-hover)',
          }}
        >
          <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            حالات أوامر الشراء
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--color-info)', color: '#ffffff' }}
              >
                نشط
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                المبلغ المستخدم أقل من نسبة التنبيه
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--color-warning)', color: '#ffffff' }}
              >
                شارف على الانتهاء
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                المبلغ المستخدم وصل لنسبة التنبيه المحددة
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--color-danger)', color: '#ffffff' }}
              >
                ممتلئ
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                المبلغ المستخدم يساوي أو يتجاوز المبلغ الكلي
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--color-success)', color: '#ffffff' }}
              >
                مكتمل
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                تم إغلاق أمر الشراء يدويًا
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--color-background-hover)', color: 'var(--color-text-muted)' }}
              >
                ملغي
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                تم إلغاء أمر الشراء
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
