import { useState, useEffect } from 'react';
import {
  Lightbulb, Send, Clock, CheckCircle, XCircle, Eye, Zap, MessageSquare,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';

interface Suggestion {
  id: string;
  vendor_id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

interface VendorSuggestionsTabProps {
  vendorId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  new:          { label: 'جديد',         color: '#3b82f6', bg: '#dbeafe', icon: Clock },
  under_review: { label: 'قيد المراجعة', color: '#f59e0b', bg: '#fef3c7', icon: Eye },
  accepted:     { label: 'مقبول',        color: '#10b981', bg: '#d1fae5', icon: CheckCircle },
  rejected:     { label: 'مرفوض',        color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  implemented:  { label: 'تم التنفيذ',   color: '#8b5cf6', bg: '#ede9fe', icon: Zap },
};

const STATUS_OPTIONS = [
  { value: 'new',          label: 'جديد',         color: '#3b82f6' },
  { value: 'under_review', label: 'قيد المراجعة', color: '#f59e0b' },
  { value: 'accepted',     label: 'مقبول',        color: '#10b981' },
  { value: 'rejected',     label: 'مرفوض',        color: '#ef4444' },
  { value: 'implemented',  label: 'تم التنفيذ',   color: '#8b5cf6' },
];

const CATEGORY_LABELS: Record<string, string> = {
  feature: 'ميزة جديدة',
  improvement: 'تحسين',
  bug: 'مشكلة',
  other: 'أخرى',
};

export const VendorSuggestionsTab = ({ vendorId }: VendorSuggestionsTabProps) => {
  const { profile } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, [vendorId]);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_suggestions')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSuggestions(data || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (suggestion: Suggestion) => {
    if (!responseText.trim() && !newStatus) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (responseText.trim()) {
        updates.admin_response = responseText.trim();
        updates.responded_by = profile?.id;
        updates.responded_at = new Date().toISOString();
      }
      if (newStatus) updates.status = newStatus;

      const { error } = await supabase
        .from('vendor_suggestions')
        .update(updates)
        .eq('id', suggestion.id);
      if (error) throw error;

      setResponseText('');
      setNewStatus('');
      setExpandedId(null);
      fetchSuggestions();
    } catch (err) {
      console.error('Error responding:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExpand = (s: Suggestion) => {
    if (expandedId === s.id) {
      setExpandedId(null);
      setResponseText('');
      setNewStatus('');
    } else {
      setExpandedId(s.id);
      setResponseText(s.admin_response || '');
      setNewStatus(s.status);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return <div className="text-center py-12 text-slate-500">جاري التحميل...</div>;
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-16">
        <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">لا توجد اقتراحات من هذا المورد</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">اقتراحات المورد</h3>
        <span className="text-sm text-slate-500">{suggestions.length} اقتراح</span>
      </div>

      {suggestions.map(s => {
        const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.new;
        const StatusIcon = status.icon;
        const isExpanded = expandedId === s.id;

        return (
          <div
            key={s.id}
            className={`bg-white rounded-xl border transition-all ${
              isExpanded ? 'border-blue-300 shadow-md' : 'border-slate-200 hover:shadow-sm'
            }`}
          >
            <button
              onClick={() => handleExpand(s)}
              className="w-full text-right p-4 flex items-center gap-3"
            >
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ backgroundColor: status.bg, color: status.color }}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm truncate">{s.title}</span>
                  {s.admin_response && <MessageSquare className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{formatDate(s.created_at)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {CATEGORY_LABELS[s.category] || 'أخرى'}
                  </span>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-slate-100">
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{s.content}</p>
                </div>

                {s.admin_response && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs font-semibold text-green-700">الرد السابق</span>
                      {s.responded_at && <span className="text-xs text-slate-400 mr-auto">{formatDate(s.responded_at)}</span>}
                    </div>
                    <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">{s.admin_response}</p>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">تغيير الحالة</label>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setNewStatus(opt.value)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            newStatus === opt.value
                              ? 'border-blue-400 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">الرد على الاقتراح</label>
                    <textarea
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      placeholder="اكتب ردك هنا..."
                      rows={3}
                      className="w-full p-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(s)}
                      disabled={saving || (!responseText.trim() && newStatus === s.status)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {saving ? 'جاري الحفظ...' : 'حفظ الرد'}
                    </button>
                    <button
                      onClick={() => { setExpandedId(null); setResponseText(''); setNewStatus(''); }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
