import { useEffect, useMemo, useState } from 'react';
import { GitCommit, RefreshCw, CheckCircle2, AlertCircle, Clock, ExternalLink, Sparkles, Info } from 'lucide-react';

const REPO = 'mustafa-h-lens/h-lens-platform-bolt';
const BRANCH = 'main';
const PER_PAGE = 12;
const LAST_SEEN_KEY = 'hl-last-seen-build-sha';

interface RemoteCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

const BUILD_SHA = (typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : '').toLowerCase();
const BUILD_MSG = typeof __GIT_MSG__ !== 'undefined' ? __GIT_MSG__ : '';
const BUILD_DATE = typeof __GIT_DATE__ !== 'undefined' ? __GIT_DATE__ : '';

/** Map a SHA to a vivid HSL color. Same SHA -> same color, every push -> different color. */
function colorForSha(sha: string): { fg: string; bg: string; ring: string; hue: number } {
  let h = 0;
  for (let i = 0; i < sha.length; i++) h = ((h << 5) - h + sha.charCodeAt(i)) | 0;
  const hue = ((h % 360) + 360) % 360;
  return {
    fg: `hsl(${hue}, 78%, 62%)`,
    bg: `hsl(${hue}, 70%, 14%)`,
    ring: `hsl(${hue}, 80%, 55%)`,
    hue,
  };
}

