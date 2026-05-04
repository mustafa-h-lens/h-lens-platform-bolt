import { useEffect, useMemo, useState } from 'react';
import { GitCommit, RefreshCw, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';

const REPO = 'mustafa-h-lens/h-lens-platform-bolt';
const BRANCH = 'main';
const PER_PAGE = 12;

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

export const DeploymentStatus = () => {
  const [commits, setCommits] = useState<RemoteCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

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
  const isUnknown = deployedIndex < 0;

  const statusBadge = () => {
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
  };
  const status = statusBadge();
  const StatusIcon = status.Icon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── HERO STATUS BAR ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-overlay), var(--bg-surface))',
        border: `1px solid ${status.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: status.bg, opacity: 0.35, pointerEvents: 'none' }} />
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: status.bg, border: `1px solid ${status.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative', zIndex: 1,
        }}>
          <StatusIcon size={24} style={{ color: status.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>حالة النشر</span>
            <span style={{
              padding: '3px 10px', borderRadius: 999,
              background: status.bg, border: `1px solid ${status.border}`,
              color: status.color, fontSize: 11, fontWeight: 800,
            }}>{status.label}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-lighter)' }}>{BUILD_SHA || '????'}</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }} title={BUILD_MSG}>{BUILD_MSG || '—'}</span>
            {BUILD_DATE && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span style={{ color: 'var(--text-muted)' }}>{relativeTime(BUILD_DATE)}</span>
              </>
            )}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={load}
          disabled={loading}
          style={{ gap: 6, position: 'relative', zIndex: 1 }}
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
              {/* Vertical timeline rail dot */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDeployed ? 'rgba(16,185,129,0.18)' : isAhead ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.08)',
                border: `1px solid ${isDeployed ? 'rgba(16,185,129,0.5)' : isAhead ? 'rgba(245,158,11,0.4)' : 'rgba(148,163,184,0.18)'}`,
              }}>
                {isDeployed
                  ? <CheckCircle2 size={14} color="#34d399" />
                  : isAhead
                    ? <AlertCircle size={14} color="#fbbf24" />
                    : <GitCommit size={13} color="#94a3b8" />}
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
                    }}>قيد النشر</span>
                  )}
                  {isAhead && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 999,
                      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.32)',
                      color: '#fbbf24', fontSize: 10, fontWeight: 800,
                    }}>غير منشور</span>
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

      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
        إذا كان النشر متأخراً، انتظر دقيقة وحدّث الصفحة. GitHub API بدون مصادقة محدود بـ ٦٠ طلب/ساعة لكل IP.
      </div>

      <style>{`@keyframes ds-spin { to { transform: rotate(360deg); } } .ds-spin { animation: ds-spin 0.8s linear infinite; }`}</style>
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

export default DeploymentStatus;
