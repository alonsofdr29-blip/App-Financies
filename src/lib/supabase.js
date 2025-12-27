import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("SUPABASE URL:", supabaseUrl);
console.log("SUPABASE KEY exists:", !!supabaseAnonKey, "len:", supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  // Esto te ayuda a ver el fallo de config rápido
  console.warn("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
