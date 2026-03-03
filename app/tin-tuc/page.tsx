import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Tin tức & Phân tích thị trường cà phê | GiaCaPhe",
  description: "Cập nhật tin tức, phân tích chuyên sâu về thị trường cà phê Việt Nam và thế giới mỗi ngày.",
};

interface Article { id:number; title:string; slug:string; excerpt:string|null; created_at:string; word_count:number|null; }

async function getArticles(): Promise<Article[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url||!key) return [];
  const {data,error} = await createClient(url,key).from("articles").select("id,title,slug,excerpt,created_at,word_count").eq("status","published").order("created_at",{ascending:false}).limit(20);
  if (error) return [];
  return data as Article[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"});
}

export default async function TinTucPage() {
  const articles = await getArticles();
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full uppercase tracking-wider">Phân tích thị trường</span>
          <h1 className="text-3xl font-bold text-white mt-3 mb-3">Tin tức & Nhận định</h1>
          <p className="text-slate-400">Bài viết được tạo tự động hàng ngày bởi AI dựa trên dữ liệu thị trường thực tế.</p>
        </div>
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">Chưa có bài viết nào.</p>
            <p className="text-slate-600 text-sm mt-2">Bài viết sẽ tự động xuất hiện sau khi cron job chạy lần đầu.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article, i) => (
              <Link key={article.id} href={`/tin-tuc/${article.slug}`} className="group block bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {i===0 && <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider mb-2">Mới nhất</span>}
                    <h2 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors leading-snug mb-2">{article.title}</h2>
                    {article.excerpt && <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">{article.excerpt}</p>}
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                      <span>{formatDate(article.created_at)}</span>
                      {article.word_count && <><span>·</span><span>{article.word_count.toLocaleString()} từ</span></>}
                    </div>
                  </div>
                  <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 group-hover:bg-amber-500/20 flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-10 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-amber-400 transition-colors">← Xem bảng giá hôm nay</Link>
        </div>
      </div>
    </main>
  );
}
