import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Login from "./Login.jsx";

export default function AuthGate({ children, fallback }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // ✅ 1) Si viene ?code=... (PKCE), intercambiar por sesión
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;

          // Limpia ?code=...
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());
        }

        // ✅ 2) Si viene #access_token=... u otros params en el hash, limpiar el hash
        // (algunas configs de Supabase usan hash tokens)
        if (window.location.hash && window.location.hash.includes("access_token")) {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search
          );
        }

        // ✅ 3) Obtener sesión normal
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;
        setSession(data.session ?? null);
      } catch (e) {
        console.error("AuthGate init error:", e);
        if (!mounted) return;
        setSession(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) return fallback ?? <div style={{ padding: 24 }}>Cargando sesión…</div>;
  if (!session) return <Login />;

  return <>{children}</>;
}
