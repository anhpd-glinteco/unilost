import type { User } from "@supabase/supabase-js";

export const member: User = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  email: "member@example.test",
  app_metadata: {},
  user_metadata: { role: "admin", full_name: "Untrusted metadata" },
  created_at: "2026-10-17T00:00:00Z",
};

export const memberProfile = {
  id: member.id,
  full_name: "Nguyễn Minh Anh",
  faculty: "Khoa CNTT",
  role: "user" as const,
  created_at: "2026-10-17T00:00:00Z",
};
