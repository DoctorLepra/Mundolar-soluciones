import { supabase } from './supabase';

export async function createNotification(params: {
  user_id: string;
  title: string;
  message: string;
  type: 'task' | 'quote' | 'order';
  related_id?: string;
}) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: params.user_id,
        title: params.title,
        message: params.message,
        type: params.type,
        related_id: params.related_id,
        is_read: false
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function notifyAdmins(params: {
  title: string;
  message: string;
  type: 'task' | 'quote' | 'order';
  related_id?: string;
}) {
  try {
    // Fetch all admins
    const { data: admins, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'Admin');

    if (fetchError) throw fetchError;

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title: params.title,
        message: params.message,
        type: params.type,
        related_id: params.related_id,
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}
