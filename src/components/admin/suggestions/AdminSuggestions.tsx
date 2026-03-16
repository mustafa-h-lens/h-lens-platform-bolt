import { useState, useEffect } from 'react';
import {
  Lightbulb, Search, Send, Clock, CheckCircle, XCircle, Eye, Zap,
  MessageSquare, ChevronDown, ChevronUp, User, Camera, Package,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

// ── Vendor Suggestions ──
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

// ── Equipment Suggestions ──
interface EquipSuggestion {
  id: string;
  vendor_id: string;
  suggestion_text: string;
  status: string;
  admin_notes: string | null;
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

const EQUIP_STATUS_OPTIONS = [
  { value: 'all',      label: 'الكل' },
  { value: 'pending',  label: 'معلق',     color: '#f59e0b' },
  { value: 'approved', label: 'مقبول',    color: '#10b981' },
  { value: 'rejected', label: 'مرفوض',    color: '#ef4444' },
  { value: 'added',    label: 'تمت الإضافة', color: '#8b5cf6' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  new:          { label: 'جديد',         color: '#3b82f6', bg: '#dbeafe', icon: Clock },
  under_review: { label: 'قيد المراجعة', color: '#f59e0b', bg: '#fef3c7', icon: Eye },
  accepted:     { label: 'مقبول',        color: '#10b981', bg: '#d1fae5', icon: CheckCircle },
  rejected:     { label: 'مرفوض',        color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  implemented:  { label: 'تم التنفيذ',   color: '#8b5cf6', bg: '#ede9fe', icon: Zap },
  pending:      { label: 'معلق',         color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  approved:     { label: 'مقبول',        color: '#10b981', bg: '#d1fae5', icon: CheckCircle },
  added:        { label: 'تمت الإضافة',  color: '#8b5cf6', bg: '#ede9fe', icon: CheckCircle },
};

const CATEGORY_LABELS: Record<string, string> = { feature: 'ميزة جديدة', improvement: 'تحسين', bug: 'مشكلة', other: 'أخرى' };

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const AdminSuggestions = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'vendor' | 'equipment'>('vendor');

  // ── Vendor suggestions state ──
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingVS, setLoadingVS] = useState(true);
  const [vsFilter, setVsFilter] = useState('all');
  const [vsSearch, setVsSearch] = useState('');
  const [vsExpandedId, setVsExpandedId] = useState<string | null>(null);
  const [vsResponse, setVsResponse] = useState('');
  const [vsNewStatus, setVsNewStatus] = useState('');
  const [vsSaving, setVsSaving] = useState(false);

  // ── Equipment suggestions state ──
  const [equipSuggestions, setEquipSuggestions] = useState<EquipSuggestion[]>([]);
  const [loadingES, setLoadingES] = useState(true);
  const [esFilter, setEsFilter] = useState('all');
  const [esSearch, setEsSearch] = useState('');
  const [esExpandedId, setEsExpandedId] = useState<string | null>(null);
  const [esNotes, setEsNotes] = useState('');
  const [esNewStatus, setEsNewStatus] = useState('');
  const [esSaving, setEsSaving] = useState(false);

  useEffect(() => { fetchVendorSuggestions(); fetchEquipSuggestions(); }, []);

  // ── Vendor suggestions ──
  const fetchVendorSuggestions = async () => {
    try {
      const { data, error } = await supabase.from('vendor_suggestions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const vendorIds = [...new Set((data || []).map(s => s.vendor_id))];
      let vendorMap: Record<string, string> = {};
      if (vendorIds.length > 0) {
        const { data: vendors } = await supabase.from('vendors').select('id, full_name').in('id', vendorIds);
        vendorMap = (vendors || []).reduce((acc, v) => ({ ...acc, [v.id]: v.full_name }), {} as Record<string, string>);
      }
      setSuggestions((data || []).map(s => ({ ...s, vendor_name: vendorMap[s.vendor_id] || 'غير معروف' })));
    } catch (err) { console.error(err); }
    finally { setLoadingVS(false); }
  };

  const handleVsRespond = async (s: Suggestion) => {
    if (!vsResponse.trim() && !vsNewStatus) return;
    setVsSaving(true);
    try {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (vsResponse.trim()) { updates.admin_response = vsResponse.trim(); updates.responded_by = profile?.id; updates.responded_at = new Date().toISOString(); }
      if (vsNewStatus) updates.status = vsNewStatus;
      const { error } = await supabase.from('vendor_suggestions').update(updates).eq('id', s.id);
      if (error) throw error;
      setVsResponse(''); setVsNewStatus(''); setVsExpandedId(null); fetchVendorSuggestions();
    } catch (err) { console.error(err); }
    finally { setVsSaving(false); }
  };

  const handleVsExpand = (s: Suggestion) => {
    if (vsExpandedId === s.id) { setVsExpandedId(null); setVsResponse(''); setVsNewStatus(''); }
    else { setVsExpandedId(s.id); setVsResponse(s.admin_response || ''); setVsNewStatus(s.status); }
  };

  // ── Equipment suggestions ──
  const fetchEquipSuggestions = async () => {
    try {
      const { data, error } = await supabase.from('equipment_suggestions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const vendorIds = [...new Set((data || []).map(s => s.vendor_id))];
      let vendorMap: Record<string, string> = {};
      if (vendorIds.length > 0) {
        const { data: vendors } = await supabase.from('vendors').select('id, full_name').in('id', vendorIds);
        vendorMap = (vendors || []).reduce((acc, v) => ({ ...acc, [v.id]: v.full_name }), {} as Record<string, string>);
      }
      setEquipSuggestions((data || []).map(s => ({ ...s, vendor_name: vendorMap[s.vendor_id] || 'غير معروف' })));
    } catch (err) { console.error(err); }
    finally { setLoadingES(false); }
  };

  const handleEsRespond = async (s: EquipSuggestion) => {
    if (!esNotes.trim() && !esNewStatus) return;
    setEsSaving(true);
    try {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (esNotes.trim()) updates.admin_notes = esNotes.trim();
      if (esNewStatus) updates.status = esNewStatus;
      const { error } = await supabase.from('equipment_suggestions').update(updates).eq('id', s.id);
      if (error) throw error;
      setEsNotes(''); setEsNewStatus(''); setEsExpandedId(null); fetchEquipSuggestions();
    } catch (err) { console.error(err); }
    finally { setEsSaving(false); }
  };

  const handleEsExpand = (s: EquipSuggestion) => {
    if (esExpandedId === s.id) { setEsExpandedId(null); setEsNotes(''); setEsNewStatus(''); }
    else { setEsExpandedId(s.id); setEsNotes(s.admin_notes || ''); setEsNewStatus(s.status); }
  };

  // ── Filtered data ──
  const filteredVS = suggestions.filter(s => {
    if (vsFilter !== 'all' && s.status !== vsFilter) return false;
    if (vsSearch.trim()) { const q = vsSearch.toLowerCase(); return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.vendor_name || '').toLowerCase().includes(q); }
    return true;
  });

  const filteredES = equipSuggestions.filter(s => {
    if (esFilter !== 'all' && s.status !== esFilter) return false;
    if (esSearch.trim()) { const q = esSearch.toLowerCase(); return s.suggestion_text.toLowerCase().includes(q) || (s.vendor_name || '').toLowerCase().includes(q); }
    return true;
  });

  const vsCounts = suggestions.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const esCounts = equipSuggestions.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  const newVsCount = (vsCounts['new'] || 0) + (vsCounts['under_review'] || 0);
  const newEsCount = esCounts['pending'] || 0;

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
            <p className="text-sm text-slate-500 dark:text-slate-400">اقتراحات الموردين والمعدات</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-dark-border">
        <button
          onClick={() => setActiveTab('vendor')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-px ${
            activeTab === 'vendor'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          اقتراحات الموردين
          {newVsCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 font-bold">{newVsCount}</span>}
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-px ${
            activeTab === 'equipment'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          اقتراحات المعدات
          {newEsCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 font-bold">{newEsCount}</span>}
        </button>
      </div>

      {/* ═══ VENDOR SUGGESTIONS TAB ═══ */}
      {activeTab === 'vendor' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(opt => {
              const isActive = vsFilter === opt.value;
              const count = opt.value === 'all' ? suggestions.length : (vsCounts[opt.value] || 0);
              return (
                <button key={opt.value} onClick={() => setVsFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all border ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                  {opt.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                  {opt.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={vsSearch} onChange={e => setVsSearch(e.target.value)} placeholder="بحث في الاقتراحات..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
          </div>

          {/* List */}
          {loadingVS ? <div className="text-center py-12 text-slate-500">جاري التحميل...</div> : filteredVS.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border">
              <Lightbulb className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">لا توجد اقتراحات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVS.map(s => {
                const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.new;
                const StatusIcon = status.icon;
                const isExpanded = vsExpandedId === s.id;
                return (
                  <div key={s.id} className={`bg-white dark:bg-dark-card rounded-xl border transition-all ${isExpanded ? 'border-blue-300 dark:border-blue-700 shadow-lg' : 'border-slate-200 dark:border-dark-border hover:shadow-md'}`}>
                    <button onClick={() => handleVsExpand(s)} className="w-full text-right p-4 flex items-center gap-3">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0" style={{ backgroundColor: status.bg, color: status.color }}>
                        <StatusIcon className="w-3.5 h-3.5" /> {status.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{s.title}</span>
                          {s.admin_response && <MessageSquare className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {s.vendor_name}</span>
                          <span>{formatDate(s.created_at)}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10">{CATEGORY_LABELS[s.category] || 'أخرى'}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-100 dark:border-dark-border">
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{s.content}</p>
                        </div>
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
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">تغيير الحالة</label>
                            <div className="flex gap-2 flex-wrap">
                              {STATUS_OPTIONS.filter(o => o.value !== 'all').map(opt => (
                                <button key={opt.value} onClick={() => setVsNewStatus(opt.value)}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${vsNewStatus === opt.value ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} /> {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">الرد</label>
                            <textarea value={vsResponse} onChange={e => setVsResponse(e.target.value)} placeholder="اكتب ردك هنا..." rows={3}
                              className="w-full p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleVsRespond(s)} disabled={vsSaving || (!vsResponse.trim() && vsNewStatus === s.status)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                              <Send className="w-3.5 h-3.5" /> {vsSaving ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={() => { setVsExpandedId(null); setVsResponse(''); setVsNewStatus(''); }}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">إلغاء</button>
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
      )}

      {/* ═══ EQUIPMENT SUGGESTIONS TAB ═══ */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {EQUIP_STATUS_OPTIONS.map(opt => {
              const isActive = esFilter === opt.value;
              const count = opt.value === 'all' ? equipSuggestions.length : (esCounts[opt.value] || 0);
              return (
                <button key={opt.value} onClick={() => setEsFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all border ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                  {opt.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                  {opt.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={esSearch} onChange={e => setEsSearch(e.target.value)} placeholder="بحث في اقتراحات المعدات..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
          </div>

          {/* List */}
          {loadingES ? <div className="text-center py-12 text-slate-500">جاري التحميل...</div> : filteredES.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">لا توجد اقتراحات معدات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredES.map(s => {
                const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                const isExpanded = esExpandedId === s.id;
                return (
                  <div key={s.id} className={`bg-white dark:bg-dark-card rounded-xl border transition-all ${isExpanded ? 'border-blue-300 dark:border-blue-700 shadow-lg' : 'border-slate-200 dark:border-dark-border hover:shadow-md'}`}>
                    <button onClick={() => handleEsExpand(s)} className="w-full text-right p-4 flex items-center gap-3">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0" style={{ backgroundColor: status.bg, color: status.color }}>
                        <StatusIcon className="w-3.5 h-3.5" /> {status.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{s.suggestion_text}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {s.vendor_name}</span>
                          <span>{formatDate(s.created_at)}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-100 dark:border-dark-border">
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{s.suggestion_text}</p>
                        </div>
                        {s.admin_notes && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-xs font-semibold text-green-700 dark:text-green-400">ملاحظات الأدمن</span>
                            </div>
                            <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed whitespace-pre-wrap">{s.admin_notes}</p>
                          </div>
                        )}
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">تغيير الحالة</label>
                            <div className="flex gap-2 flex-wrap">
                              {EQUIP_STATUS_OPTIONS.filter(o => o.value !== 'all').map(opt => (
                                <button key={opt.value} onClick={() => setEsNewStatus(opt.value)}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${esNewStatus === opt.value ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} /> {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">ملاحظات</label>
                            <textarea value={esNotes} onChange={e => setEsNotes(e.target.value)} placeholder="ملاحظات أو سبب القرار..." rows={2}
                              className="w-full p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEsRespond(s)} disabled={esSaving || (!esNotes.trim() && esNewStatus === s.status)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                              <Send className="w-3.5 h-3.5" /> {esSaving ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={() => { setEsExpandedId(null); setEsNotes(''); setEsNewStatus(''); }}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">إلغاء</button>
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
      )}
    </div>
  );
};
