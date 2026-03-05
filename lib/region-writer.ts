/**
 * lib/region-writer.ts
 * Tạo nội dung 1000-1500 chữ cho trang /gia-ca-phe-[region]/[date]
 * Dựa hoàn toàn trên số liệu thực từ DB — không "chém gió"
 */

import { createClient }        from "@supabase/supabase-js";
import { RegionInfo, formatDateSlug } from "./region-utils";

export interface RegionPriceData {
  province:     string;
  price:        number;
  change_value: number;
  updated_at:   string;
}

export interface RegionPageData {
  current:  RegionPriceData | null;
  history:  { date: string; price: number }[];
  london:   { contract: string; price: number; change_pt: number } | null;
}

// ─────────────────────────────────────────────
// FETCH DỮ LIỆU TỪ SUPABASE
// ─────────────────────────────────────────────

export async function fetchRegionData(
  province: string,
  dateSlug: string   // "05-03-2026"
): Promise<RegionPageData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { current: null, history: [], london: null };

  const sb = createClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, next: { revalidate: 3600 } } as RequestInit),
    },
  });

  // Giá hiện tại của tỉnh
  const { data: priceRow } = await sb
    .from("prices")
    .select("province, price, change_value, updated_at")
    .eq("type", "coffee")
    .eq("province", province)
    .single();

  // Lịch sử 7 ngày
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data: histRows } = await sb
    .from("price_history")
    .select("price, recorded_at")
    .eq("type", "coffee")
    .eq("province", province)
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true });

  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const history = (histRows ?? []).map((r: { price: number; recorded_at: string }) => ({
    date:  weekdays[new Date(r.recorded_at).getDay()],
    price: r.price,
  }));

  // Giá London kỳ hạn gần nhất
  const { data: londonRow } = await sb
    .from("world_coffee_prices")
    .select("contract, price, change_pt")
    .eq("exchange", "London")
    .order("contract")
    .limit(1)
    .single();

  return {
    current:  priceRow as RegionPriceData | null,
    history,
    london:   londonRow as { contract: string; price: number; change_pt: number } | null,
  };
}

// ─────────────────────────────────────────────
// BUILD PROMPT
// ─────────────────────────────────────────────

function buildRegionPrompt(
  region:   RegionInfo,
  dateSlug: string,
  data:     RegionPageData
): string {
  const dateDisplay = formatDateSlug(dateSlug); // "05/03/2026"
  const price       = data.current?.price ?? 0;
  const change      = data.current?.change_value ?? 0;
  const priceStr    = price.toLocaleString("vi-VN");
  const changeStr   = change > 0 ? `tăng ${change.toLocaleString("vi-VN")}đ` : change < 0 ? `giảm ${Math.abs(change).toLocaleString("vi-VN")}đ` : "không đổi";

  const historyLines = data.history.length > 0
    ? data.history.map(h => `${h.date}: ${h.price.toLocaleString("vi-VN")}đ`).join(", ")
    : "Chưa có dữ liệu lịch sử";

  const londonInfo = data.london
    ? `London ${data.london.contract}: ${data.london.price.toLocaleString("en-US")} USD/tấn (${data.london.change_pt > 0 ? "+" : ""}${data.london.change_pt} điểm)`
    : "Chưa có dữ liệu sàn London";

  return `Bạn là chuyên gia thị trường cà phê Việt Nam 15 năm kinh nghiệm. Viết bài phân tích chuyên sâu về giá cà phê tại ${region.province} ngày ${dateDisplay} bằng tiếng Việt CÓ DẤU đầy đủ.

SỐ LIỆU THỰC TẾ (KHÔNG ĐƯỢC THÊM BỚT):
- Giá tại ${region.province}: ${priceStr}đ/kg (${changeStr} so với hôm qua)
- Lịch sử 7 ngày: ${historyLines}
- Thị trường thế giới: ${londonInfo}
- Đặc điểm vùng: ${region.highlight}

CẤU TRÚC BÀI VIẾT BẮT BUỘC (1000-1500 chữ, Markdown):

# Giá cà phê ${region.province} ngày ${dateDisplay}: Cập nhật mới nhất

[Đoạn mở đầu 80-100 chữ: tóm tắt biến động giá, con số thực tế ${priceStr}đ/kg, ${changeStr}]

## Bảng giá cà phê ${region.province} ngày ${dateDisplay}

| Tiêu chí | Dữ liệu |
|---|---|
| Giá thu mua | **${priceStr}đ/kg** |
| Thay đổi | ${changeStr} |
| Khu vực | ${region.highlight.split(",")[0]} |
| Thời gian cập nhật | ${dateDisplay} |

## Diễn biến giá 7 ngày qua tại ${region.province}

[Phân tích 150-200 chữ về xu hướng 7 ngày, dựa trên số liệu lịch sử: ${historyLines}. Nhận xét tốc độ tăng/giảm, mức hỗ trợ và kháng cự.]

## Tình hình thu mua tại các đại lý lớn ở ${region.province}

[Phân tích 200-250 chữ về: tâm lý người bán/mua tại ${region.highlight}. Mô tả hoạt động tại các điểm thu mua trọng điểm. Dựa trên biến động giá ${changeStr} để nhận định tâm lý thị trường.]

## Ảnh hưởng của sàn London đến giá tại ${region.province}

[Phân tích 200-250 chữ về: ${londonInfo} ảnh hưởng như thế nào đến giá trừ lùi tại kho ${region.province}. Tương quan giá nội địa và quốc tế. Tỷ giá USD/VND và tác động.]

## Dự báo xu hướng ngắn hạn cho bà con nông dân ${region.province}

[Phân tích 150-200 chữ với 2 kịch bản: tăng và giảm. Các yếu tố cần theo dõi trong tuần tới. Lời khuyên cụ thể.]

## Kết luận: Nên bán ra hay lưu kho?

[80-100 chữ: lời khuyên thực tế dựa trên số liệu, không chủ quan. Kết thúc bằng: "Theo dõi caphehomnay.com để cập nhật giá cà phê ${region.province} mỗi ngày."]

QUY TẮC QUAN TRỌNG:
- Chỉ dùng số liệu đã cho, KHÔNG bịa thêm con số
- Tiếng Việt đầy đủ dấu, văn phong chuyên gia tài chính
- Không dùng từ "chém gió", "ảo", hoặc số liệu không có cơ sở
- Bài phải đạt 1000-1500 chữ

Trả về JSON thuần túy (KHÔNG backtick):
{"content":"[toàn bộ markdown]","excerpt":"[tóm tắt 80-100 chữ tiếng Việt có dấu]"}`;
}

// ─────────────────────────────────────────────
// GROQ API CALL
// ─────────────────────────────────────────────

export async function generateRegionContent(
  region:   RegionInfo,
  dateSlug: string,
  data:     RegionPageData
): Promise<{ content: string; excerpt: string } | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !data.current) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:       "llama-3.3-70b-versatile",
        messages: [
          {
            role:    "system",
            content: "Bạn là chuyên gia thị trường cà phê Việt Nam. Chỉ trả về JSON thuần túy không có backtick. Luôn viết tiếng Việt đầy đủ dấu.",
          },
          { role: "user", content: buildRegionPrompt(region, dateSlug, data) },
        ],
        temperature:     0.65,
        max_tokens:      4000,
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    if (!parsed.content) return null;
    return { content: parsed.content, excerpt: parsed.excerpt ?? "" };
  } catch {
    return null;
  }
}
