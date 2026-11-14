import { NextResponse } from "next/server";
import { parseRequest, researchTrips } from "../../../lib/agents/search";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req:Request){
 try {
  const body=await req.json(); const config=parseRequest(body);
  if(!config.demo&&!process.env.SERPAPI_KEY)return NextResponse.json({error:"SERPAPI_KEY is missing. Add it to .env.local or turn on demo mode."},{status:503});
  const response=await researchTrips(config);
  return NextResponse.json(response,{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const msg=error instanceof Error?error.message:"Search failed.";
  const status=/Enter |Choose |Budget |Request must|Origin and destination|Return date|Travel dates/.test(msg)?400:502;
  console.error("RouteWise search:",msg);
  return NextResponse.json({error:msg},{status});
 }
}
