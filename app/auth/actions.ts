"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const client = await createSupabaseServerClient();
  if (!client) redirect("/auth/login?error=configuration");
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) redirect("/auth/login?error=logout");
  redirect("/auth/login");
}
