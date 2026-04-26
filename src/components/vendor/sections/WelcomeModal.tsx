import { Sparkles, X, Folder, FileText, Camera } from 'lucide-react';

interface Props {
  vendorName: string;
  onClose: () => void;
  onJumpTo: (page: 'projects' | 'invoices' | 'equipment') => void;
}

export const WelcomeModal = ({ vendorName, onClose, onJumpTo }: Props) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(4,10,24,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        maxWidth: 460, width: '100%',
        borderRadius: 20,
        background: 'linear-gradient(160deg,#0b1d3b 0%,#060d1e 100%)',
        border: '1px solid rgba(59,130,246,0.3)',
        padding: '26px 24px 22px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
        color: '#e2e8f0',
        fontFamily: 'Cairo,sans-serif',
      }}
      dir="rtl"
    >
      <button
        onClick={onClose}
        aria-label="إغلاق"
        style={{
          position: 'absolute', top: 12, insetInlineStart: 12,
          width: 30, height: 30, borderRadius: 8,
          background: 'rgba(255,255,255,0.06)', border: 'none',
          color: 'rgba(226,232,240,0.7)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={16} />
      </button>

      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(168,85,247,0.2))',
        border: '1px solid rgba(59,130,246,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Sparkles size={24} style={{ color: '#93c5fd' }} />
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
        مرحباً بك في Half Lens{vendorName ? ` يا ${vendorName.split(' ')[0]}` : ''} 👋
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(226,232,240,0.65)', lineHeight: 1.8, margin: '0 0 14px' }}>
        تم استلام طلبك وهو الآن قيد المراجعة. يمكنك الآن استكشاف المنصة والتعرف على ميزاتها قبل الموافقة.
        كل الإجراءات الفعلية (إنشاء، تعديل، إرسال) ستفعّل تلقائياً بمجرد اعتماد حسابك.
      </p>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.5)', letterSpacing: '.08em', marginBottom: 8, textTransform: 'uppercase' }}>
        استكشف الآن
      </div>

      <div
        className="vp-welcome-chips"
        data-stack-xs="true"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: 16 }}
      >
        <button
          type="button" onClick={() => onJumpTo('projects')}
          style={chipStyle}
        >
          <Folder size={15} style={{ color: '#60a5fa' }} />
          <span>المشاريع</span>
        </button>
        <button
          type="button" onClick={() => onJumpTo('invoices')}
          style={chipStyle}
        >
          <FileText size={15} style={{ color: '#4ade80' }} />
          <span>الفواتير</span>
        </button>
        <button
          type="button" onClick={() => onJumpTo('equipment')}
          style={chipStyle}
        >
          <Camera size={15} style={{ color: '#fbbf24' }} />
          <span>المعدات</span>
        </button>
      </div>

      <button
        type="button" onClick={onClose}
        style={{
          width: '100%', padding: '12px 18px', borderRadius: 12,
          background: 'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)',
          border: 'none', color: '#fff', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        ابدأ الجولة
      </button>
    </div>
  </div>
);

const chipStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  padding: '12px 10px', borderRadius: 12,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(226,232,240,0.85)', cursor: 'pointer',
  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
};
