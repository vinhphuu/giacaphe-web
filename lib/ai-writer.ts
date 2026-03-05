import { createClient } from "@supabase/supabase-js";

export interface PriceData { province:string; price:number; change_value:number; region:string; }
export interface HistoryPoint { date:string; price:number; }
export interface GeneratedArticle { title:string; slug:string; content:string; meta_description:string; excerpt:string; keywords:string[]; word_count:number; }
export interface WriteResult { success:boolean; article:GeneratedArticle|null; error:string|null; }
export interface SaveResult { success:boolean; article_id:number|null; slug:string|null; error:string|null; }

// ── Pool ảnh cà phê miễn phí từ Unsplash (không cần API key) ──
const COFFEE_IMAGES = [
  { url:"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80", alt:"Cà phê Tây Nguyên Việt Nam" },
  { url:"https://images.unsplash.com/photo-1504627298434-2922d734408c?w=800&q=80", alt:"Hạt cà phê Robusta" },
  { url:"https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=800&q=80", alt:"Nông dân thu hoạch cà phê" },
  { url:"https://images.unsplash.com/photo-1495774856032-8b90bbb32b32?w=800&q=80", alt:"Đồi cà phê Đắk Lắk" },
  { url:"https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?w=800&q=80", alt:"Rang xay cà phê" },
  { url:"https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800&q=80", alt:"Thị trường cà phê thế giới" },
  { url:"https://images.unsplash.com/photo-1459755486867-b55449bb39ff?w=800&q=80", alt:"Xuất khẩu cà phê Việt Nam" },
  { url:"https://images.unsplash.com/photo-1516743619420-154b70a65fea?w=800&q=80", alt:"Vườn cà phê mùa chín" },
];

