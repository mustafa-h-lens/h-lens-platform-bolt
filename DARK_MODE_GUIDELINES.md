# Dark Mode Design Guidelines

## ❌ تجنب استخدام هذه الأنماط

### 1. التدرجات الفضية في الخلفيات
```css
/* ❌ لا تستخدم */
bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50
```

### 2. الخلفيات الشفافة مع Backdrop Blur
```css
/* ❌ لا تستخدم في الكروت والصفحات الرئيسية */
backdrop-blur-xl bg-white/60
backdrop-blur-lg bg-white/50
bg-white/40
```

### 3. الحدود الشفافة
```css
/* ❌ لا تستخدم */
border-white/60
```

## ✅ استخدم بدلاً من ذلك

### 1. الخلفيات الصلبة مع Dark Mode
```css
/* ✅ استخدم هذا */
bg-slate-50 dark:bg-dark-bg                    /* للصفحات */
bg-white dark:bg-dark-card                     /* للكروت */
bg-slate-50 dark:bg-slate-800                  /* للهيدرات */
```

### 2. الحدود الواضحة
```css
/* ✅ استخدم هذا */
border-slate-200 dark:border-dark-border
```

### 3. النصوص المقروءة
```css
/* ✅ استخدم هذا */
text-slate-800 dark:text-slate-100            /* للعناوين */
text-slate-600 dark:text-slate-400            /* للنصوص الثانوية */
text-slate-500 dark:text-slate-400            /* للنصوص الباهتة */
```

### 4. الأيقونات والألوان التفاعلية
```css
/* ✅ استخدم هذا */
text-[#0A2A66] dark:text-[#47A1FF]            /* للروابط والأيقونات */
hover:bg-slate-100 dark:hover:bg-slate-700    /* للتفاعل */
```

## 🎨 متغيرات CSS المتاحة

استخدم المتغيرات المعرفة في `src/theme/tokens.ts`:

```css
dark:bg-dark-bg          /* #0f172a - خلفية داكنة */
dark:bg-dark-card        /* #1e293b - كروت داكنة */
dark:border-dark-border  /* #334155 - حدود داكنة */
```

## 📋 قائمة المراجعة للمكونات الجديدة

عند إنشاء مكونات جديدة، تأكد من:

- [ ] استخدام خلفيات صلبة بدلاً من الشفافة
- [ ] إضافة `dark:` لجميع الألوان والخلفيات
- [ ] اختبار المكون في كلا الوضعين (Light/Dark)
- [ ] استخدام متغيرات CSS بدلاً من القيم المباشرة
- [ ] التأكد من التباين الكافي للنصوص

## 🔍 استثناءات مسموحة

يمكن استخدام `backdrop-blur` في هذه الحالات فقط:

1. **Modals/Overlays**: الخلفيات المعتمة للنوافذ المنبثقة
   ```css
   bg-slate-900/50 backdrop-blur-sm
   ```

2. **Dropdown Menus**: القوائم المنسدلة (اختياري)
   ```css
   bg-white dark:bg-dark-card backdrop-blur-sm
   ```

## 🚀 أمثلة للكروت

### كارت إحصائيات
```tsx
<div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-6">
  <div className="text-slate-800 dark:text-slate-100">
    {/* المحتوى */}
  </div>
</div>
```

### جدول
```tsx
<table className="w-full">
  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-dark-border">
    <tr>
      <th className="text-slate-700 dark:text-slate-200">العنوان</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="text-slate-800 dark:text-slate-100">البيانات</td>
    </tr>
  </tbody>
</table>
```

### حالة فارغة
```tsx
<div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-12 text-center">
  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
    <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
  </div>
  <p className="text-slate-500 dark:text-slate-400">لا توجد بيانات</p>
</div>
```

## 📚 الصفحات المحدثة

تم توحيد النمط في الصفحات التالية:
- ✅ الصفحة الرئيسية (NewAdminDashboard)
- ✅ صفحة المشاريع (ProjectsList, EnhancedProjectDetails)
- ✅ صفحة الإعدادات (SettingsPage)
- ✅ تابات المشاريع (ProjectFiles, ProjectItems, ProjectActivity, ProjectInvoices, ProjectAchievements)
- ✅ إدارة التصنيفات (ItemCategoriesManagement)

---

**تذكير**: الهدف هو توحيد التصميم وجعل الألوان متسقة عبر جميع الصفحات في كلا الوضعين.
