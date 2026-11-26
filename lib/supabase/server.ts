import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig, supabaseCookieOptions } from "./config";

export async function createSupabaseServerClient(readOnly = false) {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch (error) {
          // Server Components cannot write cookies; proxy.ts persists refreshed sessions.
          if (!readOnly) throw error;
        }
      },
    },
  });
}

export async function getSupabaseUser() {
  const client = await createSupabaseServerClient(true);
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}
