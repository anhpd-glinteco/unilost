import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeAuthReturnPath } from "@/lib/auth/return-path";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let destination = "/auth/login?error=callback";
  const client = await createSupabaseServerClient();
  if (!client) {
    destination = "/auth/login?error=configuration";
  } else {
    const code = url.searchParams.get("code");
    if (code && !url.searchParams.has("error")) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        const { data, error: userError } = await client.auth.getUser();
        if (!userError && data.user) destination = safeAuthReturnPath(url.searchParams.get("next"));
      }
    }
  }
  const response = NextResponse.redirect(new URL(destination, url.origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
