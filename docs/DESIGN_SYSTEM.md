# Design System Documentation

## Overview
This document describes the unified design system for the platform. All components must use the centralized theme tokens to ensure consistency and easy maintenance.

## Core Principles

1. **No Hardcoded Colors**: All colors must come from `theme/tokens.ts`
2. **Theme Consistency**: Support both light and dark modes
3. **Component Reusability**: Use unified components across all pages
4. **Easy Maintenance**: Change the entire visual identity by modifying only the tokens file

## Theme Tokens

### Location
All theme tokens are defined in: `src/theme/tokens.ts`

### Usage
```typescript
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../theme/tokens';

const { isDarkMode } = useTheme();
const theme = getTheme(isDarkMode);

// Use theme colors
backgroundColor: theme.primary.main
color: theme.text.primary
border: `1px solid ${theme.border.default}`
```

### Color System

#### Primary Colors
- `theme.primary.main` - Main brand color
- `theme.primary.hover` - Hover state
- `theme.primary.active` - Active/pressed state
- `theme.primary.light` - Light variant
- `theme.primary.dark` - Dark variant

#### Secondary Colors
- `theme.secondary.main`
- `theme.secondary.hover`
- `theme.secondary.active`
- `theme.secondary.muted`
- `theme.secondary.light`

#### Status Colors
- `theme.status.success.main` / `.light` / `.dark`
- `theme.status.warning.main` / `.light` / `.dark`
- `theme.status.error.main` / `.light` / `.dark`
- `theme.status.info.main` / `.light` / `.dark`

#### Background Colors
- `theme.background.page` - Main page background
- `theme.background.card` - Card/container background
- `theme.background.hover` - Hover state background
- `theme.background.filter` - Filter bar background
- `theme.background.input` - Input field background

#### Text Colors
- `theme.text.primary` - Primary text
- `theme.text.secondary` - Secondary text
- `theme.text.muted` - Muted/disabled text
- `theme.text.disabled` - Disabled state
- `theme.text.inverse` - Inverse (for dark backgrounds)

#### Border Colors
- `theme.border.default` - Default border
- `theme.border.hover` - Hover state
- `theme.border.focus` - Focus state
- `theme.border.divider` - Dividers

## UI Components

### Button
**Location**: `src/components/ui/Button.tsx`

**Variants**:
- `primary` - Main actions (blue)
- `secondary` - Secondary actions (gray)
- `success` - Positive actions (green)
- `warning` - Warning actions (orange)
- `error` - Destructive actions (red)
- `ghost` - Transparent background

**Sizes**: `sm`, `md`, `lg`

**Usage**:
```tsx
import { Button } from '../../components/ui';

<Button variant="primary" size="md" icon={<Plus />}>
  إضافة
</Button>

<Button variant="secondary" onClick={handleAction}>
  إلغاء
</Button>

<Button disabled tooltip="يرجى ملء جميع الحقول">
  حفظ
</Button>
```

### Input
**Location**: `src/components/ui/Input.tsx`

**Usage**:
```tsx
import { Input } from '../../components/ui';

<Input
  label="الاسم"
  value={name}
  onChange={(e) => setName(e.target.value)}
  icon={<User />}
  error={error}
  fullWidth
/>
```

### Select
**Location**: `src/components/ui/Select.tsx`

**Usage**:
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

### SearchBar
**Location**: `src/components/ui/SearchBar.tsx`

**Features**:
- Full width by default
- Built-in search icon
- Consistent styling

**Usage**:
```tsx
import { SearchBar } from '../../components/ui';

<SearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="البحث..."
/>
```

### FilterBar
**Location**: `src/components/ui/FilterBar.tsx`

**Features**:
- Single row layout
- Consistent dropdown styling
- Built-in reset functionality

**Usage**:
```tsx
import { FilterBar } from '../../components/ui';

<FilterBar
  filters={[
    {
      label: 'الحالة',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: 'الكل', value: '' },
        { label: 'نشط', value: 'active' }
      ]
    }
  ]}
  onReset={handleResetFilters}
/>
```

### Table
**Location**: `src/components/ui/Table.tsx`

**Features**:
- Consistent header styling
- Zebra rows (alternating colors)
- Hover effects
- Responsive design

**Usage**:
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
  onRowClick={(vendor) => setSelectedVendor(vendor)}
  zebra
  hover
/>
```

### Card
**Location**: `src/components/ui/Card.tsx`

**Usage**:
```tsx
import { Card } from '../../components/ui';

<Card padding="lg">
  <h2>عنوان البطاقة</h2>
  <p>المحتوى...</p>
</Card>
```

## Migration Guide

### Step 1: Import UI Components
Replace custom buttons, inputs, and filters with unified components:

```tsx
// Before
<button className="bg-blue-600 hover:bg-blue-700...">
  إضافة
</button>

// After
import { Button } from '../../components/ui';
<Button variant="primary">إضافة</Button>
```

### Step 2: Remove Hardcoded Colors
Replace all Tailwind color classes with theme tokens:

```tsx
// Before
<div className="bg-white border-slate-200 text-slate-900">

// After
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../theme/tokens';

const { isDarkMode } = useTheme();
const theme = getTheme(isDarkMode);

<div style={{
  backgroundColor: theme.background.card,
  border: `1px solid ${theme.border.default}`,
  color: theme.text.primary
}}>
```

### Step 3: Use Unified Filters
Replace custom filter implementations:

```tsx
// Before
<div className="flex gap-4">
  <select className="...">...</select>
  <select className="...">...</select>
</div>

// After
import { FilterBar } from '../../components/ui';

<FilterBar
  filters={[...]}
  onReset={handleReset}
/>
```

### Step 4: Use Unified Tables
Replace custom table implementations:

```tsx
// Before
<table>
  <thead>...</thead>
  <tbody>...</tbody>
</table>

// After
import { Table } from '../../components/ui';

<Table columns={columns} data={data} />
```

## Dark Mode Support

All components automatically support dark mode through the theme system:

1. Theme is managed in `ThemeContext`
2. Users can toggle via UI
3. Preference is saved in localStorage
4. All colors adapt automatically

## Customization

### Changing Colors
Edit `src/theme/tokens.ts`:

```typescript
export const lightTheme = {
  primary: {
    main: '#your-color',  // Change this
    hover: '#darker-shade',
    active: '#darkest-shade',
  },
  // ...
};
```

### Adding New Themes
1. Add theme object in `tokens.ts`
2. Update `getTheme` function
3. Add theme selector in UI

## Best Practices

1. **Always use theme tokens** - Never hardcode colors
2. **Use unified components** - Don't create custom variants
3. **Follow the vendor page design** - It's the visual reference
4. **Test in both modes** - Ensure dark mode works properly
5. **Maintain consistency** - Same components = same appearance
6. **Keep it simple** - Don't over-engineer solutions

## Rules (Mandatory)

❌ **DO NOT**:
- Use hardcoded colors anywhere
- Create custom button/input styles
- Use different filter layouts between pages
- Skip dark mode testing
- Use purple/indigo colors

✅ **DO**:
- Import from `components/ui`
- Use theme tokens for all colors
- Follow the design system strictly
- Test both light and dark modes
- Use the vendors page as reference

## Support

For questions or issues with the design system, refer to:
1. This documentation
2. Component source files in `src/components/ui/`
3. Theme tokens in `src/theme/tokens.ts`
