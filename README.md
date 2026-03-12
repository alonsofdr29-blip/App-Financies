# NeonCash

Aplicacion web de finanzas personales hecha con React + Vite.

## Desarrollo local

```bash
npm install
npm run dev
```

## Variables de entorno

Copia `.env.example` a tu `.env` si quieres activar sincronizacion real:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`

Si no defines Supabase, la app funciona en modo local.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Despliegue

La guia de publicacion y sincronizacion esta en `docs/deploy-vercel-supabase.md`.
