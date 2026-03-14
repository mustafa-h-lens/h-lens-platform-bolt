# Route Persistence System

## Overview
The application now includes automatic route persistence that saves the user's last visited page and restores it after page refresh or reload.

## How It Works

### 1. Route Tracking
- Every time the user navigates to a new page, the current route is automatically saved to `localStorage`
- The key used is: `lastVisitedPage`
- Both pathname and search params are saved (e.g., `/portal-admin-hl/dashboard?tab=projects`)

### 2. Route Restoration
- On app initialization, the system checks if there's a saved route in `localStorage`
- If the user is authenticated and currently on a login page, they are automatically redirected to their last visited page
- This works for both:
  - **Vendor routes**: Restores if vendor session exists
  - **Admin/Client routes**: Restores if user is authenticated

### 3. Excluded Routes
The following routes are **NOT** saved as last visited pages:
- `/portal-admin-hl` (admin login)
- `/vendor-login` (vendor login)
- `/vendor-registration` (vendor registration)

This prevents users from being stuck in login loops.

## Implementation Details

### Files Modified

#### 1. `src/lib/router.ts`
**New Functions:**
- `saveLastVisitedPage(pathname, search)`: Saves the current route to localStorage
- `getLastVisitedPage()`: Retrieves the last visited route from localStorage
- `clearLastVisitedPage()`: Clears the saved route
- `useRouteTracking()`: React hook that automatically tracks route changes

**Key Features:**
- Filters out login and registration pages
- Handles localStorage errors gracefully
- Saves full path including query parameters

#### 2. `src/App.tsx`
**Changes:**
- Added `useRouteTracking()` hook to track all route changes
- Added route restoration logic in `useEffect`
- Checks authentication status before restoring routes
- Only restores when user is on a login page or root path

**Restoration Logic:**
```typescript
// For vendor routes
if (isVendorRoute && storedVendorSession) {
  navigate(lastVisitedPage);
}

// For admin/client routes
if (isAdminRoute && user && profile) {
  navigate(lastVisitedPage);
}
```

## User Experience

### Before
1. User is on `/portal-admin-hl/dashboard/projects`
2. User refreshes the page
3. User is redirected to `/portal-admin-hl` (login page)
4. After login, user lands on default dashboard

### After
1. User is on `/portal-admin-hl/dashboard/projects`
2. User refreshes the page
3. User is automatically redirected to `/portal-admin-hl/dashboard/projects`
4. User continues where they left off

## Technical Notes

- Uses `localStorage` for persistence (survives page refresh)
- Safe error handling prevents crashes if localStorage is unavailable
- Works seamlessly with existing React Router setup
- Does not break protected routes or authentication flow
- Minimal performance impact (single localStorage read on load)

## Testing Checklist

- [x] Admin user navigates to projects page, refreshes → returns to projects page
- [x] Client user navigates to dashboard, refreshes → returns to dashboard
- [x] Vendor navigates to profile, refreshes → returns to profile
- [x] User logs out → last visited page is still saved for next login
- [x] User on login page → no redirect loop
- [x] Query parameters are preserved (e.g., `?tab=financial`)
- [x] Works with browser back/forward buttons
- [x] Works after closing and reopening browser tab
