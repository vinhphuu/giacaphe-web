import{createClient}from"@supabase/supabase-js";

async function getPriceSnapshot(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return null;
  try{
    const sb=createClient(url,key,{global:{fetch:(input,init)=>fetch(input,{...init,next:{revalidate:3600}} as RequestInit)}});
    const{data:prices}=await sb.from("prices").select("province,price,change_value").eq("type","coffee").order("province");
    const{data:world}=await sb.from("world_coffee_prices").select("exchange,contract,price,change_pt").order("exchange").order("contract").limit(4);
    return{prices:prices??[],world:world??[]};
  }catch{return null;}
}

async function generateInsight(
  prices:{province:string;price:number;change_value:number}[],
  world:{exchange:string;contract:string;price:number;change_pt:number}[]
):Promise<string>{
  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey) return "";
  const avgChange=prices.length?Math.round(prices.reduce((s,p)=>s+p.change_value,0)/prices.length):0;
  const top=prices.reduce((m,p)=>p.price>m.price?p:m,prices[0]??{province:"",price:0,change_value:0});
  const london=world.find(w=>w.exchange==="London");
  const ny=world.find(w=>w.exchange==="New York");
  const topPrice=top.price.toLocaleString("vi-VN");
  const ctx=[
    `Giá nội địa TB thay đổi: ${avgChange>0?"+":""}${avgChange.toLocaleString("vi-VN")}đ`,
    `Cao nhất: ${top.province} ${topPrice}đ/kg`,
    london?`London ${london.contract}: ${london.price} USD/tấn (${london.change_pt>0?"+":""}${london.change_pt})`:"",
    ny?`New York ${ny.contract}: ${ny.price} Cent/lb (${ny.change_pt>0?"+":""}${ny.change_pt})`:"",
  ].filter(Boolean).join(". ");
  try{
    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
      body:JSON.stringify({
        model:"llama-3.3-70b-versatile",
        messages:[
          {role:"system",content:"Bạn là chuyên gia thị trường cà phê Việt Nam. Luôn viết tiếng Việt đầy đủ dấu, tự nhiên, chuyên nghiệp."},
          {role:"user",content:`Dữ liệu thị trường: ${ctx}. Hãy viết đúng 1 câu nhận định ngắn dưới 60 chữ bằng tiếng Việt có dấu đầy đủ, kết thúc bằng lời khuyên cụ thể cho người trồng cà phê. Không dùng markdown, không giải thích thêm.`}
        ],
        temperature:0.5,
        max_tokens:150
      }),
      next:{revalidate:3600},
    } as RequestInit);
    if(!res.ok) return "";
    const data=await res.json();
    return(data?.choices?.[0]?.message?.content??"").trim();
  }catch{return "";}
}

export default async function MarketInsight(){
  const snapshot=await getPriceSnapshot();
  if(!snapshot||snapshot.prices.length===0) return null;
  const insight=await generateInsight(snapshot.prices,snapshot.world);
  if(!insight) return null;
  const avg=snapshot.prices.length?snapshot.prices.reduce((s,p)=>s+p.change_value,0)/snapshot.prices.length:0;
  const up=avg>0,down=avg<0;
  const c=up
    ?{border:"border-emerald-500/30",bg:"bg-emerald-500/5",dot:"bg-emerald-400",text:"text-emerald-200",label:"text-emerald-400",icon:"📈"}
    :down
    ?{border:"border-rose-500/30",bg:"bg-rose-500/5",dot:"bg-rose-400",text:"text-rose-200",label:"text-rose-400",icon:"📉"}
    :{border:"border-slate-600/40",bg:"bg-slate-800/40",dot:"bg-slate-400",text:"text-slate-300",label:"text-slate-400",icon:"➡️"};
  return(
    <div className={`w-full rounded-xl border ${c.border} ${c.bg} px-4 py-3 mt-3 mb-5`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 flex items-center gap-1.5">
          <span className="text-base leading-none">{c.icon}</span>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-60`}/>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`}/>
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${c.label} block mb-1`}>
            AI · Nhận định thị trường hôm nay
          </span>
          <p className={`text-sm leading-relaxed ${c.text}`}>{insight}</p>
        </div>
      </div>
    </div>
  );
}