export const DeploymentStatus = () => {
  const [commits, setCommits] = useState<RemoteCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const buildColor = useMemo(() => colorForSha(BUILD_SHA || 'unknown'), []);

  // "New build since last visit?" — flips for one render after each successful deploy.
  const previouslySeen = useMemo(() => {
    try { return localStorage.getItem(LAST_SEEN_KEY) || ''; } catch { return ''; }
  }, []);
  const isNewSinceLastVisit = !!BUILD_SHA && !!previouslySeen && previouslySeen !== BUILD_SHA;
  useEffect(() => {
    if (BUILD_SHA && previouslySeen !== BUILD_SHA) {
      try { localStorage.setItem(LAST_SEEN_KEY, BUILD_SHA); } catch { /* no-op */ }
    }
  }, [previouslySeen]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${REPO}/commits?sha=${BRANCH}&per_page=${PER_PAGE}`,
        { headers: { Accept: 'application/vnd.github+json' } },
      );
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data: any[] = await res.json();
      setCommits(
        data.map(c => ({
          sha: (c.sha || '').toLowerCase(),
          message: (c.commit?.message || '').split('\n')[0],
          author: c.commit?.author?.name || c.author?.login || 'unknown',
          date: c.commit?.author?.date || c.commit?.committer?.date || '',
          url: c.html_url || '',
        })),
      );
      setFetchedAt(new Date());
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل السجل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deployedIndex = useMemo(() => {
    if (!BUILD_SHA) return -1;
    return commits.findIndex(c => c.sha.startsWith(BUILD_SHA) || BUILD_SHA.startsWith(c.sha.slice(0, 7)));
  }, [commits]);

  const isUpToDate = deployedIndex === 0;
  const isStale = deployedIndex > 0;

  const status = (() => {
    if (loading && commits.length === 0) {
      return { label: 'جاري التحقق…', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)', Icon: Clock };
    }
    if (isUpToDate) {
      return { label: 'النشر محدّث', color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', Icon: CheckCircle2 };
    }
    if (isStale) {
      return { label: `النشر متأخر بـ ${deployedIndex} كومت`, color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', Icon: AlertCircle };
    }
    return { label: 'بِنية غير معروفة', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', Icon: AlertCircle };
  })();
  const StatusIcon = status.Icon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── BUILD-COLOR SIGNATURE BLOCK ──
          Each push = a different color block. Open the page → if the color
          changed since last time you looked, the new build is live. */}
      <div style={{
        position: 'relative',
        background: buildColor.bg,
        border: `2px solid ${buildColor.ring}`,
        borderRadius: 'var(--radius-lg)',
        padding: 22,
        overflow: 'hidden',
        boxShadow: `0 0 0 4px ${buildColor.ring}25, 0 12px 40px ${buildColor.ring}30`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 30% 20%, ${buildColor.fg}40, transparent 60%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{
            width: 78, height: 78, borderRadius: 18,
            background: buildColor.fg,
            boxShadow: `0 6px 30px ${buildColor.ring}80, inset 0 0 24px rgba(255,255,255,0.18)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 24, fontFamily: 'monospace',
            letterSpacing: '-0.02em',
            flexShrink: 0,
          }}>
            #{(BUILD_SHA || '????').slice(0, 4)}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: buildColor.fg, letterSpacing: '0.12em', marginBottom: 4 }}>
              BUILD SIGNATURE · بصمة الإصدار
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {BUILD_SHA || '????????'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6, lineHeight: 1.6 }}>
              لكل نشر لون فريد. إذا تغير اللون منذ آخر زيارة فالنشر نجح ✓
            </div>
          </div>
          {isNewSinceLastVisit && (
            <div style={{
              padding: '8px 14px', borderRadius: 999,
              background: '#10b981', color: '#fff',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 800,
              boxShadow: '0 4px 16px rgba(16,185,129,0.5)',
              animation: 'ds-pulse 1.5s ease-in-out 2',
            }}>
              <Sparkles size={14} /> نشر جديد منذ آخر زيارة
            </div>
          )}
        </div>
      </div>

      {/* ── HOW IT WORKS HELPER ── */}
      <div style={{
        background: 'rgba(59,130,246,0.07)',
        border: '1px solid rgba(59,130,246,0.22)',
        borderRadius: 'var(--radius-md)',
        padding: 12,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Info size={16} style={{ color: 'var(--accent-lighter)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-primary)' }}>كيف تعمل هذه الصفحة؟</strong>{' '}
          المربع الملون أعلى الصفحة هو بصمة بناء التطبيق المُحمّل عندك حالياً ({BUILD_SHA?.slice(0, 7) || '????'}).
          أسفل ذلك تجد آخر الكومتات على GitHub. الكومت المُحدد بشريط أخضر هو الكومت الذي تشاهده الآن في المتصفح.
          الكومتات الموجودة <strong style={{ color: '#fbbf24' }}>فوقه</strong> دُفعت إلى GitHub لكن <strong>لم يتم نشرها بعد</strong> —
          انتظر دقيقة أو دقيقتين واضغط "تحديث". إذا بقيت "غير منشور" لأكثر من 5 دقائق فعلى الأرجح أن Bolt لم يلتقط الدفعة.
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${status.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: 14,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: status.bg, border: `1px solid ${status.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <StatusIcon size={18} style={{ color: status.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: status.color }}>{status.label}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }} title={BUILD_MSG}>
            {BUILD_MSG ? truncate(BUILD_MSG, 80) : '—'}
            {BUILD_DATE && ` · ${relativeTime(BUILD_DATE)}`}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={load}
          disabled={loading}
          style={{ gap: 6 }}
          title="تحديث القائمة"
        >
          <RefreshCw size={13} className={loading ? 'ds-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* ── COMMIT LIST ── */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitCommit size={15} style={{ color: 'var(--accent-lighter)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>آخر الكومتات على main</span>
          </div>
          {fetchedAt && (
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              تم التحديث {relativeTime(fetchedAt.toISOString())}
            </span>
          )}
        </div>

        {error && (
          <div style={{ padding: 16, color: '#f87171', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {!error && commits.length === 0 && !loading && (
          <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 12.5, textAlign: 'center' }}>
            لا يوجد كومتات
          </div>
        )}

        {commits.map((c, i) => {
          const isDeployed = i === deployedIndex;
          const isAhead = deployedIndex > 0 && i < deployedIndex;
          const c1 = colorForSha(c.sha);
          return (
            <div
              key={c.sha}
              style={{
                padding: '12px 16px',
                borderBottom: i < commits.length - 1 ? '1px solid var(--border-soft)' : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
                background: isDeployed
                  ? 'linear-gradient(90deg, rgba(16,185,129,0.10), transparent)'
                  : isAhead
                    ? 'linear-gradient(90deg, rgba(245,158,11,0.07), transparent)'
                    : 'transparent',
                position: 'relative',
              }}
            >
              {/* Color signature swatch — same color on the SHA, so the user can
                  visually compare commit colors against the hero block. */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: c1.fg,
                boxShadow: isDeployed ? `0 0 0 3px rgba(16,185,129,0.55)` : `0 0 0 1px rgba(255,255,255,0.06)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 11, fontFamily: 'monospace',
              }}>
                {isDeployed
                  ? <CheckCircle2 size={16} color="#fff" />
                  : isAhead
                    ? <AlertCircle size={15} color="#fff" />
                    : <span>{c.sha.slice(0, 4)}</span>}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: isDeployed ? '#34d399' : 'var(--accent-lighter)' }}>
                    {c.sha.slice(0, 7)}
                  </span>
                  {isDeployed && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 999,
                      background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)',
                      color: '#34d399', fontSize: 10, fontWeight: 800,
                    }}>قيد النشر — هذا ما تشاهده</span>
                  )}
                  {isAhead && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 999,
                      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.32)',
                      color: '#fbbf24', fontSize: 10, fontWeight: 800,
                    }}>غير منشور — في انتظار Bolt</span>
                  )}
                </div>
                <div style={{
                  fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 600,
                  marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={c.message}>
                  {c.message}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {c.author} · {relativeTime(c.date)}
                </div>
              </div>

              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '6px 8px', borderRadius: 8,
                    color: 'var(--text-muted)', fontSize: 11,
                    textDecoration: 'none', flexShrink: 0,
                  }}
                  title="فتح على GitHub"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes ds-spin { to { transform: rotate(360deg); } }
        .ds-spin { animation: ds-spin 0.8s linear infinite; }
        @keyframes ds-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      `}</style>
    </div>
  );
};

function relativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return 'قبل ثوانٍ';
  const min = Math.round(sec / 60);
  if (min < 60) return `قبل ${min} د`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `قبل ${hr} س`;
  const day = Math.round(hr / 24);
  if (day < 7) return `قبل ${day} يوم`;
  return d.toLocaleDateString('en-CA');
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

export default DeploymentStatus;
