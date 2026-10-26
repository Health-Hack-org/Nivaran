import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && url !== "https://your-project-ref.supabase.co" && !url.includes("your-project-ref"));
};

export const getSupabaseBrowserClient = (): SupabaseClient | null => {
  if (typeof window === "undefined") return null;

  if (clientInstance) return clientInstance;

  if (isSupabaseConfigured()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    clientInstance = createBrowserClient(url, anonKey);
    return clientInstance;
  }

  return null;
};
