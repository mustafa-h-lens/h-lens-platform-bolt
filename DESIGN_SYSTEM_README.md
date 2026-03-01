# نظام التصميم الموحد - Design System

## 📋 نظرة عامة

تم إنشاء نظام تصميم موحّد للمنصة بالكامل يضمن:
- ✅ تجربة مستخدم متناسقة
- ✅ سهولة الصيانة والتطوير
- ✅ دعم كامل للوضع الليلي
- ✅ إمكانية تغيير الهوية البصرية بالكامل من ملف واحد
- ✅ مكونات قابلة لإعادة الاستخدام

## 🎨 البنية

```
src/
├── theme/
│   └── tokens.ts              # جميع الألوان والمتغيرات المركزية
├── components/
│   └── ui/                    # مكونات واجهة المستخدم الموحدة
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── SearchBar.tsx
│       ├── FilterBar.tsx
│       ├── Table.tsx
│       ├── Card.tsx
│       ├── StatusBadge.tsx
│       └── index.ts
└── contexts/
    └── ThemeContext.tsx       # إدارة الوضع الليلي/النهاري
```

## 🚀 المكونات المتاحة

### 1. Button (الأزرار)
```tsx
import { Button } from '../../components/ui';

<Button variant="primary" size="md" icon={<Plus />}>
  إضافة
</Button>

<Button variant="secondary" onClick={handleCancel}>
  إلغاء
</Button>

<Button variant="error" disabled tooltip="سبب التعطيل">
  حذف
</Button>
```

**الأنواع المتاحة:**
- `primary` - الإجراء الأساسي (أزرق)
- `secondary` - إجراء ثانوي (رمادي)
- `success` - إجراء إيجابي (أخضر)
- `warning` - تحذير (برتقالي)
- `error` - إجراء خطر (أحمر)
- `ghost` - شفاف

**الأحجام:**
- `sm` - صغير
- `md` - متوسط (افتراضي)
- `lg` - كبير

### 2. Input (حقول الإدخال)
```tsx
import { Input } from '../../components/ui';

<Input
  label="الاسم الكامل"
  value={name}
  onChange={(e) => setName(e.target.value)}
  icon={<User />}
  error={errorMessage}
  fullWidth
/>
```

### 3. Select (القوائم المنسدلة)
```tsx
import { Select } from '../../components/ui';

<Select
  label="الحالة"
  value={status}
  options={[
    { label: 'نشط', value: 'active' },
    { label: 'غير نشط', value: 'inactive' }
  ]}
  onChange={setStatus}
  fullWidth
/>
```

### 4. SearchBar (شريط البحث)
```tsx
import { SearchBar } from '../../components/ui';

<SearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="البحث بالاسم أو رقم الجوال..."
/>
```

### 5. FilterBar (شريط الفلاتر)
```tsx
import { FilterBar } from '../../components/ui';

<FilterBar
  filters={[
    {
      label: 'الجنسية',
      value: filters.nationality,
      onChange: (val) => setFilters({ ...filters, nationality: val }),
      options: [
        { label: 'الكل', value: '' },
        { label: 'سعودي', value: 'سعودي' }
      ]
    }
  ]}
  onReset={handleResetFilters}
/>
```

### 6. Table (الجداول)
```tsx
import { Table, TableColumn } from '../../components/ui';

const columns: TableColumn<Vendor>[] = [
  {
    header: 'الاسم',
    accessor: 'full_name'
  },
  {
    header: 'الحالة',
    accessor: (row) => <StatusBadge status={row.status} />
  }
];

<Table
  columns={columns}
  data={vendors}
  onRowClick={(vendor) => handleRowClick(vendor)}
  zebra
  hover
/>
```

### 7. Card (البطاقات)
```tsx
import { Card } from '../../components/ui';

<Card padding="lg">
  <h2>عنوان البطاقة</h2>
  <p>المحتوى...</p>
</Card>
```

### 8. StatusBadge (شارات الحالة)
```tsx
import { StatusBadge } from '../../components/ui';

<StatusBadge status="active" showIcon size="md" />
<StatusBadge status="blocked" />
<StatusBadge status="pending" />
```

**الحالات المتاحة:**
- `active` - نشط
- `inactive` - غير نشط
- `blocked` - محظور
- `pending` - قيد الانتظار
- `completed` - مكتمل
- `cancelled` - ملغي

## 🎨 نظام الألوان

### استخدام الألوان في المكونات
```tsx
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../theme/tokens';

const { isDarkMode } = useTheme();
const theme = getTheme(isDarkMode);

// استخدام الألوان
<div style={{
  backgroundColor: theme.background.card,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`
}}>
  المحتوى
