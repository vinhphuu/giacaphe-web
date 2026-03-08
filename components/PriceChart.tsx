"use client";
import{useState,useEffect,useCallback}from"react";
import{LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer}from"recharts";

type Period=7|30;
interface ChartPoint{date:string;price:number;}

function CustomTooltip({active,payload,label}:{active?:boolean;payload?:{value:number}[];label?:string}){
  if(!active||!payload?.length) return null;
  return(
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-amber-400 font-bold text-sm">{payload[0].value.toLocaleString("vi-VN")}đ/kg</p>
    </div>
  );
}

function ChartSkeleton(){
  return(
    <div className="w-full h-52 flex items-end gap-1 px-2 animate-pulse">
      {Array.from({length:14}).map((_,i)=>(
        <div key={i} className="flex-1 bg-slate-700/50 rounded-t" style={{height:`${30+Math.random()*60}%`}}/>
      ))}
    </div>
  );
}

export default function PriceChart(){
  const[period,setPeriod]=useState<Period>(7);
  const[data,setData]=useState<ChartPoint[]>([]);
  const[loading,setLoading]=useState(true);
  const[province,setProvince]=useState("Đắk Lắk");

  const fetchData=useCallback(async(days:Period,prov:string)=>{
    setLoading(true);
    try{
      const res=await fetch(`/api/chart-data?province=${encodeURIComponent(prov)}&days=${days}`);
      const json=await res.json();
      setData(json.data??[]);
    }catch{setData([]);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchData(period,province);},[period,province,fetchData]);

  const first=data[0]?.price??0;
  const last=data[data.length-1]?.price??0;
  const pct=first>0?(((last-first)/first)*100).toFixed(2):"0.00";
  const isUp=parseFloat(pct)>=0;

  return(
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden mx-4 mb-4">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-white">Biểu đồ giá cà phê</h3>
          {!loading&&data.length>0&&(
            <p className={`text-xs mt-0.5 ${isUp?"text-emerald-400":"text-rose-400"}`}>
              {isUp?"▲":"▼"} {Math.abs(parseFloat(pct))}% trong {period} ngày
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={province} onChange={e=>setProvince(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer hover:border-slate-600 transition-colors">
            {["Đắk Lắk","Gia Lai","Lâm Đồng","Đắk Nông","Kon Tum"].map(p=>(
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
            {([7,30] as Period[]).map(d=>(
              <button key={d} onClick={()=>setPeriod(d)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all duration-150 ${period===d?"bg-amber-500 text-slate-900 shadow-sm":"text-slate-400 hover:text-slate-200"}`}>
                {d} ngày
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-2 pb-4 pt-1">
        {loading?<ChartSkeleton />:data.length===0?(
          <div className="h-52 flex items-center justify-center text-slate-600 text-sm">Chưa có dữ liệu lịch sử</div>
        ):(
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{top:4,right:8,left:0,bottom:0}}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
              <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false} interval={period===7?0:Math.floor(data.length/6)}/>
              <YAxis tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false} width={72} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} domain={["auto","auto"]}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Line type="monotone" dataKey="price" stroke="url(#lineGrad)" strokeWidth={2.5} dot={false} activeDot={{r:5,fill:"#f59e0b",stroke:"#0f172a",strokeWidth:2}}/>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
