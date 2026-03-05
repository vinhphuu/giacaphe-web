import { createClient } from "@supabase/supabase-js";
export interface PriceData { province:string; price:number; change_value:number; region:string; }
export interface HistoryPoint { date:string; price:number; }
export interface GeneratedArticle { title:string; slug:string; content:string; meta_description:string; excerpt:string; keywords:string[]; word_count:number; }
export interface WriteResult { success:boolean; article:GeneratedArticle|null; error:string|null; }
export interface SaveResult { success:boolean; article_id:number|null; slug:string|null; error:string|null; }

function formatVND(n:number){return n.toLocaleString("vi-VN");}
function getTodayVN(){return new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"});}
function getDateSlug(){const d=new Date();return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;}
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
function buildPrompt(prices:PriceData[],history:HistoryPoint[]){
  const today=getTodayVN();
  const avg=Math.round(prices.reduce((s,p)=>s+p.price,0)/prices.length);
  const max=Math.max(...prices.map(p=>p.price));
  const min=Math.min(...prices.map(p=>p.price));
  return `Bạn là chuyên gia phân tích thị trường nông sản Việt Nam 15 năm kinh nghiệm. Viết bài phân tích thị trường cà phê bằng tiếng Việt.

DỮ LIỆU THỰC TẾ HÔM NAY:
Ngày: ${today}
${buildPriceTable(prices)}
Cao nhất: ${formatVND(max)}đ | Thấp nhất: ${formatVND(min)}đ | Trung bình: ${formatVND(avg)}đ

Lịch sử 7 ngày (Đắk Lắk):
${buildHistoryTable(history)}

VIẾT BÀI 1500-2000 từ Markdown gồm 6 phần:
1. ## Giá cà phê hôm nay ${today} — Tổng quan (chèn bảng giá ở đây)
2. ## Diễn biến 7 ngày qua (chèn bảng lịch sử ở đây)
3. ## Phân tích từng tỉnh Tây Nguyên
4. ## Tương quan với thị trường thế giới (sàn London, tỷ giá USD/VND)
5. ## Yếu tố vĩ mô tác động
6. ## Dự báo 3 kịch bản: tăng / đi ngang / giảm

Yêu cầu: ngôn ngữ chuyên gia tài chính, chèn từ khoá "giá cà phê hôm nay" "xuất khẩu cà phê" "nguồn cung Tây Nguyên" "sàn London" "tỷ giá USD". Kết thúc CTA theo dõi giacaphe.com.

Trả về JSON thuần túy (KHÔNG có backtick, KHÔNG có text bên ngoài JSON):
{"title":"Giá cà phê hôm nay ${today}: [điểm nổi bật]","meta_description":"[150-160 ký tự]","excerpt":"[sapo 100-120 chữ]","content":"[toàn bộ markdown]","keywords":["giá cà phê hôm nay","xuất khẩu cà phê","nguồn cung Tây Nguyên"]}`;
}

async function callGroqAPI(prompt:string):Promise<string>{
  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey) throw new Error("Thiếu GROQ_API_KEY");
  const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
    body:JSON.stringify({
      model:"llama-3.3-70b-versatile",
      messages:[
        {role:"system",content:"Bạn là chuyên gia phân tích thị trường nông sản Việt Nam. Chỉ trả về JSON thuần túy, tuyệt đối không có backtick hay text bên ngoài JSON."},
        {role:"user",content:prompt}
      ],
      temperature:0.7,
      max_tokens:4000,
      response_format:{type:"json_object"},
    }),
    cache:"no-store",
  });
  if(!response.ok){
    const err=await response.text();
    throw new Error(`Groq API HTTP ${response.status}: ${err}`);
  }
  const data=await response.json();
  const text=data?.choices?.[0]?.message?.content;
  if(!text) throw new Error("Groq không trả về content");
  return text;
}

export async function generateMarketArticle(prices:PriceData[],history:HistoryPoint[]):Promise<WriteResult>{
  if(prices.length===0) return{success:false,article:null,error:"Không có dữ liệu giá"};
  let rawJson:string;
  try{rawJson=await callGroqAPI(buildPrompt(prices,history));}
  catch(err){return{success:false,article:null,error:`Groq API lỗi: ${err instanceof Error?err.message:"Unknown"}`};}
  let parsed:{title:string;meta_description:string;excerpt:string;content:string;keywords:string[]};
  try{
    const clean=rawJson.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
    parsed=JSON.parse(clean);
  }catch{return{success:false,article:null,error:`Không parse được JSON: ${rawJson.substring(0,300)}`};}
  if(!parsed.title||!parsed.content) return{success:false,article:null,error:"Thiếu title hoặc content"};
  return{
    success:true,error:null,
    article:{
      title:parsed.title.replace(/^#+\s*/,"").trim(),
      slug:`gia-ca-phe-hom-nay-${getDateSlug()}`,
      content:parsed.content,
      meta_description:(parsed.meta_description??"").substring(0,160),
      excerpt:parsed.excerpt??parsed.content.substring(0,300),
      keywords:parsed.keywords??["giá cà phê hôm nay"],
      word_count:parsed.content.split(/\s+/).length,
    },
  };
}

export async function saveArticle(article:GeneratedArticle,priceSnapshot:PriceData[]):Promise<SaveResult>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return{success:false,article_id:null,slug:null,error:"Thiếu Supabase env"};
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data:existing}=await sb.from("articles").select("id").eq("slug",article.slug).maybeSingle();
  if(existing){
    const{data,error}=await sb.from("articles").update({title:article.title,content:article.content,meta_description:article.meta_description,excerpt:article.excerpt,keywords:article.keywords,word_count:article.word_count,price_snapshot:priceSnapshot,status:"published"}).eq("slug",article.slug).select("id").single();
    if(error) return{success:false,article_id:null,slug:null,error:error.message};
    return{success:true,article_id:data.id,slug:article.slug,error:null};
  }
  const{data,error}=await sb.from("articles").insert({title:article.title,slug:article.slug,content:article.content,meta_description:article.meta_description,excerpt:article.excerpt,keywords:article.keywords,word_count:article.word_count,price_snapshot:priceSnapshot,status:"published"}).select("id").single();
  if(error) return{success:false,article_id:null,slug:null,error:error.message};
  return{success:true,article_id:data.id,slug:article.slug,error:null};
}
