import { useState, useEffect } from 'react';
import { Folder, User, Calendar, Clapperboard, Zap, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { StatusBadge, EmptyState, LoadingSpinner } from './shared';
import type { Project } from './shared/types';

export function VendorProjects() {
  const { vendor } = useVendor();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { if (vendor?.id) fetchProjects(); }, [vendor?.id]);

  const fetchProjects = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      // TODO: production_tasks doesn't have vendor assignment yet
      const { data, error } = { data: [], error: null };

      if (!error && data) {
        const mapped = data
          .filter((t: any) => t.projects)
          .map((t: any) => ({
            id: t.projects.id, name: t.projects.name,
            status: t.projects.status || t.status,
            start_date: t.projects.start_date, end_date: t.projects.end_date,
            vendor_role: t.name, clients: t.clients,
          }));
        const unique = mapped.filter((p: Project, i: number, arr: Project[]) => arr.findIndex(x => x.id === p.id) === i);
        setProjects(unique);
      } else {
        setProjects([]);
      }
    } catch { setProjects([]); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);
  const stats = {
    active: projects.filter(p => ['in_progress', 'active'].includes(p.status)).length,
    done: projects.filter(p => p.status === 'completed').length,
    total: projects.length,
  };

  const STAT_CARDS = [
    { l: 'جارية', v: stats.active, c: '#3b82f6', icon: Zap },
    { l: 'مكتملة', v: stats.done, c: '#10b981', icon: CheckCircle },
    { l: 'الإجمالي', v: stats.total, c: '#8b5cf6', icon: Folder },
  ];

  const filters = [
    { k: 'all', l: 'الكل', icon: null },
    { k: 'in_progress', l: 'جارية', icon: Zap },
    { k: 'completed', l: 'مكتملة', icon: CheckCircle },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {STAT_CARDS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="vp-card sc" style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: -14, left: -14, width: 60, height: 60, borderRadius: '50%', background: `${s.c}15`, filter: 'blur(18px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon size={18} style={{ color: s.c }} />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.c, lineHeight: 1, marginBottom: 4 }}>{s.v}</div>
                <div style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--textSec)' }}>{s.l}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filters.map(f => {
          const Icon = f.icon;
          return (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`vp-chip${filter === f.k ? ' active' : ''}`}>
              {Icon && <Icon size={13} />}
              {f.l}
            </button>
          );
        })}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Folder} message="لا توجد مشاريع بعد" />
      ) : (
        filtered.map(p => (
          <div key={p.id} className="vp-card" style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', borderRadius: 16 }}>
            <div onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.88rem', fontWeight: 700, color: 'var(--textPri)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '.73rem', color: 'var(--textMut)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {p.clients && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={11} /> {p.clients.name}</span>}
                  {p.start_date && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={11} /> {new Date(p.start_date).toLocaleDateString('en-US')}</span>}
                  {p.vendor_role && (
                    <span style={{ padding: '2px 8px', borderRadius: 5, background: 'var(--tagBg)', color: 'var(--tagC)', fontWeight: 700, fontSize: '.68rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clapperboard size={11} /> {p.vendor_role}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={p.status} />
              {expanded === p.id ? <ChevronUp size={16} style={{ color: 'var(--textMut)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--textMut)', flexShrink: 0 }} />}
            </div>
            {expanded === p.id && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--rowHover)' }}>
                <span style={{ fontSize: '.76rem', color: 'var(--textMut)' }}>
                  تم إسناد هذا المشروع إليك — دورك: <strong style={{ color: 'var(--tagC)' }}>{p.vendor_role || 'مورد'}</strong>
                </span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
