import { NextRequest, NextResponse } from "next/server";
import { scrapeCoffeePrices }         from "@/lib/scraper";
import { upsertCoffeePrices }         from "@/lib/db-updater";
import { generateMarketArticle, saveArticle } from "@/lib/ai-writer";
import { createClient }               from "@supabase/supabase-js";

export const maxDuration = 60;
export const dynamic     = "force-dynamic";

async function fetchPriceHistory7Days() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url||!key) return [];
  const sb = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const since = new Date(); since.setDate(since.getDate()-7);
  const {data} = await sb.from("price_history").select("price,recorded_at").eq("province","Đắk Lắk").eq("type","coffee").gte("recorded_at",since.toISOString()).order("recorded_at",{ascending:true});
  if (!data||data.length===0) return [];
  const days = ["CN","T2","T3","T4","T5","T6","T7"];
  return data.map((r:{price:number;recorded_at:string}) => ({date:days[new Date(r.recorded_at).getDay()],price:r.price}));
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  const auth  = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret||auth!==`Bearer ${secret}`) {
    return NextResponse.json({error:"Unauthorized — Thiếu hoặc sai CRON_SECRET"},{status:401});
  }

  // ── Bước 1: Crawl giá ──
  const scrapeResult = await scrapeCoffeePrices();
  if (!scrapeResult.success||scrapeResult.data.length===0) {
    return NextResponse.json({success:false,step:"scrape",error:scrapeResult.error,duration:`${Date.now()-start}ms`,timestamp:new Date().toISOString()},{status:422});
  }

  // ── Bước 2: Upsert DB ──
  const dbResult = await upsertCoffeePrices(scrapeResult.data);
  if (!dbResult.success) {
    return NextResponse.json({success:false,step:"database",errors:dbResult.errors,duration:`${Date.now()-start}ms`,timestamp:new Date().toISOString()},{status:500});
  }

  // ── Bước 3: Lịch sử 7 ngày ──
  const history = await fetchPriceHistory7Days();

  // ── Bước 4: Gemini viết bài ──
  const regionMap: Record<string,string> = {
    "Đắk Lắk":"Tây Nguyên","Gia Lai":"Tây Nguyên","Lâm Đồng":"Tây Nguyên",
    "Đắk Nông":"Tây Nguyên","Kon Tum":"Tây Nguyên","Bình Phước":"Đông Nam Bộ","Đồng Nai":"Đông Nam Bộ",
  };
  const pricesForAI = scrapeResult.data.map(p=>({province:p.province,price:p.price,change_value:p.change_value,region:regionMap[p.province]??"Khác"}));

  const writeResult = await generateMarketArticle(pricesForAI, history);

  if (!writeResult.success||!writeResult.article) {
    // Giá đã update OK — chỉ AI thất bại, không fail toàn bộ
    return NextResponse.json({
      success:true, step:"prices_ok_article_failed",
      scraped:scrapeResult.data.length, upserted:dbResult.upserted,
      provinces:scrapeResult.data.map(p=>p.province),
      article_error:writeResult.error,
      duration:`${Date.now()-start}ms`, timestamp:new Date().toISOString(),
    });
  }

  // ── Bước 5: Lưu bài vào articles ──
  const saveResult = await saveArticle(writeResult.article, pricesForAI);

  return NextResponse.json({
    success:true,
    scraped:scrapeResult.data.length,
    upserted:dbResult.upserted,
    article:{
      id:saveResult.article_id,
      slug:saveResult.slug,
      title:writeResult.article.title,
      word_count:writeResult.article.word_count,
      url:`https://giacaphe-web.vercel.app/tin-tuc/${saveResult.slug}`,
      save_error:saveResult.error,
    },
    duration:`${Date.now()-start}ms`,
    timestamp:new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) { return GET(request); }
