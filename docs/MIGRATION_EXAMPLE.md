# Design System Migration Example

This document shows how to migrate a page to use the new design system.

## Example: VendorsPage Migration

### Before (Hardcoded Colors)
```tsx
// Old way with hardcoded Tailwind classes
<div className="bg-white border-slate-200 rounded-xl">
  <button className="bg-blue-600 hover:bg-blue-700 text-white">
    إضافة مورد
  </button>

  <input
    className="border-slate-300 focus:ring-blue-600"
    placeholder="البحث..."
  />

  <table className="w-full">
    <thead className="bg-slate-100">
      <th className="text-slate-900">الاسم</th>
    </thead>
  </table>
</div>
```

### After (Theme Tokens + UI Components)
```tsx
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../theme/tokens';
import { Button, SearchBar, FilterBar, Table, Card } from '../../components/ui';
import { Plus } from 'lucide-react';

export const VendorsPage = () => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  // Component JSX
  return (
    <div style={{
      backgroundColor: theme.background.page,
      minHeight: '100vh',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: theme.text.primary
          }}>
            الموردين
          </h1>
          <p style={{ color: theme.text.secondary }}>
            إدارة الموردين والمستقلين
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus />}
          onClick={() => setShowAddModal(true)}
        >
          إضافة مورد
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="البحث بالاسم أو رقم الجوال..."
        />

        <FilterBar
          filters={[
            {
              label: 'الجنسية',
              value: filters.nationality,
              onChange: (val) => setFilters({ ...filters, nationality: val }),
              options: [
                { label: 'جميع الجنسيات', value: '' },
                { label: 'سعودي', value: 'سعودي' },
                // ...more options
              ]
            },
            {
              label: 'المدينة',
              value: filters.city,
              onChange: (val) => setFilters({ ...filters, city: val }),
              options: cityOptions
            }
          ]}
          onReset={() => setFilters(initialFilters)}
        />
      </Card>

      {/* Table */}
      <Table
        columns={[
          {
            header: 'الاسم',
            accessor: (row) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={row.profile_image}
                  style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${theme.border.default}`
                  }}
                />
                <span style={{ color: theme.text.primary }}>
                  {row.full_name}
                </span>
              </div>
            )
          },
          {
            header: 'رقم الجوال',
            accessor: 'phone'
          },
          {
            header: 'الحالة',
            accessor: (row) => (
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                backgroundColor: getStatusColor(row.status),
                color: theme.text.inverse
              }}>
                {getStatusText(row.status)}
              </span>
            )
          }
        ]}
        data={filteredVendors}
        onRowClick={(vendor) => setSelectedVendor(vendor.id)}
        zebra
        hover
      />
    </div>
  );
};
```

## Key Changes

### 1. Import Theme Hook
```tsx
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../theme/tokens';

const { isDarkMode } = useTheme();
const theme = getTheme(isDarkMode);
```

### 2. Replace Custom Buttons
```tsx
// Before
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  إضافة
</button>

// After
<Button variant="primary">إضافة</Button>
```

### 3. Use SearchBar Component
```tsx
// Before
<div className="relative">
  <Search className="absolute..." />
  <input className="..." />
</div>

// After
<SearchBar value={search} onChange={setSearch} />
```

### 4. Use FilterBar Component
```tsx
// Before
<div className="grid grid-cols-4 gap-4">
  <select className="...">...</select>
  <select className="...">...</select>
  <button>Reset</button>
</div>

// After
<FilterBar filters={filterConfig} onReset={handleReset} />
```

### 5. Use Table Component
```tsx
// Before
<table className="w-full">
  <thead className="bg-slate-100">
    <tr>
      <th>...</th>
    </tr>
  </thead>
  <tbody>
    {data.map(row => (
      <tr className="hover:bg-slate-50">
        <td>...</td>
      </tr>
    ))}
  </tbody>
</table>

// After
<Table
  columns={columnConfig}
  data={data}
  onRowClick={handleRowClick}
  zebra
  hover
/>
```

### 6. Replace Hardcoded Colors
```tsx
// Before
<div className="bg-white border-slate-200 text-slate-900">

// After
<div style={{
  backgroundColor: theme.background.card,
  border: `1px solid ${theme.border.default}`,
  color: theme.text.primary
}}>
```

## Benefits

1. **Consistency**: All pages look the same
2. **Dark Mode**: Works automatically
3. **Maintenance**: Change one file to update all pages
4. **Type Safety**: TypeScript ensures correct usage
5. **Less Code**: Reusable components reduce boilerplate

## Testing Checklist

- [ ] Page loads without errors
- [ ] All buttons use Button component
- [ ] All inputs use Input/SearchBar components
- [ ] Filters use FilterBar component
- [ ] Tables use Table component
- [ ] No hardcoded colors (search for `bg-`, `text-`, `border-` classes)
- [ ] Dark mode works correctly
- [ ] Hover states work
- [ ] Focus states work
- [ ] All interactive elements are accessible

## Common Pitfalls

1. **Don't mix approaches**: Use either theme tokens OR UI components, not custom styling
2. **Don't use Tailwind color classes**: Use theme tokens instead
3. **Don't create custom buttons**: Use Button component with variants
4. **Don't skip dark mode testing**: Always test both modes
5. **Don't hardcode dimensions**: Use spacing tokens where possible

## Next Steps

1. Update VendorsPage (Reference page ✓)
2. Update ClientsPage
3. Update ProjectsPage
4. Update InvoicesPage
5. Update SettingsPage
6. Update all modals and forms
7. Remove unused custom components
8. Clean up unused Tailwind classes
