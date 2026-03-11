import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing env vars", hasUrl: !!url, hasKey: !!key });
  }

  const sb = createClient(url, key);

  const { data, error, count } = await sb
    .from("articles")
    .select("id, slug, status, title, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ total: count, data, error, supabaseUrl: url.slice(0, 40) });
}
