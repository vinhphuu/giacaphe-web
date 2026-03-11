/**
 * app/api/cron/write-article/route.ts
 * ?session=sang  → chạy 7:00 SA VN (00:00 UTC)
 * ?session=trua  → chạy 11:30 SA VN (04:30 UTC)
 */
import { NextRequest, NextResponse } from "next/server";
import { generateMarketArticle, saveArticle } from "@/lib/ai-writer";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth:{ persistSession:false, autoRefreshToken:false } }
  );
}

async function fetchLatestPrices() {
  const { data } = await getSupabaseAdmin()
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
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data } = await getSupabaseAdmin()
    .from("price_history")
    .select("price, recorded_at")
    .eq("province", "Đắk Lắk")
    .eq("type", "coffee")
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending:true });
  if (!data || data.length === 0) return [];
  const days = ["CN","T2","T3","T4","T5","T6","T7"];
  return data.map((r: { price:number; recorded_at:string }) => ({
    date:  days[new Date(r.recorded_at).getDay()],
    price: r.price,
  }));
}

export async function GET(request: NextRequest) {
  const start = Date.now();

  // Auth
  const auth   = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  }

  // Lấy session từ query param: ?session=sang hoặc ?session=trua
  const session = request.nextUrl.searchParams.get("session") ?? "sang";

  const [prices, history] = await Promise.all([
    fetchLatestPrices(),
    fetchHistory7Days(),
  ]);

  if (prices.length === 0) {
    return NextResponse.json({ success:false, error:"Không có dữ liệu giá trong DB" }, { status:422 });
  }

  const writeResult = await generateMarketArticle(prices, history, session);

  if (!writeResult.success || !writeResult.article) {
    return NextResponse.json({
      success:  false,
      session,
      error:    writeResult.error,
      duration: `${Date.now()-start}ms`,
      timestamp: new Date().toISOString(),
    }, { status:500 });
  }

  const saveResult = await saveArticle(writeResult.article, prices);

  return NextResponse.json({
    success:  true,
    session,
    article: {
      id:         saveResult.article_id,
      slug:       saveResult.slug,
      title:      writeResult.article.title,
      word_count: writeResult.article.word_count,
      url:        `https://giacaphe-web.vercel.app/tin-tuc/${saveResult.slug}`,
      save_error: saveResult.error,
    },
    duration:  `${Date.now()-start}ms`,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) { return GET(request); }
