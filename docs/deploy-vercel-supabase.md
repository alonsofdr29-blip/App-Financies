# Despliegue en movil sin depender del ordenador

La forma correcta de usar NeonCash desde el movil sin tener el PC encendido es:

1. Publicar la app en internet con `Vercel`.
2. Guardar los datos en la nube con `Supabase`.
3. Entrar con tu cuenta desde cualquier dispositivo.

## Lo que ya esta preparado

- La app ya soporta Supabase en `src/lib/supabase.js`.
- El esquema SQL ya existe en `supabase/schema.sql`.
- La URL publica para login por email y Google se puede configurar con `VITE_SITE_URL`.

## Paso 1. Crear Supabase

1. Crea un proyecto en Supabase.
2. Abre el editor SQL.
3. Ejecuta el contenido de `supabase/schema.sql`.
4. Copia:
   - `Project URL`
   - `anon public key`

## Paso 2. Configurar Auth en Supabase

En `Authentication > URL Configuration`:

- `Site URL`: `https://tu-app.vercel.app`
- `Redirect URLs`:
  - `https://tu-app.vercel.app`
  - `http://localhost:5173`
  - `http://127.0.0.1:4173`

Si vas a usar Google:

1. Activa el proveedor `Google`.
2. Crea credenciales OAuth en Google Cloud.
3. Anade la callback que te indique Supabase.
4. Pega `Client ID` y `Client Secret` en Supabase.

## Paso 3. Publicar en Vercel

1. Sube el proyecto a GitHub.
2. Importa el repo en Vercel.
3. Anade estas variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL`
4. Haz deploy.

## Paso 4. Instalarla en el movil

- Android: abre la URL en Chrome y pulsa `Anadir a pantalla de inicio`.
- iPhone: abre la URL en Safari, pulsa compartir y luego `Anadir a pantalla de inicio`.

## Resultado

- Puedes entrar desde movil, PC o tablet.
- Los datos se sincronizan entre dispositivos.
- La app sigue funcionando aunque el ordenador este apagado.
