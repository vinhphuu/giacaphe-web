/**
 * app/(admin)/admin/page.tsx
 * Dashboard chính — Stats + Crawler Logs + Nút Crawl Manual
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface CrawlerLog {
  id:          number;
  task_name:   string;
  status:      "success" | "failed" | "running";
  message:     string | null;
  records:     number;
  duration_ms: number | null;
  created_at:  string;
}

interface Stats {
  totalArticles: number;
  lastPriceUpdate: string | null;
  errorRate24h: number;
  successCount24h: number;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    failed:  "bg-rose-500/15    text-rose-400    border-rose-500/30",
    running: "bg-amber-500/15   text-amber-400   border-amber-500/30",
  } as Record<string, string>;
  const icons: Record<string, string> = { success: "✓", failed: "✗", running: "⟳" };
  const labels: Record<string, string> = { success: "Thành công", failed: "Lỗi", running: "Đang chạy" };

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold
                     px-2 py-0.5 rounded-full border ${map[status] ?? map.running}`}>
      <span className={status === "running" ? "animate-spin inline-block" : ""}>
        {icons[status] ?? "?"}
      </span>
      {labels[status] ?? status}
    </span>
  );
}

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimeVN(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────

export default function AdminDashboard() {
  const [logs,      setLogs]      = useState<CrawlerLog[]>([]);
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [crawling,  setCrawling]  = useState<string | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    const sb = getSupabase();

    const [logsRes, articlesRes, pricesRes] = await Promise.all([
      sb.from("crawler_logs").select("*").order("created_at", { ascending: false }).limit(50),
      sb.from("articles").select("id", { count: "exact" }).eq("status", "published"),
      sb.from("prices").select("updated_at").eq("type", "coffee").order("updated_at", { ascending: false }).limit(1),
    ]);

    const allLogs = (logsRes.data ?? []) as CrawlerLog[];
    setLogs(allLogs);

    // Tính tỉ lệ lỗi 24h
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const logs24h = allLogs.filter(l => l.created_at >= since);
    const failed24h  = logs24h.filter(l => l.status === "failed").length;
    const errorRate  = logs24h.length > 0 ? Math.round((failed24h / logs24h.length) * 100) : 0;

    setStats({
      totalArticles:   articlesRes.count ?? 0,
      lastPriceUpdate: pricesRes.data?.[0]?.updated_at ?? null,
      errorRate24h:    errorRate,
      successCount24h: logs24h.filter(l => l.status === "success").length,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000); // auto-refresh 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Manual crawl ──
  async function triggerCrawl(type: "prices" | "article-sang" | "article-trua") {
    setCrawling(type);
    const cronSecret = prompt("Nhập CRON_SECRET:");
    if (!cronSecret) { setCrawling(null); return; }

    try {
      const url = type === "prices"
        ? "/api/cron/update-prices"
        : type === "article-sang"
        ? "/api/cron/write-article?session=sang"
        : "/api/cron/write-article?session=trua";

      const res  = await fetch(url, { headers: { Authorization: `Bearer ${cronSecret}` } });
      const json = await res.json();

      if (res.ok && json.success) {
        showToast(`✅ Thành công! ${json.domestic?.upserted ?? json.article?.word_count ?? ""} records`, true);
      } else {
        showToast(`❌ Lỗi: ${json.error ?? "Unknown"}`, false);
      }
      fetchData();
    } catch (e) {
      showToast(`❌ Network error`, false);
    } finally {
      setCrawling(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl
                        border transition-all ${toast.ok
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : "bg-rose-500/15    border-rose-500/40    text-rose-300"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Tự động refresh mỗi 30 giây</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => triggerCrawl("prices")} disabled={!!crawling}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500/15 border border-sky-500/30
                       text-sky-400 rounded-xl text-sm font-medium hover:bg-sky-500/25
                       disabled:opacity-50 transition-colors">
            {crawling === "prices" ? "⟳ Đang chạy..." : "🔍 Crawl Giá"}
          </button>
          <button onClick={() => triggerCrawl("article-sang")} disabled={!!crawling}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 border border-amber-500/30
                       text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-500/25
                       disabled:opacity-50 transition-colors">
            {crawling === "article-sang" ? "⟳ Đang viết..." : "🤖 Viết bài Sáng"}
          </button>
          <button onClick={() => triggerCrawl("article-trua")} disabled={!!crawling}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 border border-amber-500/30
                       text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-500/25
                       disabled:opacity-50 transition-colors">
            {crawling === "article-trua" ? "⟳ Đang viết..." : "🤖 Viết bài Trưa"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse">
              <div className="h-3 w-24 bg-slate-700 rounded mb-3"/>
              <div className="h-8 w-16 bg-slate-700 rounded"/>
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Tổng bài viết AI",       value: stats.totalArticles,          unit: "bài",    color: "text-amber-400"  },
            { label: "Cập nhật thành công 24h", value: stats.successCount24h,        unit: "lần",    color: "text-emerald-400"},
            { label: "Tỉ lệ lỗi 24h",          value: `${stats.errorRate24h}%`,     unit: "",       color: stats.errorRate24h > 20 ? "text-rose-400" : "text-slate-300" },
            { label: "Cập nhật giá lần cuối",  value: stats.lastPriceUpdate ? formatTimeVN(stats.lastPriceUpdate) : "—", unit: "", color: "text-sky-400", small: true },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-2">{s.label}</p>
              <p className={`font-bold ${s.small ? "text-sm" : "text-3xl"} ${s.color}`}>
                {String(s.value)}
                {s.unit && <span className="text-sm font-normal text-slate-500 ml-1">{s.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Crawler Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Nhật ký Crawler (50 gần nhất)</h2>
          <button onClick={fetchData} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            🔄 Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Task</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-right">Records</th>
                <th className="px-4 py-3 text-right">Thời gian chạy</th>
                <th className="px-4 py-3 text-left">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_,i) => (
                  <tr key={i} className="border-t border-slate-800/50 animate-pulse">
                    {[...Array(6)].map((_,j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-700/60 rounded w-full"/></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">Chưa có nhật ký nào</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatTimeVN(log.created_at)}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs font-medium">{log.task_name}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status}/></td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">{log.records > 0 ? log.records : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-500 text-xs">{formatDuration(log.duration_ms)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{log.message ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
