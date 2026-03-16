import { useState, useEffect } from 'react';
import {
  Lightbulb, Search, Filter, Send, Clock, CheckCircle, XCircle, Eye, Zap,
  MessageSquare, X, ChevronDown, ChevronUp, User,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

interface Suggestion {
  id: string;
  vendor_id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  vendor_name?: string;
}

const STATUS_OPTIONS = [
  { value: 'all',          label: 'الكل' },
  { value: 'new',          label: 'جديد',         color: '#3b82f6' },
  { value: 'under_review', label: 'قيد المراجعة', color: '#f59e0b' },
  { value: 'accepted',     label: 'مقبول',        color: '#10b981' },
  { value: 'rejected',     label: 'مرفوض',        color: '#ef4444' },
  { value: 'implemented',  label: 'تم التنفيذ',   color: '#8b5cf6' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  new:          { label: 'جديد',         color: '#3b82f6', bg: '#dbeafe', icon: Clock },
  under_review: { label: 'قيد المراجعة', color: '#f59e0b', bg: '#fef3c7', icon: Eye },
  accepted:     { label: 'مقبول',        color: '#10b981', bg: '#d1fae5', icon: CheckCircle },
  rejected:     { label: 'مرفوض',        color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  implemented:  { label: 'تم التنفيذ',   color: '#8b5cf6', bg: '#ede9fe', icon: Zap },
};

const CATEGORY_LABELS: Record<string, string> = {
  feature: 'ميزة جديدة',
  improvement: 'تحسين',
  bug: 'مشكلة',
  other: 'أخرى',
};

export const AdminSuggestions = () => {
  const { profile } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_suggestions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch vendor names
      const vendorIds = [...new Set((data || []).map(s => s.vendor_id))];
      let vendorMap: Record<string, string> = {};
      if (vendorIds.length > 0) {
        const { data: vendors } = await supabase
          .from('vendors')
          .select('id, full_name')
          .in('id', vendorIds);
        vendorMap = (vendors || []).reduce((acc, v) => ({ ...acc, [v.id]: v.full_name }), {} as Record<string, string>);
      }

      setSuggestions((data || []).map(s => ({ ...s, vendor_name: vendorMap[s.vendor_id] || 'غير معروف' })));
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
      if (newStatus) {
        updates.status = newStatus;
      }

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
      console.error('Error responding to suggestion:', err);
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

  const filtered = suggestions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.vendor_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });

  const counts = suggestions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600 dark:text-slate-400">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Lightbulb className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">صندوق الاقتراحات</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">اقتراحات الموردين لتحسين المنصة</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-2xl text-slate-800 dark:text-white">{suggestions.length}</span>
          <span>اقتراح</span>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(opt => {
          const isActive = statusFilter === opt.value;
          const count = opt.value === 'all' ? suggestions.length : (counts[opt.value] || 0);
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all border ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {opt.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
              {opt.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="بحث في الاقتراحات..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      {/* Suggestions list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border">
          <Lightbulb className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">لا توجد اقتراحات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.new;
            const StatusIcon = status.icon;
            const isExpanded = expandedId === s.id;

            return (
              <div
                key={s.id}
                className={`bg-white dark:bg-dark-card rounded-xl border transition-all ${
                  isExpanded
                    ? 'border-blue-300 dark:border-blue-700 shadow-lg'
                    : 'border-slate-200 dark:border-dark-border hover:shadow-md'
                }`}
              >
                {/* Row header */}
                <button
                  onClick={() => handleExpand(s)}
                  className="w-full text-right p-4 flex items-center gap-3"
                >
                  {/* Status badge */}
                  <span
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{s.title}</span>
                      {s.admin_response && <MessageSquare className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {s.vendor_name}
                      </span>
                      <span>{formatDate(s.created_at)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                        {CATEGORY_LABELS[s.category] || 'أخرى'}
                      </span>
                    </div>
                  </div>

                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-dark-border">
                    {/* Suggestion content */}
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{s.content}</p>
                    </div>

                    {/* Existing admin response */}
                    {s.admin_response && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs font-semibold text-green-700 dark:text-green-400">الرد السابق</span>
                          {s.responded_at && <span className="text-xs text-slate-400 mr-auto">{formatDate(s.responded_at)}</span>}
                        </div>
                        <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed whitespace-pre-wrap">{s.admin_response}</p>
                      </div>
                    )}

                    {/* Admin response form */}
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">تغيير الحالة</label>
                        <div className="flex gap-2 flex-wrap">
                          {STATUS_OPTIONS.filter(o => o.value !== 'all').map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setNewStatus(opt.value)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                newStatus === opt.value
                                  ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : 'border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                              }`}
                            >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">الرد على الاقتراح</label>
                        <textarea
                          value={responseText}
                          onChange={e => setResponseText(e.target.value)}
                          placeholder="اكتب ردك هنا..."
                          rows={3}
                          className="w-full p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
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
                          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
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
      )}
    </div>
  );
};
