import { useEffect } from 'react';

export const SuccessScreen = () => {
  useEffect(() => {
    createConfetti();
  }, []);

  const createConfetti = () => {
    const container = document.querySelector('.confetti-container');
    if (!container) return;

    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
    const confettiCount = 80;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';

      const size = Math.random() * 8 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const startX = Math.random() * 100 - 50;
      const endX = startX + (Math.random() * 200 - 100);
      const endY = Math.random() * -600 - 200;
      const rotation = Math.random() * 1080;
      const delay = Math.random() * 0.5;
      const duration = Math.random() * 2 + 2;
      const borderRadius = Math.random() > 0.5 ? '50%' : '2px';

      confetti.style.setProperty('--size', `${size}px`);
      confetti.style.setProperty('--color', color);
      confetti.style.setProperty('--tx', `${endX}px`);
      confetti.style.setProperty('--ty', `${endY}px`);
      confetti.style.setProperty('--rot', `${rotation}deg`);
      confetti.style.setProperty('--delay', `${delay}s`);
      confetti.style.setProperty('--duration', `${duration}s`);
      confetti.style.setProperty('--br', borderRadius);
      confetti.style.left = `calc(50% + ${startX}px)`;

      container.appendChild(confetti);
    }
  };

  return (
    <div data-theme="dark" dir="rtl" lang="ar" className="reg-bg" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="success-screen show">
          <div className="confetti-container"></div>
          <div className="success-glow"></div>
          <div className="success-glow-ring"></div>

          <div className="success-card">
            <div className="success-circle">✓</div>
            <h2 className="success-title">تم استلام طلبك بنجاح!</h2>
            <p className="success-sub">
              <span className="sparkle">✨</span>
              مرحباً بك في عائلة Half Lens
              <span className="sparkle">✨</span>
            </p>

            <div className="success-info-card">
              <div className="success-info-header">
                <span className="success-info-icon">📋</span>
                <span>الخطوات القادمة</span>
              </div>
              <ul className="success-steps">
                <li>
                  <span className="success-check">✓</span>
                  <span>سيتم مراجعة طلبك خلال 24-48 ساعة عمل</span>
                </li>
                <li>
                  <span className="success-check">✓</span>
                  <span>ستصلك رسالة على جوالك عند قبول الطلب</span>
                </li>
                <li>
                  <span className="success-check">✓</span>
                  <span>بعد القبول يمكنك البدء في استقبال المشاريع</span>
                </li>
              </ul>
            </div>

            <div className="success-note-card">
              <span className="success-note-icon">💡</span>
              <span>تأكد من الاحتفاظ بجوالك قريباً للتواصل السريع</span>
            </div>

            <button
              className="success-btn"
              onClick={() => window.location.href = 'https://h-lens.co'}
              type="button"
            >
              العودة إلى الصفحة الرئيسية
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
