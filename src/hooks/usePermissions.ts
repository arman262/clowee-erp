import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { canEdit, isAdmin, isSpectator, isSuperAdmin } = useAuth();

  return {
    canEdit,
    isAdmin,
    isSpectator,
    isSuperAdmin,
    canCreate: canEdit,
    canUpdate: canEdit,
    canDelete: canEdit,
  };
}
