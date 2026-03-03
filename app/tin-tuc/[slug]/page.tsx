import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import ArticleContent from "@/components/ArticleContent";

export const revalidate = 3600;

interface Article { id:number; title:string; slug:string; content:string; meta_description:string|null; excerpt:string|null; keywords:string[]|null; word_count:number|null; created_at:string; }

function getSB() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

async function getArticle(slug: string): Promise<Article|null> {
  const {data,error} = await getSB().from("articles").select("*").eq("slug",slug).eq("status","published").single();
  if (error||!data) return null;
  return data as Article;
}

async function getRelated(excludeSlug: string) {
  const {data} = await getSB().from("articles").select("title,slug,created_at").eq("status","published").neq("slug",excludeSlug).order("created_at",{ascending:false}).limit(4);
  return data??[];
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}): Promise<Metadata> {
  const {slug} = await params;
  const a = await getArticle(slug);
  if (!a) return {title:"Không tìm thấy bài viết"};
  const base = process.env.NEXT_PUBLIC_BASE_URL??"https://giacaphe-web.vercel.app";
  return {
    title: a.title, description: a.meta_description??a.excerpt??"", keywords: a.keywords?.join(", "),
    openGraph:{title:a.title,description:a.meta_description??"",url:`${base}/tin-tuc/${slug}`,type:"article",publishedTime:a.created_at},
    alternates:{canonical:`${base}/tin-tuc/${slug}`},
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"});
}

export default async function ArticlePage({params}:{params:Promise<{slug:string}>}) {
  const {slug} = await params;
  const [article, related] = await Promise.all([getArticle(slug), getRelated(slug)]);
  if (!article) notFound();
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-amber-400 transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link href="/tin-tuc" className="hover:text-amber-400 transition-colors">Tin tức</Link>
          <span>/</span>
          <span className="text-slate-400 truncate max-w-xs">{article.title}</span>
        </nav>
        <article>
          <header className="mb-8">
            <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full uppercase tracking-wider">Phân tích thị trường</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-4 mt-4">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400 pb-6 border-b border-slate-800">
              <span>📅 {formatDate(article.created_at)}</span>
              {article.word_count && <><span>·</span><span>{article.word_count.toLocaleString()} từ</span></>}
              <span>·</span>
              <span className="text-emerald-400">🤖 AI Generated</span>
            </div>
            {article.excerpt && <p className="mt-6 text-slate-300 text-lg leading-relaxed border-l-4 border-amber-500 pl-4 italic">{article.excerpt}</p>}
          </header>
          <ArticleContent content={article.content} />
          {article.keywords && article.keywords.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Từ khoá:</p>
              <div className="flex flex-wrap gap-2">
                {article.keywords.map(kw => <span key={kw} className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">#{kw}</span>)}
              </div>
            </div>
          )}
        </article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"Article","headline":article.title,"description":article.meta_description,"datePublished":article.created_at,"publisher":{"@type":"Organization","name":"GiaCaPhe.web"}})}} />
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-white mb-4">Bài viết liên quan</h2>
            <div className="space-y-3">
              {related.map((r:any) => (
                <Link key={r.slug} href={`/tin-tuc/${r.slug}`} className="group flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-amber-500/50 transition-all">
                  <span className="text-sm text-slate-300 group-hover:text-amber-400 transition-colors line-clamp-1">{r.title}</span>
                  <span className="text-xs text-slate-500 shrink-0 ml-3">{new Date(r.created_at).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit"})}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
        <div className="mt-10 flex gap-4">
          <Link href="/tin-tuc" className="text-sm text-slate-500 hover:text-amber-400 transition-colors">← Tất cả bài viết</Link>
          <span className="text-slate-700">·</span>
          <Link href="/" className="text-sm text-slate-500 hover:text-amber-400 transition-colors">Xem bảng giá →</Link>
        </div>
      </div>
    </main>
  );
}
