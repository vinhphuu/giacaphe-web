import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

interface Article { title:string; slug:string; meta_description:string|null; created_at:string; }

async function getLatestArticles(): Promise<Article[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const sb = createClient(url, key, {
      global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 3600 } } as RequestInit) },
    });
    const { data, error } = await sb.from("articles").select("title,slug,meta_description,created_at").eq("status","published").order("created_at",{ascending:false}).limit(3);
    if (error) { console.error("[LatestNews]", error.message); return []; }
    return (data ?? []) as Article[];
  } catch(e) { console.error("[LatestNews] failed:", e); return []; }
}

function formatDateVN(iso:string) {
  return new Date(iso).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"});
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-3 animate-pulse">
      <div className="h-3 w-16 rounded-full bg-slate-700/80" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-slate-700/80" />
        <div className="h-4 w-4/5 rounded bg-slate-700/80" />
      </div>
      <div className="space-y-1.5 mt-1">
        <div className="h-3 w-full rounded bg-slate-800" />
        <div className="h-3 w-3/4 rounded bg-slate-800" />
      </div>
      <div className="mt-auto pt-3 border-t border-slate-800 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-slate-700/60" />
        <div className="h-3 w-24 rounded bg-slate-700/60" />
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article:Article }) {
  return (
    <Link href={`/tin-tuc/${article.slug}`} title={article.title}
      className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-amber-500/40 hover:bg-slate-800/80 transition-all duration-300 overflow-hidden">
      <div className="pointer-events-none absolute -top-10 -left-10 w-32 h-32 rounded-full bg-amber-500/0 group-hover:bg-amber-500/8 blur-2xl transition-all duration-500" />
      <div className="flex items-center gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          AI
        </span>
      </div>
      <h3 className="font-bold text-white text-[15px] leading-snug mb-2 group-hover:text-amber-400 transition-colors duration-200 line-clamp-2">
        {article.title}
      </h3>
      {article.meta_description && (
        <p className="text-slate-400 text-[13px] leading-relaxed line-clamp-2 flex-1">{article.meta_description}</p>
      )}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{formatDateVN(article.created_at)}</span>
        </div>
        <span className="flex items-center gap-1 text-xs text-amber-500/70 group-hover:text-amber-400 transition-colors">
          Đọc thêm
          <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </span>
      </div>
    </Link>
  );
}

export default async function LatestNews() {
  const articles = await getLatestArticles();
  const isEmpty  = articles.length === 0;
  return (
    <section className="w-full px-4 pb-10 mt-2">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="block w-1 h-5 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Phân tích thị trường</h2>
          </div>
          {!isEmpty && (
            <Link href="/tin-tuc" title="Xem tất cả bài phân tích thị trường cà phê" className="flex items-center gap-1 text-xs text-amber-400/80 hover:text-amber-400 transition-colors">
              Tất cả bài viết
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isEmpty ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            articles.map(a => <ArticleCard key={a.slug} article={a} />)
          )}
        </div>
        {isEmpty && <p className="text-center text-slate-600 text-xs mt-4">Bài viết sẽ tự động xuất hiện sau khi AI chạy lần đầu.</p>}
      </div>
    </section>
  );
}
