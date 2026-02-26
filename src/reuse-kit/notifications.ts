import { supabase } from '@/lib/supabase'; // Asegúrate de ajustar esta ruta en el nuevo sistema

export interface NotificationParams {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  related_id?: string;
}

/**
 * Crea una notificación para un usuario específico de forma asíncrona.
 */
export async function createNotification(params: NotificationParams) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: params.user_id,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        related_id: params.related_id,
        is_read: false
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Notifica a todos los usuarios con un rol específico.
 * Útil para notificar a administradores sobre nuevos eventos o tareas.
 */
export async function notifyByRole(role: string, params: Omit<NotificationParams, 'user_id'>) {
  try {
    // Busca los IDs de los usuarios con el rol especificado
    const { data: users, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', role);

    if (fetchError) throw fetchError;

    if (users && users.length > 0) {
      const notifications = users.map(user => ({
        user_id: user.id,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        related_id: params.related_id,
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error(`Error notifying role ${role}:`, error);
  }
}
