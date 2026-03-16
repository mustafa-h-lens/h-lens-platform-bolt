import { useState, useEffect } from 'react';
import { Lightbulb, Plus, X, Send, Clock, CheckCircle, XCircle, Eye, Zap, MessageSquare, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';

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

const CATEGORIES = [
  { value: 'feature', label: 'ميزة جديدة', icon: Zap },
  { value: 'improvement', label: 'تحسين', icon: Lightbulb },
  { value: 'bug', label: 'مشكلة', icon: XCircle },
  { value: 'other', label: 'أخرى', icon: MessageSquare },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  new:          { label: 'جديد',         color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: Clock },
  under_review: { label: 'قيد المراجعة', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Eye },
  accepted:     { label: 'مقبول',        color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle },
  rejected:     { label: 'مرفوض',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle },
  implemented:  { label: 'تم التنفيذ',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  icon: Zap },
};

export const VendorSuggestions = () => {
  const { vendor } = useVendor();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'feature' });

  useEffect(() => {
    if (vendor?.id) fetchSuggestions();
  }, [vendor?.id]);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_suggestions')
        .select('*')
        .eq('vendor_id', vendor!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSuggestions(data || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim() || !vendor?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('vendor_suggestions').insert([{
        vendor_id: vendor.id,
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
      }]);
      if (error) throw error;
      setForm({ title: '', content: '', category: 'feature' });
      setShowModal(false);
      fetchSuggestions();
    } catch (err) {
      console.error('Error submitting suggestion:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getCategoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || 'أخرى';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ color: 'var(--textSec)', fontSize: '.9rem' }}>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(245,158,11,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Lightbulb size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--textPri)', margin: 0 }}>صندوق الاقتراحات</h2>
            <p style={{ fontSize: '.75rem', color: 'var(--textSec)', margin: 0 }}>شاركنا أفكارك لتحسين المنصة</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="vp-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: '.82rem', fontWeight: 600 }}
        >
          <Plus size={16} />
          اقتراح جديد
        </button>
      </div>

      {/* Suggestions List */}
      {suggestions.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16,
        }}>
          <Lightbulb size={48} style={{ color: 'var(--textMut)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--textSec)', fontSize: '.9rem', marginBottom: 4 }}>لا توجد اقتراحات بعد</p>
          <p style={{ color: 'var(--textMut)', fontSize: '.78rem' }}>شاركنا أفكارك واقتراحاتك لتحسين تجربتك</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.map(s => {
            const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.new;
            const StatusIcon = status.icon;
            const isExpanded = expandedId === s.id;

            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 14, overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12,
                    textAlign: 'right', color: 'var(--textPri)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '.92rem', fontWeight: 600, color: 'var(--textPri)' }}>{s.title}</span>
                      {s.admin_response && (
                        <MessageSquare size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.72rem', color: 'var(--textSec)' }}>
                      <span>{formatDate(s.created_at)}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6,
                        background: 'var(--border)', color: 'var(--textSec)',
                        fontSize: '.68rem',
                      }}>
                        {getCategoryLabel(s.category)}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 8,
                    background: status.bg, color: status.color,
                    fontSize: '.72rem', fontWeight: 600, flexShrink: 0,
                  }}>
                    <StatusIcon size={13} />
                    {status.label}
                  </span>
                  <ChevronDown size={16} style={{
                    color: 'var(--textMut)', flexShrink: 0,
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }} />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)' }}>
                    <p style={{
                      fontSize: '.84rem', lineHeight: 1.7, color: 'var(--textPri)',
                      marginTop: 14, whiteSpace: 'pre-wrap',
                    }}>
                      {s.content}
                    </p>

                    {s.admin_response && (
                      <div style={{
                        marginTop: 14, padding: '12px 14px', borderRadius: 10,
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <MessageSquare size={14} style={{ color: '#10b981' }} />
                          <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#10b981' }}>رد الإدارة</span>
                          {s.responded_at && (
                            <span style={{ fontSize: '.68rem', color: 'var(--textMut)', marginRight: 'auto' }}>
                              {formatDate(s.responded_at)}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '.82rem', lineHeight: 1.7, color: 'var(--textPri)', whiteSpace: 'pre-wrap', margin: 0 }}>
                          {s.admin_response}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Suggestion Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div onClick={() => setShowModal(false)} style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'relative', width: '100%', maxWidth: 480,
            background: 'var(--cardSolid)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 24,
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--textPri)', margin: 0 }}>اقتراح جديد</h3>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--textMut)', padding: 4,
              }}>
                <X size={18} />
              </button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--textSec)', marginBottom: 6 }}>
                عنوان الاقتراح
              </label>
              <input
                className="vp-inp"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="اكتب عنوان مختصر لاقتراحك"
                style={{ width: '100%', fontSize: '.85rem' }}
              />
            </div>

            {/* Category */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--textSec)', marginBottom: 6 }}>
                التصنيف
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => {
                  const CatIcon = cat.icon;
                  const isSelected = form.category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 8,
                        border: `1px solid ${isSelected ? 'var(--borderHi)' : 'var(--border)'}`,
                        background: isSelected ? 'rgba(59,130,246,0.1)' : 'transparent',
                        color: isSelected ? '#3b82f6' : 'var(--textSec)',
                        fontSize: '.78rem', fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <CatIcon size={14} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--textSec)', marginBottom: 6 }}>
                تفاصيل الاقتراح
              </label>
              <textarea
                className="vp-inp"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="اشرح فكرتك بالتفصيل..."
                rows={4}
                style={{ width: '100%', fontSize: '.85rem', resize: 'vertical', minHeight: 100 }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.title.trim() || !form.content.trim()}
                className="vp-btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 20px', borderRadius: 10,
                  fontSize: '.85rem', fontWeight: 600,
                  opacity: submitting || !form.title.trim() || !form.content.trim() ? 0.5 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                <Send size={15} />
                {submitting ? 'جاري الإرسال...' : 'إرسال الاقتراح'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="vp-btn-ghost"
                style={{ padding: '9px 16px', borderRadius: 10, fontSize: '.85rem' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
