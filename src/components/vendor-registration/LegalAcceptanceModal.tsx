import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Section {
  id: string;
  icon?: string;
  title: string;
  body?: string;
  items?: Array<{ title: string; desc: string }>;
}

interface LegalContent {
  lastUpdated?: string;
  sections: Section[];
}

interface Props {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
}

const SCROLL_BOTTOM_TOLERANCE_PX = 30;

export const LegalAcceptanceModal = ({ open, onAccept, onClose }: Props) => {
  const [terms, setTerms] = useState<LegalContent | null>(null);
  const [privacy, setPrivacy] = useState<LegalContent | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setChecked(false);
    setScrolledToBottom(false);
    setScrollProgress(0);
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [t, p] = await Promise.all([
          supabase.from('legal_pages').select('content').eq('type', 'terms').eq('is_active', true).maybeSingle(),
          supabase.from('legal_pages').select('content').eq('type', 'privacy').eq('is_active', true).maybeSingle(),
        ]);
        if (t.error || p.error) throw t.error || p.error;
        setTerms((t.data?.content as LegalContent) || null);
        setPrivacy((p.data?.content as LegalContent) || null);
      } catch (e: any) {
        setError(e?.message || 'تعذّر تحميل النصوص');
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  // Re-evaluate scroll-to-bottom whenever content lengths change (in case the
  // initial fetch resolves and the body grew taller than the container).
  useEffect(() => {
    if (!scrollRef.current) return;
    handleScroll({ currentTarget: scrollRef.current } as any);
  }, [terms, privacy]);

  if (!open) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      setScrollProgress(100);
      setScrolledToBottom(true);
      return;
    }
    const pct = Math.min(100, Math.round((el.scrollTop / max) * 100));
    setScrollProgress(pct);
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_TOLERANCE_PX) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (!checked || !scrolledToBottom) return;
    onAccept();
  };

  return (
    <div style={overlayStyle} onClick={onClose} dir="rtl">
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div style={headerStyle}>
          <div>
            <h3 style={titleStyle}>الشروط والأحكام وسياسة السرّية</h3>
            <p style={subtitleStyle}>اقرأ النص حتى النهاية للموافقة</p>
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label="إغلاق">✕</button>
        </div>

        {/* PROGRESS BAR */}
        <div style={progressTrackStyle}>
          <div style={{ ...progressFillStyle, width: `${scrollProgress}%` }} />
        </div>

        {/* SCROLLABLE BODY */}
        <div ref={scrollRef} onScroll={handleScroll} style={scrollAreaStyle}>
          {loading && (
            <div style={loadingStyle}>جاري التحميل…</div>
          )}
          {error && !loading && (
            <div style={errorStyle}>تعذّر تحميل النصوص — {error}</div>
          )}
          {!loading && !error && (
            <>
              <DocSection icon="📜" docTitle="الشروط والأحكام" content={terms} accent="#3b82f6" />
              <hr style={dividerStyle} />
              <DocSection icon="🔐" docTitle="سياسة السرّية" content={privacy} accent="#10b981" />
              <div style={endMarkerStyle}>— نهاية النصوص —</div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div style={footerStyle}>
          {!scrolledToBottom && (
            <div style={hintStyle}>
              ⬇ اسحب للأسفل حتى نهاية النصوص لتتمكن من الموافقة
            </div>
          )}
          <label
            style={{
              ...checkboxRowStyle,
              opacity: scrolledToBottom ? 1 : 0.45,
              cursor: scrolledToBottom ? 'pointer' : 'not-allowed',
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={!scrolledToBottom}
              style={{ width: 18, height: 18, cursor: 'inherit', accentColor: '#3b82f6' }}
            />
            <span>قرأت وأوافق على الشروط والأحكام وسياسة السرّية، وأقر بأن جميع البيانات المدخلة صحيحة ودقيقة.</span>
          </label>
          <div style={actionsStyle}>
            <button type="button" onClick={onClose} style={ghostBtnStyle}>إلغاء</button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!checked || !scrolledToBottom}
              style={{
                ...primaryBtnStyle,
                opacity: (checked && scrolledToBottom) ? 1 : 0.5,
                cursor: (checked && scrolledToBottom) ? 'pointer' : 'not-allowed',
              }}
            >
              موافق ومتابعة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DocSection = ({ icon, docTitle, content, accent }: { icon: string; docTitle: string; content: LegalContent | null; accent: string }) => {
  if (!content || !content.sections?.length) {
    return (
      <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>
        {icon} {docTitle} — (لا يوجد محتوى منشور)
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: 0 }}>{docTitle}</h4>
      </div>
      {content.sections.map((s) => (
        <div key={s.id} style={{
          background: 'rgba(15,23,42,0.6)',
          border: `1px solid ${accent}33`,
          borderRadius: 12, padding: 14, marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{s.icon || '•'}</span>
            <h5 style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>{s.title}</h5>
          </div>
          {s.body && (
            <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.85, margin: 0 }}>{s.body}</p>
          )}
          {s.items && s.items.length > 0 && (
            <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {s.items.map((it, i) => (
                <li key={i} style={{
                  display: 'flex', gap: 8, padding: '7px 10px',
                  background: 'rgba(148,163,184,0.05)', borderRadius: 8,
                  fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0, marginTop: 8 }} />
                  <div>
                    <strong style={{ color: '#f1f5f9' }}>{it.title}:</strong> {it.desc}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(2,6,23,0.78)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16,
  fontFamily: 'Tajawal, Cairo, sans-serif',
};

const cardStyle: React.CSSProperties = {
  background: '#0b1220',
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: 18,
  width: '100%', maxWidth: 720, maxHeight: '94vh',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid rgba(148,163,184,0.12)',
  background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.10))',
};

const titleStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: 0 };
const subtitleStyle: React.CSSProperties = { fontSize: 11.5, color: '#94a3b8', margin: '2px 0 0 0' };

const closeBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10,
  background: 'rgba(148,163,184,0.08)',
  border: '1px solid rgba(148,163,184,0.15)',
  color: '#cbd5e1', cursor: 'pointer', fontSize: 14,
};

const progressTrackStyle: React.CSSProperties = {
  height: 3, background: 'rgba(148,163,184,0.12)', flexShrink: 0,
};
const progressFillStyle: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #3b82f6, #10b981)',
  transition: 'width 0.15s ease',
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: 18,
  background: '#020617',
};

const loadingStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 30, color: '#94a3b8', fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  padding: 14, background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
  color: '#fca5a5', fontSize: 13,
};

const dividerStyle: React.CSSProperties = {
  border: 'none', borderTop: '1px dashed rgba(148,163,184,0.25)',
  margin: '20px 0',
};

const endMarkerStyle: React.CSSProperties = {
  textAlign: 'center', padding: '14px 0',
  fontSize: 11.5, color: '#64748b', letterSpacing: '0.1em',
};

const footerStyle: React.CSSProperties = {
  padding: '14px 18px',
  borderTop: '1px solid rgba(148,163,184,0.12)',
  background: 'rgba(15,23,42,0.6)',
  display: 'flex', flexDirection: 'column', gap: 12,
};

const hintStyle: React.CSSProperties = {
  fontSize: 11.5, color: '#fbbf24',
  background: 'rgba(245,158,11,0.08)',
  border: '1px solid rgba(245,158,11,0.25)',
  padding: '7px 10px', borderRadius: 8, textAlign: 'center',
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10,
  fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 10,
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 10,
  background: 'rgba(148,163,184,0.08)',
  border: '1px solid rgba(148,163,184,0.18)',
  color: '#cbd5e1', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10,
  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
  border: 'none', color: '#fff',
  fontSize: 13, fontWeight: 800,
  fontFamily: 'inherit',
  boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
};

export default LegalAcceptanceModal;
