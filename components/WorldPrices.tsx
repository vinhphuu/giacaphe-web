import{createClient}from"@supabase/supabase-js";

interface WorldPrice{exchange:string;contract:string;price:number;change_pt:number;change_pct:number;high:number|null;low:number|null;volume:string|null;unit:string;updated_at:string;}

async function getWorldPrices(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return{london:[],newYork:[],updatedAt:null};
  try{
    const sb=createClient(url,key,{global:{fetch:(input,init)=>fetch(input,{...init,next:{revalidate:600}} as RequestInit)}});
    const{data,error}=await sb.from("world_coffee_prices").select("*").order("exchange").order("contract");
    if(error||!data) return{london:[],newYork:[],updatedAt:null};
    const all=data as WorldPrice[];
    const london=all.filter(p=>p.exchange==="London");
    const newYork=all.filter(p=>p.exchange==="New York");
    const latest=all.reduce((m,p)=>new Date(p.updated_at)>new Date(m)?p.updated_at:m,all[0]?.updated_at??"");
    return{london,newYork,updatedAt:latest||null};
  }catch{return{london:[],newYork:[],updatedAt:null};}
}

function formatDateVN(iso:string){
  return new Date(iso).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Ho_Chi_Minh"});
}

function ChangeBadge({pt}:{pt:number}){
  if(pt>0) return<span className="text-emerald-400 font-medium">▲ +{pt.toLocaleString()}</span>;
  if(pt<0) return<span className="text-rose-400 font-medium">▼ {pt.toLocaleString()}</span>;
  return<span className="text-slate-500">— 0</span>;
}

function SkeletonRow(){
  return(
    <tr className="border-t border-slate-800/60">
      {[40,72,56,56,56].map((w,i)=>(
        <td key={i} className="px-3 py-3">
          <div className="h-3.5 rounded bg-slate-700/60 animate-pulse" style={{width:`${w}%`}}/>
        </td>
      ))}
    </tr>
  );
}

function ExchangeTable({exchange,unit,prices,isEmpty}:{exchange:string;unit:string;prices:WorldPrice[];isEmpty:boolean}){
  const isLondon=exchange==="London";
  const accent=isLondon?"text-amber-400":"text-sky-400";
  const border=isLondon?"border-amber-500/30":"border-sky-500/30";
  const badge=isLondon?"bg-amber-500/10 text-amber-400":"bg-sky-500/10 text-sky-400";
  return(
    <div className={`rounded-2xl border ${border} bg-slate-900/60 overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badge}`}>
            {isLondon?"London":"New York"}
          </span>
          <span className="text-[11px] text-slate-500">{isLondon?"Robusta ICE":"Arabica ICE"}</span>
        </div>
        <span className={`text-[11px] font-medium ${accent}`}>{unit}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left">Ky han</th>
              <th className="px-3 py-2.5 text-right">Gia khop</th>
              <th className="px-3 py-2.5 text-right">Thay doi</th>
              <th className="px-3 py-2.5 text-right hidden sm:table-cell">Cao</th>
              <th className="px-3 py-2.5 text-right hidden sm:table-cell">Thap</th>
            </tr>
          </thead>
          <tbody>
            {isEmpty?(<><SkeletonRow/><SkeletonRow/><SkeletonRow/></>)
            :prices.length===0?(<tr><td colSpan={5} className="px-3 py-8 text-center text-slate-600 text-xs">Chua co du lieu</td></tr>)
            :prices.map((row,i)=>(
              <tr key={row.contract} className={`border-t border-slate-800/50 hover:bg-slate-800/40 transition-colors ${i===0?"bg-slate-800/20":""}`}>
                <td className="px-3 py-3">
                  <span className={`font-semibold text-sm ${i===0?accent:"text-slate-200"}`}>{row.contract}</span>
                  {i===0&&<span className="ml-1.5 text-[9px] font-bold text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded-full">Gan nhat</span>}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={`font-bold text-base ${i===0?"text-white":"text-slate-200"}`}>
                    {isLondon?row.price.toLocaleString("en-US"):row.price.toFixed(2)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right"><ChangeBadge pt={row.change_pt}/></td>
                <td className="px-3 py-3 text-right text-slate-400 text-[13px] hidden sm:table-cell">{row.high?isLondon?row.high.toLocaleString("en-US"):row.high.toFixed(2):"—"}</td>
                <td className="px-3 py-3 text-right text-slate-400 text-[13px] hidden sm:table-cell">{row.low?isLondon?row.low.toLocaleString("en-US"):row.low.toFixed(2):"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function WorldPrices(){
  const{london,newYork,updatedAt}=await getWorldPrices();
  const hasData=london.length>0||newYork.length>0;
  return(
    <section className="w-full px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="block w-1 h-5 rounded-full bg-sky-500"/>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Gia ca phe the gioi</h2>
          </div>
          {updatedAt&&(
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>Cap nhat: {formatDateVN(updatedAt)}</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExchangeTable exchange="London" unit="USD/Tan" prices={london} isEmpty={!hasData}/>
          <ExchangeTable exchange="New York" unit="Cent/lb" prices={newYork} isEmpty={!hasData}/>
        </div>
      </div>
    </section>
  );
}
