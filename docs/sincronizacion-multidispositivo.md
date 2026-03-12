# Sincronizacion multidispositivo

## Objetivo
Permitir que una misma cuenta vea los mismos datos en ordenador, movil y tablet sin perder categorias, movimientos, presupuestos, metas ni recurrentes.

## Arquitectura elegida
- Autenticacion: Supabase Auth con email/contrasena y Google.
- Base de datos: Postgres en Supabase.
- Seguridad: Row Level Security para que cada usuario solo vea sus datos.
- Sesion: persistente en web y PWA para mantener el acceso entre visitas.
- Sincronizacion: escritura inmediata en nube y cache local como respaldo.

## Modelo de datos
La app ya tiene preparado este modelo en `supabase/schema.sql`:
- `finance_profiles`
- `finance_categories`
- `finance_transactions`
- `finance_recurring_entries`
- `finance_savings_goals`
- `finance_monthly_plans`

## Flujo funcional
1. El usuario crea cuenta o entra con Google.
2. La app descarga su perfil y todas sus tablas.
3. Cada accion local actualiza primero el estado de React.
4. Despues se hace `upsert` en Supabase.
5. Si no hay red, se conserva el estado local y se reintenta al volver la conexion.
6. En otros dispositivos, la sesion recupera los datos del mismo usuario.

## Reglas clave
- `user_id` en todas las tablas de negocio.
- Politicas RLS activadas por usuario.
- `updated_at` en todas las entidades para resolver sincronizaciones futuras.
- IDs UUID generados en cliente para evitar conflictos entre dispositivos.

## Mejoras recomendadas para la siguiente fase
- Activar `realtime` en `finance_transactions`, `finance_categories`, `finance_monthly_plans` y `finance_savings_goals`.
- Crear una cola `pending mutations` en local para modo offline real.
- Añadir un indicador visual de estado: `Sincronizando`, `Guardado en nube`, `Sin conexion`.
- Guardar `last_synced_at` por usuario para diagnostico.
- Resolver conflictos por `updated_at`, priorizando el ultimo cambio confirmado.

## Configuracion tecnica pendiente
1. Crear proyecto de Supabase.
2. Copiar variables de `.env.example` a `.env`.
3. Ejecutar `supabase/schema.sql` en el SQL Editor.
4. Activar proveedor Google en Supabase Auth.
5. Añadir la URL de produccion y la URL local del proyecto a los redirect URLs.

## Estado actual del proyecto
La app ya tiene la base tecnica creada en:
- `src/lib/supabase.js`
- `supabase/schema.sql`
- `.env.example`

## Siguiente implementacion recomendada
- Fase 1: conectar proyecto Supabase real.
- Fase 2: probar login en PC y movil con la misma cuenta.
- Fase 3: activar realtime y feedback visual de sincronizacion.
- Fase 4: anadir soporte offline con cola de reintentos.
