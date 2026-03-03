/**
 * app/api/cron/update-prices/route.ts
 *
 * Route Handler tự động cập nhật giá mỗi buổi sáng.
 *
 * Cách hoạt động:
 *   Vercel Cron → gọi GET /api/cron/update-prices lúc 7:00 sáng (giờ VN)
 *   → Route này cào giá từ nguồn → cập nhật vào Supabase
 *
 * Cài đặt:
 *   1. Thêm CRON_SECRET vào Vercel Environment Variables
 *   2. Tạo file vercel.json (xem cuối file)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// Supabase với SERVICE ROLE KEY (quyền ghi)
// KHÔNG dùng anon key ở đây vì cần UPDATE
// ─────────────────────────────────────────────

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // khác với anon key — thêm vào Vercel env
);

// ─────────────────────────────────────────────
// MOCK SCRAPER — thay bằng logic cào thật
// ─────────────────────────────────────────────

interface ScrapedPrice {
  region:       string;
  price:        number;
  change_value: number;
  type:         "coffee" | "pepper";
}

/**
 * Hàm này bạn tự viết logic cào từ nguồn thực tế.
 * Ví dụ nguồn: giacaphe.com, vietnambiz.vn, agro.gov.vn
 *
 * Cách cào đơn giản với fetch + regex:
 *   const html = await fetch("https://nguon.com/gia-ca-phe").then(r => r.text())
 *   const price = Number(html.match(/Đắk Lắk.*?(\d{2,3}[.,]\d{3})/)?.[1].replace(/\D/g,""))
 */
async function scrapePrices(): Promise<ScrapedPrice[]> {
  // TODO: thay bằng logic cào thực tế
  // Hiện tại trả về mock data để Cron không báo lỗi
  return [
    { region: "Đắk Lắk",   price: 96000, change_value: 0,    type: "coffee" },
    { region: "Gia Lai",    price: 96000, change_value: 0,    type: "coffee" },
    { region: "Lâm Đồng",  price: 95300, change_value: -200, type: "coffee" },
    { region: "Đắk Nông",  price: 96000, change_value: 0,    type: "coffee" },
    { region: "Kon Tum",   price: 95800, change_value: 0,    type: "coffee" },
    { region: "Bình Phước",price: 95500, change_value: 0,    type: "coffee" },
  ];
}

// ─────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Xác thực — chỉ Vercel Cron hoặc bạn mới được gọi
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prices = await scrapePrices();

    // Lưu vào price_history trước (giữ lịch sử cho biểu đồ)
    const historyRows = prices.map((p) => ({
      region:      p.region,
      price:       p.price,
      type:        p.type,
      recorded_at: new Date().toISOString(),
    }));

    await supabaseAdmin.from("price_history").insert(historyRows);

    // Cập nhật bảng prices (giá hiện tại)
    for (const p of prices) {
      await supabaseAdmin
        .from("prices")
        .update({
          price:        p.price,
          change_value: p.change_value,
          updated_at:   new Date().toISOString(),
        })
        .eq("region", p.region)
        .eq("type",   p.type);
    }

    return NextResponse.json({
      success:   true,
      updated:   prices.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[cron/update-prices]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/*
──────────────────────────────────────────────────
  vercel.json — đặt ở thư mục gốc project
  Cấu hình chạy cron lúc 7:00 sáng giờ VN (0:00 UTC)
──────────────────────────────────────────────────

{
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "0 0 * * *"
    }
  ]
}

──────────────────────────────────────────────────
  Biến môi trường cần thêm vào Vercel:
  - CRON_SECRET         = chuỗi bí mật bất kỳ, VD: "abc123xyz"
  - SUPABASE_SERVICE_ROLE_KEY = lấy từ Supabase → Settings → API → service_role
──────────────────────────────────────────────────
*/
