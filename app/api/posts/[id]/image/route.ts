import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createStorageAdminClient } from "@/lib/supabase/storage-admin";
import { imageExtension, readImageBody } from "@/features/posts/image-file";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const failed = (status: number) => Response.json({ confirmed: false, error: "Chưa xác nhận được kết quả. Vui lòng tải lại tin trước khi thử lại." }, { status, headers });

async function readImage(id: string) {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error("Configuration unavailable");
  const post = await client.from("posts").select("id,owner_id,status").eq("id", id).is("deleted_at", null).maybeSingle();
  if (post.error) throw new Error("Post unavailable");
  if (!post.data) return null;
  const image = await client.from("post_images").select("storage_path").eq("post_id", id).maybeSingle();
  if (image.error) throw new Error("Image unavailable");
  return { post: post.data, path: image.data?.storage_path ?? null };
}

export async function GET(_request: Request, context: Context) {
  try {
    const parsed = z.string().uuid().safeParse((await context.params).id);
    if (!parsed.success) return failed(404);
    const id = parsed.data.toLowerCase();
    const current = await readImage(id);
    if (!current?.path) return failed(404);
    const admin = createStorageAdminClient();
    if (!admin) return failed(503);
    const result = await admin.storage.from("post-images").download(current.path);
    if (result.error || !result.data) return failed(503);
    const bytes = new Uint8Array(await result.data.arrayBuffer());
    if (!imageExtension(bytes, result.data.type)) return failed(415);
    // Check again after download: a hide/delete/replacement may have happened in flight.
    if ((await readImage(id))?.path !== current.path) return failed(404);
    return new Response(bytes, { headers: { ...headers, "Content-Type": result.data.type, "Content-Disposition": "inline", "Cross-Origin-Resource-Policy": "same-origin" } });
  } catch { return failed(503); }
}

async function mutate(request: Request, context: Context, remove: boolean) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) return failed(403);
    const parsed = z.string().uuid().safeParse((await context.params).id);
    if (!parsed.success) return failed(400);
    const id = parsed.data.toLowerCase();
    const account = await getAccount();
    if (!account.user) return failed(401);
    if (!account.profile) return failed(403);
    const current = await readImage(id);
    if (!current || current.post.owner_id !== account.user.id || !["searching", "matched"].includes(current.post.status)) return failed(403);
    const admin = createStorageAdminClient();
    if (!admin) return failed(503);
    const bucket = admin.storage.from("post-images");
    const cleanup = async (path: string) => {
      try {
        const result = await bucket.remove([path]);
        if (!result.error) return false;
      } catch { /* Keep the generated object path for operational cleanup. */ }
      console.error("B1e image cleanup pending", { postId: id, storagePath: path });
      return true;
    };
    let path: string | null = null;
    if (!remove) {
      const bytes = await readImageBody(request);
      const mime = request.headers.get("content-type") ?? "";
      const extension = bytes && imageExtension(bytes, mime);
      if (!bytes || !extension) return failed(415);
      path = `${account.user.id}/${id}/${crypto.randomUUID()}.${extension}`;
      try {
        const upload = await bucket.upload(path, bytes, { contentType: mime, upsert: false, cacheControl: "0" });
        if (upload.error) { await cleanup(path); return failed(503); }
      } catch {
        await cleanup(path);
        // A timed-out upload can finish after cleanup; retain its path for a later check.
        console.error("B1e image upload uncertain", { postId: id, storagePath: path });
        return failed(503);
      }
    }
    let confirmed = false;
    try {
      const result = await admin.rpc("set_post_image", {
        p_actor_id: account.user.id, p_post_id: id, p_expected_path: current.path, p_new_path: path,
      });
      confirmed = !result.error && result.data === id;
    } catch { /* Read back a possibly committed mutation; never retry it. */ }
    let cleanupPending = false;
    if (confirmed) {
      if (current.path) cleanupPending = await cleanup(current.path);
    } else {
      // A failed readback cannot justify deleting either potentially linked object.
      let read;
      try { read = await admin.from("post_images").select("storage_path").eq("post_id", id).maybeSingle(); }
      catch { /* Treat transport failure exactly like a failed DB readback. */ }
      if (!read || read.error) {
        console.error("B1e image readback pending", { postId: id, newPath: path, oldPath: current.path });
        return failed(503);
      }
      const actual = read.data?.storage_path ?? null;
      if (path && actual !== path) await cleanup(path);
      if (actual === path && current.path) await cleanup(current.path);
      return failed(503);
    }
    return Response.json({ confirmed: true, cleanupPending }, { headers });
  } catch { return failed(503); }
}

export async function PUT(request: Request, context: Context) { return mutate(request, context, false); }
export async function DELETE(request: Request, context: Context) { return mutate(request, context, true); }
