import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Test với service role key + slug
  let slugTest = null;
  let slugError = null;
  if (slug && url && serviceKey) {
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await sb.from("articles").select("id,slug,title,status").eq("slug", slug).eq("status","published").single();
    slugTest = data;
    slugError = error?.message ?? null;
  }

  // List articles với anon key
  const sb2 = createClient(url!, anonKey!);
  const { data, error, count } = await sb2.from("articles")
    .select("id,slug,status,title,created_at", { count: "exact" })
    .order("created_at", { ascending: false }).limit(5);

  return NextResponse.json({
    env: { hasUrl: !!url, hasAnonKey: !!anonKey, hasServiceKey: !!serviceKey },
    slugTest, slugError,
    total: count, data, listError: error?.message,
    supabaseUrl: url?.slice(0, 40)
  });
}
