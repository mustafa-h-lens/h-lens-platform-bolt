import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavPhase } from '../lib/navTransition';

const LOGO = '/assets/logo-white.png';

export function NavTransitionOverlay() {
  const { phase, forceDark } = useNavPhase();

  useEffect(() => {
    const body = document.body;
    if (phase === 'leaving') {
      body.classList.add('page-content-leaving');
    } else if (phase !== 'leaving') {
      body.classList.remove('page-content-leaving');
    }
    return () => { body.classList.remove('page-content-leaving'); };
  }, [phase]);

  if (phase === 'idle') return null;

  const cls =
    'nav-transition-overlay' +
    (phase === 'leaving' ? ' nav-overlay-leaving' :
     phase === 'waiting' ? ' nav-overlay-waiting' :
     ' nav-overlay-exiting') +
    (forceDark ? ' nav-overlay-force-dark' : '');

  return createPortal(
    <div className={cls} aria-hidden="true">
      <div className="nav-transition-veil" />
      <div className="nav-transition-content">
        <img src={LOGO} alt="" className="nav-transition-logo" draggable={false} />
        <div className="nav-transition-progress">
          <div className="nav-transition-progress-bar" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
