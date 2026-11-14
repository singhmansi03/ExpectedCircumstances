import { haversineMiles } from "../airports";
import type { Airport, SearchRequest } from "../types";

// A bounded AI planning step: it may prioritize ALREADY VERIFIED IATA candidates,
// but it cannot issue network calls, invent airports, prices, timetables, or book tickets.
export function validateAirportSelection(raw:unknown,allowedCodes:string[],limit:number):string[] {
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return [];
 const choices=(raw as {airports?:unknown}).airports;
 if(!Array.isArray(choices))return [];
 const allowed=new Set(allowedCodes);
 return [...new Set(choices.filter((x):x is string=>typeof x==="string"&&allowed.has(x)))].slice(0,limit);
}
export async function planAirportResearch(origin:Airport,destination:Airport,request:SearchRequest,candidates:Airport[],limit=4):Promise<string[]|null> {
 const key=process.env.GEMINI_API_KEY;
 if(!key||!candidates.length)return null;
 const safeCandidates=candidates.map(a=>({code:a.code,city:a.city,straightLineMiles:haversineMiles(origin,a)}));
 const prompt=[
  "You are a travel research planning agent. Rank candidate airports to QUERY for possible routes, not to recommend tickets.",
  "Only choose from the candidate airport codes in the supplied JSON. Do not invent fares, airport codes, transport schedules, or claim flights are cheaper.",
  `Return ONLY compact JSON with shape {\"airports\":[\"CODE\"]}, max ${limit} items, prioritizing good airline connectivity, location and the user's stated preference.`,
  JSON.stringify({origin:origin.code,destination:destination.code,priority:request.priority,mode:request.mode,budgetUSD:request.budgetUSD,candidates:safeCandidates})
 ].join("\n");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);
 try{
  const res=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,maxOutputTokens:120,responseMimeType:"application/json"}}),signal:controller.signal,cache:"no-store"});
  if(!res.ok)return null;
  const data=await res.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
  const content=data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim()||"";
  const parsed=JSON.parse(content) as unknown;
  return validateAirportSelection(parsed,candidates.map(a=>a.code),limit);
 }catch{return null;}finally{clearTimeout(timer);}
}
