import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles } from 'lucide-react';

export const SuccessScreen = () => {
  const [confetti, setConfetti] = useState<{ id: number; left: string; delay: number; color: string }[]>([]);

  useEffect(() => {
    const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#10b981', '#93c5fd'];
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfetti(pieces);
  }, []);

  return (
    <div className="vr-background min-h-screen relative flex items-center justify-center overflow-hidden">
      {confetti.map((piece) => (
        <motion.div
          key={piece.id}
          className="vr-confetti-piece"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
          }}
          initial={{ y: -100, opacity: 1 }}
          animate={{ y: '100vh', opacity: 0 }}
          transition={{
            duration: 3,
            delay: piece.delay,
            ease: 'linear',
          }}
        />
      ))}

      <div className="relative z-10 container mx-auto px-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            delay: 0.2,
          }}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.5,
            }}
            className="vr-glass-card p-12 md:p-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 10,
                delay: 0.7,
              }}
              className="vr-success-icon mb-6 mx-auto w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--vr-success), #34d399)',
                boxShadow: '0 0 60px rgba(16, 185, 129, 0.4)',
              }}
            >
              <CheckCircle className="w-16 h-16 text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--vr-text-primary)' }}>
                تم استلام طلبك بنجاح!
              </h1>

              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="w-5 h-5" style={{ color: 'var(--vr-accent)' }} />
                <p className="text-xl" style={{ color: 'var(--vr-text-secondary)' }}>
                  مرحباً بك في عائلة Half Lens
                </p>
                <Sparkles className="w-5 h-5" style={{ color: 'var(--vr-accent)' }} />
              </div>

              <div className="space-y-4 mb-8">
                <div
                  className="p-6 rounded-xl text-right"
                  style={{ background: 'rgba(59, 130, 246, 0.1)' }}
                >
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--vr-primary)' }}>
                    ماذا بعد؟
                  </h3>
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--vr-text-secondary)' }}>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--vr-success)' }} />
                      <span>سيقوم فريقنا بمراجعة طلبك خلال 24-48 ساعة</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--vr-success)' }} />
                      <span>ستصلك رسالة نصية وبريد إلكتروني عند الموافقة</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--vr-success)' }} />
                      <span>يمكنك بعدها البدء بتلقي طلبات العمل من خلال منصتنا</span>
                    </li>
                  </ul>
                </div>

                <div
                  className="p-6 rounded-xl text-right"
                  style={{ background: 'rgba(59, 130, 246, 0.1)' }}
                >
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--vr-accent)' }}>
                    للتنويه
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--vr-text-secondary)' }}>
                    تأكد من أن هاتفك مفعّل وجاهز لاستقبال الإشعارات. سنتواصل معك قريباً!
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = 'https://h-lens.co'}
                className="vr-button vr-glow px-8 py-4 rounded-xl font-semibold"
                style={{
                  background: 'linear-gradient(135deg, var(--vr-primary), var(--vr-accent))',
                  color: 'var(--vr-text-primary)',
                }}
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
