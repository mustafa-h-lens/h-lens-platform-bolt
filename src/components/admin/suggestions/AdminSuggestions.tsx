import { useState, useEffect } from 'react';
import {
  Lightbulb, Send, Clock, CheckCircle, XCircle, Eye, Zap,
  MessageSquare, ChevronDown, ChevronUp, User, Camera, Package,
  RotateCcw, Inbox,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { MultiSelectFilter } from '../../shared/MultiSelectFilter';
import { formatDateArabic } from '../../../lib/formatters';

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

const VS_STATUS_OPTIONS = [
  { value: 'new',          label: 'جديد' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'accepted',     label: 'مقبول' },
  { value: 'rejected',     label: 'مرفوض' },
  { value: 'implemented',  label: 'تم التنفيذ' },
];

const ES_STATUS_OPTIONS = [
  { value: 'pending',  label: 'معلق' },
  { value: 'approved', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'added',    label: 'تمت الإضافة' },
];

type StatusBadge = { label: string; className: string; dot: string; icon: typeof Clock };

const STATUS_CONFIG: Record<string, StatusBadge> = {
  new:          { label: 'جديد',         className: 'badge badge-blue',   dot: 'var(--info)',    icon: Clock },
  under_review: { label: 'قيد المراجعة', className: 'badge badge-amber',  dot: 'var(--warning)', icon: Eye },
  accepted:     { label: 'مقبول',        className: 'badge badge-green',  dot: 'var(--success)', icon: CheckCircle },
  rejected:     { label: 'مرفوض',        className: 'badge badge-red',    dot: 'var(--danger)',  icon: XCircle },
  implemented:  { label: 'تم التنفيذ',   className: 'badge badge-purple', dot: 'var(--purple)',  icon: Zap },
  pending:      { label: 'معلق',         className: 'badge badge-amber',  dot: 'var(--warning)', icon: Clock },
  approved:     { label: 'مقبول',        className: 'badge badge-green',  dot: 'var(--success)', icon: CheckCircle },
  added:        { label: 'تمت الإضافة',  className: 'badge badge-purple', dot: 'var(--purple)',  icon: CheckCircle },
};

const CATEGORY_LABELS: Record<string, string> = { feature: 'ميزة جديدة', improvement: 'تحسين', bug: 'مشكلة', other: 'أخرى' };

export const AdminSuggestions = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'vendor' | 'equipment'>('vendor');

  // ── Vendor suggestions state ──
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingVS, setLoadingVS] = useState(true);
  const [vsStatusFilter, setVsStatusFilter] = useState<string[]>([]);
  const [vsSearch, setVsSearch] = useState('');
  const [vsExpandedId, setVsExpandedId] = useState<string | null>(null);
  const [vsResponse, setVsResponse] = useState('');
  const [vsNewStatus, setVsNewStatus] = useState('');
  const [vsSaving, setVsSaving] = useState(false);

  // ── Equipment suggestions state ──
  const [equipSuggestions, setEquipSuggestions] = useState<EquipSuggestion[]>([]);
  const [loadingES, setLoadingES] = useState(true);
  const [esStatusFilter, setEsStatusFilter] = useState<string[]>([]);
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
    if (vsStatusFilter.length > 0 && !vsStatusFilter.includes(s.status)) return false;
    if (vsSearch.trim()) { const q = vsSearch.toLowerCase(); return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.vendor_name || '').toLowerCase().includes(q); }
    return true;
  });

  const filteredES = equipSuggestions.filter(s => {
    if (esStatusFilter.length > 0 && !esStatusFilter.includes(s.status)) return false;
    if (esSearch.trim()) { const q = esSearch.toLowerCase(); return s.suggestion_text.toLowerCase().includes(q) || (s.vendor_name || '').toLowerCase().includes(q); }
    return true;
  });

  const vsCounts = suggestions.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const esCounts = equipSuggestions.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  const newVsCount = (vsCounts['new'] || 0) + (vsCounts['under_review'] || 0);
  const newEsCount = esCounts['pending'] || 0;
  const acceptedVsCount = (vsCounts['accepted'] || 0) + (vsCounts['implemented'] || 0);
  const acceptedEsCount = (esCounts['approved'] || 0) + (esCounts['added'] || 0);

  return (
    <div style={{ padding: 28 }}>
      {/* Page Title */}
      <div className="page-title-row">
        <div>
          <div className="page-title">صندوق الاقتراحات</div>
          <div className="page-subtitle">إدارة اقتراحات الموردين والمعدات</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card sc-blue">
          <div className="stat-icon-box"><Lightbulb size={18} /></div>
          <div className="stat-sub">اقتراحات الموردين</div>
          <div className="stat-val">{suggestions.length}</div>
          <div className="stat-hint">إجمالي الاقتراحات المستلمة</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><Inbox size={18} /></div>
          <div className="stat-sub">بانتظار المراجعة</div>
          <div className="stat-val">{newVsCount + newEsCount}</div>
          <div className="stat-hint">اقتراحات جديدة أو قيد المراجعة</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><CheckCircle size={18} /></div>
          <div className="stat-sub">تم القبول</div>
          <div className="stat-val">{acceptedVsCount + acceptedEsCount}</div>
          <div className="stat-hint">اقتراحات مقبولة أو منفذة</div>
        </div>
        <div className="stat-card sc-purple">
          <div className="stat-icon-box"><Package size={18} /></div>
          <div className="stat-sub">اقتراحات المعدات</div>
          <div className="stat-val">{equipSuggestions.length}</div>
          <div className="stat-hint">اقتراحات المعدات الجديدة</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-colored" style={{ marginBottom: 20, display: 'flex' }}>
        <div
          className={`tab tab-blue ${activeTab === 'vendor' ? 'on' : ''}`}
          onClick={() => setActiveTab('vendor')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Lightbulb size={14} />
          اقتراحات الموردين
          {newVsCount > 0 && <span className="badge badge-amber" style={{ padding: '1px 7px', fontSize: 10 }}>{newVsCount}</span>}
        </div>
        <div
          className={`tab tab-blue ${activeTab === 'equipment' ? 'on' : ''}`}
          onClick={() => setActiveTab('equipment')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Package size={14} />
          اقتراحات المعدات
          {newEsCount > 0 && <span className="badge badge-amber" style={{ padding: '1px 7px', fontSize: 10 }}>{newEsCount}</span>}
        </div>
      </div>

      {/* ═══ VENDOR SUGGESTIONS TAB ═══ */}
      {activeTab === 'vendor' && (
        <>
          {/* Filter Bar */}
          <div className="filter-bar">
            <input
              className="input"
              placeholder="بحث في الاقتراحات..."
              value={vsSearch}
              onChange={e => setVsSearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <MultiSelectFilter
              label="الحالة"
              options={VS_STATUS_OPTIONS}
              selected={vsStatusFilter}
              onToggle={(v) => setVsStatusFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => { setVsSearch(''); setVsStatusFilter([]); }}>
              <RotateCcw size={13} /> إعادة تعيين
            </button>
          </div>

          {/* List */}
          {loadingVS ? (
            <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>
          ) : filteredVS.length === 0 ? (
            <div className="dash-empty" style={{ height: 200, flexDirection: 'column', gap: 10 }}>
              <Lightbulb size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد اقتراحات</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredVS.map(s => {
                const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.new;
                const StatusIcon = status.icon;
                const isExpanded = vsExpandedId === s.id;
                return (
                  <div key={s.id} className="card" style={{ padding: 0, cursor: 'default', overflow: 'hidden' }}>
                    <div
                      onClick={() => handleVsExpand(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, cursor: 'pointer' }}
                    >
                      <span className={status.className} style={{ flexShrink: 0 }}>
                        <StatusIcon size={12} /> {status.label}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                          {s.admin_response && <MessageSquare size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={11} /> {s.vendor_name}</span>
                          <span>{formatDateArabic(s.created_at)}</span>
                          <span className="badge badge-gray" style={{ padding: '1px 8px', fontSize: 10 }}>{CATEGORY_LABELS[s.category] || 'أخرى'}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--border-soft)', background: 'var(--bg-surface)' }}>
                        <div style={{ padding: 14, background: 'var(--bg-base)', border: '1px solid var(--border-soft)', borderRadius: 10 }}>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{s.content}</p>
                        </div>
                        {s.admin_response && (
                          <div style={{ marginTop: 12, padding: 14, background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <MessageSquare size={13} style={{ color: 'var(--success-text)' }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-text)' }}>الرد السابق</span>
                              {s.responded_at && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 'auto' }}>{formatDateArabic(s.responded_at)}</span>}
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--success-text)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{s.admin_response}</p>
                          </div>
                        )}
                        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div className="input-group">
                            <label className="input-label">تغيير الحالة</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {VS_STATUS_OPTIONS.map(opt => {
                                const cfg = STATUS_CONFIG[opt.value];
                                const selected = vsNewStatus === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setVsNewStatus(opt.value)}
                                    className={selected ? `${cfg.className}` : 'badge badge-gray'}
                                    style={{ cursor: 'pointer', border: selected ? '1px solid currentColor' : '1px solid var(--border-soft)' }}
                                  >
                                    <span className="badge-dot" style={{ background: cfg.dot }} />
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="input-group">
                            <label className="input-label">الرد</label>
                            <textarea
                              className="input"
                              value={vsResponse}
                              onChange={e => setVsResponse(e.target.value)}
                              placeholder="اكتب ردك هنا..."
                              rows={3}
                              style={{ resize: 'none', fontFamily: 'inherit' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleVsRespond(s)}
                              disabled={vsSaving || (!vsResponse.trim() && vsNewStatus === s.status)}
                              style={{ gap: 6 }}
                            >
                              <Send size={13} /> {vsSaving ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setVsExpandedId(null); setVsResponse(''); setVsNewStatus(''); }}
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
        </>
      )}

      {/* ═══ EQUIPMENT SUGGESTIONS TAB ═══ */}
      {activeTab === 'equipment' && (
        <>
          {/* Filter Bar */}
          <div className="filter-bar">
            <input
              className="input"
              placeholder="بحث في اقتراحات المعدات..."
              value={esSearch}
              onChange={e => setEsSearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <MultiSelectFilter
              label="الحالة"
              options={ES_STATUS_OPTIONS}
              selected={esStatusFilter}
              onToggle={(v) => setEsStatusFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => { setEsSearch(''); setEsStatusFilter([]); }}>
              <RotateCcw size={13} /> إعادة تعيين
            </button>
          </div>

          {/* List */}
          {loadingES ? (
            <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>
          ) : filteredES.length === 0 ? (
            <div className="dash-empty" style={{ height: 200, flexDirection: 'column', gap: 10 }}>
              <Package size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد اقتراحات معدات</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredES.map(s => {
                const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                const isExpanded = esExpandedId === s.id;
                return (
                  <div key={s.id} className="card" style={{ padding: 0, cursor: 'default', overflow: 'hidden' }}>
                    <div
                      onClick={() => handleEsExpand(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, cursor: 'pointer' }}
                    >
                      <span className={status.className} style={{ flexShrink: 0 }}>
                        <StatusIcon size={12} /> {status.label}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Camera size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.suggestion_text}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={11} /> {s.vendor_name}</span>
                          <span>{formatDateArabic(s.created_at)}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--border-soft)', background: 'var(--bg-surface)' }}>
                        <div style={{ padding: 14, background: 'var(--bg-base)', border: '1px solid var(--border-soft)', borderRadius: 10 }}>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{s.suggestion_text}</p>
                        </div>
                        {s.admin_notes && (
                          <div style={{ marginTop: 12, padding: 14, background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <MessageSquare size={13} style={{ color: 'var(--success-text)' }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-text)' }}>ملاحظات الأدمن</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--success-text)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{s.admin_notes}</p>
                          </div>
                        )}
                        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div className="input-group">
                            <label className="input-label">تغيير الحالة</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {ES_STATUS_OPTIONS.map(opt => {
                                const cfg = STATUS_CONFIG[opt.value];
                                const selected = esNewStatus === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setEsNewStatus(opt.value)}
                                    className={selected ? `${cfg.className}` : 'badge badge-gray'}
                                    style={{ cursor: 'pointer', border: selected ? '1px solid currentColor' : '1px solid var(--border-soft)' }}
                                  >
                                    <span className="badge-dot" style={{ background: cfg.dot }} />
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="input-group">
                            <label className="input-label">ملاحظات</label>
                            <textarea
                              className="input"
                              value={esNotes}
                              onChange={e => setEsNotes(e.target.value)}
                              placeholder="ملاحظات أو سبب القرار..."
                              rows={2}
                              style={{ resize: 'none', fontFamily: 'inherit' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleEsRespond(s)}
                              disabled={esSaving || (!esNotes.trim() && esNewStatus === s.status)}
                              style={{ gap: 6 }}
                            >
                              <Send size={13} /> {esSaving ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setEsExpandedId(null); setEsNotes(''); setEsNewStatus(''); }}
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
        </>
      )}
    </div>
  );
};
