/**
 * components/LatestArticle.tsx
 * Hiển thị bài viết mới nhất ở cuối trang chủ
 */
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

interface Article {
  title:      string;
  slug:       string;
  excerpt:    string | null;
  created_at: string;
  word_count: number | null;
}

async function getLatestArticle(): Promise<Article | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const { data } = await createClient(url, key)
    .from("articles")
    .select("title, slug, excerpt, created_at, word_count")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data as Article | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default async function LatestArticle() {
  const article = await getLatestArticle();
  if (!article) return null;

  return (
    <section className="mt-8 px-4 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 bg-amber-500 rounded-full inline-block" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Phân tích thị trường mới nhất
            </h2>
          </div>
          <Link
            href="/tin-tuc"
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
          >
            Xem tất cả
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>

        {/* Article card */}
        <Link
          href={`/tin-tuc/${article.slug}`}
          className="group block bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 hover:border-amber-500/60 hover:from-slate-700 hover:to-slate-800 transition-all duration-300"
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="shrink-0 w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <span className="text-lg">📊</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold leading-snug mb-2 group-hover:text-amber-400 transition-colors line-clamp-2">
                {article.title}
              </h3>
              {article.excerpt && (
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>📅 {formatDate(article.created_at)}</span>
                {article.word_count && (
                  <>
                    <span>·</span>
                    <span>⏱ {Math.ceil(article.word_count / 200)} phút đọc</span>
                  </>
                )}
                <span>·</span>
                <span className="text-emerald-400 font-medium">🤖 AI Generated</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="shrink-0 w-8 h-8 rounded-full bg-slate-700 group-hover:bg-amber-500/20 flex items-center justify-center transition-colors mt-1">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
