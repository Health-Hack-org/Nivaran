import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { UserProfile } from "@/types";

let clientInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    anonKey &&
    url !== "https://your-project-ref.supabase.co" &&
    !url.includes("your-project-ref")
  );
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

/**
 * Validates whether a given ID string is a valid RFC 4122 UUID.
 * Prevents PostgreSQL syntax errors when running in guest/local mode.
 */
export function isValidUuid(val?: string | null): boolean {
  if (!val || typeof val !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Strips non-database fields from profile objects before sending to Supabase PostgREST
 * to guarantee compatibility with public.profiles table schema.
 */
export function sanitizeProfileForDb(profile: Partial<UserProfile>) {
  return {
    id: profile.id,
    username: profile.username || "Seeker",
    gender: profile.gender || "male",
    age: Number(profile.age) || 24,
    height_cm: Number(profile.height_cm) || 175,
    weight_kg: Number(profile.weight_kg) || 70,
    activity_level: profile.activity_level || "light",
    active_track: profile.active_track || "sm",
    medical_flags: profile.medical_flags || [],
    medical_notes: profile.medical_notes || "",
    dietary_preference: profile.dietary_preference || "vegetarian",
    avatar_url: profile.avatar_url || null,
    updated_at: new Date().toISOString(),
  };
}
