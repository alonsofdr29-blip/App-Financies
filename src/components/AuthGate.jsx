

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Login from "./Login";

export default function AuthGate({ children, fallback }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  console.log("AuthGate render", { loading, hasSession: !!session });

  useEffect(() => {
    let mounted = true;


    async function init() {
      const { data, error } = await supabase.auth.getSession();
      console.log("getSession", { session: data?.session, error });
      if (!mounted) return;
      setSession(data?.session ?? null);
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
