import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ data: null, error: "Thiếu env" }, { status: 500 });

  const sb = createClient(url, key);
  const { data, error } = await sb
    .from("prices")
    .select("province, region, price, change_value, updated_at, type")
    .eq("type", "coffee")
    .order("province", { ascending: true });

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });

  return NextResponse.json(
    { data, updated_at: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } }
  );
}
