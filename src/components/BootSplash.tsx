import { useEffect, useState } from 'react';

const LOGO = '/assets/logo-white.png';
const VISIBLE_MS = 600;
const FADE_MS = 400;

export function BootSplash() {
  const [stage, setStage] = useState<'visible' | 'leaving' | 'gone'>('visible');

  useEffect(() => {
    let cancelled = false;
    const t1 = window.setTimeout(() => {
      if (!cancelled) setStage('leaving');
    }, VISIBLE_MS);
    const t2 = window.setTimeout(() => {
      if (!cancelled) setStage('gone');
    }, VISIBLE_MS + FADE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (stage === 'gone') return null;

  return (
    <div
      className={'app-boot-splash' + (stage === 'leaving' ? ' is-leaving' : '')}
      aria-hidden="true"
    >
      <img src={LOGO} alt="" className="app-boot-splash-logo" draggable={false} />
      <div className="app-boot-splash-bar" />
    </div>
  );
}
