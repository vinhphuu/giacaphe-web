import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Map tỉnh → vùng (fallback nếu chưa có cột province)
const PROVINCE_TO_REGION: Record<string, string> = {
  "Đắk Lắk":  "Tây Nguyên",
  "Gia Lai":   "Tây Nguyên",
  "Lâm Đồng":  "Tây Nguyên",
  "Đắk Nông":  "Tây Nguyên",
  "Kon Tum":   "Tây Nguyên",
  "Bình Phước":"Đông Nam Bộ",
  "Đồng Nai":  "Đông Nam Bộ",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const province = searchParams.get("province") ?? "Đắk Lắk";
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "7"), 7), 30);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ data: [] });

  const sb = createClient(url, key);
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Thử query theo province trước
  let { data, error } = await sb
    .from("price_history")
    .select("price, recorded_at")
    .eq("province", province)
    .eq("type", "coffee")
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true });

  // Nếu không có data, fallback query theo region
  if (!error && (!data || data.length === 0)) {
    const region = PROVINCE_TO_REGION[province] ?? province;
    const fallback = await sb
      .from("price_history")
      .select("price, recorded_at")
      .eq("region", region)
      .eq("type", "coffee")
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true });
    data  = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ data: [], error: error.message });

  const days7 = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const points = (data ?? []).map((r: { price: number; recorded_at: string }) => {
    const d = new Date(r.recorded_at);
    const label =
      days <= 7
        ? days7[d.getDay()]
        : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { date: label, price: r.price };
  });

  return NextResponse.json(
    { data: points },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } }
  );
}
