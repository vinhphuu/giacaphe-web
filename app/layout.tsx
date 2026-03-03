/**
 * app/layout.tsx
 *
 * Root layout với đầy đủ SEO metadata cho Next.js 15.
 * Tailwind CSS v4 — import bằng CSS, không dùng tailwind.config.js
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

// ─────────────────────────────────────────────
// SEO METADATA
// Tài liệu: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// ─────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://giacaphe-web.vercel.app";

export const metadata: Metadata = {
  // ── Cơ bản ──
  title: {
    default:  "Giá Cà Phê Hôm Nay | Cập nhật mới nhất từ Tây Nguyên",
    template: "%s | GiaCaPhe.vn",
  },
  description:
    "Cập nhật giá cà phê nhân xô hôm nay tại Đắk Lắk, Gia Lai, Lâm Đồng, Đắk Nông, Kon Tum. Giá thị trường chính xác, cập nhật mỗi buổi sáng.",
  keywords: [
    "giá cà phê hôm nay",
    "giá cà phê Đắk Lắk",
    "giá cà phê Gia Lai",
    "giá cà phê Lâm Đồng",
    "giá cà phê nhân xô",
    "Robusta",
    "giá nông sản",
  ],
  authors:  [{ name: "GiaCaPhe.vn" }],
  creator:  "GiaCaPhe.vn",

  // ── Canonical URL ──
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
  },

  // ── Open Graph (Facebook, Zalo, ...) ──
  openGraph: {
    type:        "website",
    locale:      "vi_VN",
    url:         BASE_URL,
    siteName:    "GiaCaPhe.vn",
    title:       "Giá Cà Phê Hôm Nay | Tây Nguyên",
    description: "Theo dõi giá cà phê nhân xô cập nhật hàng ngày từ các tỉnh Tây Nguyên.",
    images: [
      {
        url:    "/og-image.png",  // thêm file 1200×630px vào public/
        width:  1200,
        height: 630,
        alt:    "Giá cà phê hôm nay",
      },
    ],
  },

  // ── Twitter / X Card ──
  twitter: {
    card:        "summary_large_image",
    title:       "Giá Cà Phê Hôm Nay",
    description: "Cập nhật giá cà phê mới nhất từ Tây Nguyên",
    images:      ["/og-image.png"],
  },

  // ── Robots ──
  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:               true,
      follow:              true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet":       -1,
    },
  },

  // ── Icons ──
  icons: {
    icon:    "/favicon.ico",
    apple:   "/apple-touch-icon.png",
  },

  // ── Web App manifest ──
  manifest: "/manifest.json",
};

// ─────────────────────────────────────────────
// VIEWPORT — tách riêng theo Next.js 15
// ─────────────────────────────────────────────

export const viewport: Viewport = {
  themeColor:    "#d97706",   // amber-600 — màu thương hiệu
  width:         "device-width",
  initialScale:  1,
  maximumScale:  1,
};

// ─────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data — giúp Google hiểu nội dung */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "WebSite",
              name:       "GiaCaPhe.vn",
              url:        BASE_URL,
              description:"Theo dõi giá cà phê nhân xô cập nhật hàng ngày",
              potentialAction: {
                "@type":       "SearchAction",
                target:        `${BASE_URL}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-950 antialiased`}>
        {children}
      </body>
    </html>
  );
}