function pickImages(count: number) {
  const shuffled = [...COFFEE_IMAGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function formatVND(n:number){return n.toLocaleString("vi-VN");}
function getTodayVN(){return new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"});}

function getSlugBySession(session: string) {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  const prefix = session === "trua" ? "phan-tich-gia-ca-phe-buoi-trua" : "gia-ca-phe-hom-nay";
  return `${prefix}-${dd}-${mm}-${yyyy}`;
}

function buildPriceTable(prices:PriceData[]){
  const rows=prices.filter(p=>p.price>0).map(p=>{
    const c=p.change_value>0?`▲ +${formatVND(p.change_value)}`:p.change_value<0?`▼ ${formatVND(p.change_value)}`:`— Không đổi`;
    return `| ${p.province} | **${formatVND(p.price)}đ** | ${c} |`;
  }).join("\n");
  return `| Tỉnh/Khu vực | Giá (đ/kg) | Biến động |\n|---|---|---|\n${rows}`;
}

function buildHistoryTable(history:HistoryPoint[]){
  return `| Ngày | Giá (đ/kg) |\n|---|---|\n${history.map(h=>`| ${h.date} | **${formatVND(h.price)}đ** |`).join("\n")}`;
}

function buildPrompt(prices:PriceData[], history:HistoryPoint[], session: string, images: typeof COFFEE_IMAGES) {
  const today = getTodayVN();
  const avg = Math.round(prices.reduce((s,p)=>s+p.price,0)/prices.length);
  const max = Math.max(...prices.map(p=>p.price));
  const min = Math.min(...prices.map(p=>p.price));
  const isMorning = session !== "trua";

  const imgMd = images.map((img, i) =>
    `![${img.alt}](${img.url})\n*Hình ${i+1}: ${img.alt}*`
  );

  const titleGuide = isMorning
    ? `Giá cà phê hôm nay ${today}: [điểm nổi bật nhất về giá]`
    : `Cập nhật giá cà phê buổi trưa ${today}: [nhận định thị trường]`;

  return `Bạn là chuyên gia phân tích thị trường nông sản Việt Nam 15 năm kinh nghiệm. Viết bài phân tích thị trường cà phê CHUYÊN SÂU bằng tiếng Việt.

DỮ LIỆU THỰC TẾ:
Ngày: ${today} | Phiên: ${isMorning ? "Buổi sáng" : "Buổi trưa"}
${buildPriceTable(prices)}
Cao nhất: ${formatVND(max)}đ | Thấp nhất: ${formatVND(min)}đ | Trung bình: ${formatVND(avg)}đ

Lịch sử 7 ngày (Đắk Lắk - thị trường đại diện):
${buildHistoryTable(history)}

ẢNH CHO BÀI VIẾT (chèn đúng vị trí theo hướng dẫn):
Ảnh 1 (chèn sau phần tổng quan): ${imgMd[0]}
Ảnh 2 (chèn sau phần phân tích khu vực): ${imgMd[1]}
Ảnh 3 (chèn trước phần dự báo): ${imgMd[2] ?? imgMd[0]}

VIẾT BÀI 1500-2000 TỪ theo cấu trúc Markdown bắt buộc:

## ${titleGuide}
[Sapo 2-3 câu tóm tắt điểm nổi bật nhất, con số ấn tượng]

## 1. Tổng quan thị trường ${isMorning ? "buổi sáng" : "phiên trưa"}
[Phân tích tổng thể 200-250 từ. Mở đầu bằng con số giá trung bình, so sánh với hôm qua]
[CHÈN BẢNG GIÁ NỘI ĐỊA VÀO ĐÂY]
[CHÈN ẢNH 1 VÀO ĐÂY]

## 2. Diễn biến giá 7 ngày: Xu hướng nào đang hình thành?
[Phân tích xu hướng 200-250 từ. Nhận xét tốc độ tăng/giảm, resistance/support levels]
[CHÈN BẢNG LỊCH SỬ 7 NGÀY VÀO ĐÂY]

## 3. Phân tích chi tiết từng tỉnh Tây Nguyên
### Đắk Lắk — Thủ phủ cà phê Việt Nam
[150 từ về diễn biến giá Đắk Lắk]
### Gia Lai, Đắk Nông, Lâm Đồng, Kon Tum
[150 từ so sánh chênh lệch giữa các tỉnh, lý giải nguyên nhân]
[CHÈN ẢNH 2 VÀO ĐÂY]

## 4. Tương quan giá nội địa và thị trường thế giới
[250 từ: Phân tích ảnh hưởng sàn London (Robusta ICE), tỷ giá USD/VND, nhu cầu xuất khẩu từ EU, Mỹ, Nhật]

## 5. Các yếu tố vĩ mô tác động ${isMorning ? "tuần này" : "trong ngày"}
[200 từ: thời tiết Tây Nguyên, mùa vụ, tồn kho, logistics, chính sách xuất khẩu]
[CHÈN ẢNH 3 VÀO ĐÂY]

## 6. Dự báo ngắn hạn và khuyến nghị
**Kịch bản 1 — Tăng:** [điều kiện + mức giá mục tiêu]
**Kịch bản 2 — Đi ngang:** [điều kiện + biên độ dao động]
**Kịch bản 3 — Giảm:** [điều kiện + mức hỗ trợ]
**Khuyến nghị cho người trồng:** [lời khuyên cụ thể]

---
*Theo dõi giacaphe.com để cập nhật giá cà phê mới nhất mỗi ngày. Dữ liệu được thu thập và phân tích tự động.*

TIÊU CHUẨN CHẤT LƯỢNG:
- Tổng bài 1500-2000 từ (đếm kỹ, không được ít hơn 1500)
- Từ khoá bắt buộc xuất hiện tự nhiên: "giá cà phê hôm nay", "xuất khẩu cà phê", "nguồn cung Tây Nguyên", "sàn London", "tỷ giá USD"
- Dùng thuật ngữ chuyên nghiệp: resistance level, support, tâm lý thị trường, áp lực bán/mua
- Chèn đúng 2 bảng số liệu và 3 ảnh vào đúng vị trí đã chỉ định
- KHÔNG bịa số liệu — chỉ dùng số liệu đã cho

Trả về JSON thuần túy (KHÔNG backtick, KHÔNG text bên ngoài):
{"title":"...","meta_description":"[150-160 ký tự chứa từ khoá chính]","excerpt":"[sapo 100-120 chữ hấp dẫn]","content":"[toàn bộ markdown 1500-2000 từ]","keywords":["giá cà phê hôm nay","xuất khẩu cà phê","nguồn cung Tây Nguyên","sàn London Robusta","tỷ giá USD VND","giá cà phê Đắk Lắk"]}`;
}

async function callGroqAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Thiếu GROQ_API_KEY");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role:"system", content:"Bạn là chuyên gia phân tích thị trường nông sản Việt Nam. Chỉ trả về JSON thuần túy. Tuyệt đối không có backtick hay text bên ngoài JSON. Bài viết phải đủ 1500-2000 từ." },
        { role:"user", content:prompt }
      ],
      temperature: 0.75,
      max_tokens: 6000,
      response_format: { type:"json_object" },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Groq HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq không trả về content");
  return text;
}

export async function generateMarketArticle(
  prices: PriceData[],
  history: HistoryPoint[],
  session: string = "sang"
): Promise<WriteResult> {
  if (prices.length === 0) return { success:false, article:null, error:"Không có dữ liệu giá" };

  const images = pickImages(3);
  let rawJson: string;
  try {
    rawJson = await callGroqAPI(buildPrompt(prices, history, session, images));
  } catch(err) {
    return { success:false, article:null, error:`Groq API lỗi: ${err instanceof Error ? err.message : "Unknown"}` };
  }

  let parsed: { title:string; meta_description:string; excerpt:string; content:string; keywords:string[] };
  try {
    const clean = rawJson.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
    parsed = JSON.parse(clean);
  } catch {
    return { success:false, article:null, error:`Không parse được JSON: ${rawJson.substring(0,300)}` };
  }

  if (!parsed.title || !parsed.content) return { success:false, article:null, error:"Thiếu title/content" };

  return {
    success: true, error: null,
    article: {
      title:            parsed.title.replace(/^#+\s*/,"").trim(),
      slug:             getSlugBySession(session),
      content:          parsed.content,
      meta_description: (parsed.meta_description ?? "").substring(0, 160),
      excerpt:          parsed.excerpt ?? parsed.content.substring(0, 300),
      keywords:         parsed.keywords ?? ["giá cà phê hôm nay"],
      word_count:       parsed.content.split(/\s+/).length,
    },
  };
}

export async function saveArticle(article: GeneratedArticle, priceSnapshot: PriceData[]): Promise<SaveResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success:false, article_id:null, slug:null, error:"Thiếu Supabase env" };

  const sb = createClient(url, key, { auth:{ persistSession:false, autoRefreshToken:false } });
  const { data:existing } = await sb.from("articles").select("id").eq("slug", article.slug).maybeSingle();

  if (existing) {
    const { data, error } = await sb.from("articles")
      .update({ title:article.title, content:article.content, meta_description:article.meta_description, excerpt:article.excerpt, keywords:article.keywords, word_count:article.word_count, price_snapshot:priceSnapshot, status:"published" })
      .eq("slug", article.slug).select("id").single();
    if (error) return { success:false, article_id:null, slug:null, error:error.message };
    return { success:true, article_id:data.id, slug:article.slug, error:null };
  }

  const { data, error } = await sb.from("articles")
    .insert({ title:article.title, slug:article.slug, content:article.content, meta_description:article.meta_description, excerpt:article.excerpt, keywords:article.keywords, word_count:article.word_count, price_snapshot:priceSnapshot, status:"published" })
    .select("id").single();
  if (error) return { success:false, article_id:null, slug:null, error:error.message };
  return { success:true, article_id:data.id, slug:article.slug, error:null };
}
