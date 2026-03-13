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
    minute: '2-digit'
  });

  const digits = otp.split('');

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '20px' }}>
        <h1 style={{ color: '#1e293b', marginBottom: '10px' }}>OTP Email Template Preview</h1>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>
          This is how your OTP email appears to vendors. Scroll down to see the full template.
        </p>
      </div>

      {/* Email Preview */}
      <div style={{ fontFamily: 'Cairo, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        `}</style>

        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0a0f1e 0%, #1a2332 100%)',
            padding: '40px 30px',
            textAlign: 'center'
          }}>
            <img
              src="https://akcpkjzfhtmurtwzyzhn.supabase.co/storage/v1/object/public/images/Logo_White.png.png"
              alt="Half Lens"
              style={{
                width: '120px',
                height: 'auto',
                marginBottom: '20px'
              }}
            />
            <h1 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              رمز التحقق الخاص بك
            </h1>
            <p style={{
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 400
            }}>
              نظام إدارة الموردين
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '40px 30px', direction: 'rtl' }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '16px'
            }}>
              مرحباً
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#475569',
              lineHeight: '1.6',
              marginBottom: '30px'
            }}>
              لقد تلقينا طلباً لتسجيل الدخول إلى حسابك في نظام Half Lens. استخدم رمز التحقق التالي لإتمام عملية الدخول:
            </p>

            {/* OTP Container */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '30px',
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                marginBottom: '16px',
                fontWeight: 500
              }}>
                رمز التحقق (OTP)
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '20px',
                direction: 'ltr'
              }}>
                {digits.map((digit, index) => (
                  <div key={index} style={{
                    width: '56px',
                    height: '64px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                  }}>
                    {digit}
                  </div>
                ))}
              </div>
              <p style={{
                fontSize: '13px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                صالح لمدة 10 دقائق فقط
              </p>
            </div>

            {/* Request Info */}
            <div style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <p style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '12px'
              }}>
                تفاصيل الطلب:
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 500
                }}>الوقت</span>
                <span style={{
                  fontSize: '13px',
                  color: '#1e293b',
                  fontWeight: 600
                }}>{requestTime}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 500
                }}>البريد الإلكتروني</span>
                <span style={{
                  fontSize: '13px',
                  color: '#1e293b',
                  fontWeight: 600
                }}>{email}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 500
                }}>الجهاز</span>
                <span style={{
                  fontSize: '13px',
                  color: '#1e293b',
                  fontWeight: 600
                }}>{deviceInfo}</span>
              </div>
            </div>

            {/* Warning */}
            <div style={{
              backgroundColor: '#fef3c7',
              borderRight: '4px solid #f59e0b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '30px'
            }}>
              <p style={{
                fontSize: '13px',
                color: '#92400e',
                lineHeight: '1.5'
              }}>
                ⚠️ إذا لم تقم بطلب هذا الرمز، يرجى تجاهل هذه الرسالة. لا تشارك هذا الرمز مع أي شخص للحفاظ على أمان حسابك.
              </p>
            </div>

            {/* CTA Button */}
            <div style={{ textAlign: 'center' }}>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  cursor: 'pointer'
                }}
              >
                الانتقال لصفحة تسجيل الدخول
              </a>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '30px',
            textAlign: 'center',
            borderTop: '1px solid #e2e8f0',
            direction: 'rtl'
          }}>
            <p style={{
              fontSize: '13px',
              color: '#64748b',
              lineHeight: '1.6',
              marginBottom: '16px'
            }}>
              هذه رسالة آلية من نظام Half Lens لإدارة الموردين.<br />
              للمساعدة والدعم، يرجى التواصل معنا.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '16px'
            }}>
              <a href="#" onClick={(e) => e.preventDefault()} style={{
                fontSize: '13px',
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: 500
              }}>سياسة الخصوصية</a>
              <a href="#" onClick={(e) => e.preventDefault()} style={{
                fontSize: '13px',
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: 500
              }}>شروط الاستخدام</a>
              <a href="#" onClick={(e) => e.preventDefault()} style={{
                fontSize: '13px',
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: 500
              }}>تواصل معنا</a>
            </div>
            <p style={{
              fontSize: '12px',
              color: '#94a3b8'
            }}>
              © 2024 Half Lens. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
