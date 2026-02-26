-- Esquema SQL para Tareas y Notificaciones (Genérico)

-- 1. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'alert', 'task', etc.
    related_id TEXT, -- ID de la entidad relacionada (evento, pedido, etc.)
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Tareas
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo SERIAL, -- Opcional: número secuencial legible
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'Pendiente', -- 'Pendiente', 'Completada', 'Cancelada'
    assigned_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to_name TEXT, -- Nombre cacheado para facilitar visualización
    entity_id TEXT, -- ID de la entidad a la que pertenece (e.g., ID de Evento)
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Real-time para estas tablas
-- Ejecutar esto en el editor SQL para asegurar que los cambios se publiquen
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Políticas RLS (Ejemplo básico)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven sus propias notificaciones
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios ven tareas asignadas o creadas por ellos (o todas si son admins, ajusta según necesites)
CREATE POLICY "Users can view related tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = assigned_to_id OR auth.uid() = created_by_id);
