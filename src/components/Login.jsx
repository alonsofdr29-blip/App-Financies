import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function sendMagicLink(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    const clean = email.trim();
    if (!clean) {
      setErr("Escribe tu email.");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw error;

      setMsg("Te he enviado un enlace al correo ✅ (mira también spam).");
    } catch (e) {
      setErr(e?.message || "No se pudo iniciar sesión.");
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
            <div className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-2xl border px-3 py-3 text-sm outline-none border-neutral-200 bg-white text-neutral-900 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:ring-white/15"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>

          {err ? <div className="text-sm font-semibold text-red-600">{err}</div> : null}
          {msg ? <div className="text-sm font-semibold text-green-600">{msg}</div> : null}
        </form>
      </div>
    </div>
  );
}
