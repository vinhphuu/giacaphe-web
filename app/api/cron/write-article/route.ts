/**
 * app/api/cron/write-article/route.ts
 * Chạy lúc 7:00 SA giờ Việt Nam (00:00 UTC)
 * Lấy giá mới nhất từ DB → Groq viết bài → lưu vào articles
 */
import { NextRequest, NextResponse } from "next/server";
import { generateMarketArticle, saveArticle } from "@/lib/ai-writer";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchLatestPrices() {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("prices")
    .select("province, price, change_value, region")
    .eq("type", "coffee")
    .order("province");
  return (data ?? []).map((r: { province:string; price:number; change_value:number; region:string }) => ({
    province:     r.province,
    price:        r.price,
    change_value: r.change_value ?? 0,
    region:       r.region ?? "Tây Nguyên",
  }));
}

async function fetchHistory7Days() {
  const sb = getSupabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data } = await sb
    .from("price_history")
    .select("price, recorded_at")
    .eq("province", "Đắk Lắk")
    .eq("type", "coffee")
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true });
  if (!data || data.length === 0) return [];
  const days = ["CN","T2","T3","T4","T5","T6","T7"];
  return data.map((r: { price:number; recorded_at:string }) => ({
    date:  days[new Date(r.recorded_at).getDay()],
    price: r.price,
  }));
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  const auth  = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [prices, history] = await Promise.all([
    fetchLatestPrices(),
    fetchHistory7Days(),
  ]);

  if (prices.length === 0) {
    return NextResponse.json({ success: false, error: "Không có dữ liệu giá trong DB" });
  }

  const writeResult = await generateMarketArticle(prices, history);

  if (!writeResult.success || !writeResult.article) {
    return NextResponse.json({
      success: false,
      error: writeResult.error,
      duration: `${Date.now() - start}ms`,
    }, { status: 500 });
  }

  const saveResult = await saveArticle(writeResult.article, prices);

  return NextResponse.json({
    success:  true,
    article: {
      id:         saveResult.article_id,
      slug:       saveResult.slug,
      title:      writeResult.article.title,
      word_count: writeResult.article.word_count,
      url:        `https://giacaphe-web.vercel.app/tin-tuc/${saveResult.slug}`,
    },
    duration: `${Date.now() - start}ms`,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) { return GET(request); }
