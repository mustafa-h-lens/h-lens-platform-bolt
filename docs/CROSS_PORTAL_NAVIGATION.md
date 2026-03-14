# Cross-Portal Navigation Guide

This document explains how users can navigate smoothly between the Admin Portal and Vendor Portal in the same browser window.

## Portal URLs

### Admin Portal
- **Login URL**: `/portal-admin-hl`
- **Dashboard**: `/portal-admin-hl/dashboard` (auto-navigates after login)

### Vendor Portal
- **Login URL**: `/vendor-login`
- **Dashboard**: `/vendor` (auto-navigates after login)

## Session Management

### Independent Sessions
- Admin portal uses Supabase Auth (JWT-based authentication)
- Vendor portal uses custom session tokens (localStorage-based)
- Both sessions are completely independent and isolated

### Automatic Session Cleanup
When switching between portals, the system automatically:

1. **Admin → Vendor**:
   - Clears vendor session when accessing admin login
   - Clears admin session when accessing vendor portal (if logged in)

2. **Vendor → Admin**:
   - Clears admin session when accessing vendor login
   - Clears vendor session when accessing admin portal

## Navigation Flow

### Switching from Admin Portal to Vendor Portal

1. In the admin portal, manually navigate to `/vendor-login`
2. System automatically:
   - Clears any existing vendor session
   - Shows vendor login page
3. After vendor login:
   - Clears admin session (if active)
   - Navigates to vendor portal

### Switching from Vendor Portal to Admin Portal

1. In the vendor portal, manually navigate to `/portal-admin-hl`
2. System automatically:
   - Clears any existing vendor session
   - Shows admin login page
3. After admin login:
   - Navigates to admin dashboard

## Logout Behavior

### Admin Logout
When clicking "تسجيل الخروج" in the admin portal:
- Clears Supabase auth session
- Clears vendor session (if any exists)
- Redirects to admin login page

### Vendor Logout
When clicking "تسجيل الخروج" in the vendor portal:
- Clears vendor session from localStorage
- Clears admin session (if any exists)
- Redirects to vendor login page

## Same Browser Window Support

✅ **Fully Supported**:
- Navigate between portals by changing the URL
- No need to open new windows/tabs
- Sessions are properly isolated
- No conflicts or cross-contamination

## Example Usage

### Developer/Admin Testing Both Portals

```
1. Open browser to /portal-admin-hl
2. Login as admin → See admin dashboard
3. Navigate to /vendor-login (type in address bar)
4. Login as vendor → See vendor portal
5. Navigate back to /portal-admin-hl
6. Login as admin again → See admin dashboard
```

### Vendor Accessing Their Portal

```
1. Receive email with link to /vendor-login
2. Enter OTP → Access vendor portal
3. Work in vendor portal
4. Click logout → Return to vendor login
```

## Technical Implementation

### Session Storage
- **Admin Session**: Managed by Supabase Auth (`@supabase/supabase-js`)
- **Vendor Session**: Stored in `localStorage`:
  - `vendor_session`: { token, expiresAt }
  - `vendor_data`: { id, email, name, ... }

### Route Persistence
- Last visited page is saved to `localStorage` as `lastVisitedPage`
- On login, user is redirected to their last visited page (if applicable)
- Login pages are excluded from persistence

### Auto-Cleanup Triggers
Session cleanup is triggered at these points:
1. When accessing admin login → clears vendor session
2. When accessing vendor login → clears vendor session
3. When accessing vendor portal with active admin session → clears admin session
4. On explicit logout from either portal → clears both sessions

## Security Considerations

✅ **Secure**:
- Sessions don't interfere with each other
- Automatic cleanup prevents session confusion
- Each portal validates its own authentication
- No shared authentication state

## Future Enhancements

Potential improvements:
- Add visual indicator showing which portal you're in
- Add quick-switch menu for admin users who need to test vendor portal
- Remember last portal type for faster navigation
