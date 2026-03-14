// ═══════════════════════════════════════════════════════════
//  HALF LENS — Brand Color Tokens
//  لتغيير ألوان أي بوابة، عدّل القيم هنا فقط
// ═══════════════════════════════════════════════════════════

export const brand = {

  // ── الألوان الرئيسية (Main Colors) ──────────────────────
  navy:       '#1a2a6e',   // أزرق داكن عميق
  blue:       '#2b4db5',   // أزرق متوسط
  blueBright: '#3a5fd4',   // أزرق مضيء
  blueLight:  '#8a9fd4',   // أزرق فاتح

  // ── الألوان الثانوية (Secondary Colors) ─────────────────
  teal:       '#2ec4a5',   // أخضر زمردي
  tealLight:  '#daeef0',   // أزرق سماوي فاتح

  // ── الخلفيات ─────────────────────────────────────────────
  bgDark:     '#060f1e',
  bgCard:     'rgba(8,18,48,0.65)',

} as const;

// ── إعدادات بوابة الموردين ───────────────────────────────
export const vendorTheme = {
  accent:     brand.blueBright,   // لون الأيقونة والزر والنبض
  accentDark: brand.navy,         // تدرج الأيقونة (الجهة الداكنة)
  bg:         `linear-gradient(170deg, ${brand.bgDark} 0%, #081628 55%, #0a1c36 100%)`,
  cardBg:     brand.bgCard,
  logo:       { dark: '/assets/logo-white.png', light: '/assets/logo-blue.png' },
} as const;

// ── إعدادات بوابة العملاء ────────────────────────────────
export const clientTheme = {
  accent:     brand.teal,         // لون الأيقونة والزر والنبض
  accentDark: '#1a7a65',          // تدرج الأيقونة (الجهة الداكنة)
  bg:         `linear-gradient(170deg, #06141e 0%, #082018 55%, #0a261e 100%)`,
  cardBg:     'rgba(8,28,24,0.65)',
  logo:       { dark: '/assets/logo-white.png', light: '/assets/logo-blue.png' },
} as const;

// ── نوع مشترك ────────────────────────────────────────────
export type PortalTheme = typeof vendorTheme;
