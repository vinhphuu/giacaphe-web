import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 0;
export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getArticle(slug: string) {
  try {
    const { data, error } = await getSupabase()
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    if (error) { console.error("[getArticle]", slug, error.message); return null; }
    return data;
  } catch (e) {
    console.error("[getArticle] exception:", e);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Bài viết không tìm thấy | GiaCaPhe.vn" };
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://giacaphe-web.vercel.app";
  return {
    title: article.title,
    description: article.meta_description ?? "",
    alternates: { canonical: `${base}/tin-tuc/${slug}` },
    openGraph: { title: article.title, description: article.meta_description ?? "", url: `${base}/tin-tuc/${slug}`, type: "article", siteName: "GiaCaPhe.vn", locale: "vi_VN" },
  };
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let key = 0;
  const flushTable = () => {
    if (tableBuffer.length < 2) { tableBuffer = []; return; }
    const rows = tableBuffer.map((r) => r.split("|").map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)).filter((r) => r.some((c) => c && !c.match(/^[-:]+$/)));
    if (!rows.length) { tableBuffer = []; return; }
    elements.push(<div key={key++} className="overflow-x-auto my-5"><table className="w-full border-collapse text-sm"><thead><tr>{rows[0].map((c, i) => <th key={i} className="px-3 py-2 text-left bg-slate-800 text-slate-300 font-semibold border border-slate-700">{c}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, ri) => (<tr key={ri} className="border-t border-slate-800 hover:bg-slate-800/40">{row.map((c, ci) => (<td key={ci} className="px-3 py-2 border border-slate-800/60 text-slate-300" dangerouslySetInnerHTML={{ __html: c.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />))}</tr>))}</tbody></table></div>);
    tableBuffer = [];
  };
  for (const line of lines) {
    if (line.startsWith("|")) { tableBuffer.push(line); continue; }
    if (tableBuffer.length) flushTable();
    if (line.startsWith("# ")) elements.push(<h1 key={key++} className="text-2xl font-bold text-white mt-2 mb-5 leading-snug">{line.slice(2)}</h1>);
    else if (line.startsWith("## ")) elements.push(<h2 key={key++} className="text-lg font-bold text-amber-400 mt-8 mb-3">{line.slice(3)}</h2>);
    else if (line.startsWith("### ")) elements.push(<h3 key={key++} className="text-base font-bold text-slate-200 mt-5 mb-2">{line.slice(4)}</h3>);
    else if (line.trim() === "" || line.trim() === "---") elements.push(<div key={key++} className="my-3" />);
    else if (line.trim()) {
      const html = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-400 hover:underline">$1</a>');
      elements.push(<p key={key++} className="text-slate-300 leading-relaxed my-3" dangerouslySetInnerHTML={{ __html: html }} />);
    }
  }
  if (tableBuffer.length) flushTable();
  return <>{elements}</>;
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  // Dùng redirect thay vì notFound() để tránh lỗi Next.js 15
  if (!article) redirect("/tin-tuc");

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://giacaphe-web.vercel.app";
  const dateDisplay = new Date(article.created_at).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  const jsonLd = { "@context": "https://schema.org", "@type": "NewsArticle", headline: article.title, description: article.meta_description ?? "", datePublished: article.created_at, dateModified: article.updated_at ?? article.created_at, url: `${base}/tin-tuc/${slug}`, author: { "@type": "Organization", name: "GiaCaPhe.vn", url: base }, publisher: { "@type": "Organization", name: "GiaCaPhe.vn", url: base }, inLanguage: "vi" };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Link href="/" className="hover:text-amber-400 transition-colors">Trang chủ</Link>
            <span>/</span>
            <Link href="/tin-tuc" className="hover:text-amber-400 transition-colors">Tin tức</Link>
            <span>/</span>
            <span className="text-slate-400 truncate max-w-xs">{article.title}</span>
          </nav>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full uppercase tracking-wider">AI Generated</span>
            <span className="text-slate-500 text-xs">{dateDisplay}</span>
            {article.word_count && <span className="text-slate-500 text-xs">· {Math.ceil(article.word_count / 200)} phút đọc</span>}
          </div>
          <article className="mb-12">
            <MarkdownRenderer content={article.content} />
          </article>
          {article.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8 pt-6 border-t border-slate-800">
              {article.keywords.map((k: string) => (<span key={k} className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-400">#{k}</span>))}
            </div>
          )}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
            <Link href="/tin-tuc" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">← Tất cả bài viết</Link>
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">Trang chủ</Link>
          </div>
        </div>
      </main>
    </>
  );
}
