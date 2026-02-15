import React, { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const EMAIL_COOLDOWN_SECONDS = 60;
const LOGIN_COOLDOWN_KEY = "finanzas_login_cooldown_until";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(() => {
    const stored = Number(localStorage.getItem(LOGIN_COOLDOWN_KEY) || 0);
    return Number.isFinite(stored) ? stored : 0;
  });
  const [now, setNow] = useState(Date.now());

  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const isCooldownActive = secondsLeft > 0;

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);

    const authError = hashParams.get("error") || queryParams.get("error");
    const authDescription =
      hashParams.get("error_description") || queryParams.get("error_description") || "";

    if (!authError) return;

    const decodedDescription = decodeURIComponent(authDescription.replace(/\+/g, " ")).toLowerCase();
    let message = "El enlace de acceso no es válido. Solicita uno nuevo.";

    if (authError === "access_denied" && decodedDescription.includes("redirect")) {
      message = "Inicio bloqueado: falta configurar la URL de redirección en Supabase Auth.";
    } else if (decodedDescription.includes("expired") || decodedDescription.includes("invalid")) {
      message = "El enlace expiró o ya fue usado. Pide un enlace nuevo.";
    }

    setErr(message);

    // Limpia parámetros de error del callback para evitar confusión en recargas.
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const intervalId = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) {
        window.clearInterval(intervalId);
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  function startCooldown(seconds = EMAIL_COOLDOWN_SECONDS) {
    const until = Date.now() + seconds * 1000;
    setNow(Date.now());
    setCooldownUntil(until);
    localStorage.setItem(LOGIN_COOLDOWN_KEY, String(until));
  }

  function clearCooldown() {
    setCooldownUntil(0);
    localStorage.removeItem(LOGIN_COOLDOWN_KEY);
  }

  function parseRetrySeconds(error) {
    const status = Number(error?.status);
    const code = String(error?.code || "").toLowerCase();
    const name = String(error?.name || "").toLowerCase();
    const rawMessage = String(error?.message || "").toLowerCase();

    const isRateLimited =
      status === 429 ||
      rawMessage.includes("rate limit") ||
      code.includes("rate") ||
      name.includes("rate");

    if (!isRateLimited) return null;

    const minutesMatch = rawMessage.match(/(\d+)\s*(minute|min)/);
    if (minutesMatch) return Number(minutesMatch[1]) * 60;

    const secondsMatch = rawMessage.match(/(\d+)\s*(second|sec|s)/);
    if (secondsMatch) return Number(secondsMatch[1]);

    return EMAIL_COOLDOWN_SECONDS;
  }

  async function sendMagicLink(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!isSupabaseConfigured || !supabase) {
      setErr("Configuración faltante: revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.");
      return;
    }

    const clean = email.trim();
    if (!clean) {
      setErr("Escribe tu email.");
      return;
    }

    if (isCooldownActive) {
      setErr(`Espera ${secondsLeft}s antes de pedir otro enlace.`);
      return;
    }

    setLoading(true);
    try {
      const redirectTo = window.location.origin + "/";

      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setMsg("Te he enviado un enlace al correo ✅ (mira también spam).");
      startCooldown();
    } catch (e) {
      const rawMessage = String(e?.message || "").toLowerCase();
      const retrySeconds = parseRetrySeconds(e);
      if (retrySeconds) {
        setErr(`Has pedido demasiados enlaces. Espera ${retrySeconds}s y vuelve a intentarlo.`);
        startCooldown(retrySeconds);
      } else if (
        e instanceof TypeError ||
        rawMessage.includes("failed to fetch") ||
        rawMessage.includes("networkerror")
      ) {
        clearCooldown();
        setErr("No hay conexión con Auth. Revisa internet, bloqueadores del navegador y variables de Vercel.");
      } else {
        clearCooldown();
        setErr("No se pudo enviar el enlace. Revisa tu correo e inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-900 dark:bg-[#0B0F1A] dark:text-neutral-100 p-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="text-2xl font-extrabold">Inicia sesión</div>
        <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-300">
          Te enviaré un enlace al correo (sin contraseña).
        </div>

        <form onSubmit={sendMagicLink} className="mt-5 space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Email
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-2xl border px-3 py-3 text-sm outline-none border-neutral-200 bg-white text-neutral-900 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:ring-white/15"
            />
          </label>

          <button
            type="submit"
            disabled={loading || isCooldownActive}
            className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {loading ? "Enviando…" : isCooldownActive ? `Reintentar en ${secondsLeft}s` : "Enviar enlace"}
          </button>

          {err ? <div className="text-sm font-semibold text-red-600">{err}</div> : null}
          {msg ? <div className="text-sm font-semibold text-green-600">{msg}</div> : null}
        </form>
      </div>
    </div>
  );
}
