



import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Login from "./Login.jsx";

export default function AuthGate({ children, fallback }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
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

  if (loading) return fallback ?? <div style={{ padding: 24 }}>Cargando…</div>;
  if (!session) return <Login />;

  return children;
}
