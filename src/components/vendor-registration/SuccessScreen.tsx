import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  type: 'confetti' | 'circle' | 'star' | 'ring';
}

export const SuccessScreen = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#10b981', '#34d399', '#8b5cf6', '#a78bfa', '#fbbf24', '#f472b6'];
    const types: Particle['type'][] = ['confetti', 'circle', 'star', 'ring'];
    const items: Particle[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 12 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 1.5,
      duration: Math.random() * 3 + 2,
      type: types[Math.floor(Math.random() * types.length)],
    }));
    setParticles(items);
  }, []);

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif", minHeight: '100vh', position: 'relative', background: 'var(--vr-bg-base)', overflow: 'hidden' }}>
      {/* Fixed animated background */}
      <div className="vr-background" />

      {/* Celebration particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            zIndex: 1,
            borderRadius: p.type === 'circle' ? '50%' : p.type === 'ring' ? '50%' : p.type === 'star' ? 2 : 2,
            background: p.type === 'ring' ? 'transparent' : p.color,
            border: p.type === 'ring' ? `2px solid ${p.color}` : 'none',
            boxShadow: `0 0 ${p.size}px ${p.color}40`,
          }}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1, 0.5],
            y: [0, -150 - Math.random() * 200],
            x: [0, (Math.random() - 0.5) * 200],
            rotate: [0, Math.random() * 720],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: Math.random() * 3,
          }}
        />
      ))}

      {/* Pulsing glow rings behind the card */}
      <motion.div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 500, height: 500, borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(37,99,235,0.06) 40%, transparent 70%)',
          zIndex: 1,
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 700, height: 700, borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          border: '1px solid rgba(16,185,129,0.08)',
          zIndex: 1,
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.5 }}
            className="vr-glass-card p-12 md:p-16"
          >
            {/* Success icon with rings */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.7 }}
              style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 24px' }}
            >
              {/* Outer ring */}
              <motion.div
                style={{
                  position: 'absolute', inset: -8, borderRadius: '50%',
                  border: '2px solid rgba(16,185,129,0.2)',
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              {/* Icon */}
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                boxShadow: '0 0 40px rgba(16,185,129,0.4), 0 0 80px rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={56} style={{ color: 'white' }} strokeWidth={2} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--vr-text-primary)' }}>
                تم استلام طلبك بنجاح!
              </h1>

              <div className="flex items-center justify-center gap-2 mb-6">
                <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Sparkles size={20} style={{ color: '#fbbf24' }} />
                </motion.div>
                <p className="text-xl" style={{ color: 'var(--vr-text-secondary)' }}>
                  مرحباً بك في عائلة Half Lens
                </p>
                <motion.div animate={{ rotate: [0, -15, 15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Sparkles size={20} style={{ color: '#fbbf24' }} />
                </motion.div>
              </div>

              <div className="space-y-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 }}
                  className="vr-banner info p-6 text-right"
                >
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--vr-accent-lighter)' }}>ماذا بعد؟</h3>
                    <ul className="space-y-2 text-sm" style={{ color: 'var(--vr-text-secondary)' }}>
                      {['سيقوم فريقنا بمراجعة طلبك خلال 24-48 ساعة', 'ستصلك رسالة نصية وبريد إلكتروني عند الموافقة', 'يمكنك بعدها البدء بتلقي طلبات العمل من خلال منصتنا'].map((t, i) => (
                        <motion.li key={i} className="flex items-start gap-2"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.3 + i * 0.15 }}>
                          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--vr-success)' }} />
                          <span>{t}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6 }}
                  className="vr-banner info p-6 text-right"
                >
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--vr-accent-lighter)' }}>للتنويه</h3>
                    <p className="text-sm" style={{ color: 'var(--vr-text-secondary)' }}>
                      تأكد من أن هاتفك مفعّل وجاهز لاستقبال الإشعارات. سنتواصل معك قريباً!
                    </p>
                  </div>
                </motion.div>
              </div>

              <motion.button
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}
                whileHover={{ scale: 1.03, boxShadow: '0 6px 24px rgba(37,99,235,0.5)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => window.location.href = 'https://h-lens.co'}
                className="vr-button vr-glow"
                style={{ padding: '14px 40px', fontSize: 16 }}
              >
                العودة إلى الصفحة الرئيسية
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
