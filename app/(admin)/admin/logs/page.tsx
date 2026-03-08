"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Log = {
  id: string;
  task_name: string;
  status: string;
  message: string;
  records: number | null;
  duration_ms: number | null;
  created_at: string;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    sb.from("crawler_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLogs(data ?? []);
        setLoading(false);
      });
  }, []);

  const badge: Record<string, string> = {
    success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    failed: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    running: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Crawler Logs</h1>
      {loading ? (
        <p className="text-slate-400">Đang tải...</p>
      ) : logs.length === 0 ? (
        <p className="text-slate-400">Chưa có log nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Task</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Trạng thái</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Thông báo</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Records</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Thời gian</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Lúc</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-white font-mono text-xs">{log.task_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge[log.status] ?? "bg-slate-700 text-slate-300"}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{log.message}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{log.records ?? "-"}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "-"}</td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">
                    {new Date(log.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
