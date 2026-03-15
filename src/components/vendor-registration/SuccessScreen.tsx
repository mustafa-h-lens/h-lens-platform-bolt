export const SuccessScreen = () => {
  return (
    <div data-theme="dark" dir="rtl" lang="ar" className="reg-bg" style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="success-screen" style={{ display: 'block' }}>
          <div className="success-circle">✓</div>
          <h2 className="success-title">تم استلام طلبك بنجاح!</h2>
          <p className="success-sub">مرحباً بك في عائلة Half Lens ✨</p>
          <div className="info-box green" style={{ textAlign: 'right', maxWidth: 440, margin: '0 auto' }}>
            <span className="info-icon">📋</span>
            <div>
              <strong>الخطوات القادمة:</strong><br />
              • سيتم مراجعة طلبك خلال 24-48 ساعة عمل<br />
              • ستصلك رسالة على جوالك عند قبول الطلب<br />
              • بعد القبول يمكنك البدء في استقبال المشاريع
            </div>
          </div>
          <div style={{ marginTop: 32 }}>
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = 'https://h-lens.co'}
              style={{ padding: '12px 32px', fontSize: 15 }}
              type="button"
            >
              العودة إلى الصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
