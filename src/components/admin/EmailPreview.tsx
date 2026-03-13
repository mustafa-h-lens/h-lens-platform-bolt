import React from 'react';

const EmailPreview: React.FC = () => {
  // Sample data for preview
  const otp = '1234';
  const email = 'vendor@example.com';
  const deviceInfo = 'Chrome على Windows';
  const requestTime = new Date().toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Riyadh'
  });

  const digits = otp.padStart(4, '0').slice(0, 4).split('');

  return (
    <div style={{ padding: '32px 16px', backgroundColor: '#0a0f1e', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '24px' }}>
        <h1 style={{ color: '#e2e8f0', marginBottom: '10px', fontSize: '24px', fontWeight: 700 }}>OTP Email Template Preview</h1>
        <p style={{ color: 'rgba(255,255,255,0.58)', marginBottom: '20px', fontSize: '14px' }}>
          This is how your OTP email appears to vendors. Scroll down to see the full template.
        </p>
      </div>

      {/* Email Preview - Exact copy from send-otp-email */}
      <div style={{ fontFamily: 'Cairo, Arial, sans-serif' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        `}</style>

        <div className="email-wrap" style={{
          maxWidth: '640px',
          margin: '0 auto',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)'
        }}>
          {/* Header */}
          <div className="email-header" style={{
            background: 'linear-gradient(135deg, #04081a 0%, #0a1628 100%)',
            padding: '32px 36px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              content: '',
              position: 'absolute',
              top: '-30%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(29,78,216,0.15) 0%, transparent 65%)',
              pointerEvents: 'none'
            }} />

            <div className="logo-area" style={{ position: 'relative', zIndex: 1 }}>
              <img
                src="/Logo_White.png"
                alt="Half Lens"
                style={{ height: '42px', objectFit: 'contain' }}
              />
              <div className="header-badge" style={{
                display: 'inline-block',
                marginTop: '14px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(37,99,235,0.12)',
                border: '1px solid rgba(59,130,246,0.2)',
                fontSize: '12px',
                fontWeight: 700,
                color: '#93c5fd',
                letterSpacing: '.04em'
              }}>
                Vendor Portal Access
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="email-body" style={{
            background: '#060d1e',
            padding: '36px',
            direction: 'rtl'
          }}>
            <div className="greeting" style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#e2e8f0',
              marginBottom: '10px'
            }}>
              مرحبًا،
            </div>
            <div className="body-text" style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.58)',
              lineHeight: '1.9',
              marginBottom: '22px'
            }}>
              تلقّينا طلبًا لتسجيل الدخول إلى حسابك في منصة <strong style={{ color: '#ffffff' }}>Half Lens</strong>.
              استخدم رمز التحقق التالي لإكمال عملية الدخول بشكل آمن.
            </div>

            {/* OTP Container */}
            <div className="otp-container" style={{ textAlign: 'center', margin: '28px 0' }}>
              <div className="otp-label" style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.34)',
                letterSpacing: '.08em',
                marginBottom: '12px',
                textTransform: 'uppercase'
              }}>
                OTP Verification Code
              </div>
              <div className="otp-boxes" style={{
                direction: 'ltr',
                textAlign: 'center',
                marginBottom: '12px'
              }}>
                {digits.map((digit, index) => (
                  <span key={index} className="otp-digit" style={{
                    display: 'inline-block',
                    width: '58px',
                    height: '64px',
                    lineHeight: '64px',
                    margin: '0 5px',
                    borderRadius: '12px',
                    background: 'rgba(37,99,235,0.15)',
                    border: '2px solid rgba(59,130,246,0.35)',
                    fontSize: '32px',
                    fontWeight: 900,
                    color: '#93c5fd',
                    fontFamily: 'Cairo, Arial, sans-serif',
                    boxShadow: '0 0 20px rgba(37,99,235,0.15)',
                    textAlign: 'center'
                  }}>
                    {digit}
                  </span>
                ))}
              </div>
              <div className="otp-expiry" style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.34)',
                marginTop: '12px',
                textAlign: 'center'
              }}>
                صالح لمدة 10 دقائق فقط
              </div>
            </div>

            {/* Warning Box */}
            <div className="warning-box" style={{
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '11px',
              padding: '13px 15px',
              margin: '20px 0'
            }}>
              <p style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.52)',
                lineHeight: '1.8',
                margin: 0
              }}>
                <strong style={{ color: 'rgba(255,255,255,0.82)' }}>تنبيه أمني:</strong>
                {' '}إذا لم تقم أنت بطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان. لا تشارك هذا الرمز مع أي شخص.
              </p>
            </div>

            {/* Info Row */}
            <div className="info-row" style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px',
              padding: '13px 15px',
              margin: '16px 0'
            }}>
              <div className="info-title" style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.72)',
                marginBottom: '8px'
              }}>
                تفاصيل الطلب
              </div>
              <div className="info-item" style={{
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: '13px'
              }}>
                <span className="info-label" style={{
                  display: 'inline-block',
                  color: 'rgba(255,255,255,0.38)',
                  fontWeight: 500,
                  minWidth: '110px'
                }}>
                  الوقت
                </span>
                <span className="info-value" style={{
                  color: 'rgba(255,255,255,0.78)',
                  fontWeight: 700,
                  direction: 'ltr',
                  unicodeBidi: 'plaintext',
                  wordBreak: 'break-word'
                }}>
                  {requestTime}
                </span>
              </div>
              <div className="info-item" style={{
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: '13px'
              }}>
                <span className="info-label" style={{
                  display: 'inline-block',
                  color: 'rgba(255,255,255,0.38)',
                  fontWeight: 500,
                  minWidth: '110px'
                }}>
                  البريد الإلكتروني
                </span>
                <span className="info-value" style={{
                  color: 'rgba(255,255,255,0.78)',
                  fontWeight: 700,
                  direction: 'ltr',
                  unicodeBidi: 'plaintext',
                  wordBreak: 'break-word'
                }}>
                  {email}
                </span>
              </div>
              <div className="info-item" style={{
                padding: '8px 0',
                fontSize: '13px',
                border: 'none'
              }}>
                <span className="info-label" style={{
                  display: 'inline-block',
                  color: 'rgba(255,255,255,0.38)',
                  fontWeight: 500,
                  minWidth: '110px'
                }}>
                  الجهاز
                </span>
                <span className="info-value" style={{
                  color: 'rgba(255,255,255,0.78)',
                  fontWeight: 700,
                  direction: 'ltr',
                  unicodeBidi: 'plaintext',
                  wordBreak: 'break-word'
                }}>
                  {deviceInfo}
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="cta-wrap" style={{
              textAlign: 'center',
              margin: '24px 0'
            }}>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="cta-btn"
                style={{
                  display: 'inline-block',
                  padding: '13px 30px',
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                  letterSpacing: '.02em'
                }}
              >
                الانتقال إلى صفحة تسجيل الدخول
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="email-footer" style={{
            background: '#040910',
            padding: '22px 36px',
            textAlign: 'center',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            direction: 'rtl'
          }}>
            <img
              className="footer-logo"
              src="/Logo_White.png"
              alt="Half Lens"
              style={{
                height: '24px',
                objectFit: 'contain',
                opacity: 0.35,
                marginBottom: '10px'
              }}
            />
            <div className="footer-links" style={{ marginBottom: '10px' }}>
              <a href="#" onClick={(e) => e.preventDefault()} style={{
                display: 'inline-block',
                margin: '0 8px 8px 8px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.36)',
                textDecoration: 'none',
                fontWeight: 500
              }}>سياسة الخصوصية</a>
              <a href="#" onClick={(e) => e.preventDefault()} style={{
                display: 'inline-block',
                margin: '0 8px 8px 8px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.36)',
                textDecoration: 'none',
                fontWeight: 500
              }}>شروط الاستخدام</a>
              <a href="#" onClick={(e) => e.preventDefault()} style={{
                display: 'inline-block',
                margin: '0 8px 8px 8px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.36)',
                textDecoration: 'none',
                fontWeight: 500
              }}>تواصل معنا</a>
            </div>
            <div className="footer-copy" style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
              lineHeight: '1.7'
            }}>
              هذه رسالة آلية من نظام Half Lens لإدارة الموردين.<br />
              © 2024 Half Lens. جميع الحقوق محفوظة.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
