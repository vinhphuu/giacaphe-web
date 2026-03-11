/**
 * app/gia-ca-phe-[region]/[date]/page.tsx
 *
 * Route: /gia-ca-phe-dak-lak/05-03-2026
 * SSR + ISR: revalidate mỗi giờ
 */

import { notFound, redirect } from "next/navigation";
import Link                   from "next/link";
import type { Metadata }      from "next";
import { createClient }       from "@supabase/supabase-js";

import {
  slugToProvince, getRegionInfo, getNeighborRegions,
  parseDateSlug, formatDateSlug, toDateSlug, REGIONS,
} from "@/lib/region-utils";
import { fetchRegionData, generateRegionContent } from "@/lib/region-writer";

export const revalidate = 3600; // ISR mỗi giờ

// ─────────────────────────────────────────────
// generateStaticParams — chỉ tạo trang khi có data
// ─────────────────────────────────────────────

export async function generateStaticParams() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const sb = createClient(url, key);
  const { data } = await sb
    .from("price_history")
    .select("province, recorded_at")
    .eq("type", "coffee")
    .order("recorded_at", { ascending: false })
    .limit(100);

  const params: { region: string; date: string }[] = [];
  const seen = new Set<string>();

  for (const row of data ?? []) {
    const { province, recorded_at } = row as { province: string; recorded_at: string };
    const slug    = REGIONS.find(r => r.province === province)?.slug;
    const dateSlug = toDateSlug(new Date(recorded_at));
    const key     = `${slug}-${dateSlug}`;

    if (slug && !seen.has(key)) {
      seen.add(key);
      params.push({ region: slug, date: dateSlug });
    }
  }

  return params;
}

