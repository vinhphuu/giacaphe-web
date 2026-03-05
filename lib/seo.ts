import type{Metadata}from"next";
import{createClient}from"@supabase/supabase-js";

export async function getPriceMetaData(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fallback={topProvince:"Dak Lak",topPrice:0,avgPrice:0,dateStr:"",isoDate:"",prices:[] as{province:string;price:number}[]};
  if(!url||!key) return fallback;
  try{
    const sb=createClient(url,key,{global:{fetch:(input,init)=>fetch(input,{...init,next:{revalidate:3600}} as RequestInit)}});
    const{data}=await sb.from("prices").select("province,price,updated_at").eq("type","coffee").order("price",{ascending:false});
    if(!data||data.length===0) return fallback;
    const top=data[0] as{province:string;price:number;updated_at:string};
    const avg=Math.round(data.reduce((s:number,r:{price:number})=>s+r.price,0)/data.length);
    const d=new Date(top.updated_at);
    return{topProvince:top.province,topPrice:top.price,avgPrice:avg,
      dateStr:d.toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"}),
      isoDate:d.toISOString(),prices:data as{province:string;price:number}[]};
  }catch{return fallback;}
}

export async function buildHomeMetadata():Promise<Metadata>{
  const{topPrice,topProvince,avgPrice,dateStr}=await getPriceMetaData();
  const priceStr=topPrice>0?`${(topPrice/1000).toFixed(0)}.000d/kg`:"";
  const avgStr=avgPrice>0?`${avgPrice.toLocaleString("vi-VN")}d/kg`:"";
  const base=process.env.NEXT_PUBLIC_BASE_URL??"https://giacaphe-web.vercel.app";
  const title=topPrice>0
    ?`Gia ca phe hom nay ${dateStr}: ${topProvince} dat dinh ${priceStr}`
    :"Gia ca phe hom nay - Cap nhat moi nhat tu Tay Nguyen";
  const description=topPrice>0
    ?`Cap nhat gia ca phe hom nay ${dateStr}. ${topProvince} cao nhat ${priceStr}, trung binh ${avgStr}.`
    :"Theo doi gia ca phe noi dia va the gioi cap nhat hang ngay.";
  return{
    title,description,
    keywords:"gia ca phe hom nay,gia ca phe Dak Lak,san London Robusta,xuat khau ca phe,ty gia USD VND",
    openGraph:{title,description,url:base,type:"website",siteName:"GiaCaPhe",locale:"vi_VN"},
    alternates:{canonical:base},
    robots:{index:true,follow:true,googleBot:{index:true,follow:true,"max-snippet":-1}},
  };
}

export async function PriceSchemaScript(){
  const{prices,dateStr,isoDate}=await getPriceMetaData();
  const base=process.env.NEXT_PUBLIC_BASE_URL??"https://giacaphe-web.vercel.app";
  if(!prices.length) return null;
  const schema={
    "@context":"https://schema.org","@type":"Dataset",
    "name":`Gia ca phe hom nay ${dateStr}`,
    "description":`Bang gia ca phe noi dia Tay Nguyen ngay ${dateStr}`,
    "url":base,"dateModified":isoDate,
    "creator":{"@type":"Organization","name":"GiaCaPhe","url":base},
    "distribution":prices.map(p=>({
      "@type":"DataDownload","name":p.province,"contentUrl":base,
      "encodingFormat":"text/html","description":`${p.price.toLocaleString("vi-VN")}d/kg`,
    })),
  };
  return(
    <script type="application/ld+json"
      dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  );
}
