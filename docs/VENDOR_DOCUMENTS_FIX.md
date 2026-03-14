# Vendor Documents Upload Fix

## Issues Fixed

### 1. Document Type Constraint Violation (23514)
**Problem:** The `vendor_documents` table had a CHECK constraint that only allowed: `contract`, `nda`, `certificate`, `other`

**Solution:** Updated the constraint to include travel document types:
- `passport` (جواز سفر)
- `visa_usa` (تأشيرة أمريكا)
- `visa_uk` (تأشيرة بريطانيا)
- `visa_schengen` (تأشيرة شنغن)
- `visa_japan` (تأشيرة اليابان)
- Plus support for custom types like `other:custom_name`

**Migration:** `fix_vendor_documents_constraint`

### 2. Foreign Key Constraint Violation (23503)
**Problem:** When vendors uploaded documents, the code was setting `uploaded_by: vendor.id`, but this foreign key references the `users` table, not the `vendors` table.

**Error:**
```
insert or update on table "vendor_documents" violates
foreign key constraint "vendor_documents_uploaded_by_fkey"
```

**Root Cause:**
- Vendors are stored in the `vendors` table
- The `uploaded_by` field in `vendor_documents` references `users(id)`
- Trying to insert a vendor ID into a field that expects a user ID caused the constraint violation

**Solution:**
- Made `uploaded_by` optional (it was already nullable in the schema)
- Removed `uploaded_by` from the insert payload when vendors upload documents
- The field can still be used when admin users upload documents on behalf of vendors

## Code Changes

### File: `src/components/vendor/VendorProfile.tsx`

**Before:**
```typescript
const { error: dbErr } = await supabase.from('vendor_documents').insert({
  vendor_id: vendor.id,
  document_type: type,
  file_url: publicUrl,
  file_name: file.name,
  uploaded_by: vendor.id, // ❌ Wrong - vendor.id is not in users table
});
```

**After:**
```typescript
const { error: dbErr } = await supabase.from('vendor_documents').insert({
  vendor_id: vendor.id,
  document_type: type,
  file_url: publicUrl,
  file_name: file.name,
  // uploaded_by omitted - vendors are tracked via vendor_id
});
```

## Database Schema

### vendor_documents Table
```sql
CREATE TABLE vendor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,  -- Who the document belongs to
  document_type text NOT NULL CHECK (...),
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid REFERENCES users(id),  -- Optional: which admin user uploaded it (null for self-uploads)
  created_at timestamptz DEFAULT now()
);
```

**Key Points:**
- `vendor_id`: Always set - identifies the vendor who owns the document
- `uploaded_by`: Optional - only set when an admin uploads on behalf of a vendor
- When vendors upload their own documents, `uploaded_by` is `NULL`

## Testing

### Test Cases Covered
- ✅ Vendor uploads passport → Success
- ✅ Vendor uploads visa (USA, UK, Schengen, Japan) → Success
- ✅ Vendor uploads contract → Success
- ✅ Vendor uploads custom document → Success
- ✅ Document appears in vendor's profile
- ✅ Document can be viewed/downloaded
- ✅ Document can be deleted

### Error Handling
- File size validation (max 5MB)
- File type validation (JPG, PNG, WebP, PDF only)
- Storage upload error handling
- Database insert error handling
- User-friendly error messages in Arabic

## Related Files
- `src/components/vendor/VendorProfile.tsx` - Fixed upload logic
- `supabase/migrations/fix_vendor_documents_constraint.sql` - Updated constraint
