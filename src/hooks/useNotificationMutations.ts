import { createNotification } from "./useNotifications";

export const useNotificationMutations = () => {
  const getCurrentUserId = () => {
    const storedUser = localStorage.getItem('clowee_user');
    return storedUser ? JSON.parse(storedUser).user.id : null;
  };

  const notifyCreate = async (module: string, entity: string) => {
    const userId = getCurrentUserId();
    await createNotification(
      'Success',
      `New ${entity} created in ${module}`,
      module,
      userId
    );
  };

  const notifyUpdate = async (module: string, entity: string) => {
    const userId = getCurrentUserId();
    await createNotification(
      'Info',
      `${entity} updated in ${module}`,
      module,
      userId
    );
  };

  const notifyDelete = async (module: string, entity: string) => {
    const userId = getCurrentUserId();
    await createNotification(
      'Warning',
      `${entity} deleted from ${module}`,
      module,
      userId
    );
  };

  const notifyError = async (module: string, message: string) => {
    const userId = getCurrentUserId();
    await createNotification(
      'Error',
      message,
      module,
      userId
    );
  };

  return { notifyCreate, notifyUpdate, notifyDelete, notifyError };
};