// ─────────────────────────────────────────────
// generateMetadata — SEO động
// ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; date: string }>;
}): Promise<Metadata> {
  const { region, date } = await params;
  const province  = slugToProvince(region);
  const dateDisp  = formatDateSlug(date);
  const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://giacaphe-web.vercel.app";
  const canonical = `${baseUrl}/gia-ca-phe-${region}/${date}`;
  const regionInfo = getRegionInfo(region);

  if (!province) {
    return { title: "Không tìm thấy trang" };
  }

  // Lấy giá từ DB để chèn vào title
  const data = await fetchRegionData(province, date);
  const price = data.current?.price ?? 0;
  const priceStr = price > 0 ? ` - ${price.toLocaleString("vi-VN")}đ/kg` : "";

  const title       = `Giá cà phê ${province} hôm nay ${dateDisp}${priceStr}`;
  const description = `Cập nhật giá cà phê ${province} ngày ${dateDisp}. Theo dõi biến động giá thu mua tại ${regionInfo?.highlight?.split(",")[0] ?? province}, tương quan sàn London và dự báo xu hướng.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url:       canonical,
      type:      "article",
      siteName:  "GiaCaPhe",
      locale:    "vi_VN",
      images: regionInfo ? [{ url: regionInfo.ogImage, width: 1200, height: 630, alt: title }] : [],
    },
    robots: { index: true, follow: true },
  };
}

// ─────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────

export default async function RegionPage({
  params,
}: {
  params: Promise<{ region: string; date: string }>;
}) {
  const { region, date } = await params;

  // Validate region slug
  const province   = slugToProvince(region);
  const regionInfo = getRegionInfo(region);
  if (!province || !regionInfo) redirect("/");

  // Validate date slug
  const parsedDate = parseDateSlug(date);
  if (!parsedDate) redirect("/");

  // Fetch dữ liệu
  const data = await fetchRegionData(province, date);

  // Nếu không có dữ liệu → redirect hoặc hiện "đang cập nhật"
  if (!data.current) {
    return <NoDataPage province={province} date={date} regionInfo={regionInfo} neighbors={getNeighborRegions(region)} />;
  }

  // Tạo nội dung AI
  const generated = await generateRegionContent(regionInfo, date, data);

  const dateDisplay = formatDateSlug(date);
  const price       = data.current.price;
  const change      = data.current.change_value;
  const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL ?? "https://giacaphe-web.vercel.app";
  const canonical   = `${baseUrl}/gia-ca-phe-${region}/${date}`;
  const neighbors   = getNeighborRegions(region);

  // JSON-LD NewsArticle + Dataset
  const jsonLd = {
    "@context":       "https://schema.org",
    "@graph": [
      {
        "@type":         "NewsArticle",
        "headline":      `Giá cà phê ${province} ngày ${dateDisplay}: ${price.toLocaleString("vi-VN")}đ/kg`,
        "description":   generated?.excerpt ?? "",
        "url":           canonical,
        "datePublished": parsedDate.toISOString(),
        "dateModified":  data.current.updated_at,
        "author":        { "@type": "Organization", "name": "GiaCaPhe", "url": baseUrl },
        "publisher":     { "@type": "Organization", "name": "GiaCaPhe", "url": baseUrl },
        "image":         regionInfo.ogImage,
        "inLanguage":    "vi",
        "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
      },
      {
        "@type":       "Dataset",
        "name":        `Giá cà phê ${province} ngày ${dateDisplay}`,
        "description": `Dữ liệu giá cà phê tại ${province} ngày ${dateDisplay}`,
        "url":         canonical,
        "distribution": [{
          "@type":           "DataDownload",
          "name":            `${province} - ${dateDisplay}`,
          "contentUrl":      canonical,
          "encodingFormat":  "text/html",
          "description":     `${price.toLocaleString("vi-VN")}đ/kg`,
        }],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Link href="/" className="hover:text-amber-400 transition-colors">Trang chủ</Link>
            <span>/</span>
            <span className="text-slate-400">Giá cà phê {province}</span>
            <span>/</span>
            <span className="text-slate-300">{dateDisplay}</span>
          </nav>

          {/* Price summary card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">{province} · {dateDisplay}</p>
                <p className="text-4xl font-bold text-white tabular-nums">
                  {price.toLocaleString("vi-VN")}
                  <span className="text-lg font-normal text-slate-400 ml-1">đ/kg</span>
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${
                change > 0 ? "bg-emerald-500/15 text-emerald-400"
                : change < 0 ? "bg-rose-500/15 text-rose-400"
                : "bg-slate-700/50 text-slate-400"
              }`}>
                {change > 0 ? "▲" : change < 0 ? "▼" : "—"}
                {" "}
                {change !== 0
                  ? `${Math.abs(change).toLocaleString("vi-VN")}đ`
                  : "Không đổi"
                }
              </div>
            </div>
          </div>

          {/* AI Content */}
          {generated?.content ? (
            <article className="prose prose-invert prose-sm max-w-none
              prose-headings:text-white prose-headings:font-bold
              prose-h1:text-xl prose-h2:text-base prose-h2:text-amber-400
              prose-p:text-slate-300 prose-p:leading-relaxed
              prose-table:text-sm prose-td:py-2 prose-th:py-2
              prose-strong:text-white
              prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
              mb-10">
              <MarkdownRenderer content={generated.content} />
            </article>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 mb-8 text-center">
              <p className="text-slate-400 text-sm">Đang tạo nội dung phân tích...</p>
            </div>
          )}

          {/* Xem các tỉnh lân cận */}
          {neighbors.length > 0 && (
            <section className="border-t border-slate-800 pt-6 mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Xem giá các tỉnh khác
              </h3>
              <div className="flex flex-wrap gap-3">
                {neighbors.map((n) => (
                  <Link
                    key={n.slug}
                    href={`/gia-ca-phe-${n.slug}/${date}`}
                    title={`Giá cà phê ${n.province} ngày ${dateDisplay}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl
                               border border-slate-700 bg-slate-900/60
                               text-sm text-slate-300 hover:border-amber-500/40
                               hover:text-amber-400 transition-all duration-200"
                  >
                    <span>☕</span>
                    <span>{n.province}</span>
                  </Link>
                ))}
                <Link
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl
                             border border-slate-700 bg-slate-900/60
                             text-sm text-slate-300 hover:border-amber-500/40
                             hover:text-amber-400 transition-all duration-200"
                >
                  ← Trang chủ
                </Link>
              </div>
            </section>
          )}

          {/* Tất cả tỉnh — Google Bot crawl */}
          <section className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
              Giá cà phê tất cả tỉnh Tây Nguyên
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REGIONS.map((r) => (
                <Link
                  key={r.slug}
                  href={`/gia-ca-phe-${r.slug}/${date}`}
                  title={`Giá cà phê ${r.province} ngày ${dateDisplay}`}
                  className={`text-xs px-3 py-2 rounded-lg border transition-all
                    ${r.slug === region
                      ? "border-amber-500/60 bg-amber-500/10 text-amber-400 font-medium"
                      : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                    }`}
                >
                  {r.province}
                </Link>
              ))}
            </div>
          </section>

        </div>
      </main>
    </>
  );
}

// ─────────────────────────────────────────────
// NO DATA PAGE
// ─────────────────────────────────────────────

function NoDataPage({
  province, date, regionInfo, neighbors,
}: {
  province:   string;
  date:       string;
  regionInfo: Awaited<ReturnType<typeof getRegionInfo>>;
  neighbors:  Awaited<ReturnType<typeof getNeighborRegions>>;
}) {
  const dateDisplay = formatDateSlug(date);
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">☕</div>
        <h1 className="text-lg font-bold text-white mb-2">
          Giá cà phê {province} · {dateDisplay}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Dữ liệu ngày này đang được cập nhật. Vui lòng quay lại sau.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="px-4 py-2 bg-amber-500 text-slate-900 rounded-xl text-sm font-bold hover:bg-amber-400 transition-colors">
            Về trang chủ
          </Link>
          {neighbors.slice(0, 2).map(n => (
            <Link key={n.slug} href={`/gia-ca-phe-${n.slug}/${date}`}
              className="px-4 py-2 border border-slate-700 rounded-xl text-sm text-slate-300 hover:border-amber-500/40 hover:text-amber-400 transition-colors">
              {n.province}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────
// SIMPLE MARKDOWN RENDERER (không cần react-markdown)
// ─────────────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let key = 0;

  const flushTable = () => {
    if (tableBuffer.length < 2) { tableBuffer = []; return; }
    const rows = tableBuffer.map(r =>
      r.split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)
    ).filter(r => r.some(c => c && !c.match(/^[-:]+$/)));

    if (rows.length === 0) { tableBuffer = []; return; }
    elements.push(
      <div key={key++} className="overflow-x-auto my-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>{rows[0].map((c, i) => (
              <th key={i} className="px-3 py-2 text-left bg-slate-800/80 text-slate-300 font-semibold border border-slate-700">{c}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.slice(1).map((row, ri) => (
              <tr key={ri} className="border-t border-slate-800 hover:bg-slate-800/40">
                {row.map((c, ci) => (
                  <td key={ci} className="px-3 py-2 border border-slate-800/60 text-slate-300"
                    dangerouslySetInnerHTML={{ __html: c.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  for (const line of lines) {
    if (line.startsWith("|")) { tableBuffer.push(line); continue; }
    if (tableBuffer.length) flushTable();

    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-xl font-bold text-white mt-2 mb-4 leading-snug">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-base font-bold text-amber-400 mt-7 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-sm font-bold text-slate-200 mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={key++} className="text-slate-200 font-semibold my-2">{line.slice(2, -2)}</p>);
    } else if (line.trim() === "" || line.trim() === "---") {
      elements.push(<div key={key++} className="my-2" />);
    } else if (line.trim()) {
      const html = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      elements.push(<p key={key++} className="text-slate-300 leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: html }} />);
    }
  }
  if (tableBuffer.length) flushTable();

  return <>{elements}</>;
}
