import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig, supabaseCookieOptions } from "./supabase/config";

const config = getSupabaseConfig();
export const supabase = config
  ? createBrowserClient(config.url, config.key, { cookieOptions: supabaseCookieOptions })
  : null;
