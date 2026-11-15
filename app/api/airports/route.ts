import { NextResponse } from "next/server";
import { AIRPORTS } from "../../../lib/airports";
export async function GET(req:Request){
 const term=new URL(req.url).searchParams.get("q")?.trim().toLowerCase()||"";
 const results=AIRPORTS.filter(a=>!term||`${a.code} ${a.name} ${a.city}`.toLowerCase().includes(term)).slice(0,12)
 .map(a=>({code:a.code,city:a.city,name:a.name}));
 return NextResponse.json({airports:results},{headers:{"Cache-Control":"public, max-age=3600"}});
}
