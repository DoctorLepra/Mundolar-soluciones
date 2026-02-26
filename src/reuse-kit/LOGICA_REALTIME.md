# Guía de Lógica: Real-time y Asincronismo (Puro)

Como ya tienes implementadas las tareas y notificaciones, aquí tienes el código "puro" de la lógica de asincronismo y tiempo real para que lo integres directamente en tus archivos existentes.

## 1. Patrón Real-time (Suscripción Genérica)

Usa este hook para que cualquier lista se actualice sola cuando cambie algo en la base de datos:

```tsx
// Ejemplo de uso en tu componente de Eventos o Tareas
useRealtimeSubscription(
  {
    channelName: "mis-eventos-live",
    table: "eventos",
    event: "*", // Escucha inserts, updates y deletes
    onPayload: (payload) => {
      console.log("Cambio detectado:", payload);
      fetchData(); // Función que recarga tus datos de la API
    },
  },
  [],
);
```

## 2. Patrón de Asincronismo (Mejores Prácticas)

Para tus funciones de creación/edición, asegúrate de manejar la asincronía de forma robusta para evitar bloqueos en la UI:

```typescript
export async function handleAsyncAction(data: any) {
  try {
    // 1. Iniciar acción asíncrona
    const { data: result, error } = await supabase
      .from("tu_tabla")
      .insert([data])
      .select()
      .single();

    if (error) throw error;

    // 2. Ejecutar efectos secundarios sin esperar (Opcional)
    // createNotification(...);

    return result;
  } catch (error) {
    console.error("Error en acción asíncrona:", error);
    // Manejo de errores (Toasts, etc.)
  }
}
```

## 3. Activación en Supabase (SQL)

Para que el código frontend reciba los mensajes, **debes** habilitar el Real-time en las tablas correspondientes mediante SQL:

```sql
-- Ejecutar en el editor SQL de Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.nombre_de_tu_tabla;
```

> [!TIP]
> Si habilitas Real-time en una tabla con RLS (Row Level Security), Supabase solo enviará los cambios a los usuarios que tengan permiso de 'SELECT' sobre esas filas.
