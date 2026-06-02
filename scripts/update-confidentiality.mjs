// One-shot: replace the legal_pages row where type='privacy' with the
// new condensed confidentiality content. Run with:
//   node scripts/update-confidentiality.mjs
// Requires SUPABASE_ACCESS_TOKEN in env.

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN'); process.exit(1); }

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
if (!PROJECT_REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }

const content = {
  lastUpdated: '4 مايو 2026',
  sections: [
    {
      id: 'intro',
      icon: '🔐',
      title: 'مقدمة',
      body: 'اتفاقية عدم إفصاح وسرّية المعلومات تنظّم العلاقة بين Half Lens والطرف المتعاون أثناء العمل والتعاون. الهدف: حماية كل معلومة سرّية يتم الاطلاع عليها أو تبادلها بين الطرفين.'
    },
    {
      id: 'definitions',
      icon: '📖',
      title: 'أولاً: التعريفات',
      body: 'يُقصد بالمعلومات السرّية كل ما يخص Half Lens من بيانات أو مواد، سواء كانت مرئية أو سمعية أو مكتوبة أو رقمية، وتشمل على سبيل المثال لا الحصر:',
      items: [
        { title: 'المواد البصرية', desc: 'مقاطع الفيديو، الصور، التصاميم، الرسوم، العروض التقديمية، والهويات السمعية والبصرية.' },
        { title: 'التسجيلات والاجتماعات', desc: 'التسجيلات الصوتية، المكالمات، الاجتماعات، والمقابلات.' },
        { title: 'المحتوى الإبداعي والإعلامي', desc: 'أي مواد إعلامية أو إعلانية أو إبداعية يتم الاطلاع عليها أو سماعها أثناء العمل أو التعاون.' }
      ]
    },
    {
      id: 'confidentiality',
      icon: '🤐',
      title: 'ثانياً: السرّية',
      body: 'يلتزم الطرف المتعاون بالمحافظة التامة على سرّية جميع المعلومات المرئية والسمعية، وعدم إفشائها أو مشاركتها أو نشرها أو استخدامها بأي شكل، سواء بشكل مباشر أو غير مباشر، إلا بموافقة خطية مسبقة من Half Lens.'
    },
    {
      id: 'use',
      icon: '🎯',
      title: 'ثالثاً: استخدام المعلومات',
      body: 'تُستخدم المعلومات حصراً لغرض العمل والتعاون المتفق عليه بين الطرفين، ويُمنع منعاً تاماً استخدامها لأي غرض شخصي أو تجاري أو إعلامي خارج هذا النطاق.'
    },
    {
      id: 'restrictions',
      icon: '⛔',
      title: 'رابعاً: الحظر',
      body: 'يُحظر على الطرف المتعاون ما يلي:',
      items: [
        { title: 'النسخ وإعادة الإنتاج', desc: 'نسخ أو تسجيل أو إعادة إنتاج أي مواد مرئية أو مسموعة.' },
        { title: 'النشر العلني', desc: 'نشر أو مشاركة المحتوى عبر وسائل التواصل الاجتماعي أو أي منصات أخرى.' },
        { title: 'تمكين طرف ثالث', desc: 'تمكين أي طرف ثالث من الاطلاع على المحتوى أو الاستماع إليه.' }
      ]
    },
    {
      id: 'breach',
      icon: '⚖️',
      title: 'خامساً: الإخلال بالاتفاقية',
      body: 'في حال الإخلال بأي بند من بنود هذه السياسة، يحق لـ Half Lens المطالبة بالتعويض عن كافة الأضرار المادية والمعنوية، مع الاحتفاظ بحقها الكامل في اتخاذ الإجراءات النظامية وفق أنظمة المملكة العربية السعودية.'
    },
    {
      id: 'general',
      icon: '🇸🇦',
      title: 'سادساً: أحكام عامة',
      body: 'تخضع هذه السياسة وتُفسَّر وفق الأنظمة المعمول بها داخل المملكة العربية السعودية، وهي ملزمة للطرفين. أي تعديل لا يكون نافذاً إلا بموافقة خطية من الطرفين.'
    }
  ]
};

const sql = `
  UPDATE legal_pages
  SET content = '${JSON.stringify(content).replace(/'/g, "''")}'::jsonb,
      last_updated = NOW()
  WHERE type = 'privacy';

  UPDATE terms_and_privacy_settings
  SET content_ar = '${JSON.stringify(content).replace(/'/g, "''")}',
      title_ar = 'سياسة السرّية',
      updated_at = NOW()
  WHERE type = 'privacy' AND is_active = true;
`;

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  },
);
const text = await res.text();
console.log(`HTTP ${res.status}: ${text}`);
