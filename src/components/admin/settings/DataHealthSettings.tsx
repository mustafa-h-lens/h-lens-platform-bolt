import { useEffect, useState } from 'react';
import { Activity, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';

interface Stats {
  total: number;
  expired: number;
  abandoned: number;
  nullIdentity: number;
  oldestAgeDays: number | null;
  lastCleanupAt: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function loadStats(): Promise<Stats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString();

  const [totalRes, expiredRes, nullIdRes, oldestRes, cronRes] = await Promise.all([
    supabase
      .from('vendor_registration_drafts')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('vendor_registration_drafts')
      .select('id', { count: 'exact', head: true })
      .lt('expires_at', now.toISOString()),
    supabase
      .from('vendor_registration_drafts')
      .select('id', { count: 'exact', head: true })
      .is('identity_key', null),
    supabase
      .from('vendor_registration_drafts')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1),
    // Abandoned ≡ identity_key NULL AND updated_at < 7 days ago
    supabase
      .from('vendor_registration_drafts')
      .select('id', { count: 'exact', head: true })
      .is('identity_key', null)
      .lt('updated_at', sevenDaysAgo),
  ]);

  const oldestCreatedAt = oldestRes.data?.[0]?.created_at;
  const oldestAgeDays = oldestCreatedAt
    ? Math.floor((now.getTime() - new Date(oldestCreatedAt).getTime()) / DAY_MS)
    : null;

  return {
    total: totalRes.count || 0,
    expired: expiredRes.count || 0,
    abandoned: cronRes.count || 0,
    nullIdentity: nullIdRes.count || 0,
    oldestAgeDays,
    lastCleanupAt: null, // populated after a manual run this session
  };
}

export const DataHealthSettings = () => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastRun, setLastRun] = useState<{ at: string; expired: number; abandoned: number } | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setStats(await loadStats());
    } catch (err) {
      console.error('Data health load error:', err);
      showError('تعذر تحميل إحصائيات المسودات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const runCleanup = async () => {
    if (running) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc('delete_expired_vendor_drafts');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const expired = row?.expired_deleted ?? 0;
      const abandoned = row?.abandoned_deleted ?? 0;
      setLastRun({ at: new Date().toISOString(), expired, abandoned });
      showSuccess(`تم حذف ${expired + abandoned} مسودة (منتهية: ${expired}، مهجورة: ${abandoned})`);
      await refresh();
    } catch (err: any) {
      console.error('Cleanup error:', err);
      showError(err?.message || 'تعذر تشغيل عملية التنظيف');
    } finally {
      setRunning(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div style={{ padding: 24 }} dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Activity size={18} style={{ color: '#22c55e' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
            سلامة البيانات
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            حالة مسودات تسجيل الموردين وإجراءات التنظيف اليدوية
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : stats ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px,100%), 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <StatCard label="إجمالي المسودات" value={stats.total} color="#3b82f6" />
            <StatCard label="مسودات منتهية" value={stats.expired} color="#ef4444" hint="expires_at ← الآن" />
            <StatCard label="مسودات مهجورة" value={stats.abandoned} color="#f59e0b" hint="بلا هوية، خاملة ≥ 7 أيام" />
            <StatCard label="بدون هاتف/بريد" value={stats.nullIdentity} color="#64748b" />
            <StatCard
              label="أقدم مسودة (يوم)"
              value={stats.oldestAgeDays ?? 0}
              color="#8b5cf6"
            />
          </div>

          <div
            style={{
              padding: 16, borderRadius: 12,
              background: 'var(--bg-card)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div data-stack-mobile="true" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  تشغيل التنظيف يدوياً
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  التنظيف التلقائي مجدول يومياً الساعة 03:00 UTC عبر pg_cron. استخدم هذا الزر
                  للتشغيل الفوري إذا احتجت لذلك.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={refresh}
                  disabled={loading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={13} /> تحديث
                </button>
                <button
                  onClick={runCleanup}
                  disabled={running}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    background: '#f59e0b', border: 'none', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    opacity: running ? 0.6 : 1,
                  }}
                >
                  {running ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  تشغيل التنظيف الآن
                </button>
              </div>
            </div>
            {lastRun && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--text-muted)' }}>
                آخر تنظيف: {fmtDate(lastRun.at)} — تم حذف <strong style={{ color: '#ef4444' }}>{lastRun.expired}</strong> منتهية و
                <strong style={{ color: '#f59e0b', marginRight: 4 }}>{lastRun.abandoned}</strong> مهجورة
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

function StatCard({ label, value, color, hint }: { label: string; value: number; color: string; hint?: string }) {
  return (
    <div
      style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'var(--bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.2 }}>
        {value.toLocaleString('en-US')}
      </div>
      {hint && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}
