import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import type { ModuleKey, RolePermission } from '../types/database';

interface PermissionsContextType {
  permissions: Record<string, boolean>;
  roleName: string | null;
  isSuperAdmin: boolean;
  loading: boolean;
  hasAccess: (moduleKey: ModuleKey) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};

const SUPER_ADMIN_ROLE_ID = '00000000-0000-0000-0000-000000000001';

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
  const { profile, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [roleName, setRoleName] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    // Wait for auth to finish hydrating — otherwise we may briefly see no profile
    // during a refresh and erroneously mark loading=false with empty permissions,
    // causing downstream consumers to force a redirect.
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!profile) {
      setPermissions({});
      setRoleName(null);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    try {
      // Check if user has role_id assigned
      const roleId = profile.role_id;

      if (!roleId) {
        // Fallback for users not yet migrated: use legacy role field
        const isLegacySuperAdmin = profile.role === 'super_admin' || profile.role === 'admin';
        setIsSuperAdmin(isLegacySuperAdmin);
        setRoleName(isLegacySuperAdmin ? 'مدير عام' : 'مدير مشاريع');
        // Legacy super_admin gets all access, others get default PM access
        const defaultPerms: Record<string, boolean> = {
          dashboard: true, clients: true, vendors: true, projects: true,
          expenses: true, suggestions: true, reports: true,
          activity: isLegacySuperAdmin, settings: isLegacySuperAdmin, users: isLegacySuperAdmin,
        };
        setPermissions(defaultPerms);
        setLoading(false);
        return;
      }

      // Load role info
      const { data: role } = await supabase
        .from('roles')
        .select('id, name, is_system')
        .eq('id', roleId)
        .single();

      if (!role) {
        setLoading(false);
        return;
      }

      const isSystem = role.is_system;
      setIsSuperAdmin(isSystem);
      setRoleName(role.name);

      if (isSystem) {
        // System role (super_admin) — all access
        const allPerms: Record<string, boolean> = {
          dashboard: true, clients: true, vendors: true, projects: true,
          expenses: true, suggestions: true, reports: true,
          activity: true, settings: true, users: true,
        };
        setPermissions(allPerms);
      } else {
        // Load specific permissions
        const { data: perms } = await supabase
          .from('role_permissions')
          .select('module_key, has_access')
          .eq('role_id', roleId);

        const permMap: Record<string, boolean> = {};
        (perms || []).forEach((p: Pick<RolePermission, 'module_key' | 'has_access'>) => {
          permMap[p.module_key] = p.has_access;
        });
        setPermissions(permMap);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, authLoading]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasAccess = useCallback((moduleKey: ModuleKey): boolean => {
    if (isSuperAdmin) return true;
    return permissions[moduleKey] === true;
  }, [permissions, isSuperAdmin]);

  return (
    <PermissionsContext.Provider value={{
      permissions,
      roleName,
      isSuperAdmin,
      loading,
      hasAccess,
      refreshPermissions: loadPermissions,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
};
