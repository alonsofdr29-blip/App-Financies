import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import Login from "./Login.jsx";

export default function AuthGate({ children, fallback }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setSession(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    async function init() {
      try {
        // Procesa callbacks de auth de Supabase en varios formatos:
        // 1) ?code=... (PKCE)
        // 2) ?token_hash=...&type=... (magic link / recovery)
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const otpType = url.searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (tokenHash && otpType) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (error) throw error;
        }

        // Obtener sesión después del posible intercambio de código.
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;
        setSession(data.session ?? null);

        // Limpia parámetros/hash de auth solo cuando ya hay sesión.
        if (data.session) {
          url.searchParams.delete("code");
          url.searchParams.delete("token_hash");
          url.searchParams.delete("type");
          url.searchParams.delete("next");
          const cleanedPath = url.pathname + url.search;
          if (window.location.pathname + window.location.search + window.location.hash !== cleanedPath) {
            window.history.replaceState({}, document.title, cleanedPath);
          }
        }
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
