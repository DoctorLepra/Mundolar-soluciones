import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    // Initialize Supabase inside handler to avoid build-time errors
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del usuario' }, { status: 400 });
    }

    // Deleting from auth.users (this also cascades to profiles if REFERENCES ... ON DELETE CASCADE is set)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