</div>
```

### الألوان المتاحة

#### Primary (الأساسي)
- `theme.primary.main`
- `theme.primary.hover`
- `theme.primary.active`
- `theme.primary.light`
- `theme.primary.dark`

#### Secondary (الثانوي)
- `theme.secondary.main`
- `theme.secondary.hover`
- `theme.secondary.active`
- `theme.secondary.muted`
- `theme.secondary.light`

#### Status (حالات)
- `theme.status.success.main` / `.light` / `.dark`
- `theme.status.warning.main` / `.light` / `.dark`
- `theme.status.error.main` / `.light` / `.dark`
- `theme.status.info.main` / `.light` / `.dark`

#### Background (الخلفيات)
- `theme.background.page` - خلفية الصفحة
- `theme.background.card` - خلفية البطاقات
- `theme.background.hover` - حالة التمرير
- `theme.background.filter` - خلفية الفلاتر
- `theme.background.input` - خلفية حقول الإدخال

#### Text (النصوص)
- `theme.text.primary` - نص أساسي
- `theme.text.secondary` - نص ثانوي
- `theme.text.muted` - نص خافت
- `theme.text.disabled` - نص معطل
- `theme.text.inverse` - نص معكوس (للخلفيات الداكنة)

#### Border (الحدود)
- `theme.border.default` - حد افتراضي
- `theme.border.hover` - حد عند التمرير
- `theme.border.focus` - حد عند التركيز
- `theme.border.divider` - فواصل

## 🌙 الوضع الليلي

### التبديل بين الأوضاع
```tsx
import { useTheme } from '../../contexts/ThemeContext';

const { isDarkMode, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  {isDarkMode ? <Sun /> : <Moon />}
</button>
```

### كيفية عمل الوضع الليلي
1. جميع المكونات تستخدم `getTheme(isDarkMode)`
2. التبديل يتم تلقائياً عبر `ThemeContext`
3. التفضيل يُحفظ في `localStorage`
4. لا حاجة لأي تعديل على المكونات

## 📝 قواعد إلزامية

### ✅ يجب
1. استخدام المكونات الموحدة من `components/ui`
2. استخدام `theme tokens` لجميع الألوان
3. اختبار الوضع الليلي دائماً
4. اتباع نفس نمط التصميم في جميع الصفحات

### ❌ ممنوع
1. استخدام ألوان ثابتة (hardcoded colors)
2. استخدام classes مثل `bg-blue-600` أو `text-slate-900`
3. إنشاء أزرار أو inputs مخصصة
4. استخدام ألوان البنفسجي/الأرجواني
5. اختلاف التصميم بين الصفحات

## 🔄 ترحيل الصفحات الحالية

### الخطوات
1. استيراد `useTheme` و `getTheme`
2. استبدال الأزرار المخصصة بـ `Button`
3. استبدال حقول الإدخال بـ `Input`
4. استبدال الفلاتر بـ `FilterBar`
5. استبدال الجداول بـ `Table`
6. استبدال جميع الألوان الثابتة بـ `theme tokens`

### مثال قبل وبعد
انظر ملف `MIGRATION_EXAMPLE.md` للمزيد من التفاصيل

## 🛠️ تخصيص النظام

### تغيير الألوان الأساسية
قم بتعديل `src/theme/tokens.ts`:

```typescript
export const lightTheme = {
  primary: {
    main: '#YOUR_COLOR',     // اللون الجديد
    hover: '#DARKER_SHADE',
    active: '#DARKEST_SHADE',
    // ...
  },
  // ...
};
```

### إضافة ألوان جديدة
1. أضف اللون في `lightTheme` و `darkTheme`
2. استخدمه عبر `theme.yourNewColor`

## 📚 الملفات المرجعية

- `DESIGN_SYSTEM.md` - توثيق شامل للنظام
- `MIGRATION_EXAMPLE.md` - مثال عملي للترحيل
- `src/theme/tokens.ts` - جميع الألوان والمتغيرات
- `src/components/ui/` - المكونات الموحدة

## ✅ الحالة الحالية

### ✓ تم الإنجاز
- [x] إنشاء نظام theme tokens
- [x] إنشاء جميع المكونات الأساسية
- [x] تحديث ThemeContext
- [x] تحديث Header component
- [x] تحديث App.tsx
- [x] إنشاء التوثيق الشامل
- [x] اختبار البناء بنجاح

### 📋 الخطوات التالية (للمطور)
1. تحديث صفحة الموردين (VendorsPage) لاستخدام النظام الجديد
2. تحديث صفحة العملاء (ClientsPage)
3. تحديث صفحة المشاريع (ProjectsPage)
4. تحديث صفحة الفواتير (InvoicesPage)
5. تحديث صفحة الإعدادات (SettingsPage)
6. تحديث جميع النماذج والمودالات
7. إزالة المكونات المخصصة غير المستخدمة
8. مراجعة شاملة للوضع الليلي

## 🎯 الهدف النهائي

عند اكتمال الترحيل:
- تجربة مستخدم موحدة ومتناسقة 100%
- إمكانية تغيير الهوية البصرية بالكامل خلال دقائق
- دعم كامل للوضع الليلي بدون أي مشاكل
- كود نظيف وسهل الصيانة
- أداء محسّن وحجم أصغر

## 💡 نصائح

1. ابدأ بصفحة واحدة كمثال (الموردين)
2. اختبر الوضع الليلي بعد كل تغيير
3. استخدم `console.log(theme)` لرؤية جميع الألوان المتاحة
4. لا تتردد في إضافة مكونات جديدة إذا لزم الأمر
5. حافظ على نفس البنية في جميع الصفحات

## 📞 المساعدة

- راجع `DESIGN_SYSTEM.md` للتوثيق الكامل
- راجع `MIGRATION_EXAMPLE.md` لأمثلة عملية
- افحص `src/components/ui/` لرؤية كيفية بناء المكونات
- استخدم `src/components/shared/Header.tsx` كمرجع لاستخدام theme tokens

---

تم إنشاء هذا النظام بالكامل وجاهز للاستخدام. جميع المكونات تم اختبارها والبناء نجح بدون أخطاء.
