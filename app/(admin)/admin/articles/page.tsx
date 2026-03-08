/**
 * app/(admin)/admin/articles/page.tsx
 * Quản lý bài viết — xem, sửa tiêu đề/slug, xóa
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link                                  from "next/link";
import { createClient }                      from "@supabase/supabase-js";

interface Article {
  id:         number;
  title:      string;
  slug:       string;
  status:     string;
  word_count: number | null;
  created_at: string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function formatDateVN(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day:"2-digit", month:"2-digit", year:"numeric",
    hour:"2-digit", minute:"2-digit",
    timeZone:"Asia/Ho_Chi_Minh",
  });
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<number | null>(null);
  const [editData, setEditData] = useState({ title: "", slug: "" });
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchArticles = useCallback(async () => {
    const sb = getSupabase();
    const { data } = await sb
      .from("articles")
      .select("id, title, slug, status, word_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setArticles((data ?? []) as Article[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  async function saveEdit(id: number) {
    setSaving(true);
    const sb = getSupabase();
    const { error } = await sb.from("articles")
      .update({ title: editData.title, slug: editData.slug })
      .eq("id", id);
    if (error) { showToast(`❌ ${error.message}`, false); }
    else { showToast("✅ Đã lưu thay đổi", true); setEditing(null); fetchArticles(); }
    setSaving(false);
  }

  async function deleteArticle(id: number, title: string) {
    if (!confirm(`Xóa bài: "${title}"?`)) return;
    const sb = getSupabase();
    const { error } = await sb.from("articles").delete().eq("id", id);
    if (error) { showToast(`❌ ${error.message}`, false); }
    else { showToast("✅ Đã xóa bài viết", true); fetchArticles(); }
  }

  async function toggleStatus(id: number, current: string) {
    const newStatus = current === "published" ? "draft" : "published";
    const sb = getSupabase();
    await sb.from("articles").update({ status: newStatus }).eq("id", id);
    fetchArticles();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border
                        ${toast.ok ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                   : "bg-rose-500/15    border-rose-500/40    text-rose-300"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Quản lý bài viết</h1>
          <p className="text-slate-500 text-sm mt-0.5">{articles.length} bài viết</p>
        </div>
        <Link href="/tin-tuc" target="_blank"
          className="px-4 py-2 border border-slate-700 rounded-xl text-sm text-slate-400
                     hover:border-slate-600 hover:text-slate-300 transition-colors">
          🌐 Xem trang tin tức
        </Link>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/80">
                <th className="px-4 py-3 text-left">Tiêu đề / Slug</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-right">Số chữ</th>
                <th className="px-4 py-3 text-left">Ngày tạo</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_,i) => (
                  <tr key={i} className="border-t border-slate-800/50 animate-pulse">
                    {[...Array(5)].map((_,j) => <td key={j} className="px-4 py-4"><div className="h-3 bg-slate-700/60 rounded"/></td>)}
                  </tr>
                ))
              ) : articles.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-600 text-xs">Chưa có bài viết nào</td></tr>
              ) : articles.map((article) => (
                <tr key={article.id} className="border-t border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    {editing === article.id ? (
                      <div className="space-y-2">
                        <input value={editData.title} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white
                                     focus:outline-none focus:border-amber-500/60"
                          placeholder="Tiêu đề"/>
                        <input value={editData.slug} onChange={e => setEditData(p => ({ ...p, slug: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-400 font-mono
                                     focus:outline-none focus:border-amber-500/60"
                          placeholder="slug"/>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-200 font-medium text-xs leading-snug line-clamp-2">{article.title}</p>
                        <p className="text-slate-600 text-[11px] font-mono mt-0.5 truncate">{article.slug}</p>
                      </>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(article.id, article.status)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer transition-colors
                        ${article.status === "published"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-slate-700/50   text-slate-500   border-slate-700     hover:bg-slate-700"}`}>
                      {article.status === "published" ? "✓ Đã đăng" : "◯ Nháp"}
                    </button>
                  </td>

                  <td className="px-4 py-3 text-right text-slate-500 text-xs">
                    {article.word_count?.toLocaleString("vi-VN") ?? "—"}
                  </td>

                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {formatDateVN(article.created_at)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {editing === article.id ? (
                        <>
                          <button onClick={() => saveEdit(article.id)} disabled={saving}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs
                                       hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                            {saving ? "..." : "Lưu"}
                          </button>
                          <button onClick={() => setEditing(null)}
                            className="px-3 py-1.5 bg-slate-700/50 text-slate-400 rounded-lg text-xs hover:bg-slate-700 transition-colors">
                            Hủy
                          </button>
                        </>
                      ) : (
                        <>
                          <Link href={`/tin-tuc/${article.slug}`} target="_blank"
                            className="px-2.5 py-1.5 bg-sky-500/15 text-sky-400 rounded-lg text-xs hover:bg-sky-500/25 transition-colors">
                            👁
                          </Link>
                          <button onClick={() => { setEditing(article.id); setEditData({ title: article.title, slug: article.slug }); }}
                            className="px-2.5 py-1.5 bg-amber-500/15 text-amber-400 rounded-lg text-xs hover:bg-amber-500/25 transition-colors">
                            ✏️
                          </button>
                          <button onClick={() => deleteArticle(article.id, article.title)}
                            className="px-2.5 py-1.5 bg-rose-500/15 text-rose-400 rounded-lg text-xs hover:bg-rose-500/25 transition-colors">
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
