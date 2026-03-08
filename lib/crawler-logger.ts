/**
 * lib/crawler-logger.ts
 * Helper để ghi log vào bảng crawler_logs sau mỗi lần crawl
 */

import { createClient } from "@supabase/supabase-js";

export type LogStatus = "success" | "failed" | "running";

export interface LogEntry {
  task_name:   string;
  status:      LogStatus;
  message?:    string;
  records?:    number;
  duration_ms?: number;
}

export async function writeLog(entry: LogEntry): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await sb.from("crawler_logs").insert({
    task_name:   entry.task_name,
    status:      entry.status,
    message:     entry.message    ?? null,
    records:     entry.records    ?? 0,
    duration_ms: entry.duration_ms ?? null,
  });
}
