import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { canEdit, isAdmin, isSpectator } = useAuth();

  return {
    canEdit,
    isAdmin,
    isSpectator,
    canCreate: canEdit,
    canUpdate: canEdit,
    canDelete: canEdit,
  };
}
