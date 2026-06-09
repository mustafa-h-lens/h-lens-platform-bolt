import { useEffect, useState } from 'react';

const LOGO = '/assets/logo-white.png';
const VISIBLE_MS = 600;
const FADE_MS = 400;

export function BootSplash() {
  // Show only on the genuine first load of a browser session. On any later App
  // re-mount (e.g. the post-registration hard redirect reloads the app) the
  // splash must NOT re-appear — otherwise this z-index:100000 dark veil covers
  // whatever renders (e.g. the registration SuccessScreen).
  const [stage, setStage] = useState<'visible' | 'leaving' | 'gone'>(() => {
    try { return sessionStorage.getItem('hl_boot_splash_shown') ? 'gone' : 'visible'; }
    catch { return 'visible'; }
  });

  useEffect(() => {
    if (stage === 'gone') return;
    try { sessionStorage.setItem('hl_boot_splash_shown', '1'); } catch { /* ignore */ }
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
