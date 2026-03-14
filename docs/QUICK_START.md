# البدء السريع - Quick Start Guide

## 🚀 استخدام نظام التصميم في 5 خطوات

### 1️⃣ استيراد المكونات
```tsx
// في أي صفحة أو مكون
import {
  Button,
  Input,
  SearchBar,
  FilterBar,
  Table,
  Card,
  StatusBadge
} from '../../components/ui';

import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../theme/tokens';
```

### 2️⃣ إعداد Theme في المكون
```tsx
export const MyPage = () => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  // باقي الكود...
}
```

### 3️⃣ استخدام الألوان
```tsx
// بدلاً من:
<div className="bg-white text-slate-900 border-slate-200">

// استخدم:
<div style={{
  backgroundColor: theme.background.card,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`
}}>
```

### 4️⃣ استخدام المكونات الجاهزة
```tsx
// الأزرار
<Button variant="primary" icon={<Plus />}>إضافة</Button>
<Button variant="secondary">إلغاء</Button>

// البحث
<SearchBar
  value={search}
  onChange={setSearch}
  placeholder="البحث..."
/>

// الفلاتر
<FilterBar
  filters={filterConfig}
  onReset={resetFilters}
/>

// الجداول
<Table
  columns={columns}
  data={data}
  onRowClick={handleClick}
  zebra
  hover
/>
```

### 5️⃣ اختبار الوضع الليلي
- اضغط على أيقونة القمر/الشمس في الهيدر
- تأكد من أن جميع الألوان تتغير بشكل صحيح
- لا يجب أن تظهر أي ألوان ثابتة

## ✅ قائمة التحقق السريعة

قبل إتمام أي صفحة، تأكد من:

- [ ] جميع الأزرار تستخدم `Button` component
- [ ] جميع حقول الإدخال تستخدم `Input` أو `SearchBar`
- [ ] الفلاتر تستخدم `FilterBar`
- [ ] الجداول تستخدم `Table`
- [ ] لا توجد ألوان hardcoded (classes مثل `bg-blue-600`)
- [ ] جميع الألوان من `theme` object
- [ ] الوضع الليلي يعمل بشكل صحيح
- [ ] الصفحة متناسقة مع باقي الصفحات

## 🎨 الألوان الأكثر استخداماً

```tsx
// الخلفيات
theme.background.page      // خلفية الصفحة الرئيسية
theme.background.card      // خلفية البطاقات والكونتينرات
theme.background.hover     // عند التمرير على عنصر

// النصوص
theme.text.primary         // نص رئيسي
theme.text.secondary       // نص ثانوي/وصفي
theme.text.muted          // نص باهت

// الحدود
theme.border.default      // حدود عادية
theme.border.focus        // حدود عند التركيز

// الأزرار
theme.primary.main        // لون الزر الأساسي
theme.primary.hover       // عند التمرير

// الحالات
theme.status.success.main // نجاح
theme.status.error.main   // خطأ
theme.status.warning.main // تحذير
```

## 🔥 أمثلة سريعة

### صفحة كاملة
```tsx
import { Button, SearchBar, FilterBar, Table, Card } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../theme/tokens';
import { Plus } from 'lucide-react';

export const MyPage = () => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  return (
    <div style={{
      backgroundColor: theme.background.page,
      padding: '2rem',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <h1 style={{ color: theme.text.primary }}>العنوان</h1>
        <Button variant="primary" icon={<Plus />}>
          إضافة
        </Button>
      </div>

      {/* Content Card */}
      <Card>
        <SearchBar value={search} onChange={setSearch} />
        <FilterBar filters={filters} onReset={resetFilters} />
        <Table columns={columns} data={data} />
      </Card>
    </div>
  );
};
```

### زر مع أيقونة
```tsx
<Button
  variant="primary"
  size="md"
  icon={<Plus />}
  onClick={handleAdd}
>
  إضافة مورد
</Button>
```

### حقل إدخال مع خطأ
```tsx
<Input
  label="رقم الجوال"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  icon={<Phone />}
  error={phoneError}
  fullWidth
/>
```

### جدول بسيط
```tsx
const columns = [
  { header: 'الاسم', accessor: 'name' },
  { header: 'الحالة', accessor: (row) => (
    <StatusBadge status={row.status} />
  )}
];

<Table
  columns={columns}
  data={items}
  onRowClick={handleRowClick}
  zebra
  hover
/>
```

## 🐛 حل المشاكل الشائعة

### المشكلة: الألوان لا تتغير في الوضع الليلي
**الحل:**
```tsx
// تأكد من استخدام theme object
const { isDarkMode } = useTheme();
const theme = getTheme(isDarkMode);

// وليس:
// const theme = lightTheme; ❌
```

### المشكلة: الأزرار لا تظهر بالشكل الصحيح
**الحل:**
```tsx
// استخدم Button component
<Button variant="primary">إضافة</Button>

// وليس:
// <button className="bg-blue-600...">إضافة</button> ❌
```

### المشكلة: الألوان تختلف بين الصفحات
**الحل:** تأكد من استخدام نفس theme tokens في جميع الصفحات

## 📱 التواصل

إذا واجهت أي مشكلة:
1. راجع `DESIGN_SYSTEM.md` للتوثيق الكامل
2. راجع `MIGRATION_EXAMPLE.md` للأمثلة
3. افحص الملفات في `src/components/ui/`

---

**نصيحة:** ابدأ بصفحة واحدة واجعلها مثالية، ثم انسخ النمط للصفحات الأخرى!
